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
        subscriptionId: process.env.VRF_SUBSCRIPTION_ID ? Number(process.env.VRF_SUBSCRIPTION_ID) : undefined,
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
    vrfSubscriptionId?: string;
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
        // Deploy ChainlinkVRFConsumer (no constructor parameters - hardcoded for Sepolia)
        const vrfConsumer = await deployContract("ChainlinkVRFConsumer");
        
        // Configure VRF Consumer settings if needed (for non-Sepolia networks)
        if (network.name !== "sepolia") {
            console.log("📝 Configuring VRF Consumer for non-Sepolia network...");
            
            // Note: The current VRF contract is hardcoded for Sepolia
            // For other networks, you might need a different VRF contract or configuration functions
            console.log("⚠️  WARNING: VRF Consumer is hardcoded for Sepolia. May not work on other networks.");
        }
        
        // Deploy NFTContract (no constructor parameters)
        const nftContract = await deployContract("NFTContract");
        
        // Deploy GameContract (no constructor parameters)
        const gameContract = await deployContract("GameContract");

        console.log("\n🔄 Setting up contract configurations...");
        
        // Configure Game Contract
        console.log("📝 Configuring Game Contract...");
        const setNFTTx = await gameContract.setNFTContract(await nftContract.getAddress());
        await setNFTTx.wait();
        console.log("✅ NFT Contract address set in Game Contract");
        
        const setVRFTx = await gameContract.setVRFConsumer(await vrfConsumer.getAddress());
        await setVRFTx.wait();
        console.log("✅ VRF Consumer address set in Game Contract");
        
        // Transfer NFTContract ownership to GameContract
        console.log("📝 Transferring NFTContract ownership...");
        const nftOwnershipTx = await nftContract.transferOwnership(await gameContract.getAddress());
        await nftOwnershipTx.wait();
        console.log("✅ NFTContract ownership transferred to GameContract");
        
        const addresses: DeploymentAddresses = {
            vrfConsumer: await vrfConsumer.getAddress(),
            nftContract: await nftContract.getAddress(),
            gameContract: await gameContract.getAddress(),
            network: network.name,
            deployer: deployer.address,
            timestamp: new Date().toISOString(),
            vrfSubscriptionId: config.subscriptionId?.toString()
        };
        
        // Save deployment information
        await saveDeploymentInfo(addresses);
        
        // Verify contracts (if not on local network)
        if (network.name !== "hardhat" && network.name !== "localhost") {
            console.log("\n🔍 Starting contract verification...");
            
            // VRF Consumer has no constructor parameters
            await verifyContract(addresses.vrfConsumer, []);
            
            // NFT Contract has no constructor parameters
            await verifyContract(addresses.nftContract, []);
            
            // Game Contract has no constructor parameters
            await verifyContract(addresses.gameContract, []);
        }
        
        console.log("\n🎉 Deployment completed successfully!");
        console.log("=" .repeat(50));
        console.log("📋 Contract Addresses:");
        console.log(`   VRF Consumer: ${addresses.vrfConsumer}`);
        console.log(`   NFT Contract: ${addresses.nftContract}`);
        console.log(`   Game Contract: ${addresses.gameContract}`);
        if (addresses.vrfSubscriptionId) {
            console.log(`   VRF Subscription ID: ${addresses.vrfSubscriptionId}`);
        }
        console.log("=" .repeat(50));
        
        console.log("\n📝 Next Steps:");
        if (network.name === "sepolia") {
            console.log("1. 🔗 Ensure VRF subscription is funded with LINK tokens");
            console.log(`2. 📋 VRF Subscription ID: ${addresses.vrfSubscriptionId || "Check environment variables"}`);
            console.log("3. 🔧 Add Game Contract as a VRF consumer in Chainlink subscription");
        } else {
            console.log("1. ⚠️  Configure VRF for this network (currently hardcoded for Sepolia)");
            console.log("2. 🔗 Set up proper VRF subscription for this network");
        }
        console.log("4. 🛠️  Set up backend service to monitor merge requests");
        console.log("5. 🔧 Configure backend address using gameContract.setBackendAddress()");
        console.log("6. 🧪 Test the deployment with some basic operations");
        
        // Additional VRF setup information
        console.log("\n🔧 VRF Configuration Details:");
        console.log(`   Coordinator: ${config.vrfCoordinator}`);
        console.log(`   Key Hash: ${config.keyHash}`);
        console.log(`   Callback Gas Limit: ${config.callbackGasLimit}`);
        console.log(`   Request Confirmations: ${config.requestConfirmations}`);
        
        if (!config.subscriptionId && network.name === "sepolia") {
            console.log("\n⚠️  WARNING: No VRF subscription ID configured!");
            console.log("   Please create a Chainlink VRF subscription and:");
            console.log("   1. Set VRF_SUBSCRIPTION_ID in your .env file");
            console.log("   2. Add the VRF Consumer contract as a consumer in your subscription");
            console.log("   3. Fund the subscription with LINK tokens");
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