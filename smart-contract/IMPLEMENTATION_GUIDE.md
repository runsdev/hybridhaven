# HybridHaven Smart Contract Implementation Guide

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
  - `getRandomNumber()`: Requests randomness from Chainlink VRF
  - `fulfillRandomWords()`: Callback function for VRF response
  - `getRandomnessResult()`: Returns the random number for a request

### 3. GameContract.sol
- **Purpose**: Main game logic and merge mechanics
- **Key Functions**:
  - `requestMerge()`: Initiates a merge request between two entities
  - `completeMerge()`: Completes the merge after randomness is fulfilled
  - `setBackendAddress()`: Sets the authorized backend address
  - `getPendingRequests()`: Gets pending merge requests for a player

## Contract Deployment

### Local Development (Hardhat)

1. **Install Dependencies**:
```bash
npm install @openzeppelin/contracts @chainlink/contracts
```

2. **Deploy Contracts**:
```bash
npx hardhat run scripts/deploy.ts --network localhost
```

### Remix Deployment

1. **Prepare Contract Files**:
   - Copy all contracts to Remix
   - Ensure proper import paths for OpenZeppelin and Chainlink contracts

2. **Deployment Order**:
   ```solidity
   // 1. Deploy ChainlinkVRFConsumer first
   ChainlinkVRFConsumer(vrfCoordinator, subscriptionId, keyHash)
   
   // 2. Deploy NFTContract
   NFTContract()
   
   // 3. Deploy GameContract with addresses from steps 1 & 2
   GameContract(nftContractAddress, vrfConsumerAddress)
   
   // 4. Transfer ownership of NFTContract to GameContract
   nftContract.transferOwnership(gameContractAddress)
   
   // 5. Transfer ownership of VRFConsumer to GameContract
   vrfConsumer.transferOwnership(gameContractAddress)
   ```

## Backend Implementation

### Node.js/Express Backend Setup

```javascript
const express = require('express');
const { ethers } = require('ethers');
const app = express();

// Contract addresses (from deployment)
const GAME_CONTRACT_ADDRESS = "0x...";
const NFT_CONTRACT_ADDRESS = "0x...";
const VRF_CONTRACT_ADDRESS = "0x...";

// Provider setup
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Contract instances
const gameContract = new ethers.Contract(
    GAME_CONTRACT_ADDRESS, 
    gameContractABI, 
    wallet
);

const nftContract = new ethers.Contract(
    NFT_CONTRACT_ADDRESS, 
    nftContractABI, 
    provider
);

const vrfContract = new ethers.Contract(
    VRF_CONTRACT_ADDRESS, 
    vrfConsumerABI, 
    provider
);
```

### Core Backend Functions

#### 1. Monitor Merge Requests

```javascript
// Listen for merge request events
gameContract.on("MergeRequested", async (player, entity1Id, entity2Id, requestId) => {
    console.log(`Merge requested: Player ${player}, Entities ${entity1Id} + ${entity2Id}, Request ${requestId}`);
    
    // Store the request in database
    await storeMergeRequest({
        player,
        entity1Id: entity1Id.toString(),
        entity2Id: entity2Id.toString(),
        requestId: requestId.toString(),
        status: 'pending'
    });
    
    // Start monitoring for VRF fulfillment
    monitorVRFFulfillment(requestId);
});
```

#### 2. Monitor VRF Fulfillment

```javascript
async function monitorVRFFulfillment(requestId) {
    // Listen for RandomnessFulfilled event
    vrfContract.on("RandomnessFulfilled", async (fulfillmentRequestId, randomness) => {
        if (fulfillmentRequestId.toString() === requestId.toString()) {
            console.log(`Randomness fulfilled for request ${requestId}: ${randomness}`);
            
            // Process the merge
            await processMerge(requestId, randomness);
        }
    });
    
    // Alternative: Poll for randomness result
    const pollForRandomness = async () => {
        try {
            const randomness = await vrfContract.getRandomnessResult(requestId);
            if (randomness > 0) {
                await processMerge(requestId, randomness);
                return;
            }
        } catch (error) {
            console.log("Randomness not yet available");
        }
        
        // Poll again in 10 seconds
        setTimeout(pollForRandomness, 10000);
    };
    
    // Start polling as backup
    setTimeout(pollForRandomness, 5000);
}
```

