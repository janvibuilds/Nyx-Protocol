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

### 1. Get Test Tokens

1. Install Lace wallet or use Midnight wallet SDK
2. Get tNIGHT from faucet
3. Register for DUST generation

### 2. Deploy

```bash
npm run deploy:preprod
```

## Verify Deployment

After deployment, you'll see:
```
Contract deployed successfully!
Contract address: 0300abc123...
Deployment info saved to: deployment.json
```

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
# Check Docker is running
docker ps

# Check container logs
docker logs dark-pool-proof-server

# Restart
npm run proof-server:stop
npm run proof-server:start
```

### Deployment Fails

1. Check proof server is running: `curl http://127.0.0.1:6300`
2. Check indexer is accessible: `curl http://127.0.0.1:8088/api/v4/graphql`
3. Verify contract is compiled: `ls obj/dark_pool/contract/`

### Insufficient DUST

For preprod, ensure wallet has:
- tNIGHT tokens
- DUST registration completed

## Network Endpoints

| Network | Indexer | Proof Server |
|---------|---------|--------------|
| Standalone | http://127.0.0.1:8088 | http://127.0.0.1:6300 |
| Preprod | https://indexer.preprod.api.midnight.network | https://proof-server.preprod.api.midnight.network |

## Files Created

- `deployment.json` - Contract address and deployment info
- `docker-compose.yml` - Proof server configuration
- `src/deploy.ts` - Deployment script

## Next Steps

After deployment:
1. Save contract address
2. Update sequencer to use deployed contract
3. Test batch submission flow
