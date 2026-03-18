// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";

interface IDepositTokenRedeem {
    function redeem(uint256 amount, bytes calldata zkProof) external;
}

/// @title RedemptionModule
/// @notice Handles redemption settlement with off-chain reference tracking.
///         Now requires zk-KYC proof for redemption (Theorem 2: Compliance Completeness).
contract RedemptionModule {
    IDepositTokenRedeem public immutable depositToken;

    address public owner;
    address public settlementOperator;

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );
    event SettlementOperatorUpdated(
        address indexed oldOperator,
        address indexed newOperator
    );

    event RedemptionRequested(
        address indexed requester,
        address indexed beneficiary,
        uint256 amount,
        bytes32 indexed ref
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(
        address _depositToken,
        address _owner,
        address _settlementOperator
    ) {
        require(_depositToken != address(0), "DepositToken=0");
        require(_owner != address(0), "Owner=0");

        depositToken = IDepositTokenRedeem(_depositToken);
        owner = _owner;
        settlementOperator = _settlementOperator;

        emit OwnershipTransferred(address(0), _owner);
        emit SettlementOperatorUpdated(address(0), _settlementOperator);
    }

    /// @notice Redeem with zk-proof using prior ERC20 approval.
    function redeem(
        uint256 amount,
        address beneficiary,
        bytes32 ref,
        bytes calldata zkProof
    ) external {
        require(amount > 0, "Amount=0");
        require(beneficiary != address(0), "Beneficiary=0");

        IERC20(address(depositToken)).transferFrom(
            msg.sender,
            address(this),
            amount
        );
        depositToken.redeem(amount, zkProof);

        emit RedemptionRequested(msg.sender, beneficiary, amount, ref);
    }

    /// @notice Redeem with zk-proof using EIP-2612 permit (no separate approve tx).
    function redeemWithPermit(
        uint256 amount,
        address beneficiary,
        bytes32 ref,
        bytes calldata zkProof,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(amount > 0, "Amount=0");
        require(beneficiary != address(0), "Beneficiary=0");

        IERC20Permit(address(depositToken)).permit(
            msg.sender,
            address(this),
            amount,
            deadline,
            v,
            r,
            s
        );

        IERC20(address(depositToken)).transferFrom(
            msg.sender,
            address(this),
            amount
        );
        depositToken.redeem(amount, zkProof);

        emit RedemptionRequested(msg.sender, beneficiary, amount, ref);
    }

    function setSettlementOperator(address newOperator) external onlyOwner {
        emit SettlementOperatorUpdated(settlementOperator, newOperator);
        settlementOperator = newOperator;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Owner=0");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function rescueERC20(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        require(to != address(0), "To=0");
        IERC20(token).transfer(to, amount);
    }
}
