'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Match } from '@/types'
import { MessageType, OrderBookUpdateMessage, MatchMessage, Message } from '@/lib/protocol'
import { SEQUENCER_URL } from '@/lib/config'
import { useWallet } from '@/hooks/useWallet'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useTrade } from '@/hooks/useTrade'
import { useOrderBook } from '@/hooks/useOrderBook'
import WalletConnect from '@/components/WalletConnect'
import ConnectionStatus from '@/components/ConnectionStatus'
import OrderForm from '@/components/OrderForm'
import OrderBook from '@/components/OrderBook'
import TradeHistory from '@/components/TradeHistory'
import PreConfirmation from '@/components/PreConfirmation'
import BalanceDisplay from '@/components/BalanceDisplay'
import Toast from '@/components/Toast'

interface ToastData {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

function matchToTrade(msg: MatchMessage): Match {
  return {
    id: msg.matchId,
    buyOrder: {
      id: msg.buyOrderId,
      side: 'buy',
      quantity: msg.quantity,
      price: msg.matchPrice,
      tokenPair: 'ETH/USDC',
      timestamp: msg.timestamp,
    },
    sellOrder: {
      id: msg.sellOrderId,
      side: 'sell',
      quantity: msg.quantity,
      price: msg.matchPrice,
      tokenPair: 'ETH/USDC',
      timestamp: msg.timestamp,
    },
    matchedQuantity: msg.quantity,
    matchedPrice: msg.matchPrice,
    timestamp: msg.timestamp,
  }
}

export default function TradePage() {
  const wallet = useWallet()
  const ws = useWebSocket()
  const orderBook = useOrderBook()

  const [trades, setTrades] = useState<Match[]>([])
  const [toasts, setToasts] = useState<ToastData[]>([])
  const hasConnectedRef = useRef(false)

  const { pendingOrders, lastReceipt, latencyMs, isSubmitting, error: tradeError, submitOrder, clearError, handleMessage } = useTrade({
    isConnected: ws.isConnected,
    sequencerPubKey: ws.sequencerPubKey,
    sendMessage: ws.sendMessage,
  })

  useEffect(() => {
    if (!hasConnectedRef.current) {
      hasConnectedRef.current = true
      ws.connect(SEQUENCER_URL)
    }
  }, [])

  const addToast = useCallback((message: string, type: ToastData['type']) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    ws.onMessage((msg: Message) => {
      handleMessage(msg)

      switch (msg.type) {
        case MessageType.ORDER_BOOK_UPDATE: {
          orderBook.updateFromMessage(msg as OrderBookUpdateMessage)
          break
        }
        case MessageType.MATCH: {
          const matchMsg = msg as MatchMessage
          setTrades((prev) => [matchToTrade(matchMsg), ...prev])
          break
        }
        case MessageType.ERROR: {
          const errMsg = (msg as { error: string }).error
          addToast(errMsg, 'error')
          break
        }
      }
    })
  }, [ws.onMessage, handleMessage, orderBook.updateFromMessage, addToast])

  useEffect(() => {
    if (tradeError) {
      addToast(tradeError, 'error')
      clearError()
    }
  }, [tradeError, clearError, addToast])

  const spread = orderBook.getSpread()

  return (
    <div className="flex flex-col h-screen">
      <header className="border-b border-white/10 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-midnight-500 rounded-lg" />
            <span className="text-lg font-bold gradient-text">Midnight Dark Pool</span>
          </div>

          <div className="flex items-center gap-4">
            <BalanceDisplay ethBalance="0.000" usdcBalance="0.00" />
            <ConnectionStatus
              isConnected={ws.isConnected}
              reconnecting={ws.reconnecting}
              sequencerPubKey={ws.sequencerPubKey}
            />
            <WalletConnect />
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px_1fr] gap-4 h-full">
          <div className="hidden lg:block overflow-y-auto">
            <OrderBook
              bids={orderBook.bids}
              asks={orderBook.asks}
              spread={spread}
            />
          </div>

          <div className="flex flex-col gap-4 overflow-y-auto">
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
              <h2 className="text-sm font-semibold text-gray-200 mb-4">ORDER — ETH/USDC</h2>
              <OrderForm
                onSubmit={submitOrder}
                isSubmitting={isSubmitting}
                isConnected={ws.isConnected}
                walletConnected={wallet.isConnected}
              />
            </div>
            <PreConfirmation receipt={lastReceipt} latencyMs={latencyMs} />
          </div>

          <div className="hidden lg:block overflow-y-auto">
            <TradeHistory trades={trades} />
          </div>

          <div className="lg:hidden grid grid-cols-2 gap-4">
            <OrderBook
              bids={orderBook.bids}
              asks={orderBook.asks}
              spread={spread}
            />
            <TradeHistory trades={trades} />
          </div>
        </div>
      </main>

      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </div>
  )
}
