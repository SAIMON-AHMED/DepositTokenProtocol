// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../libs/MathLib.sol";

/// @title ReserveOracle - Provides reserve ratio information for deposit token minting
/// @notice Allows setting and querying of current reserve ratio
contract ReserveOracle {
  using MathLib for uint256;

  address public owner;
  uint256 private _reserveRatio; // 1e18 = 100%

  event ReserveRatioUpdated(uint256 newRatio);

  modifier onlyOwner() {
    require(msg.sender == owner, "Not owner");
    _;
  }

  constructor() {
    owner = msg.sender;
  }

  /// @notice Sets the reserve ratio (in 1e18 scale, e.g., 1e18 = 100%)
  /// @param ratio The new reserve ratio value
  function setReserveRatio(uint256 ratio) external onlyOwner {
    require(ratio <= 1e20, "Ratio too high"); // arbitrary sanity limit (10,000%)
    require(ratio > 0, "Ratio must be positive");
    require(ratio != _reserveRatio, "Same ratio");
    _reserveRatio = ratio;
    emit ReserveRatioUpdated(ratio);
  }


  /// @notice Returns the current reserve ratio
  /// @return Reserve ratio in 18-decimal fixed-point format
  function reserveRatio() external view returns (uint256) {
    return _reserveRatio;
  }

  /// @notice Allows ownership transfer
  /// @param newOwner Address of the new owner
  function transferOwnership(address newOwner) external onlyOwner {
    require(newOwner != address(0), "Zero address");
    owner = newOwner;
  }
}
