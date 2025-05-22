// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IGameContract.sol";
import "../libraries/GameLibrary.sol";
import "../libraries/RandomnessLibrary.sol";
import "../oracle/ChainlinkVRFConsumer.sol";
import "./interfaces/INFTContract.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract GameContract is IGameContract, AccessControl, ReentrancyGuard {
    using GameLibrary for GameLibrary.GameState;
    using RandomnessLibrary for RandomnessLibrary.Randomness;
    
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");
    
    // Game state
    GameLibrary.GameState private gameState;
    RandomnessLibrary.Randomness private randomness;
    
    // Chainlink VRF Consumer instance
    ChainlinkVRFConsumer private vrfConsumer;
    // NFT Contract reference
    INFTContract private nftContract;
    
    // Map to track merge requests
    mapping(bytes32 => GameLibrary.MergeRequest) private mergeRequests;
    
    // Events
    event EntityMerged(address indexed player, uint256 entity1Id, uint256 entity2Id, uint256 newEntityId, uint256 rarity);
    event MergeRequested(address indexed player, uint256 entity1Id, uint256 entity2Id, bytes32 requestId);
    event StarterEntityCreated(address indexed player, uint256 entityId);
    
    constructor(address _vrfConsumer, address _nftContract) {
        vrfConsumer = ChainlinkVRFConsumer(_vrfConsumer);
        nftContract = INFTContract(_nftContract);
        
        // Initialize game state
        gameState.initialize();
        
        // Setup roles
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(BACKEND_ROLE, msg.sender); // Initially the deployer has the backend role
    }
    
    // Function to start the game - gives player their starter entity
    function startGame() external override nonReentrant {
        // Check that player doesn't already have entities
        require(gameState.getPlayerEntities(msg.sender).length == 0, "Player already has entities");
        
        // Create a starter entity
        uint256 entityId = gameState.createStarterEntity(msg.sender, "Starter Entity");
        
        emit StarterEntityCreated(msg.sender, entityId);
    }
    
    // Function to initiate merge process using Chainlink VRF for randomness
    function requestMerge(uint256 entity1Id, uint256 entity2Id) external override nonReentrant {
        // Check ownership
        require(
            gameState.ownsEntity(msg.sender, entity1Id) && 
            gameState.ownsEntity(msg.sender, entity2Id),
            "Player does not own these entities"
        );
        require(entity1Id != entity2Id, "Cannot merge the same entity");
        
        // Request random number from Chainlink VRF
        bytes32 requestId = vrfConsumer.getRandomNumber();
        
        // Store merge request
        mergeRequests[requestId] = GameLibrary.MergeRequest({
            player: msg.sender,
            entity1Id: entity1Id,
            entity2Id: entity2Id,
            randomnessRequestId: requestId,
            fulfilled: false
        });
        
        emit MergeRequested(msg.sender, entity1Id, entity2Id, requestId);
    }
    
    // Function for backend to complete merge with provided metadata URI
    function completeMerge(
        address player, 
        uint256 entity1Id, 
        uint256 entity2Id, 
        string calldata metadataURI
    ) external override nonReentrant onlyRole(BACKEND_ROLE) {
        // Check ownership again (player may have transferred entity since requesting the merge)
        require(
            gameState.ownsEntity(player, entity1Id) && 
            gameState.ownsEntity(player, entity2Id),
            "Player does not own these entities"
        );
        
        // Use the VRF result for rarity
        uint256 randomValue = vrfConsumer.randomResult();
        uint256 rarity = RandomnessLibrary.generateRarity(randomValue);
        
        // Create a name for the new entity
        string memory name = string(abi.encodePacked(
            "Hybrid ", 
            uint2str(entity1Id), 
            " + ", 
            uint2str(entity2Id)
        ));
        
        // Create new entity
        uint256 newEntityId = gameState.createMergedEntity(
            player,
            entity1Id,
            entity2Id,
            rarity,
            name,
            metadataURI
        );
        
        // Mint NFT
        nftContract.mintNFT(player, metadataURI);
        
        emit EntityMerged(player, entity1Id, entity2Id, newEntityId, rarity);
    }
    
    // Implementation for interface methods
    function getEntity(uint256 entityId) external view override returns (string memory) {
        GameLibrary.Entity storage entity = gameState.getEntity(entityId);
        return entity.metadataURI;
    }
    
    function getPlayerEntities(address player) external view override returns (uint256[] memory) {
        return gameState.getPlayerEntities(player);
    }
    
    // Helper function to convert uint to string
    function uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        j = _i;
        while (j != 0) {
            bstr[--k] = bytes1(uint8(48 + j % 10));
            j /= 10;
        }
        return string(bstr);
    }
    
    // Add or remove a backend role
    function setBackendRole(address account, bool hasRole) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (hasRole) {
            grantRole(BACKEND_ROLE, account);
        } else {
            revokeRole(BACKEND_ROLE, account);
        }
    }
}