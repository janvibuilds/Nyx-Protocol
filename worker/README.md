# Midnight Dark Pool Worker

Background ZK proof generation worker for the Midnight Dark Pool.

## Architecture

The worker runs in a separate Node.js process using `worker_threads` to avoid blocking the main sequencer event loop.

### Responsibilities

1. Receive batched orders via IPC from sequencer
2. Generate recursive ZK proofs
3. Submit proofs to Midnight Ledger Context
4. Return settlement status to sequencer

## Setup

### Prerequisites

- Node.js 18+
- Midnight devnet

### Installation

```bash
# Install dependencies
npm install

# Build
npm run build

# Start
npm start
```

### Environment Variables

```bash
MIDNIGHT_DEVNET_URL=http://localhost:8080
WORKER_THREADS=4
LOG_LEVEL=info
```

## Development

### Running in Development

```bash
npm run dev
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## IPC Protocol

### Batch Request

```typescript
interface BatchRequest {
  type: 'BATCH_REQUEST';
  batchId: string;
  orders: EncryptedOrder[];
  stateRoot: string;
}
```

### Batch Response

```typescript
interface BatchResponse {
  type: 'BATCH_RESPONSE';
  batchId: string;
  proofHash: string;
  txHash?: string;
  status: 'SUCCESS' | 'FAILED';
  error?: string;
}
```

## Performance

| Metric | Target |
|--------|--------|
| Proof generation (50 orders) | <5s |
| Worker startup time | <1s |
| IPC latency | <1ms |
| Memory per worker | <256MB |

## ZK Proof Generation

### Steps

1. **Receive Batch** - Accept encrypted orders from sequencer
2. **Build Circuit** - Construct ZK circuit for batch
3. **Generate Witness** - Create witness from encrypted data
4. **Prove** - Generate recursive ZK proof
5. **Verify** - Local verification (optional)
6. **Submit** - Send to Midnight Ledger Context

### Circuit Design

The ZK circuit proves:
- All orders in batch are valid
- Matching followed price-time priority
- No MEV front-running occurred
- State transitions are correct

## Monitoring

### Health Check

```bash
curl http://localhost:3001/health
```

### Logs

Logs are written to:
- Console (development)
- `logs/worker.log` (production)

## Troubleshooting

### Proof Generation Timeout

Increase timeout or reduce batch size:
```bash
BATCH_SIZE=25 npm run dev
```

### Worker Crash

Check memory usage and adjust worker threads:
```bash
WORKER_THREADS=2 npm run dev
```

### Connection to Midnight Failed

Verify devnet is running and accessible:
```bash
curl http://localhost:8080/health
```
