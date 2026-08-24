import { Order, Receipt } from '../types/order';

export enum MessageType {
  ORDER = 'ORDER',
  PRE_CONFIRMATION = 'PRE_CONFIRMATION',
  SYNC_STATE = 'SYNC_STATE',
  ERROR = 'ERROR',
  GET_PUB_KEY = 'GET_PUB_KEY',
}

export interface OrderMessage {
  type: MessageType.ORDER;
  clientOrderId: string;
  encryptedData: string;
  timestamp: number;
  side: 'BUY' | 'SELL';
  assetPair: string;
}

export interface PreConfirmationMessage {
  type: MessageType.PRE_CONFIRMATION;
  receipt: Receipt;
}

export interface SyncStateMessage {
  type: MessageType.SYNC_STATE;
  stateRoot: string;
  timestamp: number;
}

export interface ErrorMessage {
  type: MessageType.ERROR;
  error: string;
}

export interface GetPubKeyMessage {
  type: MessageType.GET_PUB_KEY;
}

export type Message =
  | OrderMessage
  | PreConfirmationMessage
  | SyncStateMessage
  | ErrorMessage
  | GetPubKeyMessage;

export function parseMessage(data: string): Message {
  const parsed = JSON.parse(data);

  if (!parsed.type) {
    throw new Error('Missing message type');
  }

  switch (parsed.type) {
    case MessageType.ORDER:
      if (!parsed.clientOrderId || !parsed.encryptedData || !parsed.side || !parsed.assetPair) {
        throw new Error('Invalid ORDER message: missing required fields');
      }
      return {
        type: MessageType.ORDER,
        clientOrderId: parsed.clientOrderId,
        encryptedData: parsed.encryptedData,
        timestamp: parsed.timestamp || Date.now(),
        side: parsed.side,
        assetPair: parsed.assetPair,
      } as OrderMessage;

    case MessageType.GET_PUB_KEY:
      return { type: MessageType.GET_PUB_KEY };

    case MessageType.SYNC_STATE:
      return {
        type: MessageType.SYNC_STATE,
        stateRoot: parsed.stateRoot,
        timestamp: parsed.timestamp || Date.now(),
      };

    default:
      throw new Error(`Unknown message type: ${parsed.type}`);
  }
}

export function createReceipt(
  order: Order,
  stateRoot: string,
  signature: string,
  sequencerPubKey: string
): Receipt {
  return {
    clientOrderId: order.clientOrderId,
    stateRoot,
    timestamp: Date.now(),
    signature,
    sequencerPubKey,
  };
}

export function createErrorResponse(error: string): ErrorMessage {
  return {
    type: MessageType.ERROR,
    error,
  };
}
