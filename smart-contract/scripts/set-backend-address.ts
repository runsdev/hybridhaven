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
    console.log("🔧 Setting Backend Address for HybridHaven Game Contract...");
    console.log(`📡 Network: ${network.name}`);
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    
    // Get the new backend address from command line arguments or use deployer as default
    const args = process.argv.slice(2);
    let newBackendAddress: string;
    
    if (args.length > 0) {
        newBackendAddress = args[0];
        // Validate address format
        if (!ethers.utils.isAddress(newBackendAddress)) {
            console.error("❌ Invalid Ethereum address provided:", newBackendAddress);
            process.exit(1);
        }
    } else {
        console.log("⚠️  No backend address provided. Using deployer address as default.");
        console.log("   Usage: npx hardhat run scripts/set-backend-address.ts --network <network> -- <backend_address>");
        newBackendAddress = deployer.address;
    }
    
    console.log(`🎯 New Backend Address: ${newBackendAddress}`);
    
    // Load deployment addresses
    const deployment = await loadLatestDeployment();
    if (!deployment || !deployment.gameContract) {
        console.error("❌ No Game Contract deployment found for network:", network.name);
        console.log("Please deploy the Game Contract first using:");
        console.log(`   npx hardhat run scripts/deploy-game.ts --network ${network.name}`);
        process.exit(1);
    }
    
    console.log(`📋 Game Contract Address: ${deployment.gameContract}`);
    
    try {
        // Connect to the Game Contract
        const gameContract = await ethers.getContractAt("GameContract", deployment.gameContract);
        
        // Check current backend address
        const currentBackendAddress = await gameContract.getBackendAddress();
        console.log(`📋 Current Backend Address: ${currentBackendAddress}`);
        
        // Check if the address is already set to the desired value
        if (currentBackendAddress.toLowerCase() === newBackendAddress.toLowerCase()) {
            console.log("✅ Backend address is already set to the desired value!");
            return;
        }
        
        // Verify deployer is the owner of the contract
        const owner = await gameContract.owner();
        if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
            console.error("❌ Only the contract owner can change the backend address.");
            console.log(`   Contract Owner: ${owner}`);
            console.log(`   Current Account: ${deployer.address}`);
            process.exit(1);
        }
        
        console.log("📝 Updating backend address...");
        
        // Set the new backend address
        const setBackendTx = await gameContract.setBackendAddress(newBackendAddress);
        console.log(`⏳ Transaction submitted: ${setBackendTx.hash}`);
        
        // Wait for confirmation
        const receipt = await setBackendTx.wait();
        console.log(`✅ Transaction confirmed in block: ${receipt.blockNumber}`);
        
        // Verify the change
        const updatedBackendAddress = await gameContract.getBackendAddress();
        console.log(`📋 Updated Backend Address: ${updatedBackendAddress}`);
        
        if (updatedBackendAddress.toLowerCase() === newBackendAddress.toLowerCase()) {
            console.log("🎉 Backend address updated successfully!");
        } else {
            console.error("❌ Backend address update verification failed!");
            process.exit(1);
        }
        
        console.log("\n" + "=".repeat(50));
        console.log("📋 Operation Summary:");
        console.log(`   Network: ${network.name}`);
        console.log(`   Game Contract: ${deployment.gameContract}`);
        console.log(`   Previous Backend: ${currentBackendAddress}`);
        console.log(`   New Backend: ${updatedBackendAddress}`);
        console.log(`   Transaction: ${setBackendTx.hash}`);
        console.log("=".repeat(50));
        
    } catch (error: any) {
        console.error("❌ Failed to update backend address:", error.message);
        
        if (error.message.includes("Not authorized") || error.message.includes("Ownable")) {
            console.log("💡 Make sure you're using the correct account that owns the contract.");
        }
        
        process.exit(1);
    }
}

main()
    .then(() => {
        console.log("✅ Backend address update script completed successfully");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Backend address update script failed:", error);
        process.exit(1);
    });