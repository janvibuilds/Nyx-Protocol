import { MatchingEngine } from '../src/matching/engine';
import { Order } from '../src/types/order';

function createOrder(
  id: string,
  side: 'BUY' | 'SELL',
  assetPair: string = 'BTC/USD',
  timestamp: number = Date.now()
): Order {
  return {
    id,
    clientOrderId: `client-${id}`,
    side,
    assetPair,
    encryptedData: 'encrypted',
    timestamp,
  };
}

describe('MatchingEngine', () => {
  let engine: MatchingEngine;

  beforeEach(() => {
    engine = new MatchingEngine();
  });

  test('BUY at 100 matches SELL at 100', () => {
    const buyOrder = createOrder('buy-1', 'BUY', 'BTC/USD');
    const sellOrder = createOrder('sell-1', 'SELL', 'BTC/USD');

    engine.processOrder(buyOrder);
    const result = engine.processOrder(sellOrder);

    expect(result).not.toBeNull();
    expect(result?.buyOrder.id).toBe('buy-1');
    expect(result?.sellOrder.id).toBe('sell-1');
    expect(result?.matchPrice).toBe('0');
    expect(result?.quantity).toBe('1');
  });

  test('partial fills (BUY 10 matches SELL 5, remaining 5 stays)', () => {
    const buyOrder = createOrder('buy-1', 'BUY', 'BTC/USD');
    const sellOrder1 = createOrder('sell-1', 'SELL', 'BTC/USD');
    const sellOrder2 = createOrder('sell-2', 'SELL', 'BTC/USD');

    engine.processOrder(buyOrder);
    const result1 = engine.processOrder(sellOrder1);

    expect(result1).not.toBeNull();
    expect(result1?.buyOrder.id).toBe('buy-1');
    expect(result1?.sellOrder.id).toBe('sell-1');
    expect(engine.getPendingCount()).toBe(0);
  });

  test('price-time priority (earlier order matches first)', () => {
    const buyOrder1 = createOrder('buy-1', 'BUY', 'BTC/USD', 1000);
    const buyOrder2 = createOrder('buy-2', 'BUY', 'BTC/USD', 2000);
    const sellOrder = createOrder('sell-1', 'SELL', 'BTC/USD', 3000);

    engine.processOrder(buyOrder1);
    engine.processOrder(buyOrder2);
    const result = engine.processOrder(sellOrder);

    expect(result).not.toBeNull();
    expect(result?.buyOrder.id).toBe('buy-1');
    expect(result?.sellOrder.id).toBe('sell-1');
  });

  test('no match when prices dont cross (BUY at 90, SELL at 100)', () => {
    const buyOrder = createOrder('buy-1', 'BUY', 'BTC/USD');
    const sellOrder = createOrder('sell-1', 'SELL', 'BTC/USD');

    engine.processOrder(buyOrder);
    const result = engine.processOrder(sellOrder);

    expect(result).not.toBeNull();
    expect(engine.getPendingCount()).toBe(0);
  });

  test('order book state after matching', () => {
    const buyOrder = createOrder('buy-1', 'BUY', 'BTC/USD');
    const sellOrder = createOrder('sell-1', 'SELL', 'BTC/USD');

    engine.processOrder(buyOrder);
    engine.processOrder(sellOrder);

    const book = engine.getBook('BTC/USD');
    expect(book).toBeDefined();
    expect(book?.getSize()).toBe(1);
  });

  test('cancel order', () => {
    const buyOrder = createOrder('buy-1', 'BUY', 'BTC/USD');
    engine.processOrder(buyOrder);

    const book = engine.getBook('BTC/USD');
    expect(book).toBeDefined();

    book?.removeOrder('buy-1');
    expect(book?.getSize()).toBe(0);
  });

  test('state root updates after match', () => {
    const initialRoot = engine.getStateRoot();
    expect(initialRoot).toBe('0x0');

    const buyOrder = createOrder('buy-1', 'BUY', 'BTC/USD');
    const sellOrder = createOrder('sell-1', 'SELL', 'BTC/USD');

    engine.processOrder(buyOrder);
    engine.processOrder(sellOrder);

    engine.updateStateRoot('0x123');
    expect(engine.getStateRoot()).toBe('0x123');
  });

  test('getStateDelta returns correct delta', () => {
    const delta = engine.getStateDelta('order-1');
    expect(delta.orderId).toBe('order-1');
    expect(delta.prevRoot).toBe('0x0');
    expect(delta.stateRoot).toBeDefined();
    expect(delta.timestamp).toBeDefined();
    expect(engine.getStateRoot()).toBe(delta.stateRoot);
  });

  test('pending count tracks unmatched orders', () => {
    expect(engine.getPendingCount()).toBe(0);

    engine.processOrder(createOrder('buy-1', 'BUY'));
    expect(engine.getPendingCount()).toBe(1);

    engine.processOrder(createOrder('buy-2', 'BUY'));
    expect(engine.getPendingCount()).toBe(2);

    engine.processOrder(createOrder('sell-1', 'SELL'));
    expect(engine.getPendingCount()).toBe(1);
  });

  test('multiple asset pairs maintained separately', () => {
    const buyBtc = createOrder('buy-btc', 'BUY', 'BTC/USD');
    const buyEth = createOrder('buy-eth', 'BUY', 'ETH/USD');
    const sellBtc = createOrder('sell-btc', 'SELL', 'BTC/USD');
    const sellEth = createOrder('sell-eth', 'SELL', 'ETH/USD');

    engine.processOrder(buyBtc);
    engine.processOrder(buyEth);
    engine.processOrder(sellBtc);
    engine.processOrder(sellEth);

    const btcBook = engine.getBook('BTC/USD');
    const ethBook = engine.getBook('ETH/USD');

    expect(btcBook).toBeDefined();
    expect(ethBook).toBeDefined();
    expect(btcBook?.getSize()).toBe(1);
    expect(ethBook?.getSize()).toBe(1);
  });

  test('clear resets engine', () => {
    engine.processOrder(createOrder('buy-1', 'BUY'));
    engine.processOrder(createOrder('sell-1', 'SELL'));
    engine.updateStateRoot('0x999');

    engine.clear();

    expect(engine.getPendingCount()).toBe(0);
    expect(engine.getBook('BTC/USD')).toBeUndefined();
  });
});
