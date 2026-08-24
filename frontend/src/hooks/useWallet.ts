'use client'

import { useState, useCallback, useEffect } from 'react'
import { WalletState } from '@/types'

interface CIP30Wallet {
  enable(): Promise<{ getUsedAddresses(): Promise<string[]>; getBalance(): Promise<string> }>
  isEnabled(): Promise<boolean>
}

declare global {
  interface Window {
    cardano?: {
      [key: string]: CIP30Wallet
    }
  }
}

export function useWallet() {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    balance: null,
    signingKey: null,
  })
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableWallets, setAvailableWallets] = useState<string[]>([])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.cardano) {
      const wallets = Object.keys(window.cardano).filter(
        (key) => typeof window.cardano![key]?.enable === 'function'
      )
      setAvailableWallets(wallets)
    }
  }, [])

  const connect = useCallback(async (walletName?: string) => {
    if (typeof window === 'undefined' || !window.cardano) {
      setError('No CIP-30 wallet detected. Please install Eternl or 1lam wallet.')
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      const walletKey = walletName || availableWallets[0]
      if (!walletKey) {
        throw new Error('No wallet available')
      }

      const wallet = window.cardano[walletKey]
      if (!wallet) {
        throw new Error(`Wallet ${walletKey} not found`)
      }

      const api = await wallet.enable()
      const addresses = await api.getUsedAddresses()
      const balance = await api.getBalance()

      setWalletState({
        isConnected: true,
        address: addresses[0] || null,
        balance: balance || '0',
        signingKey: walletKey,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet')
    } finally {
      setIsConnecting(false)
    }
  }, [availableWallets])

  const disconnect = useCallback(() => {
    setWalletState({
      isConnected: false,
      address: null,
      balance: null,
      signingKey: null,
    })
    setError(null)
  }, [])

  const getAddress = useCallback(() => {
    return walletState.address
  }, [walletState.address])

  const getBalance = useCallback(() => {
    return walletState.balance
  }, [walletState.balance])

  const signData = useCallback(async (data: string): Promise<string | null> => {
    if (!walletState.isConnected || !walletState.address) {
      setError('Wallet not connected')
      return null
    }

    try {
      const walletKey = walletState.signingKey
      if (!walletKey || !window.cardano?.[walletKey]) {
        throw new Error('Wallet not available')
      }

      const wallet = window.cardano[walletKey]
      const api = await wallet.enable()

      const signedData = await api.signData(walletState.address, data)
      return signedData
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign data')
      return null
    }
  }, [walletState])

  return {
    ...walletState,
    isConnecting,
    error,
    availableWallets,
    connect,
    disconnect,
    getAddress,
    getBalance,
    signData,
  }
}
