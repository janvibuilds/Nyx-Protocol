'use client'

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function hexToUint8Array(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16)
  }
  return bytes
}

export async function generateEphemeralKeyPair(): Promise<{
  publicKey: CryptoKey
  privateKey: CryptoKey
}> {
  const keyPair = (await crypto.subtle.generateKey(
    { name: 'X25519' } as any,
    true,
    ['deriveKey', 'deriveBits']
  )) as CryptoKeyPair
  return { publicKey: keyPair.publicKey, privateKey: keyPair.privateKey }
}

async function deriveSharedSecret(
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: 'X25519' } as any,
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptOrder(
  orderPayload: string,
  publicKeyHex: string
): Promise<string> {
  const ephemeralKeyPair = await generateEphemeralKeyPair()

  const recipientPubKeyBytes = hexToUint8Array(publicKeyHex)
  const recipientPubKey = await crypto.subtle.importKey(
    'raw',
    recipientPubKeyBytes.buffer as ArrayBuffer,
    { name: 'X25519' } as any,
    false,
    []
  )

  const sharedSecret = await deriveSharedSecret(
    ephemeralKeyPair.privateKey,
    recipientPubKey
  )

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(orderPayload)

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedSecret,
    encoded
  )

  const ephemeralPubKeyRaw = await crypto.subtle.exportKey(
    'raw',
    ephemeralKeyPair.publicKey
  )

  const result = new Uint8Array(
    12 + ephemeralPubKeyRaw.byteLength + ciphertext.byteLength
  )
  result.set(iv, 0)
  result.set(new Uint8Array(ephemeralPubKeyRaw), 12)
  result.set(new Uint8Array(ciphertext), 12 + ephemeralPubKeyRaw.byteLength)

  return arrayBufferToBase64(result.buffer as ArrayBuffer)
}
