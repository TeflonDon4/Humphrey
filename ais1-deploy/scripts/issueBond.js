// issueBond.js — Issue Bond No. 2 (Humphrey SOA) on AIS1v2
// Usage: CONTRACT_ADDRESS=0x... npx hardhat run scripts/issueBond.js --network base
const { ethers } = require("hardhat");

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("Set CONTRACT_ADDRESS env var to the deployed AIS1v2 address");
  }

  const [signer] = await ethers.getSigners();
  console.log("Signing from:", signer.address);

  const AIS1v2 = await ethers.getContractFactory("AIS1v2");
  const contract = AIS1v2.attach(contractAddress);

  const agentCard = {
    agentDid:       "did:ais1:base:humphrey-soa-001",
    agentName:      "Humphrey",
    agentType:      "semi-autonomous",
    agentClass:     "soa",
    parentDid:      "did:ais1:base:payagent-001",
    capabilities:   JSON.stringify(["intake","screening","monitoring","telegram"]),
    modelFramework: "claude / custom",
    deploymentDate: 0,                               // set to block.timestamp by contract
    chainAddresses: JSON.stringify([]),
    amlStatus:      1,                               // cleared
    metadataUri:    "https://ais-1.org/agents/humphrey-soa-001",
  };

  const sponsorCard = {
    sponsorDid:     "did:ais1:sponsor:kadikoy-bm-202302362",
    legalName:      "Kadikoy Limited",
    entityType:     "company",
    jurisdiction:   "BM",
    registrationNo: "202302362",
    kycStatus:      2,   // enhanced
    issuerId:       "",
  };

  const tier               = 1;   // verified
  const timestampServiceRef = "";  // no secondary timestamp

  console.log("\nIssuing Bond No. 2 (Humphrey SOA)...");
  const tx = await contract.issueBond(agentCard, sponsorCard, tier, timestampServiceRef);
  console.log("Tx submitted:", tx.hash);

  const receipt = await tx.wait();
  console.log("Confirmed in block:", receipt.blockNumber);

  // Parse BondIssued event
  const iface = AIS1v2.interface;
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed && parsed.name === "BondIssued") {
        console.log("\nBondIssued event:");
        console.log("  bondId:    ", parsed.args.bondId.toString());
        console.log("  agentDid:  ", parsed.args.agentDid);
        console.log("  sponsorDid:", parsed.args.sponsorDid);
        console.log("  tier:      ", parsed.args.tier);
        console.log("  agentClass:", parsed.args.agentClass);
        console.log("  parentDid: ", parsed.args.parentDid);
      }
    } catch (_) {}
  }

  console.log("\nBond No. 2 tx hash:", tx.hash);
  return { contractAddress, txHash: tx.hash };
}

main()
  .then(({ contractAddress, txHash }) => {
    console.log("\nSummary:");
    console.log("  Contract:", contractAddress);
    console.log("  Bond No. 2 tx:", txHash);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
