# Midnight MEV-Resistant Dark Pool - Project Summary

## Overview

This project implements an institutional-grade, zero-knowledge decentralized dark pool on Midnight Network's Kachina Dual-State architecture. The system eliminates MEV front-running through encrypted order submission and ZK-proof verification while achieving sub-15ms soft finality.

## Architecture

### Three-Context Model

1. **Witness Context (Client-Side):** Orders encrypted locally using sequencer's public key. Raw trade data never leaves the client unencrypted.

2. **Circuit Context (Worker Thread):** ZK proofs generated in background worker threads without blocking the main event loop.

3. **Ledger Context (On-Chain):** Smart contract verifies proofs and updates encrypted state commitments. Never sees raw trade data.

### Data Flow

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

## Project Structure

```
midnight-dark-pool/
├── .planning/           # Project planning documents
│   ├── PROJECT.md      # Project context and decisions
│   ├── REQUIREMENTS.md # Product Requirements Document
│   ├── ROADMAP.md      # Phase breakdown
│   └── STATE.md        # Project state
├── contracts/          # Midnight Compact smart contracts
├── sequencer/          # Node.js sequencer (WebSocket, matching, batch)
├── frontend/           # Next.js frontend with encrypted order submission
├── worker/             # ZK proof generation worker threads
├── cli/                # CLI tools and simulation scripts
├── prisma/             # Database schema (PostgreSQL)
├── docker/             # Docker configuration files
├── package.json        # Root package.json
├── docker-compose.yml  # Docker Compose setup
├── tsconfig.json       # TypeScript configuration
├── jest.config.ts      # Jest testing configuration
├── .prettierrc         # Prettier code formatting
├── .eslintrc.json      # ESLint linting
├── .env.example        # Environment variables template
└── README.md           # Project documentation
```

## Implementation Phases

### Phase 1: Compact Smart Contract
**Goal:** Define Ledger state and batch-verification circuit

**Deliverables:**
- Compact smart contract (v0.28+)
- Batch verification circuit
- State root storage
- Single token pair support

### Phase 2: Sequencer Core
**Goal:** TypeScript Mutex FIFO queue and in-memory matching engine

**Deliverables:**
- Mutex-locked FIFO queue
- In-memory matching engine
- Order book in RAM
- State delta queue

### Phase 3: High-Speed Networking
**Goal:** WebSocket server and cryptographic pre-confirmation signing

**Deliverables:**
- WebSocket server (ws library)
- Pre-confirmation signing
- <15ms response time
- Batch trigger (50 orders OR 3s)
- ClientOrderId deduplication
- Reconnection handling

### Phase 4: Background Prover Pool
**Goal:** worker_threads IPC for non-blocking ZK generation

**Deliverables:**
- worker_thread pool
- IPC communication
- Recursive ZK proof generation
- On-chain proof submission

### Phase 5: DevRel CLI Suite & SDK
**Goal:** Multi-agent terminal simulation and SDK exports

**Deliverables:**
- CLI simulation script
- Mock wallet instantiation
- TypeScript SDK
- Docker setup

## Key Features

### MVP Features

- **Encrypted Orders:** Orders encrypted locally before submission
- **ZK Proof Verification:** Batch proofs verified on-chain
- **Sub-15ms Finality:** Optimistic pre-confirmation receipts
- **MEV Resistance:** No front-running possible
- **Idempotent Operations:** UUID-based deduplication
- **Async Persistence:** Database writes after on-chain confirmation

### Future Features (v2+)

- Multi-token pair support
- Yield-bearing liquidity
- Programmable disclosure for compliance
- ZK-TWAP order slicing
- Third-party SDK exports

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Smart Contracts | Midnight Compact (v0.28+) | Ledger Context verification |
| Frontend | Next.js, Tailwind CSS, @midnight-ntwrk/midnight-js | UI/UX, Witness Context encryption |
| Networking | Persistent Full-Duplex WebSockets (ws) | Low-latency streaming |
| Sequencer | Node.js (Main Thread) + In-Memory RAM | Mutex-locked FIFO queue |
| ZK Proving | Node.js worker_threads (IPC) | Background proof generation |
| Database | PostgreSQL, Prisma ORM | Async audit logging |

## Getting Started

### Prerequisites

- Node.js 18+
- Docker
- Midnight devnet access

### Installation

```bash
# Clone repository
git clone <repository-url>
cd midnight-dark-pool

# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Start services
docker-compose up -d

# Run development
npm run dev
```

### CLI Simulation

```bash
# Run multi-agent simulation
npm run demo:simulate
```

## Documentation

- [Project Context](.planning/PROJECT.md) - Core value, constraints, decisions
- [Product Requirements](.planning/REQUIREMENTS.md) - Complete PRD
- [Implementation Roadmap](.planning/ROADMAP.md) - Phase breakdown
- [Project State](.planning/STATE.md) - Current progress

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.
