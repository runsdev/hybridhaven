import { ethers } from "hardhat";

async function main() {
  const vrfConsumerAddress = "0x277c9A920148a244FBB3dC3596aE1C99139cC7b7";
  
  console.log("🔍 Testing VRF Request with detailed error analysis...");
  console.log("VRF Consumer:", vrfConsumerAddress);
  console.log("");

  const vrfConsumer = await ethers.getContractAt("ChainlinkVRFConsumer", vrfConsumerAddress);
  
  try {
    // Check configuration again
    const config = await vrfConsumer.getConfig();
    console.log("📋 Current Configuration:");
    console.log("- Subscription ID:", config.subscriptionId.toString());
    console.log("- Key Hash:", config.keyHashValue);
    console.log("- Callback Gas Limit:", config.gasLimit.toString());
    console.log("- Request Confirmations:", config.confirmations.toString());
    console.log("");

    // Try to make a VRF request with increased gas limit
    console.log("🧪 Attempting VRF request...");
    
    // First try with normal gas estimation
    const tx = await vrfConsumer.requestRandomWords({
      gasLimit: 500000 // Manually set a higher gas limit
    });
    
    console.log("Transaction hash:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ VRF request successful!");
    console.log("Block number:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());
    
    // Get the request ID from the transaction
    const events = receipt.logs;
    console.log("Events emitted:", events.length);
    
  } catch (error: any) {
    console.error("❌ VRF request failed with error:");
    console.error("Error message:", error.message);
    
    if (error.data) {
      console.error("Error data:", error.data);
    }
    
    if (error.reason) {
      console.error("Error reason:", error.reason);
    }
    
    // Specific error analysis
    if (error.message.includes("0x1f6a65b6")) {
      console.log("");
      console.log("🔍 Error Analysis:");
      console.log("This specific error code suggests the VRF Coordinator is rejecting the request.");
      console.log("Possible causes:");
      console.log("1. Gas limit too low for the callback");
      console.log("2. Subscription balance insufficient for the request cost");
      console.log("3. Key hash not supported on this network");
      console.log("4. Consumer contract not properly added to subscription");
    }
    
    // Try with different gas settings
    console.log("");
    console.log("🔧 Trying to update VRF configuration with higher gas limit...");
    try {
      const updateTx = await vrfConsumer.setVRFConfig(
        2500000, // Higher callback gas limit
        3,       // Request confirmations
        1        // Number of words
      );
      await updateTx.wait();
      console.log("✅ VRF configuration updated with higher gas limit");
      
      // Try the request again
      console.log("🧪 Retrying VRF request with new configuration...");
      const retryTx = await vrfConsumer.requestRandomWords({
        gasLimit: 600000
      });
      await retryTx.wait();
      console.log("✅ VRF request successful after configuration update!");
      
    } catch (retryError: any) {
      console.error("❌ Retry also failed:", retryError.message);
      console.log("");
      console.log("💡 Recommendation:");
      console.log("The issue appears to be with the Chainlink VRF subscription setup.");
      console.log("Please verify in the Chainlink VRF UI that:");
      console.log("1. The subscription has sufficient LINK balance");
      console.log("2. The consumer contract is properly added");
      console.log("3. The subscription is active and not paused");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });