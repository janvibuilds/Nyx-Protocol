# Midnight MEV-Resistant Dark Pool

A zero-knowledge decentralized dark pool built on Midnight Network's Kachina Dual-State architecture, eliminating MEV front-running through encrypted order submission and ZK-proof verification.

## Overview

This project implements an institutional-grade dark pool that:
- Keeps orders encrypted in Witness Context (client-side)
- Generates ZK-proofs in Circuit Context (worker threads)
- Verifies proofs and settles on-chain in Ledger Context
- Achieves sub-15ms soft finality

## Architecture

**Detailed architecture:** See [ARCHITECTURE.md](.planning/ARCHITECTURE.md) for complete system design, data flow, and component details.

### Four-Context Model

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
│                           SEQUENCER CONTEXT (Server-Side)                       │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                          WebSocket Pipe                                 │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │  Full-Duplex Persistent Connection                              │   │   │
│  │  │  - Inbound: Encrypted Order Frames                              │   │   │
│  │  │  - Outbound: Signed Pre-Confirmation Receipts                   │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │              ▲                             │
│                                    │ Stream Order │ Signed Receipt             │
│                                    ▼              │ (via WebSocket Pipe)        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         Node.js Sequencer                               │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │   │
│  │  │ Mutex FIFO Queue │  │ In-Memory Order │  │ Batch Trigger   │        │   │
│  │  │ (Strict ordering)│  │ Book (RAM-only) │  │ Logic           │        │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘        │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                            │
│                                    │ Order Batch (IPC)                          │
│                                    ▼                                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                           CIRCUIT CONTEXT (Worker Thread)                       │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                       Worker Thread Prover                              │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │   │
│  │  │ IPC Receiver    │  │ Recursive ZK    │  │ Proof Generator │        │   │
│  │  │ (from Sequencer)│  │ Circuit Builder │  │ (Background)    │        │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘        │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                            │
│                                    │ ZK Proof                                   │
│                                    ▼                                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                           LEDGER CONTEXT (On-Chain)                             │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        Midnight Ledger                                  │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │   │
│  │  │ Proof Verifier  │  │ State Root      │  │ DUST Calculator │        │   │
│  │  │ (ZK Validation) │  │ Storage         │  │ (Gas fees)      │        │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘        │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                            │
│                                    │ State Event                                │
│                                    ▼                                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                           DATA PERSISTENCE (Async Audit)                        │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                      PostgreSQL Audit                                   │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │   │
│  │  │ Order Records   │  │ Match Records   │  │ Settlement      │        │   │
│  │  │ (Post-settlement)│ │ (Post-matching) │  │ Records         │        │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘        │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Summary

```
1. Client Frontend ──(Order Submission)──> WebSocket Pipe
2. WebSocket Pipe ──(Stream Order)──> Node.js Sequencer
3. Node.js Sequencer ──(Signed Receipt)──> WebSocket Pipe ──> Client Frontend
4. Node.js Sequencer ──(Order Batch / IPC)──> Worker Thread Prover
5. Worker Thread Prover ──(ZK Proof)──> Midnight Ledger
6. Midnight Ledger ──(State Event)──> PostgreSQL Audit
```

## Tech Stack

- **Smart Contracts:** Midnight Compact (v0.28+)
- **Frontend:** Next.js, Tailwind CSS, @midnight-ntwrk/midnight-js
- **Sequencer:** Node.js, WebSockets (ws), worker_threads
- **Database:** PostgreSQL, Prisma ORM

## Implementation Phases

1. **Phase 1:** Compact Smart Contract (Ledger Context)
2. **Phase 2:** Sequencer Core (Mutex FIFO queue)
3. **Phase 3:** High-Speed Networking (WebSocket server)
4. **Phase 4:** Background Prover Pool (worker_threads)
5. **Phase 5:** DevRel CLI Suite & SDK

## Getting Started

### Prerequisites

- Node.js 18+
- Docker
- Midnight devnet access

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd midnight-dark-pool

# Install dependencies
npm install

# Start development
npm run dev
```

### Docker Setup

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

## Development

### CLI Simulation

```bash
# Run multi-agent simulation
npm run demo:simulate
```

### Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run load tests
npm run test:load
```

## Project Structure

```
midnight-dark-pool/
├── .planning/           # Project planning documents
│   ├── PROJECT.md      # Project context
│   ├── REQUIREMENTS.md # PRD
│   ├── ROADMAP.md      # Phase breakdown
│   └── STATE.md        # Project state
├── contracts/          # Midnight Compact contracts
├── sequencer/          # Node.js sequencer
├── frontend/           # Next.js frontend
├── worker/             # ZK proof worker threads
├── cli/                # CLI tools
├── prisma/             # Database schema
└── docker/             # Docker configuration
```

## Documentation

- [Project Context](.planning/PROJECT.md)
- [Architecture](.planning/ARCHITECTURE.md)
- [Product Requirements](.planning/REQUIREMENTS.md)
- [Implementation Roadmap](.planning/ROADMAP.md)
- [Project State](.planning/STATE.md)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Midnight Network for the Kachina Dual-State architecture
- The ZK cryptography community for zero-knowledge proof research
- MEV researchers for highlighting the front-running problem
