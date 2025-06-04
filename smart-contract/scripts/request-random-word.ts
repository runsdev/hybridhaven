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
    console.log("🎲 Requesting Random Word from Chainlink VRF...");
    console.log(`📡 Network: ${network.name}`);
    
    const [signer] = await ethers.getSigners();
    console.log(`👤 Using signer: ${signer.address}`);
    
    // Load deployment info to get VRF consumer address
    let vrfConsumerAddress: string;
    const deploymentInfo = await loadLatestDeployment();
    
    if (deploymentInfo?.vrfConsumer) {
        vrfConsumerAddress = "0xE3cFAAFBa3AA927A07f3C41518E0E141f47C2b54";
        console.log(`📋 Using VRF Consumer from deployment: ${vrfConsumerAddress}`);
    } else {
        console.error("❌ No VRF Consumer address found in deployment info");
        console.log("Please provide VRF Consumer address manually:");
        vrfConsumerAddress = "0xB2Ab2622361AA9F75eb275d23FF6aBB6053cAAEc"; // Example address
        console.log(`Using hardcoded address: ${vrfConsumerAddress}`);
    }
    
    try {
        // Get contract instance
        const vrfConsumer = await ethers.getContractAt("ChainlinkVRFConsumer", vrfConsumerAddress);
        
        // Get current configuration
        console.log("\n📊 Current VRF Configuration:");
        const subscriptionId = await vrfConsumer.s_subscriptionId();
        console.log(`Subscription ID: ${subscriptionId}`);
        const keyHash = await vrfConsumer.keyHash();
        console.log(`Key Hash: ${keyHash}`);
        const callbackGasLimit = await vrfConsumer.callbackGasLimit();
        console.log(`Callback Gas Limit: ${callbackGasLimit}`);
        const numWords = await vrfConsumer.numWords();
        console.log(`Number of Words: ${numWords}`);
        
        // Check last request ID
        const lastRequestId = await vrfConsumer.lastRequestId();
        console.log(`Last Request ID: ${lastRequestId}`);
        
        // Request random word
        console.log("\n🔄 Requesting random word...");
        const enableNativePayment = true; // Using native token for payment
        const tx = await vrfConsumer.requestRandomWords(enableNativePayment, {
            gasLimit: 500000 // Setting higher gas limit to ensure transaction succeeds
        });
        
        console.log(`Transaction hash: ${tx.hash}`);
        console.log("⏳ Waiting for transaction confirmation...");
        
        const receipt = await tx.wait();
        console.log("✅ Transaction confirmed in block", receipt.blockNumber);
        
        // Find the RequestSent event to get the request ID
        let requestId: string | undefined;
        for (const log of receipt.logs) {
            try {
                const parsedLog = vrfConsumer.interface.parseLog(log);
                if (parsedLog && parsedLog.name === "RequestSent") {
                    requestId = parsedLog.args.requestId.toString();
                    break;
                }
            } catch (e) {
                // Not a matching event, continue
            }
        }
        
        if (requestId) {
            console.log(`\n📝 Request ID: ${requestId}`);
            console.log("🔍 You can check the status of this request using:");
            console.log(`npx hardhat run scripts/check-request.ts --network ${network.name} ${requestId}`);
            
            // Wait a bit and check status (might not be fulfilled immediately)
            console.log("\n⏳ Waiting 15 seconds to check request status...");
            await new Promise(resolve => setTimeout(resolve, 15000));
            
            try {
                const [fulfilled, randomWords] = await vrfConsumer.getRequestStatus(requestId);
                
                console.log("\n📊 Request Status:");
                console.log(`Fulfilled: ${fulfilled}`);
                
                if (fulfilled) {
                    console.log(`Random Word: ${randomWords[0].toString()}`);
                } else {
                    console.log("Random word not yet available. The request may take some time to fulfill.");
                    console.log("Check back later using the check-request script.");
                }
            } catch (error) {
                console.log("⚠️ Error checking request status. The request may still be processing.");
            }
        } else {
            console.log("⚠️ Couldn't find RequestSent event in the transaction logs");
        }
        
    } catch (error) {
        console.error("\n❌ Error requesting random word:", error);
        
        // Check if this is the common VRF error
        if (error.message && error.message.includes("0x1f6a65b6")) {
            console.log("\n🔍 Error Analysis:");
            console.log("This error suggests an issue with the VRF Coordinator. Common causes:");
            console.log("1. Insufficient LINK tokens in the subscription");
            console.log("2. VRF Consumer contract not added to the subscription");
            console.log("3. Subscription is paused or invalid");
            console.log("\nResolution steps:");
            console.log("1. Visit https://vrf.chain.link and check your subscription");
            console.log(`2. Ensure contract ${vrfConsumerAddress} is added as a consumer`);
            console.log("3. Fund the subscription with LINK tokens if needed");
        }
        
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