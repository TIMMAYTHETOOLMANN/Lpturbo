const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SovereignFlashLock Deployment Fix", function() {
    let contract;
    let owner;
    let fundingWallet;

    beforeEach(async function() {
        [owner, fundingWallet] = await ethers.getSigners();
    });

    it("should deploy with valid funding wallet", async function() {
        const Contract = await ethers.getContractFactory("SovereignFlashLock");
        contract = await Contract.deploy(fundingWallet.address);
        await contract.deployed();

        expect(await contract.fundingWallet()).to.equal(fundingWallet.address);
        expect(await contract.owner()).to.equal(owner.address);
    });

    it("should reject deployment with invalid funding wallet", async function() {
        const Contract = await ethers.getContractFactory("SovereignFlashLock");
        
        await expect(
            Contract.deploy(ethers.constants.AddressZero)
        ).to.be.revertedWith("Invalid funding wallet");
    });

    it("should validate address handling", function() {
        const validAddress = "0xC6A16F4BBEB6Bc19A9bBECdAAb017EaE70C331c1";
        const emptyAddress = "";
        
        expect(ethers.utils.isAddress(validAddress)).to.be.true;
        expect(ethers.utils.isAddress(emptyAddress)).to.be.false;
    });
});