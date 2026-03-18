// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IReserveRegistry.sol";
import "../interfaces/IGovernanceController.sol";

/// @title ReserveRegistry
/// @notice Canonical reserve ratio with staleness, deviation, and multi-oracle aggregation.
contract ReserveRegistry is IReserveRegistry {
    IGovernanceController public governanceController;

    uint256 private _reserveRatio;
    uint256 private _lastUpdated;

    mapping(address => bool) private _isReporter;
    address[] private _reporterList;

    mapping(address => uint256) public reporterValues;
    mapping(address => uint256) public reporterTimestamps;

    uint256 public override stalenessThreshold = 3600; // τ_max
    uint256 public override maxDeviation = 1e17; // Δ_max = 10%
    uint256 public override requiredReporters = 1;

    uint256 public constant MAX_RATIO = 2e18;
    uint256 public constant MAX_STALENESS = 86400;
    uint256 public constant MAX_DEVIATION = 5e17;

    event ReporterUpdated(address indexed reporter, bool allowed);
    event ReserveRatioUpdated(uint256 newRatio, uint256 timestamp);
    event ReporterSubmission(
        address indexed reporter,
        uint256 value,
        uint256 timestamp
    );
    event DeviationAlert(
        address indexed reporter,
        uint256 submitted,
        uint256 current,
        uint256 deviation
    );
    event GovernanceControllerUpdated(
        address indexed oldGov,
        address indexed newGov
    );
    event StalenesThresholdUpdated(uint256 oldValue, uint256 newValue);
    event MaxDeviationUpdated(uint256 oldValue, uint256 newValue);
    event RequiredReportersUpdated(uint256 oldValue, uint256 newValue);

    modifier onlyGovernor() {
        require(governanceController.isGovernor(msg.sender), "Not governor");
        _;
    }

    modifier onlyReporter() {
        require(_isReporter[msg.sender], "Not reporter");
        _;
    }

    constructor(address _governanceController, uint256 initialRatio) {
        require(_governanceController != address(0), "Invalid governance");
        governanceController = IGovernanceController(_governanceController);

        if (initialRatio != 0) {
            _validateRatio(initialRatio);
            _reserveRatio = initialRatio;
            _lastUpdated = block.timestamp;
            emit ReserveRatioUpdated(initialRatio, block.timestamp);
        }
    }

    function reserveRatio() external view override returns (uint256) {
        return _reserveRatio;
    }

    function lastUpdated() external view override returns (uint256) {
        return _lastUpdated;
    }

    function isReporter(
        address reporter
    ) external view override returns (bool) {
        return _isReporter[reporter];
    }

    function isStale() external view override returns (bool) {
        if (_lastUpdated == 0) return true;
        return block.timestamp - _lastUpdated > stalenessThreshold;
    }

    function reporterCount() external view returns (uint256) {
        return _reporterList.length;
    }

    function setReporter(
        address reporter,
        bool allowed
    ) external override onlyGovernor {
        require(reporter != address(0), "Invalid reporter");
        if (allowed && !_isReporter[reporter]) {
            _reporterList.push(reporter);
        }
        _isReporter[reporter] = allowed;
        emit ReporterUpdated(reporter, allowed);
    }

    function setStalenessThreshold(uint256 newThreshold) external onlyGovernor {
        require(
            newThreshold > 0 && newThreshold <= MAX_STALENESS,
            "Invalid staleness threshold"
        );
        uint256 old = stalenessThreshold;
        stalenessThreshold = newThreshold;
        emit StalenesThresholdUpdated(old, newThreshold);
    }

    function setMaxDeviation(uint256 newDeviation) external onlyGovernor {
        require(
            newDeviation > 0 && newDeviation <= MAX_DEVIATION,
            "Invalid deviation threshold"
        );
        uint256 old = maxDeviation;
        maxDeviation = newDeviation;
        emit MaxDeviationUpdated(old, newDeviation);
    }

    function setRequiredReporters(uint256 newRequired) external onlyGovernor {
        require(newRequired > 0, "Must require at least 1 reporter");
        uint256 old = requiredReporters;
        requiredReporters = newRequired;
        emit RequiredReportersUpdated(old, newRequired);
    }

    function setGovernanceController(address newGov) external onlyGovernor {
        require(newGov != address(0), "Invalid governance");
        address old = address(governanceController);
        governanceController = IGovernanceController(newGov);
        emit GovernanceControllerUpdated(old, newGov);
    }

    /// @notice Submit a reserve ratio from one reporter. Auto-aggregates when
    ///         enough fresh submissions exist.
    function submitReserveRatio(
        uint256 newRatio
    ) external override onlyReporter {
        _validateRatio(newRatio);

        if (_reserveRatio > 0) {
            uint256 deviation = _calculateDeviation(newRatio, _reserveRatio);
            if (deviation > maxDeviation) {
                emit DeviationAlert(
                    msg.sender,
                    newRatio,
                    _reserveRatio,
                    deviation
                );
                revert("Deviation exceeds threshold");
            }
        }

        reporterValues[msg.sender] = newRatio;
        reporterTimestamps[msg.sender] = block.timestamp;
        emit ReporterSubmission(msg.sender, newRatio, block.timestamp);

        _tryAggregate();
    }

    /// @notice Single-reporter update (backward compatible).
    function setReserveRatio(uint256 newRatio) external override onlyReporter {
        _validateRatio(newRatio);

        if (_reserveRatio > 0) {
            uint256 deviation = _calculateDeviation(newRatio, _reserveRatio);
            if (deviation > maxDeviation) {
                emit DeviationAlert(
                    msg.sender,
                    newRatio,
                    _reserveRatio,
                    deviation
                );
                revert("Deviation exceeds threshold");
            }
        }

        reporterValues[msg.sender] = newRatio;
        reporterTimestamps[msg.sender] = block.timestamp;
        emit ReporterSubmission(msg.sender, newRatio, block.timestamp);

        if (requiredReporters <= 1) {
            _reserveRatio = newRatio;
            _lastUpdated = block.timestamp;
            emit ReserveRatioUpdated(newRatio, block.timestamp);
        } else {
            _tryAggregate();
        }
    }

    function _validateRatio(uint256 ratio) internal pure {
        require(ratio > 0, "Ratio must be positive");
        require(ratio <= MAX_RATIO, "Ratio too high");
    }

    /// @dev Absolute percentage deviation between two values, scaled by 1e18
    function _calculateDeviation(
        uint256 newVal,
        uint256 oldVal
    ) internal pure returns (uint256) {
        if (oldVal == 0) return 0;
        uint256 diff = newVal > oldVal ? newVal - oldVal : oldVal - newVal;
        return (diff * 1e18) / oldVal;
    }

    /// @dev Attempt median aggregation if enough fresh reporter submissions exist
    function _tryAggregate() internal {
        uint256 freshCount = 0;
        uint256[] memory freshValues = new uint256[](_reporterList.length);

        for (uint256 i = 0; i < _reporterList.length; i++) {
            address reporter = _reporterList[i];
            if (
                _isReporter[reporter] &&
                reporterTimestamps[reporter] > 0 &&
                block.timestamp - reporterTimestamps[reporter] <=
                stalenessThreshold
            ) {
                freshValues[freshCount] = reporterValues[reporter];
                freshCount++;
            }
        }

        if (freshCount >= requiredReporters) {
            uint256[] memory sorted = new uint256[](freshCount);
            for (uint256 i = 0; i < freshCount; i++) {
                sorted[i] = freshValues[i];
            }
            _sort(sorted);

            uint256 median = sorted[freshCount / 2];
            _reserveRatio = median;
            _lastUpdated = block.timestamp;
            emit ReserveRatioUpdated(median, block.timestamp);
        }
    }

    /// @dev Simple insertion sort for small arrays (max ~10 reporters)
    function _sort(uint256[] memory arr) internal pure {
        uint256 n = arr.length;
        for (uint256 i = 1; i < n; i++) {
            uint256 key = arr[i];
            uint256 j = i;
            while (j > 0 && arr[j - 1] > key) {
                arr[j] = arr[j - 1];
                j--;
            }
            arr[j] = key;
        }
    }
}
