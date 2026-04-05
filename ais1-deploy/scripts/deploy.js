// deploy.js — Deploy AIS1v2 to Base Mainnet
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying from:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  console.log("\nDeploying AIS1v2...");
  const AIS1v2 = await ethers.getContractFactory("AIS1v2");
  const contract = await AIS1v2.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("AIS1v2 deployed to:", address);
  console.log("Tx hash:", contract.deploymentTransaction().hash);

  return address;
}

main()
  .then((addr) => {
    console.log("\nDeployment complete:", addr);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
