require("dotenv").config();
const hre = require("hardhat");

async function main() {
    // Validate environment variables
    if (!process.env.CONTRACT_ADDRESS) {
        throw new Error("CONTRACT_ADDRESS environment variable is required");
    }
    if (!process.env.PRIVATE_KEY) {
        throw new Error("PRIVATE_KEY environment variable is required");
    }

    const contractAddr = process.env.CONTRACT_ADDRESS;
    
    // Validate contract address format
    if (!hre.ethers.utils.isAddress(contractAddr)) {
        throw new Error("Invalid CONTRACT_ADDRESS format");
    }

    console.log("Connecting to contract:", contractAddr);
    const Contract = await hre.ethers.getContractAt("SovereignFlashLock", contractAddr);

    // Verify contract is accessible and get funding wallet
    const fundingWallet = await Contract.fundingWallet();
    console.log("Funding wallet (LP tokens destination):", fundingWallet);

    const lockEnd = await Contract.lockEnd();
    const now = Math.floor(Date.now() / 1000);
    const delayMs = Math.max(lockEnd - now, 0) * 1000;

    console.log(`Current time: ${now}, Lock end: ${lockEnd}`);
    console.log(`Waiting until lockEnd (${lockEnd})... delay: ${delayMs}ms`);

    if (delayMs <= 0) {
        console.log("Lock period already expired, executing reclaim immediately...");
        try {
            const tx = await Contract.autoReclaim();
            await tx.wait();
            console.log("Liquidity reclaimed and LP sent to funding wallet:", fundingWallet);
        } catch (err) {
            console.error("AUTO-RECLAIM ERROR:", err);
        }
    } else {
        setTimeout(async () => {
            try {
                const tx = await Contract.autoReclaim();
                await tx.wait();
                console.log("Liquidity reclaimed and LP sent to funding wallet:", fundingWallet);
            } catch (err) {
                console.error("AUTO-RECLAIM ERROR:", err);
            }
        }, delayMs);
    }
}

main().catch((err) => {
    console.error("AUTO-RECLAIM SCRIPT ERROR:", err);
    process.exit(1);
});