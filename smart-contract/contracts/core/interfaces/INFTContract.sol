// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface INFTContract {
    function mintNFT(address to, string memory tokenURI) external returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
    function totalSupply() external view returns (uint256);
    function tokenURI(uint256 tokenId) external view returns (string memory);
}