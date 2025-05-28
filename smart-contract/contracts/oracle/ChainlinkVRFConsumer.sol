// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol";

contract ChainlinkVRFConsumer is VRFConsumerBaseV2Plus {
    event RequestSent(uint256 requestId, uint32 numWords);
    event RequestFulfilled(uint256 requestId, uint256[] randomWords);

    struct RequestStatus {
        bool fulfilled; // whether the request has been successfully fulfilled
        bool exists; // whether a requestId exists
        uint256[] randomWords;
    }
    mapping(uint256 => RequestStatus) s_requests; /* requestId --> requestStatus */

    // Your subscription ID.
    uint256 public s_subscriptionId;

    // Past request IDs.
    uint256[] public requestIds;
    uint256 public lastRequestId;

    // The gas lane to use, which specifies the maximum gas price to bump to.
    // For a list of available gas lanes on each network,
    // see https://docs.chain.link/vrf/v2-5/supported-networks
    bytes32 public keyHash;

    uint32 public callbackGasLimit = 100000;
    uint16 public requestConfirmations = 3;
    uint32 public numWords = 1;

    // Simple authorization - just allow the GameContract to call
    mapping(address => bool) public authorizedCallers;
    address public deployer;

    // Events for configuration updates
    event SubscriptionIdUpdated(uint256 oldId, uint256 newId);
    event KeyHashUpdated(bytes32 oldHash, bytes32 newHash);
    event ConfigUpdated(uint32 gasLimit, uint16 confirmations, uint32 words);

    constructor(address _vrfCoordinator) VRFConsumerBaseV2Plus(_vrfCoordinator) {
        deployer = msg.sender;
        // Configuration will be set via setter functions
    }

    // Modifier to allow deployer or authorized callers
    modifier onlyAuthorized() {
        require(msg.sender == deployer || authorizedCallers[msg.sender], "Not authorized");
        _;
    }

    // Add authorized caller (only deployer)
    function addAuthorizedCaller(address _caller) external {
        require(msg.sender == deployer, "Only deployer can authorize");
        authorizedCallers[_caller] = true;
    }

    // Remove authorized caller (only deployer)
    function removeAuthorizedCaller(address _caller) external {
        require(msg.sender == deployer, "Only deployer can authorize");
        authorizedCallers[_caller] = false;
    }

    // Set subscription ID
    function setSubscriptionId(uint256 _subscriptionId) external {
        require(msg.sender == deployer, "Only deployer can configure");
        uint256 oldId = s_subscriptionId;
        s_subscriptionId = _subscriptionId;
        emit SubscriptionIdUpdated(oldId, _subscriptionId);
    }

    // Set key hash
    function setKeyHash(bytes32 _keyHash) external {
        require(msg.sender == deployer, "Only deployer can configure");
        bytes32 oldHash = keyHash;
        keyHash = _keyHash;
        emit KeyHashUpdated(oldHash, _keyHash);
    }

    // Set VRF configuration
    function setVRFConfig(
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        uint32 _numWords
    ) external {
        require(msg.sender == deployer, "Only deployer can configure");
        callbackGasLimit = _callbackGasLimit;
        requestConfirmations = _requestConfirmations;
        numWords = _numWords;
        emit ConfigUpdated(_callbackGasLimit, _requestConfirmations, _numWords);
    }

    // Get current configuration
    function getConfig() external view returns (
        uint256 subscriptionId,
        bytes32 keyHashValue,
        uint32 gasLimit,
        uint16 confirmations,
        uint32 words
    ) {
        return (s_subscriptionId, keyHash, callbackGasLimit, requestConfirmations, numWords);
    }

    function requestRandomWords() external onlyAuthorized returns (uint256 requestId) {
        // Will revert if subscription is not set and funded.
        requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: keyHash,
                subId: s_subscriptionId,
                requestConfirmations: requestConfirmations,
                callbackGasLimit: callbackGasLimit,
                numWords: numWords,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({
                        nativePayment: true
                    })
                )
            })
        );
        s_requests[requestId] = RequestStatus({
            randomWords: new uint256[](0),
            exists: true,
            fulfilled: false
        });
        requestIds.push(requestId);
        lastRequestId = requestId;
        emit RequestSent(requestId, numWords);
        return requestId;
    }

    function fulfillRandomWords(
        uint256 _requestId,
        uint256[] calldata _randomWords
    ) internal override {
        require(s_requests[_requestId].exists, "request not found");
        uint256[] memory s_randomRange = _randomWords;
        for (uint32 i = 0; i < numWords; i++) {
            s_randomRange[i] = (_randomWords[0] % 10000) + 1;
        }
        s_requests[_requestId].fulfilled = true;
        s_requests[_requestId].randomWords = s_randomRange;
        emit RequestFulfilled(_requestId, s_randomRange);
    }

    function getRequestStatus(
        uint256 _requestId
    ) external view returns (bool fulfilled, uint256[] memory randomWords) {
        require(s_requests[_requestId].exists, "request not found");
        RequestStatus memory request = s_requests[_requestId];
        return (request.fulfilled, request.randomWords);
    }

    function getRandomnessResult(uint256 _requestId) external view returns (uint256) {
        return s_requests[_requestId].randomWords[0];
    }
}