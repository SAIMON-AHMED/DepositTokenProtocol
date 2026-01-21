const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GovernanceController", function () {
  let deployer, other;
  let governance, tokenMock, verifier, registry;

  const INITIAL_RATIO = ethers.parseEther("1.0");

  beforeEach(async function () {
    [deployer, other] = await ethers.getSigners();

    const Governance = await ethers.getContractFactory("GovernanceController");
    governance = await Governance.deploy(deployer.address);
    await governance.waitForDeployment();

    const Verifier = await ethers.getContractFactory("zkVerifierMock");
    verifier = await Verifier.deploy(true);
    await verifier.waitForDeployment();

    // Use ReserveRegistry (canonical reserve state)
    const Registry = await ethers.getContractFactory("ReserveRegistry");
    registry = await Registry.deploy(governance.target, INITIAL_RATIO);
    await registry.waitForDeployment();

    // Make deployer an explicit reporter (deterministic)
    await registry.connect(deployer).setReporter(deployer.address, true);

    const TokenMock = await ethers.getContractFactory("DepositToken");
    tokenMock = await TokenMock.deploy(
      "MockToken",
      "MTK",
      verifier.target,
      registry.target,
      governance.target
    );
    await tokenMock.waitForDeployment();

    await governance.connect(deployer).setDepositToken(tokenMock.target);
  });

  it("should initialize with correct governor", async function () {
    expect(await governance.governorAddress()).to.equal(deployer.address);
    expect(await governance.isGovernor(deployer.address)).to.equal(true);
  });

  it("should allow governor to pause and unpause", async function () {
    await governance.connect(deployer).pause();
    expect(await governance.isPaused()).to.be.true;

    await governance.connect(deployer).unpause();
    expect(await governance.isPaused()).to.be.false;
  });

  it("should prevent non-governor from pausing", async function () {
    await expect(governance.connect(other).pause()).to.be.revertedWith(
      "Not governor"
    );
  });

  it("should update deposit token by governor", async function () {
    const newToken = ethers.Wallet.createRandom().address;
    await governance.connect(deployer).setDepositToken(newToken);
    expect(await governance.depositToken()).to.equal(newToken);
  });

  it("should reject deposit token update by non-governor", async function () {
    const newToken = ethers.Wallet.createRandom().address;
    await expect(
      governance.connect(other).setDepositToken(newToken)
    ).to.be.revertedWith("Not governor");
  });
});
