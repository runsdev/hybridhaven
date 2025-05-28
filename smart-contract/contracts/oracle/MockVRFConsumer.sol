// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockVRFConsumer
 * @dev A simple mock VRF consumer for development and testing
 * This contract simulates randomness without requiring Chainlink VRF setup
 */
contract MockVRFConsumer is Ownable {
    event RequestSent(uint256 requestId, uint32 numWords);
    event RequestFulfilled(uint256 requestId, uint256[] randomWords);

    struct RequestStatus {
        bool fulfilled;
        bool exists;
        uint256[] randomWords;
    }
    
    mapping(uint256 => RequestStatus) s_requests;
    mapping(address => bool) public authorizedCallers;
    
    uint256 public lastRequestId;
    uint256[] public requestIds;
    address public deployer;
    
    // Simple counter for generating request IDs
    uint256 private requestCounter = 1;

    constructor() {
        deployer = msg.sender;
    }

    modifier onlyAuthorized() {
        require(msg.sender == deployer || authorizedCallers[msg.sender], "Not authorized");
        _;
    }

    function addAuthorizedCaller(address _caller) external {
        require(msg.sender == deployer, "Only deployer can authorize");
        authorizedCallers[_caller] = true;
    }

    function removeAuthorizedCaller(address _caller) external {
        require(msg.sender == deployer, "Only deployer can authorize");
        authorizedCallers[_caller] = false;
    }

    function requestRandomWords() external onlyAuthorized returns (uint256 requestId) {
        requestId = requestCounter++;
        
        // Generate pseudo-randomness using block properties
        // NOTE: This is NOT secure randomness - only for development/testing
        uint256 pseudoRandom = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.difficulty,
            block.number,
            msg.sender,
            requestId
        ))) % 10000 + 1; // Random number between 1-10000
        
        // Store the request
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = pseudoRandom;
        
        s_requests[requestId] = RequestStatus({
            randomWords: randomWords,
            exists: true,
            fulfilled: true // Immediately fulfilled in mock
        });
        
        requestIds.push(requestId);
        lastRequestId = requestId;
        
        emit RequestSent(requestId, 1);
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

    function getRandomnessResult(uint256 _requestId) external view returns (uint256) {
        require(s_requests[_requestId].exists, "request not found");
        require(s_requests[_requestId].fulfilled, "request not fulfilled");
        return s_requests[_requestId].randomWords[0];
    }

    // Configuration functions to maintain compatibility with ChainlinkVRFConsumer
    function getConfig() external pure returns (
        uint256 subscriptionId,
        bytes32 keyHashValue,
        uint32 gasLimit,
        uint16 confirmations,
        uint32 words
    ) {
        return (1, bytes32(0), 100000, 3, 1);
    }
}