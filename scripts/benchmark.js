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

  console.log("Deploying...");

  const ReserveRegistry = await ethers.getContractFactory("ReserveRegistry");
  const ReserveOracle = await ethers.getContractFactory("ReserveOracle");
  const GovernanceController = await ethers.getContractFactory(
    "GovernanceController"
  );
  const VerifierMock = await ethers.getContractFactory("zkVerifierMock");
  const DepositToken = await ethers.getContractFactory("DepositToken");

  const govController = await GovernanceController.deploy(owner.address);
  await govController.waitForDeployment();
  console.log(
    "GovernanceController deployed at:",
    await govController.getAddress()
  );

  const reserveRegistry = await ReserveRegistry.deploy(
    await govController.getAddress(),
    ethers.parseUnits("1.0001", 18) // 100.01% initial ratio
  );
  await reserveRegistry.waitForDeployment();
  console.log(
    "ReserveRegistry deployed at:",
    await reserveRegistry.getAddress()
  );

  const reserveOracle = await ReserveOracle.deploy(
    await govController.getAddress(),
    await reserveRegistry.getAddress()
  );
  await reserveOracle.waitForDeployment();
  console.log("ReserveOracle deployed at:", await reserveOracle.getAddress());

  await reserveRegistry.setReporter(await reserveOracle.getAddress(), true);

  const verifier = await VerifierMock.deploy(true);
  await verifier.waitForDeployment();
  console.log("VerifierMock deployed at:", await verifier.getAddress());

  const depositToken = await DepositToken.deploy(
    "dUSD",
    "dUSD",
    await verifier.getAddress(),
    await reserveRegistry.getAddress(),
    await govController.getAddress()
  );
  await depositToken.waitForDeployment();
  console.log("DepositToken deployed at:", await depositToken.getAddress());

  await govController.setDepositToken(await depositToken.getAddress());

  console.log("\n--- Benchmarks ---");

  const dummyProof = "0x1234";

  // Mint 100 tokens
  await averageGasUsage(
    () => depositToken.mint(user.address, ethers.parseEther("100"), dummyProof),
    "Minting 100 dUSD"
  );

  // Redeem 50 tokens (now requires zkProof per Theorem 2)
  await averageGasUsage(
    () =>
      depositToken.connect(user).redeem(ethers.parseEther("50"), dummyProof),
    "Redeeming 50 dUSD (with zk-proof)"
  );

  // Transfer tokens (Mode A — open)
  await averageGasUsage(
    () =>
      depositToken
        .connect(user)
        .transfer(owner.address, ethers.parseEther("10")),
    "Transferring 10 dUSD (Mode A)"
  );

  // checkReserves — permissionless reserve check (Type 1 pause trigger)
  await averageGasUsage(
    () => depositToken.connect(user).checkReserves(),
    "checkReserves (no pause triggered)"
  );

  // ReserveOracle: Set a new ratio each time
  let baseRatio = ethers.parseUnits("1.05", 18);
  let counter = 0;

  await averageGasUsage(async () => {
    counter++;
    const variedRatio = baseRatio + BigInt(counter); // tiny delta
    return reserveOracle.reportReserveRatio(variedRatio);
  }, "Updating reserve ratio via ReserveOracle");

  // GovernanceController: Change governor
  await averageGasUsage(
    () => govController.setGovernor(user.address),
    "Changing Governor"
  );

  // Emergency pause (Type 2 — guardian-initiated)
  await govController.setGuardian(owner.address);
  const pauseTx = await govController.emergencyPause();
  const pauseReceipt = await pauseTx.wait();
  console.log(
    `Emergency Pause (Type 2): ${pauseReceipt.gasUsed.toString()} gas`
  );

  // checkEmergencyExpiry
  const expiryTx = await govController.checkEmergencyExpiry();
  const expiryReceipt = await expiryTx.wait();
  console.log(`checkEmergencyExpiry: ${expiryReceipt.gasUsed.toString()} gas`);
}

main().catch((err) => {
  console.error("Benchmark script failed:", err);
  process.exitCode = 1;
});
