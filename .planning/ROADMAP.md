# Roadmap: Midnight MEV-Resistant Dark Pool

## Overview

| Field | Value |
|-------|-------|
| **Project** | Midnight MEV-Resistant Dark Pool |
| **Milestone** | v1.0 MVP |
| **Phases** | 5 |
| **Approach** | Sequential (each phase builds on previous) |

---

## Phase 1: Compact Smart Contract

### Goal
Define Ledger state and batch-verification circuit for single token pair

### Duration Estimate
3-5 days

### Requirements Addressed
- REQ-SC-01: Batch Verification Circuit
- REQ-SC-02: Encrypted State Management

### Deliverables
- [ ] `contracts/dark_pool.compact` - Main contract
- [ ] `contracts/batch_verify.compact` - Batch verification circuit
- [ ] `contracts/state_root.compact` - State root storage
- [ ] `contracts/tests/dark_pool.test.ts` - Unit tests
- [ ] Single token pair support (ETH/USDC for MVP)

### Gate Checks (Must Pass Before Phase 2)

```
+-----------------------------------------------------------------+
| GATE CHECKS - Phase 1 -> Phase 2                                |
+-----------------------------------------------------------------+
| [ ] CHECK 1: Contract compiles without errors                   |
| [ ] CHECK 2: All unit tests pass                                |
| [ ] CHECK 3: Contract deploys to devnet                         |
| [ ] CHECK 4: State root can be read                             |
| [ ] CHECK 5: Proof submission works (mock proof)                |
+-----------------------------------------------------------------+
```

### Manual Testing Guide

#### Test 1: Compilation Test
```bash
cd contracts
midnight compile *.compact
# Expected: No compilation errors
```

#### Test 2: Unit Test
```bash
midnight test contracts/tests/dark_pool.test.ts
# Expected: All tests pass
```

#### Test 3: Devnet Deployment
```bash
midnight devnet start
midnight deploy contracts/dark_pool.compact --network devnet
# Expected: Contract address returned
```

#### Test 4: State Root Read
```bash
midnight call <contract-address> getStateRoot --network devnet
# Expected: Returns initial state root (0x0)
```

#### Test 5: Mock Proof Submission
```bash
midnight call <contract-address> submitBatchProof --args <mock-proof> --network devnet
# Expected: Transaction succeeds
```

### Phase 1 Complete When:
- [x] All gate checks pass
- [x] Contract compiles without errors
- [x] Tests achieve 100% coverage
- [x] Contract deploys and runs on devnet
- [x] State transitions work correctly

---

## Phase 2: Sequencer Core

### Goal
TypeScript Mutex FIFO queue and in-memory matching engine

### Duration Estimate
4-6 days

### Requirements Addressed
- REQ-SEQ-01: Mutex-Locked FIFO Queue
- REQ-SEQ-02: In-Memory Matching Engine

### Deliverables
- [ ] `sequencer/src/queue/mutex-queue.ts` - FIFO queue with mutex
- [ ] `sequencer/src/matching/engine.ts` - In-memory matching engine
- [ ] `sequencer/src/matching/order-book.ts` - RAM-only order book
- [ ] `sequencer/src/state/state-root.ts` - State root tracker
- [ ] `sequencer/src/types/order.ts` - Type definitions
- [ ] `sequencer/tests/queue.test.ts` - Queue tests
- [ ] `sequencer/tests/matching.test.ts` - Matching tests

### Gate Checks (Must Pass Before Phase 3)

```
+-----------------------------------------------------------------+
| GATE CHECKS - Phase 2 -> Phase 3                                |
+-----------------------------------------------------------------+
| [ ] CHECK 1: TypeScript compiles without errors                 |
| [ ] CHECK 2: All unit tests pass                                |
| [ ] CHECK 3: Queue processes orders sequentially (FIFO)         |
| [ ] CHECK 4: Mutex prevents concurrent access                   |
| [ ] CHECK 5: Matching engine finds price-time matches           |
| [ ] CHECK 6: Sub-millisecond processing (<1ms per order)        |
+-----------------------------------------------------------------+
```

### Manual Testing Guide

#### Test 1: TypeScript Compilation
```bash
cd sequencer
npm install
npm run build
# Expected: No compilation errors
```

#### Test 2: Unit Tests
```bash
npm test
# Expected: All tests pass
```

#### Test 3: FIFO Order Test
```bash
node -e "
const { MutexQueue } = require('./dist/queue/mutex-queue');
const queue = new MutexQueue();
for (let i = 1; i <= 5; i++) queue.enqueue({ id: i });
const results = [];
while (!queue.isEmpty()) results.push(queue.dequeue().id);
console.log('Order:', results);
// Expected: [1, 2, 3, 4, 5]
"
```

#### Test 4: Mutex Concurrency Test
```bash
node -e "
const { MutexQueue } = require('./dist/queue/mutex-queue');
const queue = new MutexQueue();
const ops = [];
for (let i = 0; i < 10; i++) {
  ops.push(new Promise(r => setTimeout(() => { queue.enqueue({ id: i }); r(); }, Math.random() * 10)));
}
Promise.all(ops).then(() => console.log('Queue size:', queue.size(), 'Expected: 10'));
"
```

