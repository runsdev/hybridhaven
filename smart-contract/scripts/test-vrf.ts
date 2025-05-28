import { ethers } from "hardhat";

async function main() {
  // Contract addresses
  const vrfConsumerAddress = "0x277c9A920148a244FBB3dC3596aE1C99139cC7b7";
  const gameContractAddress = "0xe29Ace93198C74373F51bCf61c2b9Fbee462E469";
  
  // Sepolia VRF Coordinator address
  const vrfCoordinatorAddress = "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B";
  
  console.log("🔍 Testing VRF Request Flow...");
  console.log("");

  const vrfConsumer = await ethers.getContractAt("ChainlinkVRFConsumer", vrfConsumerAddress);
  
  try {
    // Try to simulate the requestRandomWords call that's failing
    console.log("🧪 Simulating VRF request...");
    
    // Get the current signer (should be the deployer/authorized address)
    const [signer] = await ethers.getSigners();
    console.log("Current signer:", signer.address);
    
    // Check if this address is authorized
    const isAuthorized = await vrfConsumer.authorizedCallers(signer.address);
    console.log("Signer is authorized:", isAuthorized);
    
    if (isAuthorized) {
      // Try to estimate gas for the VRF request
      console.log("Estimating gas for VRF request...");
      const gasEstimate = await vrfConsumer.requestRandomWords.estimateGas();
      console.log("Gas estimate:", gasEstimate.toString());
      
      console.log("✅ VRF request simulation successful!");
      console.log("The issue might be specific to the Game contract calling the VRF consumer.");
    } else {
      console.log("❌ Current signer is not authorized to make VRF requests");
    }
    
    // Check the Game contract's ability to call VRF
    console.log("");
    console.log("🎮 Testing Game Contract VRF Access...");
    const gameContract = await ethers.getContractAt("GameContract", gameContractAddress);
    
    // Try to see if we can call canPlayerMerge (this should work)
    const testAddress = "0x698cAA301eB22880a0F2A75bf45C3887145C21dD";
    const canMerge = await gameContract.canPlayerMerge(testAddress);
    console.log("Player can merge:", canMerge);
    
    // The issue might be that we need to add the VRF consumer as a consumer 
    // in the Chainlink VRF subscription management
    console.log("");
    console.log("💡 Potential Issue:");
    console.log("The VRF subscription might need to explicitly add this VRF consumer contract");
    console.log("as an authorized consumer. This is done through the Chainlink VRF UI at:");
    console.log("https://vrf.chain.link/sepolia");
    
  } catch (error) {
    console.error("❌ Error during VRF test:", error);
    
    if (error.message.includes("0x1f6a65b6")) {
      console.log("");
      console.log("🎯 Found the same error! This confirms the issue is in the VRF request.");
      console.log("The most likely cause is that the VRF subscription doesn't have this");
      console.log("consumer contract added as an authorized consumer.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });