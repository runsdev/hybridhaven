// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./NFTContract.sol";
import "./oracle/ChainlinkVRFConsumer.sol";

contract GameContract is Ownable, ReentrancyGuard {
    NFTContract public nftContract;
    ChainlinkVRFConsumer public vrfConsumer;
    
    // Merge request structure
    struct MergeRequest {
        address player;
        uint256 entity1Id;
        uint256 entity2Id;
        uint256 requestId; // VRF request ID
        bool fulfilled;
        uint256 timestamp;
    }
    
    // Mapping from VRF request ID to merge request
    mapping(uint256 => MergeRequest) public mergeRequests;
    
    // Mapping from player to their pending merge requests
    mapping(address => uint256[]) public playerPendingRequests;
    
    // Game settings
    uint256 public mergeCooldown = 300; // 5 minutes cooldown between merges
    mapping(address => uint256) public lastMergeTime;
    
    // Backend address that can trigger image updates
    address public backendAddress;
    
    // Events
    event MergeRequested(address indexed player, uint256 entity1Id, uint256 entity2Id, uint256 requestId);
    event MergeCompleted(address indexed player, uint256 newEntityId, uint8 rarity, uint256 requestId);
    event BackendAddressUpdated(address indexed oldAddress, address indexed newAddress);
    
    constructor(address _nftContract, address _vrfConsumer) {
        nftContract = NFTContract(_nftContract);
        vrfConsumer = ChainlinkVRFConsumer(_vrfConsumer);
    }
    
    // Set backend address that can trigger operations
    function setBackendAddress(address _backendAddress) external onlyOwner {
        address oldAddress = backendAddress;
        backendAddress = _backendAddress;
        emit BackendAddressUpdated(oldAddress, _backendAddress);
    }
    
    // Modifier to check if caller is backend or owner
    modifier onlyBackendOrOwner() {
        require(msg.sender == backendAddress || msg.sender == owner(), "Not authorized");
        _;
    }
    
    // Request to merge two entities
    function requestMerge(uint256 entity1Id, uint256 entity2Id) external nonReentrant {
        require(entity1Id != entity2Id, "Cannot merge entity with itself");
        require(nftContract.ownerOf(entity1Id) == msg.sender, "Not owner of entity 1");
        require(nftContract.ownerOf(entity2Id) == msg.sender, "Not owner of entity 2");
        require(block.timestamp >= lastMergeTime[msg.sender] + mergeCooldown, "Merge cooldown active");
        
        // Request randomness from VRF
        uint256 requestId = vrfConsumer.requestRandomWords();
        
        // Store merge request
        mergeRequests[requestId] = MergeRequest({
            player: msg.sender,
            entity1Id: entity1Id,
            entity2Id: entity2Id,
            requestId: requestId,
            fulfilled: false,
            timestamp: block.timestamp
        });
        
        // Add to player's pending requests
        playerPendingRequests[msg.sender].push(requestId);
        
        // Update cooldown
        lastMergeTime[msg.sender] = block.timestamp;
        
        emit MergeRequested(msg.sender, entity1Id, entity2Id, requestId);
    }
    
    // Complete merge after randomness is fulfilled (called by backend)
    function completeMerge(
        uint256 requestId,
        string memory newEntityName,
        string memory imageURI
    ) external onlyBackendOrOwner {
        MergeRequest storage request = mergeRequests[requestId];
        require(request.player != address(0), "Invalid request ID");
        require(!request.fulfilled, "Request already fulfilled");
        
        // Get randomness result
        uint256 randomness = vrfConsumer.getRandomnessResult(requestId);
        require(randomness != 0, "Randomness not yet fulfilled");
        
        // Calculate rarity based on randomness (1-5 stars)
        uint8 rarity = calculateRarity(randomness);
        
        // Get parent entity names
        NFTContract.Entity memory entity1 = nftContract.getEntity(request.entity1Id);
        NFTContract.Entity memory entity2 = nftContract.getEntity(request.entity2Id);
        
        // Mint new hybrid entity
        uint256 newEntityId = nftContract.mintHybridEntity(
            request.player,
            newEntityName,
            rarity,
            imageURI,
            entity1.name,
            entity2.name
        );
        
        // Mark request as fulfilled
        request.fulfilled = true;
        
        // Remove from pending requests
        _removePendingRequest(request.player, requestId);
        
        emit MergeCompleted(request.player, newEntityId, rarity, requestId);
    }
    
    // Calculate rarity based on randomness
    function calculateRarity(uint256 randomness) internal pure returns (uint8) {
        uint256 roll = randomness;
        // uint256 roll = randomness % 100;
        
        if (roll <= 10) return 5;    //  0.1% chance for 5-star
        if (roll <= 1000) return 4;  //  9.9% chance for 4-star  
        if (roll <= 5000) return 3;  // 40.0% chance for 3-star
        if (roll <= 7000) return 2;  // 30.0% chance for 2-star
        return 1;                    // 20.0% chance for 1-star
    }
    
    // Get pending merge requests for a player
    function getPendingRequests(address player) external view returns (uint256[] memory) {
        return playerPendingRequests[player];
    }
    
    // Get merge request details
    function getMergeRequest(uint256 requestId) external view returns (MergeRequest memory) {
        return mergeRequests[requestId];
    }
    
    // Check if player can merge (cooldown check)
    function canPlayerMerge(address player) external view returns (bool) {
        return block.timestamp >= lastMergeTime[player] + mergeCooldown;
    }
    
    // Get time until player can merge again
    function timeUntilNextMerge(address player) external view returns (uint256) {
        uint256 nextMergeTime = lastMergeTime[player] + mergeCooldown;
        if (block.timestamp >= nextMergeTime) {
            return 0;
        }
        return nextMergeTime - block.timestamp;
    }
    
    // Update merge cooldown (owner only)
    function updateMergeCooldown(uint256 _newCooldown) external onlyOwner {
        mergeCooldown = _newCooldown;
    }
    
    // Emergency function to cancel stuck requests (owner only)
    function cancelMergeRequest(uint256 requestId) external onlyOwner {
        MergeRequest storage request = mergeRequests[requestId];
        require(request.player != address(0), "Invalid request ID");
        require(!request.fulfilled, "Request already fulfilled");
        require(block.timestamp > request.timestamp + 3600, "Request too recent"); // 1 hour minimum
        
        // Mark as fulfilled to prevent double completion
        request.fulfilled = true;
        
        // Remove from pending requests
        _removePendingRequest(request.player, requestId);
    }
    
    // Helper function to remove pending request
    function _removePendingRequest(address player, uint256 requestId) internal {
        uint256[] storage requests = playerPendingRequests[player];
        for (uint256 i = 0; i < requests.length; i++) {
            if (requests[i] == requestId) {
                requests[i] = requests[requests.length - 1];
                requests.pop();
                break;
            }
        }
    }
}