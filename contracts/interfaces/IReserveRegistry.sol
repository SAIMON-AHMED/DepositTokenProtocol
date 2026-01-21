// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IReserveRegistry {
  /// @notice Current reserve ratio scaled by 1e18 (e.g., 1e18 == 1.0)
  function reserveRatio() external view returns (uint256);

  /// @notice Timestamp (unix seconds) of the last successful reserve ratio update
  function lastUpdated() external view returns (uint256);

  /// @notice Returns true if an address is authorized to publish reserve updates
  function isReporter(address reporter) external view returns (bool);

  /// @notice Publish a new reserve ratio (must be called by an authorized reporter)
  function setReserveRatio(uint256 newRatio) external;

  /// @notice Governor-controlled reporter allowlist management
  function setReporter(address reporter, bool allowed) external;
}
