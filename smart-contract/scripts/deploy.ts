import { ethers, network } from "hardhat";
import { Contract, ContractFactory } from "ethers";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Network configurations for Chainlink VRF
const NETWORK_CONFIG: Record<string, {
    vrfCoordinator: string;
    keyHash: string;
    subscriptionId?: number;
    callbackGasLimit: number;
    requestConfirmations: number;
}> = {
    hardhat: {
        vrfCoordinator: "0x0000000000000000000000000000000000000001", // Mock for local testing
        keyHash: "0x0000000000000000000000000000000000000000000000000000000000000001",
        subscriptionId: 1,
        callbackGasLimit: 100000,
        requestConfirmations: 3
    },
    localhost: {
        vrfCoordinator: "0x0000000000000000000000000000000000000001", // Mock for local testing
        keyHash: "0x0000000000000000000000000000000000000000000000000000000000000001",
        subscriptionId: 1,
        callbackGasLimit: 100000,
        requestConfirmations: 3
    },
    sepolia: {
        vrfCoordinator: "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B",
        keyHash: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
        subscriptionId: process.env.VRF_SUBSCRIPTION_ID ? Number(process.env.VRF_SUBSCRIPTION_ID) : 1, // Default to 1 if not provided
        callbackGasLimit: 2500000,
        requestConfirmations: 3
    }
};

interface DeploymentAddresses {
    vrfConsumer: string;
    nftContract: string;
    gameContract: string;
    network: string;
    deployer: string;
    timestamp: string;
}

async function deployContract(
    contractName: string, 
    args: any[] = [], 
    libraries?: Record<string, string>
): Promise<Contract> {
    console.log(`\n📦 Deploying ${contractName}...`);
    
    const ContractFactory: ContractFactory = await ethers.getContractFactory(
        contractName, 
        libraries ? { libraries } : undefined
    );
    
    // Estimate gas
    const deployTx = await ContractFactory.getDeployTransaction(...args);
    const gasEstimate = await ethers.provider.estimateGas(deployTx);
    console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);
    
    const contract = await ContractFactory.deploy(...args);
    await contract.waitForDeployment();
    
    const address = await contract.getAddress();
    console.log(`✅ ${contractName} deployed to: ${address}`);
    
    return contract as Contract;
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

async function saveDeploymentInfo(addresses: DeploymentAddresses) {
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    const filename = `${network.name}-${Date.now()}.json`;
    const filepath = path.join(deploymentsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(addresses, null, 2));
    console.log(`💾 Deployment info saved to: ${filepath}`);
    
    // Also save as latest for this network
    const latestFilepath = path.join(deploymentsDir, `${network.name}-latest.json`);
    fs.writeFileSync(latestFilepath, JSON.stringify(addresses, null, 2));
    console.log(`💾 Latest deployment info saved to: ${latestFilepath}`);
}

async function main() {
    console.log("🚀 Starting HybridHaven deployment...");
    console.log(`📡 Network: ${network.name}`);
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Deployer balance: ${ethers.formatEther(balance)} ETH`);
    
    // Get network configuration
    const config = NETWORK_CONFIG[network.name];
    if (!config) {
        throw new Error(`❌ Network ${network.name} not supported. Please add configuration.`);
    }
    
    console.log(`🔧 Using VRF Coordinator: ${config.vrfCoordinator}`);
    
    try {
        // Deploy ChainlinkVRFConsumer (only needs VRF coordinator address)
        const vrfConsumer = await deployContract("ChainlinkVRFConsumer");
        
        // Deploy NFTContract
        const nftContract = await deployContract("NFTContract");
        
        // Deploy GameContract (no constructor parameters needed)
        const gameContract = await deployContract("GameContract");

        console.log("\n🔄 Setting up contract configurations...");
        
        // Configure Game Contract
        console.log("📝 Configuring Game Contract...");
        const setNFTTx = await gameContract.setNFTContract(await nftContract.getAddress());
        await setNFTTx.wait();
        
        const setVRFTx = await gameContract.setVRFConsumer(await vrfConsumer.getAddress());
        await setVRFTx.wait();
        console.log("✅ Game Contract configured");
        
        // Transfer NFTContract ownership to GameContract
        console.log("📝 Transferring NFTContract ownership...");
        const nftOwnershipTx = await nftContract.transferOwnership(await gameContract.getAddress());
        await nftOwnershipTx.wait();
        console.log("✅ NFTContract ownership transferred");
        
        const addresses: DeploymentAddresses = {
            vrfConsumer: await vrfConsumer.getAddress(),
            nftContract: await nftContract.getAddress(),
            gameContract: await gameContract.getAddress(),
            network: network.name,
            deployer: deployer.address,
            timestamp: new Date().toISOString()
        };
        
        // Save deployment information
        await saveDeploymentInfo(addresses);
        
        // Verify contracts (if not on local network)
        if (network.name !== "hardhat" && network.name !== "localhost") {
            console.log("\n🔍 Starting contract verification...");
            
            await verifyContract(addresses.vrfConsumer, [
                config.vrfCoordinator
            ]);
            
            await verifyContract(addresses.nftContract, []);
            
            await verifyContract(addresses.gameContract, []);
        }
        
        console.log("\n🎉 Deployment completed successfully!");
        console.log("=" .repeat(50));
        console.log("📋 Contract Addresses:");
        console.log(`   VRF Consumer: ${addresses.vrfConsumer}`);
        console.log(`   NFT Contract: ${addresses.nftContract}`);
        console.log(`   Game Contract: ${addresses.gameContract}`);
        console.log("=" .repeat(50));
        
        console.log("\n📝 Next Steps:");
        console.log("1. 🔗 Fund VRF subscription with LINK tokens (if using real Chainlink VRF)");
        console.log("2. 🛠️  Set up backend service to monitor merge requests");
        console.log("3. 🔧 Configure backend address using gameContract.setBackendAddress()");
        console.log("4. 🧪 Test the deployment with some basic operations");
        
        if (config.subscriptionId === undefined && network.name !== "hardhat" && network.name !== "localhost") {
            console.log("\n⚠️  WARNING: No VRF subscription ID configured for this network!");
            console.log("   Please create a Chainlink VRF subscription and update the configuration.");
        }
        
    } catch (error) {
        console.error("❌ Deployment failed:", error);
        throw error;
    }
}

// Execute the deployment script
main()
    .then(() => {
        console.log("✅ Deployment script completed successfully");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Deployment script failed:", error);
        process.exit(1);
    });