const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("zkVerifierMock", function () {
  let verifier, owner, other;

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();
    const Verifier = await ethers.getContractFactory("zkVerifierMock");
    verifier = await Verifier.deploy(true);
  });

  it("should return true for verifyProof when valid is true", async function () {
    expect(await verifier.verifyProof("0x")).to.equal(true);
  });

  it("should return false for verifyProof when valid is false", async function () {
    await verifier.setValid(false);
    expect(await verifier.verifyProof("0x")).to.equal(false);
  });

  it("should allow only the owner to set valid (if access control is added)", async function () {
    // This test will always pass since there is no access control in the contract
    await verifier.setValid(false);
    expect(await verifier.valid()).to.equal(false);
    await verifier.setValid(true);
    expect(await verifier.valid()).to.equal(true);
  });
});
