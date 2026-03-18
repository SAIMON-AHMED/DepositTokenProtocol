// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IDepositToken {
    function mint(address to, uint256 amount, bytes calldata zkProof) external;
    function redeem(uint256 amount, bytes calldata zkProof) external;
    function checkReserves() external;
    function setVerifier(address newVerifier) external;
    function setReserveRegistry(address newRegistry) external;
    function setGovernanceController(address newGov) external;
    function setRestrictedMode(bool enabled) external;
    function setIdentityRegistry(address newRegistry) external;
    function restrictedMode() external view returns (bool);
    function KAPPA_MINT() external view returns (uint256);
    function KAPPA_PAUSE() external view returns (uint256);
}
