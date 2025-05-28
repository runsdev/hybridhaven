# HybridHaven 🎮

**Discover. Merge. Evolve.**

HybridHaven is a Web3 NFT game where players can merge entities to create unique hybrid creatures using blockchain technology, AI-generated images, and verifiable randomness.

## Features

- 🔗 **Wallet Connection**: Connect with MetaMask and other Web3 wallets
- 🎁 **Starter Collection**: Claim your complete starter collection (35 entities) to begin playing
- ⚡ **Entity Merging**: Combine two entities to create unique hybrids
- 🎲 **Verifiable Randomness**: Uses Chainlink VRF for provably fair rarity generation
- 🤖 **AI-Generated Images**: Google Gemini creates unique hybrid creature images
- 📦 **IPFS Storage**: Decentralized storage for images and metadata
- 🏆 **Rarity System**: 5-star rarity system with different probabilities

## Architecture

This project implements the "alt: direct approach from backend" architecture where:

- Frontend connects to Next.js backend API
- Backend handles smart contract interactions
- AI image generation occurs server-side
- IPFS uploads managed by backend

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, ethers.js
- **Blockchain**: Ethereum (Sepolia testnet), Solidity smart contracts
- **Oracles**: Chainlink VRF for randomness
- **AI**: Google Gemini for image generation
- **Storage**: IPFS with Pinata pinning service

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- MetaMask or another Web3 wallet
- Sepolia testnet ETH for transactions

### Installation

1. **Clone and install dependencies**:

```bash
git clone <repository-url>
cd fullstack
npm install
```

2. **Environment Setup**:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Blockchain Configuration (deploy contracts first using smart-contract folder)
NEXT_PUBLIC_GAME_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_VRF_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY

# AI and Storage Services
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
PINATA_API_KEY=your_pinata_api_key_here
PINATA_SECRET_API_KEY=your_pinata_secret_key_here

# Backend Service Configuration
BACKEND_PRIVATE_KEY=your_backend_wallet_private_key_here
```

3. **Deploy Smart Contracts** (from smart-contract folder):

```bash
cd ../smart-contract
npm install
npx hardhat compile
npx hardhat run scripts/deploy.ts --network sepolia
```

4. **Run the development server**:

```bash
cd ../fullstack
npm run dev
```

5. **Open [http://localhost:3000](http://localhost:3000)** in your browser

## Smart Contracts

The game uses three main smart contracts located in `../smart-contract/contracts/`:

### NFTContract.sol

- Manages entity NFTs and metadata
- Handles starter collection claims (35 entities automatically minted)
- Stores entity relationships and rarity
- ERC721 compliant with URI storage

### GameContract.sol

- Manages merge requests and cooldowns
- Integrates with Chainlink VRF for randomness
- Handles game logic and player state
- Configurable merge cooldown (default 5 minutes)

### ChainlinkVRFConsumer.sol

- Provides verifiable randomness for merges
- Ensures fair rarity distribution
- Integrates with Chainlink VRF v2.5
- Authorization system for game contract calls

## Game Flow

1. **Connect Wallet**: Players connect their MetaMask wallet
2. **Claim Starter Collection**: Get complete starter collection (35 entities) automatically
3. **Select Entities**: Choose two entities from your collection
4. **Request Merge**: Submit merge request to blockchain (triggers VRF request)
5. **VRF Randomness**: Chainlink VRF provides random number for rarity calculation
6. **AI Generation**: Backend monitors VRF fulfillment and generates hybrid name and image
7. **IPFS Upload**: Image and metadata uploaded to IPFS
8. **NFT Mint**: New hybrid NFT minted to player's wallet

## Rarity System

The rarity is calculated on-chain using VRF randomness:

- ⭐ **1-Star (Common)**: 20% chance (roll > 7000)
- ⭐⭐ **2-Star (Uncommon)**: 30% chance (roll 5001-7000)
- ⭐⭐⭐ **3-Star (Rare)**: 40% chance (roll 1001-5000)
- ⭐⭐⭐⭐ **4-Star (Epic)**: 9.9% chance (roll 11-1000)
- ⭐⭐⭐⭐⭐ **5-Star (Legendary)**: 0.1% chance (roll 1-10)

## API Endpoints

### `POST /api/game/claim-starter`

Claims the complete starter collection for new players (35 entities).

**Request:**
```json
{
  "address": "0x..."
}
```

### `GET /api/game/entities?address=<wallet>`

Fetches player's entities and game state.

### `POST /api/game/merge`

Prepares merge validation (actual merge initiated via wallet).

**Request:**
```json
{
  "address": "0x...",
  "entity1Id": 1,
  "entity2Id": 2
}
```

### `PUT /api/game/merge`

Completes merge after VRF fulfillment (backend monitoring).

## Starter Entities

The complete starter collection includes 35 unique entities across categories:

- **Elements**: Fire, Water, Earth, Air, Light, Shadow, Metal, Crystal, Lightning, Ice
- **Nature**: Plant, Beast, Aquatic, Avian, Insect
- **Cosmic**: Stellar, Lunar, Solar, Void, Nebula
- **Environments**: Forest, Desert, Ocean, Mountain, Swamp
- **Animals**: Wolf, Tiger, Eagle, Bear, Fox
- **Plants**: Oak, Rose, Cactus, Lotus, Fern

## Development

### Project Structure

```
fullstack/
├── app/                    # Next.js app directory
│   ├── api/game/          # Backend API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main game interface
├── hooks/                 # React hooks
├── lib/                   # Utilities and services
├── types/                 # TypeScript type definitions
└── public/               # Static assets
```

### Key Files

- `/hooks/useGame.ts` - Game state management hook
- `/lib/contracts.ts` - Web3 contract interactions (updated for actual contracts)
- `/lib/ipfs.ts` - IPFS upload utilities
- `/types/game.ts` - TypeScript type definitions

## Deployment

### Smart Contracts

1. Deploy contracts to Sepolia testnet using Hardhat from `../smart-contract/`
2. Update contract addresses in environment variables
3. Fund VRF subscription and add Game contract as consumer
4. Configure backend address using `gameContract.setBackendAddress()`

### Frontend/Backend

1. Deploy to Vercel, Netlify, or similar platform
2. Configure environment variables in deployment platform
3. Ensure API keys are properly secured

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Security Considerations

- Private keys should never be exposed in frontend code
- API keys should be stored securely in environment variables
- Smart contracts include proper access controls and ownership patterns
- IPFS content should be validated before displaying

## Troubleshooting

### Common Issues

**"MetaMask not installed"**
- Install MetaMask browser extension
- Refresh the page after installation

**"Contract not initialized"**
- Check that contract addresses are correct in `.env.local`
- Verify you're connected to Sepolia testnet
- Ensure contracts are deployed and addresses match

**"Transaction failed"**
- Ensure you have enough Sepolia ETH for gas
- Check if merge cooldown is active (5 minutes by default)
- Verify entity ownership

**"Failed to generate image"**
- Verify Google AI API key is valid
- Check API quota limits

**"Already claimed starter entities"**
- Each address can only claim the starter collection once
- Check if you've already claimed using `hasStarterEntity()`

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Chainlink for VRF oracle services
- Google for Gemini AI integration
- Pinata for IPFS pinning services
- OpenZeppelin for smart contract libraries

---

Built with ❤️ for the Web3 gaming community
