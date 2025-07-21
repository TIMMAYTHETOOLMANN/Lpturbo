// EMERGENCY LIQUIDITY INJECTION - JARVIS 2.0 CRITICAL PROTOCOL
require("dotenv").config();
const { ethers } = require("ethers");

async function emergencyLiquidityInjection() {
    console.log("🚨 JARVIS 2.0 EMERGENCY LIQUIDITY PROTOCOL INITIATED");
    console.log("💰 FUNDING WALLET:", process.env.FUNDING_WALLET);
    console.log("🎯 CONTRACT:", process.env.CONTRACT_ADDRESS);

    try {
        // Direct provider connection with timeout
        const provider = new ethers.providers.JsonRpcProvider({
            url: process.env.BASE_RPC_URL || "https://mainnet.base.org",
            timeout: 30000 // 30 second timeout
        });

        // Network verification
        console.log("🔍 VERIFYING NETWORK CONNECTION...");
        const network = await provider.getNetwork();
        console.log("✅ CONNECTED TO NETWORK:", network.name, "CHAIN ID:", network.chainId);

        // Wallet setup
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        console.log("🔑 WALLET ADDRESS:", wallet.address);

        // Balance check
        const balance = await wallet.getBalance();
        console.log("💵 WALLET BALANCE:", ethers.utils.formatEther(balance), "ETH");

        if (balance.lt(ethers.utils.parseEther("0.002"))) {
            console.log("⚠️  INSUFFICIENT BALANCE FOR OPERATION");
            return { success: false, error: "Insufficient ETH balance" };
        }

        // Contract connection
        const contractABI = [
            "function getContractStatus() external view returns (bool initialized, bool isReclaimed, uint256 timeRemaining, uint256 contractTokenBalance, uint256 contractETHBalance)",
            "function initializeLiquidity(uint256 tokenAmount) external payable",
            "function balanceOf(address account) external view returns (uint256)",
            "function symbol() external view returns (string)",
            "function lockEnd() external view returns (uint256)"
        ];

        const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, wallet);

        console.log("📊 CHECKING CONTRACT STATUS...");
        const status = await contract.getContractStatus();
        console.log("- Initialized:", status.initialized);
        console.log("- Reclaimed:", status.isReclaimed);
        console.log("- Contract Token Balance:", ethers.utils.formatEther(status.contractTokenBalance));
        console.log("- Contract ETH Balance:", ethers.utils.formatEther(status.contractETHBalance));

        if (!status.initialized && status.contractTokenBalance.gt(0)) {
            console.log("🚀 EXECUTING EMERGENCY MICRO-LIQUIDITY INJECTION...");

            // Ultra-conservative parameters for $18 budget
            const tokenAmount = ethers.utils.parseEther("200"); // 200 tokens
            const ethAmount = ethers.utils.parseEther("0.0006"); // ~$1.00 worth

            console.log("💰 EMERGENCY PARAMETERS:");
            console.log("- Tokens:", ethers.utils.formatEther(tokenAmount));
            console.log("- ETH:", ethers.utils.formatEther(ethAmount));
            console.log("- Estimated Cost: ~$1.00 USD");

            // Gas estimation
            console.log("⛽ ESTIMATING GAS...");
            const gasEstimate = await contract.estimateGas.initializeLiquidity(tokenAmount, {
                value: ethAmount
            });
            console.log("- Estimated Gas:", gasEstimate.toString());

            // Execute transaction
            const tx = await contract.initializeLiquidity(tokenAmount, {
                value: ethAmount,
                gasLimit: gasEstimate.mul(120).div(100), // 20% buffer
                gasPrice: ethers.utils.parseUnits("1", "gwei") // Ultra-low gas price
            });

            console.log("⏳ TRANSACTION SUBMITTED:", tx.hash);
            console.log("🔗 TX URL: https://basescan.org/tx/" + tx.hash);

            const receipt = await tx.wait();
            console.log("✅ TRANSACTION CONFIRMED!");
            console.log("⛽ GAS USED:", receipt.gasUsed.toString());
            console.log("💰 TOTAL COST:", ethers.utils.formatEther(receipt.gasUsed.mul(receipt.effectiveGasPrice)), "ETH");

            // Verify lock status
            const lockEnd = await contract.lockEnd();
            console.log("🔒 LIQUIDITY LOCKED UNTIL:", new Date(lockEnd * 1000).toLocaleString());

            return {
                success: true,
                txHash: tx.hash,
                gasUsed: receipt.gasUsed.toString(),
                lockEnd: lockEnd.toString()
            };

        } else if (status.initialized) {
            console.log("✅ LIQUIDITY ALREADY INITIALIZED");
            const lockEnd = await contract.lockEnd();
            const currentTime = Math.floor(Date.now() / 1000);

            if (currentTime >= lockEnd) {
                console.log("🔓 LOCK EXPIRED - READY FOR RECLAIM");
            } else {
                const timeLeft = lockEnd - currentTime;
                console.log("⏳ LOCK ACTIVE -", Math.floor(timeLeft / 60), "minutes remaining");
            }

            return { success: true, status: "already_initialized" };
        } else {
            console.log("❌ NO TOKENS IN CONTRACT FOR INJECTION");
            return { success: false, error: "No tokens available" };
        }

    } catch (error) {
        console.log("💥 EMERGENCY PROTOCOL FAILED:", error.message);
        console.log("🔍 ERROR DETAILS:", error);
        return { success: false, error: error.message };
    }
}

// Execute emergency protocol
emergencyLiquidityInjection()
    .then(result => {
        console.log("📊 EMERGENCY PROTOCOL COMPLETE:");
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
        console.log("🚨 CRITICAL FAILURE:", error.message);
        process.exit(1);
    });
