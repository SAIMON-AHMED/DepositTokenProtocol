require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("hardhat-abi-exporter");

const { PRIVATE_KEY } = process.env;

module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: false,
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
      gas: 30000000,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      timeout: 100000,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  abiExporter: {
    path: "./frontend/src/abis",
    clear: true,
    flat: true,
    runOnCompile: true,
    only: [
      "DepositToken",
      "ReserveOracle",
      "GovernanceController",
      "zkVerifierMock",
    ],
    spacing: 2,
    pretty: true,
  },
};
