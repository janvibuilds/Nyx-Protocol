import { BatchRequest } from '../types/batch';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

export class CircuitBuilder {
  private contractPath: string;

  constructor(contractPath: string) {
    this.contractPath = contractPath;
  }

  async buildCircuit(batch: BatchRequest): Promise<any> {
    logger.info(`[CircuitBuilder] Building circuit for batch ${batch.batchId}`);

    const circuitInput = {
      batchId: batch.batchId,
      orders: batch.orders.map((order) => ({
        id: order.id,
        clientOrderId: order.clientOrderId,
        side: order.side === 'BUY' ? 1 : 0,
        assetPair: this.encodeAssetPair(order.assetPair),
        encryptedData: order.encryptedData,
        timestamp: order.timestamp,
      })),
      stateRoot: batch.stateRoot,
      oldStateRoot: batch.oldStateRoot,
      orderCount: batch.orders.length,
      timestamp: Date.now(),
    };

    logger.info(
      `[CircuitBuilder] Circuit input prepared: ${batch.orders.length} orders`
    );

    return circuitInput;
  }

  private encodeAssetPair(assetPair: string): number {
    const pairMap: Record<string, number> = {
      'BTC/USD': 1,
      'ETH/USD': 2,
      'MID/USD': 3,
    };
    return pairMap[assetPair] || 0;
  }
}
