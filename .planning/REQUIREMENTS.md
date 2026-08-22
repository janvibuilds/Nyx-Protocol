# Product Requirements Document: Midnight MEV-Resistant Dark Pool

## Document Information

| Field | Value |
|-------|-------|
| **Project Name** | Midnight MEV-Resistant Dark Pool |
| **Version** | 1.0 (MVP) |
| **Date** | 2026-08-21 |
| **Status** | Draft |
| **Author** | Engineering Team |

---

## 1. Executive Summary

### 1.1 Vision

Build an institutional-grade, zero-knowledge decentralized dark pool on Midnight Network that eliminates MEV front-running through encrypted order submission and ZK-proof verification, while achieving sub-15ms soft finality.

### 1.2 Problem Statement

Public DEXs expose trade intent through transparent mempools, enabling MEV bots to:
- Detect large orders before execution
- Sandwich trades and manipulate prices
- Extract billions in slippage annually
- Prevent institutional capital from flowing into Web3

### 1.3 Solution Overview

Use Midnight's Kachina Dual-State architecture to:
- Keep orders encrypted in Witness Context (client-side)
- Generate ZK-proofs in Circuit Context (worker threads)
- Verify proofs and settle on-chain in Ledger Context (on-chain)
- MEV bots see only cryptographic noise

### 1.4 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Soft finality latency | <15ms | WebSocket receipt timestamp |
| MEV front-running | 0 successful | Audit verification |
| Batch proof generation | <5s for 50 trades | Worker thread timing |
| System uptime | 99.9% | Sequencer monitoring |
| Order throughput | 1000+ orders/second | Matching engine benchmark |

---

## 2. User Personas

### 2.1 Institutional Trader

**Role:** Hedge fund, market maker, or whale trader
**Needs:** Execute large orders without price manipulation
**Pain:** Current DEXs expose order size and intent
**Value:** Dark pool protects capital from MEV extraction

### 2.2 Retail Trader

**Role:** Individual DeFi user
**Needs:** Fair execution without front-running
**Pain:** Small trades still get sandwiched
**Value:** Equal protection regardless of order size

### 2.3 Developer/Integrator

**Role:** Third-party aggregators and tools
**Needs:** SDK to route trades to dark pool
**Pain:** Complex ZK integration
**Value:** Clean TypeScript SDK for easy integration

---

## 3. Functional Requirements

### 3.1 Smart Contract Layer (Ledger Context)

#### REQ-SC-01: Batch Verification Circuit
- **Description:** Compact smart contract verifies recursive ZK proofs for batched trades
- **Priority:** P0 (Critical)
- **Acceptance Criteria:**
  - Contract accepts batch proof submissions
  - Verifies proof correctness on-chain
  - Updates encrypted state commitments
  - Consumes DUST for computation
- **Technical Notes:**
  - Use Midnight Compact v0.28+
  - Single token pair support for MVP
  - State root storage for batch verification

#### REQ-SC-02: Encrypted State Management
- **Description:** Contract maintains encrypted state commitments without exposing raw data
- **Priority:** P0 (Critical)
- **Acceptance Criteria:**
  - State commitments stored on-chain
  - Raw trade data never visible to contract
  - State transitions provably correct
- **Technical Notes:**
  - Dual-state architecture (private + public)
  - Witness Context for private data
  - Ledger Context for public verification

### 3.2 Sequencer Layer (Main Thread)

#### REQ-SEQ-01: Mutex-Locked FIFO Queue
- **Description:** Orders processed sequentially in RAM to prevent race conditions
- **Priority:** P0 (Critical)
- **Acceptance Criteria:**
  - Strict FIFO ordering
  - Mutex lock prevents concurrent access
  - Sub-millisecond processing per order
  - No database calls in execution loop
- **Technical Notes:**
  - Use Node.js Mutex implementation
  - RAM-only state management
  - Optimistic state root tracking

#### REQ-SEQ-02: In-Memory Matching Engine
- **Description:** Match buy/sell orders entirely in RAM
- **Priority:** P0 (Critical)
- **Acceptance Criteria:**
  - Price-time priority matching
  - Support limit orders only (MVP)
  - Single token pair
  - No persistence during matching
- **Technical Notes:**
  - Order book maintained in RAM
  - No PostgreSQL access during execution
  - State delta queued for batch processing

