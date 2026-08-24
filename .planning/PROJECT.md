# Midnight MEV-Resistant Dark Pool

## What This Is

A decentralized Dark Pool DEX that leverages Midnight's zero-knowledge cryptography to completely conceal order sizes and limit prices, mathematically eliminating MEV bot front-running while ensuring trustless on-chain settlement.

## Problem Statement

Public DEXs are a slaughterhouse for large traders. Because the mempool is entirely transparent, MEV (Maximal Extractable Value) bots detect large orders before they execute, sandwich the trade, manipulate the price, and extract billions in slippage annually. Large capital cannot flow into Web3 because exposing liquidity intent guarantees immediate financial loss.

## Solution

We use Midnight's Compact smart contracts and Dual-State Ledger to physically separate trade execution from public settlement.

- **Private State**: Orders are submitted encrypted. The token pair, amount, and limit price remain completely hidden in the local Witness Context.
- **Public State**: The Dark Pool's matching engine validates the trade locally, generating a ZK-proof that strict execution rules were followed. Only this proof and the abstracted settlement are pushed to the Ledger Context, consuming DUST for computation. The trade executes flawlessly, but MEV bots see nothing but cryptographic noise.

## Scope & Benefits

### MVP Scope

A fast, responsive Next.js and Tailwind CSS frontend connecting to a Compact-based smart contract. The contract will handle encrypted order matching and ZK-proof verification for a single token pair.

### Benefits

- Protects institutional and retail traders from predatory MEV extraction
- Brings high-volume, institutional liquidity to the Midnight network
- Solves a critical Web3 bottleneck that public chains inherently cannot fix

## Core Value

The ONE thing that must work: **Encrypted orders must match on-chain without exposing trade data to MEV bots.**

## Constraints

- Must use Midnight's Compact language (v0.28+) for smart contracts
- Must use @midnight-ntwrk/midnight-js for client integration
- Must maintain <15ms soft finality for user experience
- Must generate ZK proofs in background worker threads (not blocking main event loop)
- PostgreSQL persistence must be async (never in execution loop)

## Tech Stack

| Layer | Technology | Primary Responsibility |
|-------|-----------|----------------------|
| Smart Contracts | Midnight Compact (v0.28+) | Ledger Context verification, state root validation, and recursive ZK proof settlement |
| Client / Frontend | Next.js, Tailwind CSS, @midnight-ntwrk/midnight-js | UI/UX, local key management, Witness Context encryption, and clientOrderId generation |
| Networking | Persistent Full-Duplex WebSockets (ws) | Low-latency, bidirectional streaming of encrypted order frames and signed receipts |
| Sequencer (Ingestion & Match) | Node.js (Main Thread) + In-Memory RAM structures | Mutex-locked FIFO queue, sub-millisecond RAM matching, and optimistic state tracking |
| ZK Proving Engine | Node.js worker_threads (IPC) | Background CPU/GPU heavy polynomial math and batch zk-SNARK generation |
| Data Persistence & Audit | PostgreSQL, Prisma ORM | Asynchronous audit logging and disaster recovery (never accessed in execution loop) |

## Architecture

**Detailed architecture:** See [ARCHITECTURE.md](./ARCHITECTURE.md) for complete system design, data flow, and component details.

### Four-Context Model

1. **Witness Context (Client-Side):** Orders encrypted locally using sequencer's public key
2. **Circuit Context (Worker Thread):** ZK proofs generated in background without blocking main loop
3. **Sequencer Context (Server-Side):** WebSocket pipe and Node.js matching engine
4. **Ledger Context (On-Chain):** Smart contract verifies proofs, never sees raw data

### Data Flow Summary

```
Client Frontend → Order Submission → WebSocket Pipe → Node.js Sequencer
                                                          │
                                          ┌───────────────┴───────────────┐
                                          │                               │
                                          ▼                               ▼
                              Signed Receipt                    Order Batch (IPC)
                              (via WebSocket)                          │
                                          │                           ▼
                                          │               Worker Thread Prover
                                          │                           │
                                          │                           ▼
                                          │                   ZK Proof
                                          │                           │
                                          │                           ▼
                                          │               Midnight Ledger
                                          │                           │
                                          │                           ▼
                                          │               PostgreSQL Audit
                                          │
                                          ▼
                              Client Frontend (UI Update)
```

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| **Sequencer sees plaintext** | Trades operator blindness for execution speed. MEV resistance comes from transit encryption, not sequencer blindness. ZK proofs prevent forging. | — Clarified |
| **Circuit keyword = proof boundary** | Midnight SDK auto-generates ZK proofs when calling circuit functions. Blockchain verifies assert statements inside circuits. | — Clarified |
| **X25519 + Ed25519 keys** | X25519 for encryption, Ed25519 for signing pre-confirmations. Stored as env vars. Frontend gets public X25519 key during WebSocket handshake. | — Clarified |
| **Dual frontend connections** | Frontend connects to sequencer via WebSocket (ws) AND to Midnight blockchain via @midnight-ntwrk/midnight-js. Separate connections. | — Clarified |
| **Midnight Lace wallet required** | Frontend requires Midnight Lace wallet extension for user key management and transaction signing. | — Clarified |
| **Limit orders only (MVP)** | Market orders in dark pools are toxic — infinite slippage risk. Unfilled orders sit in RAM order book. Partial fills supported. | — Clarified |
| **Worker writes PostgreSQL** | Worker confirms on-chain, writes to PostgreSQL directly via Prisma singleton. Main thread never touches DB. | — Clarified |
| **Preprod = Midnight testnet** | Deploy contract via Midnight CLI tools. Sequencer runs on cloud VPS. Connect to Preprod RPC node URL. | — Clarified |
| **productX = X/Twitter** | Create X/Twitter profile for hackathon submission. | — Clarified |
| **15ms = server processing only** | Time from sequencer receiving WebSocket frame to emitting signed receipt. Network latency is separate. | — Clarified |

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [~] REQ-01: Compact smart contract for batch verification and state root storage (contract compiles, tests pass, devnet deployment pending)
- [ ] REQ-02: TypeScript Mutex FIFO queue for order processing
- [ ] REQ-03: In-memory matching engine (RAM-only, no DB in execution loop)
- [ ] REQ-04: WebSocket server for encrypted order frames and receipts
- [ ] REQ-05: Cryptographic pre-confirmation signing (<15ms response)
- [ ] REQ-06: worker_thread for background ZK proof generation
- [ ] REQ-07: Batch trigger logic (50 orders OR 3s timeout)
- [ ] REQ-08: Recursive ZK proof generation for batch settlement
- [ ] REQ-09: On-chain proof submission to Midnight Ledger Context
- [ ] REQ-10: Async PostgreSQL persistence via Prisma (post-confirmation)
- [ ] REQ-11: Next.js frontend with encrypted order submission
- [ ] REQ-12: ClientOrderId (UUID) for idempotency and deduplication
- [ ] REQ-13: LRU deduplication cache for WebSocket reconnection
- [ ] REQ-14: SYNC_STATE handshake for reconnection recovery
- [ ] REQ-15: CLI simulation script (Alice/Bob mock wallets)
- [ ] REQ-16: Dockerized setup (local Midnight devnet, prover, sequencer, database)

### Out of Scope

- Multi-token pair support — MVP focuses on single pair
- Yield-bearing liquidity — Deferred to v2
- Programmable disclosure for compliance — Deferred to v2
- ZK-TWAP order slicing — Deferred to v2
- Third-party SDK exports — Deferred to v2
- Production HSM key management — Use dev keys for MVP

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-08-21 after initialization*
