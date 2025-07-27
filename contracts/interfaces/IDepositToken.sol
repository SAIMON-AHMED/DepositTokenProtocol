// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IDepositToken {
  function mint(address to, uint256 amount, bytes calldata zkProof) external;
  function redeem(uint256 amount) external;
  function forcePause() external;
  function setVerifier(address newVerifier) external;
  function setReserveOracle(address newOracle) external;
  function setGovernanceController(address newGov) external;
}
