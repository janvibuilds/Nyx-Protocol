# Dark Pool Deployment Guide

## Prerequisites

1. **Docker Desktop** - Running
2. **Node.js 22+** - Installed
3. **Compact Compiler** - Installed (`compact --version`)
4. **Midnight Wallet** - With NIGHT tokens (for preprod)

## Quick Start (Local Devnet)

### 1. Start Proof Server

```bash
cd contracts
npm run proof-server:start
# Wait for container to start: docker ps
```

### 2. Compile Contract

```bash
npm run compile
# Expected: Compiling 6 circuits
```

### 3. Deploy to Local Devnet

```bash
npm run deploy:standalone
# Expected: Contract deployed successfully!
```

## Deploy to Preprod Testnet

### 1. Generate a Wallet Seed

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and add it to your `.env`:

```
WALLET_SEED=<paste-here>
```

**Never commit your seed to git.**

### 2. Fund the Wallet

1. Your wallet address is printed during deployment (starts with `mn_addr_preprod1...`)
2. Get tNIGHT from the **Nethermind preprod faucet**: https://midnight-tmnight-preprod.nethermind.dev/
   - Paste your unshielded address, complete captcha, request tokens (~1000 tNIGHT)
   - If the faucet times out, retry or use the official faucet: https://faucet.preprod.midnight.network/
3. Register for tDUST generation (use Lace wallet "Generate tDUST" button, or the wallet SDK)

### 3. Start Proof Server

The proof server always runs **locally** in Docker, even for public testnets:

```bash
npm run proof-server:start
curl http://127.0.0.1:6300/api/v1/health/zkConfig   # wait until this returns ok
```

### 4. Deploy

```bash
NODE_OPTIONS="--max-old-space-size=8192" npm run deploy:preprod
```

> The heap flag is required — wallet sync on public testnets OOMs with Node's default ~4GB.

### 5. Verify

After deployment, you'll see:
```
  Contract deployed successfully!
  Address: c482622f4e0be2b9fd43b43b817e8d5fbcca4bde7...
Deployment info saved to: deployment.json
```

Check it on the explorer: https://preprod.midnightexplorer.com — search your contract address, should show **DEPLOYED**.

## Deploy to Preview Testnet

Same flow, but swap `preprod` → `preview`:

```bash
npm run deploy:preview
```

Preview uses https://preview.midnightexplorer.com — useful if preprod wallet sync is unstable.

## Interact with Contract

### Read State Root

```typescript
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { ledger } from './obj/dark_pool/contract';

const contract = await findDeployedContract('your-contract-address', providers);
const state = ledger(contract.currentState);
console.log('State Root:', state.stateRoot);
```

### Submit Batch Proof

```typescript
const result = await contract.circuits.submitBatchProof(
  context,
  batchHash,
  oldStateRoot,
  newStateRoot,
  timestamp,
  orderCount
);
console.log('Result:', result.result);
```

## Troubleshooting

### Proof Server Not Starting

```bash
docker ps                                        # check Docker is running
docker logs dark-pool-proof-server               # check logs
npm run proof-server:stop; npm run proof-server:start
```

### Deployment Fails

1. Check proof server: `curl http://127.0.0.1:6300/api/v1/health/zkConfig`
2. Check indexer (preprod): `curl https://indexer.preprod.midnight.network/api/v4/graphql`
3. Verify compiled contract: `ls obj/dark_pool/contract/`
4. WALLET_SEED not set? → add to `.env`

### Out of Memory

```
FATAL ERROR: Ineffective mark-compacts near heap limit
```

Prefix with `NODE_OPTIONS="--max-old-space-size=8192"`

### Preprod Faucet Down

Use the Nethermind faucet: https://midnight-tmnight-preprod.nethermind.dev/
Or try preview network instead: `npm run deploy:preview`

## Network Endpoints

| Network  | Node RPC | Indexer | Proof Server |
|----------|----------|---------|--------------|
| Standalone | ws://127.0.0.1:9944 | http://127.0.0.1:8088 | http://127.0.0.1:6300 |
| Preview  | https://rpc.preview.midnight.network | https://indexer.preview.midnight.network | http://127.0.0.1:6300 |
| Preprod  | https://rpc.preprod.midnight.network | https://indexer.preprod.midnight.network | http://127.0.0.1:6300 |

## Files Created

- `deployment.json` — Contract address, network, and wallet address
- `src/deploy.ts` — Deployment script (supports standalone/preview/preprod)

## Next Steps

After deployment:
1. Save contract address from `deployment.json`
2. Update sequencer to use deployed contract address
3. Test batch submission flow end-to-end
