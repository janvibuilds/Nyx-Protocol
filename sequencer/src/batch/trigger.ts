import { v4 as uuidv4 } from 'uuid';
import { Batch, StateDelta } from '../types/order';

export class BatchTrigger {
  private pendingOrders: StateDelta[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly batchSize: number;
  private readonly timeoutMs: number;
  private callback: (() => void) | null = null;

  constructor(batchSize: number, timeoutMs: number) {
    this.batchSize = batchSize;
    this.timeoutMs = timeoutMs;
  }

  addOrder(stateDelta: StateDelta): Batch | null {
    this.pendingOrders.push(stateDelta);

    if (this.pendingOrders.length >= this.batchSize) {
      return this.flush();
    }

    return null;
  }

  startTimer(callback: () => void): void {
    this.callback = callback;
    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.timer = null;
        if (this.callback) {
          this.callback();
        }
      }, this.timeoutMs);
    }
  }

  flush(): Batch {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const batch: Batch = {
      id: uuidv4(),
      orders: this.pendingOrders.map((d) => ({
        id: d.orderId,
        clientOrderId: d.orderId,
        side: 'BUY' as const,
        assetPair: '',
        encryptedData: '',
        timestamp: d.timestamp,
      })),
      createdAt: Date.now(),
    };

    this.pendingOrders = [];
    return batch;
  }

  pendingCount(): number {
    return this.pendingOrders.length;
  }

  clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pendingOrders = [];
  }
}
