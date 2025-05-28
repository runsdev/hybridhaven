// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
// import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol";
// import "@openzeppelin/contracts/access/Ownable.sol";

// contract ChainlinkVRFConsumer is VRFConsumerBaseV2Plus, Ownable {
//     VRFCoordinatorV2Interface immutable coordinator;
    
//     // VRF Subscription ID
//     uint64 s_subscriptionId;
//     // The gas lane to use (depends on the network)
//     bytes32 s_keyHash;
//     // Maximum gas for the callback
//     uint32 callbackGasLimit = 100000;
//     // Number of confirmations before responding
//     uint16 requestConfirmations = 3;
//     // Number of random words to request
//     uint32 numWords = 1;
//     // Latest randomness result
//     uint256 public randomResult;
    
//     // Request ID to randomness mapping
//     mapping(uint256 => uint256) public s_requestIdToRandomness;
//     // Event for randomness fulfillment
//     event RandomnessFulfilled(uint256 requestId, uint256 randomness);
    
//     constructor(
//         address _vrfCoordinator,
//         uint64 _subscriptionId,
//         bytes32 _keyHash
//     ) VRFConsumerBaseV2(_vrfCoordinator) {
//         coordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
//         s_subscriptionId = _subscriptionId;
//         s_keyHash = _keyHash;
//     }

//     // Request randomness from Chainlink VRF
//     function getRandomNumber() external onlyOwner returns (bytes32) {
//         uint256 requestId = coordinator.requestRandomWords(
//             s_keyHash,
//             s_subscriptionId,
//             requestConfirmations,
//             callbackGasLimit,
//             numWords
//         );
        
//         // Return something that can be used to track the request
//         return bytes32(requestId);
//     }
    
//     // Callback function used by VRF Coordinator
//     function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
//         randomResult = randomWords[0];
//         s_requestIdToRandomness[requestId] = (randomWords[0]% 10000) + 1;
//         emit RandomnessFulfilled(requestId, s_requestIdToRandomness[requestId]);
//     }
    
//     // Allow owner to update configuration
//     function setCallbackGasLimit(uint32 _callbackGasLimit) external onlyOwner {
//         callbackGasLimit = _callbackGasLimit;
//     }
    
//     function setRequestConfirmations(uint16 _requestConfirmations) external onlyOwner {
//         requestConfirmations = _requestConfirmations;
//     }
    
//     // Get the randomness result for a specific request
//     function getRandomnessResult(uint256 requestId) external view returns (uint256) {
//         return s_requestIdToRandomness[requestId];
//     }
// }

contract ChainlinkVRFConsumer is VRFConsumerBaseV2Plus {
    event RequestSent(uint256 requestId, uint32 numWords);
    event RequestFulfilled(uint256 requestId, uint256[] randomWords);

    struct RequestStatus {
        bool fulfilled; // whether the request has been successfully fulfilled
        bool exists; // whether a requestId exists
        uint256[] randomWords;
    }
    mapping(uint256 => RequestStatus)
        public s_requests; /* requestId --> requestStatus */

    // Your subscription ID.
    uint256 public s_subscriptionId;

    // Past request IDs.
    uint256[] public requestIds;
    uint256 public lastRequestId;

    // The gas lane to use, which specifies the maximum gas price to bump to.
    // For a list of available gas lanes on each network,
    // see https://docs.chain.link/vrf/v2-5/supported-networks
    bytes32 public keyHash;

    // Depends on the number of requested values that you want sent to the
    // fulfillRandomWords() function. Storing each word costs about 20,000 gas,
    // so 100,000 is a safe default for this example contract. Test and adjust
    // this limit based on the network that you select, the size of the request,
    // and the processing of the callback request in the fulfillRandomWords()
    // function.
    uint32 public callbackGasLimit = 100000;

    // The default is 3, but you can set this higher.
    uint16 public requestConfirmations = 3;

    // For this example, retrieve 2 random values in one request.
    // Cannot exceed VRFCoordinatorV2_5.MAX_NUM_WORDS.
    uint32 public numWords = 1;

    /**
     * HARDCODED FOR SEPOLIA
     * COORDINATOR: 0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B
     */
    constructor(
        address _vrfCoordinator,
        uint256 _subscriptionId,
        bytes32 _keyHash
    ) VRFConsumerBaseV2Plus(_vrfCoordinator) {
        s_subscriptionId = _subscriptionId;
        keyHash = _keyHash;
    }

    function requestRandomWords() external onlyOwner returns (uint256 requestId) {
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