import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying MockVRFConsumer for development...");
  
  // Deploy MockVRFConsumer
  const MockVRFConsumer = await ethers.getContractFactory("MockVRFConsumer");
  const mockVRF = await MockVRFConsumer.deploy();
  await mockVRF.waitForDeployment();
  
  const mockVRFAddress = await mockVRF.getAddress();
  console.log("✅ MockVRFConsumer deployed to:", mockVRFAddress);
  
  // Authorize the Game contract to use the mock VRF
  const gameContractAddress = "0xe29Ace93198C74373F51bCf61c2b9Fbee462E469";
  console.log("🔧 Authorizing Game contract...");
  
  const tx1 = await mockVRF.addAuthorizedCaller(gameContractAddress);
  await tx1.wait();
  console.log("✅ Game contract authorized");
  
  // Also authorize the deployer for testing
  const [deployer] = await ethers.getSigners();
  const tx2 = await mockVRF.addAuthorizedCaller(deployer.address);
  await tx2.wait();
  console.log("✅ Deployer authorized");
  
  // Update the Game contract to use the new mock VRF
  console.log("🔄 Updating Game contract to use MockVRFConsumer...");
  const gameContract = await ethers.getContractAt("GameContract", gameContractAddress);
  
  const tx3 = await gameContract.setVRFConsumer(mockVRFAddress);
  await tx3.wait();
  console.log("✅ Game contract updated to use MockVRFConsumer");
  
  // Test the mock VRF
  console.log("🧪 Testing mock VRF...");
  const requestId = await mockVRF.requestRandomWords();
  console.log("✅ Mock VRF test successful!");
  
  console.log("");
  console.log("📋 Deployment Summary:");
  console.log("MockVRFConsumer:", mockVRFAddress);
  console.log("Game Contract:", gameContractAddress);
  console.log("Status: Ready for testing!");
  console.log("");
  console.log("🎮 You can now test the merge functionality without Chainlink VRF setup!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });