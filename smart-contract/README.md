# Hybrid Haven Contracts

## Overview

Hybrid Haven is a decentralized NFT game that allows players to connect their wallets, select entities, and merge them to create unique NFTs. The game utilizes verifiable randomness to ensure fair gameplay and employs AI-generated images for the NFTs.

## Project Structure

- **contracts/**: Contains all the smart contracts for the game.
  - **core/**: Core game logic and NFT management.
    - `GameContract.sol`: Manages game interactions and entity merging.
    - `NFTContract.sol`: Handles minting and management of NFTs.
    - **interfaces/**: Defines interfaces for the core contracts.
      - `IGameContract.sol`: Interface for the GameContract.
      - `INFTContract.sol`: Interface for the NFTContract.
  - **libraries/**: Utility functions and libraries.
    - `GameLibrary.sol`: Contains utility functions for game state management.
    - `RandomnessLibrary.sol`: Functions for generating random numbers.
  - **oracle/**: Chainlink VRF consumer contract.
    - `ChainlinkVRFConsumer.sol`: Requests and handles verifiable randomness.

- **scripts/**: Deployment and verification scripts.
  - `deploy.ts`: Deploys the smart contracts to the blockchain.
  - `verify.ts`: Verifies the deployed contracts on a blockchain explorer.

- **test/**: Contains test cases for the smart contracts.
  - `GameContract.test.ts`: Tests for the GameContract functionality.
  - `NFTContract.test.ts`: Tests for the NFTContract functionality.

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd hybrid-haven-contracts
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Compile the contracts:
   ```
   npx hardhat compile
   ```

## Usage

To deploy the contracts, run:
```
npx hardhat run scripts/deploy.ts --network <network-name>
```

To verify the contracts, run:
```
npx hardhat run scripts/verify.ts --network <network-name>
```

## Testing

To run the tests, execute:
```
npx hardhat test
```

## License

This project is licensed under the MIT License. See the LICENSE file for details.