const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReserveOracle", function () {
  let oracle;

  beforeEach(async function () {
    const Oracle = await ethers.getContractFactory("ReserveOracle");
    oracle = await Oracle.deploy();
  });

  it("should initialize with zero reserve ratio", async function () {
    expect(await oracle.reserveRatio()).to.equal(0);
  });

  it("should update reserve ratio", async function () {
    const newRatio = ethers.parseEther("0.85");
    await oracle.setReserveRatio(newRatio);
    expect(await oracle.reserveRatio()).to.equal(newRatio);
  });

  it("should allow updating reserve ratio multiple times", async function () {
    const ratios = [0.95, 0.75, 1.1];

    for (const r of ratios) {
      const ratio = ethers.parseEther(r.toString());
      await oracle.setReserveRatio(ratio);
      expect(await oracle.reserveRatio()).to.equal(ratio);
    }
  });

  it("should revert when setting reserve ratio to zero", async function () {
    await expect(oracle.setReserveRatio(0)).to.be.revertedWith(
      "Ratio must be positive"
    );
  });
  

  it("should emit ReserveRatioUpdated event on update", async function () {
    const newRatio = ethers.parseEther("0.85");
    await expect(oracle.setReserveRatio(newRatio))
      .to.emit(oracle, "ReserveRatioUpdated")
      .withArgs(newRatio);
  });
});