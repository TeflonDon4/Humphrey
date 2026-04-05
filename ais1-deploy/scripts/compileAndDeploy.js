#!/usr/bin/env node
// compileAndDeploy.js
// Compiles AIS1v2.sol using the local solc npm package, then deploys
// to Base Mainnet using ethers.js. No network access required for compilation.
//
// Usage:
//   PRIVATE_KEY=0x... node scripts/compileAndDeploy.js
//
// After deploy, set CONTRACT_ADDRESS and run issueBondDirect.js

const path = require("path");
const fs   = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { ethers } = require("ethers");
const solc        = require("solc");

// ── Compile ────────────────────────────────────────────────────────────────

function compileContracts() {
  const contractsDir = path.join(__dirname, "../contracts");

  const sources = {};
  for (const file of fs.readdirSync(contractsDir).filter(f => f.endsWith(".sol"))) {
    sources[file] = { content: fs.readFileSync(path.join(contractsDir, file), "utf8") };
  }

  const input = {
    language: "Solidity",
    sources,
    settings: {
      outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } },
      optimizer: { enabled: true, runs: 200 },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const errs = output.errors.filter(e => e.severity === "error");
    if (errs.length) {
      console.error("Compilation errors:");
      errs.forEach(e => console.error(e.formattedMessage));
      process.exit(1);
    }
    output.errors
      .filter(e => e.severity === "warning")
      .forEach(w => console.warn("[warn]", w.formattedMessage.split("\n")[0]));
  }

  const contract = output.contracts["AIS1v2.sol"]["AIS1v2"];
  if (!contract) {
    console.error("AIS1v2 contract not found in compilation output");
    process.exit(1);
  }
  console.log("✓ Compiled AIS1v2.sol successfully");
  return {
    abi:      contract.abi,
    bytecode: "0x" + contract.evm.bytecode.object,
  };
}

// ── Deploy ─────────────────────────────────────────────────────────────────

async function deploy(abi, bytecode) {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY not set in environment or .env file");
  }

  const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
  const wallet   = new ethers.Wallet(privateKey, provider);

  console.log("Deployer address:", wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error("Deployer wallet has zero ETH — fund it before deploying");
  }

  const chainId = (await provider.getNetwork()).chainId;
  console.log("Chain ID:", chainId.toString());
  if (chainId !== 8453n) {
    throw new Error(`Wrong chain: expected 8453 (Base Mainnet), got ${chainId}`);
  }

  const factory  = new ethers.ContractFactory(abi, bytecode, wallet);
  console.log("\nDeploying AIS1v2…");
  const contract = await factory.deploy();
  const deployTx = contract.deploymentTransaction();
  console.log("Deploy tx submitted:", deployTx.hash);

  console.log("Waiting for confirmation…");
  const receipt = await deployTx.wait(1);
  const address = await contract.getAddress();

  console.log("\n✓ AIS1v2 deployed!");
  console.log("  Contract address:", address);
  console.log("  Deploy tx hash:  ", receipt.hash);
  console.log("  Block number:    ", receipt.blockNumber);

  // Persist for the next step
  const out = { contractAddress: address, deployTxHash: receipt.hash };
  fs.writeFileSync(path.join(__dirname, "../deploy-output.json"), JSON.stringify(out, null, 2));
  console.log("\nSaved to deploy-output.json");

  return out;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const { abi, bytecode } = compileContracts();
  const result = await deploy(abi, bytecode);
  return result;
}

main()
  .then(r => {
    console.log("\nDone:", r);
    process.exit(0);
  })
  .catch(err => {
    console.error("\nFailed:", err.message || err);
    process.exit(1);
  });
