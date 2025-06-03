import { ethers } from "hardhat";

async function main() {
  // Contract addresses from deployment
  const gameContractAddress = "0xe29Ace93198C74373F51bCf61c2b9Fbee462E469";
  const vrfConsumerAddress = "0x277c9A920148a244FBB3dC3596aE1C99139cC7b7";
  
  console.log("ℹ️ VRF Consumer Access Info");
  console.log("Game Contract:", gameContractAddress);
  console.log("VRF Consumer:", vrfConsumerAddress);
  console.log("");

  console.log("✅ No authorization needed! The VRF Consumer has been modified to allow any user or contract to call requestRandomWords.");
  console.log("🔓 The access restriction has been removed to facilitate more flexible integration.");
  
  // Get VRF consumer contract instance to check current configuration
  const vrfConsumer = await ethers.getContractAt("ChainlinkVRFConsumer", vrfConsumerAddress);
  
  try {
    // Display current VRF configuration
    console.log("\n📊 Current VRF Configuration:");
    const subscriptionId = await vrfConsumer.s_subscriptionId();
    console.log("Subscription ID:", subscriptionId.toString());
    
    const keyHash = await vrfConsumer.keyHash();
    console.log("Key Hash:", keyHash);
    
    const callbackGasLimit = await vrfConsumer.callbackGasLimit();
    console.log("Callback Gas Limit:", callbackGasLimit.toString());
    
    const requestConfirmations = await vrfConsumer.requestConfirmations();
    console.log("Request Confirmations:", requestConfirmations.toString());
    
    const numWords = await vrfConsumer.numWords();
    console.log("Number of Words:", numWords.toString());
    
    console.log("\n🧪 VRF is ready to be called by any contract or user!");
    
  } catch (error) {
    console.error("❌ Error checking VRF configuration:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });