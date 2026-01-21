const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DepositToken - Full Integration Flow", function () {
  let deployer, user1, user2;
  let verifier, governance, registry, token;

  const TOKEN_NAME = "Deposit USD";
  const TOKEN_SYMBOL = "dUSD";
  const INITIAL_RATIO = ethers.parseEther("1.0");
  const LOW_RATIO = ethers.parseEther("0.4");
  const AMOUNT = 1000;

  beforeEach(async function () {
    [deployer, user1, user2] = await ethers.getSigners();

    // Deploy GovernanceController
    const Controller = await ethers.getContractFactory("GovernanceController");
    governance = await Controller.deploy(deployer.address);
    await governance.waitForDeployment();

    // Deploy zkVerifierMock (true = always valid proof)
    const Verifier = await ethers.getContractFactory("zkVerifierMock");
    verifier = await Verifier.deploy(true);
    await verifier.waitForDeployment();

    // Deploy ReserveRegistry (canonical reserve state used by DepositToken)
    const Registry = await ethers.getContractFactory("ReserveRegistry");
    registry = await Registry.deploy(governance.target, INITIAL_RATIO);
    await registry.waitForDeployment();

    // Make deployer an explicit reporter
    await registry.connect(deployer).setReporter(deployer.address, true);

    // Deploy DepositToken (uses reserveRegistry)
    const Token = await ethers.getContractFactory("DepositToken");
    token = await Token.deploy(
      TOKEN_NAME,
      TOKEN_SYMBOL,
      verifier.target,
      registry.target,
      governance.target
    );
    await token.waitForDeployment();

    // Link governance to token
    await governance.connect(deployer).setDepositToken(token.target);

    // Note: deployer is already a minter by DepositToken constructor default
  });

  it("should mint successfully when proof is valid and reserve is healthy", async function () {
    await token.connect(deployer).mint(user1.address, AMOUNT, "0x00");
    expect(await token.balanceOf(user1.address)).to.equal(AMOUNT);
  });

  it("should revert minting when reserve ratio drops below KAPPA", async function () {
    await registry.connect(deployer).setReserveRatio(LOW_RATIO);

    await expect(
      token.connect(deployer).mint(user2.address, AMOUNT, "0x00")
    ).to.be.revertedWith("Paused: Reserve below threshold");
  });

  it("should allow governor to pause and prevent further minting", async function () {
    await governance.connect(deployer).pause();
    expect(await governance.isPaused()).to.equal(true);

    await expect(
      token.connect(deployer).mint(user1.address, AMOUNT, "0x00")
    ).to.be.revertedWith("Protocol is paused");
  });

  it("should allow governor to unpause after reserve recovery", async function () {
    await governance.connect(deployer).pause();
    expect(await governance.isPaused()).to.equal(true);

    await registry.connect(deployer).setReserveRatio(INITIAL_RATIO);
    await governance.connect(deployer).unpause();
    expect(await governance.isPaused()).to.equal(false);

    await token.connect(deployer).mint(user2.address, AMOUNT, "0x00");
    expect(await token.balanceOf(user2.address)).to.equal(AMOUNT);
  });

  it("should allow redeeming tokens", async function () {
    await token.connect(deployer).mint(user2.address, AMOUNT, "0x00");
    await token.connect(user2).redeem(400);
    expect(await token.balanceOf(user2.address)).to.equal(AMOUNT - 400);
  });

  it("should allow the governor to upgrade verifier", async function () {
    const NewVerifier = await ethers.getContractFactory("zkVerifierMock");
    const verifier2 = await NewVerifier.deploy(true);
    await verifier2.waitForDeployment();

    await token.connect(deployer).setVerifier(verifier2.target);
    expect(await token.verifier()).to.equal(verifier2.target);
  });

  it("should reject verifier update from non-governor", async function () {
    const NewVerifier = await ethers.getContractFactory("zkVerifierMock");
    const verifier3 = await NewVerifier.deploy(true);
    await verifier3.waitForDeployment();

    await expect(
      token.connect(user1).setVerifier(verifier3.target)
    ).to.be.revertedWith("Not governor");
  });
});
