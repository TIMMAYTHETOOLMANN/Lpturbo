require("dotenv").config();
const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    const fundingWallet = process.env.FUNDING_WALLET || deployer.address;
    
    console.log("Deploying SovereignFlashLock with deployer:", deployer.address);
    console.log("Funding wallet:", fundingWallet);
    console.log("Deployer balance:", hre.ethers.utils.formatEther(await deployer.getBalance()), "ETH");

    const Contract = await hre.ethers.getContractFactory("SovereignFlashLock");
    const contract = await Contract.deploy(fundingWallet);

    await contract.deployed();
    console.log("SovereignFlashLock deployed to:", contract.address);
    console.log("Transaction hash:", contract.deployTransaction.hash);

    // Initial liquidity parameters
    const tokenAmount = hre.ethers.utils.parseEther("500000"); // half supply
    const ethAmount = process.env.ETH_AMOUNT ? hre.ethers.utils.parseEther(process.env.ETH_AMOUNT) : hre.ethers.utils.parseEther("0.1"); // Configurable ETH amount

    console.log("Transferring tokens to contract...");
    const transferTx = await contract.transfer(contract.address, tokenAmount);
    await transferTx.wait();
    console.log("Tokens transferred to contract");

    console.log("Initializing liquidity...");
    console.log("Token amount:", hre.ethers.utils.formatEther(tokenAmount), "SOVR");
    console.log("ETH amount:", hre.ethers.utils.formatEther(ethAmount), "ETH");
    
    const tx = await contract.initializeLiquidity(tokenAmount, { value: ethAmount });
    await tx.wait();

    console.log("Liquidity initialized, 30-min lock started.");
    console.log("Lock end timestamp:", await contract.lockEnd());
    console.log("\nTo run auto-reclaim, set CONTRACT_ADDRESS=" + contract.address + " in .env and run:");
    console.log("npm run auto-reclaim");
}

main().catch((error) => {
    console.error("DEPLOY ERROR:", error);
    process.exit(1);
});