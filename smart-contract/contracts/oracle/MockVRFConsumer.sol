// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockVRFConsumer
 * @dev A simple mock VRF consumer for development and testing
 * This contract simulates the same interface as SubscriptionConsumer
 */
contract MockVRFConsumer is Ownable {
    event RequestSent(uint256 requestId, uint32 numWords);
    event RequestFulfilled(uint256 requestId, uint256[] randomWords);

    struct RequestStatus {
        bool fulfilled;
        bool exists;
        uint256[] randomWords;
    }
    
    mapping(uint256 => RequestStatus) public s_requests;
    
    uint256 public lastRequestId;
    uint256[] public requestIds;
    uint256 public s_subscriptionId = 1; // Mock subscription ID
    
    // VRF configuration parameters (for interface compatibility)
    bytes32 public keyHash = 0x0000000000000000000000000000000000000000000000000000000000000001;
    uint32 public callbackGasLimit = 100000;
    uint16 public requestConfirmations = 3;
    uint32 public numWords = 2; // Default to 2 words in mock implementation
    
    // Events for configuration changes (matching ChainlinkVRFConsumer)
    event SubscriptionIdSet(uint256 oldSubscriptionId, uint256 newSubscriptionId);
    event KeyHashSet(bytes32 oldKeyHash, bytes32 newKeyHash);
    event VRFConfigSet(uint32 callbackGasLimit, uint16 requestConfirmations, uint32 numWords);
    
    // Simple counter for generating request IDs
    uint256 private requestCounter = 1;

    constructor() {
        // Mock constructor - no parameters needed
    }
    
    /**
     * @notice Sets the subscription ID for VRF requests (mock implementation)
     * @param subscriptionId The mock VRF subscription ID
     */
    function setSubscriptionId(uint256 subscriptionId) external {
        uint256 oldSubscriptionId = s_subscriptionId;
        s_subscriptionId = subscriptionId;
        emit SubscriptionIdSet(oldSubscriptionId, subscriptionId);
    }
    
    /**
     * @notice Sets the key hash for VRF requests (mock implementation)
     * @param _keyHash The key hash to use for VRF requests
     */
    function setKeyHash(bytes32 _keyHash) external {
        bytes32 oldKeyHash = keyHash;
        keyHash = _keyHash;
        emit KeyHashSet(oldKeyHash, _keyHash);
    }
    
    /**
     * @notice Sets the VRF configuration parameters (mock implementation)
     * @param _callbackGasLimit Gas limit for the callback function
     * @param _requestConfirmations Number of block confirmations before fulfilling
     * @param _numWords Number of random words to request
     */
    function setVRFConfig(
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        uint32 _numWords
    ) external {
        callbackGasLimit = _callbackGasLimit;
        requestConfirmations = _requestConfirmations;
        numWords = _numWords;
        emit VRFConfigSet(_callbackGasLimit, _requestConfirmations, _numWords);
    }

    // Mock the same interface as SubscriptionConsumer
    function requestRandomWords(bool enableNativePayment) external returns (uint256 requestId) {
        requestId = requestCounter++;
        
        // Generate pseudo-randomness using block properties
        // NOTE: This is NOT secure randomness - only for development/testing
        uint256 pseudoRandom1 = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            block.number,
            msg.sender,
            requestId
        )));
        
        // Generate additional random words based on numWords
        uint256[] memory randomWords = new uint256[](numWords);
        randomWords[0] = pseudoRandom1;
        
        for (uint32 i = 1; i < numWords; i++) {
            randomWords[i] = uint256(keccak256(abi.encodePacked(
                pseudoRandom1,
                block.timestamp + i
            )));
        }
        
        s_requests[requestId] = RequestStatus({
            randomWords: randomWords,
            exists: true,
            fulfilled: true // Immediately fulfilled in mock
        });
        
        requestIds.push(requestId);
        lastRequestId = requestId;
        
        emit RequestSent(requestId, numWords);
        emit RequestFulfilled(requestId, randomWords);
        
        return requestId;
    }

    function getRequestStatus(
        uint256 _requestId
    ) external view returns (bool fulfilled, uint256[] memory randomWords) {
        require(s_requests[_requestId].exists, "request not found");
        RequestStatus memory request = s_requests[_requestId];
        return (request.fulfilled, request.randomWords);
    }
}