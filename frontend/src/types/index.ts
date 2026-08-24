export interface Order {
  id: string
  side: 'buy' | 'sell'
  quantity: string
  price: string
  tokenPair: string
  timestamp: number
  signature?: string
}

export interface Match {
  id: string
  buyOrder: Order
  sellOrder: Order
  matchedQuantity: string
  matchedPrice: string
  timestamp: number
}

export interface Receipt {
  matchId: string
  buyOrderId: string
  sellOrderId: string
  quantity: string
  price: string
  buyerAddress: string
  sellerAddress: string
  commitmentHash: string
  nullifierHash: string
  timestamp: number
}

export interface OrderBook {
  tokenPair: string
  bids: Order[]
  asks: Order[]
  lastPrice: string
  lastUpdate: number
}

export type MessageType =
  | 'order_submit'
  | 'order_match'
  | 'receipt_issue'
  | 'orderbook_update'
  | 'error'

export interface Message {
  type: MessageType
  payload: unknown
  timestamp: number
}

export interface WalletState {
  isConnected: boolean
  address: string | null
  balance: string | null
  signingKey: string | null
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'
