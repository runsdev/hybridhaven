import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface DeploymentInfo {
    vrfConsumer?: string;
    nftContract?: string;
    gameContract?: string;
    network: string;
    deployer: string;
    timestamp: string;
}

async function loadLatestDeployment(): Promise<DeploymentInfo | null> {
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    const latestFilepath = path.join(deploymentsDir, `${network.name}-latest.json`);
    
    if (fs.existsSync(latestFilepath)) {
        const data = fs.readFileSync(latestFilepath, 'utf8');
        return JSON.parse(data);
    }
    return null;
}

async function getAllVRFRequests(vrfConsumer: any) {
    console.log("\n📋 Checking all VRF requests...");
    
    try {
        // Get all request IDs
        const requestIds = await vrfConsumer.requestIds();
        console.log(`\nFound ${requestIds.length} total VRF requests`);
        
        if (requestIds.length === 0) {
            console.log("No VRF requests found in the contract");
            return;
        }
        
        for (let i = 0; i < Math.min(requestIds.length, 10); i++) { // Show last 10 requests
            const requestId = requestIds[i];
            try {
                const [fulfilled, randomWords] = await vrfConsumer.getRequestStatus(requestId);
                console.log(`\nRequest ID: ${requestId.toString()}`);
                console.log(`Fulfilled: ${fulfilled}`);
                if (fulfilled && randomWords.length > 0) {
                    console.log(`Random Words: [${randomWords.map((w: any) => w.toString()).join(', ')}]`);
                }
            } catch (error: any) {
                console.log(`Error checking request ${requestId}: ${error.message}`);
            }
        }
        
        if (requestIds.length > 10) {
            console.log(`\n... and ${requestIds.length - 10} more requests`);
        }
        
        // Show the most recent request
        const lastRequestId = await vrfConsumer.lastRequestId();
        console.log(`\n🔥 Most recent request ID: ${lastRequestId.toString()}`);
        
    } catch (error: any) {
        console.error("Error getting VRF requests:", error.message);
        
        // Fallback: Try to get just the last request ID
        try {
            const lastRequestId = await vrfConsumer.lastRequestId();
            if (lastRequestId.toString() !== "0") {
                console.log(`\n🔥 Most recent request ID: ${lastRequestId.toString()}`);
                
                const [fulfilled, randomWords] = await vrfConsumer.getRequestStatus(lastRequestId);
                console.log(`Fulfilled: ${fulfilled}`);
                if (fulfilled && randomWords.length > 0) {
                    console.log(`Random Words: [${randomWords.map((w: any) => w.toString()).join(', ')}]`);
                }
            } else {
                console.log("No VRF requests found");
            }
        } catch (fallbackError: any) {
            console.error("Could not retrieve VRF request information:", fallbackError.message);
        }
    }
}

