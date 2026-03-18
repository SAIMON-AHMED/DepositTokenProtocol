const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DepositToken - Full Integration Flow", function () {
  let deployer, user1, user2, guardian;
  let verifier, governance, registry, token, identityRegistry;

  const TOKEN_NAME = "Deposit USD";
  const TOKEN_SYMBOL = "dUSD";
  const INITIAL_RATIO = ethers.parseEther("1.0");
  const LOW_RATIO = ethers.parseEther("0.7"); // below κ_pause = 0.8
  const MID_RATIO = ethers.parseEther("0.9"); // above κ_pause, below κ_mint
  const AMOUNT = 1000;

  beforeEach(async function () {
    [deployer, user1, user2, guardian] = await ethers.getSigners();

    const Controller = await ethers.getContractFactory("GovernanceController");
    governance = await Controller.deploy(deployer.address);
    await governance.waitForDeployment();

    await governance.connect(deployer).setGuardian(guardian.address);

    const Verifier = await ethers.getContractFactory("zkVerifierMock");
    verifier = await Verifier.deploy(true);
    await verifier.waitForDeployment();

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

  it("mints with valid proof and full backing", async function () {
    await token.connect(deployer).mint(user1.address, AMOUNT, "0x00");
    expect(await token.balanceOf(user1.address)).to.equal(AMOUNT);
  });

  it("reverts mint in dead zone", async function () {
    await registry.connect(deployer).setReserveRatio(MID_RATIO);
    await expect(
      token.connect(deployer).mint(user2.address, AMOUNT, "0x00")
    ).to.be.revertedWith("Reserve below mint threshold");
  });

  it("triggers Type 1 pause when reserve < κ_pause", async function () {
    await token.connect(deployer).mint(user1.address, AMOUNT, "0x00");
    // Raise deviation limit to allow large drop in testing
    await registry.setMaxDeviation(ethers.parseEther("0.5"));
    await registry.connect(deployer).setReserveRatio(LOW_RATIO);
    await token.connect(user2).checkReserves(); // anyone can call
    expect(await governance.protocolState()).to.equal(1); // Paused
  });

  it("governor pause blocks minting", async function () {
    await governance.connect(deployer).pause();
    expect(await governance.isPaused()).to.equal(true);
    await expect(
      token.connect(deployer).mint(user1.address, AMOUNT, "0x00")
    ).to.be.revertedWith("Protocol is paused");
  });

  it("governor unpause restores minting", async function () {
    await governance.connect(deployer).pause();
    await registry.connect(deployer).setReserveRatio(INITIAL_RATIO);
    await governance.connect(deployer).unpause();
    expect(await governance.isPaused()).to.equal(false);

    await token.connect(deployer).mint(user2.address, AMOUNT, "0x00");
    expect(await token.balanceOf(user2.address)).to.equal(AMOUNT);
  });

  it("EmergencyPaused blocks transfers", async function () {
    await token.connect(deployer).mint(user1.address, AMOUNT, "0x00");
    await governance.connect(guardian).emergencyPause();

    await expect(
      token.connect(user1).transfer(user2.address, 500)
    ).to.be.revertedWith("Transfers halted: EmergencyPaused");
  });

  it("Paused still allows transfers", async function () {
    await token.connect(deployer).mint(user1.address, AMOUNT, "0x00");
    await governance.connect(deployer).pause();

    // Transfers still work in Paused (only mint/redeem blocked)
    await token.connect(user1).transfer(user2.address, 500);
    expect(await token.balanceOf(user2.address)).to.equal(500);
  });

  it("EmergencyPaused downgrades to Paused after 72h", async function () {
    await governance.connect(guardian).emergencyPause();
    expect(await governance.protocolState()).to.equal(2);

    await ethers.provider.send("evm_increaseTime", [72 * 3600 + 1]);
    await ethers.provider.send("evm_mine", []);

    await governance.checkEmergencyExpiry();
    expect(await governance.protocolState()).to.equal(1); // Paused, not Active
  });

  it("redeem with valid proof", async function () {
    await token.connect(deployer).mint(user2.address, AMOUNT, "0x00");
    await token.connect(user2).redeem(400, "0x00");
    expect(await token.balanceOf(user2.address)).to.equal(AMOUNT - 400);
  });

  it("redeem rejects invalid proof", async function () {
    await token.connect(deployer).mint(user2.address, AMOUNT, "0x00");
    await verifier.setValid(false);
    await expect(token.connect(user2).redeem(400, "0x00")).to.be.revertedWith(
      "Invalid zk-KYC proof"
    );
  });

  it("Mode A: open transfers", async function () {
    await token.connect(deployer).mint(user1.address, AMOUNT, "0x00");
    await token.connect(user1).transfer(user2.address, 500);
    expect(await token.balanceOf(user2.address)).to.equal(500);
  });

  it("Mode B: blocks non-verified receivers", async function () {
    await token.connect(deployer).setIdentityRegistry(identityRegistry.target);
    await token.connect(deployer).setRestrictedMode(true);

    await identityRegistry.connect(deployer).setVerified(user1.address, true);
    // user2 NOT verified

    await token.connect(deployer).mint(user1.address, AMOUNT, "0x00");
    await expect(
      token.connect(user1).transfer(user2.address, 500)
    ).to.be.revertedWith("Receiver not on allowlist");
  });

  it("governor can upgrade verifier", async function () {
    const NewVerifier = await ethers.getContractFactory("zkVerifierMock");
    const verifier2 = await NewVerifier.deploy(true);
    await verifier2.waitForDeployment();

    await token.connect(deployer).setVerifier(verifier2.target);
    expect(await token.verifier()).to.equal(verifier2.target);
  });

  it("non-governor cannot upgrade verifier", async function () {
    const NewVerifier = await ethers.getContractFactory("zkVerifierMock");
    const verifier3 = await NewVerifier.deploy(true);
    await verifier3.waitForDeployment();

    await expect(
      token.connect(user1).setVerifier(verifier3.target)
    ).to.be.revertedWith("Not governor");
  });

  it("rejects minting when oracle is stale", async function () {
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine", []);

    await expect(
      token.connect(deployer).mint(user1.address, AMOUNT, "0x00")
    ).to.be.revertedWith("Oracle data stale");
  });
});
