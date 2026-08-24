import dotenv from 'dotenv';
import { Signer } from './signing/signer';
import { MatchingEngine } from './matching/engine';
import { BatchTrigger } from './batch/trigger';
import { LRUCache } from './dedup/cache';
import { DarkPoolServer } from './server/websocket';

dotenv.config();

const PORT = parseInt(process.env.PORT || '8081', 10);
const PRIVATE_KEY = process.env.PRIVATE_KEY || undefined;
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '50', 10);
const BATCH_TIMEOUT_MS = parseInt(process.env.BATCH_TIMEOUT_MS || '3000', 10);
const DEDUP_MAX_SIZE = parseInt(process.env.DEDUP_MAX_SIZE || '10000', 10);
const DEDUP_TTL_MS = parseInt(process.env.DEDUP_TTL_MS || '60000', 10);

console.log('[Midnight Sequencer] Starting...');
console.log(`[Config] Port: ${PORT}, BatchSize: ${BATCH_SIZE}, BatchTimeout: ${BATCH_TIMEOUT_MS}ms`);

const signer = new Signer(PRIVATE_KEY);
console.log(`[Signer] Public key: ${signer.getPublicKey().slice(0, 16)}...`);

const engine = new MatchingEngine();
const batchTrigger = new BatchTrigger(BATCH_SIZE, BATCH_TIMEOUT_MS);
const dedupCache = new LRUCache<string, boolean>(DEDUP_MAX_SIZE, DEDUP_TTL_MS);

const server = new DarkPoolServer(PORT, signer, engine, batchTrigger, dedupCache);

batchTrigger.startTimer(() => {
  if (batchTrigger.pendingCount() > 0) {
    const batch = batchTrigger.flush();
    console.log(`[BatchTrigger] Flushed batch ${batch.id} with ${batch.orders.length} orders`);
  }
});

server.start();

function gracefulShutdown(signal: string): void {
  console.log(`\n[Sequencer] Received ${signal}. Shutting down...`);
  server.stop();
  batchTrigger.clear();
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('uncaughtException', (error: Error) => {
  console.error('[Sequencer] Uncaught exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason: unknown) => {
  console.error('[Sequencer] Unhandled rejection:', reason);
});

export { signer, engine, batchTrigger, dedupCache, server };