async function checkGameContractRequests(gameContract: any, targetAddress?: string) {
    console.log("\n🎮 Checking Game Contract merge requests...");
    
    try {
        if (targetAddress) {
            console.log(`\n📋 Pending requests for ${targetAddress}:`);
            const pendingRequests = await gameContract.getPendingRequests(targetAddress);
            
            if (pendingRequests.length === 0) {
                console.log("No pending merge requests found for this address");
            } else {
                console.log(`Found ${pendingRequests.length} pending request(s)`);
                
                for (let i = 0; i < pendingRequests.length; i++) {
                    const requestId = pendingRequests[i];
                    try {
                        // Access the mapping directly instead of calling getMergeRequest
                        const mergeRequest = await gameContract.mergeRequests(requestId);
                        console.log(`\n  Request ${i + 1}:`);
                        console.log(`    Request ID: ${requestId.toString()}`);
                        console.log(`    Player: ${mergeRequest.player}`);
                        console.log(`    Entity 1: ${mergeRequest.entity1Name} (${mergeRequest.entity1IsStarter ? 'Starter' : 'Hybrid #' + mergeRequest.entity1TokenId})`);
                        console.log(`    Entity 2: ${mergeRequest.entity2Name} (${mergeRequest.entity2IsStarter ? 'Starter' : 'Hybrid #' + mergeRequest.entity2TokenId})`);
                        console.log(`    Fulfilled: ${mergeRequest.fulfilled}`);
                        console.log(`    Timestamp: ${new Date(Number(mergeRequest.timestamp) * 1000).toISOString()}`);
                        
                        // Check if randomness is ready
                        const isReady = await gameContract.isRandomnessReady(requestId);
                        console.log(`    Randomness Ready: ${isReady}`);
                        
                        if (isReady) {
                            try {
                                const randomness = await gameContract.getRequestRandomness(requestId);
                                console.log(`    Randomness Value: ${randomness.toString()}`);
                            } catch (error: any) {
                                console.log(`    Could not get randomness: ${error.message}`);
                            }
                        }
                    } catch (error: any) {
                        console.log(`    Error getting request details: ${error.message}`);
                    }
                }
            }
        }
        
        // Check merge cooldown status
        if (targetAddress) {
            const canMerge = await gameContract.canPlayerMerge(targetAddress);
            const timeUntilNext = await gameContract.timeUntilNextMerge(targetAddress);
            
            console.log(`\n⏰ Merge Status for ${targetAddress}:`);
            console.log(`    Can Merge: ${canMerge}`);
            if (!canMerge && timeUntilNext > 0) {
                console.log(`    Time Until Next Merge: ${timeUntilNext.toString()} seconds (${Math.ceil(Number(timeUntilNext) / 60)} minutes)`);
            }
        }
        
    } catch (error: any) {
        console.error("Error checking Game Contract:", error.message);
    }
}

