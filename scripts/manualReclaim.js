require("dotenv").config();
const hre = require("hardhat");

async function main() {
    const contractAddr = process.env.CONTRACT_ADDRESS;
    if (!contractAddr) throw new Error("CONTRACT_ADDRESS env missing");

    const Contract = await hre.ethers.getContractAt("SovereignFlashLock", contractAddr);

    console.log("Checking lock status...");
    const lockEnd = await Contract.lockEnd();
    const now = Math.floor(Date.now() / 1000);
    
    console.log(`Current time: ${now}`);
    console.log(`Lock end time: ${lockEnd}`);
    
    if (now < lockEnd) {
        console.log(`Lock still active. Time remaining: ${lockEnd - now} seconds`);
        console.log("Cannot reclaim until lock expires.");
        return;
    }

    console.log("Lock expired. Attempting manual reclaim...");
    
    try {
        const tx = await Contract.autoReclaim();
        console.log("Transaction hash:", tx.hash);
        console.log("Waiting for confirmation...");
        await tx.wait();
        console.log("✅ Liquidity reclaimed and LP sent to funding wallet.");
    } catch (err) {
        console.error("❌ MANUAL RECLAIM ERROR:", err);
        
        // Check if already reclaimed
        const reclaimed = await Contract.reclaimed();
        if (reclaimed) {
            console.log("ℹ️  Liquidity has already been reclaimed.");
        }
    }
}

main().catch((err) => {
    console.error("MANUAL RECLAIM SCRIPT ERROR:", err);
    process.exit(1);
});