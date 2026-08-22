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

- Midnight Compact v0.28+
- Midnight devnet

### Installation

```bash
# Install Midnight CLI
npm install -g @midnight-ntwrk/cli

# Compile contracts
midnight compile contracts/*.compact

# Run tests
midnight test contracts/*.test.ts
```

## Development

### Contract Structure

```
contracts/
├── dark_pool.compact      # Main contract
├── batch_verify.compact   # Batch verification circuit
├── state_root.compact     # State root storage
└── tests/
    └── dark_pool.test.ts  # Contract tests
```

### Writing Contracts

```compact
// Example: Batch verification circuit
circuit BatchVerify {
  // Private inputs (Witness Context)
  private input orders: EncryptedOrder[];
  private input witness: Witness;

  // Public inputs (Ledger Context)
  public input stateRoot: Field;
  public input batchHash: Field;

  // Output
  output proof: Proof;
}
```

### Testing

```bash
# Run all tests
midnight test

# Run specific test
midnight test contracts/tests/dark_pool.test.ts

# Run with coverage
midnight test --coverage
```

## Contract Interface

### State

```compact
state DarkPool {
  // Encrypted state commitments
  map<FieldName, Field> stateRoots;
  
  // Batch tracking
  map<FieldName, Field> batches;
  
  // Configuration
  field pairHash;
  field sequencerPublicKey;
}
```

### Functions

```compact
// Submit batch proof
function submitBatchProof(
  proof: Proof,
  batchHash: Field,
  newStateRoot: Field
) -> Bool;

// Verify state transition
function verifyStateTransition(
  oldStateRoot: Field,
  newStateRoot: Field,
  batchHash: Field
) -> Bool;
```

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
midnight deploy contracts/dark_pool.compact --network devnet

# Verify deployment
midnight verify <contract-address> --network devnet
```

### Testnet

```bash
# Deploy to testnet
midnight deploy contracts/dark_pool.compact --network testnet
```

## Troubleshooting

### Compilation Errors

Check Midnight Compact syntax:
```bash
midnight compile contracts/dark_pool.compact --verbose
```

### Proof Verification Failed

Verify proof format and circuit constraints:
```bash
midnight verify-proof <proof-file> --verbose
```

### Insufficient DUST

Check contract balance:
```bash
midnight balance <contract-address> --network devnet
```
