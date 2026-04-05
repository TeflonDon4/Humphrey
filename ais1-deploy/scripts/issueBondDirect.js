#!/usr/bin/env node
// issueBondDirect.js — Issue Bond No. 2 (Humphrey SOA) on the deployed AIS1v2 contract
//
// Usage:
//   CONTRACT_ADDRESS=0x... PRIVATE_KEY=0x... node scripts/issueBondDirect.js
//   (or set values in .env and run without env vars if deploy-output.json exists)

const path = require("path");
const fs   = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { ethers } = require("ethers");
const solc        = require("solc");

// ── Compile (for ABI only) ─────────────────────────────────────────────────

function getABI() {
  const contractsDir = path.join(__dirname, "../contracts");
  const sources = {};
  for (const file of fs.readdirSync(contractsDir).filter(f => f.endsWith(".sol"))) {
    sources[file] = { content: fs.readFileSync(path.join(contractsDir, file), "utf8") };
  }
  const input = {
    language: "Solidity",
    sources,
    settings: { outputSelection: { "*": { "*": ["abi"] } } },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  return output.contracts["AIS1v2.sol"]["AIS1v2"].abi;
}

// ── issueBond ─────────────────────────────────────────────────────────────

async function main() {
  // Resolve contract address
  let contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    const outFile = path.join(__dirname, "../deploy-output.json");
    if (fs.existsSync(outFile)) {
      const out = JSON.parse(fs.readFileSync(outFile, "utf8"));
      contractAddress = out.contractAddress;
      console.log("Using contract address from deploy-output.json:", contractAddress);
    } else {
      throw new Error("Set CONTRACT_ADDRESS env var or run compileAndDeploy.js first");
    }
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) throw new Error("PRIVATE_KEY not set");

  const abi      = getABI();
  const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
  const wallet   = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, abi, wallet);

  console.log("Signer:", wallet.address);
  console.log("Contract:", contractAddress);

  // ── Bond No. 2 parameters ────────────────────────────────────────────────
  const agentCard = {
    agentDid:       "did:ais1:base:humphrey-soa-001",
    agentName:      "Humphrey",
    agentType:      "semi-autonomous",
    agentClass:     "soa",
    parentDid:      "did:ais1:base:payagent-001",
    capabilities:   JSON.stringify(["intake","screening","monitoring","telegram"]),
    modelFramework: "claude / custom",
    deploymentDate: 0n,
    chainAddresses: "[]",
    amlStatus:      1,
    metadataUri:    "https://ais-1.org/agents/humphrey-soa-001",
  };

  const sponsorCard = {
    sponsorDid:     "did:ais1:sponsor:kadikoy-bm-202302362",
    legalName:      "Kadikoy Limited",
    entityType:     "company",
    jurisdiction:   "BM",
    registrationNo: "202302362",
    kycStatus:      2,
    issuerId:       "",
  };

  const tier                = 1;
  const timestampServiceRef = "";

  console.log("\nIssuing Bond No. 2 (Humphrey SOA)…");
  const tx = await contract.issueBond(agentCard, sponsorCard, tier, timestampServiceRef);
  console.log("Tx submitted:", tx.hash);

  const receipt = await tx.wait(1);
  console.log("Confirmed in block:", receipt.blockNumber);

  // Parse BondIssued event
  const iface = new ethers.Interface(abi);
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed && parsed.name === "BondIssued") {
        console.log("\nBondIssued event:");
        console.log("  bondId:    ", parsed.args.bondId.toString());
        console.log("  agentDid:  ", parsed.args.agentDid);
        console.log("  sponsorDid:", parsed.args.sponsorDid);
        console.log("  tier:      ", parsed.args.tier.toString());
        console.log("  agentClass:", parsed.args.agentClass);
        console.log("  parentDid: ", parsed.args.parentDid);
      }
    } catch (_) {}
  }

  const result = { contractAddress, bondTxHash: tx.hash };

  // Merge into deploy-output.json
  const outFile = path.join(__dirname, "../deploy-output.json");
  let existing  = {};
  if (fs.existsSync(outFile)) existing = JSON.parse(fs.readFileSync(outFile, "utf8"));
  fs.writeFileSync(outFile, JSON.stringify({ ...existing, bondTxHash: tx.hash }, null, 2));
  console.log("\nSaved bond tx hash to deploy-output.json");

  return result;
}

main()
  .then(r => {
    console.log("\nBond No. 2 complete:");
    console.log("  Contract:", r.contractAddress);
    console.log("  Bond tx: ", r.bondTxHash);
    process.exit(0);
  })
  .catch(err => {
    console.error("\nFailed:", err.message || err);
    process.exit(1);
  });
