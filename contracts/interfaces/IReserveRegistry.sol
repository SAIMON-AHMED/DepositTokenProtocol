// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IReserveRegistry
/// @notice Reserve registry interface.
interface IReserveRegistry {
    function reserveRatio() external view returns (uint256);
    function lastUpdated() external view returns (uint256);
    function isReporter(address reporter) external view returns (bool);
    function submitReserveRatio(uint256 newRatio) external;
    function setReserveRatio(uint256 newRatio) external;
    function setReporter(address reporter, bool allowed) external;
    function stalenessThreshold() external view returns (uint256);
    function maxDeviation() external view returns (uint256);
    function requiredReporters() external view returns (uint256);
    function isStale() external view returns (bool);
}
