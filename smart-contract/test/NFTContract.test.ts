import { expect } from "chai";
import { ethers } from "hardhat";

describe("NFTContract", function () {
    let NFTContract;
    let nftContract;
    let owner;
    let addr1;

    beforeEach(async function () {
        NFTContract = await ethers.getContractFactory("NFTContract");
        [owner, addr1] = await ethers.getSigners();
        nftContract = await NFTContract.deploy();
        await nftContract.deployed();
    });

    describe("Minting NFTs", function () {
        it("Should mint an NFT and assign it to the owner", async function () {
            const tokenURI = "https://example.com/token/1";
            await nftContract.mint(owner.address, tokenURI);
            expect(await nftContract.ownerOf(1)).to.equal(owner.address);
        });

        it("Should emit a Transfer event on minting", async function () {
            const tokenURI = "https://example.com/token/1";
            await expect(nftContract.mint(owner.address, tokenURI))
                .to.emit(nftContract, "Transfer")
                .withArgs(ethers.constants.AddressZero, owner.address, 1);
        });
    });

    describe("Querying NFT Ownership", function () {
        it("Should return the correct owner of an NFT", async function () {
            const tokenURI = "https://example.com/token/1";
            await nftContract.mint(owner.address, tokenURI);
            expect(await nftContract.ownerOf(1)).to.equal(owner.address);
        });

        it("Should revert when querying a non-existent NFT", async function () {
            await expect(nftContract.ownerOf(1)).to.be.revertedWith("ERC721: owner query for nonexistent token");
        });
    });
});