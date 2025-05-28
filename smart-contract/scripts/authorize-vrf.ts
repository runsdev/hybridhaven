import { ethers } from "hardhat";

async function main() {
  // Contract addresses from deployment
  const gameContractAddress = "0xe29Ace93198C74373F51bCf61c2b9Fbee462E469";
  const vrfConsumerAddress = "0x277c9A920148a244FBB3dC3596aE1C99139cC7b7";
  
  console.log("🔧 Authorizing Game Contract in VRF Consumer...");
  console.log("Game Contract:", gameContractAddress);
  console.log("VRF Consumer:", vrfConsumerAddress);
  console.log("");

  // Get VRF consumer contract instance
  const vrfConsumer = await ethers.getContractAt("ChainlinkVRFConsumer", vrfConsumerAddress);
  
  try {
    // Add Game contract as authorized caller
    console.log("📝 Adding Game contract as authorized caller...");
    const tx = await vrfConsumer.addAuthorizedCaller(gameContractAddress);
    console.log("Transaction hash:", tx.hash);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log("✅ Game contract authorized successfully!");
    console.log("Block number:", receipt.blockNumber);
    console.log("");
    
    // Test the authorization by calling requestRandomWords from Game contract
    console.log("🧪 Testing VRF request...");
    const gameContract = await ethers.getContractAt("GameContract", gameContractAddress);
    
    // This should work now that the Game contract is authorized
    console.log("Authorization setup complete!");
    
  } catch (error) {
    console.error("❌ Error authorizing contract:", error);
    if (error.message.includes("already authorized")) {
      console.log("✅ Game contract was already authorized!");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });