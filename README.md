# HybridHaven

**Discover. Merge. Evolve.**

A fully implemented Web3 NFT game where players merge virtual starter entities to create unique hybrid creature NFTs using blockchain technology, AI-generated images, and verifiable randomness.

## 🌟 Live Demo

🎮 **Play Now**: [https://hybridhaven.runs.my.id](https://hybridhaven.runs.my.id)  
🌊 **OpenSea Collection**: [HybridHaven on OpenSea](https://testnets.opensea.io/collection/hybridhaven)  
📂 **Source Code**: [GitHub Repository](https://github.com/runsdev/hybridhaven)

## 🚀 What is HybridHaven?

HybridHaven is a complete Web3 gaming platform that combines:
- **Instant Virtual Starters**: 35 virtual entities available immediately upon wallet connection
- **Real NFT Creation**: Merge any two entities to mint unique hybrid NFTs on Ethereum
- **AI-Powered Generation**: Google Gemini creates unique images and descriptions for each hybrid
- **Verifiable Randomness**: Chainlink VRF ensures fair and unpredictable rarity outcomes
- **Decentralized Storage**: IPFS stores all NFT metadata and images permanently

## ✨ Key Features

- 🔗 **Wallet Connection**: Connect with MetaMask and other Web3 wallets
- 🎁 **Virtual Starter Collection**: Access 35 virtual starter entities instantly
- ⚡ **Entity Merging**: Combine any two entities (starters or hybrids) to create unique NFTs
- 🎲 **Verifiable Randomness**: Chainlink VRF for provably fair rarity generation (1-5 stars)
- 🤖 **AI-Generated Content**: Google Gemini creates unique hybrid creature images and names
- 📦 **IPFS Storage**: Decentralized storage for images and metadata via Pinata
- 🔄 **Auto-Finalization**: Automatic processing of merge requests when VRF completes
- 🦊 **MetaMask Integration**: Auto-add newly created NFTs to your wallet
- 🏆 **OpenSea Compatible**: Full ERC-721 compliance with marketplace support

## 🏗️ Architecture

### Project Structure

```
web3-project/
├── fullstack/           # Next.js frontend + backend API
├── smart-contract/      # Solidity contracts + deployment scripts
├── proposal/           # Original project proposal (Slidev)
└── report/            # Final implementation report (Slidev)
```

### System Components

1. **Frontend Application** (Next.js 15 + TypeScript)
   - Real-time game interface with entity management
   - Web3 wallet integration and transaction handling
   - Auto-updating UI with merge progress tracking

2. **Backend Services** (Next.js API Routes)
   - AI image generation via Google Gemini
   - IPFS metadata upload via Pinata
   - Blockchain event monitoring and auto-finalization

3. **Smart Contracts** (Solidity)
   - `GameContract.sol`: Core game logic and merge mechanics
   - `NFTContract.sol`: ERC-721 NFT management
   - `ChainlinkVRFConsumer.sol`: Verifiable randomness oracle

4. **External Integrations**
   - **Chainlink VRF v2.5**: Secure randomness for rarity calculation
   - **Google Gemini AI**: Dynamic image and description generation
   - **IPFS + Pinata**: Decentralized metadata storage

## 🎮 How to Play

1. **Connect Wallet**: Connect MetaMask to Sepolia testnet
2. **Instant Access**: Get immediate access to 35 virtual starter entities
3. **Select Entities**: Choose any two entities (starters or hybrids) to merge
4. **Pay & Request**: Pay 0.0001 ETH + gas to submit merge request
5. **Wait for Magic**: Chainlink VRF generates randomness, AI creates your hybrid
6. **Receive NFT**: New hybrid NFT is minted to your wallet automatically

## 💎 Rarity System

Rarity is calculated on-chain using Chainlink VRF randomness:

- ⭐ **1-Star (Common)**: 20% chance
- ⭐⭐ **2-Star (Uncommon)**: 30% chance  
- ⭐⭐⭐ **3-Star (Rare)**: 40% chance
- ⭐⭐⭐⭐ **4-Star (Epic)**: 9.9% chance
- ⭐⭐⭐⭐⭐ **5-Star (Legendary)**: 0.1% chance

## 🧬 Starter Entities Collection

Players get instant access to 35 virtual starter entities:

**Elements**: Fire, Water, Earth, Air, Light, Shadow, Metal, Crystal, Lightning, Ice  
**Nature**: Plant, Beast, Aquatic, Avian, Insect  
**Cosmic**: Stellar, Lunar, Solar, Void, Nebula  
**Environments**: Forest, Desert, Ocean, Mountain, Swamp  
**Animals**: Wolf, Tiger, Eagle, Bear, Fox  
**Plants**: Oak, Rose, Cactus, Lotus, Fern

## 🛠️ Tech Stack

### Frontend & Backend
- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS with custom animations
- **Web3**: ethers.js for blockchain interactions
- **State Management**: React hooks with real-time updates

### Blockchain & Infrastructure
- **Network**: Ethereum Sepolia Testnet
- **Smart Contracts**: Solidity with OpenZeppelin standards
- **Randomness**: Chainlink VRF v2.5
- **AI**: Google Gemini Flash 2.0
- **Storage**: IPFS with Pinata pinning service

### Development Tools
- **Smart Contracts**: Hardhat with TypeScript
- **Testing**: Comprehensive test suite with Mocha/Chai
- **Deployment**: Automated scripts with verification
- **Documentation**: Slidev for interactive presentations

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- MetaMask or Web3 wallet
- Sepolia testnet ETH (get from faucets)

### Run Locally

1. **Clone repository**:
   ```bash
   git clone https://github.com/runsdev/hybridhaven
   cd hybridhaven
   ```

2. **Setup frontend**:
   ```bash
   cd fullstack
   npm install
   cp .env.example .env.local
   # Configure environment variables
   npm run dev
   ```

3. **Deploy contracts** (optional):
   ```bash
   cd smart-contract
   npm install
   npx hardhat compile
   npx hardhat run scripts/deploy.ts --network sepolia
   ```

### Environment Configuration

```env
# Frontend
NEXT_PUBLIC_GAME_CONTRACT_ADDRESS=0x3b20dB5784862D3a615e089923b6aD1d6e65A28f
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0x906834aeC6B6F486F306D66DEDd5925B30cfEB3c
NEXT_PUBLIC_VRF_CONTRACT_ADDRESS=0x48796e7CFdf0ad487875891ad651c7d9562dBa43
NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY

# Backend Services
GOOGLE_AI_API_KEY=your_google_ai_api_key
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret_key
BACKEND_PRIVATE_KEY=your_backend_wallet_private_key
```

## 📝 Contract Addresses (Sepolia)

| Contract | Address | Verified |
|----------|---------|----------|
| GameContract | `0x3b20dB5784862D3a615e089923b6aD1d6e65A28f` | ✅ |
| NFTContract | `0x906834aeC6B6F486F306D66DEDd5925B30cfEB3c` | ✅ |
| VRFConsumer | `0x48796e7CFdf0ad487875891ad651c7d9562dBa43` | ✅ |

## 🧪 Testing

The project includes comprehensive testing:

```bash
cd smart-contract
npm test                    # Run all tests
REPORT_GAS=true npm test   # Test with gas reporting
```

Test coverage includes:
- Contract deployment and configuration
- Entity minting and management
- Merge request flow with VRF integration
- Access controls and security measures
- Error handling and edge cases

## 🔒 Security Features

- **Access Control**: Role-based permissions with OpenZeppelin
- **Payment Validation**: Smart contract enforces payment requirements
- **Ownership Verification**: Contract validates entity ownership before merging
- **Cooldown Protection**: 5-minute cooldown prevents spam/abuse
- **VRF Security**: Chainlink VRF ensures unpredictable randomness
- **Input Validation**: Comprehensive validation for all user inputs

## 💰 Economics

- **Merge Cost**: 0.0001 ETH per merge (fixed)
- **Gas Fees**: Variable based on network congestion
- **Payment Destination**: Contract owner address
- **No Refunds**: Failed merges due to cooldown/ownership issues

## 📚 Documentation

- [`fullstack/README.md`](./fullstack/README.md) - Complete frontend/backend guide
- [`smart-contract/README.md`](./smart-contract/README.md) - Smart contract documentation
- [`smart-contract/IMPLEMENTATION_GUIDE.md`](./smart-contract/IMPLEMENTATION_GUIDE.md) - Backend integration guide
- [`proposal/slides.md`](./proposal/slides.md) - Original project proposal
- [`report/slides.md`](./report/slides.md) - Final implementation report

## 🎯 Performance Metrics

- **VRF Timing**: 30 seconds to 2 minutes for randomness
- **AI Generation**: 10-30 seconds for image creation
- **IPFS Upload**: 5-15 seconds for metadata storage
- **Total Merge Time**: Typically 1-3 minutes end-to-end
- **Success Rate**: 100% completion rate for valid merges

## 🐛 Troubleshooting

Common issues and solutions:

- **"Contract not initialized"**: Verify contract addresses and network
- **"Merge cooldown active"**: Wait 5 minutes between merges
- **"Insufficient funds"**: Ensure wallet has 0.0001 ETH + gas
- **"Entity not found"**: Verify entity ownership and selection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Chainlink** for VRF oracle services and reliable randomness
- **Google** for Gemini AI integration and creative image generation
- **Pinata** for IPFS pinning services and reliable storage
- **OpenZeppelin** for secure smart contract libraries
- **Ethereum** for decentralized blockchain infrastructure

---

**Ready to start your hybrid creature collection?** 🚀

Connect your wallet and begin merging! Each combination creates a unique NFT with AI-generated artwork.
