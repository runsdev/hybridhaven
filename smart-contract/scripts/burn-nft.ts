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

async function burnSingleToken(nftContract: any, tokenId: number, signer: any): Promise<void> {
    try {
        console.log(`\n🔥 Burning Token ID: ${tokenId}`);
        
        // Check if token exists
        const exists = await nftContract.exists(tokenId);
        if (!exists) {
            console.log(`❌ Token ${tokenId} does not exist`);
            return;
        }
        
        // Get token info before burning
        const owner = await nftContract.ownerOf(tokenId);
        const entity: EntityInfo = await nftContract.getEntity(tokenId);
        
        console.log(`📝 Token Info:`);
        console.log(`   Owner: ${owner}`);
        console.log(`   Name: ${entity.name}`);
        console.log(`   Rarity: ${entity.rarity}`);
        console.log(`   Created: ${new Date(Number(entity.createdAt) * 1000).toISOString()}`);
        
        // Check if signer can burn this token
        const contractOwner = await nftContract.owner();
        const canBurn = owner === signer.address || contractOwner === signer.address;
        
        if (!canBurn) {
            console.log(`❌ Cannot burn token ${tokenId}. Must be token owner or contract owner.`);
            console.log(`   Token owner: ${owner}`);
            console.log(`   Contract owner: ${contractOwner}`);
            console.log(`   Your address: ${signer.address}`);
            return;
        }
        
        // Estimate gas
        const gasEstimate = await nftContract.burn.estimateGas(tokenId);
        console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);
        
        // Confirm before burning
        console.log(`⚠️  WARNING: This action is irreversible!`);
        console.log(`   Token ID ${tokenId} (${entity.name}) will be permanently destroyed.`);
        
        // Burn the token
        const tx = await nftContract.burn(tokenId);
        console.log(`📤 Transaction sent: ${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`✅ Token ${tokenId} burned successfully!`);
        console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
        console.log(`   Block: ${receipt.blockNumber}`);
        
    } catch (error: any) {
        console.error(`❌ Error burning token ${tokenId}:`, error.message);
        if (error.reason) {
            console.error(`   Reason: ${error.reason}`);
        }
    }
}

async function burnBatchTokens(nftContract: any, tokenIds: number[], signer: any): Promise<void> {
    try {
        console.log(`\n🔥 Batch Burning ${tokenIds.length} tokens...`);
        
        // Check if signer is contract owner (required for batch burn)
        const contractOwner = await nftContract.owner();
        if (contractOwner !== signer.address) {
            console.log(`❌ Batch burn requires contract owner privileges.`);
            console.log(`   Contract owner: ${contractOwner}`);
            console.log(`   Your address: ${signer.address}`);
            return;
        }
        
        // Validate tokens
        const validTokenIds: number[] = [];
        for (const tokenId of tokenIds) {
            const exists = await nftContract.exists(tokenId);
            if (exists) {
                validTokenIds.push(tokenId);
                const entity: EntityInfo = await nftContract.getEntity(tokenId);
                console.log(`   ✓ Token ${tokenId}: ${entity.name} (Rarity: ${entity.rarity})`);
            } else {
                console.log(`   ❌ Token ${tokenId}: Does not exist`);
            }
        }
        
        if (validTokenIds.length === 0) {
            console.log(`❌ No valid tokens to burn`);
            return;
        }
        
        console.log(`\n📊 Summary:`);
        console.log(`   Valid tokens: ${validTokenIds.length}`);
        console.log(`   Invalid tokens: ${tokenIds.length - validTokenIds.length}`);
        
        // Estimate gas
        const gasEstimate = await nftContract.batchBurn.estimateGas(validTokenIds);
        console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);
        
        // Confirm before burning
        console.log(`⚠️  WARNING: This action is irreversible!`);
        console.log(`   ${validTokenIds.length} tokens will be permanently destroyed.`);
        
        // Batch burn
        const tx = await nftContract.batchBurn(validTokenIds);
        console.log(`📤 Transaction sent: ${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`✅ Batch burn completed successfully!`);
        console.log(`   Tokens burned: ${validTokenIds.length}`);
        console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
        console.log(`   Block: ${receipt.blockNumber}`);
        
    } catch (error: any) {
        console.error(`❌ Error in batch burn:`, error.message);
        if (error.reason) {
            console.error(`   Reason: ${error.reason}`);
        }
    }
}

async function burnTokensByOwner(nftContract: any, ownerAddress: string, signer: any): Promise<void> {
    try {
        console.log(`\n🔥 Burning all tokens owned by: ${ownerAddress}`);
        
        // Check if signer is contract owner (required for this operation)
        const contractOwner = await nftContract.owner();
        if (contractOwner !== signer.address) {
            console.log(`❌ This operation requires contract owner privileges.`);
            console.log(`   Contract owner: ${contractOwner}`);
            console.log(`   Your address: ${signer.address}`);
            return;
        }
        
        // Get tokens owned by address
        const tokenIds = await nftContract.getTokensByOwner(ownerAddress);
        
        if (tokenIds.length === 0) {
            console.log(`❌ No tokens owned by ${ownerAddress}`);
            return;
        }
        
        console.log(`📊 Found ${tokenIds.length} tokens to burn:`);
        for (const tokenId of tokenIds) {
            const entity: EntityInfo = await nftContract.getEntity(tokenId);
            console.log(`   Token ${tokenId}: ${entity.name} (Rarity: ${entity.rarity})`);
        }
        
        // Convert BigInt array to number array
        const tokenIdsNumbers = tokenIds.map(id => Number(id));
        
        // Use batch burn function
        await burnBatchTokens(nftContract, tokenIdsNumbers, signer);
        
    } catch (error: any) {
        console.error(`❌ Error burning tokens by owner:`, error.message);
    }
}

