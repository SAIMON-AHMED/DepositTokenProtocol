// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IIdentityRegistry.sol";
import "../interfaces/IGovernanceController.sol";

/// @title IdentityRegistry
/// @notice On-chain KYC-verified address registry for Mode B.
contract IdentityRegistry is IIdentityRegistry {
    IGovernanceController public governanceController;
    address public operator; // identity oracle operator (KYC provider)

    mapping(address => bool) private _verified;

    event VerificationUpdated(address indexed account, bool status);
    event OperatorUpdated(
        address indexed oldOperator,
        address indexed newOperator
    );

    modifier onlyOperator() {
        require(msg.sender == operator, "Not operator");
        _;
    }

    modifier onlyGovernor() {
        require(governanceController.isGovernor(msg.sender), "Not governor");
        _;
    }

    constructor(address _governanceController, address _operator) {
        require(_governanceController != address(0), "Invalid governance");
        require(_operator != address(0), "Invalid operator");
        governanceController = IGovernanceController(_governanceController);
        operator = _operator;
    }

    /// @notice Returns true if the address holds a valid identity commitment
    function isVerified(address account) external view override returns (bool) {
        return _verified[account];
    }

    /// @notice Add or remove a verified address (called by identity oracle operator)
    function setVerified(
        address account,
        bool status
    ) external override onlyOperator {
        require(account != address(0), "Invalid account");
        _verified[account] = status;
        emit VerificationUpdated(account, status);
    }

    /// @notice Batch verify multiple addresses at once
    function batchSetVerified(
        address[] calldata accounts,
        bool status
    ) external onlyOperator {
        for (uint256 i = 0; i < accounts.length; i++) {
            require(accounts[i] != address(0), "Invalid account");
            _verified[accounts[i]] = status;
            emit VerificationUpdated(accounts[i], status);
        }
    }

    /// @notice Update the operator (identity oracle key rotation)
    function setOperator(address newOperator) external onlyGovernor {
        require(newOperator != address(0), "Invalid operator");
        address old = operator;
        operator = newOperator;
        emit OperatorUpdated(old, newOperator);
    }
}
