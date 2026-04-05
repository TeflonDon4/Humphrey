// SPDX-License-Identifier: CC0-1.0
// AIS-1: Agent Identity Standard v0.2 — Implementation
// Kadikoy Limited, Bermuda — 2026

pragma solidity ^0.8.20;

import "./IAIS1v2.sol";

/**
 * @title AIS1v2
 * @notice On-chain agent identity bond registry — AIS-1 v0.2
 * @dev Bond No. 1 was issued under v0.1 (PayAgent, grandfathered as ALA).
 *      This contract initialises the bondId counter at 2 to maintain
 *      global sequential numbering across the AIS-1 registry.
 */
contract AIS1v2 is IAIS1 {

    address public owner;

    // Next bond ID to issue. Starts at 2 — Bond No. 1 is on the v0.1 contract.
    uint256 private _nextBondId;

    mapping(uint256 => AgentCard)   private _agentCards;
    mapping(uint256 => SponsorCard) private _sponsorCards;
    mapping(uint256 => Bond)        private _bonds;

    // agentDid → bondId (forward lookup)
    mapping(string => uint256) private _didToBondId;

    // parentAgentDid → list of subordinate bondIds (SOA index)
    mapping(string => uint256[]) private _subordinates;

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    constructor() {
        owner = msg.sender;
        _nextBondId = 2; // Bond 1 grandfathered on v0.1 contract
    }

    // -----------------------------------------------------------------------
    // Modifiers
    // -----------------------------------------------------------------------

    modifier onlyOwner() {
        require(msg.sender == owner, "AIS1v2: not owner");
        _;
    }

    // -----------------------------------------------------------------------
    // Write functions
    // -----------------------------------------------------------------------

    /**
     * @notice Issue a new AIS-1 bond.
     * @dev Only the contract owner (the deploying wallet) may issue bonds.
     *      The deploymentDate field in the AgentCard is set to block.timestamp
     *      if the caller passes 0.
     */
    function issueBond(
        AgentCard calldata agent,
        SponsorCard calldata sponsor,
        uint8 tier,
        string calldata timestampServiceRef
    ) external override onlyOwner returns (uint256 bondId) {
        require(bytes(agent.agentDid).length > 0,     "AIS1v2: empty agentDid");
        require(bytes(agent.agentName).length > 0,    "AIS1v2: empty agentName");
        require(bytes(sponsor.sponsorDid).length > 0, "AIS1v2: empty sponsorDid");
        require(_didToBondId[agent.agentDid] == 0,    "AIS1v2: DID already bonded");

        bondId = _nextBondId++;

        bytes32 bondHash = keccak256(abi.encodePacked(
            bondId,
            agent.agentDid,
            sponsor.sponsorDid,
            block.timestamp
        ));

        // Store agent card (copy calldata → storage; set deploymentDate if unset)
        _agentCards[bondId] = AgentCard({
            agentDid:        agent.agentDid,
            agentName:       agent.agentName,
            agentType:       agent.agentType,
            agentClass:      agent.agentClass,
            parentDid:       agent.parentDid,
            capabilities:    agent.capabilities,
            modelFramework:  agent.modelFramework,
            deploymentDate:  agent.deploymentDate == 0 ? block.timestamp : agent.deploymentDate,
            chainAddresses:  agent.chainAddresses,
            amlStatus:       agent.amlStatus,
            metadataUri:     agent.metadataUri
        });

        _sponsorCards[bondId] = SponsorCard({
            sponsorDid:     sponsor.sponsorDid,
            legalName:      sponsor.legalName,
            entityType:     sponsor.entityType,
            jurisdiction:   sponsor.jurisdiction,
            registrationNo: sponsor.registrationNo,
            kycStatus:      sponsor.kycStatus,
            issuerId:       sponsor.issuerId
        });

        _bonds[bondId] = Bond({
            bondId:              bondId,
            bondHash:            bondHash,
            issuedAt:            block.timestamp,
            issuedBy:            sponsor.sponsorDid,
            tier:                tier,
            jurisdiction:        sponsor.jurisdiction,
            timestampServiceRef: timestampServiceRef,
            status:              0, // active
            expiry:              0  // perpetual
        });

        _didToBondId[agent.agentDid] = bondId;

        // Index subordinates so getSubordinates() works
        if (bytes(agent.parentDid).length > 0) {
            _subordinates[agent.parentDid].push(bondId);
        }

        emit BondIssued(
            bondId,
            agent.agentDid,
            sponsor.sponsorDid,
            tier,
            agent.agentClass,
            agent.parentDid
        );
    }

    function revokeBond(uint256 bondId, string calldata reason)
        external override onlyOwner
    {
        _requireExists(bondId);
        _bonds[bondId].status = 2;
        emit BondRevoked(bondId, msg.sender, reason);
    }

    function suspendBond(uint256 bondId, string calldata reason)
        external override onlyOwner
    {
        _requireExists(bondId);
        _bonds[bondId].status = 1;
        emit BondSuspended(bondId, msg.sender, reason);
    }

    function reinstateBond(uint256 bondId) external override onlyOwner {
        _requireExists(bondId);
        _bonds[bondId].status = 0;
    }

    function updateAmlStatus(uint256 bondId, uint8 status)
        external override onlyOwner
    {
        _requireExists(bondId);
        _agentCards[bondId].amlStatus = status;
        emit AmlStatusUpdated(bondId, status);
    }

    // -----------------------------------------------------------------------
    // Read functions
    // -----------------------------------------------------------------------

    function getBond(uint256 bondId) external view override
        returns (AgentCard memory, SponsorCard memory, Bond memory)
    {
        _requireExists(bondId);
        return (_agentCards[bondId], _sponsorCards[bondId], _bonds[bondId]);
    }

    function getBondByAgentDid(string calldata agentDid) external view override
        returns (uint256 bondId)
    {
        bondId = _didToBondId[agentDid];
        require(bondId != 0, "AIS1v2: DID not found");
    }

    function verifyBond(uint256 bondId) external view override
        returns (bool valid, uint8 tier, string memory sponsorDid,
                 string memory agentClass, string memory parentDid)
    {
        if (_bonds[bondId].issuedAt == 0) {
            return (false, 0, "", "", "");
        }
        Bond storage b = _bonds[bondId];
        AgentCard storage a = _agentCards[bondId];
        SponsorCard storage s = _sponsorCards[bondId];
        valid      = (b.status == 0) && (b.expiry == 0 || b.expiry > block.timestamp);
        tier       = b.tier;
        sponsorDid = s.sponsorDid;
        agentClass = a.agentClass;
        parentDid  = a.parentDid;
    }

    function getSubordinates(string calldata parentAgentDid) external view override
        returns (uint256[] memory bondIds)
    {
        return _subordinates[parentAgentDid];
    }

    function isSOA(uint256 bondId) external view override
        returns (bool soa, string memory parentDid)
    {
        _requireExists(bondId);
        parentDid = _agentCards[bondId].parentDid;
        soa = bytes(parentDid).length > 0;
    }

    // -----------------------------------------------------------------------
    // Owner transfer
    // -----------------------------------------------------------------------

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "AIS1v2: zero address");
        owner = newOwner;
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    function _requireExists(uint256 bondId) internal view {
        require(_bonds[bondId].issuedAt != 0, "AIS1v2: bond does not exist");
    }
}
