# Midnight Dark Pool - System Architecture

## Overview

This document defines the complete system architecture for the Midnight MEV-Resistant Dark Pool, implementing the Kachina Dual-State model with four distinct contexts.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           WITNESS CONTEXT (Client-Side)                         │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                          Client Frontend                                │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │   │
│  │  │ Local Encryption │  │ clientOrderId   │  │ Order Payload   │        │   │
│  │  │ (Sequencer PubKey)│ │ (UUID v4)       │ │ (Pair/Amount/Price)│     │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘        │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                            │
│                                    │ Order Submission                           │
│                                    │ (Encrypted Payload)                        │
│                                    ▼                                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│                           SEQUENCER CONTEXT (Server-Side)                       │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                          WebSocket Pipe                                 │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │  Full-Duplex Persistent Connection                              │   │   │
│  │  │  - Inbound: Encrypted Order Frames                              │   │   │
│  │  │  - Outbound: Signed Pre-Confirmation Receipts                   │   │   │
│  │  │  - Protocol: Binary WebSocket Frames                             │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                            │
│                                    │ Stream Order                               │
│                                    ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         Node.js Sequencer                               │   │
│  │                                                                         │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │   │
│  │  │ Mutex FIFO Queue │  │ In-Memory Order │  │ Batch Trigger   │        │   │
│  │  │ (Strict ordering)│  │ Book (RAM-only) │  │ Logic           │        │   │
│  │  └─────────────────┘  └─────────────────┘  │ - 50 orders     │        │   │
│  │                                             │ - 3s timeout    │        │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  └─────────────────┘        │   │
│  │  │ State Root      │  │ LRU Dedup       │                             │   │
│  │  │ Tracker         │  │ Cache           │                             │   │
│  │  └─────────────────┘  └─────────────────┘                             │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │              ▲                             │
│                                    │              │ Signed Receipt             │
│                                    │              │ (via WebSocket Pipe)        │
│                                    │              │                             │
│              ┌─────────────────────┼──────────────┘                             │
│              │                     │                                            │
│              ▼                     │                                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│                           CIRCUIT CONTEXT (Worker Thread)                       │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                       Worker Thread Prover                              │   │
│  │                                                                         │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │   │
│  │  │ IPC Receiver    │  │ Recursive ZK    │  │ Proof Generator │        │   │
│  │  │ (from Sequencer)│  │ Circuit Builder │  │ (Background)    │        │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘        │   │
│  │                                                                         │   │
│  │  ┌─────────────────┐  ┌─────────────────┐                             │   │
│  │  │ Batch Processor │  │ Proof Verifier  │                             │   │
│  │  │ (50 trades)     │  │ (Local check)   │                             │   │
│  │  └─────────────────┘  └─────────────────┘                             │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                            │
│                                    │ ZK Proof                                   │
│                                    │ (Single recursive proof for batch)         │
│                                    ▼                                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│                           LEDGER CONTEXT (On-Chain)                             │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        Midnight Ledger                                  │   │
│  │                                                                         │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │   │
│  │  │ Proof Verifier  │  │ State Root      │  │ DUST Calculator │        │   │
│  │  │ (ZK Validation) │  │ Storage         │  │ (Gas fees)      │        │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘        │   │
│  │                                                                         │   │
│  │  ┌─────────────────┐  ┌─────────────────┐                             │   │
│  │  │ Encrypted State │  │ State Transition│                             │   │
│  │  │ Commitments     │  │ Executor        │                             │   │
│  │  └─────────────────┘  └─────────────────┘                             │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                            │
│                                    │ State Event                                │
│                                    │ (After on-chain confirmation)              │
│                                    ▼                                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│                           DATA PERSISTENCE (Async Audit)                        │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                      PostgreSQL Audit                                   │   │
│  │                                                                         │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │   │
│  │  │ Order Records   │  │ Match Records   │  │ Settlement      │        │   │
│  │  │ (Post-settlement)│ │ (Post-matching) │  │ Records         │        │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘        │   │
│  │                                                                         │   │
│  │  ┌─────────────────┐  ┌─────────────────┐                             │   │
│  │  │ Batch Records   │  │ Disaster        │                             │   │
│  │  │ (ZK proof data) │  │ Recovery        │                             │   │
│  │  └─────────────────┘  └─────────────────┘                             │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow (Step-by-Step)

### Step 1: Order Submission (Witness Context → Sequencer Context)

```
Client Frontend                          WebSocket Pipe
     │                                        │
     │  1. Encrypt order locally              │
     │     (token pair, amount, price)        │
     │     using sequencer's public key       │
     │                                        │
     │  2. Generate clientOrderId (UUID v4)   │
     │                                        │
     │  3. Create encrypted order frame       │
     │     {                                  │
     │       type: 'ORDER',                   │
     │       clientOrderId: 'uuid',           │
     │       encryptedData: 'ciphertext',     │
     │       timestamp: Date.now()            │
     │     }                                  │
     │                                        │
     │──── Order Submission ─────────────────>│
     │     (Encrypted Payload)                │
```

### Step 2: Order Processing (Sequencer Context)

```
WebSocket Pipe                    Node.js Sequencer
     │                                   │
     │──── Stream Order ────────────────>│
     │                                   │
     │                          4. Acquire Mutex Lock
     │                                   │
     │                          5. Check LRU Dedup Cache
     │                             (clientOrderId)
     │                                   │
     │                          6. Add to In-Memory Order Book
     │                             (RAM-only, no DB)
     │                                   │
     │                          7. Attempt Price-Time Matching
     │                             (Sub-millisecond)
     │                                   │
     │                          8. Update State Root
     │                                   │
     │                          9. Release Mutex Lock
     │                                   │
     │                          10. Add to pendingBatch queue
     │                                   │
     │                          11. Check Batch Trigger:
     │                              - 50 orders? → Flush
     │                              - 3s timeout? → Flush
     │                                   │
     │<──── Signed Receipt ──────────────│
     │     (via WebSocket Pipe)          │
     │                                   │
```

### Step 3: Pre-Confirmation Receipt

```
Node.js Sequencer                  WebSocket Pipe                    Client Frontend
     │                                   │                                │
     │  12. Sign receipt with            │                                │
     │      sequencer's private key      │                                │
     │                                   │                                │
     │  Receipt = {                      │                                │
     │    type: 'PRE_CONFIRMATION',      │                                │
     │    clientOrderId: 'uuid',         │                                │
     │    stateRoot: '0x...',            │                                │
     │    timestamp: Date.now(),         │                                │
     │    signature: '0x...'             │                                │
     │  }                                │                                │
     │                                   │                                │
     │──── Signed Receipt ──────────────>│                                │
     │                                   │──── Signed Receipt ───────────>│
     │                                   │                                │
     │                                   │                    13. Verify signature
     │                                   │                    14. Update UI immediately
     │                                   │                    15. Show "Confirmed" status
```

### Step 4: Batch Proof Generation (Circuit Context)

```
Node.js Sequencer                  Worker Thread Prover
     │                                   │
     │  16. Batch ready (50 orders OR    │
     │      3s timeout reached)          │
     │                                   │
     │──── Batch Request (IPC) ─────────>│
     │     {                             │
     │       batchId: 'uuid',            │
     │       orders: [...],              │
     │       stateRoot: '0x...'          │
     │     }                             │
     │                                   │
     │                          17. Build ZK Circuit
     │                              (Recursive proof)
     │                                   │
     │                          18. Generate Witness
     │                              (From encrypted data)
     │                                   │
     │                          19. Generate Proof
     │                              (Polynomial math)
     │                                   │
     │                          20. Verify Proof Locally
     │                              (Optional check)
     │                                   │
     │<──── Batch Response (IPC) ────────│
     │      {                            │
     │        batchId: 'uuid',           │
     │        proofHash: '0x...',        │
     │        status: 'SUCCESS'          │
     │      }                            │
```

### Step 5: On-Chain Settlement (Ledger Context)

```
Worker Thread Prover               Midnight Ledger
     │                                   │
     │  21. Submit batch ZK proof        │
     │      to Midnight network          │
     │                                   │
     │──── Submit ZK Proof ─────────────>│
     │                                   │
     │                          22. Verify proof on-chain
     │                              (ZK validation)
     │                                   │
     │                          23. Update state commitments
     │                              (Encrypted state)
     │                                   │
     │                          24. Consume DUST
     │                              (Gas fees)
     │                                   │
     │                          25. Emit State Event
     │                              (Settlement confirmed)
     │                                   │
     │<──── State Event ────────────────│
     │      (Transaction hash)           │
```

### Step 6: Async Audit Persistence

```
Midnight Ledger                    PostgreSQL Audit
     │                                   │
     │  26. After on-chain confirmation  │
     │      (async, not blocking)        │
     │                                   │
     │──── State Event ─────────────────>│
     │                                   │
     │                          27. Write Order Records
     │                              (Post-settlement)
     │                                   │
     │                          28. Write Match Records
     │                              (Post-matching)
     │                                   │
     │                          29. Write Settlement Records
     │                              (Transaction hashes)
     │                                   │
     │                          30. Write Batch Records
     │                              (ZK proof data)
     │                                   │
     │                          31. Update Disaster Recovery
     │                              (Full audit trail)
```

---

## Component Details

### Client Frontend (Witness Context)

| Component | Responsibility |
|-----------|----------------|
| Local Encryption | Encrypt order details using sequencer's public key |
| clientOrderId | Generate UUID v4 for idempotency |
| Order Payload | Prepare token pair, amount, limit price |
| WebSocket Client | Maintain persistent connection to sequencer |
| Receipt Handler | Process and display pre-confirmation receipts |

