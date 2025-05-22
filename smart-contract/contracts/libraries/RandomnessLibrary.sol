// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library RandomnessLibrary {
    function getRandomNumber(uint256 seed) internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty, seed)));
    }
}