import { ethers, network } from "hardhat";
import { Contract } from "ethers";
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
        vrfCoordinator: "0x0000000000000000000000000000000000000001",
        keyHash: "0x0000000000000000000000000000000000000000000000000000000000000001",
        subscriptionId: 1,
        callbackGasLimit: 100000,
        requestConfirmations: 3
    },
    localhost: {
        vrfCoordinator: "0x0000000000000000000000000000000000000001",
        keyHash: "0x0000000000000000000000000000000000000000000000000000000000000001",
        subscriptionId: 1,
        callbackGasLimit: 100000,
        requestConfirmations: 3
    },
    sepolia: {
        vrfCoordinator: "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B",
        keyHash: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
        subscriptionId: process.env.VRF_SUBSCRIPTION_ID ? Number(process.env.VRF_SUBSCRIPTION_ID) : 1,
        callbackGasLimit: 2500000,
        requestConfirmations: 3
    }
};

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
    console.log("🚀 Deploying VRF Consumer Contract...");
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
        // Deploy ChainlinkVRFConsumer
        const vrfConsumer = await deployContract("ChainlinkVRFConsumer", [
            config.vrfCoordinator
        ]);
        
        // Configure VRF Consumer
        console.log("\n🔄 Configuring VRF Consumer...");
        const setSubscriptionTx = await vrfConsumer.setSubscriptionId(BigInt(config.subscriptionId || 0));
        await setSubscriptionTx.wait();
        
        const setKeyHashTx = await vrfConsumer.setKeyHash(config.keyHash);
        await setKeyHashTx.wait();
        
        const setVRFConfigTx = await vrfConsumer.setVRFConfig(
            config.callbackGasLimit,
            config.requestConfirmations,
            1 // numWords
        );
        await setVRFConfigTx.wait();
        console.log("✅ VRF Consumer configured");
        
        // Save deployment information
        const deploymentInfo = await saveDeploymentInfo({
            vrfConsumer: await vrfConsumer.getAddress()
        });
        
        // Verify contract
        if (network.name !== "hardhat" && network.name !== "localhost") {
            console.log("\n🔍 Starting contract verification...");
            await verifyContract(await vrfConsumer.getAddress(), [config.vrfCoordinator]);
        }
        
        console.log("\n🎉 VRF Consumer deployment completed successfully!");
        console.log("=" .repeat(50));
        console.log(`VRF Consumer: ${await vrfConsumer.getAddress()}`);
        console.log("=" .repeat(50));
        
        // Check if we need to update other contracts
        if (deploymentInfo.gameContract) {
            console.log("\n🔄 Detected existing Game Contract. Updating VRF Consumer reference...");
            
            const gameContract = await ethers.getContractAt("GameContract", deploymentInfo.gameContract);
            
            try {
                const setVRFTx = await gameContract.setVRFConsumer(await vrfConsumer.getAddress());
                await setVRFTx.wait();
                console.log("✅ Game Contract updated with new VRF Consumer address");
                
                // Authorize Game Contract to call new VRF Consumer
                const authorizeTx = await vrfConsumer.addAuthorizedCaller(deploymentInfo.gameContract);
                await authorizeTx.wait();
                console.log("✅ Game Contract authorized on new VRF Consumer");
            } catch (error) {
                console.error("❌ Failed to update Game Contract:", error);
                console.log("⚠️  Please manually update Game Contract with new VRF Consumer address");
            }
        }
        
    } catch (error) {
        console.error("❌ VRF Consumer deployment failed:", error);
        throw error;
    }
}

main()
    .then(() => {
        console.log("✅ VRF Consumer deployment script completed successfully");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ VRF Consumer deployment script failed:", error);
        process.exit(1);
    });