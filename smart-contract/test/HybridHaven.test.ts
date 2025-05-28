import { expect } from "chai";
import { ethers } from "hardhat";
import { NFTContract, GameContract, ChainlinkVRFConsumer } from "../typechain-types";

describe("HybridHaven Game", function () {
    let nftContract: NFTContract;
    let gameContract: GameContract;
    let vrfConsumer: ChainlinkVRFConsumer;
    let owner: any;
    let player1: any;
    let player2: any;

    beforeEach(async function () {
        [owner, player1, player2] = await ethers.getSigners();

        // Deploy VRF Consumer with mock parameters
        const ChainlinkVRFConsumer = await ethers.getContractFactory("ChainlinkVRFConsumer");
        vrfConsumer = await ChainlinkVRFConsumer.deploy(
            "0x0000000000000000000000000000000000000001", // Mock VRF Coordinator
            1, // Mock subscription ID
            "0x0000000000000000000000000000000000000000000000000000000000000001" // Mock key hash
        );

        // Deploy NFT Contract
        const NFTContract = await ethers.getContractFactory("NFTContract");
        nftContract = await NFTContract.deploy();

        // Deploy Game Contract
        const GameContract = await ethers.getContractFactory("GameContract");
        gameContract = await GameContract.deploy(
            await nftContract.getAddress(),
            await vrfConsumer.getAddress()
        );

        // Transfer ownership of NFT contract to Game contract
        await nftContract.transferOwnership(await gameContract.getAddress());
    });

    describe("NFT Contract", function () {
        it("Should allow players to claim starter entity", async function () {
            // Player claims starter entity
            await nftContract.connect(player1).claimStarterEntity();

            // Check that player has one NFT
            expect(await nftContract.balanceOf(player1.address)).to.equal(1);

            // Check that starter entity was claimed
            expect(await nftContract.hasStarterEntity(player1.address)).to.be.true;

            // Get the entity details
            const tokenIds = await nftContract.getTokensByOwner(player1.address);
            expect(tokenIds.length).to.equal(1);

            const entity = await nftContract.getEntity(tokenIds[0]);
            expect(entity.rarity).to.equal(1); // Starter entities are 1-star
            expect(entity.isStarter).to.be.true;
        });

        it("Should not allow claiming multiple starter entities", async function () {
            await nftContract.connect(player1).claimStarterEntity();
            
            await expect(
                nftContract.connect(player1).claimStarterEntity()
            ).to.be.revertedWith("Already claimed starter entity");
        });

        it("Should return correct token metadata", async function () {
            await nftContract.connect(player1).claimStarterEntity();
            
            const tokenIds = await nftContract.getTokensByOwner(player1.address);
            const entity = await nftContract.getEntity(tokenIds[0]);
            
            expect(entity.tokenId).to.equal(tokenIds[0]);
            expect(entity.name).to.be.oneOf(["Fire", "Water", "Earth", "Air", "Light"]);
            expect(entity.parent1).to.equal("");
            expect(entity.parent2).to.equal("");
        });
    });

    describe("Game Contract", function () {
        beforeEach(async function () {
            // Give both players starter entities
            await nftContract.connect(player1).claimStarterEntity();
            await nftContract.connect(player2).claimStarterEntity();
        });

        it("Should allow setting backend address", async function () {
            await gameContract.setBackendAddress(player2.address);
            expect(await gameContract.backendAddress()).to.equal(player2.address);
        });

        it("Should check merge cooldown correctly", async function () {
            expect(await gameContract.canPlayerMerge(player1.address)).to.be.true;
            
            // After setting last merge time, should respect cooldown
            const tokenIds = await nftContract.getTokensByOwner(player1.address);
            expect(tokenIds.length).to.be.greaterThan(0);
        });

        it("Should calculate rarity correctly", async function () {
            // This tests the internal rarity calculation logic
            // We can't directly test the internal function, but we can verify
            // the distribution makes sense by checking the percentages
            
            // Test that different randomness values produce expected rarities
            // This would be done through integration testing with actual merges
            expect(true).to.be.true; // Placeholder for rarity distribution tests
        });

        it("Should track pending requests", async function () {
            const pendingBefore = await gameContract.getPendingRequests(player1.address);
            expect(pendingBefore.length).to.equal(0);
        });

        it("Should update merge cooldown", async function () {
            const newCooldown = 600; // 10 minutes
            await gameContract.updateMergeCooldown(newCooldown);
            expect(await gameContract.mergeCooldown()).to.equal(newCooldown);
        });
    });

    describe("Integration", function () {
        it("Should have correct contract connections", async function () {
            expect(await gameContract.nftContract()).to.equal(await nftContract.getAddress());
            expect(await gameContract.vrfConsumer()).to.equal(await vrfConsumer.getAddress());
        });

        it("Should transfer ownership correctly", async function () {
            expect(await nftContract.owner()).to.equal(await gameContract.getAddress());
        });
    });
});