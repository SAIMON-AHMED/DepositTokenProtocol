# DepositTokenProtocol

**DepositTokenProtocol** is an Ethereum smart contract system for institutional deposit tokens. It implements zk-KYC verification (Semaphore v4), dual-threshold reserve enforcement, multi-oracle aggregation with staleness/deviation checks, and a two-tier governance pause architecture. The design follows the companion IEEE Access paper.

## Key Features

- **Dual-Threshold Reserve Model** — κ_mint = 1.0 (minting gate) and κ_pause = 0.8 (circuit-breaker trigger)
- **Two-Tier Pause Architecture** — Type 1 (permissionless `checkReserves`) and Type 2 (guardian `emergencyPause` with 72 h auto-expiry)
- **Protocol State Machine** — `Active → Paused → EmergencyPaused` with explicit transitions
- **Transfer Compliance (Mode A / Mode B)** — Mode A: open ERC-20 transfers; Mode B: restricted via on-chain IdentityRegistry
- **Oracle Risk Mitigations** — Staleness bound (τ_max), deviation threshold (Δ_max), and median-of-n aggregation
- **zk-KYC Verification** — Semaphore v4 zero-knowledge proof required for both minting and redeeming (Theorem 2)
- **ERC-20 Permit** — Gasless approvals via EIP-2612
- **Reentrancy Protection** — OpenZeppelin ReentrancyGuard on all state-changing functions
- **Testing** — 71 passing tests covering all scenarios with gas reporting

## Architecture Overview

### Smart Contracts

| Contract                 | Purpose                                                                    |
| ------------------------ | -------------------------------------------------------------------------- |
| **DepositToken**         | ERC-20 token with dual-κ mint/redeem, `checkReserves`, Mode A/B transfers  |
| **GovernanceController** | Protocol state machine, Type 1/2 pauses, guardian + governor roles         |
| **ReserveRegistry**      | Canonical reserve ratio with staleness, deviation, and multi-oracle median |
| **ReserveOracle**        | Reporter adapter that publishes attestations to ReserveRegistry            |
| **IdentityRegistry**     | On-chain KYC registry for Mode B transfer compliance                       |
| **RedemptionModule**     | Redemption settlement with off-chain reference tracking                    |
| **zkVerifierMock**       | Configurable mock verifier (replaced by Groth16 in production)             |
| **DepositTokenFactory**  | Token creation factory                                                     |

The protocol includes a configurable mock verifier for testing. In production, swap it for a Semaphore v4 Groth16 verifier via `setVerifier()`.

## Directory Structure

```
contracts/
├── DepositToken.sol                # Main ERC-20 token (dual κ, Mode A/B, checkReserves)
├── governance/
│   └── GovernanceController.sol    # Protocol states, Type 1/2 pauses, guardian
├── oracle/
│   └── ReserveOracle.sol           # Reserve ratio reporter adapter
├── reserve/
│   └── ReserveRegistry.sol         # Staleness, deviation, multi-oracle median
├── identity/
│   └── IdentityRegistry.sol        # On-chain KYC for Mode B compliance
├── verifier/
│   └── zkVerifierMock.sol          # Mock zk-proof verifier
├── redemption/
│   └── RedemptionModule.sol        # Redemption settlement
├── factory/
│   └── DepositTokenFactory.sol     # Token creation factory
└── interfaces/
    ├── IDepositToken.sol
    ├── IReserveRegistry.sol
    ├── IGovernanceController.sol
    ├── IIdentityRegistry.sol
    ├── IReserveOracle.sol
    └── IVerifier.sol

scripts/
├── deploy.js                       # Full deployment with IdentityRegistry + guardian config
├── benchmark.js                    # Gas benchmarking (mint, redeem, checkReserves, emergencyPause)
└── checkBalance.js

test/
├── DepositToken.test.js            # 21 tests — dual κ, zk-proof redeem, Mode A/B, checkReserves
├── GovernanceController.test.js    # 17 tests — protocol states, Type 1/2 pauses, 72 h expiry
├── ReserveOracle.test.js           # 13 tests — staleness, deviation, multi-oracle aggregation
├── deploy.test.js                  # 5 tests — deployment verification, oracle risk params
├── mocks/zkVerifierMock.js         # 3 tests — mock verifier
└── integration/
    └── DepositTokenFlow.test.js    # 15 tests — end-to-end flow including all new features
```

## Quick Start

### Prerequisites

- Node.js 18+
- MetaMask browser extension
- Git

### Install and Deploy

```bash
git clone https://github.com/SAIMON-AHMED/DepositTokenProtocol.git
cd DepositTokenProtocol
npm install

# Terminal 1: Start local blockchain
npx hardhat node

# Terminal 2: Deploy contracts
npx hardhat run scripts/deploy.js --network localhost
```

### Run Frontend

```bash
cd frontend
npm install
npm start
```

Open http://localhost:3000 and connect MetaMask (RPC: `http://127.0.0.1:8545`, Chain ID: `1337`).

## Testing

```bash
# Compile contracts
npx hardhat compile

# Run all tests (71 passing)
npx hardhat test

# Run specific test file
npx hardhat test test/DepositToken.test.js

# Run with gas reporting
REPORT_GAS=true npx hardhat test
```

