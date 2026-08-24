export const SEQUENCER_URL = process.env.NEXT_PUBLIC_SEQUENCER_URL || 'ws://localhost:8081'

export const CHAIN_NETWORK = process.env.NEXT_PUBLIC_CHAIN_NETWORK || 'preprod'

export const APP_NAME = 'Midnight Dark Pool'

export const SUPPORTED_TOKEN_PAIRS = [
  'MIDNIGHT/ADA',
  'MIDNIGHT/USDT',
  'ADA/USDT',
]

export const ORDER_TYPES = {
  LIMIT: 'limit',
  MARKET: 'market',
} as const
