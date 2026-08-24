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
  logger.error('[Worker] No parent port available. Worker must be spawned as a worker thread.');
  process.exit(1);
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
