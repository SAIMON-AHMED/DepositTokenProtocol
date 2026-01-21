// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IReserveRegistry.sol";
import "../interfaces/IGovernanceController.sol";

/// @title ReserveOracle
/// @notice Reporter/adapter that publishes reserve attestations into the canonical ReserveRegistry
/// @dev This contract does NOT enforce minting logic. It only reports reserve state.
///      ReserveOracle must be authorized as a reporter on ReserveRegistry by governance
///      before it can call setReserveRatio(). DepositToken reads from ReserveRegistry,
///      not directly from ReserveOracle.
contract ReserveOracle {
    IGovernanceController public governanceController;
    IReserveRegistry public reserveRegistry;

    address public owner;

    event OwnershipTransferred(
        address indexed oldOwner,
        address indexed newOwner
    );
    event ReserveRegistryUpdated(
        address indexed oldRegistry,
        address indexed newRegistry
    );
    event ReserveRatioReported(uint256 ratio, address indexed reporter);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyGovernor() {
        require(
            governanceController.isGovernor(msg.sender) ||
                msg.sender == governanceController.governor(),
            "Not governor"
        );
        _;
    }

    constructor(address _governanceController, address _reserveRegistry) {
        require(_governanceController != address(0), "Invalid governance");
        require(_reserveRegistry != address(0), "Invalid registry");

        governanceController = IGovernanceController(_governanceController);
        reserveRegistry = IReserveRegistry(_reserveRegistry);

        owner = msg.sender;

        emit OwnershipTransferred(address(0), msg.sender);
        emit ReserveRegistryUpdated(address(0), _reserveRegistry);
    }

    /// @notice Update the canonical registry this oracle reports to
    /// @dev Governor-controlled to prevent redirection attacks
    function setReserveRegistry(address newRegistry) external onlyGovernor {
        require(newRegistry != address(0), "Invalid registry");
        address old = address(reserveRegistry);
        reserveRegistry = IReserveRegistry(newRegistry);
        emit ReserveRegistryUpdated(old, newRegistry);
    }

    /// @notice Rotate oracle operator key
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        address old = owner;
        owner = newOwner;
        emit OwnershipTransferred(old, newOwner);
    }

    /// @notice Publish a new reserve ratio into the canonical registry
    /// @dev In production this would follow off-chain audits / zk attestations
    function reportReserveRatio(uint256 ratio) external onlyOwner {
        reserveRegistry.setReserveRatio(ratio);
        emit ReserveRatioReported(ratio, msg.sender);
    }
}
