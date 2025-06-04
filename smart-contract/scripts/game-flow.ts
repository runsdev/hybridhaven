import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Define interfaces
interface DeploymentAddresses {
  vrfConsumer: string;
  nftContract: string;
  gameContract: string;
  network: string;
  deployer: string;
  timestamp: string;
  vrfSubscriptionId?: string;
}

async function main() {
  console.log("🎮 Hybrid Haven Game Flow Demo - Merge Starters");
  console.log("=============================================");
  
  // Get the latest deployment info
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const latestFilepath = path.join(deploymentsDir, "sepolia-latest.json");
  
  if (!fs.existsSync(latestFilepath)) {
    throw new Error("❌ No deployment found! Run deploy.ts first.");
  }
  
  const deploymentInfo: DeploymentAddresses = JSON.parse(
    fs.readFileSync(latestFilepath, "utf8")
  );
  
  console.log(`📡 Using contracts deployed to ${deploymentInfo.network}`);
  console.log(`🎮 Game Contract: ${deploymentInfo.gameContract}`);
  console.log(`🖼️  NFT Contract: ${deploymentInfo.nftContract}`);
  console.log(`🎲 VRF Consumer: ${deploymentInfo.vrfConsumer}`);
  
  // Get signer
  const [player] = await ethers.getSigners();
  console.log(`\n👤 Player: ${player.address}`);
  
  // Get contract instances
  const gameContract = await ethers.getContractAt("GameContract", deploymentInfo.gameContract);
  const nftContract = await ethers.getContractAt("NFTContract", deploymentInfo.nftContract);
  const vrfConsumer = await ethers.getContractAt("ChainlinkVRFConsumer", deploymentInfo.vrfConsumer);
  
  // 1. Check if player can merge
  const canMerge = await gameContract.canPlayerMerge(player.address);
  if (!canMerge) {
    const timeLeft = await gameContract.timeUntilNextMerge(player.address);
    console.log(`⏳ Cannot merge yet. Time left: ${timeLeft} seconds`);
    // If we want to continue anyway for demo purposes, we would need owner to update cooldown
    // await gameContract.connect(owner).updateMergeCooldown(0);
  } else {
    console.log("✅ Player can merge (cooldown passed)");
  }
  
  // 2. Choose two starter entities
  const starterEntities = await gameContract.getStarterEntities();
  console.log("\n🔥 Available starter entities:");
  
  for (let i = 0; i < starterEntities.length; i += 5) {
    console.log("   " + starterEntities.slice(i, i + 5).join(", "));
  }
  
  // For this demo, we'll choose "Fire" and "Water" as our starters
  const entity1Name = "Fire";
  const entity2Name = "Water";
  
  console.log(`\n🧪 Selected starters: ${entity1Name} + ${entity2Name}`);
  
  // 3. Request merge with two starter entities
  console.log("\n📝 Requesting merge...");
  
  // Parameters for merging two starters:
  // entity1Name, entity2Name, entity1IsStarter, entity2IsStarter, entity1TokenId, entity2TokenId
  const mergeTx = await gameContract.requestMerge(
    entity1Name,         // entity1Name
    entity2Name,         // entity2Name
    true,                // entity1IsStarter (true for starter)
    true,                // entity2IsStarter (true for starter)
    0,                   // entity1TokenId (0 for starters)
    0,                   // entity2TokenId (0 for starters)
    { value: ethers.parseEther("0.0001") } // Payment required for merge
  );
  
  console.log("⏳ Waiting for merge transaction...");
  const mergeReceipt = await mergeTx.wait();
  console.log("✅ Merge requested successfully");
  
  // 4. Extract the RequestId from the event
  let requestId: bigint | undefined;
  
  for (const log of mergeReceipt!.logs) {
    try {
      // Try to parse as MergeRequested event
      const parsedLog = gameContract.interface.parseLog({
        topics: log.topics as string[],
        data: log.data
      });
      
      if (parsedLog && parsedLog.name === 'MergeRequested') {
        requestId = parsedLog.args.requestId;
        console.log(`📋 Merge request ID: ${requestId}`);
        break;
      }
    } catch (error) {
      // Skip logs that don't match our event
      continue;
    }
  }
  
  if (!requestId) {
    throw new Error("❌ Failed to extract requestId from transaction");
  }
  
  // 5. Check for VRF fulfillment
  console.log("\n⏳ Waiting for Chainlink VRF to fulfill the random number...");
  console.log("    (This would normally happen after the VRF oracle fulfills the request)");
  console.log("    (For testing, you may need to wait or simulate the response)");
  
  // In a real scenario, we'd need to wait for the Chainlink VRF to fulfill the request
  // This could take some time on a real network
  
  // For demo purposes, let's check if the request is fulfilled
  let randomnessReady = false;
  let attempts = 0;
  const maxAttempts = 100; // Increase this on a real network
  
  while (!randomnessReady && attempts < maxAttempts) {
    attempts++;
    try {
      randomnessReady = await gameContract.isRandomnessReady(requestId);
      if (randomnessReady) {
        console.log("✅ VRF request fulfilled!");
        
        // Get the randomness (for demonstration purposes)
        const randomness = await gameContract.getRequestRandomness(requestId);
        console.log(`🎲 Random number: ${randomness}`);
        break;
      }
    } catch (error) {
      // Ignore errors, just retry
    }
    
    console.log(`⏳ Attempt ${attempts}/${maxAttempts}: Randomness not ready yet...`);
    
    // Wait 5 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  if (!randomnessReady) {
    console.log("⚠️  VRF request not fulfilled yet. In a real scenario:");
    console.log("   1. The backend would monitor for VRF fulfillment");
    console.log("   2. Once fulfilled, it would call completeMerge with the new entity details");
    console.log("\n🔄 Let's simulate the backend completing the merge...");
  }
  
  // 6. Complete the merge (normally done by backend)
  // First, ensure we have the backend role
  const backendAddress = await gameContract.getBackendAddress();
  const owner = (await ethers.getSigners())[0]; // Assuming first signer is owner
  
  if (backendAddress !== owner.address) {
    console.log("\n🔑 Setting backend address to our account for demo purposes...");
    await gameContract.setBackendAddress(owner.address);
    console.log("✅ Backend address updated");
  }
  
  // Generate a hybrid name
  const newEntityName = `${entity1Name}${entity2Name}`; // e.g., "FireWater"
  
  // In a real scenario, the backend would generate an image and metadata
  // For this demo, we'll use a placeholder IPFS URI
  const imageURI = "QmPlaceholderIPFSHash";
  
  console.log(`\n🧬 Creating hybrid: "${newEntityName}" with IPFS URI: ${imageURI}`);
  
  // Complete the merge
  const completeTx = await gameContract.completeMerge(
    requestId,
    newEntityName,
    imageURI
  );
  
  console.log("⏳ Waiting for completion transaction...");
  const completeReceipt = await completeTx.wait();
  console.log("✅ Merge completed successfully!");
  
  // 7. Extract the new token ID from the event
  let newTokenId: bigint | undefined;
  
  for (const log of completeReceipt!.logs) {
    try {
      // Try to parse as EntityMinted event from NFT contract
      const parsedLog = nftContract.interface.parseLog({
        topics: log.topics as string[],
        data: log.data
      });
      
      if (parsedLog && parsedLog.name === 'EntityMinted') {
        newTokenId = parsedLog.args.tokenId;
        console.log(`🎉 New hybrid entity minted with token ID: ${newTokenId}`);
        break;
      }
    } catch (error) {
      // Skip logs that don't match our event
      continue;
    }
  }
  
  if (!newTokenId) {
    for (const log of completeReceipt!.logs) {
      try {
        // Try to parse as MergeCompleted event from game contract
        const parsedLog = gameContract.interface.parseLog({
          topics: log.topics as string[],
          data: log.data
        });
        
        if (parsedLog && parsedLog.name === 'MergeCompleted') {
          newTokenId = parsedLog.args.newEntityId;
          console.log(`🎉 New hybrid entity minted with token ID: ${newTokenId}`);
          break;
        }
      } catch (error) {
        // Skip logs that don't match our event
        continue;
      }
    }
  }
  
  if (!newTokenId) {
    throw new Error("❌ Failed to extract newTokenId from transaction");
  }
  
  // 8. Verify the entity data and ownership
  const entity = await nftContract.getEntity(newTokenId);
  console.log("\n📋 New hybrid entity details:");
  console.log(`   Name: ${entity.name}`);
  console.log(`   Rarity: ${entity.rarity} stars`);
  console.log(`   Parents: ${entity.parent1} + ${entity.parent2}`);
  console.log(`   Created At: ${new Date(Number(entity.createdAt) * 1000).toISOString()}`);
  
  const tokenOwner = await nftContract.ownerOf(newTokenId);
  console.log(`\n👤 Owner: ${tokenOwner}`);
  console.log(`   Expected: ${player.address}`);
  console.log(`   Match: ${tokenOwner.toLowerCase() === player.address.toLowerCase() ? '✅' : '❌'}`);
  
  // 9. Show token balance
  const playerTokens = await nftContract.getTokensByOwner(player.address);
  console.log(`\n💼 Player now owns ${playerTokens.length} hybrid entities`);

  // 10. Display all owned entities
    console.log("\n🖼️ Owned entities:");
    if (playerTokens.length === 0) {
        console.log("   No entities owned yet");
    } else {
        for (let i = 0; i < playerTokens.length; i++) {
            const tokenId = playerTokens[i];
            const entityDetails = await nftContract.getEntity(tokenId);
            
            console.log(`   [${tokenId}] ${entityDetails.name} (${entityDetails.rarity}⭐) - Parents: ${entityDetails.parent1} + ${entityDetails.parent2}`);
        }
    }
  
  console.log("\n✅ Game flow demonstration completed!");
}

// Execute script
main()
  .then(() => {
    console.log("✅ Game flow script executed successfully");
    process.exit(0);
  })
  .catch(error => {
    console.error("❌ Error:", error);
    process.exit(1);
  });