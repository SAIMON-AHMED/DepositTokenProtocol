const { ethers } = require("hardhat");

async function main() {
  const [signer] = await ethers.getSigners();
  const balance = await signer.provider.getBalance(signer.address);
  console.log(
    `Balance of ${signer.address}: ${ethers.formatEther(balance)} ETH`
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
