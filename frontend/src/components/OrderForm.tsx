'use client'

import { useState, FormEvent } from 'react'

interface OrderFormProps {
  onSubmit: (side: 'BUY' | 'SELL', price: number, amount: number) => Promise<string>
  isSubmitting: boolean
  isConnected: boolean
  walletConnected: boolean
}

export default function OrderForm({ onSubmit, isSubmitting, isConnected, walletConnected }: OrderFormProps) {
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY')
  const [price, setPrice] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const total = (parseFloat(price) || 0) * (parseFloat(amount) || 0)

  const isDisabled = !walletConnected || !isConnected || isSubmitting

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!walletConnected) {
      setError('Connect your wallet first')
      return
    }
    if (!isConnected) {
      setError('Not connected to sequencer')
      return
    }

    const priceNum = parseFloat(price)
    const amountNum = parseFloat(amount)

    if (!priceNum || priceNum <= 0) {
      setError('Price must be greater than 0')
      return
    }
    if (!amountNum || amountNum <= 0) {
      setError('Amount must be greater than 0')
      return
    }

    try {
      await onSubmit(side, priceNum, amountNum)
      setPrice('')
      setAmount('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit order')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Side</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSide('BUY')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all ${
              side === 'BUY'
                ? 'bg-green-600 text-white shadow-lg shadow-green-600/20'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            BUY
          </button>
          <button
            type="button"
            onClick={() => setSide('SELL')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all ${
              side === 'SELL'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            SELL
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Price</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            disabled={isDisabled}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2.5 pl-8 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors disabled:opacity-50"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Amount</label>
        <div className="relative">
          <input
            type="number"
            step="0.001"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.000"
            disabled={isDisabled}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2.5 pl-4 pr-12 text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors disabled:opacity-50"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">ETH</span>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Total</span>
          <span className="text-white font-medium">${total.toFixed(2)}</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isDisabled}
        className={`w-full py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
          side === 'BUY'
            ? 'bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 text-white'
            : 'bg-red-600 hover:bg-red-500 disabled:bg-red-600/50 text-white'
        } disabled:cursor-not-allowed`}
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Submitting...
          </>
        ) : (
          `Submit ${side} Order`
        )}
      </button>
    </form>
  )
}
