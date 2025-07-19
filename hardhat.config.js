require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
require("dotenv").config();

// Validate required environment variables
if (!process.env.PRIVATE_KEY) {
    console.warn("Warning: PRIVATE_KEY not set in environment variables");
}

if (!process.env.FUNDING_WALLET) {
    console.warn("Warning: FUNDING_WALLET not set, will use deployer address");
}

module.exports = {
    solidity: {
        version: "0.8.20",
        settings: { optimizer: { enabled: true, runs: 200 } }
    },
    networks: {
        base: {
            url: process.env.BASE_RPC_URL || "https://mainnet.base.org",
            chainId: parseInt(process.env.CHAIN_ID) || 8453,
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
        }
    }
};