# HybridHaven Smart Contracts

## Overview

HybridHaven is a decentralized NFT game that allows players to connect their wallets, merge entities to create unique hybrid NFTs with verifiable randomness. The game utilizes Chainlink VRF for fair randomness, AI-generated images, and IPFS for metadata storage.

### Game Flow
1. **Connect Wallet** - Players connect their Web3 wallet
2. **Claim Starter** - New players receive a free starter entity NFT
3. **Select & Merge** - Choose two entities to merge together
4. **Randomized Rarity** - Chainlink VRF determines the rarity of the new hybrid
5. **AI Generation** - Backend generates unique hybrid images and metadata
6. **Mint NFT** - New hybrid entity is minted as an NFT
7. **Repeat** - Continue merging to create rarer and more unique entities

## Architecture

The system consists of three main smart contracts:

### Core Contracts

- **`GameContract.sol`** - Main game logic and merge mechanics
  - Manages merge requests and game state
  - Integrates with Chainlink VRF for randomness
  - Handles backend authorization for completing merges

- **`NFTContract.sol`** - ERC-721 NFT management
  - Mints starter and hybrid entities
  - Manages entity metadata and IPFS integration
  - OpenSea compatible with proper metadata standards

- **`ChainlinkVRFConsumer.sol`** - Verifiable randomness oracle
  - Requests randomness from Chainlink VRF v2
  - Provides verifiable random numbers for merge outcomes
  - Configurable for different networks (Sepolia, Mainnet)

### Additional Contracts

- **`MockVRFConsumer.sol`** - Mock VRF for testing environments

## Project Structure

```
contracts/
├── GameContract.sol           # Main game logic
├── NFTContract.sol           # ERC-721 NFT contract
└── oracle/
    ├── ChainlinkVRFConsumer.sol    # Real VRF integration
    └── MockVRFConsumer.sol         # Testing VRF mock

scripts/
├── deploy.ts                 # Complete deployment (all contracts)
├── deploy-vrf.ts            # Deploy VRF Consumer only
├── deploy-nft.ts            # Deploy NFT Contract only
├── deploy-game.ts           # Deploy Game Contract only
├── deploy-mock-vrf.ts       # Deploy mock VRF for testing
├── configure.ts             # Configure deployed contracts
├── verify.ts                # Verify contracts on block explorer
├── game-flow.ts             # Demo complete game flow
├── check-request.ts         # Check VRF request status
├── burn-nft.ts              # Burn NFTs utility
├── set-backend-address.ts   # Set authorized backend
└── authorize-*.ts           # Authorization utilities

test/
└── HybridHaven.test.ts      # Comprehensive test suite

deployments/
├── sepolia-latest.json      # Latest deployment addresses
└── sepolia-*.json           # Timestamped deployment history
```

## Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd hybrid-haven-contracts
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Install additional dependencies:**
   ```bash
   npm install @openzeppelin/contracts@^4.9.0 @chainlink/contracts@^1.4.0
   ```

4. **Create environment file:**
   ```bash
   cp .env.example .env
   # Add your private keys and API keys
   ```

5. **Compile contracts:**
   ```bash
   npx hardhat compile
   ```

## Deployment

### Complete Deployment (All Contracts)

Deploy all contracts with proper configuration:
```bash
# Local development
npx hardhat run scripts/deploy.ts --network localhost

# Sepolia testnet
npx hardhat run scripts/deploy.ts --network sepolia
```

### Individual Contract Deployment

Deploy contracts individually for more control:

```bash
# 1. Deploy VRF Consumer first
npx hardhat run scripts/deploy-vrf.ts --network sepolia

# 2. Deploy NFT Contract
npx hardhat run scripts/deploy-nft.ts --network sepolia

# 3. Deploy Game Contract (requires VRF and NFT)
npx hardhat run scripts/deploy-game.ts --network sepolia

# 4. Configure all contracts
npx hardhat run scripts/configure.ts --network sepolia
```

### Testing Deployment

For local testing without real Chainlink VRF:
```bash
# Deploy with mock VRF
npx hardhat run scripts/deploy-mock-vrf.ts --network localhost
```

## Configuration

After deployment, configure the contracts:

```bash
# Auto-configure all contract references
npx hardhat run scripts/configure.ts --network sepolia

# Set backend address manually
npx hardhat run scripts/set-backend-address.ts --network sepolia
```

## Testing

### Run Test Suite
```bash
# Run all tests
npx hardhat test

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Run specific test file
npx hardhat test test/HybridHaven.test.ts
```

