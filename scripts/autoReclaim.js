require("dotenv").config();
const hre = require("hardhat");

async function main() {
    const contractAddr = process.env.CONTRACT_ADDRESS;
    if (!contractAddr) throw new Error("CONTRACT_ADDRESS env missing");

    const Contract = await hre.ethers.getContractAt("SovereignFlashLock", contractAddr);

    const lockEnd = await Contract.lockEnd();
    const now = Math.floor(Date.now() / 1000);
    const delayMs = Math.max((lockEnd - now), 0) * 1000;

    console.log(`Current time: ${now}`);
    console.log(`Lock end time: ${lockEnd}`);
    console.log(`Delay until reclaim: ${delayMs / 1000} seconds`);

    if (delayMs > 0) {
        console.log(`Waiting ${delayMs / 1000} seconds until lockEnd...`);
        
        setTimeout(async () => {
            try {
                console.log("Attempting auto-reclaim...");
                const tx = await Contract.autoReclaim();
                console.log("Transaction hash:", tx.hash);
                await tx.wait();
                console.log("Liquidity reclaimed and LP sent to funding wallet.");
            } catch (err) {
                console.error("AUTO-RECLAIM ERROR:", err);
            }
        }, delayMs);
    } else {
        console.log("Lock already expired, attempting immediate reclaim...");
        try {
            const tx = await Contract.autoReclaim();
            console.log("Transaction hash:", tx.hash);
            await tx.wait();
            console.log("Liquidity reclaimed and LP sent to funding wallet.");
        } catch (err) {
            console.error("AUTO-RECLAIM ERROR:", err);
        }
    }
}

main().catch((err) => {
    console.error("AUTO-RECLAIM SCRIPT ERROR:", err);
    process.exit(1);
});