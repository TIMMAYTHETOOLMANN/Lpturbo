# LP Turbo Deployment Guide

## Prerequisites

1. Node.js 18+ installed
2. Base-compatible wallet with ETH for gas fees
3. Private key for the deployer wallet

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy the example environment file and fill in your credentials:
```bash
cp .env.example .env
```

Edit `.env` with your actual values:
- `PRIVATE_KEY`: Your deployer wallet private key (ensure it has ETH for gas)
- `FUNDING_WALLET`: Address where LP tokens will be sent after reclaim (optional, defaults to deployer)
- `ETH_AMOUNT`: Amount of ETH to use for initial liquidity (default: 0.1 ETH)

### 3. Compile Contracts
```bash
npm run compile
```

### 4. Deploy to Base Network
```bash
npm run deploy
```

This will:
- Deploy the SovereignFlashLock contract
- Transfer 500,000 SOVR tokens to the contract
- Initialize liquidity with tokens + ETH
- Burn the initial LP tokens
- Start the 30-minute lock timer

### 5. Auto-Reclaim Liquidity
After deployment, update your `.env` file with the deployed contract address:
```
CONTRACT_ADDRESS=0x...
```

Then run the auto-reclaim script:
```bash
npm run auto-reclaim
```

This script will:
- Wait until the 30-minute lock expires
- Automatically call `autoReclaim()` on the contract
- Send new LP tokens to the funding wallet

## Network Configuration

The system is configured for Base Mainnet:
- Network: Base Mainnet
- Chain ID: 8453
- RPC URL: https://mainnet.base.org
- Router: 0x327Df1E6de05895d2ab08513aaDD9313Fe505d86 (Base Uniswap V2 Router)

## Security Notes

- LP tokens from the initial liquidity injection are burned to simulate a full lock
- The contract retains some ETH and tokens for the reclaim phase
- After 30 minutes, anyone can call `autoReclaim()` to reinject liquidity
- New LP tokens are sent directly to the funding wallet

## Troubleshooting

### Common Issues:
1. **Insufficient ETH**: Ensure your deployer wallet has enough ETH for gas fees
2. **Network Issues**: Verify you're connected to Base Mainnet
3. **Private Key Format**: Remove '0x' prefix from private key in .env file
4. **Lock Not Expired**: Auto-reclaim will wait until the lock expires

### Manual Reclaim:
If the auto-reclaim script fails, you can manually call the reclaim function:
```bash
npx hardhat run scripts/manualReclaim.js --network base
```

## Contract Functions

### `initializeLiquidity(uint256 tokenAmount)`
- Adds initial liquidity to Uniswap
- Burns LP tokens
- Starts 30-minute lock timer
- Can only be called by owner

### `autoReclaim()`
- Reinjects retained liquidity
- Sends new LP tokens to funding wallet
- Can only be called after lock expires
- Can be called by anyone

## Token Details

- Name: SOVEREIGN LIQUIDITY
- Symbol: SOVR
- Initial Supply: 1,000,000 SOVR
- Deployed tokens: 500,000 SOVR for liquidity

## Support

For issues or questions, refer to the main README.md or create an issue in the repository.