async function main() {
    console.log("🔍 Checking Chainlink VRF & Game Contract Status...");
    console.log(`📡 Network: ${network.name}`);
    
    // Get specific request ID and address from command line arguments
    const args = process.argv.slice(2);
    let specificRequestId: bigint | null = null;
    let targetAddress: string | null = null;
    
    // Parse command line arguments
    for (const arg of args) {
        if (arg.startsWith('0x') && arg.length === 42) {
            // Ethereum address
            targetAddress = arg;
        } else if (arg.match(/^\d+$/)) {
            // Numeric request ID
            specificRequestId = BigInt(arg);
        }
    }
    
    // If no specific request ID provided, use a known one for testing
    if (!specificRequestId) {
        specificRequestId = BigInt("10581962530306659740181525278664857339782385720116633188857151822467937946426");
        console.log(`\n📝 Using default request ID: ${specificRequestId.toString()}`);
    }
    
    // Load deployment info
    const deploymentInfo = await loadLatestDeployment();
    if (!deploymentInfo) {
        console.error("❌ No deployment info found. Please deploy the contracts first.");
        return;
    }
    
    const vrfConsumerAddress = deploymentInfo.vrfConsumer!;
    const gameContractAddress = deploymentInfo.gameContract!;
    
    console.log(`📋 VRF Consumer: ${vrfConsumerAddress}`);
    console.log(`📋 Game Contract: ${gameContractAddress}`);
    if (targetAddress) {
        console.log(`👤 Target Address: ${targetAddress}`);
    }
    
    try {
        // Check VRF Consumer
        const vrfConsumer = await ethers.getContractAt("ChainlinkVRFConsumer", vrfConsumerAddress);
        await getAllVRFRequests(vrfConsumer);
        
        // Check specific request ID in VRF
        console.log(`\n🔍 Checking specific VRF request ID: ${specificRequestId.toString()}`);
        try {
            const [fulfilled, randomWords] = await vrfConsumer.getRequestStatus(specificRequestId);
            
            console.log("\n📊 VRF Request Status:");
            console.log(`Request ID: ${specificRequestId.toString()}`);
            console.log(`Fulfilled: ${fulfilled}`);
            
            if (fulfilled) {
                console.log(`🎲 Random Words:`);
                for (let i = 0; i < randomWords.length; i++) {
                    console.log(`  Word ${i + 1}: ${randomWords[i].toString()}`);
                    // Show the processed randomness (1-10000 range)
                    const processedRandomness = (randomWords[i] % BigInt(10000)) + BigInt(1);
                    console.log(`  Processed (1-10000): ${processedRandomness.toString()}`);
                }
            } else {
                console.log("\n⏳ VRF request not fulfilled yet");
                console.log("This can take a few minutes depending on network conditions.");
            }
            
        } catch (error: any) {
            console.error("\n❌ Error checking VRF request status:", error.message);
            console.log("The request ID may not exist in the VRF contract.");
        }
        
        // Check Game Contract
        const gameContract = await ethers.getContractAt("GameContract", gameContractAddress);
        
        // If we have a target address, check their requests
        if (targetAddress) {
            await checkGameContractRequests(gameContract, targetAddress);
        }
        
        // Check if the specific request ID exists in the game contract
        try {
            console.log(`\n🎮 Checking Game Contract for request ID: ${specificRequestId.toString()}`);
            // Access the mapping directly instead of calling getMergeRequest
            const mergeRequest = await gameContract.mergeRequests(specificRequestId);
            
            if (mergeRequest.player === "0x0000000000000000000000000000000000000000") {
                console.log("❌ Request ID not found in Game Contract");
            } else {
                console.log("\n📊 Merge Request Details:");
                console.log(`Player: ${mergeRequest.player}`);
                console.log(`Entity 1: ${mergeRequest.entity1Name} (${mergeRequest.entity1IsStarter ? 'Starter' : 'Hybrid #' + mergeRequest.entity1TokenId})`);
                console.log(`Entity 2: ${mergeRequest.entity2Name} (${mergeRequest.entity2IsStarter ? 'Starter' : 'Hybrid #' + mergeRequest.entity2TokenId})`);
                console.log(`Fulfilled: ${mergeRequest.fulfilled}`);
                console.log(`Timestamp: ${new Date(Number(mergeRequest.timestamp) * 1000).toISOString()}`);
                
                // Check if randomness is ready for completion
                const isReady = await gameContract.isRandomnessReady(specificRequestId);
                console.log(`Randomness Ready: ${isReady}`);
                
                if (isReady && !mergeRequest.fulfilled) {
                    console.log("\n✅ This merge is ready to be completed!");
                    console.log("You can call the completeMerge function or use the backend API to finalize it.");
                    
                    try {
                        const randomness = await gameContract.getRequestRandomness(specificRequestId);
                        console.log(`Randomness Value: ${randomness.toString()}`);
                        
                        // Calculate rarity
                        let rarity: number;
                        if (randomness <= 10) rarity = 5;
                        else if (randomness <= 1000) rarity = 4;
                        else if (randomness <= 5000) rarity = 3;
                        else if (randomness <= 7000) rarity = 2;
                        else rarity = 1;
                        
                        console.log(`Calculated Rarity: ${rarity} star(s)`);
                    } catch (error: any) {
                        console.log(`Could not get randomness details: ${error.message}`);
                    }
                } else if (mergeRequest.fulfilled) {
                    console.log("\n✅ This merge has already been completed!");
                }
            }
        } catch (error: any) {
            console.error("Error checking merge request in Game Contract:", error.message);
        }
        
        // Show usage instructions
        console.log("\n" + "=".repeat(60));
        console.log("📝 Usage Instructions:");
        console.log("To check a specific request ID:");
        console.log(`  npx hardhat run scripts/check-request.ts --network ${network.name} <requestId>`);
        console.log("To check requests for a specific address:");
        console.log(`  npx hardhat run scripts/check-request.ts --network ${network.name} <address>`);
        console.log("To check both:");
        console.log(`  npx hardhat run scripts/check-request.ts --network ${network.name} <requestId> <address>`);
        console.log("=".repeat(60));
        
    } catch (error: any) {
        console.error("\n❌ Script failed:", error);
        throw error;
    }
}

// Execute the script
main()
    .then(() => {
        console.log("\n✅ Script completed successfully");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n❌ Script failed:", error);
        process.exit(1);
    });