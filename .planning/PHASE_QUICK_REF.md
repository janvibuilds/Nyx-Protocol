# Phase Quick Reference

## Overview

Each phase has:
1. **Goal** - What you're building
2. **Deliverables** - Files to create
3. **Gate Checks** - Must pass before next phase
4. **Manual Tests** - How to verify it works

---

## Phase 1: Compact Smart Contract

**Goal:** Smart contract for batch verification

**Files to create:**
- `contracts/dark_pool.compact`
- `contracts/batch_verify.compact`
- `contracts/state_root.compact`
- `contracts/tests/dark_pool.test.ts`

**Quick test:**
```bash
cd contracts
midnight compile *.compact
midnight test contracts/tests/dark_pool.test.ts
midnight deploy contracts/dark_pool.compact --network devnet
```

**Gate:** Contract compiles, tests pass, deploys to devnet

---

## Phase 2: Sequencer Core

**Goal:** Mutex queue and matching engine

**Files to create:**
- `sequencer/src/queue/mutex-queue.ts`
- `sequencer/src/matching/engine.ts`
- `sequencer/src/matching/order-book.ts`
- `sequencer/src/state/state-root.ts`
- `sequencer/src/types/order.ts`
- `sequencer/tests/queue.test.ts`
- `sequencer/tests/matching.test.ts`

**Quick test:**
```bash
cd sequencer
npm install
npm run build
npm test
```

**Gate:** TypeScript compiles, tests pass, FIFO works, <1ms processing

---

## Phase 3: High-Speed Networking

**Goal:** WebSocket server and pre-confirmation

**Files to create:**
- `sequencer/src/server/websocket.ts`
- `sequencer/src/server/protocol.ts`
- `sequencer/src/signing/signer.ts`
- `sequencer/src/batch/trigger.ts`
- `sequencer/src/dedup/cache.ts`
- `sequencer/src/index.ts`
- `cli/src/simulate.ts`
- `sequencer/tests/websocket.test.ts`

**Quick test:**
```bash
cd sequencer
npm run dev
# In another terminal:
wscat -c ws://localhost:8081
> {"type":"ORDER","clientOrderId":"test-1","encryptedData":"test","timestamp":1692640000000}
```

**Gate:** Server starts, receipts return in <15ms, batch triggers work

---

## Phase 4: Background Prover Pool

**Goal:** Worker threads for ZK proof generation

**Files to create:**
- `worker/src/index.ts`
- `worker/src/prover/recursive-zk.ts`
- `worker/src/ipc/handler.ts`
- `worker/src/circuit/builder.ts`
- `worker/tests/prover.test.ts`

**Quick test:**
```bash
cd worker
npm install
npm run dev
npm run test:ipc
npm run test:proof-generation
```

**Gate:** Worker starts, IPC works, proofs generate in <5s

---

## Phase 5: DevRel CLI and SDK

**Goal:** CLI simulation and Docker setup

**Files to create:**
- `cli/src/simulate.ts`
- `cli/src/wallets/mock.ts`
- `cli/src/commands/run.ts`
- `cli/tests/simulation.test.ts`
- `docker-compose.yml`
- `docker/Dockerfile.sequencer`
- `docker/Dockerfile.worker`
- `docker/Dockerfile.frontend`

**Quick test:**
```bash
cd cli
npm install
npm run simulate
# In another terminal:
docker-compose up -d
docker-compose ps
```

**Gate:** Simulation works, Docker starts all services, E2E test passes

---

## Common Commands

| Action | Command |
|--------|---------|
| Install dependencies | `npm install` |
| Build TypeScript | `npm run build` |
| Run tests | `npm test` |
| Start dev server | `npm run dev` |
| Compile contracts | `midnight compile *.compact` |
| Deploy to devnet | `midnight deploy <contract> --network devnet` |
| Start Docker | `docker-compose up -d` |
| Check Docker | `docker-compose ps` |
| View logs | `docker-compose logs -f` |

---

## Troubleshooting

### Contract won't compile
- Check Midnight CLI version: `midnight --version`
- Verify syntax: `midnight compile --verbose <file>`

### TypeScript won't compile
- Check Node.js version: `node --version` (need 18+)
- Clear cache: `rm -rf node_modules dist`
- Reinstall: `npm install`

### WebSocket won't connect
- Verify server running: `curl http://localhost:3000/health`
- Check port: `netstat -an | grep 8081`
- Test with wscat: `wscat -c ws://localhost:8081`

### Docker won't start
- Check Docker running: `docker ps`
- View logs: `docker-compose logs`
- Rebuild: `docker-compose build --no-cache`

### Tests failing
- Check test output for specific failure
- Verify all dependencies installed
- Check environment variables in `.env`

---

*Last updated: 2026-08-21*
