import { expect } from "chai";
import { ethers } from "hardhat";
import { NFTContract, GameContract, ChainlinkVRFConsumer, MockVRFConsumer } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("HybridHaven Smart Contracts", function () {
    let nftContract: NFTContract;
    let gameContract: GameContract;
    let vrfConsumer: ChainlinkVRFConsumer;
    let mockVrfConsumer: MockVRFConsumer;
    let owner: SignerWithAddress;
    let player1: SignerWithAddress;
    let player2: SignerWithAddress;
    let backend: SignerWithAddress;

    beforeEach(async function () {
        [owner, player1, player2, backend] = await ethers.getSigners();

        // Deploy MockVRFConsumer for testing
        const MockVRFConsumer = await ethers.getContractFactory("MockVRFConsumer");
        mockVrfConsumer = await MockVRFConsumer.deploy();

        // Deploy ChainlinkVRFConsumer for interface testing
        const ChainlinkVRFConsumer = await ethers.getContractFactory("ChainlinkVRFConsumer");
        vrfConsumer = await ChainlinkVRFConsumer.deploy();

        // Deploy NFT Contract
        const NFTContract = await ethers.getContractFactory("NFTContract");
        nftContract = await NFTContract.deploy();

        // Deploy Game Contract
        const GameContract = await ethers.getContractFactory("GameContract");
        gameContract = await GameContract.deploy();

        // Setup contracts
        await gameContract.setNFTContract(await nftContract.getAddress());
        await gameContract.setVRFConsumer(await mockVrfConsumer.getAddress()); // Use mock for testing
        await gameContract.setBackendAddress(backend.address);

        // Transfer ownership of NFT contract to Game contract
        await nftContract.transferOwnership(await gameContract.getAddress());
    });

    describe("NFTContract Tests", function () {
        describe("Deployment and Configuration", function () {
            it("Should deploy with correct name and symbol", async function () {
                expect(await nftContract.name()).to.equal("HybridHaven");
                expect(await nftContract.symbol()).to.equal("HYBRID");
            });

            it("Should have correct contract URI", async function () {
                const contractURI = await nftContract.contractURI();
                expect(contractURI).to.include("bafkreigukneaeoz4k7cu523gliovspmeityqweel7lr2gn35jw5uhdvsxi");
            });

            it("Should support required interfaces", async function () {
                // ERC721
                expect(await nftContract.supportsInterface("0x80ac58cd")).to.be.true;
                // ERC721Metadata
                expect(await nftContract.supportsInterface("0x5b5e139f")).to.be.true;
                // ERC4906 (MetadataUpdate)
                expect(await nftContract.supportsInterface("0x49064906")).to.be.true;
            });
        });

        describe("Entity Management", function () {
            let tokenId: number;

            beforeEach(async function () {
                // Create a test entity
                const tx = await gameContract.connect(player1).requestMerge(
                    "Fire", "Water", true, true, 0, 0,
                    { value: ethers.parseEther("0.0001") }
                );
                const receipt = await tx.wait();
                const event = receipt?.logs.find(log => {
                    try {
                        return gameContract.interface.parseLog(log as any)?.name === "MergeRequested";
                    } catch { return false; }
                });

                if (event) {
                    const parsedEvent = gameContract.interface.parseLog(event as any);
                    const requestId = parsedEvent?.args[3];
                    
                    await gameContract.connect(backend).completeMerge(
                        requestId, "FireWater", "ipfs://QmTest"
                    );

                    const tokens = await nftContract.getTokensByOwner(player1.address);
                    tokenId = Number(tokens[0]);
                }
            });

            it("Should return correct entity details", async function () {
                const entity = await nftContract.getEntity(tokenId);
                expect(entity.name).to.equal("FireWater");
                expect(entity.parent1).to.equal("Fire");
                expect(entity.parent2).to.equal("Water");
                expect(entity.isStarter).to.be.false;
                expect(entity.rarity).to.be.greaterThan(0);
                expect(entity.rarity).to.be.lessThanOrEqual(5);
                expect(entity.metadataURI).to.equal("ipfs://QmTest");
            });

            it("Should track token ownership correctly", async function () {
                const tokens = await nftContract.getTokensByOwner(player1.address);
                expect(tokens.length).to.equal(1);
                expect(Number(tokens[0])).to.equal(tokenId);
                
                expect(await nftContract.ownerOf(tokenId)).to.equal(player1.address);
            });

            it("Should return correct total supply", async function () {
                const totalSupply = await nftContract.totalSupply();
                expect(totalSupply).to.equal(1);
            });
        });
    });

    describe("GameContract Tests", function () {
        describe("Contract Configuration", function () {
            it("Should have correct initial configuration", async function () {
                expect(await gameContract.getNFTContract()).to.equal(await nftContract.getAddress());
                expect(await gameContract.getVRFConsumer()).to.equal(await mockVrfConsumer.getAddress());
                expect(await gameContract.getBackendAddress()).to.equal(backend.address);
            });

            it("Should allow owner to update configuration", async function () {
                const newBackend = player2.address;
                await expect(gameContract.setBackendAddress(newBackend))
                    .to.emit(gameContract, "BackendAddressUpdated")
                    .withArgs(backend.address, newBackend);
                
                expect(await gameContract.getBackendAddress()).to.equal(newBackend);
            });

            it("Should reject zero addresses", async function () {
                await expect(gameContract.setNFTContract(ethers.ZeroAddress))
                    .to.be.revertedWith("Invalid NFT contract address");
                
                await expect(gameContract.setVRFConsumer(ethers.ZeroAddress))
                    .to.be.revertedWith("Invalid VRF consumer address");
            });

            it("Should only allow owner to update configuration", async function () {
                await expect(gameContract.connect(player1).setBackendAddress(player1.address))
                    .to.be.revertedWith("Ownable: caller is not the owner");
            });
        });

        describe("Starter Entities", function () {
            it("Should return complete starter entities list", async function () {
                const starters = await gameContract.getStarterEntities();
                expect(starters.length).to.be.greaterThan(30); // Should have many starter entities
                expect(starters).to.include("Fire");
                expect(starters).to.include("Water");
            });

            it("Should validate starter entity names correctly", async function () {
                expect(await gameContract.isValidStarterEntity("Fire")).to.be.true;
                expect(await gameContract.isValidStarterEntity("Water")).to.be.true;
                expect(await gameContract.isValidStarterEntity("InvalidEntity")).to.be.false;
                expect(await gameContract.isValidStarterEntity("")).to.be.false;
            });
        });

        describe("Merge Cooldown System", function () {
            it("Should allow merge when no previous merge", async function () {
                expect(await gameContract.canPlayerMerge(player1.address)).to.be.true;
                expect(await gameContract.timeUntilNextMerge(player1.address)).to.equal(0);
            });

            it("Should enforce cooldown after merge", async function () {
                // Make first merge
                await gameContract.connect(player1).requestMerge(
                    "Fire", "Water", true, true, 0, 0,
                    { value: ethers.parseEther("0.0001") }
                );

                // Should be in cooldown
                expect(await gameContract.canPlayerMerge(player1.address)).to.be.false;
                const timeLeft = await gameContract.timeUntilNextMerge(player1.address);
                expect(timeLeft).to.be.greaterThan(0);
            });

            it("Should allow merge after cooldown expires", async function () {
                // Make first merge
                await gameContract.connect(player1).requestMerge(
                    "Fire", "Water", true, true, 0, 0,
                    { value: ethers.parseEther("0.0001") }
                );

                // Fast-forward past cooldown (5 minutes + buffer)
                await ethers.provider.send("evm_increaseTime", [301]);
                await ethers.provider.send("evm_mine", []);

                expect(await gameContract.canPlayerMerge(player1.address)).to.be.true;
            });

            it("Should allow owner to update cooldown", async function () {
                const newCooldown = 600; // 10 minutes
                await gameContract.updateMergeCooldown(newCooldown);
                expect(await gameContract.mergeCooldown()).to.equal(newCooldown);
            });
        });

        describe("Merge Request Flow", function () {
            it("Should require payment for merge", async function () {
                await expect(gameContract.connect(player1).requestMerge(
                    "Fire", "Water", true, true, 0, 0
                )).to.be.revertedWith("Payment of 0.0001 ETH required");
            });

            it("Should require valid entity names", async function () {
                await expect(gameContract.connect(player1).requestMerge(
                    "", "Water", true, true, 0, 0,
                    { value: ethers.parseEther("0.0001") }
                )).to.be.revertedWith("Entity names required");

                await expect(gameContract.connect(player1).requestMerge(
                    "Fire", "", true, true, 0, 0,
                    { value: ethers.parseEther("0.0001") }
                )).to.be.revertedWith("Entity names required");
            });

            it("Should prevent merging same starter entities", async function () {
                await expect(gameContract.connect(player1).requestMerge(
                    "Fire", "Fire", true, true, 0, 0,
                    { value: ethers.parseEther("0.0001") }
                )).to.be.revertedWith("Cannot merge same starter entity");
            });

            it("Should validate starter entity names", async function () {
                await expect(gameContract.connect(player1).requestMerge(
                    "InvalidStarter", "Water", true, true, 0, 0,
                    { value: ethers.parseEther("0.0001") }
                )).to.be.revertedWith("Invalid starter entity 1");

                await expect(gameContract.connect(player1).requestMerge(
                    "Fire", "InvalidStarter", true, true, 0, 0,
                    { value: ethers.parseEther("0.0001") }
                )).to.be.revertedWith("Invalid starter entity 2");
            });

            it("Should create merge request successfully", async function () {
                const tx = await gameContract.connect(player1).requestMerge(
                    "Fire", "Water", true, true, 0, 0,
                    { value: ethers.parseEther("0.0001") }
                );

                await expect(tx).to.emit(gameContract, "MergeRequested");
                
                const pendingRequests = await gameContract.getPendingRequests(player1.address);
                expect(pendingRequests.length).to.equal(1);
            });

            it("Should transfer payment to owner", async function () {
                const initialBalance = await ethers.provider.getBalance(owner.address);
                
                await gameContract.connect(player1).requestMerge(
                    "Fire", "Water", true, true, 0, 0,
                    { value: ethers.parseEther("0.0001") }
                );

                const finalBalance = await ethers.provider.getBalance(owner.address);
                expect(finalBalance - initialBalance).to.equal(ethers.parseEther("0.0001"));
            });
        });

        describe("Merge Completion", function () {
            let requestId: bigint;

            beforeEach(async function () {
                const tx = await gameContract.connect(player1).requestMerge(
                    "Fire", "Water", true, true, 0, 0,
                    { value: ethers.parseEther("0.0001") }
                );
                const receipt = await tx.wait();
                const event = receipt?.logs.find(log => {
                    try {
                        return gameContract.interface.parseLog(log as any)?.name === "MergeRequested";
                    } catch { return false; }
                });

                if (event) {
                    const parsedEvent = gameContract.interface.parseLog(event as any);
                    requestId = parsedEvent?.args[3];
                }
            });

            it("Should check randomness availability", async function () {
                expect(await gameContract.isRandomnessReady(requestId)).to.be.true;
                
                const randomness = await gameContract.getRequestRandomness(requestId);
                expect(randomness).to.be.greaterThan(0);
                expect(randomness).to.be.lessThanOrEqual(10000);
            });

            it("Should allow all users to complete merge", async function () {
                await expect(gameContract.connect(player1).completeMerge(
                    requestId, "FireWater", "ipfs://QmTest"
                )).to.emit(gameContract, "MergeCompleted");
            });

            it("Should complete merge successfully", async function () {
                const tx = await gameContract.connect(backend).completeMerge(
                    requestId, "FireWater", "ipfs://QmTest"
                );

                await expect(tx).to.emit(gameContract, "MergeCompleted");
                await expect(tx).to.emit(nftContract, "EntityMinted");

                // Check NFT was minted
                const tokens = await nftContract.getTokensByOwner(player1.address);
                expect(tokens.length).to.equal(1);

                // Check entity details
                const entity = await nftContract.getEntity(tokens[0]);
                expect(entity.name).to.equal("FireWater");
                expect(entity.parent1).to.equal("Fire");
                expect(entity.parent2).to.equal("Water");
                expect(entity.isStarter).to.be.false;

                // Check request is no longer pending
                const pendingRequests = await gameContract.getPendingRequests(player1.address);
                expect(pendingRequests.length).to.equal(0);
            });

            it("Should prevent double completion", async function () {
                await gameContract.connect(backend).completeMerge(
                    requestId, "FireWater", "ipfs://QmTest"
                );

                await expect(gameContract.connect(backend).completeMerge(
                    requestId, "FireWater2", "ipfs://QmTest2"
                )).to.be.revertedWith("Request already fulfilled");
            });

            it("Should reject invalid request ID", async function () {
                await expect(gameContract.connect(backend).completeMerge(
                    999999, "FireWater", "ipfs://QmTest"
                )).to.be.revertedWith("Invalid request ID");
            });
        });

        describe("Rarity System", function () {
            it("Should distribute rarities according to odds", async function () {
                const rarities: number[] = [];
                
                // Generate multiple merges to test distribution
                for (let i = 0; i < 10; i++) {
                    if (i > 0) {
                        await ethers.provider.send("evm_increaseTime", [301]);
                        await ethers.provider.send("evm_mine", []);
                    }

                    const tx = await gameContract.connect(player1).requestMerge(
                        "Fire", "Water", true, true, 0, 0,
                        { value: ethers.parseEther("0.0001") }
                    );
                    const receipt = await tx.wait();
                    const event = receipt?.logs.find(log => {
                        try {
                            return gameContract.interface.parseLog(log as any)?.name === "MergeRequested";
                        } catch { return false; }
                    });

                    if (event) {
                        const parsedEvent = gameContract.interface.parseLog(event as any);
                        const requestId = parsedEvent?.args[3];

                        await gameContract.connect(backend).completeMerge(
                            requestId, `Entity${i}`, `ipfs://QmEntity${i}`
                        );

                        const tokens = await nftContract.getTokensByOwner(player1.address);
                        const entity = await nftContract.getEntity(tokens[tokens.length - 1]);
                        rarities.push(Number(entity.rarity));
                    }
                }

                // Check rarity distribution
                expect(rarities.length).to.equal(10);
                expect(Math.min(...rarities)).to.be.greaterThanOrEqual(1);
                expect(Math.max(...rarities)).to.be.lessThanOrEqual(5);
                
                // Should have some variety in rarities
                const uniqueRarities = [...new Set(rarities)];
                expect(uniqueRarities.length).to.be.greaterThan(1);
            });
        });

        describe("Emergency Functions", function () {
            let requestId: bigint;

            beforeEach(async function () {
                const tx = await gameContract.connect(player1).requestMerge(
                    "Fire", "Water", true, true, 0, 0,
                    { value: ethers.parseEther("0.0001") }
                );
                const receipt = await tx.wait();
                const event = receipt?.logs.find(log => {
                    try {
                        return gameContract.interface.parseLog(log as any)?.name === "MergeRequested";
                    } catch { return false; }
                });

                if (event) {
                    const parsedEvent = gameContract.interface.parseLog(event as any);
                    requestId = parsedEvent?.args[3];
                }
            });

            it("Should allow owner to cancel old requests", async function () {
                // Fast-forward more than 1 hour
                await ethers.provider.send("evm_increaseTime", [3601]);
                await ethers.provider.send("evm_mine", []);

                await gameContract.connect(owner).cancelMergeRequest(requestId);

                const pendingRequests = await gameContract.getPendingRequests(player1.address);
                expect(pendingRequests.length).to.equal(0);
            });

            it("Should prevent canceling recent requests", async function () {
                await expect(gameContract.connect(owner).cancelMergeRequest(requestId))
                    .to.be.revertedWith("Request too recent");
            });
        });
    });

    describe("MockVRFConsumer Tests", function () {
        describe("Configuration", function () {
            it("Should have correct initial configuration", async function () {
                expect(await mockVrfConsumer.s_subscriptionId()).to.equal(1);
                expect(await mockVrfConsumer.callbackGasLimit()).to.equal(100000);
                expect(await mockVrfConsumer.requestConfirmations()).to.equal(3);
                expect(await mockVrfConsumer.numWords()).to.equal(2);
            });

            it("Should allow configuration updates", async function () {
                await expect(mockVrfConsumer.setSubscriptionId(42))
                    .to.emit(mockVrfConsumer, "SubscriptionIdSet")
                    .withArgs(1, 42);

                await expect(mockVrfConsumer.setVRFConfig(200000, 5, 3))
                    .to.emit(mockVrfConsumer, "VRFConfigSet")
                    .withArgs(200000, 5, 3);
            });
        });

        describe("Randomness Generation", function () {
            it("Should generate random words immediately", async function () {
                const tx = await mockVrfConsumer.requestRandomWords(false);
                const receipt = await tx.wait();

                expect(receipt?.logs).to.have.length.greaterThan(0);

                const requestId = await mockVrfConsumer.lastRequestId();
                const [fulfilled, randomWords] = await mockVrfConsumer.getRequestStatus(requestId);

                expect(fulfilled).to.be.true;
                expect(randomWords.length).to.equal(2);
                expect(randomWords[0]).to.be.greaterThan(0);
                expect(randomWords[1]).to.be.greaterThan(0);
            });

            it("Should emit correct events", async function () {
                await expect(mockVrfConsumer.requestRandomWords(false))
                    .to.emit(mockVrfConsumer, "RequestSent")
                    .and.to.emit(mockVrfConsumer, "RequestFulfilled");
            });

            it("Should reject invalid request status queries", async function () {
                await expect(mockVrfConsumer.getRequestStatus(999999))
                    .to.be.revertedWith("request not found");
            });
        });
    });

    describe("Integration Tests", function () {
        describe("Complete Game Flow", function () {
            it("Should complete full game workflow", async function () {
                // 1. Request merge
                const tx1 = await gameContract.connect(player1).requestMerge(
                    "Fire", "Water", true, true, 0, 0,
                    { value: ethers.parseEther("0.0001") }
                );

                await expect(tx1).to.emit(gameContract, "MergeRequested");

                // 2. Get request ID
                const receipt1 = await tx1.wait();
                const event = receipt1?.logs.find(log => {
                    try {
                        return gameContract.interface.parseLog(log as any)?.name === "MergeRequested";
                    } catch { return false; }
                });

                let requestId: bigint = BigInt(0);
                if (event) {
                    const parsedEvent = gameContract.interface.parseLog(event as any);
                    requestId = parsedEvent?.args[3];
                }

                // 3. Verify randomness is available
                expect(await gameContract.isRandomnessReady(requestId)).to.be.true;
                const randomness = await gameContract.getRequestRandomness(requestId);
                expect(randomness).to.be.greaterThan(0);

                // 4. Complete merge
                const tx2 = await gameContract.connect(backend).completeMerge(
                    requestId, "FireWater", "ipfs://QmFireWater"
                );

                await expect(tx2).to.emit(gameContract, "MergeCompleted");
                await expect(tx2).to.emit(nftContract, "EntityMinted");

                // 5. Verify results
                const tokens = await nftContract.getTokensByOwner(player1.address);
                expect(tokens.length).to.equal(1);

                const entity = await nftContract.getEntity(tokens[0]);
                expect(entity.name).to.equal("FireWater");
                expect(entity.parent1).to.equal("Fire");
                expect(entity.parent2).to.equal("Water");
                expect(entity.isStarter).to.be.false;
                expect(entity.rarity).to.be.greaterThan(0);
                expect(entity.rarity).to.be.lessThanOrEqual(5);
                expect(entity.metadataURI).to.equal("ipfs://QmFireWater");
            });

            it("Should handle multiple players correctly", async function () {
                // Both players create merges
                await Promise.all([
                    gameContract.connect(player1).requestMerge(
                        "Fire", "Water", true, true, 0, 0,
                        { value: ethers.parseEther("0.0001") }
                    ),
                    gameContract.connect(player2).requestMerge(
                        "Earth", "Air", true, true, 0, 0,
                        { value: ethers.parseEther("0.0001") }
                    )
                ]);

                // Get pending requests
                const pending1 = await gameContract.getPendingRequests(player1.address);
                const pending2 = await gameContract.getPendingRequests(player2.address);

                expect(pending1.length).to.equal(1);
                expect(pending2.length).to.equal(1);

                // Complete both merges
                await gameContract.connect(backend).completeMerge(
                    pending1[0], "FireWater", "ipfs://QmFireWater"
                );
                await gameContract.connect(backend).completeMerge(
                    pending2[0], "EarthAir", "ipfs://QmEarthAir"
                );

                // Verify both players got their NFTs
                const tokens1 = await nftContract.getTokensByOwner(player1.address);
                const tokens2 = await nftContract.getTokensByOwner(player2.address);

                expect(tokens1.length).to.equal(1);
                expect(tokens2.length).to.equal(1);

                const entity1 = await nftContract.getEntity(tokens1[0]);
                const entity2 = await nftContract.getEntity(tokens2[0]);

                expect(entity1.name).to.equal("FireWater");
                expect(entity2.name).to.equal("EarthAir");
            });
        });

        describe("Error Handling", function () {
            it("Should handle non-existent entities gracefully", async function () {
                await expect(nftContract.getEntity(999))
                    .to.be.revertedWith("Entity does not exist");

                await expect(nftContract.tokenURI(999))
                    .to.be.revertedWith("ERC721: URI query for nonexistent token");
            });

            it("Should handle VRF failures gracefully", async function () {
                // This test ensures the system can handle VRF-related errors
                // In production, additional error handling mechanisms would be implemented
                const requestId = BigInt(999999);
                
                await expect(gameContract.getRequestRandomness(requestId))
                    .to.be.revertedWith("request not found");
            });
        });
    });
});