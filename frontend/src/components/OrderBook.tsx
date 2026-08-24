'use client'

import { useMemo } from 'react'
import { OrderBookEntry } from '@/hooks/useOrderBook'

interface OrderBookProps {
  bids: OrderBookEntry[]
  asks: OrderBookEntry[]
  spread: number | null
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

function formatSpreadPercent(spread: number, midPrice: number): string {
  if (midPrice === 0) return '0.00%'
  return ((spread / midPrice) * 100).toFixed(2) + '%'
}

export default function OrderBook({ bids, asks, spread }: OrderBookProps) {
  const displayAsks = useMemo(() => asks.slice(0, 10), [asks])
  const displayBids = useMemo(() => bids.slice(0, 10), [bids])

  const bestBid = bids.length > 0 ? Number(bids[0].price) : null
  const bestAsk = asks.length > 0 ? Number(asks[0].price) : null
  const midPrice = bestBid !== null && bestAsk !== null ? (bestBid + bestAsk) / 2 : null

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-gray-200">ORDER BOOK — ETH/USDC</h2>
      </div>

      <div className="p-2 text-xs text-gray-400 border-b border-gray-800 flex">
        <span className="w-1/3 text-right pr-3">Price</span>
        <span className="w-1/3 text-right pr-3">Amount</span>
        <span className="w-1/3 text-right">Total</span>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {asks.length === 0 && bids.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-sm">
            No orders in book
          </div>
        ) : (
          <>
            <div className="flex flex-col-reverse">
              {displayAsks.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex px-2 py-1 text-xs hover:bg-gray-800 ${
                    Number(entry.price) === bestAsk ? 'bg-red-900/20' : ''
                  }`}
                >
                  <span className="w-1/3 text-right pr-3 text-red-400 font-mono">
                    ${formatPrice(entry.price)}
                  </span>
                  <span className="w-1/3 text-right pr-3 text-gray-300 font-mono">
                    {formatAmount(entry.quantity)} ETH
                  </span>
                  <span className="w-1/3 text-right text-gray-400 font-mono">
                    ${formatTotal(entry.price, entry.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="px-3 py-2 border-y border-gray-700 flex justify-between items-center bg-gray-800/50">
              <span className="text-xs text-gray-400">SPREAD:</span>
              {spread !== null && midPrice !== null ? (
                <span className="text-xs font-mono text-yellow-400">
                  ${formatPrice(spread.toString())} ({formatSpreadPercent(spread, midPrice)})
                </span>
              ) : (
                <span className="text-xs text-gray-500">—</span>
              )}
            </div>

            <div className="flex flex-col">
              {displayBids.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex px-2 py-1 text-xs hover:bg-gray-800 ${
                    Number(entry.price) === bestBid ? 'bg-green-900/20' : ''
                  }`}
                >
                  <span className="w-1/3 text-right pr-3 text-green-400 font-mono">
                    ${formatPrice(entry.price)}
                  </span>
                  <span className="w-1/3 text-right pr-3 text-gray-300 font-mono">
                    {formatAmount(entry.quantity)} ETH
                  </span>
                  <span className="w-1/3 text-right text-gray-400 font-mono">
                    ${formatTotal(entry.price, entry.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
