// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract zkVerifierMock {
  bool public valid;

  constructor(bool _valid) {
    valid = _valid;
  }

  function setValid(bool _valid) external {
    valid = _valid;
  }

  function verifyProof(bytes calldata) external view returns (bool) {
    return valid;
  }
}
