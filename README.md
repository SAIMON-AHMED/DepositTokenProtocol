# DepositTokenProtocol

**DepositTokenProtocol** is a secure and compliant Ethereum-based smart contract system designed to represent tokenized fiat deposits issued by financial institutions. It includes zk-KYC verification, reserve-backed issuance, and governance-controlled access.

## Architecture Overview

This protocol is composed of four core components:

- **DepositToken**: An ERC20-compatible smart contract allowing minting and redeeming of deposit tokens under zk-KYC and reserve constraints.
- **GovernanceController**: Manages the pause state and configuration privileges of the protocol.
- **ReserveOracle**: Provides the current reserve ratio to determine whether new tokens can be minted.
- **IVerifier**: Interface for integrating zero-knowledge proof verification to validate user compliance (e.g., KYC/AML).

## Features

- zk-KYC proof verification before minting
- Reserve ratio enforcement based on oracle input
- Emergency pause if reserves fall below a threshold
- Secure governance via Governor role
- Modular and testable design

## Directory Structure

```
contracts/
├── DepositToken.sol
├── governance/
│   └── GovernanceController.sol
├── interfaces/
│   ├── IGovernanceController.sol
│   ├── IReserveOracle.sol
│   └── IVerifier.sol
test/
└── DepositToken.test.js
scripts/
└── deploy.js
TESTING.md
README.md
hardhat.config.js
package.json
```

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/SAIMON-AHMED/DepositTokenProtocol.git
cd DepositTokenProtocol
npm install
```

## Running Tests

To compile and test the contracts:

```bash
npx hardhat compile
npx hardhat test
```

### Example Test Output

```
✔ mints tokens when zk proof is valid and reserve ratio is OK
✔ fails to mint if reserve ratio is too low
✔ fails to mint if zk proof is invalid
✔ burns tokens on redeem
✔ pauses if reserve falls below KAPPA
✔ prevents minting while paused
✔ allows only governor to update verifier
```

## Usage Summary

- Users must submit a valid zk-KYC proof to mint tokens.
- Minting is allowed only if the reserve ratio meets or exceeds KAPPA.
- Tokens can be redeemed (burned) at any time.
- If reserves drop below KAPPA, anyone can trigger `forcePause`.
- Only governors can change the verifier, oracle, or controller addresses.

## Security Notes

- zkProofs must be valid and non-replayable.
- GovernanceController must be configured with secure ownership.
- Oracle inputs should be protected against manipulation.
- Consider integrating role-based access controls and audit logging.

## Research Context

This codebase supports a broader research effort titled:

**"A Secure Smart Contract Architecture for Institutional Deposit Tokens on Ethereum"**

The paper discusses legal, technical, and regulatory aspects, including zkOracles, cross-chain interoperability, and MiCA/GENIUS Act alignment.

## License

MIT License  
© 2025 Saimon Ahmed and contributors

## Contact

For research collaboration or implementation questions:

- **Saimon Ahmed**  
- Email: sahmed25@sfc.edu  
- LinkedIn: [https://linkedin.com/in/saimon-ahmed](https://linkedin.com/in/saimon-ahmed)

