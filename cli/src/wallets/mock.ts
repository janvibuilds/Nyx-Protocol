import * as crypto from 'crypto';

export class MockWallet {
  private readonly privateKey: crypto.KeyObject;
  private readonly publicKey: crypto.KeyObject;
  private readonly address: string;
  private readonly name: string;

  constructor(name: string, privateKeyPem?: string) {
    this.name = name;

    if (privateKeyPem) {
      this.privateKey = crypto.createPrivateKey(privateKeyPem);
    } else {
      const keyPair = crypto.generateKeyPairSync('ed25519');
      this.privateKey = keyPair.privateKey;
    }

    this.publicKey = crypto.createPublicKey(this.privateKey);

    const pubKeyDer = this.publicKey.export({ type: 'spki', format: 'der' });
    this.address = '0x' + crypto.createHash('sha256')
      .update(pubKeyDer)
      .digest('hex')
      .slice(0, 40);
  }

  getName(): string {
    return this.name;
  }

  getAddress(): string {
    return this.address;
  }

  getPublicKey(): string {
    const pubKeyDer = this.publicKey.export({ type: 'spki', format: 'der' });
    return pubKeyDer.toString('hex');
  }

  sign(data: string): string {
    const signature = crypto.sign(null, Buffer.from(data, 'utf-8'), this.privateKey);
    return signature.toString('hex');
  }

  verify(data: string, signatureHex: string): boolean {
    const signature = Buffer.from(signatureHex, 'hex');
    return crypto.verify(null, Buffer.from(data, 'utf-8'), this.publicKey, signature);
  }
}

export function createPreFundedWallet(name: string): MockWallet {
  return new MockWallet(name);
}

const ALICE_SEED = 'alice-dark-pool-wallet-seed-2024';
const BOB_SEED = 'bob-dark-pool-wallet-seed-2024';

export function createAliceWallet(): MockWallet {
  return new MockWallet('Alice');
}

export function createBobWallet(): MockWallet {
  return new MockWallet('Bob');
}
