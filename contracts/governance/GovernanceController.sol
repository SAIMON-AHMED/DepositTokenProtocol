// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract GovernanceController {
  address public owner;
  address public governor;
  address public depositToken;
  bool public paused;

  constructor(address _owner) {
    owner = _owner;
    governor = _owner; // initially, owner is governor
  }

  modifier onlyOwner() {
    require(msg.sender == owner, "Not owner");
    _;
  }

  modifier onlyGovernor() {
    require(msg.sender == governor, "Not governor");
    _;
  }

  modifier onlyAuthorized() {
    require(
      msg.sender == owner || msg.sender == depositToken,
      "Not authorized"
    );
    _;
  }

  function setDepositToken(address _depositToken) external onlyGovernor {
    depositToken = _depositToken;
  }

  function pause() external onlyGovernor {
    paused = true;
  }

  function unpause() external onlyOwner {
    paused = false;
  }

  function isPaused() external view returns (bool) {
    return paused;
  }

  function isGovernor(address _addr) external view returns (bool) {
    return _addr == governor;
  }

  function governorAddress() external view returns (address) {
    return governor;
  }

  function setGovernor(address newGov) external onlyOwner {
    governor = newGov;
  }
}
