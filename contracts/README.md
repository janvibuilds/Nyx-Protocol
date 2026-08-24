# Midnight Dark Pool Smart Contracts

Midnight Compact smart contracts for the MEV-resistant dark pool.

## Architecture

### Three-Context Model

1. **Witness Context (Client-Side):** Private data (orders) encrypted locally
2. **Circuit Context (Worker Thread):** ZK proofs generated in background
3. **Ledger Context (On-Chain):** Proofs verified and state updated

### Contract Responsibilities

- Verify batch ZK proofs
- Update encrypted state commitments
- Consume DUST for computation
- Never see raw trade data

## Setup

### Prerequisites

- Node.js 22+
- Midnight Compact compiler

### Installation

```bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# Run tests
npm run test
```

## Development

### Contract Structure

```
contracts/
├── dark_pool.compact      # Main contract
├── tests/
│   └── dark_pool.test.ts  # Contract tests
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
└── jest.config.ts         # Test config
```

### Writing Contracts

```compact
// Example: Simple contract
pragma language_version >= 0.20;

import CompactStandardLibrary;

export contract MyContract {
  export ledger stateRoot: Field;
  export ledger owner: Field;

  constructor(ownerAddr: Field) {
    stateRoot = disclose(0);
    owner = disclose(ownerAddr);
  }

  export circuit getStateRoot(): Field {
    return stateRoot;
  }

  export circuit updateState(newState: Field): Boolean {
    stateRoot = disclose(newState);
    return true;
  }
}
```

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test
npm run test -- --testNamePattern="should initialize"
```

## Contract Interface

### Structures

```compact
export struct BatchInput {
  batchHash: Field,
  oldStateRoot: Field,
  newStateRoot: Field,
  timestamp: Field,
  orderCount: Uint<32>,
}

export struct BatchOutput {
  isValid: Boolean,
  batchHash: Field,
  newStateRoot: Field,
}
```

### Circuits

- `getStateRoot(): Field` - Get current state root
- `getLastBatchId(): Field` - Get last batch ID
- `getBatchCount(): Uint<32>` - Get batch count
- `verifyBatchProof(...): Boolean` - Verify batch proof
- `submitBatchProof(...): Boolean` - Submit batch proof
- `updateSequencer(Field): Boolean` - Update sequencer address
- `getContractInfo(): [...]` - Get all contract info

## Security

### What the Contract Does NOT See

- Order amounts
- Limit prices
- Token pairs
- Trade directions

### What the Contract DOES See

- ZK proofs
- State commitments
- Batch hashes
- DUST payments

### Proof Verification

The contract verifies:
1. Proof is cryptographically valid
2. State transition is correct
3. Batch follows protocol rules
4. DUST payment is sufficient

## Performance

| Metric | Target |
|--------|--------|
| Proof verification | <100ms |
| State update | <50ms |
| DUST cost per batch | <1000 |

## Deployment

### Devnet

```bash
# Deploy to local devnet
npm run deploy:devnet

# Verify deployment
npm run verify
```

## Troubleshooting

### Compilation Errors

Check Midnight Compact syntax:
```bash
npm run compile --verbose
```

### Test Failures

Check test output for specific failure:
```bash
npm test --verbose
```

### Package Installation Failed

Check Node.js version (need 22+):
```bash
node --version
```
