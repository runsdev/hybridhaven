// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library RandomnessLibrary {
    struct Randomness {
        // Mapping from requestId to randomness result
        mapping(bytes32 => uint256) results;
        // Mapping from requestId to boolean indicating if result is ready
        mapping(bytes32 => bool) fulfilled;
    }
    
    // Store randomness result for a request
    function storeRandomness(Randomness storage randomness, bytes32 requestId, uint256 result) internal {
        randomness.results[requestId] = result;
        randomness.fulfilled[requestId] = true;
    }
    
    // Check if randomness result is available
    function isRandomnessAvailable(Randomness storage randomness, bytes32 requestId) internal view returns (bool) {
        return randomness.fulfilled[requestId];
    }
    
    // Get randomness result for a request
    function getRandomnessResult(Randomness storage randomness, bytes32 requestId) internal view returns (uint256) {
        require(randomness.fulfilled[requestId], "Randomness not available");
        return randomness.results[requestId];
    }
    
    // Generate a rarity level based on randomness (1-5 stars)
    function generateRarity(uint256 randomValue) internal pure returns (uint256) {
        // Using weighted probabilities:
        // 60% for 1-star
        // 25% for 2-star
        // 10% for 3-star
        // 4% for 4-star
        // 1% for 5-star
        uint256 value = randomValue % 100;
        
        if (value < 60) {
            return 1; // 1-star: 60%
        } else if (value < 85) {
            return 2; // 2-star: 25% 
        } else if (value < 95) {
            return 3; // 3-star: 10%
        } else if (value < 99) {
            return 4; // 4-star: 4%
        } else {
            return 5; // 5-star: 1%
        }
    }
}