### Node.js Sequencer (Sequencer Context)

| Component | Responsibility |
|-----------|----------------|
| WebSocket Pipe | Full-duplex persistent connection |
| Mutex FIFO Queue | Process orders sequentially, prevent race conditions |
| In-Memory Order Book | RAM-only order storage (no DB in execution loop) |
| Batch Trigger Logic | Flush at 50 orders OR 3-second timeout |
| State Root Tracker | Maintain optimistic state root |
| LRU Dedup Cache | Prevent duplicate order execution |
| Pre-Confirmation Signer | Sign receipts with sequencer's private key |

### Worker Thread Prover (Circuit Context)

| Component | Responsibility |
|-----------|----------------|
| IPC Receiver | Accept batch requests from sequencer |
| Recursive ZK Circuit Builder | Construct circuit for batch verification |
| Proof Generator | Generate ZK proofs (background, non-blocking) |
| Batch Processor | Handle 50 trades per batch |
| Proof Verifier | Local proof verification (optional) |

### Midnight Ledger (Ledger Context)

| Component | Responsibility |
|-----------|----------------|
| Proof Verifier | Validate ZK proofs on-chain |
| State Root Storage | Store encrypted state commitments |
| DUST Calculator | Compute gas fees for verification |
| Encrypted State | Maintain private state (never exposed) |
| State Transition Executor | Apply state changes after proof verification |

### PostgreSQL Audit (Data Persistence)

| Component | Responsibility |
|-----------|----------------|
| Order Records | Store finalized orders (post-settlement) |
| Match Records | Record matched trades (post-matching) |
| Settlement Records | Track on-chain settlement status |
| Batch Records | Store ZK proof metadata |
| Disaster Recovery | Provide full audit trail for recovery |

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Order processing latency | <1ms | Time from receipt to match |
| Soft finality (receipt) | <15ms | Time from match to receipt return |
| Batch proof generation | <5s | Time for 50-order batch |
| WebSocket throughput | 1000+ msg/s | Server benchmark |
| Memory usage | <512MB | Sequencer RAM |
| Proof verification (on-chain) | <100ms | Midnight ledger time |
| Database write (async) | <500ms | Post-confirmation persistence |

---

## Security Model

### What Each Context Sees

| Context | Sees | Does NOT See |
|---------|------|--------------|
| **Witness Context** | Raw order data (locally) | Other users' orders |
| **Sequencer Context** | Encrypted order frames | Plaintext trade data |
| **Circuit Context** | Encrypted batch data | Plaintext trade data |
| **Ledger Context** | ZK proofs only | Any trade data |
| **PostgreSQL** | Finalized settlement records | Real-time order data |

### MEV Resistance

```
Attack Vector: Front-running
Mitigation: Orders encrypted before leaving client
Result: MEV bots see only ciphertext

Attack Vector: Sandwich attacks
Mitigation: No order data visible in mempool
Result: No price manipulation possible

Attack Vector: Order flow analysis
Mitigation: Only ZK proofs on-chain
Result: No trade frequency data leaked
```

---

## Error Handling

### Connection Loss

```
Client Frontend                    WebSocket Pipe
     │                                   │
     │  Connection lost detected         │
     │                                   │
     │  1. Store clientOrderId locally   │
     │  2. Exponential backoff retry     │
     │  3. Send SYNC_STATE handshake     │
     │  4. Resume from last known state  │
```

### Batch Failure

```
Worker Thread Prover               Node.js Sequencer
     │                                   │
     │  Proof generation failed          │
     │                                   │
     │<──── Error Response ──────────────│
     │      {                            │
     │        batchId: 'uuid',           │
     │        status: 'FAILED',          │
     │        error: 'reason'            │
     │      }                            │
     │                                   │
     │  Sequencer handles:               │
     │  1. Retry with smaller batch      │
     │  2. Log error                     │
     │  3. Notify affected clients       │
     │  4. Maintain system stability     │
```

---

## Integration Points

### External Dependencies

| Service | Protocol | Purpose |
|---------|----------|---------|
| Midnight Devnet | HTTP/REST | Smart contract deployment |
| Midnight Ledger | gRPC | Proof submission |
| PostgreSQL | TCP | Audit persistence |

### Internal Communication

| Channel | Protocol | Purpose |
|---------|----------|---------|
| Client ↔ Sequencer | WebSocket | Order submission, receipts |
| Sequencer ↔ Worker | IPC (worker_threads) | Batch handoff |
| Worker ↔ Ledger | HTTP/gRPC | Proof submission |
| Ledger ↔ PostgreSQL | Async event | Audit logging |

---

*Architecture version: 1.0 | Last updated: 2026-08-21*
