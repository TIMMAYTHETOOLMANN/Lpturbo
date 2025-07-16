require("dotenv").config();
const hre = require("hardhat");

async function main() {
    const contractAddr = process.env.CONTRACT_ADDRESS;
    if (!contractAddr) throw new Error("CONTRACT_ADDRESS env missing");

    const Contract = await hre.ethers.getContractAt("SovereignFlashLock", contractAddr);

    console.log("=== LP Turbo Contract Status ===");
    console.log("Contract Address:", contractAddr);
    
    try {
        // Basic contract info
        const name = await Contract.name();
        const symbol = await Contract.symbol();
        const totalSupply = await Contract.totalSupply();
        const fundingWallet = await Contract.fundingWallet();
        
        console.log("\n--- Token Info ---");
        console.log("Name:", name);
        console.log("Symbol:", symbol);
        console.log("Total Supply:", hre.ethers.utils.formatEther(totalSupply), symbol);
        console.log("Funding Wallet:", fundingWallet);
        
        // Contract balances
        const contractTokenBalance = await Contract.balanceOf(contractAddr);
        const contractEthBalance = await hre.ethers.provider.getBalance(contractAddr);
        
        console.log("\n--- Contract Balances ---");
        console.log("Token Balance:", hre.ethers.utils.formatEther(contractTokenBalance), symbol);
        console.log("ETH Balance:", hre.ethers.utils.formatEther(contractEthBalance), "ETH");
        
        // Lock status
        const liquidityInitialized = await Contract.liquidityInitialized();
        const reclaimed = await Contract.reclaimed();
        const lockEnd = await Contract.lockEnd();
        const now = Math.floor(Date.now() / 1000);
        
        console.log("\n--- Lock Status ---");
        console.log("Liquidity Initialized:", liquidityInitialized);
        console.log("Reclaimed:", reclaimed);
        
        if (liquidityInitialized) {
            console.log("Lock End Time:", lockEnd);
            console.log("Current Time:", now);
            console.log("Lock Expired:", now >= lockEnd);
            
            if (now < lockEnd) {
                console.log("Time Until Unlock:", lockEnd - now, "seconds");
            }
        }
        
        // Owner info
        const owner = await Contract.owner();
        console.log("\n--- Ownership ---");
        console.log("Contract Owner:", owner);
        
    } catch (error) {
        console.error("Error querying contract:", error);
    }
}

main().catch((err) => {
    console.error("STATUS CHECK ERROR:", err);
    process.exit(1);
});