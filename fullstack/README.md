# HybridHaven

**Discover. Merge. Evolve.**

HybridHaven is a Web3 NFT game where players merge virtual starter entities to create unique hybrid creature NFTs using blockchain technology, AI-generated images, and verifiable randomness.

## Features

- 🔗 **Wallet Connection**: Connect with MetaMask and other Web3 wallets
- 🎁 **Virtual Starter Collection**: Access 35 virtual starter entities instantly upon connection
- ⚡ **Entity Merging**: Combine any two entities (starters or hybrids) to create unique NFTs
- 🎲 **Verifiable Randomness**: Uses Chainlink VRF for provably fair rarity generation
- 🤖 **AI-Generated Images**: Google Gemini creates unique hybrid creature images and names
- 📦 **IPFS Storage**: Decentralized storage for images and metadata
- 🏆 **Rarity System**: 5-star rarity system with different probabilities
- 🔄 **Auto-Finalization**: Automatic processing of merge requests when VRF completes
- 🦊 **MetaMask Integration**: Auto-add newly created NFTs to your wallet

## How It Works

### Virtual Starter Entities

- Players instantly get access to 35 virtual starter entities upon wallet connection
- These are **not actual NFTs** - they're virtual entities that exist only in the game interface
- Starters can be merged with each other or with real hybrid NFTs
- No claiming process required - immediate access to full starter collection

### Real Hybrid NFTs

- When any merge is completed, a **real NFT is minted** on the blockchain
- Hybrid NFTs have AI-generated images, names, and metadata
- Each hybrid shows its parent entities and creation timestamp
- Hybrids can be merged with other entities to create new hybrids

## Architecture

This project implements a hybrid approach where:

- Frontend connects directly to smart contracts for merge requests
- Backend monitors blockchain events and processes VRF fulfillment
- AI image generation and IPFS uploads occur server-side
- Auto-finalization system handles merge completion automatically

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, ethers.js
- **Blockchain**: Ethereum (Sepolia testnet), Solidity smart contracts
- **Oracles**: Chainlink VRF v2.5 for randomness
- **AI**: Google Gemini Flash for image and name generation
- **Storage**: IPFS with Pinata pinning service

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- MetaMask or another Web3 wallet
- Sepolia testnet ETH for transactions (0.0001 ETH + gas per merge)

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
# Blockchain Configuration
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

The game uses three main smart contracts:

### GameContract.sol

- Manages merge requests and VRF randomness requests
- Enforces 5-minute cooldown between merges per player
- Requires 0.0001 ETH payment per merge (sent to contract owner)
- Stores merge request data and validates entity ownership
- Integrates with Chainlink VRF for random rarity generation

### NFTContract.sol

- ERC721 compliant NFT contract for hybrid entities
- Stores entity metadata, rarity, and parent information
- Only mints hybrid entities (starters are virtual)
- Supports metadata URI updates and OpenSea compatibility
- Includes entity relationship tracking

### ChainlinkVRFConsumer.sol

- Provides verifiable randomness for merge rarity calculation
- Uses Chainlink VRF v2.5 for secure random number generation
- Managed by GameContract for authorized requests
- Returns randomness results for merge completion

## Game Flow

1. **Connect Wallet**: Players connect MetaMask to Sepolia testnet
2. **Instant Access**: Immediate access to 35 virtual starter entities
3. **Select Entities**: Choose any two entities (starters or hybrids) to merge
4. **Pay & Request**: Pay 0.0001 ETH + gas to submit merge request
5. **VRF Processing**: Chainlink VRF generates random number (automatic)
6. **Auto-Finalization**: Backend detects VRF completion and processes merge
7. **AI Generation**: Google Gemini generates hybrid name and image
8. **IPFS Upload**: Metadata and image uploaded to IPFS
9. **NFT Mint**: New hybrid NFT minted to player's wallet
10. **Auto-Add**: NFT automatically added to MetaMask

## Rarity System

Rarity is calculated on-chain using Chainlink VRF randomness (range 1-10000):

- ⭐ **1-Star (Common)**: 20% chance (7001-10000)
- ⭐⭐ **2-Star (Uncommon)**: 30% chance (5001-7000)
- ⭐⭐⭐ **3-Star (Rare)**: 40% chance (1001-5000)
- ⭐⭐⭐⭐ **4-Star (Epic)**: 9.9% chance (11-1000)
- ⭐⭐⭐⭐⭐ **5-Star (Legendary)**: 0.1% chance (1-10)

## Payment Structure

- **Merge Cost**: 0.0001 ETH per merge (fixed)
- **Gas Fees**: Variable based on network congestion
- **Payment Destination**: Contract owner address
- **No Refunds**: Failed merges due to cooldown/ownership issues

## API Endpoints

### `GET /api/game/entities?address=<wallet>`

Fetches player's entities (virtual starters + real hybrids) and game state.

**Response:**

```json
{
  "success": true,
  "entities": [
    {
      "tokenId": 0,
      "name": "Fire",
      "isStarter": true,
      "rarity": 1,
      "imageURI": "",
      "description": "A starter entity: Fire"
    },
    {
      "tokenId": 123,
      "name": "Flamewing Phoenix",
      "isStarter": false,
      "rarity": 4,
      "imageURI": "ipfs://...",
      "parent1": "Fire",
      "parent2": "Eagle"
    }
  ],
  "pendingRequests": ["456"],
  "canMerge": true
}
```

### `POST /api/game/merge`

