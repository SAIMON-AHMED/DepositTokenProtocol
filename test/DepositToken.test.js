const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DepositToken", function () {
  let depositToken, verifier, registry, controller, identityRegistry;
  let owner, user1, user2, guardian;

  const KAPPA_MINT = ethers.parseEther("1.0");
  const KAPPA_PAUSE = ethers.parseEther("0.8");
  const INITIAL_RATIO = ethers.parseEther("1.0");

  beforeEach(async function () {
    [owner, user1, user2, guardian] = await ethers.getSigners();

    const VerifierMock = await ethers.getContractFactory("zkVerifierMock");
    verifier = await VerifierMock.deploy(true);

    const Controller = await ethers.getContractFactory("GovernanceController");
    controller = await Controller.deploy(owner.address);

    await controller.connect(owner).setGuardian(guardian.address);

    const Registry = await ethers.getContractFactory("ReserveRegistry");
    registry = await Registry.deploy(controller.target, INITIAL_RATIO);
    await registry.waitForDeployment();

    await registry.setReporter(owner.address, true);

    const Token = await ethers.getContractFactory("DepositToken");
    depositToken = await Token.deploy(
      "DepositToken",
      "DUSD",
      verifier.target,
      registry.target,
      controller.target
    );

    await controller.connect(owner).setDepositToken(depositToken.target);

    const IdRegistry = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await IdRegistry.deploy(
      controller.target,
      owner.address
    );
    await identityRegistry.waitForDeployment();

    await depositToken.connect(owner).setMinter(owner.address, true);
  });

  it("has correct KAPPA constants", async function () {
    expect(await depositToken.KAPPA_MINT()).to.equal(KAPPA_MINT);
    expect(await depositToken.KAPPA_PAUSE()).to.equal(KAPPA_PAUSE);
  });

  it("mints when valid proof and sufficient reserves", async function () {
    await depositToken.connect(owner).mint(user1.address, 1000, "0x00");
    expect(await depositToken.balanceOf(user1.address)).to.equal(1000);
  });

  it("reverts mint below κ_mint", async function () {
    // Set reserve to 0.9 — above κ_pause (0.8) but below κ_mint (1.0)
    await registry.connect(owner).setReserveRatio(ethers.parseEther("0.9"));
    await expect(
      depositToken.connect(owner).mint(user1.address, 1000, "0x00")
    ).to.be.revertedWith("Reserve below mint threshold");
  });

  it("reverts mint below κ_pause", async function () {
    // Raise deviation limit to allow large ratio drop in testing
    await registry.setMaxDeviation(ethers.parseEther("0.5"));
    await registry.connect(owner).setReserveRatio(ethers.parseEther("0.5"));
    await expect(
      depositToken.connect(owner).mint(user1.address, 1000, "0x00")
    ).to.be.revertedWith("Reserve below mint threshold");
  });

  it("reverts mint with invalid proof", async function () {
    await verifier.setValid(false);
    await expect(
      depositToken.connect(owner).mint(user1.address, 1000, "0x00")
    ).to.be.revertedWith("Invalid zk-KYC proof");
  });

  it("burns tokens on redeem with valid proof", async function () {
    await depositToken.connect(owner).mint(user1.address, 1000, "0x00");
    await depositToken.connect(user1).redeem(400, "0x00");
    expect(await depositToken.balanceOf(user1.address)).to.equal(600);
  });

  it("reverts redeem with invalid proof", async function () {
    await depositToken.connect(owner).mint(user1.address, 1000, "0x00");
    await verifier.setValid(false);
    await expect(
      depositToken.connect(user1).redeem(400, "0x00")
    ).to.be.revertedWith("Invalid zk-KYC proof");
  });

  it("prevents minting while paused", async function () {
    await controller.connect(owner).pause();
    await expect(
      depositToken.connect(owner).mint(user1.address, 1000, "0x00")
    ).to.be.revertedWith("Protocol is paused");
  });

  it("prevents redeeming while paused", async function () {
    await depositToken.connect(owner).mint(user1.address, 1000, "0x00");
    await controller.connect(owner).pause();
    await expect(
      depositToken.connect(user1).redeem(400, "0x00")
    ).to.be.revertedWith("Protocol is paused");
  });

  it("checkReserves triggers Type 1 pause when reserve < κ_pause", async function () {
    await depositToken.connect(owner).mint(user1.address, 1000, "0x00");
    // Raise deviation limit then drop reserve below κ_pause
    await registry.setMaxDeviation(ethers.parseEther("0.5"));
    await registry.connect(owner).setReserveRatio(ethers.parseEther("0.7"));
    await depositToken.connect(user2).checkReserves();
    expect(await controller.protocolState()).to.equal(1); // Paused
  });

  it("checkReserves reverts if reserves are healthy", async function () {
    await expect(
      depositToken.connect(user2).checkReserves()
    ).to.be.revertedWith("Reserves healthy");
  });

  it("Mode A: allows unrestricted transfers", async function () {
    await depositToken.connect(owner).mint(user1.address, 1000, "0x00");
    await depositToken.connect(user1).transfer(user2.address, 500);
    expect(await depositToken.balanceOf(user2.address)).to.equal(500);
  });

  it("Mode B: blocks transfers to non-verified", async function () {
    // Enable restricted mode
    await depositToken
      .connect(owner)
      .setIdentityRegistry(identityRegistry.target);
    await depositToken.connect(owner).setRestrictedMode(true);

    // Verify user1 but NOT user2
    await identityRegistry.connect(owner).setVerified(user1.address, true);

    await depositToken.connect(owner).mint(user1.address, 1000, "0x00");
    await expect(
      depositToken.connect(user1).transfer(user2.address, 500)
    ).to.be.revertedWith("Receiver not on allowlist");
  });

  it("Mode B: allows transfers to verified", async function () {
    await depositToken
      .connect(owner)
      .setIdentityRegistry(identityRegistry.target);
    await depositToken.connect(owner).setRestrictedMode(true);

    await identityRegistry.connect(owner).setVerified(user1.address, true);
    await identityRegistry.connect(owner).setVerified(user2.address, true);

    await depositToken.connect(owner).mint(user1.address, 1000, "0x00");
    await depositToken.connect(user1).transfer(user2.address, 500);
    expect(await depositToken.balanceOf(user2.address)).to.equal(500);
  });

  it("EmergencyPaused blocks all transfers", async function () {
    await depositToken.connect(owner).mint(user1.address, 1000, "0x00");
    await controller.connect(guardian).emergencyPause();
    await expect(
      depositToken.connect(user1).transfer(user2.address, 500)
    ).to.be.revertedWith("Transfers halted: EmergencyPaused");
  });

  it("only governor can update verifier", async function () {
    const VerifierMock2 = await ethers.getContractFactory("zkVerifierMock");
    const verifier2 = await VerifierMock2.deploy(true);

    await expect(
      depositToken.connect(user1).setVerifier(verifier2.target)
    ).to.be.revertedWith("Not governor");

    await depositToken.connect(owner).setVerifier(verifier2.target);
    expect(await depositToken.verifier()).to.equal(verifier2.target);
  });

  it("only governor can toggle restricted mode", async function () {
    await expect(
      depositToken.connect(user1).setRestrictedMode(true)
    ).to.be.revertedWith("Not governor");

    await depositToken.connect(owner).setRestrictedMode(true);
    expect(await depositToken.restrictedMode()).to.equal(true);
  });
});
