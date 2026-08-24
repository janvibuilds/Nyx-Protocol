import { Order } from '../types/order';

type QueueItem = {
  order: Order;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
};

export class MutexQueue {
  private queue: QueueItem[] = [];
  private processing: boolean = false;
  private processor: ((order: Order) => Promise<any>) | null = null;

  setProcessor(processor: (order: Order) => Promise<any>): void {
    this.processor = processor;
  }

  enqueue(order: Order): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push({ order, resolve, reject });
      this.processNext();
    });
  }

  private async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0 || !this.processor) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      try {
        const result = await this.processor(item.order);
        item.resolve(result);
      } catch (error) {
        item.reject(error as Error);
      }
    }

    this.processing = false;
  }

  size(): number {
    return this.queue.length;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  peek(): Order | undefined {
    return this.queue.length > 0 ? this.queue[0].order : undefined;
  }

  clear(): void {
    this.queue = [];
  }

  isProcessing(): boolean {
    return this.processing;
  }
}