Validates merge preparation (actual merge initiated via smart contract).

**Request:**

```json
{
  "address": "0x...",
  "entity1": {
    "name": "Fire",
    "isStarter": true,
    "tokenId": 0
  },
  "entity2": {
    "name": "Eagle",
    "isStarter": true,
    "tokenId": 0
  }
}
```

### `PATCH /api/game/merge`

Finalizes merge after VRF fulfillment (called by auto-finalization system).

### `GET /api/metadata/[tokenId]`

Returns OpenSea-compatible metadata for hybrid NFTs.

## Starter Entities Collection

Players get instant access to 35 virtual starter entities:

**Elements**: Fire, Water, Earth, Air, Light, Shadow, Metal, Crystal, Lightning, Ice

**Nature**: Plant, Beast, Aquatic, Avian, Insect

**Cosmic**: Stellar, Lunar, Solar, Void, Nebula

**Environments**: Forest, Desert, Ocean, Mountain, Swamp

**Animals**: Wolf, Tiger, Eagle, Bear, Fox

**Plants**: Oak, Rose, Cactus, Lotus, Fern

## Development

### Project Structure

```
fullstack/
├── app/                    # Next.js app directory
│   ├── api/game/          # Backend API routes
│   │   ├── entities/      # Player data fetching
│   │   ├── merge/         # Merge processing
│   │   └── metadata/      # NFT metadata
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main game interface
├── components/            # React components
│   ├── EntityCard.tsx     # Entity display component
│   ├── EntityDetailsModal.tsx  # Entity details popup
│   └── PendingMergeList.tsx     # Pending merges display
├── hooks/                 # React hooks
│   └── useGame.ts         # Main game state hook
├── lib/                   # Utilities and services
│   ├── contracts.ts       # Web3 contract interactions
│   ├── ipfs.ts           # IPFS utilities
│   └── utils.ts          # Helper functions
├── types/                 # TypeScript definitions
│   └── game.ts           # Game type definitions
└── references/           # Documentation and contracts
```

### Key Features Implementation

- **Virtual Starters**: No blockchain storage, instant access
- **Auto-Finalization**: Background monitoring of VRF completion
- **Hatch Timers**: Visual feedback during merge processing
- **Error Handling**: Comprehensive error messages and recovery
- **MetaMask Integration**: Automatic NFT addition to wallet

## Deployment

### Smart Contracts

1. Deploy contracts to Sepolia testnet using Hardhat
2. Fund Chainlink VRF subscription
3. Add GameContract as VRF consumer
4. Configure backend address: `gameContract.setBackendAddress(backendWallet)`
5. Update contract addresses in environment variables

### Frontend/Backend

1. Deploy to Vercel, Netlify, or similar platform
2. Configure environment variables securely
3. Ensure backend wallet has sufficient ETH for gas fees
4. Test all integration points before production

## Security Considerations

- **Private Keys**: Backend private key secured in environment variables only
- **Payment Validation**: Smart contract enforces payment requirements
- **Ownership Verification**: Contract validates entity ownership before merging
- **Cooldown Enforcement**: 5-minute cooldown prevents spam/abuse
- **VRF Security**: Chainlink VRF ensures unpredictable randomness
- **IPFS Validation**: Metadata validation before displaying content

## Troubleshooting

### Common Issues

**"Contract not initialized"**

- Verify contract addresses in `.env.local` are correct
- Ensure you're connected to Sepolia testnet
- Check that contracts are deployed and accessible

**"Merge cooldown active"**

- Wait 5 minutes between merge requests
- Cooldown is per-address, not per entity
- Check `timeUntilNextMerge()` for remaining time

**"Insufficient funds for gas"**

- Ensure wallet has enough Sepolia ETH
- Merges require 0.0001 ETH + gas fees
- Get Sepolia ETH from faucets

**"Entity not found or not owned"**

- For hybrid entities, verify you own the NFT
- Starter entities are always accessible
- Check wallet connection and network

**"VRF randomness not yet fulfilled"**

- VRF requests take 1-2 minutes to complete
- Auto-finalization will process when ready
- Do not manually retry during processing

**"Failed to generate image"**

- Verify Google AI API key is valid and has quota
- Check Pinata API keys for IPFS uploads
- Backend logs will show specific AI/IPFS errors

**"Transaction reverted"**

- Check if you're trying to merge an entity with itself
- Verify you have permission to use both entities
- Ensure payment amount is exactly 0.0001 ETH

### Network Issues

**"Wrong network"**

- Switch MetaMask to Sepolia testnet
- Add Sepolia network if not present
- Verify RPC URL is working

**"MetaMask not connected"**

- Install MetaMask browser extension
- Approve connection request
- Refresh page after installation

## Performance Notes

- **VRF Timing**: 30 seconds to 2 minutes for randomness
- **AI Generation**: 10-30 seconds for image creation
- **IPFS Upload**: 5-15 seconds for metadata storage
- **Total Merge Time**: Typically 1-3 minutes end-to-end

## License

This project is licensed under the MIT License.

## Acknowledgments

- **Chainlink** for VRF oracle services and reliable randomness
- **Google** for Gemini AI integration and creative image generation
- **Pinata** for IPFS pinning services and reliable storage
- **OpenZeppelin** for secure smart contract libraries
- **Ethereum** for decentralized blockchain infrastructure

---

**Ready to start your hybrid creature collection?** 🚀

Connect your wallet and begin merging! Each combination creates a unique NFT with AI-generated artwork.
