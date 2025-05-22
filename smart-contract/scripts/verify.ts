import { run } from "hardhat";

async function verifyContract(contractAddress: string, args: any[]) {
    console.log("Verifying contract...");
    try {
        await run("verify:verify", {
            address: contractAddress,
            constructorArguments: args,
        });
        console.log("Contract verified successfully!");
    } catch (error) {
        console.error("Error verifying contract:", error);
    }
}

async function main() {
    const gameContractAddress = "YOUR_GAME_CONTRACT_ADDRESS"; // Replace with your deployed GameContract address
    const nftContractAddress = "YOUR_NFT_CONTRACT_ADDRESS"; // Replace with your deployed NFTContract address

    await verifyContract(gameContractAddress, []);
    await verifyContract(nftContractAddress, []);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });