import { ethers } from "hardhat";

async function main() {
  const vrfConsumerAddress = "0x277c9A920148a244FBB3dC3596aE1C99139cC7b7";
  const deployerAddress = "0x698cAA301eB22880a0F2A75bf45C3887145C21dD";
  
  console.log("🔧 Authorizing deployer address for VRF testing...");
  
  const vrfConsumer = await ethers.getContractAt("ChainlinkVRFConsumer", vrfConsumerAddress);
  
  try {
    const tx = await vrfConsumer.addAuthorizedCaller(deployerAddress);
    await tx.wait();
    console.log("✅ Deployer authorized for VRF requests!");
    
    // Verify authorization
    const isAuthorized = await vrfConsumer.authorizedCallers(deployerAddress);
    console.log("Verification - Deployer authorized:", isAuthorized);
    
  } catch (error) {
    console.error("❌ Error authorizing deployer:", error);
    if (error.message.includes("already authorized")) {
      console.log("✅ Deployer was already authorized!");
    }
  }
}

main().catch(console.error);