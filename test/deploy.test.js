const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DepositTokenProtocol Deployment", function () {
  let deployer;
  let verifier, governance, registry, token;

  const TOKEN_NAME = "Deposit USD";
  const TOKEN_SYMBOL = "dUSD";
  const INITIAL_RATIO = ethers.parseEther("1.0");

  beforeEach(async function () {
    [deployer] = await ethers.getSigners();

    // zk verifier (mock)
    const Verifier = await ethers.getContractFactory("zkVerifierMock");
    verifier = await Verifier.deploy(true);
    await verifier.waitForDeployment();

    // governance
    const Governance = await ethers.getContractFactory("GovernanceController");
    governance = await Governance.deploy(deployer.address);
    await governance.waitForDeployment();

    // canonical reserve state (registry)
    const Registry = await ethers.getContractFactory("ReserveRegistry");
    registry = await Registry.deploy(governance.target, INITIAL_RATIO);
    await registry.waitForDeployment();

    // make deployer an explicit reporter for deterministic tests (safe if already reporter)
    await registry.connect(deployer).setReporter(deployer.address, true);

    // deposit token
    const Token = await ethers.getContractFactory("DepositToken");
    token = await Token.deploy(
      TOKEN_NAME,
      TOKEN_SYMBOL,
      verifier.target,
      registry.target,
      governance.target
    );
    await token.waitForDeployment();

    // link governance -> token
    await governance.connect(deployer).setDepositToken(token.target);
  });

  it("should deploy verifier, governance, registry, and token", async function () {
    expect(await verifier.valid()).to.equal(true);

    expect(await registry.reserveRatio()).to.equal(INITIAL_RATIO);
    expect(await governance.isPaused()).to.equal(false);

    expect(await token.name()).to.equal(TOKEN_NAME);
    expect(await token.symbol()).to.equal(TOKEN_SYMBOL);
  });

  it("should link governance with token", async function () {
    expect(await governance.depositToken()).to.equal(token.target);
  });

  it("should have deployer as governor", async function () {
    const gov = await governance.governor(); 

    expect(gov).to.equal(deployer.address);
    expect(await governance.isGovernor(deployer.address)).to.equal(true);
  });
});
