// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../DepositToken.sol";
import "../interfaces/IDepositToken.sol";

contract DepositTokenFactory {
  address public owner;
  address[] public allTokens;

  event DepositTokenCreated(address indexed token, string name, string symbol);

  modifier onlyOwner() {
    require(msg.sender == owner, "Not owner");
    _;
  }

  constructor() {
    owner = msg.sender;
  }

  function createDepositToken(
    string memory name,
    string memory symbol,
    address verifier,
    address reserveOracle,
    address governanceController
  ) external onlyOwner returns (address tokenAddr) {
    DepositToken token = new DepositToken(name, symbol, verifier, reserveOracle, governanceController);
    tokenAddr = address(token);
    allTokens.push(tokenAddr);

    emit DepositTokenCreated(tokenAddr, name, symbol);
  }

  function getAllTokens() external view returns (address[] memory) {
    return allTokens;
  }

  function totalTokens() external view returns (uint256) {
    return allTokens.length;
  }


  function transferOwnership(address newOwner) external onlyOwner {
    require(newOwner != address(0), "Zero address");
    owner = newOwner;
  }
}
