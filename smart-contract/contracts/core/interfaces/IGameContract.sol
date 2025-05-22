// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IGameContract {
    function startGame() external;
    function requestMerge(uint256 entity1Id, uint256 entity2Id) external;
    function completeMerge(address player, uint256 entity1Id, uint256 entity2Id, string calldata metadataURI) external;
    function getEntity(uint256 entityId) external view returns (string memory entityData);
    function getPlayerEntities(address player) external view returns (uint256[] memory);
}