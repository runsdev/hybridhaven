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
    console.log("🔧 Configuring HybridHaven Contracts...");
    console.log(`📡 Network: ${network.name}`);
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    
    // Load deployment addresses
    const deployment = await loadLatestDeployment();
    if (!deployment) {
        console.error("❌ No deployment found for network:", network.name);
        console.log("Please deploy contracts first using the individual deployment scripts.");
        process.exit(1);
    }
    
    console.log("\n📋 Found deployment addresses:");
    console.log(`   VRF Consumer: ${deployment.vrfConsumer || "❌ Not deployed"}`);
    console.log(`   NFT Contract: ${deployment.nftContract || "❌ Not deployed"}`);
    console.log(`   Game Contract: ${deployment.gameContract || "❌ Not deployed"}`);
    console.log("");
    
    // Validate required contracts
    if (!deployment.gameContract) {
        console.error("❌ Game Contract not found. Please deploy it first.");
        process.exit(1);
    }
    
    try {
        const gameContract = await ethers.getContractAt("GameContract", deployment.gameContract);
        
        // Configure NFT Contract if available
        if (deployment.nftContract) {
            console.log("📝 Configuring NFT Contract reference...");
            const currentNFTAddress = await gameContract.getNFTContract();
            
            if (currentNFTAddress.toLowerCase() !== deployment.nftContract.toLowerCase()) {
                const setNFTTx = await gameContract.setNFTContract(deployment.nftContract);
                await setNFTTx.wait();
                console.log("✅ NFT Contract address updated in Game Contract");
                
                // Transfer ownership if not already transferred
                const nftContract = await ethers.getContractAt("NFTContract", deployment.nftContract);
                const nftOwner = await nftContract.owner();
                
                if (nftOwner.toLowerCase() !== deployment.gameContract.toLowerCase()) {
                    console.log("📝 Transferring NFT Contract ownership...");
                    const transferTx = await nftContract.transferOwnership(deployment.gameContract);
                    await transferTx.wait();
                    console.log("✅ NFT Contract ownership transferred to Game Contract");
                } else {
                    console.log("✅ NFT Contract ownership already correct");
                }
            } else {
                console.log("✅ NFT Contract address already configured");
            }
        } else {
            console.log("⚠️  NFT Contract not deployed - skipping configuration");
        }
        
        // Configure VRF Consumer if available
        if (deployment.vrfConsumer) {
            console.log("📝 Configuring VRF Consumer reference...");
            const currentVRFAddress = await gameContract.getVRFConsumer();
            
            if (currentVRFAddress.toLowerCase() !== deployment.vrfConsumer.toLowerCase()) {
                const setVRFTx = await gameContract.setVRFConsumer(deployment.vrfConsumer);
                await setVRFTx.wait();
                console.log("✅ VRF Consumer address updated in Game Contract");
            } else {
                console.log("✅ VRF Consumer address already configured");
            }
            
            // Authorize Game Contract on VRF Consumer
            console.log("📝 Checking VRF Consumer authorization...");
            const vrfConsumer = await ethers.getContractAt("ChainlinkVRFConsumer", deployment.vrfConsumer);
            
            try {
                // Try to check if already authorized (this might not have a public method)
                const authorizeTx = await vrfConsumer.addAuthorizedCaller(deployment.gameContract);
                await authorizeTx.wait();
                console.log("✅ Game Contract authorized on VRF Consumer");
            } catch (error: any) {
                if (error.message.includes("already authorized") || error.message.includes("Already authorized")) {
                    console.log("✅ Game Contract already authorized on VRF Consumer");
                } else {
                    console.log("❌ Failed to authorize Game Contract on VRF Consumer:", error.message);
                }
            }
        } else {
            console.log("⚠️  VRF Consumer not deployed - skipping configuration");
        }
        
        // Configure backend address
        console.log("📝 Configuring backend address...");
        const currentBackendAddress = await gameContract.getBackendAddress();
        
        if (currentBackendAddress === "0x0000000000000000000000000000000000000000") {
            const setBackendTx = await gameContract.setBackendAddress(deployer.address);
            await setBackendTx.wait();
            console.log("✅ Backend address set to deployer");
        } else {
            console.log(`✅ Backend address already configured: ${currentBackendAddress}`);
            if (currentBackendAddress.toLowerCase() !== deployer.address.toLowerCase()) {
                console.log("⚠️  Current backend address differs from deployer. Update manually if needed.");
            }
        }
        
        console.log("\n🎉 Configuration completed successfully!");
        console.log("=" .repeat(50));
        
        // Final status check
        console.log("📋 Final Configuration Status:");
        const finalNFTAddress = await gameContract.getNFTContract();
        const finalVRFAddress = await gameContract.getVRFConsumer();
        const finalBackendAddress = await gameContract.getBackendAddress();
        
        console.log(`   NFT Contract: ${finalNFTAddress}`);
        console.log(`   VRF Consumer: ${finalVRFAddress}`);
        console.log(`   Backend Address: ${finalBackendAddress}`);
        console.log("=" .repeat(50));
        
        if (deployment.nftContract && deployment.vrfConsumer) {
            console.log("\n✅ All contracts are properly configured and ready to use!");
        } else {
            console.log("\n⚠️  Some contracts are missing. Deploy them using:");
            if (!deployment.nftContract) {
                console.log(`   npx hardhat run scripts/deploy-nft.ts --network ${network.name}`);
            }
            if (!deployment.vrfConsumer) {
                console.log(`   npx hardhat run scripts/deploy-vrf.ts --network ${network.name}`);
            }
        }
        
    } catch (error) {
        console.error("❌ Configuration failed:", error);
        process.exit(1);
    }
}

main()
    .then(() => {
        console.log("✅ Configuration script completed successfully");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Configuration script failed:", error);
        process.exit(1);
    });