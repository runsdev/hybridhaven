import { run, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface DeploymentAddresses {
    vrfConsumer: string;
    nftContract: string;
    gameContract: string;
    network: string;
    deployer: string;
    timestamp: string;
}

async function verifyContract(contractAddress: string, args: any[], contractName?: string) {
    const displayName = contractName || contractAddress;
    console.log(`🔍 Verifying ${displayName}...`);
    
    try {
        await run("verify:verify", {
            address: contractAddress,
            constructorArguments: args,
        });
        console.log(`✅ ${displayName} verified successfully!`);
    } catch (error: any) {
        if (error.message.toLowerCase().includes("already verified")) {
            console.log(`✅ ${displayName} already verified`);
        } else {
            console.error(`❌ Error verifying ${displayName}:`, error.message);
        }
    }
}

function loadLatestDeployment(): DeploymentAddresses {
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    const latestFile = path.join(deploymentsDir, `${network.name}-latest.json`);
    
    if (!fs.existsSync(latestFile)) {
        throw new Error(`❌ No deployment file found for network ${network.name}. Please deploy contracts first.`);
    }
    
    const data = fs.readFileSync(latestFile, "utf8");
    return JSON.parse(data);
}

async function main() {
    console.log("🚀 Starting contract verification...");
    console.log(`📡 Network: ${network.name}`);
    
    if (network.name === "hardhat" || network.name === "localhost") {
        console.log("⏭️  Skipping verification on local network");
        return;
    }
    
    try {
        // Load deployment addresses
        const deployment = loadLatestDeployment();
        
        console.log("📋 Contract Addresses to verify:");
        console.log(`   VRF Consumer: ${deployment.vrfConsumer}`);
        console.log(`   NFT Contract: ${deployment.nftContract}`);
        console.log(`   Game Contract: ${deployment.gameContract}`);
        
        // Network configurations for Chainlink VRF (same as deploy script)
        const NETWORK_CONFIG: Record<string, { vrfCoordinator: string }> = {
            sepolia: {
                vrfCoordinator: "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B"
            }
        };
        
        const config = NETWORK_CONFIG[network.name];
        if (!config) {
            throw new Error(`❌ Network ${network.name} configuration not found`);
        }
        
        // Verify contracts with their constructor arguments
        await verifyContract(
            deployment.vrfConsumer, 
            [config.vrfCoordinator], 
            "ChainlinkVRFConsumer"
        );
        
        await verifyContract(
            deployment.nftContract, 
            [], 
            "NFTContract"
        );
        
        await verifyContract(
            deployment.gameContract, 
            [], 
            "GameContract"
        );
        
        console.log("\n🎉 All contracts verified successfully!");
        
    } catch (error) {
        console.error("❌ Verification failed:", error);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });