import { v4 as uuidv4 } from 'uuid';

export interface Order {
  id: string;
  clientOrderId: string;
  side: 'BUY' | 'SELL';
  assetPair: string;
  encryptedData: string;
  timestamp: number;
  clientPubKey?: string;
}

export interface OrderFrame {
  type: 'ORDER';
  clientOrderId: string;
  encryptedData: string;
  timestamp: number;
  side: 'BUY' | 'SELL';
  assetPair: string;
}

export interface Receipt {
  clientOrderId: string;
  stateRoot: string;
  timestamp: number;
  signature: string;
  sequencerPubKey: string;
}

export interface MatchedPair {
  buyOrder: Order;
  sellOrder: Order;
  matchPrice: string;
  quantity: string;
  timestamp: number;
}

export interface Batch {
  id: string;
  orders: Order[];
  createdAt: number;
}

export interface StateDelta {
  orderId: string;
  stateRoot: string;
  prevRoot: string;
  timestamp: number;
}

export function createOrder(frame: OrderFrame): Order {
  return {
    id: uuidv4(),
    clientOrderId: frame.clientOrderId,
    side: frame.side,
    assetPair: frame.assetPair,
    encryptedData: frame.encryptedData,
    timestamp: frame.timestamp || Date.now(),
  };
}
