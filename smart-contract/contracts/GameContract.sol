// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./NFTContract.sol";
import "./oracle/ChainlinkVRFConsumer.sol";

contract GameContract is Ownable, ReentrancyGuard {
    NFTContract public nftContract;
    ChainlinkVRFConsumer public vrfConsumer;
    
    struct MergeRequest {
        address player;
        string entity1Name;  // Name of first entity (starter or hybrid)
        string entity2Name;  // Name of second entity (starter or hybrid)
        bool entity1IsStarter;  // True if entity1 is a starter
        bool entity2IsStarter;  // True if entity2 is a starter
        uint256 entity1TokenId; // Token ID if hybrid (0 if starter)
        uint256 entity2TokenId; // Token ID if hybrid (0 if starter)
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
    
    // array of available starter entity names
    string[] public starterEntities = [
        "Fire", "Water", "Earth", "Air", "Light", 
        "Shadow", "Metal", "Crystal", "Lightning", "Ice",
        "Plant", "Beast", "Aquatic", "Avian", "Insect",
        "Stellar", "Lunar", "Solar", "Void", "Nebula",
        "Forest", "Desert", "Ocean", "Mountain", "Swamp",
        "Wolf", "Tiger", "Eagle", "Bear", "Fox",
        "Oak", "Rose", "Cactus", "Lotus", "Fern"
    ];
    
    // Events
    event MergeRequested(address indexed player, string entity1Name, string entity2Name, uint256 requestId);
    event MergeCompleted(address indexed player, uint256 newEntityId, uint8 rarity, uint256 requestId);
    event BackendAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event NFTContractUpdated(address indexed oldAddress, address indexed newAddress);
    event VRFConsumerUpdated(address indexed oldAddress, address indexed newAddress);
    
    constructor() {
        // Contract addresses will be set via setter functions
    }
    
    // Set backend address that can trigger operations
    function setBackendAddress(address _backendAddress) external onlyOwner {
        address oldAddress = backendAddress;
        backendAddress = _backendAddress;
        emit BackendAddressUpdated(oldAddress, _backendAddress);
    }
    
    // Set NFT contract address
    function setNFTContract(address _nftContract) external onlyOwner {
        require(_nftContract != address(0), "Invalid NFT contract address");
        address oldAddress = address(nftContract);
        nftContract = NFTContract(_nftContract);
        emit NFTContractUpdated(oldAddress, _nftContract);
    }
    
    // Set VRF consumer contract address
    function setVRFConsumer(address _vrfConsumer) external onlyOwner {
        require(_vrfConsumer != address(0), "Invalid VRF consumer address");
        address oldAddress = address(vrfConsumer);
        vrfConsumer = ChainlinkVRFConsumer(_vrfConsumer);
        
        // Note: Ownership transfer no longer needed since requestRandomWords is accessible to all
        
        emit VRFConsumerUpdated(oldAddress, _vrfConsumer);
    }
    
    // Modifier to check if caller is backend or owner
    modifier onlyBackendOrOwner() {
        require(msg.sender == backendAddress || msg.sender == owner(), "Not authorized");
        _;
    }
    
    // Check if a string is a valid starter entity name
    function isValidStarterEntity(string memory name) public view returns (bool) {
        for (uint256 i = 0; i < starterEntities.length; i++) {
            if (keccak256(abi.encodePacked(starterEntities[i])) == keccak256(abi.encodePacked(name))) {
                return true;
            }
        }
        return false;
    }
    
    // Request to merge two entities (can be starter names or hybrid token IDs)
    function requestMerge(
        string memory entity1Name,
        string memory entity2Name,
        bool entity1IsStarter,
        bool entity2IsStarter,
        uint256 entity1TokenId,
        uint256 entity2TokenId
    ) external payable nonReentrant {
        require(msg.value >= 0.0001 ether, "Payment of 0.0001 ETH required");
        require(bytes(entity1Name).length > 0 && bytes(entity2Name).length > 0, "Entity names required");
        
        if (entity1IsStarter && entity2IsStarter) {
            require(
                keccak256(abi.encodePacked(entity1Name)) != keccak256(abi.encodePacked(entity2Name)),
                "Cannot merge same starter entity"
            );
        } else if (!entity1IsStarter && !entity2IsStarter) {
            require(entity1TokenId != entity2TokenId, "Cannot merge same hybrid entity");
        }
        
        // validate ownership and starter validity
        if (entity1IsStarter) {
            require(isValidStarterEntity(entity1Name), "Invalid starter entity 1");
        } else {
            require(nftContract.ownerOf(entity1TokenId) == msg.sender, "Not owner of entity 1");
            NFTContract.Entity memory entity1 = nftContract.getEntity(entity1TokenId);
            entity1Name = entity1.name;
        }
        
        if (entity2IsStarter) {
            require(isValidStarterEntity(entity2Name), "Invalid starter entity 2");
        } else {
            require(nftContract.ownerOf(entity2TokenId) == msg.sender, "Not owner of entity 2");
            NFTContract.Entity memory entity2 = nftContract.getEntity(entity2TokenId);
            entity2Name = entity2.name;
        }
            
        uint256 requestId = vrfConsumer.requestRandomWords(true);
        
        // Store merge request
        mergeRequests[requestId] = MergeRequest({
            player: msg.sender,
            entity1Name: entity1Name,
            entity2Name: entity2Name,
            entity1IsStarter: entity1IsStarter,
            entity2IsStarter: entity2IsStarter,
            entity1TokenId: entity1TokenId,
            entity2TokenId: entity2TokenId,
            requestId: requestId,
            fulfilled: false,
            timestamp: block.timestamp
        });
        
        playerPendingRequests[msg.sender].push(requestId);
        
        lastMergeTime[msg.sender] = block.timestamp;
        
        emit MergeRequested(msg.sender, entity1Name, entity2Name, requestId);
    }
    
    // Complete merge after randomness is fulfilled (called by backend)
    function completeMerge(
        uint256 requestId,
        string memory newEntityName,
        string memory imageURI
    ) external {
        MergeRequest storage request = mergeRequests[requestId];
        require(request.player != address(0), "Invalid request ID");
        require(!request.fulfilled, "Request already fulfilled");
        
        // Check if VRF request is fulfilled and get randomness
        (bool fulfilled, uint256[] memory randomWords) = vrfConsumer.getRequestStatus(requestId);
        require(fulfilled, "VRF request not yet fulfilled");
        require(randomWords.length > 0, "No random words received");
        
        // apply range transformation (1-10000)
        uint256 randomness = (randomWords[0] % 10000) + 1;
        uint8 rarity = calculateRarity(randomness);
        
        // Mint new hybrid entity
        uint256 newEntityId = nftContract.mintHybridEntity(
            request.player,
            newEntityName,
            rarity,
            imageURI,
            request.entity1Name,
            request.entity2Name
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
        
        if (roll <= 10) return 5;    //  0.1% chance for 5-star
        if (roll <= 1000) return 4;  //  9.9% chance for 4-star  
        if (roll <= 5000) return 3;  // 40.0% chance for 3-star
        if (roll <= 7000) return 2;  // 30.0% chance for 2-star
        return 1;                    // 20.0% chance for 1-star
    }
    
    // Get all starter entity names
    function getStarterEntities() external view returns (string[] memory) {
        return starterEntities;
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
    
    // Get NFT contract address
    function getNFTContract() external view returns (address) {
        return address(nftContract);
    }
    
    // Get VRF consumer contract address
    function getVRFConsumer() external view returns (address) {
        return address(vrfConsumer);
    }
    
    // Get backend address
    function getBackendAddress() external view returns (address) {
        return backendAddress;
    }
    
    // Check if VRF request is ready for completion
    function isRandomnessReady(uint256 requestId) external view returns (bool) {
        (bool fulfilled, ) = vrfConsumer.getRequestStatus(requestId);
        return fulfilled;
    }
    
    // Get randomness for a request (for backend to check)
    function getRequestRandomness(uint256 requestId) external view returns (uint256) {
        (bool fulfilled, uint256[] memory randomWords) = vrfConsumer.getRequestStatus(requestId);
        require(fulfilled, "VRF request not yet fulfilled");
        require(randomWords.length > 0, "No random words received");
        
        // Apply the same transformation as in completeMerge
        return (randomWords[0] % 10000) + 1;
    }
}