import { parentPort } from 'worker_threads';
import { IPCHandler } from './ipc/handler';
import { BatchRequest } from './types/batch';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

const contractPath = process.env.CONTRACT_PATH || './contracts/dark-pool.compact';
const handler = new IPCHandler(contractPath);

if (parentPort) {
  parentPort.on('message', async (message: BatchRequest) => {
    logger.info(`[Worker] Received batch request: ${message.batchId}`);

    await handler.handleMessage(message, (response) => {
      if (parentPort) {
        parentPort.postMessage(response);
        logger.info(`[Worker] Sent response for batch ${message.batchId}: ${response.status}`);
      }
    });
  });

  parentPort.postMessage({ type: 'WORKER_READY' });
  logger.info('[Worker] Ready to process batch requests');
} else {
  // Standalone mode for development
  logger.info('[Worker] Running in standalone mode (no parent thread)');
  logger.info('[Worker] Accepting batch requests via stdin. Type JSON and press Enter.');

  process.stdin.setEncoding('utf-8');
  let buffer = '';

  process.stdin.on('data', async (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const message: BatchRequest = JSON.parse(line);
        logger.info(`[Worker] Received batch request: ${message.batchId}`);
        await handler.handleMessage(message, (response) => {
          process.stdout.write(JSON.stringify(response) + '\n');
          logger.info(`[Worker] Sent response for batch ${message.batchId}: ${response.status}`);
        });
      } catch (err) {
        logger.error(`[Worker] Invalid input: ${err}`);
      }
    }
  });

  logger.info('[Worker] Standing by...');
}

process.on('uncaughtException', (error) => {
  logger.error(`[Worker] Uncaught exception: ${error.message}`);
  if (parentPort) {
    parentPort.postMessage({
      type: 'WORKER_ERROR',
      error: error.message,
      timestamp: Date.now(),
    });
  }
});

process.on('unhandledRejection', (reason) => {
  logger.error(`[Worker] Unhandled rejection: ${reason}`);
  if (parentPort) {
    parentPort.postMessage({
      type: 'WORKER_ERROR',
      error: String(reason),
      timestamp: Date.now(),
    });
  }
});
