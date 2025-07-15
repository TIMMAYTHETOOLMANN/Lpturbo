require("dotenv").config();
const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    const fundingWallet = process.env.FUNDING_WALLET || deployer.address;

    console.log("Deploying SovereignFlashLock with deployer:", deployer.address);

    const Contract = await hre.ethers.getContractFactory("SovereignFlashLock");
    const contract = await Contract.deploy(fundingWallet);

    await contract.deployed();
    console.log("SovereignFlashLock deployed:", contract.address);

    // Initial liquidity: transfer tokens to contract, call initialize
    const tokenAmount = hre.ethers.utils.parseEther("500000"); // half supply
    const ethAmount = hre.ethers.utils.parseEther("10"); // example ETH, adjust as needed

    await contract.transfer(contract.address, tokenAmount);

    const tx = await contract.initializeLiquidity(tokenAmount, { value: ethAmount });
    await tx.wait();

    console.log("Liquidity initialized, 30-min lock started.");
    console.log("Lock end timestamp:", await contract.lockEnd());
}

main().catch((error) => {
    console.error("DEPLOY ERROR:", error);
    process.exit(1);
});