require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

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
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
// This configuration file sets up Hardhat with the Solidity compiler version 0.8.28,
// enables optimizer settings for gas efficiency, and configures networks for local development
// and Sepolia testnet. It also includes environment variables for sensitive data like RPC URLs
// and private keys, ensuring that they are not hardcoded in the source code.
// The etherscan API key is included for verifying contracts on Etherscan.
// Make sure to create a `.env` file in the root of your project with the necessary
// environment variables defined, such as `SEPOLIA_RPC_URL`, `PRIVATE_KEY`, and `ETHERSCAN_API_KEY`.
// This setup allows for easy deployment and testing of smart contracts in a secure and efficient manner.
// To run the Hardhat tasks, use commands like `npx hardhat compile`, `npx hardhat test`, or `npx hardhat run scripts/deploy.js`.
// Ensure you have the necessary dependencies installed in your project, such as `@nomicfoundation/hardhat-toolbox` and `dotenv`.