#### REQ-SEQ-03: WebSocket Server
- **Description:** Full-duplex WebSocket server for order submission and receipts
- **Priority:** P0 (Critical)
- **Acceptance Criteria:**
  - Persistent WebSocket connections
  - Encrypted order frame reception
  - Pre-confirmation receipt streaming
  - No HTTP endpoints for trading
- **Technical Notes:**
  - Use `ws` library
  - Binary frame protocol
  - Connection health monitoring

#### REQ-SEQ-04: Pre-Confirmation Signatures
- **Description:** Cryptographic signing and return of receipts within 15ms
- **Priority:** P0 (Critical)
- **Acceptance Criteria:**
  - Sign receipt with sequencer key
  - Return receipt via WebSocket
  - Response time <15ms
  - Include clientOrderId for deduplication
- **Technical Notes:**
  - Use Ed25519 or similar
  - Receipt includes: clientOrderId, timestamp, stateRoot, signature
  - Frontend updates immediately on receipt

#### REQ-SEQ-05: Batch Trigger Logic
- **Description:** Trigger batch proof generation on count or timeout
- **Priority:** P0 (Critical)
- **Acceptance Criteria:**
  - Trigger at 50 orders
  - Trigger at 3-second timeout
  - Whichever comes first
  - Flush pendingBatch queue to worker
- **Technical Notes:**
  - pendingBatch array holds state deltas
  - Timer resets on each flush
  - Batch metadata includes order IDs

### 3.3 ZK Proving Layer (Worker Thread)

#### REQ-ZK-01: Background Proof Generation
- **Description:** Generate recursive ZK proofs in worker threads without blocking main loop
- **Priority:** P0 (Critical)
- **Acceptance Criteria:**
  - Runs in worker_thread (not main thread)
  - Receives batch via IPC
  - Generates proof asynchronously
  - Returns proof to main thread
- **Technical Notes:**
  - Use Node.js worker_threads
  - IPC for communication
  - Pool of workers for throughput

#### REQ-ZK-02: Recursive ZK Proof
- **Description:** Single proof verifying entire batch of trades
- **Priority:** P0 (Critical)
- **Acceptance Criteria:**
  - Proof covers all trades in batch
  - Proof verifies execution rules
  - Proof is verifiable on-chain
  - Proof size is reasonable
- **Technical Notes:**
  - Recursive proof composition
  - Circuit Context constraints
  - Midnight ZK toolchain

### 3.4 Client Layer (Frontend)

#### REQ-CL-01: Encrypted Order Submission
- **Description:** Client encrypts order details locally before sending
- **Priority:** P0 (Critical)
- **Acceptance Criteria:**
  - Token pair encrypted locally
  - Amount encrypted locally
  - Limit price encrypted locally
  - Uses sequencer's public key
  - Raw data never leaves client unencrypted
- **Technical Notes:**
  - Witness Context encryption
  - @midnight-ntwrk/midnight-js integration
  - Local key management

#### REQ-CL-02: ClientOrderId Generation
- **Description:** Unique UUID for each order for idempotency
- **Priority:** P0 (Critical)
- **Acceptance Criteria:**
  - UUID v4 generated client-side
  - Included in all requests
  - Used for deduplication
  - Persisted locally for reconnection
- **Technical Notes:**
  - UUID v4 format
  - Stored in localStorage
  - Sent in every WebSocket frame

#### REQ-CL-03: WebSocket Reconnection
- **Description:** Automatic reconnection with state synchronization
- **Priority:** P1 (High)
- **Acceptance Criteria:**
  - Detect connection drop
  - Auto-reconnect with exponential backoff
  - Send SYNC_STATE handshake
  - Resume from last known state
- **Technical Notes:**
  - LRU deduplication cache on server
  - clientOrderId used for dedup
  - State sync on reconnect

### 3.5 Data Persistence Layer

#### REQ-DB-01: Async Audit Logging
- **Description:** Persist trades to PostgreSQL only after on-chain confirmation
- **Priority:** P1 (High)
- **Acceptance Criteria:**
  - Write happens after on-chain settlement
  - Never accessed during execution loop
  - Complete audit trail
  - Disaster recovery capability
- **Technical Notes:**
  - Prisma ORM
  - Async write from worker thread
  - PostgreSQL database

### 3.6 CLI Simulation

#### REQ-CLI-01: Multi-Agent Simulation
- **Description:** CLI script simulating two mock wallets executing a trade
- **Priority:** P1 (High)
- **Acceptance Criteria:**
  - Instantiate Alice and Bob wallets
  - Execute trade over WebSocket
  - Show full cryptographic lifecycle
  - No UI required
