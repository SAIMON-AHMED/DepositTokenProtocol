const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const signers = await hre.ethers.getSigners();
  if (!signers || signers.length === 0) {
    throw new Error("No signers found. Check your network config and wallet.");
  }

  const deployer = signers[0];
  const deployerAddress = await deployer.getAddress();

  console.log("Deploying contracts with account:", deployerAddress);
  const balance = await hre.ethers.provider.getBalance(deployerAddress);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Deploy zkVerifierMock
  const Verifier = await hre.ethers.getContractFactory("zkVerifierMock");
  const verifier = await Verifier.deploy(true);
  await verifier.waitForDeployment();
  console.log("Verifier deployed at:", verifier.target);

  // Deploy ReserveOracle
  const Oracle = await hre.ethers.getContractFactory("ReserveOracle");
  const oracle = await Oracle.deploy();
  await oracle.waitForDeployment();
  console.log("ReserveOracle deployed at:", oracle.target);

  // Set initial reserve ratio
  const initialRatio = hre.ethers.parseEther("1.0");
  await oracle.setReserveRatio(initialRatio);
  console.log("Reserve ratio set to 1.0 (100%)");

  // Deploy GovernanceController
  const GovController = await hre.ethers.getContractFactory("GovernanceController");
  const governance = await GovController.deploy(deployerAddress);
  await governance.waitForDeployment();
  console.log("GovernanceController deployed at:", governance.target);

  // Deploy DepositToken
  const DepositToken = await hre.ethers.getContractFactory("DepositToken");
  const token = await DepositToken.deploy(
    "Deposit USD",
    "dUSD",
    verifier.target,
    oracle.target,
    governance.target
  );
  await token.waitForDeployment();
  console.log("DepositToken deployed at:", token.target);

  // Link token to governance controller
  await governance.setDepositToken(token.target);
  console.log("GovernanceController configured with DepositToken.");

  console.log("\nAll contracts deployed and linked. Ready to test or verify.");

  // === Save addresses to frontend ===
  const addresses = {
    Verifier: verifier.target,
    ReserveOracle: oracle.target,
    GovernanceController: governance.target,
    DepositToken: token.target
  };

  const filePath = path.join(__dirname, "../frontend/contract-addresses/localhost.json");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(addresses, null, 2));
  console.log(`Contract addresses written to ${filePath}`);

  // Optional: show deployer gas cost
  const endBalance = await hre.ethers.provider.getBalance(deployerAddress);
  const spent = hre.ethers.formatEther(balance - endBalance);
  console.log(`Total deployment gas cost: ${spent} ETH`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
