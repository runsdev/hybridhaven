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
    console.log("🚀 Deploying Game Contract...");
    console.log(`📡 Network: ${network.name}`);
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Deployer balance: ${ethers.formatEther(balance)} ETH`);
    
    try {
        // Load existing deployment info to get other contract addresses
        const existingDeployment = await loadLatestDeployment();
        
        // Deploy GameContract
        const gameContract = await deployContract("GameContract");
        
        console.log("\n🔄 Configuring Game Contract...");
        
        // Configure with existing contracts if available
        if (existingDeployment?.nftContract) {
            console.log("📝 Setting NFT Contract address...");
            const setNFTTx = await gameContract.setNFTContract(existingDeployment.nftContract);
            await setNFTTx.wait();
            console.log("✅ NFT Contract address set");
            
            // Transfer NFT Contract ownership to Game Contract
            console.log("📝 Transferring NFT Contract ownership...");
            const nftContract = await ethers.getContractAt("NFTContract", existingDeployment.nftContract);
            const nftOwnershipTx = await nftContract.transferOwnership(await gameContract.getAddress());
            await nftOwnershipTx.wait();
            console.log("✅ NFT Contract ownership transferred to Game Contract");
        } else {
            console.log("⚠️  No NFT Contract found. Please deploy NFT Contract first or set it manually later.");
        }
        
        if (existingDeployment?.vrfConsumer) {
            console.log("📝 Setting VRF Consumer address...");
            const setVRFTx = await gameContract.setVRFConsumer(existingDeployment.vrfConsumer);
            await setVRFTx.wait();
            console.log("✅ VRF Consumer address set");
            
            // Authorize Game Contract to call VRF Consumer
            console.log("📝 Authorizing Game Contract on VRF Consumer...");
            const vrfConsumer = await ethers.getContractAt("ChainlinkVRFConsumer", existingDeployment.vrfConsumer);
            const authorizeTx = await vrfConsumer.addAuthorizedCaller(await gameContract.getAddress());
            await authorizeTx.wait();
            console.log("✅ Game Contract authorized on VRF Consumer");
        } else {
            console.log("⚠️  No VRF Consumer found. Please deploy VRF Consumer first or set it manually later.");
        }
        
        // Set backend address (deployer by default)
        console.log("📝 Setting backend address...");
        const setBackendTx = await gameContract.setBackendAddress(deployer.address);
        await setBackendTx.wait();
        console.log("✅ Backend address set to deployer");
        
        // Save deployment information
        const deploymentInfo = await saveDeploymentInfo({
            gameContract: await gameContract.getAddress()
        });
        
        // Verify contract
        if (network.name !== "hardhat" && network.name !== "localhost") {
            console.log("\n🔍 Starting contract verification...");
            await verifyContract(await gameContract.getAddress(), []);
        }
        
        console.log("\n🎉 Game Contract deployment completed successfully!");
        console.log("=" .repeat(50));
        console.log(`Game Contract: ${await gameContract.getAddress()}`);
        console.log("=" .repeat(50));
        
        console.log("\n📋 Configuration Summary:");
        console.log(`   NFT Contract: ${deploymentInfo.nftContract || "❌ Not set"}`);
        console.log(`   VRF Consumer: ${deploymentInfo.vrfConsumer || "❌ Not set"}`);
        console.log(`   Backend Address: ${deployer.address}`);
        
        if (!deploymentInfo.nftContract) {
            console.log("\n⚠️  Missing NFT Contract. Run: npx hardhat run scripts/deploy-nft.ts --network " + network.name);
        }
        
        if (!deploymentInfo.vrfConsumer) {
            console.log("⚠️  Missing VRF Consumer. Run: npx hardhat run scripts/deploy-vrf.ts --network " + network.name);
        }
        
        console.log("\n📝 Next Steps:");
        console.log("1. 🔗 Fund VRF subscription with LINK tokens (if using real Chainlink VRF)");
        console.log("2. 🛠️  Set up backend service to monitor merge requests");
        console.log("3. 🧪 Test the deployment with some basic operations");
        
    } catch (error) {
        console.error("❌ Game Contract deployment failed:", error);
        throw error;
    }
}

main()
    .then(() => {
        console.log("✅ Game Contract deployment script completed successfully");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Game Contract deployment script failed:", error);
        process.exit(1);
    });