- **Technical Notes:**
  - `npm run demo:simulate`
  - Terminal output
  - Mock wallet keys

### 3.7 Infrastructure

#### REQ-INF-01: Dockerized Setup
- **Description:** Single docker-compose.yml for local development
- **Priority:** P1 (High)
- **Acceptance Criteria:**
  - Local Midnight devnet
  - Prover service
  - Sequencer service
  - Database service
  - Single command startup
- **Technical Notes:**
  - docker-compose.yml
  - Health checks
  - Volume persistence

---

## 4. Non-Functional Requirements

### 4.1 Performance

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| Order processing latency | <1ms | Time from receipt to match |
| Soft finality | <15ms | Time from match to receipt |
| Batch proof generation | <5s | Time for 50-order batch |
| WebSocket throughput | 1000+ msg/s | Server benchmark |
| Memory usage | <512MB | Sequencer RAM |

### 4.2 Security

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| Order encryption | AES-256 or equivalent | Cryptographic audit |
| Key management | Secure storage | No hardcoded keys |
| Proof verification | On-chain validation | Contract audit |
| MEV resistance | Zero front-running | Adversarial testing |

### 4.3 Reliability

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| System uptime | 99.9% | Monitoring |
| Data durability | Zero loss | Async persistence |
| Idempotency | Exactly-once | Deduplication cache |
| Reconnection | Seamless | UX testing |

### 4.4 Scalability

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| Concurrent connections | 1000+ | Load testing |
| Batch size | 50 orders | Configuration |
| Worker pool | Configurable | Environment variable |

---

## 5. Technical Architecture

### 5.1 Three-Context Model

```
[ Frontend / SDK ]
        |
        |---(1. Encrypted Order Frame via WebSocket)--->  [ Sequencer (RAM) ]
        ^                                                                  |
        |---(3. Signed Pre-Confirmation Receipt < 15ms)--------------------| (2. Mutex Match & State Update)
                                                                           |
                                                           (4. Batch Trigger: 50 orders OR 3s timeout)
                                                                           v
[ Midnight Ledger Context ] <---(6. Submit Batch ZK Proof)--- [ Worker Thread (Circuit Context) ]
         |
(7. Verify Proof & Consume DUST)
         v
[ PostgreSQL (via Prisma) ] <---(8. Asynchronous Audit Logging)
```

### 5.2 Data Flow

1. **Witness Context (Client-Side):** User's device encrypts trade details (amount, pair, limit price) using the matching engine's public key. Raw trade data never leaves the client unencrypted.

2. **Sequencer (RAM):** Node.js receives order over WebSocket. Mutex lock ensures sequential processing in RAM, eliminating race conditions and state contention.

3. **Soft Finality (<15ms):** Sequencer signs optimistic cryptographic pre-confirmation receipt and streams back to client. Frontend updates immediately.

4. **Pipelined Batching:** Trade state delta enters pendingBatch queue. When batch hits 50 orders or reaches 3-second timeout, array is flushed.

5. **Decoupled Proving (Circuit Context):** Batch dispatched via IPC to background worker_thread. Main thread instantly returns to processing incoming socket traffic.

6. **On-Chain Settlement (Ledger Context):** Worker generates single recursive ZK proof verifying all 50 trades executed according to contract rules. Submitted to Midnight to update global encrypted ledger.

7. **Async Audit Persistence:** Once on-chain transaction confirms, worker instructs Prisma to write finalized trades to PostgreSQL.

### 5.3 Unique Advantages

| Feature | Traditional Dark Pools | Midnight Dark Pool |
|---------|----------------------|-------------------|
| Proving | MPC across distributed nodes (high latency) | Local Witness Context (fast) |
| State Leakage | L1 calldata leaks trade frequency | Dual-state keeps private state local |
| Compliance | Mixer-style (no disclosure) | Programmable disclosure |
| Idle Liquidity | Unproductive | Yield-bearing in Midnight protocols |

---

## 6. Implementation Phases

### Phase 1: Compact Smart Contract
- **Goal:** Define Ledger state and batch-verification circuit
- **Deliverables:**
  - Compact smart contract for single token pair
  - Batch verification circuit
  - State root storage
- **Dependencies:** Midnight Compact v0.28+

### Phase 2: Sequencer Core
- **Goal:** TypeScript Mutex FIFO queue and in-memory matching engine
- **Deliverables:**
  - Mutex-locked FIFO queue
  - In-memory matching engine
  - Order book in RAM
- **Dependencies:** Phase 1

