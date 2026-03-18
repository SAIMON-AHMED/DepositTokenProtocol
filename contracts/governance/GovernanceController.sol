// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title GovernanceController
/// @notice Protocol state machine with Type 1/2 pause mechanisms.
contract GovernanceController {
    enum ProtocolState {
        Active,
        Paused,
        EmergencyPaused
    }

    address public owner;
    address public governor;
    address public guardian;
    address public depositToken;

    ProtocolState public protocolState;
    uint256 public emergencyPauseExpiry;

    event ProtocolStateChanged(
        ProtocolState indexed oldState,
        ProtocolState indexed newState,
        string pauseType
    );
    event EmergencyPauseActivated(address indexed triggeredBy, uint256 expiry);
    event EmergencyPauseExpired();
    event GuardianUpdated(
        address indexed oldGuardian,
        address indexed newGuardian
    );
    event GovernorUpdated(
        address indexed oldGovernor,
        address indexed newGovernor
    );
    event DepositTokenUpdated(address indexed token);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyGovernor() {
        require(msg.sender == governor, "Not governor");
        _;
    }

    modifier onlyGuardian() {
        require(msg.sender == guardian, "Not guardian");
        _;
    }

    modifier onlyDepositToken() {
        require(msg.sender == depositToken, "Not deposit token");
        _;
    }

    constructor(address _owner) {
        require(_owner != address(0), "Invalid owner");
        owner = _owner;
        governor = _owner; // initially, owner is governor
        protocolState = ProtocolState.Active;
    }

    function isPaused() external view returns (bool) {
        return protocolState != ProtocolState.Active;
    }

    function isEmergencyPaused() external view returns (bool) {
        return protocolState == ProtocolState.EmergencyPaused;
    }

    function isGovernor(address _addr) external view returns (bool) {
        return _addr == governor;
    }

    function isDepositToken(address _addr) external view returns (bool) {
        return _addr == depositToken;
    }

    function governorAddress() external view returns (address) {
        return governor;
    }

    /// @notice Type 1 pause — called by DepositToken when reserves drop below κ_pause.
    function pauseType1() external onlyDepositToken {
        require(protocolState == ProtocolState.Active, "Not in Active state");
        ProtocolState old = protocolState;
        protocolState = ProtocolState.Paused;
        emit ProtocolStateChanged(old, ProtocolState.Paused, "Type1-Automatic");
    }

    /// @notice Type 2 pause — guardian halts all ops for up to 72h.
    function emergencyPause() external onlyGuardian {
        require(
            protocolState == ProtocolState.Active ||
                protocolState == ProtocolState.Paused,
            "Already in EmergencyPaused"
        );
        ProtocolState old = protocolState;
        protocolState = ProtocolState.EmergencyPaused;
        emergencyPauseExpiry = block.timestamp + 72 hours;
        emit EmergencyPauseActivated(msg.sender, emergencyPauseExpiry);
        emit ProtocolStateChanged(
            old,
            ProtocolState.EmergencyPaused,
            "Type2-Guardian"
        );
    }

    /// @notice Downgrades EmergencyPaused → Paused if 72h has elapsed. Callable by anyone.
    function checkEmergencyExpiry() external {
        require(
            protocolState == ProtocolState.EmergencyPaused,
            "Not in EmergencyPaused"
        );
        require(
            block.timestamp >= emergencyPauseExpiry,
            "Emergency pause not expired"
        );
        protocolState = ProtocolState.Paused;
        emit EmergencyPauseExpired();
        emit ProtocolStateChanged(
            ProtocolState.EmergencyPaused,
            ProtocolState.Paused,
            "Type2-Expired"
        );
    }

    function unpause() external onlyGovernor {
        require(protocolState == ProtocolState.Paused, "Not in Paused state");
        protocolState = ProtocolState.Active;
        emit ProtocolStateChanged(
            ProtocolState.Paused,
            ProtocolState.Active,
            "Unpause"
        );
    }

    /// @notice Simple governor pause for testing / backward compat.
    function pause() external onlyGovernor {
        require(protocolState == ProtocolState.Active, "Not in Active state");
        ProtocolState old = protocolState;
        protocolState = ProtocolState.Paused;
        emit ProtocolStateChanged(old, ProtocolState.Paused, "Governor");
    }

    function setDepositToken(address _depositToken) external onlyGovernor {
        depositToken = _depositToken;
        emit DepositTokenUpdated(_depositToken);
    }

    function setGuardian(address _guardian) external onlyOwner {
        address old = guardian;
        guardian = _guardian;
        emit GuardianUpdated(old, _guardian);
    }

    function setGovernor(address newGov) external onlyOwner {
        require(newGov != address(0), "Invalid governor");
        address old = governor;
        governor = newGov;
        emit GovernorUpdated(old, newGov);
    }
}
