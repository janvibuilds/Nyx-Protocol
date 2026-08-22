# Midnight Dark Pool Frontend

Next.js frontend for the Midnight Dark Pool with encrypted order submission.

## Architecture

Built with:
- **Next.js 14** - React framework
- **Tailwind CSS** - Styling
- **@midnight-ntwrk/midnight-js** - Midnight SDK integration

### Three-Context Model

1. **Witness Context (Client-Side):** Orders encrypted locally before sending
2. **Circuit Context (Worker Thread):** ZK proofs generated in background (not in frontend)
3. **Ledger Context (On-Chain):** Proofs verified and settled on-chain

## Setup

### Prerequisites

- Node.js 18+
- Sequencer running locally

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

```bash
NEXT_PUBLIC_SEQUENCER_URL=ws://localhost:8081
NEXT_PUBLIC_NETWORK_URL=http://localhost:8080
```

## Development

### Running in Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

### Testing

```bash
npm test
npm run test:watch
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## Features

### Current (MVP)

- [ ] Connect wallet
- [ ] Submit encrypted order
- [ ] View order status
- [ ] Receive pre-confirmation receipt

### Planned

- [ ] Order book visualization
- [ ] Trade history
- [ ] Portfolio view
- [ ] Advanced order types

## Components

### OrderForm

Encrypted order submission form.

```typescript
interface OrderFormProps {
  pair: string;
  onSubmit: (order: EncryptedOrder) => Promise<void>;
}
```

### OrderStatus

Real-time order status display.

```typescript
interface OrderStatusProps {
  clientOrderId: string;
  status: 'PENDING' | 'MATCHED' | 'SETTLED';
  receipt?: PreConfirmationReceipt;
}
```

### ConnectionStatus

WebSocket connection status indicator.

```typescript
interface ConnectionStatusProps {
  connected: boolean;
  latency?: number;
}
```

## Encryption

### Local Encryption (Witness Context)

Orders are encrypted locally using the sequencer's public key:

```typescript
const encryptedOrder = await encryptOrder(order, sequencerPublicKey);
```

### What Gets Encrypted

- Token pair (e.g., "ETH/USDC")
- Order amount
- Limit price
- Order side (BUY/SELL)

### What Stays Visible

- clientOrderId (for deduplication)
- Timestamp
- Encrypted payload (ciphertext)

## Performance

| Metric | Target |
|--------|--------|
| Page load | <2s |
| Order submission | <100ms |
| Encryption | <50ms |
| WebSocket reconnect | <1s |

## Deployment

### Vercel

```bash
npm run build
vercel deploy
```

### Docker

```bash
docker-compose up frontend
```

## Troubleshooting

### WebSocket Connection Failed

Verify sequencer is running:
```bash
curl http://localhost:3000/health
```

### Encryption Errors

Check Midnight SDK is properly initialized and keys are valid.

### Build Errors

Clear cache and reinstall:
```bash
rm -rf node_modules .next
npm install
npm run build
```
