export enum MessageType {
  ORDER = 'ORDER',
  PRE_CONFIRMATION = 'PRE_CONFIRMATION',
  SYNC_STATE = 'SYNC_STATE',
  ERROR = 'ERROR',
  GET_PUB_KEY = 'GET_PUB_KEY',
  PUB_KEY = 'PUB_KEY',
  ORDER_BOOK_UPDATE = 'ORDER_BOOK_UPDATE',
  MATCH = 'MATCH',
}

export interface OrderMessage {
  type: MessageType.ORDER
  clientOrderId: string
  encryptedData: string
  timestamp: number
  side: 'BUY' | 'SELL'
  assetPair: string
}

export interface PreConfirmationMessage {
  type: MessageType.PRE_CONFIRMATION
  receipt: {
    clientOrderId: string
    stateRoot: string
    timestamp: number
    signature: string
    sequencerPubKey: string
  }
}

export interface SyncStateMessage {
  type: MessageType.SYNC_STATE
  stateRoot: string
  timestamp: number
}

export interface ErrorMessage {
  type: MessageType.ERROR
  error: string
}

export interface GetPubKeyMessage {
  type: MessageType.GET_PUB_KEY
}

export interface PubKeyMessage {
  type: MessageType.PUB_KEY
  publicKey: string
}

export interface OrderBookUpdateMessage {
  type: MessageType.ORDER_BOOK_UPDATE
  assetPair: string
  bids: Array<{ price: string; quantity: string }>
  asks: Array<{ price: string; quantity: string }>
  lastPrice: string
  timestamp: number
}

export interface MatchMessage {
  type: MessageType.MATCH
  matchId: string
  buyOrderId: string
  sellOrderId: string
  matchPrice: string
  quantity: string
  timestamp: number
}

export type Message =
  | OrderMessage
  | PreConfirmationMessage
  | SyncStateMessage
  | ErrorMessage
  | GetPubKeyMessage
  | PubKeyMessage
  | OrderBookUpdateMessage
  | MatchMessage

export function parseMessage(data: string): Message {
  const parsed = JSON.parse(data)

  if (!parsed.type) {
    throw new Error('Missing message type')
  }

  return parsed as Message
}

export function serializeMessage(message: Message): string {
  return JSON.stringify(message)
}
