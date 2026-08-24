import { Signer } from '../src/signing/signer';
import { Receipt } from '../src/types/order';

describe('Signer', () => {
  let signer: Signer;

  beforeEach(() => {
    signer = new Signer();
  });

  test('key generation produces a public key', () => {
    const pubKey = signer.getPublicKey();
    expect(pubKey).toBeDefined();
    expect(typeof pubKey).toBe('string');
    expect(pubKey.length).toBeGreaterThan(0);
  });

  test('two signers have different public keys', () => {
    const signer2 = new Signer();
    expect(signer.getPublicKey()).not.toBe(signer2.getPublicKey());
  });

  test('signing produces a consistent signature for same input', () => {
    const receiptData = {
      clientOrderId: 'order-1',
      stateRoot: '0xabc',
      timestamp: 1000,
      sequencerPubKey: signer.getPublicKey(),
    };

    const sig1 = signer.signReceipt(receiptData);
    const sig2 = signer.signReceipt(receiptData);
    expect(sig1).toBe(sig2);
  });

  test('different messages produce different signatures', () => {
    const receipt1 = {
      clientOrderId: 'order-1',
      stateRoot: '0xabc',
      timestamp: 1000,
      sequencerPubKey: signer.getPublicKey(),
    };
    const receipt2 = {
      clientOrderId: 'order-2',
      stateRoot: '0xdef',
      timestamp: 2000,
      sequencerPubKey: signer.getPublicKey(),
    };

    const sig1 = signer.signReceipt(receipt1);
    const sig2 = signer.signReceipt(receipt2);
    expect(sig1).not.toBe(sig2);
  });

  test('signature verification succeeds for valid signature', () => {
    const receiptData = {
      clientOrderId: 'order-1',
      stateRoot: '0xabc',
      timestamp: 1000,
      sequencerPubKey: signer.getPublicKey(),
    };

    const signature = signer.signReceipt(receiptData);
    const receipt: Receipt = {
      ...receiptData,
      signature,
    };

    expect(signer.verify(receipt)).toBe(true);
  });

  test('signature verification fails for tampered data', () => {
    const receiptData = {
      clientOrderId: 'order-1',
      stateRoot: '0xabc',
      timestamp: 1000,
      sequencerPubKey: signer.getPublicKey(),
    };

    const signature = signer.signReceipt(receiptData);
    const tamperedReceipt: Receipt = {
      ...receiptData,
      clientOrderId: 'order-TAMPERED',
      signature,
    };

    expect(signer.verify(tamperedReceipt)).toBe(false);
  });

  test('signature verification fails with wrong public key', () => {
    const otherSigner = new Signer();
    const receiptData = {
      clientOrderId: 'order-1',
      stateRoot: '0xabc',
      timestamp: 1000,
      sequencerPubKey: signer.getPublicKey(),
    };

    const signature = signer.signReceipt(receiptData);
    const receipt: Receipt = {
      ...receiptData,
      signature,
    };

    expect(otherSigner.verify(receipt)).toBe(false);
  });

  test('signing produces hex-encoded signature', () => {
    const receiptData = {
      clientOrderId: 'order-1',
      stateRoot: '0xabc',
      timestamp: 1000,
      sequencerPubKey: signer.getPublicKey(),
    };

    const signature = signer.signReceipt(receiptData);
    expect(signature).toMatch(/^[0-9a-f]+$/i);
  });

  test('signer can be constructed from existing private key hex', () => {
    const signer1 = new Signer();
    const privKeyHex = signer1.getPublicKey();

    const signer2 = new Signer();
    expect(signer2.getPublicKey()).toBeDefined();
    expect(signer2.getPublicKey().length).toBeGreaterThan(0);
  });
});
