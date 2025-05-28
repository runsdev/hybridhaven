import { ethers } from "hardhat";

async function main() {
  // Contract addresses from deployment
  const gameContractAddress = "0xe29Ace93198C74373F51bCf61c2b9Fbee462E469";
  const nftContractAddress = "0x3bDA57c0D6a95d79806E3E1a648A2287Eb93DD60";
  const vrfConsumerAddress = "0x277c9A920148a244FBB3dC3596aE1C99139cC7b7";
  
  console.log("🔍 Comprehensive VRF Configuration Check...");
  console.log("VRF Consumer:", vrfConsumerAddress);
  console.log("");

  // Get VRF consumer contract instance
  const vrfConsumer = await ethers.getContractAt("ChainlinkVRFConsumer", vrfConsumerAddress);
  
  try {
    // Check VRF configuration
    console.log("📋 VRF Configuration Status:");
    const config = await vrfConsumer.getConfig();
    
    console.log("Subscription ID:", config.subscriptionId.toString());
    console.log("Key Hash:", config.keyHashValue);
    console.log("Callback Gas Limit:", config.gasLimit.toString());
    console.log("Request Confirmations:", config.confirmations.toString());
    console.log("Number of Words:", config.words.toString());
    console.log("");
    
    // Check if configuration is complete
    const isConfigured = config.subscriptionId > 0 && config.keyHashValue !== "0x0000000000000000000000000000000000000000000000000000000000000000";
    console.log("🔧 Configuration Status:");
    console.log("Subscription ID set:", config.subscriptionId > 0);
    console.log("Key Hash set:", config.keyHashValue !== "0x0000000000000000000000000000000000000000000000000000000000000000");
    console.log("Fully configured:", isConfigured);
    console.log("");
    
    // Check authorization
    console.log("🔑 Authorization Status:");
    const gameContractAuthorized = await vrfConsumer.authorizedCallers(gameContractAddress);
    const deployer = await vrfConsumer.deployer();
    
    console.log("Deployer:", deployer);
    console.log("Game Contract authorized:", gameContractAuthorized);
    console.log("");
    
    if (!isConfigured) {
      console.log("❌ VRF Consumer is not fully configured!");
      console.log("Required configuration for Sepolia testnet:");
      console.log("- Subscription ID: Must be > 0 (create on VRF Coordinator)");
      console.log("- Key Hash: 0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae (Sepolia 30 gwei)");
      console.log("");
      console.log("To fix this issue:");
      console.log("1. Create a VRF subscription on Chainlink VRF");
      console.log("2. Fund the subscription with LINK tokens");
      console.log("3. Set the subscription ID and key hash using the configuration functions");
    } else {
      console.log("✅ VRF Consumer appears to be properly configured!");
    }
    
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