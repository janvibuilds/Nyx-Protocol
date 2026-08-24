import { BatchRequest, BatchResponse, BatchStatus } from '../types/batch';
import { CircuitBuilder } from '../circuit/builder';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

export class RecursiveZKProver {
  private circuitBuilder: CircuitBuilder;
  private contractPath: string;

  constructor(contractPath: string) {
    this.contractPath = contractPath;
    this.circuitBuilder = new CircuitBuilder(contractPath);
  }

  async generateProof(batch: BatchRequest): Promise<BatchResponse> {
    const startTime = Date.now();
    logger.info(`[RecursiveZKProver] Starting proof generation for batch ${batch.batchId}`);

    try {
      const circuitInput = await this.circuitBuilder.buildCircuit(batch);

      logger.info(`[RecursiveZKProver] Circuit built for batch ${batch.batchId}`);

      const { proofHash, txHash } = await this.executeZKProof(circuitInput);

      const elapsed = Date.now() - startTime;
      logger.info(
        `[RecursiveZKProver] Proof generated for batch ${batch.batchId} in ${elapsed}ms`
      );

      return {
        type: 'BATCH_RESPONSE',
        batchId: batch.batchId,
        proofHash,
        txHash,
        status: BatchStatus.SUBMITTED,
        timestamp: Date.now(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown proof generation error';
      logger.error(
        `[RecursiveZKProver] Proof generation failed for batch ${batch.batchId}: ${errorMessage}`
      );

      return {
        type: 'BATCH_RESPONSE',
        batchId: batch.batchId,
        proofHash: '',
        status: BatchStatus.FAILED,
        error: errorMessage,
        timestamp: Date.now(),
      };
    }
  }

  private async executeZKProof(circuitInput: any): Promise<{
    proofHash: string;
    txHash: string;
  }> {
    const midnightJS = await import('@midnight-ntwrk/midnight-js');

    const { Contract, PrivateState, ZKCircuit } = midnightJS;

    const contract = await Contract.create({
      circuitPath: this.contractPath,
      privateState: new PrivateState(),
    });

    const proof = await contract prove(circuitInput);

    const proofHash = this.hashProof(proof);
    const txHash = this.generateTxHash(proofHash, circuitInput.batchId);

    return { proofHash, txHash };
  }

  private hashProof(proof: any): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(JSON.stringify(proof)).digest('hex');
  }

  private generateTxHash(proofHash: string, batchId: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(`${proofHash}:${batchId}`).digest('hex');
  }
}
