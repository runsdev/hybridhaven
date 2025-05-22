// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/INFTContract.sol";

contract NFTContract is ERC721URIStorage, Ownable, INFTContract {
    uint256 private _tokenIdCounter;
    
    // Map tokenId to its IPFS URI
    mapping(uint256 => string) private _tokenURIs;
    // Total supply counter
    uint256 private _totalSupply;

    constructor() ERC721("HybridHavenNFT", "HHNFT") {}

    function mintNFT(address to, string memory tokenURI) external override onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        _mint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        _totalSupply++;
        return tokenId;
    }

    function tokenURI(uint256 tokenId) public view override(ERC721URIStorage, INFTContract) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }
    
    // Required override to handle ERC721URIStorage
    function _burn(uint256 tokenId) internal override(ERC721URIStorage) {
        super._burn(tokenId);
        _totalSupply--;
    }
    
    // Function to allow contract owner (GameContract) to update token URI 
    // if needs to update metadata later
    function updateTokenURI(uint256 tokenId, string memory newTokenURI) external onlyOwner {
        require(_exists(tokenId), "ERC721URIStorage: URI update for nonexistent token");
        _setTokenURI(tokenId, newTokenURI);
    }
}