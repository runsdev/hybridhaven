import { ethers } from "hardhat";

async function main() {
    // Deploy the GameContract
    const GameContract = await ethers.getContractFactory("GameContract");
    const gameContract = await GameContract.deploy();
    await gameContract.deployed();
    console.log("GameContract deployed to:", gameContract.address);

    // Deploy the NFTContract
    const NFTContract = await ethers.getContractFactory("NFTContract");
    const nftContract = await NFTContract.deploy();
    await nftContract.deployed();
    console.log("NFTContract deployed to:", nftContract.address);
}

// Execute the deployment script
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });