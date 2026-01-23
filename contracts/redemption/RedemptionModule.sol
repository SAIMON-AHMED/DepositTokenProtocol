// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";

interface IDepositTokenRedeem {
  function redeem(uint256 amount) external;
}

contract RedemptionModule {
  IDepositTokenRedeem public immutable depositToken;

  address public owner;
  address public settlementOperator; // optional: who watches events / processes off-chain settlement

  event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
  event SettlementOperatorUpdated(address indexed oldOperator, address indexed newOperator);

  /// @notice Emitted when a user requests redemption that should be settled off-chain
  /// @dev reference can be an off-chain banking reference, invoice id, or hashed metadata (avoid PII)
  event RedemptionRequested(
    address indexed requester,
    address indexed beneficiary,
    uint256 amount,
    bytes32 indexed reference
  );

  modifier onlyOwner() {
    require(msg.sender == owner, "Not owner");
    _;
  }

  constructor(address _depositToken, address _owner, address _settlementOperator) {
    require(_depositToken != address(0), "DepositToken=0");
    require(_owner != address(0), "Owner=0");

    depositToken = IDepositTokenRedeem(_depositToken);
    owner = _owner;
    settlementOperator = _settlementOperator;

    emit OwnershipTransferred(address(0), _owner);
    emit SettlementOperatorUpdated(address(0), _settlementOperator);
  }

  /// @notice Redeem using prior approval (ERC20 approve -> transferFrom).
  /// @param amount Amount of deposit tokens to redeem
  /// @param beneficiary Off-chain beneficiary (could be the same as requester)
  /// @param reference Off-chain reference id or hashed metadata (avoid PII)
  function redeem(
    uint256 amount,
    address beneficiary,
    bytes32 reference
  ) external {
    require(amount > 0, "Amount=0");
    require(beneficiary != address(0), "Beneficiary=0");

    // Pull tokens into this module, then burn via DepositToken.redeem()
    IERC20(address(depositToken)).transferFrom(msg.sender, address(this), amount);
    depositToken.redeem(amount);

    emit RedemptionRequested(msg.sender, beneficiary, amount, reference);
  }

  /// @notice Redeem in one transaction using EIP-2612 permit (no separate approve tx).
  function redeemWithPermit(
    uint256 amount,
    address beneficiary,
    bytes32 reference,
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

    IERC20(address(depositToken)).transferFrom(msg.sender, address(this), amount);
    depositToken.redeem(amount);

    emit RedemptionRequested(msg.sender, beneficiary, amount, reference);
  }

  /// @notice Update who processes redemption events off-chain (optional operational field).
  function setSettlementOperator(address newOperator) external onlyOwner {
    emit SettlementOperatorUpdated(settlementOperator, newOperator);
    settlementOperator = newOperator;
  }

  function transferOwnership(address newOwner) external onlyOwner {
    require(newOwner != address(0), "Owner=0");
    emit OwnershipTransferred(owner, newOwner);
    owner = newOwner;
  }

  /// @notice Rescue any ERC20 tokens accidentally sent here (never needed for DepositToken normally).
  function rescueERC20(address token, address to, uint256 amount) external onlyOwner {
    require(to != address(0), "To=0");
    IERC20(token).transfer(to, amount);
  }
}
