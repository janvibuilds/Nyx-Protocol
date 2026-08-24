import { parentPort } from 'worker_threads';
import { BatchRequest, BatchResponse, BatchStatus } from '../types/batch';
import { RecursiveZKProver } from '../prover/recursive-zk';

export class IPCHandler {
  private prover: RecursiveZKProver;

  constructor(contractPath: string) {
    this.prover = new RecursiveZKProver(contractPath);
  }

  async handleMessage(
    message: BatchRequest,
    callback: (response: BatchResponse) => void
  ): Promise<void> {
    const responseBase = {
      batchId: message.batchId,
      type: 'BATCH_RESPONSE' as const,
      timestamp: Date.now(),
    };

    try {
      this.sendStatus(message.batchId, BatchStatus.PROVING);

      const result = await this.prover.generateProof(message);

      callback({
        ...responseBase,
        proofHash: result.proofHash,
        txHash: result.txHash,
        status: BatchStatus.SUBMITTED,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown proof generation error';

      callback({
        ...responseBase,
        proofHash: '',
        status: BatchStatus.FAILED,
        error: errorMessage,
      });
    }
  }

  private sendStatus(batchId: string, status: BatchStatus): void {
    if (parentPort) {
      parentPort.postMessage({
        type: 'STATUS_UPDATE',
        batchId,
        status,
        timestamp: Date.now(),
      });
    }
  }
}
