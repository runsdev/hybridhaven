// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract NFTContract is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    using Strings for uint256;
    Counters.Counter private _tokenIds;

    // Base URI for metadata
    string private _baseTokenURI;

    // Entity structure
    struct Entity {
        uint256 tokenId;
        string name;
        uint8 rarity;
        string metadataURI;
        string parent1;
        string parent2;
        uint256 createdAt;
        bool isStarter;
    }

    // Mapping from token ID to entity data
    mapping(uint256 => Entity) public entities;
    
    // Events for OpenSea compatibility
    event EntityMinted(address indexed to, uint256 indexed tokenId, string name, uint8 rarity);
    
    // ERC-4906: Permanent URI Event (for frozen metadata)
    event PermanentURI(string _value, uint256 indexed _id);

    constructor() ERC721("HybridHaven", "HYBRID") {
        _baseTokenURI = "https://cyan-nearby-hippopotamus-418.mypinata.cloud/ipfs/";
    }

    function contractURI() public pure returns (string memory) {
        return "https://cyan-nearby-hippopotamus-418.mypinata.cloud/ipfs/bafkreigukneaeoz4k7cu523gliovspmeityqweel7lr2gn35jw5uhdvsxi";
    }

    // Set base URI for metadata (OpenSea standard)
    function setBaseTokenURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
        // Emit batch metadata update for all tokens
        if (_tokenIds.current() > 0) {
            emit BatchMetadataUpdate(1, _tokenIds.current());
        }
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    // override tokenURI for OpenSea compatibility
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        require(_exists(tokenId), "ERC721: URI query for nonexistent token");
        
        // try to get stored URI first (for IPFS metadata)
        string memory _tokenURI = super.tokenURI(tokenId);
        if (bytes(_tokenURI).length > 0) {
            return _tokenURI;
        }
        
        // fallback
        string memory baseUri = _baseURI();
        return bytes(baseUri).length > 0 
            ? string(abi.encodePacked(baseUri, tokenId.toString()))
            : "";
    }

    // mint a new hybrid entity (called by GameContract)
    function mintHybridEntity(
        address to,
        string memory name,
        uint8 rarity,
        string memory metadataURI,
        string memory parent1,
        string memory parent2
    ) external returns (uint256) {
        require(rarity >= 1 && rarity <= 5, "Invalid rarity");
        
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        _safeMint(to, newTokenId);
        
        // Set IPFS metadata URI for hybrid entities
        if (bytes(metadataURI).length > 0) {
            _setTokenURI(newTokenId, metadataURI);
        }
        
        entities[newTokenId] = Entity({
            tokenId: newTokenId,
            name: name,
            rarity: rarity,
            metadataURI: metadataURI,
            parent1: parent1,
            parent2: parent2,
            createdAt: block.timestamp,
            isStarter: false
        });
        
        emit EntityMinted(to, newTokenId, name, rarity);
        emit MetadataUpdate(newTokenId);
        
        return newTokenId;
    }

    // update entity metadata URI (called by backend after metadata generation)
    function updateEntityMetadata(uint256 tokenId, string memory metadataURI) external onlyOwner {
        require(_exists(tokenId), "Entity does not exist");
        
        if (bytes(metadataURI).length > 0) {
            _setTokenURI(tokenId, metadataURI);
            entities[tokenId].metadataURI = metadataURI;
        }
        
        emit MetadataUpdate(tokenId);
    }

    // Freeze metadata for a token (OpenSea standard)
    function freezeMetadata(uint256 tokenId) external onlyOwner {
        require(_exists(tokenId), "Entity does not exist");
        string memory uri = tokenURI(tokenId);
        emit PermanentURI(uri, tokenId);
    }

    // Batch freeze metadata
    function batchFreezeMetadata(uint256 fromTokenId, uint256 toTokenId) external onlyOwner {
        require(fromTokenId <= toTokenId, "Invalid range");
        for (uint256 i = fromTokenId; i <= toTokenId; i++) {
            if (_exists(i)) {
                string memory uri = tokenURI(i);
                emit PermanentURI(uri, i);
            }
        }
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
            if (_exists(i) && ownerOf(i) == owner) {
                tokenIds[index] = i;
                index++;    
            }
        }
        
        return tokenIds;
    }

    // Get total supply
    function totalSupply() public view returns (uint256) {
        return _tokenIds.current();
    }

    // Check if token exists
    function exists(uint256 tokenId) external view returns (bool) {
        return _exists(tokenId);
    }

    // Burn NFT (can be called by token owner)
    function burn(uint256 tokenId) external {
        require(_exists(tokenId), "Token does not exist");
        require(
            ownerOf(tokenId) == msg.sender,
            "Only token owner or contract owner can burn"
        );
        
        _burn(tokenId);
    }

    // Override supportsInterface for OpenSea compatibility
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        // ERC-4906 interface ID
        bytes4 ERC4906_INTERFACE_ID = 0x49064906;
        
        return interfaceId == ERC4906_INTERFACE_ID || super.supportsInterface(interfaceId);
    }

    // Required overrides
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
        delete entities[tokenId];
    }
}