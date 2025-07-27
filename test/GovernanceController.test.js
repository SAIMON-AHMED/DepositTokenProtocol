const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GovernanceController", function () {
  let deployer, other;
  let governance, tokenMock;

  beforeEach(async function () {
    [deployer, other] = await ethers.getSigners();

    const Governance = await ethers.getContractFactory("GovernanceController");
    governance = await Governance.deploy(deployer.address);
    await governance.waitForDeployment();

    const Verifier = await ethers.getContractFactory("zkVerifierMock");
    const verifier = await Verifier.deploy(true);
    await verifier.waitForDeployment();

    const Oracle = await ethers.getContractFactory("ReserveOracle");
    const oracle = await Oracle.deploy();
    await oracle.waitForDeployment();

    const TokenMock = await ethers.getContractFactory("DepositToken");
    tokenMock = await TokenMock.deploy(
      "MockToken",
      "MTK",
      verifier.target,
      oracle.target,
      governance.target
    );
    await tokenMock.waitForDeployment();

    await governance.setDepositToken(tokenMock.target);
  });
  

  it("should initialize with correct governor", async function () {
    expect(await governance.governorAddress()).to.equal(deployer.address);
    expect(await governance.isGovernor(deployer.address)).to.equal(true);
  });

  it("should allow governor to pause and unpause", async function () {
    await governance.pause();
    expect(await governance.isPaused()).to.be.true;

    await governance.unpause();
    expect(await governance.isPaused()).to.be.false;
  });

  it("should prevent non-governor from pausing", async function () {
    await expect(governance.connect(other).pause()).to.be.revertedWith(
      "Not governor"
    );
  });

  it("should update deposit token by governor", async function () {
    const newToken = ethers.Wallet.createRandom().address;
    await governance.setDepositToken(newToken);
    expect(await governance.depositToken()).to.equal(newToken);
  });

  it("should reject deposit token update by non-governor", async function () {
    const newToken = ethers.Wallet.createRandom().address;
    await expect(
      governance.connect(other).setDepositToken(newToken)
    ).to.be.revertedWith("Not governor");
  });
});
