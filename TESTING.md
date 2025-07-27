# DepositTokenProtocol – Test Coverage

This document explains the test cases and logic for the `DepositToken` system and related contracts.

## DepositToken Test Cases

### 1. Mints tokens when zk proof is valid and reserve ratio is OK
- Ensures minting is allowed when zkProof is valid and reserveRatio ≥ KAPPA.

### 2. Fails to mint if reserve ratio is too low
- Tests that minting fails if reserveRatio < KAPPA.

### 3. Fails to mint if zk proof is invalid
- Verifies minting is rejected with an invalid zkProof.

### 4. Burns tokens on redeem
- Ensures `redeem()` burns caller's tokens correctly.

### 5. Pauses if reserve falls below KAPPA
- Calls `forcePause()` when ratio < KAPPA and asserts that pause occurred.

### 6. Prevents minting while paused
- Verifies minting is blocked once protocol is paused.

### 7. Allows only governor to update verifier
- Ensures only `governor()` can call `setVerifier()`.

## GovernanceController Test Cases

### 1. Initializes with correct governor
- Checks that the deployer is set as the initial governor.

### 2. Allows governor to pause and unpause
- Ensures only the governor can pause and unpause the protocol.

### 3. Prevents non-governor from pausing
- Verifies that non-governors cannot pause the protocol.

### 4. Allows governor to update deposit token
- Ensures only the governor can update the deposit token address.

### 5. Prevents non-governor from updating deposit token
- Verifies that non-governors cannot update the deposit token address.

## zkVerifierMock Test Cases

### 1. Returns true for verifyProof when valid is true
- Ensures `verifyProof` returns true if `valid` is true.

### 2. Returns false for verifyProof when valid is false
- Ensures `verifyProof` returns false if `valid` is false.

### 3. Allows changing the valid flag
- Verifies that `setValid` updates the `valid` state.

## ReserveOracle Test Cases

### 1. Sets and gets reserve ratio
- Ensures the reserve ratio can be set and retrieved.

### 2. Only owner can set reserve ratio
- Verifies that only the owner can update the reserve ratio.

### 3. Prevents setting ratio above sanity limit
- Ensures the contract rejects reserve ratios above the allowed maximum.

## Tools

- Framework: [Hardhat](https://hardhat.org/)
- Language: Solidity `^0.8.24`
- Test Runner: Mocha + Chai