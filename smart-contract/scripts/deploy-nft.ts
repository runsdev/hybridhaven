import { ethers, network } from "hardhat";
import { Contract } from "ethers";
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

async function deployContract(contractName: string, args: any[] = []): Promise<Contract> {
    console.log(`\n📦 Deploying ${contractName}...`);
    
    const ContractFactory = await ethers.getContractFactory(contractName);
    
    const deployTx = await ContractFactory.getDeployTransaction(...args);
    const gasEstimate = await ethers.provider.estimateGas(deployTx);
    console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);
    
    const contract = await ContractFactory.deploy(...args);
    await contract.waitForDeployment();
    
    const address = await contract.getAddress();
    console.log(`✅ ${contractName} deployed to: ${address}`);
    
    return contract as Contract;
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

async function saveDeploymentInfo(newAddresses: Partial<DeploymentInfo>) {
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    // Load existing deployment info
    let deploymentInfo = await loadLatestDeployment();
    if (!deploymentInfo) {
        deploymentInfo = {
            network: network.name,
            deployer: (await ethers.getSigners())[0].address,
            timestamp: new Date().toISOString()
        };
    }
    
    // Update with new addresses
    deploymentInfo = { ...deploymentInfo, ...newAddresses };
    deploymentInfo.timestamp = new Date().toISOString();
    
    // Save timestamped version
    const filename = `${network.name}-${Date.now()}.json`;
    const filepath = path.join(deploymentsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`💾 Deployment info saved to: ${filepath}`);
    
    // Save as latest
    const latestFilepath = path.join(deploymentsDir, `${network.name}-latest.json`);
    fs.writeFileSync(latestFilepath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`💾 Latest deployment info updated: ${latestFilepath}`);
    
    return deploymentInfo;
}

async function verifyContract(address: string, constructorArguments: any[]) {
    if (network.name === "hardhat" || network.name === "localhost") {
        console.log("⏭️  Skipping verification on local network");
        return;
    }
    
    console.log(`🔍 Verifying contract at ${address}...`);
    try {
        await (global as any).run("verify:verify", {
            address,
            constructorArguments,
        });
        console.log("✅ Contract verified successfully");
    } catch (error: any) {
        if (error.message.toLowerCase().includes("already verified")) {
            console.log("✅ Contract already verified");
        } else {
            console.log("❌ Verification failed:", error.message);
        }
    }
}

async function main() {
    console.log("🚀 Deploying NFT Contract...");
    console.log(`📡 Network: ${network.name}`);
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Deployer balance: ${ethers.formatEther(balance)} ETH`);
    
    try {
        // Deploy NFTContract
        const nftContract = await deployContract("NFTContract");
        
        // Save deployment information
        const deploymentInfo = await saveDeploymentInfo({
            nftContract: await nftContract.getAddress()
        });
        
        // Verify contract
        if (network.name !== "hardhat" && network.name !== "localhost") {
            console.log("\n🔍 Starting contract verification...");
            await verifyContract(await nftContract.getAddress(), []);
        }
        
        console.log("\n🎉 NFT Contract deployment completed successfully!");
        console.log("=" .repeat(50));
        console.log(`NFT Contract: ${await nftContract.getAddress()}`);
        console.log("=" .repeat(50));
        
        // Check if we need to update other contracts
        if (deploymentInfo.gameContract) {
            console.log("\n🔄 Detected existing Game Contract. Updating NFT Contract reference...");
            
            const gameContract = await ethers.getContractAt("GameContract", deploymentInfo.gameContract);
            
            try {
                const setNFTTx = await gameContract.setNFTContract(await nftContract.getAddress());
                await setNFTTx.wait();
                console.log("✅ Game Contract updated with new NFT Contract address");
                
                // Transfer NFT Contract ownership to Game Contract
                const nftOwnershipTx = await nftContract.transferOwnership(deploymentInfo.gameContract);
                await nftOwnershipTx.wait();
                console.log("✅ NFT Contract ownership transferred to Game Contract");
            } catch (error) {
                console.error("❌ Failed to update Game Contract:", error);
                console.log("⚠️  Please manually update Game Contract with new NFT Contract address");
                console.log("⚠️  Please manually transfer NFT Contract ownership to Game Contract");
            }
        } else {
            console.log("\n⚠️  No Game Contract found. NFT Contract ownership remains with deployer.");
            console.log("   Run deploy-game.ts to deploy Game Contract and transfer ownership automatically.");
        }
        
    } catch (error) {
        console.error("❌ NFT Contract deployment failed:", error);
        throw error;
    }
}

main()
    .then(() => {
        console.log("✅ NFT Contract deployment script completed successfully");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ NFT Contract deployment script failed:", error);
        process.exit(1);
    });