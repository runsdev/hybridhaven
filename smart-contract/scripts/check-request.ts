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

async function main() {
    console.log("🔍 Checking Chainlink VRF Request Status...");
    console.log(`📡 Network: ${network.name}`);
    
    // Get request ID from command line arguments
    const requestId = process.argv[process.argv.length - 1];
    if (!requestId || isNaN(Number(requestId)) || requestId.includes("--network")) {
        console.error("❌ Please provide a valid request ID as an argument");
        console.log("Usage: npx hardhat run scripts/check-request.ts --network <network> <requestId>");
        process.exit(1);
    }
    
    console.log(`📝 Request ID: ${requestId}`);
    
    // Load deployment info to get VRF consumer address
    let vrfConsumerAddress: string;
    const deploymentInfo = await loadLatestDeployment();
    
    if (deploymentInfo?.vrfConsumer) {
        vrfConsumerAddress = deploymentInfo.vrfConsumer;
        console.log(`📋 Using VRF Consumer from deployment: ${vrfConsumerAddress}`);
    } else {
        console.error("❌ No VRF Consumer address found in deployment info");
        console.log("Please provide VRF Consumer address manually:");
        vrfConsumerAddress = "0x277c9A920148a244FBB3dC3596aE1C99139cC7b7"; // Example address
        console.log(`Using hardcoded address: ${vrfConsumerAddress}`);
    }
    
    try {
        // Get contract instance
        const vrfConsumer = await ethers.getContractAt("ChainlinkVRFConsumer", vrfConsumerAddress);
        
        // Check if request exists
        try {
            const [fulfilled, randomWords] = await vrfConsumer.getRequestStatus(requestId);
            
            console.log("\n📊 Request Status:");
            console.log(`Fulfilled: ${fulfilled}`);
            
            if (fulfilled) {
                console.log(`\n🎲 Random Words:`);
                for (let i = 0; i < randomWords.length; i++) {
                    console.log(`Word ${i + 1}: ${randomWords[i].toString()}`);
                }
            } else {
                console.log("\n⏳ Request not fulfilled yet");
                console.log("The VRF request is still pending. This can take a few minutes or longer depending on network conditions.");
                console.log("\nPossible reasons for pending requests:");
                console.log("1. Chainlink VRF needs more confirmations before fulfilling");
                console.log("2. Subscription might have insufficient funds");
                console.log("3. Gas price volatility causing delays");
                
                console.log("\nRun this command again later to check if it's been fulfilled:");
                console.log(`npx hardhat run scripts/check-request.ts --network ${network.name} ${requestId}`);
            }
            
            // Check if the request ID is the last one
            const lastRequestId = await vrfConsumer.lastRequestId();
            if (lastRequestId.toString() === requestId) {
                console.log("\n✅ This is the most recent request ID");
            } else {
                console.log(`\nℹ️ Most recent request ID is: ${lastRequestId.toString()}`);
            }
            
        } catch (error) {
            console.error("\n❌ Error checking request status:", error.message);
            console.log("The request ID may not exist or there might be an issue with the contract.");
        }
        
    } catch (error) {
        console.error("\n❌ Error connecting to VRF Consumer contract:", error);
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