### Game Flow Testing
```bash
# Test complete game flow on deployed contracts
npx hardhat run scripts/game-flow.ts --network sepolia
```

### VRF Testing
```bash
# Check VRF configuration and test requests
npx hardhat run scripts/check-vrf.ts --network sepolia

# Test VRF request with detailed error analysis
npx hardhat run scripts/test-vrf-detailed.ts --network sepolia
```

## Verification

Verify deployed contracts on block explorers:

```bash
# Verify all contracts
npx hardhat run scripts/verify.ts --network sepolia

# Individual verification (automatic after deployment)
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

## Usage Examples

### Basic Game Operations

```javascript
// Get deployed contract addresses
const deployment = require('./deployments/sepolia-latest.json');

// Connect to contracts
const gameContract = await ethers.getContractAt("GameContract", deployment.gameContract);
const nftContract = await ethers.getContractAt("NFTContract", deployment.nftContract);

// Claim starter entity (free for new players)
await nftContract.claimStarterEntity();

// Get player's entities
const tokens = await nftContract.getTokensByOwner(playerAddress);
const entities = await Promise.all(
    tokens.map(id => nftContract.getEntity(id))
);

// Request merge (requires two entities)
await gameContract.requestMerge(
    entityId1, 
    entityId2, 
    "New Entity Name",
    "hybrid", 
    true,     
    true,     
    0,        
    0        
);

// Check pending merge requests
const pending = await gameContract.getPendingRequests(playerAddress);
```

### Backend Integration

The game requires a backend service to:
1. Monitor merge request events
2. Generate AI images and metadata
3. Complete merges after VRF fulfillment

See `IMPLEMENTATION_GUIDE.md` for complete backend setup instructions.

## Environment Variables

Create a `.env` file with:

```env
# Wallet
PRIVATE_KEY=your_private_key_here

# RPC URLs
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_key
MAINNET_RPC_URL=https://mainnet.infura.io/v3/your_key

# Chainlink VRF (Sepolia)
VRF_SUBSCRIPTION_ID=your_subscription_id

# Block Explorer API Keys
ETHERSCAN_API_KEY=your_etherscan_api_key

# Backend
BACKEND_PRIVATE_KEY=your_backend_private_key
```

## Network Support

### Sepolia Testnet (Recommended for Testing)
- Full Chainlink VRF integration
- Contract verification supported
- Free testnet ETH from faucets

### Localhost/Hardhat
- Mock VRF for development
- Fast testing and debugging
- No external dependencies

### Mainnet
- Production deployment ready
- Requires real LINK tokens for VRF
- Higher gas costs

## Key Features

- **Verifiable Randomness**: Chainlink VRF ensures fair and transparent merge outcomes
- **AI-Generated Content**: Backend integration for unique hybrid entity creation
- **IPFS Storage**: Decentralized metadata and image storage
- **OpenSea Compatible**: Full ERC-721 compliance with metadata standards
- **Modular Design**: Individual contract deployment and configuration
- **Comprehensive Testing**: Full test suite with mock contracts
- **Multi-Network**: Support for local, testnet, and mainnet deployment

## Documentation

- **`IMPLEMENTATION_GUIDE.md`** - Complete backend implementation guide
- **`contracts/`** - Detailed contract documentation
- **`test/`** - Test examples and patterns
- **`scripts/`** - Deployment and utility script documentation

## Troubleshooting

### Common Issues

1. **VRF Subscription**: Ensure Chainlink VRF subscription is funded with LINK
2. **Gas Limits**: Some operations require higher gas limits
3. **Network Configuration**: Verify RPC URLs and network settings
4. **Contract Verification**: May require API keys and proper network configuration

### Utilities

```bash
# Check deployment status
npx hardhat run scripts/check-request.ts --network sepolia

# Check token URIs and metadata
npx hardhat run scripts/check-token-uri.ts --network sepolia

# Burn NFTs (cleanup utility)
npx hardhat run scripts/burn-nft.ts --network sepolia
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## Security

- Contracts use OpenZeppelin standards for security
- Access control through role-based permissions
- VRF integration prevents manipulation of randomness
- Comprehensive test coverage for edge cases

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Links

- [Live](https://hybridhaven.runs.my.id)
- [Technical Documentation](./IMPLEMENTATION_GUIDE.md)
- [Contract Addresses](./deployments/)
- [Chainlink VRF Documentation](https://docs.chain.link/vrf)