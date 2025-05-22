// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IGameContract {
    function startGame() external;
    function mergeEntities(uint256 entity1Id, uint256 entity2Id) external returns (uint256 newEntityId);
    function getEntity(uint256 entityId) external view returns (string memory entityData);
    function getPlayerEntities(address player) external view returns (uint256[] memory);
}