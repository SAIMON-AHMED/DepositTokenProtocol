// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IReserveRegistry.sol";
import "../interfaces/IGovernanceController.sol";

/// @title ReserveRegistry
/// @notice Canonical on-chain reserve ratio state used by DepositToken for mint gating.
/// @dev Reporters (e.g., ReserveOracle or bank-operated relayers) publish updates.
///      Governance controls reporter permissions.
contract ReserveRegistry is IReserveRegistry {
  IGovernanceController public governanceController;

  // reserve ratio scaled by 1e18 (e.g., 1.0 == 1e18)
  uint256 private _reserveRatio;

  // unix timestamp of last successful update
  uint256 private _lastUpdated;

  // reporter allowlist
  mapping(address => bool) private _isReporter;

  // optional upper bound to prevent nonsensical values
  uint256 public constant MAX_RATIO = 2e18;

  event ReporterUpdated(address indexed reporter, bool allowed);
  event ReserveRatioUpdated(uint256 newRatio, uint256 timestamp);
  event GovernanceControllerUpdated(address indexed oldGov, address indexed newGov);

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

  /*//////////////////////////////////////////////////////////////
                          VIEW FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IReserveRegistry
  function reserveRatio() external view override returns (uint256) {
    return _reserveRatio;
  }

  /// @inheritdoc IReserveRegistry
  function lastUpdated() external view override returns (uint256) {
    return _lastUpdated;
  }

  /// @inheritdoc IReserveRegistry
  function isReporter(address reporter) external view override returns (bool) {
    return _isReporter[reporter];
  }

  /*//////////////////////////////////////////////////////////////
                      GOVERNANCE FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IReserveRegistry
  function setReporter(address reporter, bool allowed) external override onlyGovernor {
    require(reporter != address(0), "Invalid reporter");
    _isReporter[reporter] = allowed;
    emit ReporterUpdated(reporter, allowed);
  }

  /// @notice Optional governance migration (keep for upgradeability)
  function setGovernanceController(address newGov) external onlyGovernor {
    require(newGov != address(0), "Invalid governance");
    address old = address(governanceController);
    governanceController = IGovernanceController(newGov);
    emit GovernanceControllerUpdated(old, newGov);
  }

  /*//////////////////////////////////////////////////////////////
                      REPORTER FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IReserveRegistry
  function setReserveRatio(uint256 newRatio) external override onlyReporter {
    _validateRatio(newRatio);
    _reserveRatio = newRatio;
    _lastUpdated = block.timestamp;
    emit ReserveRatioUpdated(newRatio, block.timestamp);
  }

  /*//////////////////////////////////////////////////////////////
                         INTERNAL LOGIC
  //////////////////////////////////////////////////////////////*/

  function _validateRatio(uint256 ratio) internal pure {
    require(ratio > 0, "Ratio must be positive");
    require(ratio <= MAX_RATIO, "Ratio too high");
  }
}
