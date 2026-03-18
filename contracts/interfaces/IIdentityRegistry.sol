// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IIdentityRegistry
/// @notice Identity registry interface.
interface IIdentityRegistry {
    function isVerified(address account) external view returns (bool);
    function setVerified(address account, bool status) external;
}
