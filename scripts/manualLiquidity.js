// Manual Liquidity Management Script - Simplified Approach
require("dotenv").config();
const hre = require("hardhat");

async function manualLiquidityManagement() {
    console.log("🎯 JARVIS 2.0 MANUAL LIQUIDITY PROTOCOL INITIATED");
    console.log("💰 FUNDING WALLET:", process.env.FUNDING_WALLET);

    // Use the deployed enhanced contract from .env
    const contractAddress = process.env.CONTRACT_ADDRESS;
    console.log("🎯 USING DEPLOYED CONTRACT:", contractAddress);

    const contract = await hre.ethers.getContractAt("SovereignFlashLockV2", contractAddress);
    const [deployer] = await hre.ethers.getSigners();

    console.log("🔍 CURRENT CONTRACT STATUS:");

    // Check contract status
    const contractStatus = await contract.getContractStatus();
    console.log("- Initialized:", contractStatus.initialized);
    console.log("- Reclaimed:", contractStatus.isReclaimed);
    console.log("- Contract Token Balance:", hre.ethers.utils.formatEther(contractStatus.contractTokenBalance));
    console.log("- Contract ETH Balance:", hre.ethers.utils.formatEther(contractStatus.contractETHBalance));

    // Check deployer balances
    const deployerTokenBalance = await contract.balanceOf(deployer.address);
    const deployerETHBalance = await deployer.getBalance();

    console.log("📊 DEPLOYER BALANCES:");
    console.log("- Token Balance:", hre.ethers.utils.formatEther(deployerTokenBalance), "SOVR2");
    console.log("- ETH Balance:", hre.ethers.utils.formatEther(deployerETHBalance), "ETH");

    if (!contractStatus.initialized && contractStatus.contractTokenBalance.gt(0)) {
        console.log("🚀 ATTEMPTING EMERGENCY MICRO-LIQUIDITY INJECTION...");

        // Ultra-conservative injection for $18 budget
        const tokenAmount = hre.ethers.utils.parseEther("250"); // Reduce to 250 tokens
        const ethAmount = hre.ethers.utils.parseEther("0.0008"); // ~$1.40 worth

        console.log("💰 EMERGENCY MICRO PARAMETERS:");
        console.log("- Tokens:", hre.ethers.utils.formatEther(tokenAmount));
        console.log("- ETH:", hre.ethers.utils.formatEther(ethAmount));
        console.log("- Estimated Cost: ~$1.40 USD");

        try {
            const initTx = await contract.initializeLiquidity(tokenAmount, {
                value: ethAmount,
                gasLimit: 1000000, // Maximum gas limit
                gasPrice: hre.ethers.utils.parseUnits("2", "gwei") // Low gas price for Base
            });

            console.log("⏳ EMERGENCY INJECTION SUBMITTED...");
            const receipt = await initTx.wait();
            console.log("✅ SUCCESS! GAS USED:", receipt.gasUsed.toString());

            const newStatus = await contract.getContractStatus();
            console.log("🎉 LIQUIDITY SUCCESSFULLY INITIALIZED!");
            console.log("🕐 LOCK EXPIRES:", new Date((await contract.lockEnd()) * 1000).toLocaleString());

        } catch (error) {
            console.log("❌ EMERGENCY INJECTION FAILED:", error.message);

            // Fallback: Transfer tokens back to deployer for manual DEX operations
            console.log("🔄 EXECUTING FALLBACK: RETURNING TOKENS TO DEPLOYER...");

            try {
                const balance = await contract.balanceOf(contract.address);
                if (balance.gt(0)) {
                    const transferTx = await contract.transfer(deployer.address, balance);
                    await transferTx.wait();
                    console.log("✅ TOKENS RETURNED TO DEPLOYER FOR MANUAL DEX OPERATIONS");
                    console.log("💡 RECOMMENDATION: Use SushiSwap directly via UI with tokens");
                }
            } catch (fallbackError) {
                console.log("❌ FALLBACK FAILED:", fallbackError.message);
                console.log("🚨 EMERGENCY: Contract may need owner intervention");
            }
        }
    } else if (contractStatus.initialized) {
        console.log("✅ CONTRACT ALREADY INITIALIZED");
        const timeRemaining = contractStatus.timeRemaining;

        if (timeRemaining.eq(0)) {
            console.log("🔓 LOCK EXPIRED - ATTEMPTING AUTO-RECLAIM...");
            try {
                const reclaimTx = await contract.autoReclaim();
                await reclaimTx.wait();
                console.log("💰 LIQUIDITY RECLAIMED TO FUNDING WALLET");
            } catch (error) {
                console.log("❌ AUTO-RECLAIM FAILED:", error.message);
            }
        } else {
            console.log("⏳ LOCK ACTIVE -", Math.floor(timeRemaining / 60), "minutes remaining");
        }
    }

    // Final status report
    const finalStatus = await contract.getContractStatus();
    console.log("📊 FINAL STATUS:");
    console.log("- Initialized:", finalStatus.initialized);
    console.log("- Reclaimed:", finalStatus.isReclaimed);
    console.log("- Time Remaining:", Math.floor(finalStatus.timeRemaining / 60), "minutes");

    return {
        contractAddress: contractAddress,
        status: finalStatus,
        success: true
    };
}

manualLiquidityManagement()
    .then(result => {
        console.log("🎉 MANUAL LIQUIDITY MANAGEMENT COMPLETE");
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
    })
    .catch(error => {
        console.log("💥 MANUAL MANAGEMENT FAILED:", error.message);
        process.exit(1);
    });
