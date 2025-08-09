const { ethers } = require("hardhat");

async function averageGasUsage(fn, label, runs = 5) {
  let totalGas = 0n;
  for (let i = 0; i < runs; i++) {
    const tx = await fn();
    const receipt = await tx.wait();
    totalGas += receipt.gasUsed;
  }
  const avg = totalGas / BigInt(runs);
  console.log(`${label}: ${avg.toString()} gas (avg over ${runs} runs)`);
}

async function main() {
  const [owner, user] = await ethers.getSigners();

  console.log("Deploying contracts...");

  const ReserveOracle = await ethers.getContractFactory("ReserveOracle");
  const GovernanceController = await ethers.getContractFactory(
    "GovernanceController"
  );
  const VerifierMock = await ethers.getContractFactory("zkVerifierMock");
  const DepositToken = await ethers.getContractFactory("DepositToken");

  const reserveOracle = await ReserveOracle.deploy();
  await reserveOracle.waitForDeployment();
  console.log("ReserveOracle deployed at:", await reserveOracle.getAddress());

  const govController = await GovernanceController.deploy(owner.address);
  await govController.waitForDeployment();
  console.log(
    "GovernanceController deployed at:",
    await govController.getAddress()
  );

  const verifier = await VerifierMock.deploy(true);
  await verifier.waitForDeployment();
  console.log("VerifierMock deployed at:", await verifier.getAddress());

  const depositToken = await DepositToken.deploy(
    "dUSD",
    "dUSD",
    await verifier.getAddress(),
    await reserveOracle.getAddress(),
    await govController.getAddress()
  );
  await depositToken.waitForDeployment();
  console.log("DepositToken deployed at:", await depositToken.getAddress());

  // Setup links
  await govController.setDepositToken(await depositToken.getAddress());

  // Initial reserve ratio must be set to something non-zero
  await reserveOracle.setReserveRatio(ethers.parseUnits("1.0001", 18)); // 100.01%

  console.log("\n--- Starting Benchmarks ---");

  const dummyProof = "0x1234";

  // Mint 100 tokens
  await averageGasUsage(
    () => depositToken.mint(user.address, ethers.parseEther("100"), dummyProof),
    "Minting 100 dUSD"
  );

  // Redeem 50 tokens
  await averageGasUsage(
    () => depositToken.connect(user).redeem(ethers.parseEther("50")),
    "Redeeming 50 dUSD"
  );

  // Transfer tokens
  await averageGasUsage(
    () =>
      depositToken
        .connect(user)
        .transfer(owner.address, ethers.parseEther("10")),
    "Transferring 10 dUSD"
  );

  // ReserveOracle: Set a new ratio each time to avoid "Same ratio" revert
  let baseRatio = ethers.parseUnits("1.05", 18);
  let counter = 0;

  await averageGasUsage(async () => {
    counter++;
    const variedRatio = baseRatio + BigInt(counter); // tiny delta
    return reserveOracle.setReserveRatio(variedRatio);
  }, "Updating ReserveOracle ratio");

  // GovernanceController: Change governor
  await averageGasUsage(
    () => govController.setGovernor(user.address),
    "Changing Governor"
  );
}

main().catch((err) => {
  console.error("Benchmark script failed:", err);
  process.exitCode = 1;
});
