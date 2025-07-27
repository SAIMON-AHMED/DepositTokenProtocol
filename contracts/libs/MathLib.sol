// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MathLib - Safe and reusable math functions for percentage and fixed-point calculations
library MathLib {
  /// @notice Performs (a * b) / denominator with safety check for denominator > 0
  /// @dev Solidity 0.8+ has built-in overflow protection
  function mulDiv(
    uint256 a,
    uint256 b,
    uint256 denominator
  ) internal pure returns (uint256) {
    require(denominator > 0, "MathLib: division by zero");
    return (a * b) / denominator;
  }

  /// @notice Returns the smaller of two values
  function min(uint256 a, uint256 b) internal pure returns (uint256) {
    return a < b ? a : b;
  }

  /// @notice Returns the larger of two values
  function max(uint256 a, uint256 b) internal pure returns (uint256) {
    return a > b ? a : b;
  }

  /// @notice Performs scaled multiplication: (a * b) / 1e18
  /// @dev Useful for 18-decimal fixed-point math
  function scaleMul(uint256 a, uint256 b) internal pure returns (uint256) {
    return (a * b) / 1e18;
  }

  /// @notice Performs scaled division: (a * 1e18) / b
  /// @dev Useful for 18-decimal fixed-point math
  function scaleDiv(uint256 a, uint256 b) internal pure returns (uint256) {
    require(b > 0, "MathLib: division by zero");
    return (a * 1e18) / b;
  }
}
