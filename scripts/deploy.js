require("dotenv").config();
const hre = require("hardhat");

async function main() {
    // Validate environment variables
    if (!process.env.PRIVATE_KEY) {
        throw new Error("PRIVATE_KEY environment variable is required");
    }

    const [deployer] = await hre.ethers.getSigners();
    const fundingWallet = process.env.FUNDING_WALLET || deployer.address;

    console.log("Deploying SovereignFlashLock with deployer:", deployer.address);
    console.log("Funding wallet (where LP tokens will be sent):", fundingWallet);

    // Validate funding wallet address format
    if (!hre.ethers.utils.isAddress(fundingWallet)) {
        throw new Error("Invalid FUNDING_WALLET address format");
    }

    console.log("Validated funding wallet:", fundingWallet);
    console.log("Attempting contract deployment with funding wallet:", fundingWallet);

    const Contract = await hre.ethers.getContractFactory("SovereignFlashLock");
    const contract = await Contract.deploy(fundingWallet);

    await contract.deployed();
    console.log("SovereignFlashLock deployed:", contract.address);
    console.log("Please set CONTRACT_ADDRESS=" + contract.address + " in your .env file for auto-reclaim");

    // Initial liquidity: transfer tokens to contract, call initialize
    const tokenAmount = hre.ethers.utils.parseEther("500000"); // half supply
    const ethAmount = hre.ethers.utils.parseEther("10"); // example ETH, adjust as needed

    console.log("Transferring tokens to contract...");
    console.log("Token amount:", tokenAmount.toString());
    console.log("Contract address:", contract.address);
    
    await contract.transfer(contract.address, tokenAmount);
    console.log("Tokens transferred successfully");

    console.log("Initializing liquidity...");
    console.log("ETH amount:", ethAmount.toString());
    
    const tx = await contract.initializeLiquidity(tokenAmount, { value: ethAmount });
    console.log("Transaction sent, waiting for confirmation...");
    await tx.wait();
    console.log("Transaction confirmed");

    console.log("Liquidity initialized, 30-min lock started.");
    console.log("Lock end timestamp:", await contract.lockEnd());
    console.log("Funding wallet configured:", await contract.fundingWallet());
}

main().catch((error) => {
    console.error("DEPLOY ERROR (diagnostic):", error);
    console.error("Error details:", {
        message: error.message,
        code: error.code,
        reason: error.reason,
        argument: error.argument,
        value: error.value
    });
    process.exit(1);
});