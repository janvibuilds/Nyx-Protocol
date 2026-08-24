import WebSocket, { WebSocketServer } from 'ws';
import { Signer } from '../signing/signer';
import { MatchingEngine } from '../matching/engine';
import { BatchTrigger } from '../batch/trigger';
import { LRUCache } from '../dedup/cache';
import { MutexQueue } from '../queue/mutex-queue';
import {
  MessageType,
  OrderMessage,
  parseMessage,
  createReceipt,
  createErrorResponse,
} from './protocol';
import { Order, createOrder } from '../types/order';
import { v4 as uuidv4 } from 'uuid';

const PRE_CONFIRMATION_TARGET_MS = 15;

export class DarkPoolServer {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private signer: Signer;
  private engine: MatchingEngine;
  private batchTrigger: BatchTrigger;
  private dedupCache: LRUCache<string, boolean>;
  private queue: MutexQueue;
  private port: number;

  constructor(
    port: number,
    signer: Signer,
    engine: MatchingEngine,
    batchTrigger: BatchTrigger,
    dedupCache: LRUCache<string, boolean>
  ) {
    this.port = port;
    this.signer = signer;
    this.engine = engine;
    this.batchTrigger = batchTrigger;
    this.dedupCache = dedupCache;
    this.queue = new MutexQueue();

    this.queue.setProcessor(async (order: Order) => {
      return this.processOrderInternal(order);
    });
  }

  start(): void {
    this.wss = new WebSocketServer({ port: this.port });

    this.wss.on('connection', (ws: WebSocket) => {
      this.handleConnection(ws);
    });

    this.wss.on('error', (error: Error) => {
      console.error('[DarkPoolServer] WebSocket server error:', error.message);
    });

    console.log(`[DarkPoolServer] Listening on port ${this.port}`);
  }

  handleConnection(ws: WebSocket): void {
    this.clients.add(ws);
    console.log(`[DarkPoolServer] Client connected. Total: ${this.clients.size}`);

    ws.on('message', (data: WebSocket.Data) => {
      try {
        const message = parseMessage(data.toString());
        this.handleMessage(ws, message);
      } catch (error) {
        const errResp = createErrorResponse((error as Error).message);
        ws.send(JSON.stringify(errResp));
      }
    });

    ws.on('close', () => {
      this.clients.delete(ws);
      console.log(`[DarkPoolServer] Client disconnected. Total: ${this.clients.size}`);
    });

    ws.on('error', (error: Error) => {
      console.error('[DarkPoolServer] Client error:', error.message);
      this.clients.delete(ws);
    });
  }

  private handleMessage(ws: WebSocket, message: ReturnType<typeof parseMessage>): void {
    switch (message.type) {
      case MessageType.ORDER:
        this.handleOrder(ws, message as OrderMessage);
        break;
      case MessageType.GET_PUB_KEY:
        this.handleGetPubKey(ws);
        break;
      default:
        ws.send(JSON.stringify(createErrorResponse('Unhandled message type')));
    }
  }

  handleOrder(ws: WebSocket, message: OrderMessage): void {
    const start = Date.now();

    if (this.dedupCache.has(message.clientOrderId)) {
      ws.send(
        JSON.stringify(createErrorResponse(`Duplicate order: ${message.clientOrderId}`))
      );
      return;
    }

    this.dedupCache.set(message.clientOrderId, true);

    const order = createOrder({
      type: MessageType.ORDER,
      clientOrderId: message.clientOrderId,
      encryptedData: message.encryptedData,
      timestamp: message.timestamp,
      side: message.side,
      assetPair: message.assetPair,
    });

    this.queue.enqueue(order).then(() => {
      const elapsed = Date.now() - start;
      if (elapsed > PRE_CONFIRMATION_TARGET_MS) {
        console.warn(
          `[DarkPoolServer] Pre-confirmation exceeded ${PRE_CONFIRMATION_TARGET_MS}ms: ${elapsed}ms`
        );
      }
    }).catch((error) => {
      const errResp = createErrorResponse(`Order processing failed: ${(error as Error).message}`);
      ws.send(JSON.stringify(errResp));
    });
  }

  private async processOrderInternal(order: Order): Promise<void> {
    const stateDelta = this.engine.getStateDelta(order.id);

    const receiptData = {
      clientOrderId: order.clientOrderId,
      stateRoot: stateDelta.stateRoot,
      timestamp: Date.now(),
      sequencerPubKey: this.signer.getPublicKey(),
    };

    const signature = this.signer.signReceipt(receiptData);

    const receipt = createReceipt(order, stateDelta.stateRoot, signature, this.signer.getPublicKey());

    const preConfirmMsg = JSON.stringify({
      type: MessageType.PRE_CONFIRMATION,
      receipt,
    });

    this.broadcast(preConfirmMsg);

    this.batchTrigger.addOrder(stateDelta);
  }

  handleGetPubKey(ws: WebSocket): void {
    const response = JSON.stringify({
      type: MessageType.GET_PUB_KEY,
      publicKey: this.signer.getPublicKey(),
    });
    ws.send(response);
  }

  broadcast(message: string): void {
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  stop(): void {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    this.clients.clear();
    this.batchTrigger.clear();
    this.queue.clear();
  }

  getClientCount(): number {
    return this.clients.size;
  }
}
