import { ethers } from "hardhat";

async function main() {
  // Contract addresses from deployment
  const gameContractAddress = "0xe29Ace93198C74373F51bCf61c2b9Fbee462E469";
  const nftContractAddress = "0x3bDA57c0D6a95d79806E3E1a648A2287Eb93DD60";
  const vrfConsumerAddress = "0x277c9A920148a244FBB3dC3596aE1C99139cC7b7";
  
  // Player address from the error log
  const playerAddress = "0x698cAA301eB22880a0F2A75bf45C3887145C21dD";
  
  console.log("🔍 Diagnosing merge failure...");
  console.log("Player:", playerAddress);
  console.log("Game Contract:", gameContractAddress);
  console.log("NFT Contract:", nftContractAddress);
  console.log("VRF Consumer:", vrfConsumerAddress);
  console.log("");

  // Get contract instances
  const gameContract = await ethers.getContractAt("GameContract", gameContractAddress);
  const nftContract = await ethers.getContractAt("NFTContract", nftContractAddress);
  
  try {
    // Check contract configuration
    console.log("📋 Contract Configuration:");
    const nftContractInGame = await gameContract.getNFTContract();
    const vrfConsumerInGame = await gameContract.getVRFConsumer();
    const backendAddress = await gameContract.getBackendAddress();
    
    console.log("NFT Contract set in Game:", nftContractInGame);
    console.log("VRF Consumer set in Game:", vrfConsumerInGame);
    console.log("Backend Address set:", backendAddress);
    console.log("NFT Contract configured:", nftContractInGame.toLowerCase() === nftContractAddress.toLowerCase());
    console.log("VRF Consumer configured:", vrfConsumerInGame.toLowerCase() === vrfConsumerAddress.toLowerCase());
    console.log("");

    // Check player state
    console.log("👤 Player State:");
    const canMerge = await gameContract.canPlayerMerge(playerAddress);
    const timeUntilNext = await gameContract.timeUntilNextMerge(playerAddress);
    const pendingRequests = await gameContract.getPendingRequests(playerAddress);
    
    console.log("Can merge:", canMerge);
    console.log("Time until next merge:", timeUntilNext.toString(), "seconds");
    console.log("Pending requests:", pendingRequests.length);
    console.log("");

    // Check entity ownership for the failed transaction (entities 2 and 3)
    console.log("🎮 Entity Ownership Check:");
    try {
      const entity2Owner = await nftContract.ownerOf(2);
      const entity3Owner = await nftContract.ownerOf(3);
      console.log("Entity 2 owner:", entity2Owner);
      console.log("Entity 3 owner:", entity3Owner);
      console.log("Player owns entity 2:", entity2Owner.toLowerCase() === playerAddress.toLowerCase());
      console.log("Player owns entity 3:", entity3Owner.toLowerCase() === playerAddress.toLowerCase());
    } catch (error) {
      console.log("❌ Error checking entity ownership:", error.message);
    }
    
    // Check if NFT contract is properly configured
    console.log("");
    console.log("🔗 Contract Permissions:");
    const gameContractOwner = await gameContract.owner();
    const nftContractOwner = await nftContract.owner();
    console.log("Game Contract owner:", gameContractOwner);
    console.log("NFT Contract owner:", nftContractOwner);
    
  } catch (error) {
    console.error("❌ Error during diagnosis:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });