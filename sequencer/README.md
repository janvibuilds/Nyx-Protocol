# Midnight Dark Pool Sequencer

High-frequency sequencer for processing encrypted orders and coordinating ZK proof generation.

## Architecture

The sequencer runs on Node.js with the following components:

1. **WebSocket Server** - Receives encrypted order frames
2. **Mutex FIFO Queue** - Processes orders sequentially in RAM
3. **Matching Engine** - Matches buy/sell orders (RAM-only)
4. **Batch Manager** - Groups orders for ZK proof generation
5. **Pre-Confirmation Signer** - Signs and returns receipts in <15ms

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Midnight devnet

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Start development server
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env` in the project root and configure:

```bash
DATABASE_URL=postgresql://midnight:midnight_secret@localhost:5432/midnight_dark_pool
MIDNIGHT_DEVNET_URL=http://localhost:8080
WEBSOCKET_PORT=8081
HTTP_PORT=3000
```

## Development

### Running in Development

```bash
npm run dev
```

This starts the sequencer with hot-reloading.

### Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Load tests
npm run test:load
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## API

### WebSocket Protocol

#### Order Frame

```typescript
interface OrderFrame {
  type: 'ORDER';
  clientOrderId: string; // UUID v4
  encryptedData: string; // Encrypted order payload
  timestamp: number;
}
```

#### Pre-Confirmation Receipt

```typescript
interface PreConfirmationReceipt {
  type: 'PRE_CONFIRMATION';
  clientOrderId: string;
  stateRoot: string;
  timestamp: number;
  signature: string;
}
```

### HTTP Endpoints

- `GET /health` - Health check
- `GET /status` - Sequencer status

## Performance Targets

| Metric | Target |
|--------|--------|
| Order processing latency | <1ms |
| Soft finality | <15ms |
| Batch proof generation | <5s for 50 orders |
| WebSocket throughput | 1000+ msg/s |
| Memory usage | <512MB |

## Configuration

### Batch Settings

```bash
BATCH_SIZE=50           # Orders per batch
BATCH_TIMEOUT_MS=3000   # Timeout in milliseconds
```

### Worker Settings

```bash
WORKER_THREADS=4        # Number of worker threads
PROVER_URL=http://localhost:3001
```

## Monitoring

### Logs

Logs are written to:
- Console (development)
- `logs/sequencer.log` (production)

### Metrics

- Orders processed per second
- Batch proof generation time
- WebSocket connection count
- Memory usage

## Troubleshooting

### High Memory Usage

Check for order queue buildup:
```bash
curl http://localhost:3000/status
```

### Slow Proof Generation

Increase worker threads:
```bash
WORKER_THREADS=8 npm run dev
```

### WebSocket Connection Issues

Verify firewall rules and check logs for connection errors.
