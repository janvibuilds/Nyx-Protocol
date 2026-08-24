# Deployment Options

## Option 1: Use Midnight Local Devnet (Recommended)

The easiest way to deploy is using the official Midnight local devnet setup.

### 1. Clone the local devnet repository

```bash
git clone https://github.com/midnightntwrk/midnight-local-dev.git
cd midnight-local-dev
```

### 2. Start the local network

```bash
./start.sh
```

This starts:
- Midnight node (port 9944)
- Indexer (port 8088)
- Proof server (port 6300)
- Genesis wallet (pre-funded with NIGHT)

### 3. Copy your compiled contract

```bash
# Copy your compiled contract to the managed contracts folder
cp -r /path/to/Midnight/contracts/obj/dark_pool ./managed-dark-pool
```

### 4. Deploy using their wallet helpers

```typescript
import { buildWalletFromHexSeed, registerNightForDust, closeWallet } from './src/wallet.js';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';

// Genesis seed for local devnet
const GENESIS_SEED = '0'.repeat(63) + '1';

// Build wallet
const ctx = await buildWalletFromHexSeed(config, GENESIS_SEED);
await registerNightForDust(ctx);

// Deploy...
```

## Option 2: Use Preprod Testnet

For preprod, you need:
1. A Lace wallet with tNIGHT
2. DUST registration
3. Deploy with your wallet

## Option 3: Quick Test (No Wallet)

For a quick test without wallet integration, you can verify the contract
compiles and generates correct artifacts. The actual deployment requires
a funded wallet.

## Current Status

Your contract is ready:
- ✅ Compiled successfully (6 circuits)
- ✅ Generated JS, TS, ZKIR, and keys
- ✅ All tests pass
- ⏳ Deployment requires wallet with NIGHT/DUST

## Files Created

- `contracts/obj/dark_pool/` - Compiled contract
- `contracts/src/deploy.ts` - Deployment script (needs wallet)
- `contracts/docker-compose.yml` - Proof server config
- `contracts/DEPLOYMENT.md` - Full deployment guide

## Next Steps

1. Set up Midnight local devnet OR
2. Get test wallet with tNIGHT for preprod
3. Deploy using the wallet helpers

Would you like me to help you set up the local devnet, or would you prefer
to deploy to preprod with a test wallet?
