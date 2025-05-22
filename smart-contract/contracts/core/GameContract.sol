// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IGameContract.sol";
import "./libraries/GameLibrary.sol";
import "./libraries/RandomnessLibrary.sol";

contract GameContract is IGameContract {
    using GameLibrary for GameLibrary.GameState;
    using RandomnessLibrary for RandomnessLibrary.Randomness;

    GameLibrary.GameState private gameState;
    RandomnessLibrary.Randomness private randomness;

    // Event emitted when a new entity is merged
    event EntityMerged(address indexed player, uint256 entityId, uint256 newEntityId);

    // Function to start the game
    function startGame() external override {
        // Initialize game state
        gameState.initialize();
    }

    // Function to select and merge entities
    function mergeEntities(uint256 entityId1, uint256 entityId2) external override {
        // Logic for merging entities
        uint256 newEntityId = gameState.merge(entityId1, entityId2);
        emit EntityMerged(msg.sender, entityId1, newEntityId);
    }

    // Additional game logic functions can be added here
}