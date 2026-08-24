import { MutexQueue } from '../src/queue/mutex-queue';
import { Order } from '../src/types/order';

function createTestOrder(id: string): Order {
  return {
    id,
    clientOrderId: `client-${id}`,
    side: 'BUY',
    assetPair: 'BTC/USD',
    encryptedData: 'encrypted',
    timestamp: Date.now(),
  };
}

describe('MutexQueue', () => {
  let queue: MutexQueue;

  beforeEach(() => {
    queue = new MutexQueue();
  });

  test('FIFO ordering', async () => {
    const processed: string[] = [];
    queue.setProcessor(async (order: Order) => {
      processed.push(order.id);
      return order;
    });

    for (let i = 1; i <= 5; i++) {
      queue.enqueue(createTestOrder(`order-${i}`));
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(processed).toEqual(['order-1', 'order-2', 'order-3', 'order-4', 'order-5']);
  });

  test('mutex concurrency - processes sequentially', async () => {
    const processing: string[] = [];
    let currentlyProcessing = false;

    queue.setProcessor(async (order: Order) => {
      if (currentlyProcessing) {
        throw new Error('Concurrency violation');
      }
      currentlyProcessing = true;
      processing.push(order.id);
      await new Promise((resolve) => setTimeout(resolve, 10));
      currentlyProcessing = false;
      return order;
    });

    const promises: Promise<any>[] = [];
    for (let i = 1; i <= 10; i++) {
      promises.push(queue.enqueue(createTestOrder(`order-${i}`)));
    }

    await Promise.all(promises);
    expect(processing).toHaveLength(10);
    expect(processing).toEqual(
      expect.arrayContaining(
        Array.from({ length: 10 }, (_, i) => `order-${i + 1}`)
      )
    );
  });

  test('size returns correct count', () => {
    expect(queue.size()).toBe(0);

    queue.enqueue(createTestOrder('order-1'));
    expect(queue.size()).toBe(1);

    queue.enqueue(createTestOrder('order-2'));
    expect(queue.size()).toBe(2);
  });

  test('isEmpty returns true when empty', () => {
    expect(queue.isEmpty()).toBe(true);
  });

  test('isEmpty returns false when items present', async () => {
    queue.enqueue(createTestOrder('order-1'));
    expect(queue.isEmpty()).toBe(false);

    queue.enqueue(createTestOrder('order-2'));
    expect(queue.isEmpty()).toBe(false);
  });

  test('dequeue from empty queue returns undefined (peek)', () => {
    expect(queue.peek()).toBeUndefined();
  });

  test('peek returns item without removing it', () => {
    const order1 = createTestOrder('order-1');
    const order2 = createTestOrder('order-2');

    queue.enqueue(order1);
    queue.enqueue(order2);

    const peeked = queue.peek();
    expect(peeked?.id).toBe('order-1');
    expect(queue.size()).toBe(2);
  });

  test('clear empties the queue', async () => {
    queue.setProcessor(async (order: Order) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return order;
    });

    queue.enqueue(createTestOrder('order-1'));
    queue.enqueue(createTestOrder('order-2'));
    queue.enqueue(createTestOrder('order-3'));

    queue.clear();
    expect(queue.size()).toBe(0);
    expect(queue.isEmpty()).toBe(true);
  });

  test('processor rejection propagates', async () => {
    queue.setProcessor(async (order: Order) => {
      throw new Error('Processing failed');
    });

    await expect(queue.enqueue(createTestOrder('order-1'))).rejects.toThrow('Processing failed');
  });
});
