const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DepositTokenProtocol Deployment", function () {
  let deployer;
  let verifier, governance, registry, token, identityRegistry;

  const TOKEN_NAME = "Deposit USD";
  const TOKEN_SYMBOL = "dUSD";
  const INITIAL_RATIO = ethers.parseEther("1.0");

  beforeEach(async function () {
    [deployer] = await ethers.getSigners();

    const Verifier = await ethers.getContractFactory("zkVerifierMock");
    verifier = await Verifier.deploy(true);
    await verifier.waitForDeployment();

    const Governance = await ethers.getContractFactory("GovernanceController");
    governance = await Governance.deploy(deployer.address);
    await governance.waitForDeployment();

    const Registry = await ethers.getContractFactory("ReserveRegistry");
    registry = await Registry.deploy(governance.target, INITIAL_RATIO);
    await registry.waitForDeployment();

    await registry.connect(deployer).setReporter(deployer.address, true);

    const IdRegistry = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await IdRegistry.deploy(
      governance.target,
      deployer.address
    );
    await identityRegistry.waitForDeployment();

    const Token = await ethers.getContractFactory("DepositToken");
    token = await Token.deploy(
      TOKEN_NAME,
      TOKEN_SYMBOL,
      verifier.target,
      registry.target,
      governance.target
    );
    await token.waitForDeployment();

    await governance.connect(deployer).setDepositToken(token.target);
  });

  it("should deploy verifier, governance, registry, identity registry, and token", async function () {
    expect(await verifier.valid()).to.equal(true);

    expect(await registry.reserveRatio()).to.equal(INITIAL_RATIO);
    expect(await governance.isPaused()).to.equal(false);
    expect(await governance.protocolState()).to.equal(0); // Active

    expect(await token.name()).to.equal(TOKEN_NAME);
    expect(await token.symbol()).to.equal(TOKEN_SYMBOL);
    expect(await token.KAPPA_MINT()).to.equal(ethers.parseEther("1.0"));
    expect(await token.KAPPA_PAUSE()).to.equal(ethers.parseEther("0.8"));
  });

  it("should link governance with token", async function () {
    expect(await governance.depositToken()).to.equal(token.target);
  });

  it("should have deployer as governor", async function () {
    const gov = await governance.governor();
    expect(gov).to.equal(deployer.address);
    expect(await governance.isGovernor(deployer.address)).to.equal(true);
  });

  it("should have correct oracle risk parameters", async function () {
    expect(await registry.stalenessThreshold()).to.equal(3600);
    expect(await registry.maxDeviation()).to.equal(ethers.parseEther("0.1"));
    expect(await registry.requiredReporters()).to.equal(1);
  });

  it("should start in Mode A (open transfer) by default", async function () {
    expect(await token.restrictedMode()).to.equal(false);
  });
});
