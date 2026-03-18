const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GovernanceController", function () {
  let deployer, other, guardian;
  let governance, tokenMock, verifier, registry;

  const INITIAL_RATIO = ethers.parseEther("1.0");

  beforeEach(async function () {
    [deployer, other, guardian] = await ethers.getSigners();

    const Governance = await ethers.getContractFactory("GovernanceController");
    governance = await Governance.deploy(deployer.address);
    await governance.waitForDeployment();

    await governance.connect(deployer).setGuardian(guardian.address);

    const Verifier = await ethers.getContractFactory("zkVerifierMock");
    verifier = await Verifier.deploy(true);
    await verifier.waitForDeployment();

    const Registry = await ethers.getContractFactory("ReserveRegistry");
    registry = await Registry.deploy(governance.target, INITIAL_RATIO);
    await registry.waitForDeployment();

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

  it("should initialize with Active protocol state", async function () {
    expect(await governance.protocolState()).to.equal(0); // Active
    expect(await governance.isPaused()).to.equal(false);
  });

  it("should initialize with correct governor", async function () {
    expect(await governance.governorAddress()).to.equal(deployer.address);
    expect(await governance.isGovernor(deployer.address)).to.equal(true);
  });

  it("should allow governor to pause (Active → Paused)", async function () {
    await governance.connect(deployer).pause();
    expect(await governance.protocolState()).to.equal(1); // Paused
    expect(await governance.isPaused()).to.be.true;
  });

  it("should allow governor to unpause (Paused → Active)", async function () {
    await governance.connect(deployer).pause();
    await governance.connect(deployer).unpause();
    expect(await governance.protocolState()).to.equal(0); // Active
    expect(await governance.isPaused()).to.be.false;
  });

  it("should prevent non-governor from pausing", async function () {
    await expect(governance.connect(other).pause()).to.be.revertedWith(
      "Not governor"
    );
  });

  it("should prevent pausing when already paused", async function () {
    await governance.connect(deployer).pause();
    await expect(governance.connect(deployer).pause()).to.be.revertedWith(
      "Not in Active state"
    );
  });

  it("should allow depositToken to call pauseType1", async function () {
    // Raise deviation limit to allow dropping below κ_pause in test
    await registry.setMaxDeviation(ethers.parseEther("0.5"));
    await registry.connect(deployer).setReserveRatio(ethers.parseEther("0.7"));
    await tokenMock.connect(other).checkReserves();
    expect(await governance.protocolState()).to.equal(1); // Paused
  });

  it("should reject pauseType1 from non-depositToken address", async function () {
    await expect(governance.connect(other).pauseType1()).to.be.revertedWith(
      "Not deposit token"
    );
  });

  it("should allow guardian to trigger emergency pause", async function () {
    await governance.connect(guardian).emergencyPause();
    expect(await governance.protocolState()).to.equal(2); // EmergencyPaused
    expect(await governance.isEmergencyPaused()).to.be.true;
  });

  it("should set 72h emergency pause expiry", async function () {
    const tx = await governance.connect(guardian).emergencyPause();
    const block = await ethers.provider.getBlock(tx.blockNumber);
    const expiry = await governance.emergencyPauseExpiry();
    expect(expiry).to.equal(block.timestamp + 72 * 3600);
  });

  it("should prevent non-guardian from emergency pause", async function () {
    await expect(governance.connect(other).emergencyPause()).to.be.revertedWith(
      "Not guardian"
    );
  });

  it("should prevent double emergency pause", async function () {
    await governance.connect(guardian).emergencyPause();
    await expect(
      governance.connect(guardian).emergencyPause()
    ).to.be.revertedWith("Already in EmergencyPaused");
  });

  it("should reject checkEmergencyExpiry before expiry", async function () {
    await governance.connect(guardian).emergencyPause();
    await expect(governance.checkEmergencyExpiry()).to.be.revertedWith(
      "Emergency pause not expired"
    );
  });

  it("should downgrade EmergencyPaused to Paused after 72h", async function () {
    await governance.connect(guardian).emergencyPause();

    // Advance time by 72 hours + 1 second
    await ethers.provider.send("evm_increaseTime", [72 * 3600 + 1]);
    await ethers.provider.send("evm_mine", []);

    await governance.checkEmergencyExpiry();
    expect(await governance.protocolState()).to.equal(1); // Paused (not Active)
  });

  it("should prevent unpausing from EmergencyPaused state directly", async function () {
    await governance.connect(guardian).emergencyPause();
    await expect(governance.connect(deployer).unpause()).to.be.revertedWith(
      "Not in Paused state"
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

  it("should allow owner to set guardian", async function () {
    await governance.connect(deployer).setGuardian(other.address);
    expect(await governance.guardian()).to.equal(other.address);
  });
});
