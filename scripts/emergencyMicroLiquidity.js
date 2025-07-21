// EMERGENCY MICRO-LIQUIDITY PROTOCOL - JARVIS 2.0 CRITICAL ADAPTATION
require("dotenv").config();
const hre = require("hardhat");

async function emergencyMicroLiquidity() {
    console.log("🚨 EMERGENCY MICRO-LIQUIDITY PROTOCOL INITIATED");
    console.log("🎯 CONTRACT:", "0xFD992a31d4286b7f5146A3182Ed5F12fFFE63Ba4");

    const [deployer] = await hre.ethers.getSigners();
    const balance = await deployer.getBalance();
    console.log("💰 CURRENT BALANCE:", hre.ethers.utils.formatEther(balance), "ETH");

    const contract = await hre.ethers.getContractAt("SovereignFlashLockInternal", "0xFD992a31d4286b7f5146A3182Ed5F12fFFE63Ba4");

    // Ultra-conservative parameters for remaining balance
    const tokenAmount = hre.ethers.utils.parseEther("100"); // Reduce to 100 tokens
    const ethAmount = hre.ethers.utils.parseEther("0.0005"); // Ultra-micro: $0.90 worth
    const gasLimit = 300000; // Reduced gas limit
    const gasPrice = hre.ethers.utils.parseUnits("0.5", "gwei"); // Ultra-low gas price

    console.log("💰 EMERGENCY MICRO PARAMETERS:");
    console.log("- Tokens:", hre.ethers.utils.formatEther(tokenAmount), "SVRI");
    console.log("- ETH:", hre.ethers.utils.formatEther(ethAmount), "ETH (~$0.90)");
    console.log("- Gas Limit:", gasLimit);
    console.log("- Gas Price:", gasPrice.toString(), "wei");

    const totalCost = ethAmount.add(gasPrice.mul(gasLimit));
    console.log("- Total Cost:", hre.ethers.utils.formatEther(totalCost), "ETH");

    if (balance.lt(totalCost)) {
        console.log("❌ INSUFFICIENT FUNDS FOR MICRO-LIQUIDITY");
        console.log("💡 ALTERNATIVE: Use existing deployed contract for manual token operations");

        // Transfer remaining tokens to funding wallet for manual DEX operations
        const contractTokenBalance = await contract.balanceOf(contract.address);
        if (contractTokenBalance.gt(0)) {
            console.log("🔄 TRANSFERRING TOKENS TO FUNDING WALLET FOR MANUAL DEX...");
            try {
                const transferTx = await contract.transfer(process.env.FUNDING_WALLET, contractTokenBalance, {
                    gasLimit: 100000,
                    gasPrice: hre.ethers.utils.parseUnits("0.1", "gwei")
                });
                await transferTx.wait();
                console.log("✅ TOKENS TRANSFERRED TO FUNDING WALLET");
                console.log("💡 USE SUSHISWAP UI TO ADD LIQUIDITY MANUALLY");
            } catch (error) {
                console.log("❌ TRANSFER FAILED:", error.message);
            }
        }

        return { success: false, reason: "insufficient_funds", alternative: "manual_dex" };
    }

    try {
        console.log("🚀 ATTEMPTING EMERGENCY MICRO-INJECTION...");
        const initTx = await contract.internalLiquidityInjection(tokenAmount, 1, {
            value: ethAmount,
            gasLimit: gasLimit,
            gasPrice: gasPrice
        });

        console.log("⏳ MICRO-INJECTION SUBMITTED:", initTx.hash);
        const receipt = await initTx.wait();
        console.log("✅ EMERGENCY MICRO-LIQUIDITY SUCCESS!");
        console.log("⛽ GAS USED:", receipt.gasUsed.toString());

        const status = await contract.getInternalStatus();
        console.log("🔒 MICRO-LOCK ACTIVE FOR 30 MINUTES");
        console.log("📊 STATUS:", status.initialized);

        return {
            success: true,
            txHash: initTx.hash,
            gasUsed: receipt.gasUsed.toString(),
            contractAddress: contract.address
        };

    } catch (error) {
        console.log("❌ EMERGENCY INJECTION FAILED:", error.message);
        return { success: false, error: error.message };
    }
}

// Execute emergency protocol
emergencyMicroLiquidity()
    .then(result => {
        console.log("📊 EMERGENCY PROTOCOL RESULT:");
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
        console.log("💥 EMERGENCY PROTOCOL FAILED:", error.message);
        process.exit(1);
    });
