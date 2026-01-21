const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReserveOracle", function () {
  let oracle, governance, registry, deployer;

  const INITIAL_RATIO = ethers.parseEther("1.0");

  beforeEach(async function () {
    [deployer] = await ethers.getSigners();

    // Deploy governance first
    const Governance = await ethers.getContractFactory("GovernanceController");
    governance = await Governance.deploy(deployer.address);
    await governance.waitForDeployment();

    // Deploy reserve registry
    const Registry = await ethers.getContractFactory("ReserveRegistry");
    registry = await Registry.deploy(governance.target, INITIAL_RATIO);
    await registry.waitForDeployment();

    // Authorize deployer as reporter
    await registry.setReporter(deployer.address, true);

    // Deploy oracle with governance and registry
    const Oracle = await ethers.getContractFactory("ReserveOracle");
    oracle = await Oracle.deploy(governance.target, registry.target);
    await oracle.waitForDeployment();

    // Authorize oracle as reporter
    await registry.setReporter(oracle.target, true);
  });

  it("should initialize with correct registry reference", async function () {
    expect(await oracle.reserveRegistry()).to.equal(registry.target);
  });

  it("should report reserve ratio to registry", async function () {
    const newRatio = ethers.parseEther("0.85");
    await oracle.reportReserveRatio(newRatio);
    expect(await registry.reserveRatio()).to.equal(newRatio);
  });

  it("should allow updating reserve ratio multiple times", async function () {
    const ratios = [0.95, 0.75, 1.1];

    for (const r of ratios) {
      const ratio = ethers.parseEther(r.toString());
      await oracle.reportReserveRatio(ratio);
      expect(await registry.reserveRatio()).to.equal(ratio);
    }
  });
  it("should revert when setting reserve ratio to zero", async function () {
    await expect(oracle.reportReserveRatio(0)).to.be.revertedWith(
      "Ratio must be positive"
    );
  });

  it("should emit ReserveRatioReported event on update", async function () {
    const newRatio = ethers.parseEther("0.85");
    await expect(oracle.reportReserveRatio(newRatio)).to.emit(
      oracle,
      "ReserveRatioReported"
    );
  });
});
