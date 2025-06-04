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

interface EntityInfo {
    tokenId: bigint;
    name: string;
    rarity: number;
    imageURI: string;
    parent1: string;
    parent2: string;
    createdAt: bigint;
    isStarter: boolean;
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

async function checkTokenURI(nftContract: any, tokenId: number): Promise<void> {
    try {
        console.log(`\n🔍 Checking Token ID: ${tokenId}`);
        
        // Check if token exists
        const exists = await nftContract.exists(tokenId);
        if (!exists) {
            console.log(`❌ Token ${tokenId} does not exist`);
            return;
        }
        
        // Get token URI
        const tokenURI = await nftContract.tokenURI(tokenId);
        console.log(`📄 Token URI: ${tokenURI}`);
        
        // Get entity details
        const entity: EntityInfo = await nftContract.getEntity(tokenId);
        console.log(`📝 Entity Details:`);
        console.log(`   Name: ${entity.name}`);
        console.log(`   Rarity: ${entity.rarity}`);
        console.log(`   Image URI: ${entity.imageURI}`);
        console.log(`   Parent 1: ${entity.parent1}`);
        console.log(`   Parent 2: ${entity.parent2}`);
        console.log(`   Created At: ${new Date(Number(entity.createdAt) * 1000).toISOString()}`);
        console.log(`   Is Starter: ${entity.isStarter}`);
        
        // Get owner
        const owner = await nftContract.ownerOf(tokenId);
        console.log(`👤 Owner: ${owner}`);
        
        // Check if URI is accessible (basic validation)
        if (tokenURI.startsWith('http')) {
            console.log(`🌐 URI appears to be a valid HTTP/HTTPS URL`);
        } else if (tokenURI.startsWith('ipfs://')) {
            console.log(`🗂️  URI is an IPFS URL`);
        } else if (tokenURI.length === 0) {
            console.log(`⚠️  URI is empty`);
        } else {
            console.log(`❓ URI format: ${tokenURI.substring(0, 50)}...`);
        }
        
    } catch (error: any) {
        console.error(`❌ Error checking token ${tokenId}:`, error.message);
    }
}

async function checkAllTokens(nftContract: any): Promise<void> {
    try {
        const totalSupply = await nftContract.totalSupply();
        console.log(`\n📊 Total Supply: ${totalSupply}`);
        
        if (totalSupply === 0n) {
            console.log("No tokens have been minted yet.");
            return;
        }
        
        console.log(`\n🔍 Checking all ${totalSupply} tokens...`);
        
        for (let i = 1; i <= Number(totalSupply); i++) {
            await checkTokenURI(nftContract, i);
        }
        
    } catch (error: any) {
        console.error("❌ Error checking all tokens:", error.message);
    }
}

async function checkTokensByOwner(nftContract: any, ownerAddress: string): Promise<void> {
    try {
        console.log(`\n👤 Checking tokens owned by: ${ownerAddress}`);
        
        const tokenIds = await nftContract.getTokensByOwner(ownerAddress);
        console.log(`📊 Tokens owned: ${tokenIds.length}`);
        
        if (tokenIds.length === 0) {
            console.log("No tokens owned by this address.");
            return;
        }
        
        for (const tokenId of tokenIds) {
            await checkTokenURI(nftContract, Number(tokenId));
        }
        
    } catch (error: any) {
        console.error("❌ Error checking tokens by owner:", error.message);
    }
}

async function checkContractInfo(nftContract: any): Promise<void> {
    try {
        console.log(`\n📋 Contract Information:`);
        
        const name = await nftContract.name();
        const symbol = await nftContract.symbol();
        const totalSupply = await nftContract.totalSupply();
        const contractURI = await nftContract.contractURI();
        
        console.log(`   Name: ${name}`);
        console.log(`   Symbol: ${symbol}`);
        console.log(`   Total Supply: ${totalSupply}`);
        console.log(`   Contract URI: ${contractURI}`);
        
        // Check supported interfaces
        const erc721InterfaceId = "0x80ac58cd";
        const erc721MetadataInterfaceId = "0x5b5e139f";
        const erc4906InterfaceId = "0x49064906";
        
        const supportsERC721 = await nftContract.supportsInterface(erc721InterfaceId);
        const supportsERC721Metadata = await nftContract.supportsInterface(erc721MetadataInterfaceId);
        const supportsERC4906 = await nftContract.supportsInterface(erc4906InterfaceId);
        
        console.log(`\n🔧 Supported Interfaces:`);
        console.log(`   ERC721: ${supportsERC721}`);
        console.log(`   ERC721Metadata: ${supportsERC721Metadata}`);
        console.log(`   ERC4906 (Metadata Update): ${supportsERC4906}`);
        
    } catch (error: any) {
        console.error("❌ Error checking contract info:", error.message);
    }
}

async function main() {
    console.log("🔍 Checking Token URIs...");
    console.log(`📡 Network: ${network.name}`);
    
    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer: ${signer.address}`);
    
    try {
        // Load deployment info
        const deploymentInfo = await loadLatestDeployment();
        if (!deploymentInfo || !deploymentInfo.nftContract) {
            throw new Error("NFT Contract not found in deployment info. Please deploy the NFT contract first.");
        }
        
        console.log(`📄 NFT Contract Address: ${deploymentInfo.nftContract}`);
        
        // Get contract instance
        const nftContract = await ethers.getContractAt("NFTContract", deploymentInfo.nftContract);
        
        // Check contract info
        await checkContractInfo(nftContract);
        
        // Get command line arguments
        const args = process.argv.slice(2);
        const command = args[0];

        await checkAllTokens(nftContract);
        
        if (command === "all") {
            // Check all tokens
            await checkAllTokens(nftContract);
        } else if (command === "owner") {
            // Check tokens by owner
            const ownerAddress = args[1];
            if (!ownerAddress) {
                console.log("❌ Please provide owner address: npm run check-token-uri owner <address>");
                return;
            }
            await checkTokensByOwner(nftContract, ownerAddress);
        } else if (command === "token") {
            // Check specific token
            const tokenId = parseInt(args[1]);
            if (isNaN(tokenId)) {
                console.log("❌ Please provide valid token ID: npm run check-token-uri token <tokenId>");
                return;
            }
            await checkTokenURI(nftContract, tokenId);
        }
    } catch (error: any) {
        console.error("❌ Token URI check failed:", error.message);
        throw error;
    }
}

main()
    .then(() => {
        console.log("✅ Token URI check completed successfully");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Token URI check failed:", error);
        process.exit(1);
    });