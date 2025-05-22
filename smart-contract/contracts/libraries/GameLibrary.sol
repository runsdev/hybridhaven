// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library GameLibrary {
    struct GameState {
        // Mapping of player address to their entities
        mapping(address => uint256[]) playerEntities;
        // Mapping of entity ID to Entity struct
        mapping(uint256 => Entity) entities;
        // Counter for entity IDs
        uint256 entityIdCounter;
    }
    
    struct Entity {
        uint256 id;
        string name;
        uint256 rarity;
        string metadataURI;
        address owner;
    }
    
    struct MergeRequest {
        address player;
        uint256 entity1Id;
        uint256 entity2Id;
        bytes32 randomnessRequestId;
        bool fulfilled;
    }
    
    // Initialize a new game state
    function initialize(GameState storage gameState) internal {
        gameState.entityIdCounter = 0;
    }
    
    // Create a new starter entity for a player
    function createStarterEntity(
        GameState storage gameState, 
        address player,
        string memory name
    ) internal returns (uint256) {
        uint256 entityId = gameState.entityIdCounter++;
        gameState.entities[entityId] = Entity({
            id: entityId,
            name: name,
            rarity: 1, // Starter entity has rarity 1
            metadataURI: "",
            owner: player
        });
        
        gameState.playerEntities[player].push(entityId);
        return entityId;
    }
    
    // Add entity to player's collection
    function addEntityToPlayer(
        GameState storage gameState, 
        address player,
        uint256 entityId
    ) internal {
        gameState.playerEntities[player].push(entityId);
        gameState.entities[entityId].owner = player;
    }
    
    // Create a new entity from merging two entities
    function createMergedEntity(
        GameState storage gameState,
        address player,
        uint256 entity1Id,
        uint256 entity2Id,
        uint256 rarity,
        string memory name,
        string memory metadataURI
    ) internal returns (uint256) {
        uint256 newEntityId = gameState.entityIdCounter++;
        
        gameState.entities[newEntityId] = Entity({
            id: newEntityId,
            name: name,
            rarity: rarity,
            metadataURI: metadataURI,
            owner: player
        });
        
        gameState.playerEntities[player].push(newEntityId);
        
        return newEntityId;
    }
    
    // Check if player owns an entity
    function ownsEntity(
        GameState storage gameState,
        address player,
        uint256 entityId
    ) internal view returns (bool) {
        if (gameState.entities[entityId].owner == player) {
            return true;
        }
        return false;
    }
    
    // Get player's entities
    function getPlayerEntities(
        GameState storage gameState,
        address player
    ) internal view returns (uint256[] memory) {
        return gameState.playerEntities[player];
    }
    
    // Get entity by ID
    function getEntity(
        GameState storage gameState,
        uint256 entityId
    ) internal view returns (Entity storage) {
        return gameState.entities[entityId];
    }
}