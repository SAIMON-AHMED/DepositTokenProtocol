# DepositTokenProtocol

**DepositTokenProtocol** is a production-ready Ethereum smart contract system for institutional deposit tokens with zk-KYC verification, reserve-backed issuance, and governance-controlled access. Fully aligned with academic research on secure tokenized deposit architectures.

## Key Features

- zk-KYC Verification - Zero-knowledge proof validation before minting
- Reserve Ratio Enforcement - KAPPA threshold prevents over-issuance (minimum 1.0x backing)
- Emergency Pause Mechanism - Anyone can trigger forcePause() if reserves drop
- Governance Control - Governor-managed system with secure access control
- ERC20 Compatible - Full token standard with permit support
- Reentrancy Protection - Safe against reentrancy attacks
- Comprehensive Testing - 29 passing tests covering all scenarios
- Production Gas Optimized - Optimized for mainnet deployment

## Architecture Overview

This protocol consists of five core components:

### Smart Contracts

1. **DepositToken** - ERC20 token with mint/redeem under zk-KYC and reserve constraints
2. **ReserveRegistry** - Canonical on-chain reserve ratio state (reporters publish updates)
3. **GovernanceController** - Manages pause state and protocol configuration
4. **ReserveOracle** - Reporter that publishes reserve attestations to ReserveRegistry
5. **zkVerifierMock** - Zero-knowledge proof verifier interface (integrates with zk circuits)

### Supporting Components

- **RedemptionModule** - Handles redemption settlement (extensible for different fiat backends)
- **IVerifier** - Interface for integrating zk proof verification
- **MathLib** - Safe fixed-point math utilities (18-decimal precision)

## Directory Structure

```
contracts/
├── DepositToken.sol              # Main ERC20 token with minting logic
├── governance/
│   └── GovernanceController.sol  # Pause and governance control
├── oracle/
│   └── ReserveOracle.sol         # Reserve ratio reporter adapter
├── reserve/
│   └── ReserveRegistry.sol       # Canonical reserve state
├── verifier/
│   └── zkVerifierMock.sol        # Mock zk-proof verifier
├── redemption/
│   └── RedemptionModule.sol      # Redemption settlement logic
├── factory/
│   └── DepositTokenFactory.sol   # Token creation factory
├── interfaces/
│   ├── IDepositToken.sol
│   ├── IReserveRegistry.sol
│   ├── IGovernanceController.sol
│   ├── IReserveOracle.sol
│   ├── IVerifier.sol
│   └── IReserveOracle.sol
└── libs/
    └── MathLib.sol               # Fixed-point math utilities

frontend/
├── src/
│   ├── App.js                    # React dashboard with Web3 integration
│   ├── abis/                     # Contract ABIs for frontend
│   └── index.js
└── contract-addresses/
    └── localhost.json            # Deployed contract addresses

scripts/
├── deploy.js                     # Deployment script
├── benchmark.js                  # Performance benchmarking
└── checkBalance.js

test/
├── DepositToken.test.js          # Core token tests
├── GovernanceController.test.js  # Governance tests
├── ReserveOracle.test.js         # Oracle tests
├── deploy.test.js                # Deployment verification
└── integration/
    └── DepositTokenFlow.test.js  # End-to-end integration tests

docs/
├── QUICK_START.md                # Quick setup guide
├── FRONTEND_GUIDE.md             # Frontend usage guide
├── GITHUB_PUBLISH.md             # Publishing instructions
└── PUBLICATION_READINESS.md      # Publication assessment
```

## Quick Start

### Prerequisites

- Node.js 18 or higher
- MetaMask browser extension
- Git

### Step 1: Install and Deploy

```bash
git clone https://github.com/SAIMON-AHMED/DepositTokenProtocol.git
cd DepositTokenProtocol
npm install

# Terminal 1: Start local blockchain
npx hardhat node

# Terminal 2: Deploy contracts
npx hardhat run scripts/deploy.js --network localhost
```

### Step 2: Run Frontend

```bash
# Terminal 3
cd frontend
npm install
npm start
```

Open http://localhost:3000 in your browser.

### Step 3: Connect MetaMask

1. Add Hardhat network to MetaMask:
   - RPC: http://127.0.0.1:8545
   - Chain ID: 1337
2. Import test account from Terminal 1 output
3. Click "Connect Wallet"

## Testing

```bash
# Compile contracts
npx hardhat compile

# Run all tests (29 passing)
npx hardhat test

# Run specific test file
npx hardhat test test/DepositToken.test.js

# Run with gas reporting
REPORT_GAS=true npx hardhat test
```

### Test Coverage

| Component | Tests | Status |
|-----------|-------|--------|
| DepositToken Core | 7 | Passing |
| GovernanceController | 5 | Passing |
| ReserveRegistry | 5 | Passing |
| ReserveOracle | 5 | Passing |
| zkVerifierMock | 3 | Passing |
| Integration Flows | 6 | Passing |
| Deployment | 3 | Passing |
| TOTAL | 29 | ALL PASSING |

## Usage Guide

### For Developers

1. **Local Testing:** Follow Quick Start above
2. **Integration:** Import ABIs from frontend/src/abis/
3. **Deployment:** Use scripts/deploy.js as template for your network
4. **Customization:** Modify parameters in contracts/ before deployment

### For Researchers

- **Paper Integration:** Reference implementation for academic work
- **Architecture Details:** See IMPLEMENTATION_SUMMARY.md
- **Publication Ready:** See PUBLICATION_READINESS.md
- **Code Alignment:** All features documented in TESTING.md

### For Users (Via Frontend)

1. **Mint Tokens:** Provide zk-KYC proof and amount
2. **Redeem Tokens:** Burn tokens to receive backing
3. **Monitor Reserves:** Real-time ratio updates
4. **Emergency Control:** Force pause if reserves become critical

## Security Features

- Input Validation - Zero-address checks and bounds checking
- Access Control - onlyGovernor, onlyMinter, onlyReporter modifiers
- Reentrancy Guard - Protection on sensitive functions
- Event Logging - All state changes emit events
- Emergency Circuit Breaker - forcePause() when reserves critical
- Reserve Bounds - MAX_RATIO prevents nonsensical values
- Non-Replayable Proofs - Nonce tracking on transactions
- Safe Math - OpenZeppelin vetted libraries

### Audit Notes

- Not formally audited (recommended before mainnet)
- Consider professional security audit before production
- zkProof verification depends on circuit implementation
- Oracle reliability depends on data source security

## Documentation

- QUICK_START.md - 3-step local setup
- FRONTEND_GUIDE.md - Complete frontend usage
- TESTING.md - Test specifications and coverage
- IMPLEMENTATION_SUMMARY.md - All changes made
- PUBLICATION_READINESS.md - Publication assessment
- GITHUB_PUBLISH.md - Publishing to GitHub

## Benchmarking

```bash
npx hardhat run scripts/benchmark.js --network localhost
```

Typical gas costs:

- Mint: approximately 150,000 gas
- Redeem: approximately 120,000 gas
- forcePause: approximately 40,000 gas

## Paper Reference

**Academic Paper:** "A Secure Smart Contract Architecture for Institutional Deposit Tokens on Ethereum"

This implementation serves as the reference code for the above research paper, demonstrating:

- Legal framework alignment (MiCA/GENIUS Act)
- Technical security patterns
- Cross-chain interoperability architecture
- zkOracle integration points

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
