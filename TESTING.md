# DepositTokenProtocol – Test Coverage

This document explains the test cases and logic for the `DepositToken` system.

## Test Cases

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

## Tools

- Framework: [Hardhat](https://hardhat.org/)
- Language: Solidity `^0.8.24`
- Test Runner: Mocha + Chai
