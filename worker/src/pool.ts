import { Worker } from 'worker_threads';
import { BatchRequest, BatchResponse, BatchStatus } from './types/batch';
import winston from 'winston';
import { EventEmitter } from 'events';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

interface WorkerInfo {
  worker: Worker;
  busy: boolean;
  currentBatchId: string | null;
}

interface PendingRequest {
  batch: BatchRequest;
  resolve: (response: BatchResponse) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export class WorkerPool extends EventEmitter {
  private workers: WorkerInfo[] = [];
  private queue: PendingRequest[] = [];
  private workerPath: string;
  private poolSize: number;
  private maxQueueSize: number;
  private requestTimeout: number;

  constructor(
    workerPath: string,
    poolSize: number = parseInt(process.env.WORKER_THREADS || '4', 10),
    maxQueueSize: number = 100,
    requestTimeout: number = 30000
  ) {
    super();
    this.workerPath = workerPath;
    this.poolSize = poolSize;
    this.maxQueueSize = maxQueueSize;
    this.requestTimeout = requestTimeout;
    this.initWorkers();
  }

  private initWorkers(): void {
    for (let i = 0; i < this.poolSize; i++) {
      this.spawnWorker(i);
    }
  }

  private spawnWorker(index: number): WorkerInfo {
    const worker = new Worker(this.workerPath);

    const workerInfo: WorkerInfo = {
      worker,
      busy: false,
      currentBatchId: null,
    };

    worker.on('message', (message: any) => {
      this.handleWorkerMessage(workerInfo, message);
    });

    worker.on('error', (error) => {
      logger.error(`[WorkerPool] Worker ${index} error: ${error.message}`);
      this.handleWorkerCrash(workerInfo);
    });

    worker.on('exit', (code) => {
      logger.warn(`[WorkerPool] Worker ${index} exited with code ${code}`);
      this.handleWorkerCrash(workerInfo);
    });

    this.workers[index] = workerInfo;
    logger.info(`[WorkerPool] Worker ${index} spawned`);

    return workerInfo;
  }

  private handleWorkerMessage(workerInfo: WorkerInfo, message: any): void {
    if (message.type === 'WORKER_READY') {
      logger.info('[WorkerPool] Worker ready');
      return;
    }

    if (message.type === 'STATUS_UPDATE') {
      this.emit('status', message);
      return;
    }

    if (message.type === 'BATCH_RESPONSE') {
      const response = message as BatchResponse;
      const pendingRequest = this.queue.find(
        (req) => req.batch.batchId === response.batchId
      );

      if (pendingRequest) {
        clearTimeout(pendingRequest.timeout);
        this.queue = this.queue.filter(
          (req) => req.batch.batchId !== response.batchId
        );
        workerInfo.busy = false;
        workerInfo.currentBatchId = null;
        pendingRequest.resolve(response);
        this.processQueue();
      }
    }

    if (message.type === 'WORKER_ERROR') {
      logger.error(`[WorkerPool] Worker reported error: ${message.error}`);
      if (workerInfo.currentBatchId) {
        const pendingRequest = this.queue.find(
          (req) => req.batch.batchId === workerInfo.currentBatchId
        );
        if (pendingRequest) {
          clearTimeout(pendingRequest.timeout);
          this.queue = this.queue.filter(
            (req) => req.batch.batchId !== workerInfo.currentBatchId
          );
          pendingRequest.reject(new Error(message.error));
        }
      }
      workerInfo.busy = false;
      workerInfo.currentBatchId = null;
      this.processQueue();
    }
  }

  private handleWorkerCrash(crashedWorker: WorkerInfo): void {
    if (crashedWorker.currentBatchId) {
      const pendingRequest = this.queue.find(
        (req) => req.batch.batchId === crashedWorker.currentBatchId
      );
      if (pendingRequest) {
        clearTimeout(pendingRequest.timeout);
        this.queue = this.queue.filter(
          (req) => req.batch.batchId !== crashedWorker.currentBatchId
        );
        pendingRequest.reject(new Error('Worker crashed during proof generation'));
      }
    }

    crashedWorker.busy = false;
    crashedWorker.currentBatchId = null;

    const index = this.workers.indexOf(crashedWorker);
    if (index !== -1) {
      logger.info(`[WorkerPool] Restarting worker ${index}`);
      this.spawnWorker(index);
    }
  }

  async submitBatch(batch: BatchRequest): Promise<BatchResponse> {
    if (this.queue.length >= this.maxQueueSize) {
      throw new Error('Worker pool queue overflow');
    }

    return new Promise<BatchResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.queue = this.queue.filter((req) => req.batch.batchId !== batch.batchId);
        reject(new Error(`Proof generation timeout for batch ${batch.batchId}`));
      }, this.requestTimeout);

      const request: PendingRequest = {
        batch,
        resolve,
        reject,
        timeout,
      };

      this.queue.push(request);
      this.processQueue();
    });
  }

  private processQueue(): void {
    const availableWorker = this.workers.find((w) => !w.busy);

    if (!availableWorker || this.queue.length === 0) {
      return;
    }

    const nextRequest = this.queue[0];
    if (!nextRequest) {
      return;
    }

    availableWorker.busy = true;
    availableWorker.currentBatchId = nextRequest.batch.batchId;

    logger.info(
      `[WorkerPool] Dispatching batch ${nextRequest.batch.batchId} to worker`
    );

    availableWorker.worker.postMessage(nextRequest.batch);
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  getWorkerStatus(): Array<{ index: number; busy: boolean; currentBatchId: string | null }> {
    return this.workers.map((w, i) => ({
      index: i,
      busy: w.busy,
      currentBatchId: w.currentBatchId,
    }));
  }

  async shutdown(): Promise<void> {
    for (const request of this.queue) {
      clearTimeout(request.timeout);
      request.reject(new Error('Worker pool shutting down'));
    }
    this.queue = [];

    const terminationPromises = this.workers.map((w, i) => {
      return new Promise<void>((resolve) => {
        w.worker.terminate().then(() => {
          logger.info(`[WorkerPool] Worker ${i} terminated`);
          resolve();
        });
      });
    });

    await Promise.all(terminationPromises);
    this.workers = [];
  }
}
