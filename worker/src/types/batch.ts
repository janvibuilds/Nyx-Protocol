import { Order } from '../../../sequencer/src/types/order';

export enum BatchStatus {
  PENDING = 'PENDING',
  PROVING = 'PROVING',
  SUBMITTED = 'SUBMITTED',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}

export interface BatchRequest {
  type: 'BATCH_REQUEST';
  batchId: string;
  orders: Order[];
  stateRoot: string;
  oldStateRoot: string;
}

export interface BatchResponse {
  type: 'BATCH_RESPONSE';
  batchId: string;
  proofHash: string;
  txHash?: string;
  status: BatchStatus;
  error?: string;
  timestamp: number;
}
