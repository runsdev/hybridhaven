// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract NFTContract is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    // Entity structure
    struct Entity {
        uint256 tokenId;
        string name;
        uint8 rarity; // 1-5 star rarity
        string imageURI;
        string parent1; // Name of first parent entity (if merged)
        string parent2; // Name of second parent entity (if merged)
        uint256 createdAt;
        bool isStarter; // True if this is a starter entity
    }

    // Mapping from token ID to entity data
    mapping(uint256 => Entity) public entities;
    
    // Mapping to track user's starter entities
    mapping(address => bool) public hasStarterEntity;
    
    // Array of starter entity names
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
    event EntityMinted(address indexed to, uint256 indexed tokenId, string name, uint8 rarity);
    event StarterEntityClaimed(address indexed user, uint256 indexed tokenId, string name);

    constructor() ERC721("HybridHaven", "HYBRID") {}

    // Mint a starter entity for new players
    function claimStarterEntity() external {
        require(!hasStarterEntity[msg.sender], "Already claimed starter entities");
        
        // Mint all starter entities
        for (uint256 i = 0; i < starterEntities.length; i++) {
            string memory starterName = starterEntities[i];
            
            _tokenIds.increment();
            uint256 newTokenId = _tokenIds.current();
            
            _safeMint(msg.sender, newTokenId);
            
            entities[newTokenId] = Entity({
                tokenId: newTokenId,
                name: starterName,
                rarity: 1, // Starter entities are always 1 star
                imageURI: "", // Will be set by backend
                parent1: "",
                parent2: "",
                createdAt: block.timestamp,
                isStarter: true
            });
            
            emit StarterEntityClaimed(msg.sender, newTokenId, starterName);
            emit EntityMinted(msg.sender, newTokenId, starterName, 1);
        }
        
        hasStarterEntity[msg.sender] = true;
    }

    // Mint starter entities for a specific address (called by owner/backend)
    function claimStarterEntityFor(address to) external onlyOwner {
        require(!hasStarterEntity[to], "Already claimed starter entities");
        
        // Mint all starter entities
        for (uint256 i = 0; i < starterEntities.length; i++) {
            string memory starterName = starterEntities[i];
            
            _tokenIds.increment();
            uint256 newTokenId = _tokenIds.current();
            
            _safeMint(to, newTokenId);
            
            entities[newTokenId] = Entity({
                tokenId: newTokenId,
                name: starterName,
                rarity: 1, // Starter entities are always 1 star
                imageURI: "", // Will be set by backend
                parent1: "",
                parent2: "",
                createdAt: block.timestamp,
                isStarter: true
            });
            
            emit StarterEntityClaimed(to, newTokenId, starterName);
            emit EntityMinted(to, newTokenId, starterName, 1);
        }
        
        hasStarterEntity[to] = true;
    }

    // Mint a new hybrid entity (called by GameContract)
    function mintHybridEntity(
        address to,
        string memory name,
        uint8 rarity,
        string memory imageURI,
        string memory parent1,
        string memory parent2
    ) external onlyOwner returns (uint256) {
        require(rarity >= 1 && rarity <= 5, "Invalid rarity");
        
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, imageURI);
        
        entities[newTokenId] = Entity({
            tokenId: newTokenId,
            name: name,
            rarity: rarity,
            imageURI: imageURI,
            parent1: parent1,
            parent2: parent2,
            createdAt: block.timestamp,
            isStarter: false
        });
        
        emit EntityMinted(to, newTokenId, name, rarity);
        
        return newTokenId;
    }

    // Update entity image URI (called by backend after image generation)
    function updateEntityImage(uint256 tokenId, string memory imageURI) external onlyOwner {
        require(_exists(tokenId), "Entity does not exist");
        entities[tokenId].imageURI = imageURI;
        _setTokenURI(tokenId, imageURI);
    }

    // Get entity details
    function getEntity(uint256 tokenId) external view returns (Entity memory) {
        require(_exists(tokenId), "Entity does not exist");
        return entities[tokenId];
    }

    // Get all tokens owned by a user
    function getTokensByOwner(address owner) external view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](tokenCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= _tokenIds.current(); i++) {
            if (ownerOf(i) == owner) {
                tokenIds[index] = i;
                index++;    
            }
        }
        
        return tokenIds;
    }

    // Required overrides
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}