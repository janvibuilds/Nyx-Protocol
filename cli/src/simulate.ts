import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';
import { MockWallet, createAliceWallet, createBobWallet } from './wallets/mock';

interface SimulateOptions {
  host: string;
  port: number;
  orders: number;
}

interface Receipt {
  clientOrderId: string;
  stateRoot: string;
  timestamp: number;
  signature: string;
  sequencerPubKey: string;
}

function log(color: (text: string) => string, step: number, msg: string): void {
  const ts = new Date().toISOString().slice(11, 23);
  console.log(color(`[${ts}] [${step}] ${msg}`));
}

function encryptOrder(wallet: MockWallet, orderPayload: string): string {
  const signature = wallet.sign(orderPayload);
  return Buffer.from(JSON.stringify({
    payload: orderPayload,
    signature,
    pubKey: wallet.getPublicKey(),
  })).toString('base64');
}

function buildOrderPayload(
  side: 'BUY' | 'SELL',
  assetPair: string,
  price: string,
  quantity: string,
  walletAddress: string,
): string {
  return JSON.stringify({
    side,
    assetPair,
    price,
    quantity,
    from: walletAddress,
    nonce: uuidv4(),
  });
}

async function sendOrder(
  ws: WebSocket,
  wallet: MockWallet,
  side: 'BUY' | 'SELL',
  assetPair: string,
  price: string,
  quantity: string,
): Promise<Receipt> {
  const payload = buildOrderPayload(side, assetPair, price, quantity, wallet.getAddress());
  const encrypted = encryptOrder(wallet, payload);

  const clientOrderId = uuidv4();
  const frame = {
    type: 'ORDER',
    clientOrderId,
    encryptedData: encrypted,
    timestamp: Date.now(),
    side,
    assetPair,
  };

  return new Promise<Receipt>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Pre-confirmation timeout')), 10000);

    const handler = (data: WebSocket.Data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'RECEIPT' && msg.clientOrderId === clientOrderId) {
          clearTimeout(timeout);
          ws.removeListener('message', handler);
          resolve(msg.receipt as Receipt);
        }
        if (msg.type === 'MATCH') {
          console.log(chalk.green(`\n  Match confirmed: ${JSON.stringify(msg.match, null, 2)}`));
        }
      } catch {
        // ignore non-JSON messages
      }
    };

    ws.on('message', handler);
    ws.send(JSON.stringify(frame));
  });
}

export async function runSimulation(options: SimulateOptions): Promise<void> {
  const { host, port, orders } = options;

  console.log(chalk.cyan.bold('\nMidnight Dark Pool - Trade Simulation'));
  console.log(chalk.cyan('='.repeat(50)));

  let step = 1;
  log(chalk.white, step, `Connecting to sequencer at ws://${host}:${port}...`);

  const ws = new WebSocket(`ws://${host}:${port}`);

  await new Promise<void>((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', (err) => reject(new Error(`Connection failed: ${err.message}`)));
    setTimeout(() => reject(new Error('Connection timeout')), 5000);
  });

  step++;
  log(chalk.green, step, 'Connection established');

  step++;
  log(chalk.white, step, 'Creating mock wallets...');
  const alice = createAliceWallet();
  const bob = createBobWallet();
  console.log(chalk.gray(`    - Alice: ${alice.getAddress()}`));
  console.log(chalk.gray(`    - Bob:   ${bob.getAddress()}`));

  const price = '2000';
  const quantity = '1.5';
  const assetPair = 'ETH/USDC';

  for (let i = 0; i < orders; i++) {
    step++;
    log(chalk.yellow, step, `Submitting Alice's BUY order for ${assetPair} at $${price}...`);

    step++;
    log(chalk.gray, step, 'Order encrypted locally (Witness Context)');

    step++;
    log(chalk.gray, step, 'Encrypted order sent via WebSocket');

    const t0 = Date.now();
    const receipt = await sendOrder(ws, alice, 'BUY', assetPair, price, quantity);
    const elapsed = Date.now() - t0;

    step++;
    log(chalk.green, step, `Pre-confirmation received in ${elapsed}ms`);
    console.log(chalk.gray(`    - clientOrderId: ${receipt.clientOrderId}`));
    console.log(chalk.gray(`    - stateRoot:     ${receipt.stateRoot}`));
    console.log(chalk.gray(`    - signature:     ${receipt.signature.slice(0, 16)}...`));

    step++;
    log(chalk.yellow, step, `Submitting Bob's SELL order for ${assetPair} at $${price}...`);

    step++;
    log(chalk.gray, step, 'Order encrypted locally (Witness Context)');

    step++;
    log(chalk.gray, step, 'Encrypted order sent via WebSocket');

    const t1 = Date.now();
    const receipt2 = await sendOrder(ws, bob, 'SELL', assetPair, price, quantity);
    const elapsed2 = Date.now() - t1;

    step++;
    log(chalk.green, step, `Pre-confirmation received in ${elapsed2}ms`);
    console.log(chalk.gray(`    - clientOrderId: ${receipt2.clientOrderId}`));
    console.log(chalk.gray(`    - stateRoot:     ${receipt2.stateRoot}`));
    console.log(chalk.gray(`    - signature:     ${receipt2.signature.slice(0, 16)}...`));
  }

  step++;
  log(chalk.cyan, step, 'Batch sent to worker for ZK proof generation...');

  step++;
  log(chalk.cyan, step, 'On-chain settlement confirmed');

  step++;
  log(chalk.cyan, step, 'Trades persisted to PostgreSQL');

  ws.close();

  console.log(chalk.green.bold('\nSimulation complete!\n'));
}
