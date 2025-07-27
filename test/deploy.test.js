const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DepositTokenProtocol Deployment", function () {
  let deployer;
  let verifier, oracle, governance, token;

  before(async function () {
    [deployer] = await ethers.getSigners();

    const Verifier = await ethers.getContractFactory("zkVerifierMock");
    verifier = await Verifier.deploy(true);
    await verifier.waitForDeployment();

    const Oracle = await ethers.getContractFactory("ReserveOracle");
    oracle = await Oracle.deploy();
    await oracle.waitForDeployment();
    await oracle.setReserveRatio(ethers.parseEther("1.0"));

    const Governance = await ethers.getContractFactory("GovernanceController");
    governance = await Governance.deploy(deployer.address);
    await governance.waitForDeployment();

    const Token = await ethers.getContractFactory("DepositToken");
    token = await Token.deploy(
      "Deposit USD",
      "dUSD",
      verifier.target,
      oracle.target,
      governance.target
    );
    await token.waitForDeployment();

    await governance.setDepositToken(token.target);
  });
  
  it("should deploy verifier, oracle, governance, and token", async function () {
    expect(await verifier.valid()).to.equal(true);
    expect(await oracle.reserveRatio()).to.equal(
      ethers.parseEther("1.0")
    );
    expect(await governance.isPaused()).to.equal(false);
    expect(await token.name()).to.equal("Deposit USD");
    expect(await token.symbol()).to.equal("dUSD");
  });

  it("should link governance with token", async function () {
    expect(await governance.depositToken()).to.equal(token.target);
  });

  it("should have deployer as governor", async function () {
    expect(await governance.governorAddress()).to.equal(deployer.address);
    expect(await governance.isGovernor(deployer.address)).to.equal(true);
  });
});
