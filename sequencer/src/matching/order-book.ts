import { Order } from '../types/order';

export interface BookLevel {
  price: string;
  orders: Order[];
  totalQuantity: string;
}

export class OrderBook {
  private bids: Map<string, Order[]> = new Map();
  private asks: Map<string, Order[]> = new Map();
  private readonly assetPair: string;

  constructor(assetPair: string) {
    this.assetPair = assetPair;
  }

  addOrder(order: Order): void {
    const book = order.side === 'BUY' ? this.bids : this.asks;
    const existing = book.get(order.id) || [];
    existing.push(order);
    book.set(order.id, existing);
  }

  removeOrder(orderId: string): void {
    this.bids.delete(orderId);
    this.asks.delete(orderId);
  }

  getBestBid(): Order | undefined {
    const levels = Array.from(this.bids.values()).flat();
    return levels.sort((a, b) => Number(b.timestamp) - Number(a.timestamp))[0];
  }

  getBestAsk(): Order | undefined {
    const levels = Array.from(this.asks.values()).flat();
    return levels.sort((a, b) => Number(a.timestamp) - Number(b.timestamp))[0];
  }

  getDepth(side: 'BUY' | 'SELL'): BookLevel[] {
    const book = side === 'BUY' ? this.bids : this.asks;
    return Array.from(book.entries()).map(([price, orders]) => ({
      price,
      orders,
      totalQuantity: orders.length.toString(),
    }));
  }

  getAssetPair(): string {
    return this.assetPair;
  }

  getSize(): number {
    return this.bids.size + this.asks.size;
  }

  clear(): void {
    this.bids.clear();
    this.asks.clear();
  }
}
