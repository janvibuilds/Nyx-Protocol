import { EventEmitter } from 'events';
import { Worker, WorkerOptions } from 'worker_threads';
import { BatchRequest, BatchResponse, BatchStatus } from '../src/types/batch';

jest.mock('worker_threads', () => {
  const mockWorkerInstances: any[] = [];

  class MockWorker extends EventEmitter {
    static instances = mockWorkerInstances;
    private _terminated = false;
    postMessage = jest.fn();
    terminate = jest.fn().mockImplementation(() => {
      this._terminated = true;
      return Promise.resolve();
    });

    constructor(scriptPath: string, options?: any) {
      super();
      mockWorkerInstances.push(this);
    }

    simulateMessage(message: any) {
      this.emit('message', message);
    }

    simulateError(error: Error) {
      this.emit('error', error);
    }

    simulateExit(code: number) {
      this.emit('exit', code);
    }

    static resetInstances() {
      mockWorkerInstances.length = 0;
    }
  }

  return { Worker: MockWorker };
});

jest.mock('winston', () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
  return {
    createLogger: jest.fn(() => mockLogger),
    format: {
      combine: jest.fn(),
      timestamp: jest.fn(),
      json: jest.fn(),
    },
    transports: {
      Console: jest.fn(),
    },
  };
});

import { WorkerPool } from '../src/pool';

function createBatchRequest(batchId: string = 'batch-1'): BatchRequest {
  return {
    type: 'BATCH_REQUEST',
    batchId,
    orders: [],
    stateRoot: '0xabc',
    oldStateRoot: '0x0',
  };
}