async function showBurnableTokens(nftContract: any, signer: any): Promise<void> {
    try {
        console.log(`\n📋 Tokens you can burn:`);
        
        const contractOwner = await nftContract.owner();
        const isContractOwner = contractOwner === signer.address;
        
        console.log(`👤 Your address: ${signer.address}`);
        console.log(`🏛️  Contract owner: ${contractOwner}`);
        console.log(`👑 You are contract owner: ${isContractOwner}`);
        
        // Get tokens owned by signer
        const ownedTokens = await nftContract.getTokensByOwner(signer.address);
        
        if (ownedTokens.length > 0) {
            console.log(`\n🎯 Tokens you own (can burn):`);
            for (const tokenId of ownedTokens) {
                const entity: EntityInfo = await nftContract.getEntity(tokenId);
                console.log(`   Token ${tokenId}: ${entity.name} (Rarity: ${entity.rarity})`);
            }
        } else {
            console.log(`\n❌ You don't own any tokens`);
        }
        
        if (isContractOwner) {
            const totalSupply = await nftContract.totalSupply();
            console.log(`\n👑 As contract owner, you can burn any of the ${totalSupply} existing tokens`);
        }
        
    } catch (error: any) {
        console.error(`❌ Error showing burnable tokens:`, error.message);
    }
}

async function main() {
    console.log("🔥 NFT Burn Script");
    console.log(`📡 Network: ${network.name}`);
    
    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer: ${signer.address}`);
    
    const balance = await ethers.provider.getBalance(signer.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
    
    try {
        // Load deployment info
        const deploymentInfo = await loadLatestDeployment();
        if (!deploymentInfo || !deploymentInfo.nftContract) {
            throw new Error("NFT Contract not found in deployment info. Please deploy the NFT contract first.");
        }
        
        console.log(`📄 NFT Contract Address: ${deploymentInfo.nftContract}`);
        
        // Get contract instance
        const nftContract = await ethers.getContractAt("NFTContract", deploymentInfo.nftContract);
        
        // Get command line arguments
        const args = process.argv.slice(2);
        const command = args[0];
        
        if (command === "token") {
            // Burn specific token
            const tokenId = parseInt(args[1]);
            if (isNaN(tokenId)) {
                console.log("❌ Please provide valid token ID: npx hardhat run scripts/burn-nft.ts --network <network> -- token <tokenId>");
                return;
            }
            await burnSingleToken(nftContract, tokenId, signer);
            
        } else if (command === "batch") {
            // Burn multiple tokens
            const tokenIds = args.slice(1).map(id => parseInt(id)).filter(id => !isNaN(id));
            if (tokenIds.length === 0) {
                console.log("❌ Please provide valid token IDs: npx hardhat run scripts/burn-nft.ts --network <network> -- batch <tokenId1> <tokenId2> ...");
                return;
            }
            await burnBatchTokens(nftContract, tokenIds, signer);
            
        } else if (command === "owner") {
            // Burn all tokens by owner
            const ownerAddress = args[1];
            if (!ownerAddress || !ethers.isAddress(ownerAddress)) {
                console.log("❌ Please provide valid owner address: npx hardhat run scripts/burn-nft.ts --network <network> -- owner <address>");
                return;
            }
            await burnTokensByOwner(nftContract, ownerAddress, signer);
            
        } else if (command === "list") {
            // List burnable tokens
            await showBurnableTokens(nftContract, signer);
            
        } else {
            // Default: show help
            console.log(`\n📚 Usage:`);
            console.log(`   npx hardhat run scripts/burn-nft.ts --network <network>`);
            console.log(`   npx hardhat run scripts/burn-nft.ts --network <network> -- token <tokenId>`);
            console.log(`   npx hardhat run scripts/burn-nft.ts --network <network> -- batch <tokenId1> <tokenId2> ...`);
            console.log(`   npx hardhat run scripts/burn-nft.ts --network <network> -- owner <address>`);
            console.log(`   npx hardhat run scripts/burn-nft.ts --network <network> -- list`);
            
            console.log(`\n📝 Examples:`);
            console.log(`   npx hardhat run scripts/burn-nft.ts --network sepolia -- token 1`);
            console.log(`   npx hardhat run scripts/burn-nft.ts --network sepolia -- batch 1 2 3`);
            console.log(`   npx hardhat run scripts/burn-nft.ts --network sepolia -- owner 0x1234...`);
            console.log(`   npx hardhat run scripts/burn-nft.ts --network sepolia -- list`);
            
            console.log(`\n⚠️  Important Notes:`);
            console.log(`   • Token owners can burn their own tokens`);
            console.log(`   • Contract owner can burn any token`);
            console.log(`   • Batch operations require contract owner privileges`);
            console.log(`   • Burning is irreversible - tokens are permanently destroyed`);
            
            // Show burnable tokens by default
            await showBurnableTokens(nftContract, signer);
        }
        
    } catch (error: any) {
        console.error("❌ Burn script failed:", error.message);
        throw error;
    }
}

main()
    .then(() => {
        console.log("✅ Burn script completed successfully");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Burn script failed:", error);
        process.exit(1);
    });