#### Test 5: Matching Test
```bash
node -e "
const { MatchingEngine } = require('./dist/matching/engine');
const engine = new MatchingEngine();
engine.addOrder({ id: 'buy-1', side: 'BUY', price: 100, amount: 10, timestamp: Date.now() });
const match = engine.addOrder({ id: 'sell-1', side: 'SELL', price: 100, amount: 5, timestamp: Date.now() + 1 });
console.log('Match:', match);
// Expected: Match created
"
```

#### Test 6: Performance Test
```bash
npm run test:performance
# Expected: <1ms average per order
```

### Phase 2 Complete When:
- [x] All gate checks pass
- [x] TypeScript compiles without errors
- [x] Tests achieve 100% coverage
- [x] FIFO ordering works correctly
- [x] Mutex prevents race conditions
- [x] Sub-millisecond processing achieved

---

## Phase 3: High-Speed Networking

### Goal
WebSocket server and cryptographic pre-confirmation signing

### Duration Estimate
4-6 days

### Requirements Addressed
- REQ-SEQ-03: WebSocket Server
- REQ-SEQ-04: Pre-Confirmation Signatures
- REQ-SEQ-05: Batch Trigger Logic
- REQ-CL-02: ClientOrderId Generation
- REQ-CL-03: WebSocket Reconnection

### Deliverables
- [ ] `sequencer/src/server/websocket.ts` - WebSocket server
- [ ] `sequencer/src/server/protocol.ts` - Message protocol
- [ ] `sequencer/src/signing/signer.ts` - Pre-confirmation signer
- [ ] `sequencer/src/batch/trigger.ts` - Batch trigger logic
- [ ] `sequencer/src/dedup/cache.ts` - LRU dedup cache
- [ ] `sequencer/src/index.ts` - Main entry point
- [ ] `cli/src/simulate.ts` - Basic simulation script
- [ ] `sequencer/tests/websocket.test.ts` - WebSocket tests

### Gate Checks (Must Pass Before Phase 4)

```
+-----------------------------------------------------------------+
| GATE CHECKS - Phase 3 -> Phase 4                                |
+-----------------------------------------------------------------+
| [ ] CHECK 1: WebSocket server starts on port 8081               |
| [ ] CHECK 2: Client can connect via WebSocket                   |
| [ ] CHECK 3: Order submission returns pre-confirmation receipt  |
| [ ] CHECK 4: Receipt response time <15ms                        |
| [ ] CHECK 5: Batch trigger fires at 50 orders                   |
| [ ] CHECK 6: Timeout trigger fires after 3 seconds              |
| [ ] CHECK 7: Duplicate detection works (LRU cache)              |
+-----------------------------------------------------------------+
```

### Manual Testing Guide

#### Test 1: Server Startup
```bash
cd sequencer
npm run dev
# Expected: "Server listening on port 8081"
```

#### Test 2: Client Connection
```bash
npm install -g wscat
wscat -c ws://localhost:8081
# Expected: "Connected (Press CTRL+C to quit)"
```

#### Test 3: Order Submission
```bash
# In wscat terminal:
> {"type":"ORDER","clientOrderId":"test-1","encryptedData":"encrypted-payload","timestamp":1692640000000}
# Expected: Pre-confirmation receipt returned
```

#### Test 4: Response Time Test
```bash
npm run test:latency
# Expected: Average <15ms
```

#### Test 5: Batch Trigger Test (50 Orders)
```bash
npm run test:batch-trigger
# Expected: Batch triggered after 50th order
```

#### Test 6: Timeout Trigger Test
```bash
npm run test:timeout-trigger
# Expected: Batch triggered after 3s timeout
```

#### Test 7: Duplicate Detection Test
```bash
npm run test:dedup
# Expected: Second submission rejected
```

### Phase 3 Complete When:
- [x] All gate checks pass
- [x] WebSocket server starts without errors
- [x] Order submission returns receipts
- [x] Response time <15ms achieved
- [x] Batch triggers work (count and timeout)
- [x] Duplicate detection works

---

## Phase 4: Background Prover Pool

### Goal
worker_threads IPC for non-blocking ZK generation

### Duration Estimate
5-7 days

### Requirements Addressed
- REQ-ZK-01: Background Proof Generation
- REQ-ZK-02: Recursive ZK Proof

### Deliverables
- [ ] `worker/src/index.ts` - Worker thread entry point
- [ ] `worker/src/prover/recursive-zk.ts` - ZK proof generator
- [ ] `worker/src/ipc/handler.ts` - IPC communication handler
- [ ] `worker/src/circuit/builder.ts` - Circuit builder
- [ ] `worker/tests/prover.test.ts` - Prover tests
- [ ] Integration with sequencer (IPC handoff)

### Gate Checks (Must Pass Before Phase 5)

