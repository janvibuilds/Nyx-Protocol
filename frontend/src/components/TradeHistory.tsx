'use client'

import { useMemo, useRef, useEffect } from 'react'
import { Match } from '@/types'

interface TradeHistoryProps {
  trades: Match[]
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function formatPrice(price: string): string {
  const num = Number(price)
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatAmount(amount: string): string {
  const num = Number(amount)
  return num.toFixed(3)
}

function formatTotal(price: string, quantity: string): string {
  const total = Number(price) * Number(quantity)
  return total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function TradeHistory({ trades }: TradeHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const displayTrades = useMemo(() => trades.slice(0, 20), [trades])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [trades])

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-gray-200">TRADES</h2>
      </div>

      <div className="p-2 text-xs text-gray-400 border-b border-gray-800 flex">
        <span className="w-1/5">Time</span>
        <span className="w-1/5 text-center">Side</span>
        <span className="w-1/5 text-right pr-3">Price</span>
        <span className="w-1/5 text-right pr-3">Amount</span>
        <span className="w-1/5 text-right">Total</span>
      </div>

      <div ref={scrollRef} className="max-h-64 overflow-y-auto">
        {displayTrades.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-sm">
            No trades yet
          </div>
        ) : (
          displayTrades.map((trade) => {
            const isBuy = trade.buyOrder.side === 'buy'
            return (
              <div
                key={trade.id}
                className="flex px-2 py-1 text-xs hover:bg-gray-800"
              >
                <span className="w-1/5 text-gray-400 font-mono">
                  {formatTime(trade.timestamp)}
                </span>
                <span
                  className={`w-1/5 text-center font-mono ${
                    isBuy ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {isBuy ? 'BUY' : 'SELL'}
                </span>
                <span className="w-1/5 text-right pr-3 text-gray-300 font-mono">
                  ${formatPrice(trade.matchedPrice)}
                </span>
                <span className="w-1/5 text-right pr-3 text-gray-300 font-mono">
                  {formatAmount(trade.matchedQuantity)}
                </span>
                <span className="w-1/5 text-right text-gray-400 font-mono">
                  ${formatTotal(trade.matchedPrice, trade.matchedQuantity)}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
