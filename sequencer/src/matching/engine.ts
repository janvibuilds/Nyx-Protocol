import { Order, MatchedPair, StateDelta } from '../types/order';
import { OrderBook } from './order-book';

export class MatchingEngine {
  private books: Map<string, OrderBook> = new Map();
  private pendingOrders: Order[] = [];
  private stateRoot: string = '0x0';

  processOrder(order: Order): MatchedPair | null {
    let book = this.books.get(order.assetPair);
    if (!book) {
      book = new OrderBook(order.assetPair);
      this.books.set(order.assetPair, book);
    }

    const oppositeSide = order.side === 'BUY' ? 'SELL' : 'BUY';
    const oppositeOrders = this.pendingOrders.filter(
      (o) => o.side === oppositeSide && o.assetPair === order.assetPair
    );

    if (oppositeOrders.length > 0) {
      const matched = oppositeOrders[0];
      const matchedPair: MatchedPair = {
        buyOrder: order.side === 'BUY' ? order : matched,
        sellOrder: order.side === 'SELL' ? order : matched,
        matchPrice: '0',
        quantity: '1',
        timestamp: Date.now(),
      };

      this.pendingOrders = this.pendingOrders.filter((o) => o.id !== matched.id);
      return matchedPair;
    }

    this.pendingOrders.push(order);
    book.addOrder(order);
    return null;
  }

  getStateRoot(): string {
    return this.stateRoot;
  }

  updateStateRoot(newRoot: string): void {
    this.stateRoot = newRoot;
  }

  getStateDelta(orderId: string): StateDelta {
    const prevRoot = this.stateRoot;
    const newRoot = `0x${Buffer.from(orderId).toString('hex').slice(0, 64)}`;
    this.stateRoot = newRoot;
    return {
      orderId,
      stateRoot: newRoot,
      prevRoot,
      timestamp: Date.now(),
    };
  }

  getPendingCount(): number {
    return this.pendingOrders.length;
  }

  getBook(assetPair: string): OrderBook | undefined {
    return this.books.get(assetPair);
  }

  clear(): void {
    this.books.clear();
    this.pendingOrders = [];
  }
}
