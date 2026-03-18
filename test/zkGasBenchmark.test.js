const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("Semaphore v4 zk-Proof Gas Benchmark", function () {
  this.timeout(120_000);

  let semaphore, verifierContract;
  let owner;
  let Identity, Group, generateProof;

  before(async function () {
    [owner] = await ethers.getSigners();

    const identityMod = await import("@semaphore-protocol/identity");
    const groupMod = await import("@semaphore-protocol/group");
    const proofMod = await import("@semaphore-protocol/proof");

    Identity = identityMod.Identity;
    Group = groupMod.Group;
    generateProof = proofMod.generateProof;

    const Verifier = await ethers.getContractFactory(
      "@semaphore-protocol/contracts/base/SemaphoreVerifier.sol:SemaphoreVerifier"
    );
    verifierContract = await Verifier.deploy();
    await verifierContract.waitForDeployment();

    const PoseidonT3 = await ethers.getContractFactory(
      "poseidon-solidity/PoseidonT3.sol:PoseidonT3"
    );
    const poseidon = await PoseidonT3.deploy();
    await poseidon.waitForDeployment();

    const Semaphore = await ethers.getContractFactory(
      "@semaphore-protocol/contracts/Semaphore.sol:Semaphore",
      { libraries: { PoseidonT3: poseidon.target } }
    );
    semaphore = await Semaphore.deploy(verifierContract.target);
    await semaphore.waitForDeployment();
  });

  it("measures gas for on-chain Groth16 proof verification", async function () {
    const identity = new Identity();

    const createTx = await semaphore.connect(owner)["createGroup()"]();
    await createTx.wait();
    const groupId = 0n;

    const addTx = await semaphore
      .connect(owner)
      .addMember(groupId, identity.commitment);
    await addTx.wait();

    const group = new Group();
    group.addMember(identity.commitment);

    const message = 42n;
    const scope = 1n;
    const proof = await generateProof(identity, group, message, scope);

    const isValid = await semaphore.verifyProof(groupId, proof);
    expect(isValid).to.equal(true);

    const validateTx = await semaphore
      .connect(owner)
      .validateProof(groupId, proof);
    const validateReceipt = await validateTx.wait();

    const verifyGas = await semaphore.verifyProof.estimateGas(groupId, proof);

    console.log(`    validateProof: ${validateReceipt.gasUsed} gas`);
    console.log(`    verifyProof:   ${verifyGas} gas`);
  });

  it("measures gas with a larger group (depth > 1)", async function () {
    const createTx = await semaphore.connect(owner)["createGroup()"]();
    await createTx.wait();
    const groupId = 1n;

    const identity = new Identity();
    const group = new Group();

    const identities = [identity];
    group.addMember(identity.commitment);
    await semaphore.connect(owner).addMember(groupId, identity.commitment);

    for (let i = 0; i < 4; i++) {
      const id = new Identity();
      identities.push(id);
      group.addMember(id.commitment);
      await semaphore.connect(owner).addMember(groupId, id.commitment);
    }

    const proof = await generateProof(identity, group, 99n, 2n);

    const tx = await semaphore.connect(owner).validateProof(groupId, proof);
    const receipt = await tx.wait();

    const verifyGas = await semaphore.verifyProof.estimateGas(groupId, proof);

    console.log(
      `    depth ${proof.merkleTreeDepth} — validateProof: ${receipt.gasUsed} gas`
    );
    console.log(
      `    depth ${proof.merkleTreeDepth} — verifyProof:   ${verifyGas} gas`
    );
  });
});
