# Prisma Database Setup

## Schema Overview

This database stores audit logs and disaster recovery data. The execution loop never accesses the database directly.

### Models

- **Order**: Stores encrypted order metadata (post-settlement)
- **Match**: Records matched buy/sell orders
- **Settlement**: Tracks on-chain settlement status
- **Batch**: Groups orders for ZK proof generation
- **SequencerState**: Stores sequencer state root

## Setup

### 1. Generate Prisma Client

```bash
npx prisma generate
```

### 2. Run Migrations

```bash
npx prisma migrate dev --name init
```

### 3. Seed Database (Optional)

```bash
npx prisma db seed
```

### 4. View Database

```bash
npx prisma studio
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
DATABASE_URL=postgresql://midnight:midnight_secret@localhost:5432/midnight_dark_pool
```

## Important Notes

- **Never** access database during execution loop
- **Only** write to database after on-chain confirmation
- Database is for audit trail and disaster recovery only