#### 3. Process Merge and Generate Content

```javascript
async function processMerge(requestId, randomness) {
    try {
        // Get merge request details
        const mergeRequest = await gameContract.getMergeRequest(requestId);
        
        // Get parent entities
        const entity1 = await nftContract.getEntity(mergeRequest.entity1Id);
        const entity2 = await nftContract.getEntity(mergeRequest.entity2Id);
        
        // Generate new entity name using AI/predefined logic
        const newEntityName = await generateEntityName(entity1.name, entity2.name);
        
        // Generate image using AI (e.g., DALL-E, Midjourney API)
        const imageURI = await generateEntityImage(entity1.name, entity2.name, newEntityName);
        
        // Complete the merge on-chain
        const tx = await gameContract.completeMerge(
            requestId,
            newEntityName,
            imageURI
        );
        
        await tx.wait();
        console.log(`Merge completed for request ${requestId}`);
        
        // Update database
        await updateMergeRequestStatus(requestId, 'completed');
        
    } catch (error) {
        console.error(`Error processing merge for request ${requestId}:`, error);
        await updateMergeRequestStatus(requestId, 'failed');
    }
}
```

#### 4. AI Content Generation

```javascript
// Example using OpenAI API
async function generateEntityName(parent1, parent2) {
    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{
            role: "user",
            content: `Create a creative name for a hybrid creature made from combining "${parent1}" and "${parent2}". The name should be unique and fantasy-themed. Return only the name.`
        }],
        max_tokens: 20
    });
    
    return response.choices[0].message.content.trim();
}

async function generateEntityImage(parent1, parent2, hybridName) {
    const prompt = `A fantasy creature that is a hybrid of ${parent1} and ${parent2}, called ${hybridName}. Digital art, game character, colorful, detailed.`;
    
    const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        size: "512x512",
        quality: "standard",
        n: 1,
    });
    
    const imageUrl = response.data[0].url;
    
    // Upload to IPFS or your preferred storage
    const ipfsHash = await uploadToIPFS(imageUrl);
    return `ipfs://${ipfsHash}`;
}
```

### Backend API Endpoints

```javascript
// Get player's entities
app.get('/api/player/:address/entities', async (req, res) => {
    try {
        const tokenIds = await nftContract.getTokensByOwner(req.params.address);
        const entities = [];
        
        for (const tokenId of tokenIds) {
            const entity = await nftContract.getEntity(tokenId);
            entities.push({
                tokenId: tokenId.toString(),
                name: entity.name,
                rarity: entity.rarity,
                imageURI: entity.imageURI,
                parent1: entity.parent1,
                parent2: entity.parent2,
                createdAt: entity.createdAt.toString(),
                isStarter: entity.isStarter
            });
        }
        
        res.json({ entities });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get pending merge requests
app.get('/api/player/:address/pending-merges', async (req, res) => {
    try {
        const pendingRequestIds = await gameContract.getPendingRequests(req.params.address);
        const pendingRequests = [];
        
        for (const requestId of pendingRequestIds) {
            const request = await gameContract.getMergeRequest(requestId);
            pendingRequests.push({
                requestId: requestId.toString(),
                entity1Id: request.entity1Id.toString(),
                entity2Id: request.entity2Id.toString(),
                timestamp: request.timestamp.toString(),
                fulfilled: request.fulfilled
            });
        }
        
        res.json({ pendingRequests });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Check merge cooldown
app.get('/api/player/:address/merge-status', async (req, res) => {
    try {
        const canMerge = await gameContract.canPlayerMerge(req.params.address);
        const timeUntilNext = await gameContract.timeUntilNextMerge(req.params.address);
        
        res.json({
            canMerge,
            timeUntilNextMerge: timeUntilNext.toString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
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
// 1. Deploy MockVRFCoordinator
const mockVRF = await MockVRFCoordinator.deploy();

// 2. Deploy ChainlinkVRFConsumer with mock VRF
const vrfConsumer = await ChainlinkVRFConsumer.deploy(
    mockVRF.address,
    1, // subscription ID
    "0x0000000000000000000000000000000000000000000000000000000000000001" // key hash
);

// 3. Deploy NFTContract
const nftContract = await NFTContract.deploy();

// 4. Deploy GameContract
const gameContract = await GameContract.deploy(
    nftContract.address,
    vrfConsumer.address
);

// 5. Transfer ownerships
await nftContract.transferOwnership(gameContract.address);
await vrfConsumer.transferOwnership(gameContract.address);

// 6. Set backend address (use your test account)
await gameContract.setBackendAddress("0xYourBackendAddress");
```

### 5. Testing Flow

#### Test 1: Claim Starter Entity
```javascript
// Call claimStarterEntity from a user account
await nftContract.claimStarterEntity();

// Check the minted entity
const tokens = await nftContract.getTokensByOwner(userAddress);
const entity = await nftContract.getEntity(tokens[0]);
console.log("Starter entity:", entity);
```

#### Test 2: Request Merge
```javascript
// Mint another starter for testing (or claim from different account)
// Then request merge
await gameContract.requestMerge(1, 2); // Assuming token IDs 1 and 2

// Check pending requests
const pending = await gameContract.getPendingRequests(userAddress);
console.log("Pending requests:", pending);
```

#### Test 3: Complete Merge
```javascript
// Get the request ID from the event or pending requests
const requestId = pending[0];

// Complete merge (as backend address)
await gameContract.completeMerge(
    requestId,
    "Hybrid Entity Name",
    "ipfs://QmSomeImageHash"
);

// Check the new entity
const newTokens = await nftContract.getTokensByOwner(userAddress);
const hybridEntity = await nftContract.getEntity(newTokens[newTokens.length - 1]);
console.log("New hybrid entity:", hybridEntity);
```

### 6. Testing Events

```javascript
// Listen for events in Remix console
gameContract.on("MergeRequested", (player, entity1Id, entity2Id, requestId) => {
    console.log("Merge Requested:", {
        player,
        entity1Id: entity1Id.toString(),
        entity2Id: entity2Id.toString(),
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

For production deployment:

```javascript
// Mainnet/Testnet VRF parameters
const VRF_COORDINATOR = "0x271682DEB8C4E0901D1a1550aD2e64D568E69909"; // Sepolia
const KEY_HASH = "0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef"; // Sepolia
const SUBSCRIPTION_ID = "your_subscription_id";

// Deploy with real VRF parameters
const vrfConsumer = await ChainlinkVRFConsumer.deploy(
    VRF_COORDINATOR,
    SUBSCRIPTION_ID,
    KEY_HASH
);
```

### 2. Security Considerations

- **Access Control**: Ensure only authorized backend can call `completeMerge`
- **Rate Limiting**: Implement cooldowns and request limits
- **Input Validation**: Validate all parameters in backend before calling contracts
- **Error Handling**: Implement robust error handling for failed transactions
- **Monitoring**: Set up monitoring for contract events and failed operations

### 3. Gas Optimization

- **Batch Operations**: Group multiple operations where possible
- **Gas Price Management**: Implement dynamic gas pricing
- **Transaction Queuing**: Use a transaction queue for high-volume periods

### 4. Scalability

- **Database Integration**: Use PostgreSQL/MongoDB to cache contract data
- **Caching**: Implement Redis for frequently accessed data
- **Load Balancing**: Use multiple backend instances
- **WebSocket Support**: Real-time updates for frontend

### 5. Monitoring and Analytics

```javascript
// Example monitoring setup
const contractMonitor = {
    trackMergeRequests: async () => {
        const filter = gameContract.filters.MergeRequested();
        const events = await gameContract.queryFilter(filter, -1000); // Last 1000 blocks
        
        // Store in analytics database
        for (const event of events) {
            await analytics.recordMergeRequest({
                player: event.args.player,
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
    }
};
```

This implementation guide provides a complete foundation for building a backend service that integrates with the HybridHaven smart contracts and comprehensive testing procedures using Remix IDE.