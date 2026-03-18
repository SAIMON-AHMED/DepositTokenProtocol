const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReserveOracle & ReserveRegistry", function () {
  let oracle, governance, registry, deployer, other;

  const INITIAL_RATIO = ethers.parseEther("1.0");

  beforeEach(async function () {
    [deployer, other] = await ethers.getSigners();

    const Governance = await ethers.getContractFactory("GovernanceController");
    governance = await Governance.deploy(deployer.address);
    await governance.waitForDeployment();

    const Registry = await ethers.getContractFactory("ReserveRegistry");
    registry = await Registry.deploy(governance.target, INITIAL_RATIO);
    await registry.waitForDeployment();

    await registry.setReporter(deployer.address, true);

    const Oracle = await ethers.getContractFactory("ReserveOracle");
    oracle = await Oracle.deploy(governance.target, registry.target);
    await oracle.waitForDeployment();

    await registry.setReporter(oracle.target, true);
  });

  it("should initialize with correct registry reference", async function () {
    expect(await oracle.reserveRegistry()).to.equal(registry.target);
  });

  it("should report reserve ratio to registry", async function () {
    // Stay within 10% deviation of 1.0
    const newRatio = ethers.parseEther("0.95");
    await oracle.reportReserveRatio(newRatio);
    expect(await registry.reserveRatio()).to.equal(newRatio);
  });

  it("should emit ReserveRatioReported event on update", async function () {
    const newRatio = ethers.parseEther("0.95");
    await expect(oracle.reportReserveRatio(newRatio)).to.emit(
      oracle,
      "ReserveRatioReported"
    );
  });

  it("should revert when setting reserve ratio to zero", async function () {
    await expect(oracle.reportReserveRatio(0)).to.be.revertedWith(
      "Ratio must be positive"
    );
  });

  it("should report non-stale immediately after update", async function () {
    expect(await registry.isStale()).to.equal(false);
  });

  it("should report stale after staleness threshold elapses", async function () {
    // Default τ_max = 3600 seconds
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine", []);
    expect(await registry.isStale()).to.equal(true);
  });

  it("should allow governance to configure staleness threshold", async function () {
    await registry.setStalenessThreshold(7200); // 2 hours
    expect(await registry.stalenessThreshold()).to.equal(7200);
  });

  it("should reject submission exceeding Δ_max", async function () {
    // Current ratio is 1.0, submitting 0.5 is >10% deviation
    await expect(
      registry.connect(deployer).setReserveRatio(ethers.parseEther("0.5"))
    ).to.be.revertedWith("Deviation exceeds threshold");
  });

  it("should accept submission within Δ_max", async function () {
    // 1.0 → 0.95 is 5% deviation, within 10% threshold
    await registry.connect(deployer).setReserveRatio(ethers.parseEther("0.95"));
    expect(await registry.reserveRatio()).to.equal(ethers.parseEther("0.95"));
  });

  it("should revert on excessive deviation", async function () {
    await expect(
      registry.connect(deployer).setReserveRatio(ethers.parseEther("0.5"))
    ).to.be.revertedWith("Deviation exceeds threshold");
  });

  it("should allow governance to configure max deviation", async function () {
    await registry.setMaxDeviation(ethers.parseEther("0.5")); // 50%
    expect(await registry.maxDeviation()).to.equal(ethers.parseEther("0.5"));

    // Now 0.5 should be accepted (50% deviation allowed)
    await registry.connect(deployer).setReserveRatio(ethers.parseEther("0.5"));
    expect(await registry.reserveRatio()).to.equal(ethers.parseEther("0.5"));
  });

  it("should support multiple reporter submissions with median", async function () {
    // Set required reporters to 3
    await registry.setRequiredReporters(3);

    // Add other as reporter
    await registry.setReporter(other.address, true);

    // Add oracle as 3rd reporter (already authorized)
    // Submit 3 values within deviation range
    await registry
      .connect(deployer)
      .submitReserveRatio(ethers.parseEther("0.95"));
    await registry.connect(other).submitReserveRatio(ethers.parseEther("1.05"));
    await oracle.reportReserveRatio(ethers.parseEther("0.98"));

    // Median of [0.95, 0.98, 1.05] = 0.98
    expect(await registry.reserveRatio()).to.equal(ethers.parseEther("0.98"));
  });

  it("should track per-reporter values", async function () {
    await registry
      .connect(deployer)
      .submitReserveRatio(ethers.parseEther("0.95"));
    expect(await registry.reporterValues(deployer.address)).to.equal(
      ethers.parseEther("0.95")
    );
  });
});
