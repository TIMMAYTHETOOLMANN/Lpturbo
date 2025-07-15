require("dotenv").config();
const hre = require("hardhat");

async function main() {
    const contractAddr = process.env.CONTRACT_ADDRESS;
    if (!contractAddr) throw new Error("CONTRACT_ADDRESS env missing");

    const Contract = await hre.ethers.getContractAt("SovereignFlashLock", contractAddr);

    const lockEnd = await Contract.lockEnd();
    const now = Math.floor(Date.now() / 1000);
    const delayMs = Math.max(lockEnd - now, 0) * 1000;

    console.log(`Waiting until lockEnd (${lockEnd})...`);

    setTimeout(async () => {
        try {
            const tx = await Contract.autoReclaim();
            await tx.wait();
            console.log("Liquidity reclaimed and LP sent to funding wallet.");
        } catch (err) {
            console.error("AUTO-RECLAIM ERROR:", err);
        }
    }, delayMs);
}

main().catch((err) => {
    console.error("AUTO-RECLAIM SCRIPT ERROR:", err);
    process.exit(1);
});