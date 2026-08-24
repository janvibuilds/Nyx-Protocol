import WebSocket from 'ws';
import { DarkPoolServer } from '../src/server/websocket';
import { Signer } from '../src/signing/signer';
import { MatchingEngine } from '../src/matching/engine';
import { BatchTrigger } from '../src/batch/trigger';
import { LRUCache } from '../src/dedup/cache';
import { MessageType, parseMessage, createReceipt, createErrorResponse } from '../src/server/protocol';

function createTestOrderMessage(clientOrderId: string = 'test-order-1') {
  return JSON.stringify({
    type: MessageType.ORDER,
    clientOrderId,
    encryptedData: 'encrypted-payload',
    timestamp: Date.now(),
    side: 'BUY',
    assetPair: 'BTC/USD',
  });
}

function waitForMessage(ws: WebSocket, timeout = 2000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout waiting for message')), timeout);
    ws.once('message', (data) => {
      clearTimeout(timer);
      resolve(JSON.parse(data.toString()));
    });
  });
}

function waitForConnection(server: any): Promise<WebSocket> {
  return new Promise((resolve) => {
    server.wss.once('connection', (ws: WebSocket) => {
      resolve(ws);
    });
  });
}

describe('DarkPoolServer', () => {
  let server: DarkPoolServer;
  let signer: Signer;
  let engine: MatchingEngine;
  let batchTrigger: BatchTrigger;
  let dedupCache: LRUCache<string, boolean>;
  const PORT = 0;
  let wsClients: WebSocket[] = [];

  beforeEach(() => {
    wsClients = [];
    signer = new Signer();
    engine = new MatchingEngine();
    batchTrigger = new BatchTrigger(50, 3000);
    dedupCache = new LRUCache<string, boolean>(1000, 60000);
    server = new DarkPoolServer(PORT, signer, engine, batchTrigger, dedupCache);
  });

  afterEach(async () => {
    for (const ws of wsClients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    }
    server.stop();
    await new Promise((r) => setTimeout(r, 50));
  });

  test('server starts on specified port', (done) => {
    server.start();
    expect(server).toBeDefined();

    const wss = (server as any).wss;
    expect(wss).not.toBeNull();
    done();
  });

  test('client can connect via WebSocket', (done) => {
    server.start();
    const wss = (server as any).wss;
    const addr = wss.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    const ws = new WebSocket(`ws://localhost:${port}`);
    wsClients.push(ws);
    ws.on('open', () => {
      expect(server.getClientCount()).toBe(1);
      ws.close();
      done();
    });
  });

  test('client disconnect reduces count', (done) => {
    server.start();
    const wss = (server as any).wss;
    const addr = wss.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    const ws = new WebSocket(`ws://localhost:${port}`);
    wsClients.push(ws);
    ws.on('open', () => {
      expect(server.getClientCount()).toBe(1);
      ws.close();
    });
    ws.on('close', () => {
      setTimeout(() => {
        expect(server.getClientCount()).toBe(0);
        done();
      }, 100);
    });
  });

  test('GET_PUB_KEY returns public key', (done) => {
    server.start();
    const wss = (server as any).wss;
    const addr = wss.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    const ws = new WebSocket(`ws://localhost:${port}`);
    wsClients.push(ws);
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: MessageType.GET_PUB_KEY }));
    });
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      expect(msg.type).toBe(MessageType.GET_PUB_KEY);
      expect(msg.publicKey).toBe(signer.getPublicKey());
      ws.close();
      done();
    });
  });

  test('duplicate order detection via LRU cache', (done) => {
    server.start();
    const wss = (server as any).wss;
    const addr = wss.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    const ws = new WebSocket(`ws://localhost:${port}`);
    wsClients.push(ws);
    let messageCount = 0;

    ws.on('open', () => {
      ws.send(createTestOrderMessage('dup-order-1'));
    });
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      messageCount++;

      if (messageCount === 1) {
        expect(msg.type).not.toBe(MessageType.ERROR);

        ws.send(createTestOrderMessage('dup-order-1'));
      }

      if (messageCount === 2) {
        expect(msg.type).toBe(MessageType.ERROR);
        expect(msg.error).toContain('Duplicate order');
        ws.close();
        done();
      }
    });
  });

  test('invalid message returns error', (done) => {
    server.start();
    const wss = (server as any).wss;
    const addr = wss.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    const ws = new WebSocket(`ws://localhost:${port}`);
    wsClients.push(ws);
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'INVALID_TYPE' }));
    });
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      expect(msg.type).toBe(MessageType.ERROR);
      ws.close();
      done();
    });
  });

  test('missing message type returns error', (done) => {
    server.start();
    const wss = (server as any).wss;
    const addr = wss.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    const ws = new WebSocket(`ws://localhost:${port}`);
    wsClients.push(ws);
    ws.on('open', () => {
      ws.send(JSON.stringify({ data: 'no type' }));
    });
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      expect(msg.type).toBe(MessageType.ERROR);
      ws.close();
      done();
    });
  });

  test('broadcast sends to all connected clients', (done) => {
    server.start();
    const wss = (server as any).wss;
    const addr = wss.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    let receivedCount = 0;
    const totalClients = 2;

    for (let i = 0; i < totalClients; i++) {
      const ws = new WebSocket(`ws://localhost:${port}`);
      wsClients.push(ws);
      ws.on('open', () => {
        if (server.getClientCount() === totalClients) {
          server.broadcast(JSON.stringify({ type: 'TEST_BROADCAST', data: 'hello' }));
        }
      });
      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'TEST_BROADCAST') {
          receivedCount++;
          if (receivedCount === totalClients) {
            ws.close();
            done();
          }
        }
      });
    }
  });

  test('stop clears clients and resources', () => {
    server.start();
    server.stop();

    const wss = (server as any).wss;
    expect(wss).toBeNull();
    expect(server.getClientCount()).toBe(0);
  });

  test('protocol parseMessage handles valid ORDER message', () => {
    const raw = createTestOrderMessage('order-proto-1');
    const msg = parseMessage(raw);
    expect(msg.type).toBe(MessageType.ORDER);
  });

  test('protocol parseMessage rejects ORDER without required fields', () => {
    expect(() => parseMessage(JSON.stringify({ type: MessageType.ORDER }))).toThrow(
      'Invalid ORDER message'
    );
  });

  test('protocol createReceipt builds correct structure', () => {
    const order = {
      id: 'id-1',
      clientOrderId: 'client-1',
      side: 'BUY' as const,
      assetPair: 'BTC/USD',
      encryptedData: 'enc',
      timestamp: 1000,
    };
    const receipt = createReceipt(order, '0xstate', '0xsig', '0xpubkey');
    expect(receipt.clientOrderId).toBe('client-1');
    expect(receipt.stateRoot).toBe('0xstate');
    expect(receipt.signature).toBe('0xsig');
    expect(receipt.sequencerPubKey).toBe('0xpubkey');
  });

  test('protocol createErrorResponse has correct type', () => {
    const err = createErrorResponse('test error');
    expect(err.type).toBe(MessageType.ERROR);
    expect(err.error).toBe('test error');
  });
});
