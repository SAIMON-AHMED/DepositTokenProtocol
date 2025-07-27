const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy zkVerifierMock (for dev/test use)
  const Verifier = await ethers.getContractFactory("zkVerifierMock");
  const verifier = await Verifier.deploy(true);
  await verifier.deployed();
  console.log("Verifier deployed at:", verifier.address);

  // Deploy ReserveOracle
  const Oracle = await ethers.getContractFactory("ReserveOracle");
  const oracle = await Oracle.deploy();
  await oracle.deployed();
  console.log("ReserveOracle deployed at:", oracle.address);

  // Set initial reserve ratio (e.g., 100%)
  const initialRatio = ethers.utils.parseEther("1.0");
  await oracle.setReserveRatio(initialRatio);
  console.log("Reserve ratio set to 1.0 (100%)");

  // Deploy GovernanceController
  const GovController = await ethers.getContractFactory("GovernanceController");
  const governance = await GovController.deploy(deployer.address);
  await governance.deployed();
  console.log("GovernanceController deployed at:", governance.address);

  // Deploy DepositToken
  const DepositToken = await ethers.getContractFactory("DepositToken");
  const token = await DepositToken.deploy(
    "Deposit USD",
    "dUSD",
    verifier.address,
    oracle.address,
    governance.address
  );
  await token.deployed();
  console.log("DepositToken deployed at:", token.address);

  // Set the token in governance controller
  await governance.setDepositToken(token.address);
  console.log("GovernanceController configured with DepositToken.");

  console.log("Deployment complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
// Run this script with: npx hardhat run scripts/deploy.js --network sepolia