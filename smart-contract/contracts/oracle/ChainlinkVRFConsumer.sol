// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ChainlinkVRFConsumer is VRFConsumerBaseV2, Ownable {
    VRFCoordinatorV2Interface immutable coordinator;
    
    // VRF Subscription ID
    uint64 s_subscriptionId;
    // The gas lane to use (depends on the network)
    bytes32 s_keyHash;
    // Maximum gas for the callback
    uint32 callbackGasLimit = 100000;
    // Number of confirmations before responding
    uint16 requestConfirmations = 3;
    // Number of random words to request
    uint32 numWords = 1;
    // Latest randomness result
    uint256 public randomResult;
    
    // Request ID to randomness mapping
    mapping(uint256 => uint256) public s_requestIdToRandomness;
    // Event for randomness fulfillment
    event RandomnessFulfilled(uint256 requestId, uint256 randomness);
    
    constructor(
        address _vrfCoordinator,
        uint64 _subscriptionId,
        bytes32 _keyHash
    ) VRFConsumerBaseV2(_vrfCoordinator) {
        coordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
        s_subscriptionId = _subscriptionId;
        s_keyHash = _keyHash;
    }

    // Request randomness from Chainlink VRF
    function getRandomNumber() external onlyOwner returns (bytes32) {
        uint256 requestId = coordinator.requestRandomWords(
            s_keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
        
        // Return something that can be used to track the request
        return bytes32(requestId);
    }
    
    // Callback function used by VRF Coordinator
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        randomResult = randomWords[0];
        s_requestIdToRandomness[requestId] = randomWords[0];
        emit RandomnessFulfilled(requestId, randomWords[0]);
    }
    
    // Allow owner to update configuration
    function setCallbackGasLimit(uint32 _callbackGasLimit) external onlyOwner {
        callbackGasLimit = _callbackGasLimit;
    }
    
    function setRequestConfirmations(uint16 _requestConfirmations) external onlyOwner {
        requestConfirmations = _requestConfirmations;
    }
    
    // Get the randomness result for a specific request
    function getRandomnessResult(uint256 requestId) external view returns (uint256) {
        return s_requestIdToRandomness[requestId];
    }
}