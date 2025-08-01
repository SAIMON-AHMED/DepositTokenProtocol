// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IVerifier {
  function verifyProof(bytes calldata proof) external view returns (bool);
}
