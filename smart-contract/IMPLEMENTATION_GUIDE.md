# HybridHaven Smart Contracts Implementation Guide

This guide covers how to implement the HybridHaven smart contracts in a backend service and test the complete flow using Remix IDE.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Contract Deployment](#contract-deployment)
3. [Backend Implementation](#backend-implementation)
4. [Testing on Remix](#testing-on-remix)
5. [Production Considerations](#production-considerations)

## Architecture Overview

The HybridHaven game consists of three main smart contracts:

### 1. NFTContract.sol
- **Purpose**: Manages the NFT entities (creatures) in the game
- **Key Functions**:
  - `claimStarterEntity()`: Allows new players to claim a starter entity
  - `mintHybridEntity()`: Creates new hybrid entities from merging
  - `updateEntityImage()`: Updates entity image URI after generation
  - `getEntity()`: Retrieves entity details
  - `getTokensByOwner()`: Gets all tokens owned by a user

### 2. ChainlinkVRFConsumer.sol
- **Purpose**: Provides verifiable randomness for merge outcomes
- **Key Functions**:
  - `requestRandomWords()`: Requests randomness from Chainlink VRF
  - `fulfillRandomWords()`: Callback function for VRF response
  - `getRequestStatus()`: Returns the status and random words for a request

### 3. GameContract.sol
- **Purpose**: Main game logic and merge mechanics
- **Key Functions**:
  - `requestMerge()`: Initiates a merge request between two entities
  - `completeMerge()`: Completes the merge after randomness is fulfilled
  - `setBackendAddress()`: Sets the authorized backend address
  - `getPendingRequests()`: Gets pending merge requests for a player
  - `isRandomnessReady()`: Checks if VRF request is ready for completion
  - `getRequestRandomness()`: Gets the random value for a completed VRF request

## Contract Deployment

### Individual Contract Deployment (Recommended)

Deploy contracts individually for better control and debugging:

```bash
# 1. Deploy VRF Consumer first
npx hardhat run scripts/deploy-vrf.ts --network sepolia

# 2. Deploy NFT Contract
npx hardhat run scripts/deploy-nft.ts --network sepolia

# 3. Deploy Game Contract (auto-configures with existing contracts)
npx hardhat run scripts/deploy-game.ts --network sepolia

# 4. Configure all contract references (if needed)
npx hardhat run scripts/configure.ts --network sepolia
```

### Complete Deployment (All at Once)

```bash
# Deploy all contracts together
npx hardhat run scripts/deploy.ts --network sepolia
```

### Local Development with Mock VRF

```bash
# For testing without real Chainlink VRF
npx hardhat run scripts/deploy-mock-vrf.ts --network localhost
```

## Testing on Remix

### 1. Setup in Remix

1. **Open Remix IDE**: Go to https://remix.ethereum.org
2. **Create Workspace**: Create a new workspace for the project
3. **Upload Contracts**: Copy all contract files to the workspace
4. **Install Dependencies**: Use the "File Explorer" to add OpenZeppelin and Chainlink contracts

### 2. Compilation

```solidity
// In Remix, select Solidity Compiler
// Set compiler version to 0.8.19 or higher
// Enable optimization
// Compile all contracts
```

### 3. Mock VRF Setup for Testing

```solidity
// Create a mock VRF contract for testing
contract MockVRFCoordinator {
    mapping(uint256 => bool) public requestExists;
    uint256 public nextRequestId = 1;
    
    function requestRandomWords(
        bytes32 keyHash,
        uint64 subId,
        uint16 requestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    ) external returns (uint256 requestId) {
        requestId = nextRequestId++;
        requestExists[requestId] = true;
        
        // Simulate VRF callback with mock randomness
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = uint256(keccak256(abi.encodePacked(block.timestamp, requestId))) % 10000 + 1;
        
        // Call fulfillRandomWords on the consumer
        ChainlinkVRFConsumer(msg.sender).rawFulfillRandomWords(requestId, randomWords);
        
        return requestId;
    }
}
```

### 4. Deployment Sequence in Remix

```javascript
// 1. Deploy MockVRFCoordinator (for testing)
const mockVRF = await MockVRFCoordinator.deploy();

// 2. Deploy ChainlinkVRFConsumer with mock VRF
const vrfConsumer = await ChainlinkVRFConsumer.deploy();

// 3. Deploy NFTContract
const nftContract = await NFTContract.deploy();

// 4. Deploy GameContract
const gameContract = await GameContract.deploy();

// 5. Configure contracts
await gameContract.setNFTContract(nftContract.address);
await gameContract.setVRFConsumer(vrfConsumer.address);

// 6. Transfer ownerships
await nftContract.transferOwnership(gameContract.address);

// 7. Set backend address (use your test account)
await gameContract.setBackendAddress("0xYourBackendAddress");
```

### 5. Testing Flow

#### Test 1: Check Available Starters
```javascript
// Get available starter entities
const starters = await gameContract.getStarterEntities();
console.log("Available starters:", starters);
```

#### Test 2: Request Merge
```javascript
// Request merge with two starter entities
const tx = await gameContract.requestMerge(
    "Fire",     // entity1Name
    "Water",    // entity2Name
    true,       // entity1IsStarter
    true,       // entity2IsStarter
    0,          // entity1TokenId (0 for starters)
    0,          // entity2TokenId (0 for starters)
    { value: ethers.parseEther("0.0001") } // Required payment
);

await tx.wait();

// Check pending requests
const pending = await gameContract.getPendingRequests(userAddress);
console.log("Pending requests:", pending);
```

#### Test 3: Complete Merge
```javascript
// Get the request ID from pending requests
const requestId = pending[0];

// Check if randomness is ready
const isReady = await gameContract.isRandomnessReady(requestId);
console.log("Randomness ready:", isReady);

if (isReady) {
    // Complete merge (as backend address)
    await gameContract.completeMerge(
        requestId,
        "FireWater",
        "ipfs://QmSomeImageHash"
    );
    
    // Check the new entity
    const newTokens = await nftContract.getTokensByOwner(userAddress);
    const hybridEntity = await nftContract.getEntity(newTokens[newTokens.length - 1]);
    console.log("New hybrid entity:", hybridEntity);
}
```

### 6. Testing Events

```javascript
// Listen for events in Remix console
gameContract.on("MergeRequested", (player, entity1Name, entity2Name, requestId) => {
    console.log("Merge Requested:", {
        player,
        entity1Name,
        entity2Name,
        requestId: requestId.toString()
    });
});

gameContract.on("MergeCompleted", (player, newEntityId, rarity, requestId) => {
    console.log("Merge Completed:", {
        player,
        newEntityId: newEntityId.toString(),
        rarity,
        requestId: requestId.toString()
    });
});
```

## Production Considerations

### 1. Chainlink VRF Setup

For production deployment on Sepolia/Mainnet:

```javascript
// Sepolia VRF parameters (already configured in contracts)
const VRF_COORDINATOR = "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B";
const KEY_HASH = "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae";
const SUBSCRIPTION_ID = process.env.VRF_SUBSCRIPTION_ID;

// Ensure VRF subscription is funded with LINK tokens
// Add deployed VRF Consumer as a consumer in your subscription
```

### 2. Security Considerations

- **Access Control**: Only authorized backend can call `completeMerge`
- **Payment Validation**: 0.0001 ETH required for each merge request
- **Rate Limiting**: 5-minute cooldown between merges per player
- **Input Validation**: Validate entity names and ownership
- **Error Handling**: Implement robust error handling for failed VRF requests
- **Emergency Functions**: Owner can cancel stuck requests after 1 hour

### 3. Gas Optimization

- **Batch Operations**: Process multiple merge completions in batches
- **Gas Price Management**: Monitor and adjust gas prices dynamically
- **Transaction Queuing**: Use a queue system for high-volume periods
- **Efficient Storage**: Use mappings for O(1) lookups

### 4. Scalability

- **Database Integration**: Cache contract data in PostgreSQL/MongoDB
- **Redis Caching**: Store frequently accessed data
- **Load Balancing**: Use multiple backend instances
- **WebSocket Support**: Real-time updates for frontend
- **Event Indexing**: Use The Graph Protocol for efficient event querying

### 5. Monitoring and Analytics

```javascript
// Example monitoring setup
const contractMonitor = {
    trackMergeRequests: async () => {
        const filter = gameContract.filters.MergeRequested();
        const events = await gameContract.queryFilter(filter, -1000);
        
        for (const event of events) {
            await analytics.recordMergeRequest({
                player: event.args.player,
                entity1Name: event.args.entity1Name,
                entity2Name: event.args.entity2Name,
                requestId: event.args.requestId.toString(),
                timestamp: new Date(),
                blockNumber: event.blockNumber
            });
        }
    },
    
    trackSuccessRate: async () => {
        const requested = await analytics.countMergeRequests(last24Hours);
        const completed = await analytics.countCompletedMerges(last24Hours);
        const successRate = (completed / requested) * 100;
        
        console.log(`Merge success rate: ${successRate}%`);
    },
    
    trackRarityDistribution: async () => {
        const rarities = await analytics.getRarityDistribution(last24Hours);
        console.log(`Rarity distribution:`, rarities);
    }
};
```

### 6. Error Recovery

```javascript
// Handle stuck VRF requests
async function handleStuckRequests() {
    const stuckRequests = await findRequestsOlderThan(1); // 1 hour
    
    for (const request of stuckRequests) {
        try {
            // Check if randomness is actually available
            const isReady = await gameContract.isRandomnessReady(request.requestId);
            
            if (isReady) {
                // Complete the merge
                await processMerge(request.requestId);
            } else {
                // Log for manual investigation
                console.log(`VRF request ${request.requestId} stuck - may need manual intervention`);
            }
        } catch (error) {
            console.error(`Error handling stuck request ${request.requestId}:`, error);
        }
    }
}

// Run every 10 minutes
setInterval(handleStuckRequests, 10 * 60 * 1000);
```

This implementation guide provides a complete foundation for building a production-ready backend service that integrates with the HybridHaven smart contracts, including error handling, monitoring, and scalability considerations.