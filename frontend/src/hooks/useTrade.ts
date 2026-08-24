'use client'

import { useState, useCallback } from 'react'
import { encryptOrder } from '@/lib/crypto'
import { MessageType, PreConfirmationMessage, ErrorMessage, Message } from '@/lib/protocol'
import { Receipt } from '@/types'

export interface PendingOrder {
  clientOrderId: string
  side: 'BUY' | 'SELL'
  price: number
  amount: number
  submittedAt: number
}

interface UseTradeOptions {
  isConnected: boolean
  sequencerPubKey: string | null
  sendMessage: (msg: any) => void
}

export function useTrade({ isConnected, sequencerPubKey, sendMessage }: UseTradeOptions) {
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([])
  const [lastReceipt, setLastReceipt] = useState<Receipt | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)

  const handleMessage = useCallback((msg: Message) => {
    if (msg.type === MessageType.PRE_CONFIRMATION) {
      const preConf = msg as PreConfirmationMessage
      setPendingOrders((prev) =>
        prev.filter((o) => o.clientOrderId !== preConf.receipt.clientOrderId)
      )
      const receipt: Receipt = {
        matchId: preConf.receipt.clientOrderId,
        buyOrderId: '',
        sellOrderId: '',
        quantity: '',
        price: '',
        buyerAddress: '',
        sellerAddress: '',
        commitmentHash: '',
        nullifierHash: '',
        timestamp: preConf.receipt.timestamp,
      }
      setLastReceipt(receipt)
      setLatencyMs(Date.now() - preConf.receipt.timestamp)
    }

    if (msg.type === MessageType.ERROR) {
      const errMsg = msg as ErrorMessage
      setError(errMsg.error)
      setPendingOrders([])
    }
  }, [])

  const submitOrder = useCallback(
    async (side: 'BUY' | 'SELL', price: number, amount: number): Promise<string> => {
      if (!isConnected) {
        setError('Not connected to sequencer')
        throw new Error('Not connected to sequencer')
      }
      if (!sequencerPubKey) {
        setError('Sequencer public key not available')
        throw new Error('Sequencer public key not available')
      }

      const clientOrderId = crypto.randomUUID()
      setIsSubmitting(true)
      setError(null)

      const orderPayload = JSON.stringify({
        clientOrderId,
        side,
        price: price.toString(),
        amount: amount.toString(),
        assetPair: 'ETH/USDC',
        timestamp: Date.now(),
      })

      try {
        const encryptedData = await encryptOrder(orderPayload, sequencerPubKey)

        const orderMsg = {
          type: MessageType.ORDER,
          clientOrderId,
          encryptedData,
          timestamp: Date.now(),
          side,
          assetPair: 'ETH/USDC',
        }

        sendMessage(orderMsg)

        const pending: PendingOrder = {
          clientOrderId,
          side,
          price,
          amount,
          submittedAt: Date.now(),
        }
        setPendingOrders((prev) => [...prev, pending])
        setIsSubmitting(false)

        return clientOrderId
      } catch (err) {
        setIsSubmitting(false)
        setError(err instanceof Error ? err.message : 'Failed to submit order')
        throw err
      }
    },
    [isConnected, sequencerPubKey, sendMessage]
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    pendingOrders,
    lastReceipt,
    latencyMs,
    isSubmitting,
    error,
    submitOrder,
    clearError,
    handleMessage,
  }
}
