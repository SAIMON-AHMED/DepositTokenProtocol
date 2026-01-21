const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DepositToken", function () {
  let depositToken, verifier, registry, controller;
  let owner, user1, user2;

  const KAPPA = ethers.parseEther("1.0");
  const INITIAL_RATIO = ethers.parseEther("1.0");

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock verifier
    const VerifierMock = await ethers.getContractFactory("zkVerifierMock");
    verifier = await VerifierMock.deploy(true);

    // Deploy governance controller
    const Controller = await ethers.getContractFactory("GovernanceController");
    controller = await Controller.deploy(owner.address);

    // Deploy ReserveRegistry (canonical reserve state)
    const Registry = await ethers.getContractFactory("ReserveRegistry");
    registry = await Registry.deploy(controller.target, INITIAL_RATIO);
    await registry.waitForDeployment();

    // Authorize owner as a reporter on ReserveRegistry
    await registry.setReporter(owner.address, true);

    // Deploy deposit token (uses reserveRegistry)
    const Token = await ethers.getContractFactory("DepositToken");
    depositToken = await Token.deploy(
      "DepositToken",
      "DUSD",
      verifier.target,
      registry.target,
      controller.target
    );

    // Authorize deposit token in controller
    await controller.connect(owner).setDepositToken(depositToken.target);

    // Publication-ready: issuer/minter is the governor (owner)
    await depositToken.connect(owner).setMinter(owner.address, true);
  });

  it("mints tokens when zk proof is valid and reserve ratio is OK", async function () {
    await depositToken.connect(owner).mint(user1.address, 1000, "0x00");
    expect(await depositToken.balanceOf(user1.address)).to.equal(1000);
  });

  it("fails to mint if reserve ratio is too low", async function () {
    await registry.connect(owner).setReserveRatio(ethers.parseEther("0.5"));

    await expect(
      depositToken.connect(owner).mint(user1.address, 1000, "0x00")
    ).to.be.revertedWith("Paused: Reserve below threshold");
  });

  it("fails to mint if zk proof is invalid", async function () {
    await verifier.setValid(false);

    await expect(
      depositToken.connect(owner).mint(user1.address, 1000, "0x00")
    ).to.be.revertedWith("Invalid zk-KYC proof");
  });

  it("burns tokens on redeem", async function () {
    await depositToken.connect(owner).mint(user1.address, 1000, "0x00");

    await depositToken.connect(user1).redeem(400);
    expect(await depositToken.balanceOf(user1.address)).to.equal(600);
  });

  it("prevents minting while paused", async function () {
    await controller.connect(owner).pause();

    await expect(
      depositToken.connect(owner).mint(user1.address, 1000, "0x00")
    ).to.be.revertedWith("Protocol is paused");
  });

  it("allows only governor to update verifier", async function () {
    const VerifierMock2 = await ethers.getContractFactory("zkVerifierMock");
    const verifier2 = await VerifierMock2.deploy(true);

    await expect(
      depositToken.connect(user1).setVerifier(verifier2.target)
    ).to.be.revertedWith("Not governor");

    await depositToken.connect(owner).setVerifier(verifier2.target);
    expect(await depositToken.verifier()).to.equal(verifier2.target);
  });
});
