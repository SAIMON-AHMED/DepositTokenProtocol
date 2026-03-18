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

  const Verifier = await hre.ethers.getContractFactory("zkVerifierMock");
  const verifier = await Verifier.deploy(true);
  await verifier.waitForDeployment();
  console.log("Verifier deployed at:", verifier.target);

  const GovController = await hre.ethers.getContractFactory(
    "GovernanceController"
  );
  const governance = await GovController.deploy(deployerAddress);
  await governance.waitForDeployment();
  console.log("GovernanceController deployed at:", governance.target);

  const initialRatio = hre.ethers.parseEther("1.0");
  const Registry = await hre.ethers.getContractFactory("ReserveRegistry");
  const registry = await Registry.deploy(governance.target, initialRatio);
  await registry.waitForDeployment();
  console.log("ReserveRegistry deployed at:", registry.target);

  await registry.setReporter(deployerAddress, true);

  const Oracle = await hre.ethers.getContractFactory("ReserveOracle");
  const oracle = await Oracle.deploy(governance.target, registry.target);
  await oracle.waitForDeployment();
  console.log("ReserveOracle deployed at:", oracle.target);

  await registry.setReporter(oracle.target, true);

  const IdentityRegistry = await hre.ethers.getContractFactory(
    "IdentityRegistry"
  );
  const identityRegistry = await IdentityRegistry.deploy(
    governance.target,
    deployerAddress
  );
  await identityRegistry.waitForDeployment();
  console.log("IdentityRegistry deployed at:", identityRegistry.target);

  const DepositToken = await hre.ethers.getContractFactory("DepositToken");
  const token = await DepositToken.deploy(
    "Deposit USD",
    "dUSD",
    verifier.target,
    registry.target,
    governance.target
  );
  await token.waitForDeployment();
  console.log("DepositToken deployed at:", token.target);

  await governance.setDepositToken(token.target);
  await governance.setGuardian(deployerAddress);

  console.log("\nDone.");

  // Save addresses
  const addresses = {
    Verifier: verifier.target,
    ReserveRegistry: registry.target,
    ReserveOracle: oracle.target,
    GovernanceController: governance.target,
    IdentityRegistry: identityRegistry.target,
    DepositToken: token.target,
  };

  const filePath = path.join(
    __dirname,
    "../frontend/contract-addresses/localhost.json"
  );
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(addresses, null, 2));
  console.log(`Contract addresses written to ${filePath}`);

  const endBalance = await hre.ethers.provider.getBalance(deployerAddress);
  const spent = hre.ethers.formatEther(balance - endBalance);
  console.log(`Total deployment gas cost: ${spent} ETH`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
