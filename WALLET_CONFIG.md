# Wallet Credential Configuration

This project requires proper configuration of ERC-20 wallet credentials for the funding wallet.

## Required Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# ERC-20 Wallet Credentials for Funding Wallet
# Replace with your actual private key (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# Funding wallet address (where LP tokens will be sent after reclaim)
# If not provided, will default to the deployer address
FUNDING_WALLET=0x1234567890123456789012345678901234567890

# Contract address (set after deployment for auto-reclaim script)
CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890

# Network configuration (Base mainnet)
BASE_RPC_URL=https://mainnet.base.org
CHAIN_ID=8453
```

## Setup Instructions

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file with your actual wallet credentials:
   - `PRIVATE_KEY`: Your wallet's private key (without 0x prefix)
   - `FUNDING_WALLET`: The address where LP tokens should be sent after auto-reclaim

3. Deploy the contract:
   ```bash
   npm run deploy
   ```

4. After deployment, update the `CONTRACT_ADDRESS` in your `.env` file with the deployed contract address.

5. Run the auto-reclaim script:
   ```bash
   npm run auto-reclaim
   ```

## Security Notes

- Never commit your `.env` file to version control
- Keep your private key secure and never share it
- The funding wallet will receive LP tokens after the 30-minute lock period expires