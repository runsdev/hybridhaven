import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameContract", function () {
    let GameContract;
    let gameContract;
    let NFTContract;
    let nftContract;

    beforeEach(async function () {
        NFTContract = await ethers.getContractFactory("NFTContract");
        nftContract = await NFTContract.deploy();
        await nftContract.deployed();

        GameContract = await ethers.getContractFactory("GameContract");
        gameContract = await GameContract.deploy(nftContract.address);
        await gameContract.deployed();
    });

    it("should allow a player to start the game", async function () {
        const [player] = await ethers.getSigners();
        await gameContract.connect(player).startGame();
        const gameStatus = await gameContract.getGameStatus(player.address);
        expect(gameStatus).to.equal(true);
    });

    it("should allow players to select and merge entities", async function () {
        const [player] = await ethers.getSigners();
        await gameContract.connect(player).startGame();
        await gameContract.connect(player).selectEntity(1);
        await gameContract.connect(player).selectEntity(2);
        
        const mergeResult = await gameContract.connect(player).mergeEntities();
        expect(mergeResult).to.emit(gameContract, "EntitiesMerged");
    });

    it("should mint an NFT after merging entities", async function () {
        const [player] = await ethers.getSigners();
        await gameContract.connect(player).startGame();
        await gameContract.connect(player).selectEntity(1);
        await gameContract.connect(player).selectEntity(2);
        await gameContract.connect(player).mergeEntities();

        const nftOwner = await nftContract.ownerOf(1); // Assuming the first NFT is minted
        expect(nftOwner).to.equal(player.address);
    });
});