### Phase 3: High-Speed Networking
- **Goal:** WebSocket server and cryptographic pre-confirmation signing
- **Deliverables:**
  - WebSocket server (ws library)
  - Pre-confirmation signing
  - <15ms response time
- **Dependencies:** Phase 2

### Phase 4: Background Prover Pool
- **Goal:** worker_threads IPC for non-blocking ZK generation
- **Deliverables:**
  - worker_thread pool
  - IPC communication
  - Recursive ZK proof generation
- **Dependencies:** Phase 3

### Phase 5: DevRel CLI Suite & SDK
- **Goal:** Multi-agent terminal simulation and SDK exports
- **Deliverables:**
  - CLI simulation script
  - Mock wallet instantiation
  - TypeScript SDK
- **Dependencies:** Phase 4

---

## 7. Risk Assessment

### 7.1 Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| ZK proof generation too slow | High | Medium | Worker thread pool sizing, proof optimization |
| Midnight API changes | High | Low | Pin version, monitor releases |
| WebSocket stability | Medium | Medium | Reconnection logic, health checks |
| Memory pressure | Medium | Low | RAM limits, garbage collection tuning |

### 7.2 Security Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Sequencer key compromise | Critical | Low | HSM integration (v2), secure key storage |
| Proof soundness vulnerability | Critical | Low | Formal verification, audits |
| Replay attacks | High | Medium | clientOrderId deduplication, timestamps |
| State desynchronization | Medium | Medium | SYNC_STATE handshake, state verification |

### 7.3 Operational Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Database failure | Medium | Low | Async persistence, disaster recovery |
| Network partitions | Medium | Medium | Idempotency, reconnection handling |
| Batch timeout misconfiguration | Low | Medium | Tunable parameters, monitoring |

---

## 8. Dependencies

### 8.1 External Dependencies

| Dependency | Version | Purpose | Status |
|------------|---------|---------|--------|
| Midnight Compact | v0.28+ | Smart contracts | Stable |
| @midnight-ntwrk/midnight-js | Latest | Client SDK | Stable |
| Node.js | 18+ | Runtime | Stable |
| Next.js | 14+ | Frontend | Stable |
| Tailwind CSS | 3+ | Styling | Stable |
| PostgreSQL | 15+ | Database | Stable |
| Prisma | Latest | ORM | Stable |
| ws | Latest | WebSockets | Stable |

### 8.2 Internal Dependencies

| Dependency | Phase | Purpose |
|------------|-------|---------|
| Compact contract | Phase 1 → All | Foundation |
| Matching engine | Phase 2 → 3,4 | Order processing |
| WebSocket server | Phase 3 → 5 | Networking |
| Worker threads | Phase 4 → 5 | Proof generation |

---

## 9. Acceptance Criteria Summary

### 9.1 Definition of Done

- [ ] All P0 requirements implemented
- [ ] All P1 requirements implemented
- [ ] Unit test coverage >80%
- [ ] Integration tests passing
- [ ] Load test meets performance targets
- [ ] Security audit complete
- [ ] Documentation complete
- [ ] Docker setup functional
- [ ] CLI simulation working

### 9.2 Release Criteria

- [ ] Zero successful MEV front-running attempts in testing
- [ ] <15ms soft finality achieved
- [ ] Batch proof generation <5s
- [ ] System uptime >99.9% in staging
- [ ] All personas validated through testing

---

## 10. Appendices

### 10.1 Glossary

| Term | Definition |
|------|------------|
| **MEV** | Maximal Extractable Value — profit from reordering/inserting transactions |
| **Dark Pool** | Exchange where order information is hidden until execution |
| **ZK Proof** | Zero-Knowledge Proof — cryptographic proof without revealing data |
| **Witness Context** | Private data storage in Midnight architecture |
| **Circuit Context** | ZK proof generation environment |
| **Ledger Context** | On-chain verification environment |
| **DUST** | Midnight token for computation costs |
| **Soft Finality** | Optimistic confirmation before on-chain settlement |
| **Mutex** | Mutual exclusion lock for thread safety |
| **FIFO** | First-In-First-Out queue |

### 10.2 Reference Architecture

See `PROJECT.md` for complete technical architecture and flow diagrams.

### 10.3 Related Documents

- `PROJECT.md` — Project context and decisions
- `ROADMAP.md` — Phase breakdown and timeline
- `PLAN.md` — Detailed implementation plans (per phase)

---

*Document version: 1.0 | Last updated: 2026-08-21*
