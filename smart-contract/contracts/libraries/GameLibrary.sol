// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library GameLibrary {
    struct Player {
        address playerAddress;
        uint256[] ownedEntities;
    }

    struct Entity {
        uint256 id;
        string name;
        uint256 rarity;
    }

    function addEntity(Player storage player, uint256 entityId) internal {
        player.ownedEntities.push(entityId);
    }

    function getEntity(Player storage player, uint256 index) internal view returns (uint256) {
        require(index < player.ownedEntities.length, "Index out of bounds");
        return player.ownedEntities[index];
    }

    function getOwnedEntitiesCount(Player storage player) internal view returns (uint256) {
        return player.ownedEntities.length;
    }
}