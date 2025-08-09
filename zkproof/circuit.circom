// circuit.circom
// Minimal zk-KYC allowlist proof with replay protection (nullifier)
// Circom v2.x

pragma circom 2.1.5;

include "poseidon.circom";

// ---------------------------------------------
// Utilities
// ---------------------------------------------

// Poseidon hash for 2 inputs
template Poseidon2() {
    signal input in[2];
    signal output out;

    component h = Poseidon(2);
    h.inputs[0] <== in[0];
    h.inputs[1] <== in[1];
    out <== h.out;
}

// Poseidon hash for arbitrary-length array (small helper)
template PoseidonMany(n) {
    signal input in[n];
    signal output out;

    signal acc[n-1];
    component hi[n-1];

    // Start by hashing the first two
    hi[0] = Poseidon2();
    hi[0].in[0] <== in[0];
    hi[0].in[1] <== in[1];
    acc[0] <== hi[0].out;

    for (var i = 1; i < n-1; i++) {
        hi[i] = Poseidon2();
        hi[i].in[0] <== acc[i-1];
        hi[i].in[1] <== in[i+1];
        acc[i] <== hi[i].out;
    }

    out <== acc[n-2];
}

// Verify a Merkle inclusion using Poseidon(2) as the node hash.
// depth = number of tree levels.
template MerklePathVerifier(depth) {
    // Private inputs
    signal input leaf;
    signal input pathElements[depth];
    signal input pathIndex[depth];

    // Public input
    signal input root;

    // Output
    signal output isMember;

    signal cur[depth+1];
    signal left[depth];
    signal right[depth];
    signal left0[depth];
    signal left1[depth];
    signal right0[depth];
    signal right1[depth];
    component h[depth];

    cur[0] <== leaf;

    for (var i = 0; i < depth; i++) {
        // Ensure pathIndex is boolean
        pathIndex[i] * (pathIndex[i] - 1) === 0;

        // left[i] = (1 - pathIndex[i]) * cur[i] + pathIndex[i] * pathElements[i];
        left0[i] <== (1 - pathIndex[i]) * cur[i];
        left1[i] <== pathIndex[i] * pathElements[i];
        left[i] <== left0[i] + left1[i];

        // right[i] = (1 - pathIndex[i]) * pathElements[i] + pathIndex[i] * cur[i];
        right0[i] <== (1 - pathIndex[i]) * pathElements[i];
        right1[i] <== pathIndex[i] * cur[i];
        right[i] <== right0[i] + right1[i];

        h[i] = Poseidon2();
        h[i].in[0] <== left[i];
        h[i].in[1] <== right[i];
        cur[i+1] <== h[i].out;
    }

    cur[depth] === root;
    isMember <== 1;
}

// ---------------------------------------------
// Main KYC circuit
// ---------------------------------------------
//
// Proves:
// 1. identityCommitment is in the Merkle tree with `root`
// 2. nullifierHash == Poseidon(identityCommitment, externalNullifier)
//
// Public inputs:
// - root                : Merkle root of the approved/kyc’d identities
// - externalNullifier   : context identifier (e.g., "mint-v1", chainId, contract addr)
// - nullifierHash       : to prevent replay across the same externalNullifier
//
// Private inputs:
// - identityCommitment  : user’s secret commitment (e.g., Poseidon(secret))
// - pathElements, pathIndex : Merkle proof to root
//
// Output:
// - valid == 1 on success
//
template KYCProof(depth) {
    // ---------- Private ----------
    signal input identityCommitment;
    signal input pathElements[depth];
    signal input pathIndex[depth];

    // ---------- Public  ----------
    signal input root;
    signal input externalNullifier;
    signal input nullifierHash;

    // ---------- Output ----------
    signal output valid;

    // leaf = Poseidon(identityCommitment)
    component leafHash = Poseidon(1);
    leafHash.inputs[0] <== identityCommitment;
    signal leaf;
    leaf <== leafHash.out;

    // Merkle inclusion
    component mp = MerklePathVerifier(depth);
    mp.leaf <== leaf;
    for (var i = 0; i < depth; i++) {
        mp.pathElements[i] <== pathElements[i];
        mp.pathIndex[i] <== pathIndex[i];
    }
    mp.root <== root;

    // Compute expected nullifier = Poseidon(identityCommitment, externalNullifier)
    component nf = Poseidon2();
    nf.in[0] <== identityCommitment;
    nf.in[1] <== externalNullifier;

    // Enforce equality with public nullifierHash
    nf.out === nullifierHash;

    // If both constraints pass, output 1
    // (mp.isMember will be 1 if inclusion checked out, otherwise constraints fail)
    valid <== 1;
}

// ---------------------------------------------
// Instantiate a concrete circuit
// ---------------------------------------------
// Common depths: 16, 20, 32. Pick what you use for your registry.
// You can change DEPTH below as needed.
template Main() {
    signal input root;
    signal input externalNullifier;
    signal input nullifierHash;

    signal input identityCommitment;
    signal input pathElements[20];
    signal input pathIndex[20];

    signal output valid;

    component k = KYCProof(20);
    // Wire public
    k.root <== root;
    k.externalNullifier <== externalNullifier;
    k.nullifierHash <== nullifierHash;

    // Wire private
    k.identityCommitment <== identityCommitment;
    for (var i = 0; i < 20; i++) {
        k.pathElements[i] <== pathElements[i];
        k.pathIndex[i] <== pathIndex[i];
    }

    valid <== k.valid;
}

component main = Main();