```
+-----------------------------------------------------------------+
| GATE CHECKS - Phase 4 -> Phase 5                                |
+-----------------------------------------------------------------+
| [ ] CHECK 1: Worker thread starts                               |
| [ ] CHECK 2: IPC communication works (batch req/res)            |
| [ ] CHECK 3: Proof generation succeeds                          |
| [ ] CHECK 4: Main thread not blocked during proof gen           |
| [ ] CHECK 5: Proof submission to devnet works                    |
| [ ] CHECK 6: Batch size 50 completes in <5s                     |
+-----------------------------------------------------------------+
```

### Manual Testing Guide

#### Test 1: Worker Thread Startup
```bash
cd worker
npm install
npm run dev
# Expected: "Worker thread ready"
```

#### Test 2: IPC Communication Test
```bash
npm run test:ipc
# Expected: Response with proof hash received
```

#### Test 3: Proof Generation Test
```bash
npm run test:proof-generation
# Expected: Valid ZK proof generated
```

#### Test 4: Main Thread Blocking Test
```bash
npm run test:non-blocking
# Expected: Orders continue processing during proof gen
```

#### Test 5: Devnet Submission Test
```bash
npm run test:devnet-submit
# Expected: Transaction confirmed on devnet
```

#### Test 6: Performance Benchmark
```bash
npm run test:benchmark
# Expected: Proof generation <5s for 50 orders
```

### Phase 4 Complete When:
- [x] All gate checks pass
- [x] Worker thread starts without errors
- [x] IPC communication works
- [x] ZK proofs generate successfully
- [x] Main thread remains non-blocking
- [x] Performance target achieved (<5s for 50 orders)

---

## Phase 5: DevRel CLI Suite and SDK

### Goal
Multi-agent terminal simulation and SDK exports

### Duration Estimate
3-5 days

### Requirements Addressed
- REQ-CLI-01: Multi-Agent Simulation
- REQ-INF-01: Dockerized Setup

### Deliverables
- [ ] `cli/src/simulate.ts` - Multi-agent simulation
- [ ] `cli/src/wallets/mock.ts` - Mock wallet implementation
- [ ] `cli/src/commands/run.ts` - CLI command handler
- [ ] `cli/tests/simulation.test.ts` - Simulation tests
- [ ] `docker-compose.yml` - Full stack Docker setup
- [ ] `docker/Dockerfile.sequencer` - Sequencer image
- [ ] `docker/Dockerfile.worker` - Worker image
- [ ] `docker/Dockerfile.frontend` - Frontend image

### Gate Checks (Must Pass Before Release)

```
+-----------------------------------------------------------------+
| GATE CHECKS - Phase 5 -> Release                                |
+-----------------------------------------------------------------+
| [ ] CHECK 1: CLI simulation runs successfully                   |
| [ ] CHECK 2: Two mock wallets execute trade                     |
| [ ] CHECK 3: Full cryptographic lifecycle visible in logs       |
| [ ] CHECK 4: Docker Compose starts all services                 |
| [ ] CHECK 5: All services healthy and communicating             |
| [ ] CHECK 6: End-to-end test passes                             |
+-----------------------------------------------------------------+
```

### Manual Testing Guide

#### Test 1: CLI Simulation
```bash
cd cli
npm install
npm run simulate
# Expected: Full trade simulation completes
```

#### Test 2: Mock Wallets Test
```bash
npm run test:wallets
# Expected: Alice and Bob wallets created and trade
```

#### Test 3: Docker Compose Test
```bash
cd ..
docker-compose up -d
docker-compose ps
# Expected: All 4 services running (postgres, devnet, sequencer, worker)
```

#### Test 4: Service Health Check
```bash
curl http://localhost:3000/health
# Expected: {"status":"ok"}
```

#### Test 5: End-to-End Test
```bash
npm run test:e2e
# Expected: Full flow from order to settlement passes
```

#### Test 6: Docker Logs Check
```bash
docker-compose logs -f
# Expected: No errors, services communicating
```

### Phase 5 Complete When:
- [x] All gate checks pass
- [x] CLI simulation works
- [x] Two wallets execute trade
- [x] Docker starts all services
- [x] End-to-end flow works
- [x] Ready for release

---

## Execution Order

```
Phase 1 (Compact Contract)
    |
    v
Phase 2 (Sequencer Core)
    |
    v
Phase 3 (WebSocket Server)
    |
    v
Phase 4 (Worker Threads)
    |
    v
Phase 5 (CLI and SDK)
    |
    v
  RELEASE
```

## Parallelization Notes

Phases are sequential because:
- Phase 2 depends on Phase 1 (contract interface)
- Phase 3 depends on Phase 2 (matching engine)
- Phase 4 depends on Phase 3 (batch data from WebSocket)
- Phase 5 depends on Phase 4 (proof generation from worker)

## Risk Mitigation

| Phase | Primary Risk | Mitigation |
|-------|--------------|------------|
| 1 | Contract syntax errors | Use Midnight playground, incremental compilation |
| 2 | Mutex contention | Careful lock management, unit tests |
| 3 | WebSocket instability | Reconnection logic, connection pooling |
| 4 | Proof generation slow | Worker pool tuning, batch size adjustment |
| 5 | Integration issues | End-to-end testing, Docker isolation |

---

*Last updated: 2026-08-21*
