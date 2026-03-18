// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IGovernanceController
/// @notice Governance controller interface.
interface IGovernanceController {
    enum ProtocolState {
        Active,
        Paused,
        EmergencyPaused
    }

    function protocolState() external view returns (ProtocolState);
    function isPaused() external view returns (bool);

    function pauseType1() external;
    function emergencyPause() external;
    function unpause() external;
    function checkEmergencyExpiry() external;

    function isGovernor(address _addr) external view returns (bool);
    function governor() external view returns (address);
    function guardian() external view returns (address);
    function isDepositToken(address _addr) external view returns (bool);
}