describe('WorkerPool', () => {
  let pool: WorkerPool;
  const MockWorker = Worker as any;

  beforeEach(() => {
    MockWorker.resetInstances();
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (pool) {
      pool.shutdown().catch(() => {});
      pool = null as any;
    }
  });

  test('pool creates correct number of workers', () => {
    pool = new WorkerPool('/fake/worker.js', 4, 100, 5000);
    const workers = MockWorker.instances;
    expect(workers).toHaveLength(4);
  });

  test('pool creates workers with configured size', () => {
    pool = new WorkerPool('/fake/worker.js', 2, 100, 5000);
    expect(MockWorker.instances).toHaveLength(2);
  });

  test('worker status reports correctly', () => {
    pool = new WorkerPool('/fake/worker.js', 3, 100, 5000);
    const status = pool.getWorkerStatus();
    expect(status).toHaveLength(3);
    status.forEach((s) => {
      expect(s.busy).toBe(false);
      expect(s.currentBatchId).toBeNull();
    });
  });

  test('submitBatch queues request when no worker available', () => {
    pool = new WorkerPool('/fake/worker.js', 1, 100, 5000);

    const workers = MockWorker.instances;
    workers[0].postMessage.mockImplementation(() => {});

    pool.submitBatch(createBatchRequest('batch-1')).catch(() => {});

    expect(pool.getQueueSize()).toBe(1);
  });

  test('submitBatch dispatches to available worker', () => {
    pool = new WorkerPool('/fake/worker.js', 1, 100, 5000);

    const workers = MockWorker.instances;
    const batch = createBatchRequest('batch-1');

    pool.submitBatch(batch).catch(() => {});

    expect(workers[0].postMessage).toHaveBeenCalledWith(batch);

    const status = pool.getWorkerStatus();
    expect(status[0].busy).toBe(true);
    expect(status[0].currentBatchId).toBe('batch-1');
  });

  test('batch response resolves the promise', async () => {
    pool = new WorkerPool('/fake/worker.js', 1, 100, 5000);

    const workers = MockWorker.instances;
    const batch = createBatchRequest('batch-1');

    const promise = pool.submitBatch(batch);

    workers[0].simulateMessage({
      type: 'BATCH_RESPONSE',
      batchId: 'batch-1',
      proofHash: '0xproof',
      status: BatchStatus.SUBMITTED,
      timestamp: Date.now(),
    });

    const response = await promise;
    expect(response.proofHash).toBe('0xproof');
    expect(response.status).toBe(BatchStatus.SUBMITTED);
  });

  test('worker error rejects the promise', async () => {
    pool = new WorkerPool('/fake/worker.js', 1, 100, 5000);

    const workers = MockWorker.instances;
    const batch = createBatchRequest('batch-1');

    const promise = pool.submitBatch(batch);

    workers[0].simulateMessage({
      type: 'WORKER_ERROR',
      error: 'Proof generation failed',
    });

    await expect(promise).rejects.toThrow('Proof generation failed');
  });

  test('worker crash rejects pending request', async () => {
    pool = new WorkerPool('/fake/worker.js', 1, 100, 5000);

    const workers = MockWorker.instances;
    const batch = createBatchRequest('batch-1');

    const promise = pool.submitBatch(batch);

    workers[0].simulateError(new Error('Worker crashed'));

    await expect(promise).rejects.toThrow('Worker crashed');
  });

  test('worker crash respawns a new worker', () => {
    pool = new WorkerPool('/fake/worker.js', 2, 100, 5000);

    expect(MockWorker.instances).toHaveLength(2);

    MockWorker.instances[0].simulateError(new Error('crash'));

    expect(MockWorker.instances).toHaveLength(3);
  });

  test('queue overflow throws error', async () => {
    pool = new WorkerPool('/fake/worker.js', 1, 2, 5000);

    const workers = MockWorker.instances;
    workers[0].postMessage.mockImplementation(() => {});

    pool.submitBatch(createBatchRequest('batch-1')).catch(() => {});
    pool.submitBatch(createBatchRequest('batch-2')).catch(() => {});

    await expect(pool.submitBatch(createBatchRequest('batch-3'))).rejects.toThrow(
      'Worker pool queue overflow'
    );
  });

  test('request timeout rejects promise', async () => {
    pool = new WorkerPool('/fake/worker.js', 1, 100, 50);

    const workers = MockWorker.instances;
    workers[0].postMessage.mockImplementation(() => {});

    const promise = pool.submitBatch(createBatchRequest('batch-1'));

    await expect(promise).rejects.toThrow('Proof generation timeout');
  });

  test('shutdown rejects all pending requests', async () => {
    pool = new WorkerPool('/fake/worker.js', 1, 100, 5000);

    const workers = MockWorker.instances;
    workers[0].postMessage.mockImplementation(() => {});

    const promise1 = pool.submitBatch(createBatchRequest('batch-1'));
    const promise2 = pool.submitBatch(createBatchRequest('batch-2'));

    await pool.shutdown();

    await expect(promise1).rejects.toThrow('Worker pool shutting down');
    await expect(promise2).rejects.toThrow('Worker pool shutting down');
  });

  test('shutdown terminates all workers', async () => {
    pool = new WorkerPool('/fake/worker.js', 3, 100, 5000);

    await pool.shutdown();

    const workers = MockWorker.instances;
    workers.forEach((w: any) => {
      expect(w.terminate).toHaveBeenCalled();
    });
  });

  test('multiple batches round-robin across workers', () => {
    pool = new WorkerPool('/fake/worker.js', 2, 100, 5000);

    const workers = MockWorker.instances;
    workers[0].postMessage.mockImplementation(() => {});
    workers[1].postMessage.mockImplementation(() => {});

    pool.submitBatch(createBatchRequest('batch-1')).catch(() => {});
    pool.submitBatch(createBatchRequest('batch-2')).catch(() => {});

    expect(workers[0].postMessage).toHaveBeenCalledTimes(1);
    expect(workers[1].postMessage).toHaveBeenCalledTimes(1);
  });

  test('status update emits event', (done) => {
    pool = new WorkerPool('/fake/worker.js', 1, 100, 5000);

    pool.on('status', (message) => {
      expect(message.type).toBe('STATUS_UPDATE');
      expect(message.batchId).toBe('batch-1');
      done();
    });

    const workers = MockWorker.instances;
    workers[0].simulateMessage({
      type: 'STATUS_UPDATE',
      batchId: 'batch-1',
      status: BatchStatus.PROVING,
      timestamp: Date.now(),
    });
  });

  test('getQueueSize returns correct count', () => {
    pool = new WorkerPool('/fake/worker.js', 1, 100, 5000);

    expect(pool.getQueueSize()).toBe(0);

    const workers = MockWorker.instances;
    workers[0].postMessage.mockImplementation(() => {});

    pool.submitBatch(createBatchRequest('batch-1')).catch(() => {});
    expect(pool.getQueueSize()).toBe(1);

    pool.submitBatch(createBatchRequest('batch-2')).catch(() => {});
    expect(pool.getQueueSize()).toBe(2);
  });

  test('worker ready message is handled silently', () => {
    pool = new WorkerPool('/fake/worker.js', 1, 100, 5000);

    const workers = MockWorker.instances;
    expect(() => {
      workers[0].simulateMessage({ type: 'WORKER_READY' });
    }).not.toThrow();
  });
});