### Test Coverage

| Component                                      | Tests  | Coverage        |
| ---------------------------------------------- | ------ | --------------- |
| DepositToken (dual κ, Mode A/B, checkReserves) | 21     | All passing     |
| GovernanceController (states, Type 1/2 pauses) | 17     | All passing     |
| ReserveOracle (staleness, deviation, median)   | 13     | All passing     |
| Deploy verification                            | 5      | All passing     |
| zkVerifierMock                                 | 3      | All passing     |
| Integration (full flow)                        | 15     | All passing     |
| **TOTAL**                                      | **71** | **All passing** |

## Protocol Parameters

| Parameter           | Symbol  | Default | Description                                     |
| ------------------- | ------- | ------- | ----------------------------------------------- |
| Mint threshold      | κ_mint  | 1.0     | Reserve ratio required to mint                  |
| Pause threshold     | κ_pause | 0.8     | Reserve ratio below which Type 1 pause triggers |
| Staleness bound     | τ_max   | 3600 s  | Maximum oracle data age                         |
| Deviation threshold | Δ_max   | 10%     | Maximum single-update reserve ratio change      |
| Required reporters  | n       | 1       | Minimum oracle submissions for aggregation      |
| Emergency expiry    | —       | 72 h    | Type 2 pause auto-downgrade timer               |

## Security Features

- **Dual-Threshold Circuit Breaker** — Automatic Type 1 pause when reserves < κ_pause
- **Guardian Emergency Pause** — Type 2 pause with 72 h auto-expiry prevents indefinite lockout
- **Oracle Staleness Protection** — Minting blocked if oracle data exceeds τ_max
- **Deviation Threshold** — Rejects suspicious oracle updates exceeding Δ_max
- **Median Aggregation** — Multi-oracle median resists single-source manipulation
- **Transfer Compliance** — Mode B restricts transfers to verified identities only
- **Access Control** — `onlyGovernor`, `onlyGuardian`, `onlyMinter`, `onlyReporter` modifiers
- **Reentrancy Guard** — OpenZeppelin protection on sensitive functions
- **Non-Replayable Proofs** — Nonce tracking on zk-proof transactions

### Audit Notes

- Not formally audited (professional audit recommended before mainnet)
- zk-proof verification depends on circuit implementation
- Oracle reliability depends on data source security

## Benchmarking

```bash
npx hardhat run scripts/benchmark.js --network localhost
```

Typical gas costs (local Hardhat):

| Operation              | Approximate Gas |
| ---------------------- | --------------- |
| Mint (with zk-proof)   | ~100,700        |
| Redeem (with zk-proof) | ~53,600         |
| Transfer (Mode A)      | ~62,800         |
| checkReserves          | ~31,800         |
| Emergency Pause        | ~54,800         |

## Paper Reference

**Academic Paper:** "A Secure Smart Contract Architecture for Institutional Deposit Tokens on Ethereum"

This implementation is the reference codebase for the above IEEE Access submission. It covers:

- Dual-threshold reserve enforcement (κ_mint / κ_pause)
- Two-tier pause architecture (Type 1 permissionless + Type 2 guardian with 72 h expiry)
- Protocol state machine (Active / Paused / EmergencyPaused)
- Transfer compliance modes (Mode A open / Mode B restricted with IdentityRegistry)
- Oracle risk mitigations (staleness τ_max, deviation Δ_max, median-of-n)
- Semaphore v4 zk-KYC integration via IVerifier interface
- Legal framework alignment (MiCA / GENIUS Act)

## Deployment

### Local Development

```bash
npx hardhat run scripts/deploy.js --network localhost
```

### Testnet (Sepolia)

```bash
# Set PRIVATE_KEY and SEPOLIA_RPC_URL in .env
npx hardhat run scripts/deploy.js --network sepolia
```

### Mainnet (Production)

```bash
# IMPORTANT: Audit before mainnet deployment
# Set PRIVATE_KEY and Mainnet RPC URL in .env
npx hardhat run scripts/deploy.js --network mainnet
```

## License

MIT License © 2025 Saimon Ahmed and contributors

See LICENSE for details.

## Author

**Saimon Ahmed**

- Email: sahmed25@sfc.edu
- GitHub: SAIMON-AHMED (https://github.com/SAIMON-AHMED)
- LinkedIn: saimon-ahmed (https://linkedin.com/in/saimon-ahmed)

## Contributing

Contributions are welcome. Please feel free to submit issues and pull requests.

For questions or collaboration:

- Open an issue on GitHub
- Email: sahmed25@sfc.edu

## Citation

If you use this code in academic work, please cite:

```bibtex
@software{ahmed2025deposittoken,
  title={DepositTokenProtocol: A Secure Smart Contract Architecture for Institutional Deposit Tokens},
  author={Ahmed, Saimon},
  year={2025},
  url={https://github.com/SAIMON-AHMED/DepositTokenProtocol},
  version={1.0.0}
}
```

## Disclaimer

This code is provided as-is for research and educational purposes. Users assume all risks. Proper security audits are required before production use on live networks.
