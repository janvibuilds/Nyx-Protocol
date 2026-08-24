import { BatchTrigger } from '../src/batch/trigger';
import { StateDelta } from '../src/types/order';

function createDelta(orderId: string): StateDelta {
  return {
    orderId,
    stateRoot: `0x${Buffer.from(orderId).toString('hex').slice(0, 64)}`,
    prevRoot: '0x0',
    timestamp: Date.now(),
  };
}

describe('BatchTrigger', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('batch flushes when batchSize is reached', () => {
    const trigger = new BatchTrigger(5, 3000);
    const deltas = Array.from({ length: 5 }, (_, i) => createDelta(`order-${i}`));

    let flushedBatch: any = null;
    for (const delta of deltas) {
      const result = trigger.addOrder(delta);
      if (result) flushedBatch = result;
    }

    expect(flushedBatch).not.toBeNull();
    expect(flushedBatch.orders).toHaveLength(5);
    expect(flushedBatch.id).toBeDefined();
    expect(flushedBatch.createdAt).toBeDefined();
    expect(trigger.pendingCount()).toBe(0);
  });

  test('addOrder returns null below batchSize', () => {
    const trigger = new BatchTrigger(5, 3000);

    const result = trigger.addOrder(createDelta('order-1'));
    expect(result).toBeNull();
    expect(trigger.pendingCount()).toBe(1);
  });

  test('batch flushes at exact batchSize', () => {
    const trigger = new BatchTrigger(3, 3000);

    expect(trigger.addOrder(createDelta('order-1'))).toBeNull();
    expect(trigger.addOrder(createDelta('order-2'))).toBeNull();
    const batch = trigger.addOrder(createDelta('order-3'));
    expect(batch).not.toBeNull();
    expect(batch!.orders).toHaveLength(3);
  });

  test('batch flushes at 3s timeout via timer', () => {
    jest.useFakeTimers();
    const trigger = new BatchTrigger(50, 3000);

    let callbackFired = false;
    trigger.startTimer(() => {
      callbackFired = true;
    });

    trigger.addOrder(createDelta('order-1'));
    trigger.addOrder(createDelta('order-2'));

    expect(trigger.pendingCount()).toBe(2);

    jest.advanceTimersByTime(3000);

    expect(callbackFired).toBe(true);
  });

  test('timer callback fires only once', () => {
    jest.useFakeTimers();
    const trigger = new BatchTrigger(50, 3000);

    let callCount = 0;
    trigger.startTimer(() => {
      callCount++;
    });

    jest.advanceTimersByTime(3000);
    jest.advanceTimersByTime(3000);

    expect(callCount).toBe(1);
  });

  test('startTimer does not restart timer if already running', () => {
    jest.useFakeTimers();
    const trigger = new BatchTrigger(50, 3000);

    let fireCount = 0;
    trigger.startTimer(() => { fireCount++; });
    trigger.startTimer(() => { fireCount++; });

    jest.advanceTimersByTime(3000);

    expect(fireCount).toBe(1);
  });

  test('flush clears the timer', () => {
    jest.useFakeTimers();
    const trigger = new BatchTrigger(50, 3000);

    let callbackFired = false;
    trigger.startTimer(() => {
      callbackFired = true;
    });

    trigger.addOrder(createDelta('order-1'));
    for (let i = 2; i <= 50; i++) {
      trigger.addOrder(createDelta(`order-${i}`));
    }

    jest.advanceTimersByTime(3000);

    expect(callbackFired).toBe(false);
  });

  test('flush resets pending orders', () => {
    const trigger = new BatchTrigger(3, 3000);

    trigger.addOrder(createDelta('order-1'));
    trigger.addOrder(createDelta('order-2'));
    trigger.addOrder(createDelta('order-3'));

    expect(trigger.pendingCount()).toBe(0);

    trigger.addOrder(createDelta('order-4'));
    expect(trigger.pendingCount()).toBe(1);
  });

  test('clear empties pending and stops timer', () => {
    jest.useFakeTimers();
    const trigger = new BatchTrigger(50, 3000);

    let callbackFired = false;
    trigger.startTimer(() => {
      callbackFired = true;
    });

    trigger.addOrder(createDelta('order-1'));
    trigger.addOrder(createDelta('order-2'));

    trigger.clear();

    expect(trigger.pendingCount()).toBe(0);

    jest.advanceTimersByTime(3000);
    expect(callbackFired).toBe(false);
  });

  test('flush returns batch with generated id', () => {
    const trigger = new BatchTrigger(2, 3000);

    trigger.addOrder(createDelta('order-1'));
    const batch = trigger.addOrder(createDelta('order-2'));

    expect(batch!.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  test('batch orders preserve timestamps', () => {
    const trigger = new BatchTrigger(2, 3000);
    const ts = 1234567890;

    trigger.addOrder({ ...createDelta('order-1'), timestamp: ts });
    const batch = trigger.addOrder({ ...createDelta('order-2'), timestamp: ts + 100 });

    expect(batch!.orders[0].timestamp).toBe(ts);
    expect(batch!.orders[1].timestamp).toBe(ts + 100);
  });

  test('partial batch handling - fewer orders than batchSize', () => {
    const trigger = new BatchTrigger(10, 3000);

    trigger.addOrder(createDelta('order-1'));
    trigger.addOrder(createDelta('order-2'));
    trigger.addOrder(createDelta('order-3'));

    expect(trigger.pendingCount()).toBe(3);

    const batch = trigger.flush();
    expect(batch.orders).toHaveLength(3);
    expect(trigger.pendingCount()).toBe(0);
  });
});
