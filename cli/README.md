# Midnight Dark Pool CLI

Command-line tools for interacting with the Midnight Dark Pool.

## Installation

```bash
# From project root
npm install

# Or install globally
npm install -g .
```

## Usage

### Simulate Trade

Run a multi-agent simulation with mock wallets (Alice and Bob):

```bash
npm run simulate
```

This will:
1. Connect to the sequencer via WebSocket
2. Create two mock wallets (Alice and Bob)
3. Submit encrypted orders from both wallets
4. Execute a trade through the dark pool
5. Show the full cryptographic lifecycle

### Example Output

```
Midnight Dark Pool - Trade Simulation
=====================================

[1] Connecting to sequencer at ws://localhost:8081...
[2] Connection established
[3] Creating mock wallets...
    - Alice: 0x1234...5678
    - Bob: 0x9abc...def0
[4] Submitting Alice's buy order (100 USDC at 1.50 ETH)...
[5] Order encrypted locally (Witness Context)
[6] Encrypted order sent via WebSocket
[7] Pre-confirmation received in 12ms
    - clientOrderId: 550e8400-e29b-41d4-a716-446655440000
    - stateRoot: 0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
    - signature: 0x9d8a...
[8] Submitting Bob's sell order (100 USDC at 1.50 ETH)...
[9] Order encrypted locally (Witness Context)
[10] Encrypted order sent via WebSocket
[11] Pre-confirmation received in 8ms
[12] Batch trigger: 2 orders (threshold: 50)
[13] Sending batch to worker for ZK proof generation...
[14] ZK proof generated in 2.3s
[15] Submitting proof to Midnight Ledger Context...
[16] On-chain settlement confirmed
[17] Trades persisted to PostgreSQL

Simulation complete!
```

## Development

### Prerequisites

- Node.js 18+
- Sequencer running locally

### Running in Development

```bash
# Start sequencer first
cd ../sequencer
npm run dev

# Then run simulation
npm run simulate
```

### Environment Variables

Copy `.env.example` to `.env` in the project root:

```bash
NEXT_PUBLIC_SEQUENCER_URL=ws://localhost:8081
NEXT_PUBLIC_NETWORK_URL=http://localhost:8080
```

## Architecture

The CLI demonstrates the three-context model:

1. **Witness Context (Client-Side):** Orders encrypted locally before sending
2. **Circuit Context (Worker Thread):** ZK proofs generated in background
3. **Ledger Context (On-Chain):** Proofs verified and settled on-chain

## Troubleshooting

### Connection Refused

Ensure the sequencer is running:
```bash
cd ../sequencer
npm run dev
```

### Timeout Errors

Check that the WebSocket server is listening on the correct port (default: 8081).

### Proof Generation Failed

Verify the Midnight devnet is running and accessible.
