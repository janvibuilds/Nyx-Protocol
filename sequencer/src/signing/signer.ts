import * as crypto from 'crypto';
import { Receipt } from '../types/order';

export class Signer {
  private privateKey: crypto.KeyObject;
  private publicKey: crypto.KeyObject;
  private publicKeyHex: string;

  constructor(privateKeyHex?: string) {
    if (privateKeyHex) {
      const privBuf = Buffer.from(privateKeyHex, 'hex');
      this.privateKey = crypto.createPrivateKey({
        key: Buffer.concat([Buffer.from('302e020100300506032b6570042204', 'hex'), privBuf]),
        format: 'der',
        type: 'pkcs8',
      });
    } else {
      const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
      this.privateKey = privateKey;
      this.publicKey = publicKey;
      const privDer = this.privateKey.export({ type: 'pkcs8', format: 'der' });
      this.publicKeyHex = privDer.subarray(-32).toString('hex');
      this.publicKey = crypto.createPublicKey(this.privateKey);
      return;
    }

    this.publicKey = crypto.createPublicKey(this.privateKey);
    const pubDer = this.publicKey.export({ type: 'spki', format: 'der' });
    this.publicKeyHex = pubDer.subarray(-32).toString('hex');
  }

  signReceipt(receipt: Omit<Receipt, 'signature'>): string {
    const payload = JSON.stringify({
      clientOrderId: receipt.clientOrderId,
      stateRoot: receipt.stateRoot,
      timestamp: receipt.timestamp,
      sequencerPubKey: receipt.sequencerPubKey,
    });
    const sig = crypto.sign(null, Buffer.from(payload), this.privateKey);
    return sig.toString('hex');
  }

  getPublicKey(): string {
    return this.publicKeyHex;
  }

  verify(receipt: Receipt): boolean {
    const payload = JSON.stringify({
      clientOrderId: receipt.clientOrderId,
      stateRoot: receipt.stateRoot,
      timestamp: receipt.timestamp,
      sequencerPubKey: receipt.sequencerPubKey,
    });
    return crypto.verify(
      null,
      Buffer.from(payload),
      this.publicKey,
      Buffer.from(receipt.signature, 'hex')
    );
  }
}
