// Base Mainnet Direct Deployment Engine
require("dotenv").config();
const hre = require("hardhat");

async function deployToBase() {
    console.log("🎯 JARVIS 2.0 BASE MAINNET ASSAULT INITIATED");
    console.log("💰 FUNDING WALLET:", process.env.FUNDING_WALLET);

    // Direct hardhat network configuration for Base
    hre.config.defaultNetwork = "base";

    const [deployer] = await hre.ethers.getSigners();
    console.log("🚀 DEPLOYER ADDRESS:", deployer.address);

    // Check balance
    const balance = await deployer.getBalance();
    console.log("💵 DEPLOYER BALANCE:", hre.ethers.utils.formatEther(balance), "ETH");

    if (balance.lt(hre.ethers.utils.parseEther("0.005"))) {
        console.log("⚠️  LOW BALANCE WARNING - PROCEEDING WITH MICRO-DEPLOYMENT");
    }

    // Deploy contract
    console.log("⚡ DEPLOYING SOVEREIGN FLASH LOCK ON BASE MAINNET...");
    const Contract = await hre.ethers.getContractFactory("SovereignFlashLock");
    const contract = await Contract.deploy(process.env.FUNDING_WALLET);

    await contract.deployed();
    console.log("🎯 CONTRACT DEPLOYED:", contract.address);

    // MICRO INJECTION PARAMETERS
    const tokenAmount = hre.ethers.utils.parseEther("1000"); // 1K tokens
    const ethAmount = hre.ethers.utils.parseEther("0.003"); // ~$5 USD

    console.log("💰 MICRO-INJECTION PARAMETERS:");
    console.log("- Tokens:", tokenAmount.toString());
    console.log("- ETH:", ethAmount.toString());

    // Transfer tokens to contract
    console.log("📤 TRANSFERRING TOKENS TO CONTRACT...");
    const transferTx = await contract.transfer(contract.address, tokenAmount);
    await transferTx.wait();
    console.log("✅ TOKENS TRANSFERRED");

    // Initialize liquidity
    console.log("💉 INITIALIZING LIQUIDITY...");
    const initTx = await contract.initializeLiquidity(tokenAmount, {
        value: ethAmount,
        gasLimit: 500000 // Explicit gas limit
    });
    await initTx.wait();

    console.log("🔒 30-MINUTE LOCK INITIATED. MICRO-LIQUIDITY SUCCESSFULLY INJECTED.");

    const lockEnd = await contract.lockEnd();
    console.log("🕐 LOCK EXPIRES:", new Date(lockEnd * 1000).toLocaleString());

    // Update .env file
    const fs = require('fs');
    let envContent = fs.readFileSync('.env', 'utf8');
    envContent = envContent.replace(
        /CONTRACT_ADDRESS=.*/,
        `CONTRACT_ADDRESS=${contract.address}`
    );
    fs.writeFileSync('.env', envContent);
    console.log("📝 .env UPDATED WITH CONTRACT ADDRESS");

    console.log("🎉 MISSION COMPLETE - BASE MAINNET LIQUIDITY ASSAULT SUCCESSFUL");

    return {
        contractAddress: contract.address,
        lockEnd: lockEnd.toString(),
        success: true
    };
}

deployToBase()
    .then(result => {
        console.log("🚀 FINAL REPORT:", JSON.stringify(result, null, 2));
        process.exit(0);
    })
    .catch(error => {
        console.log("💥 CRITICAL FAILURE:", error.message);
        process.exit(1);
    });
