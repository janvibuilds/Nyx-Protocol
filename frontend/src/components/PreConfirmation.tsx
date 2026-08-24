'use client'

import { Receipt } from '@/types'

interface PreConfirmationProps {
  receipt: Receipt | null
  latencyMs: number | null
}

function getLatencyColor(ms: number): string {
  if (ms < 15) return 'text-green-400'
  if (ms <= 50) return 'text-yellow-400'
  return 'text-red-400'
}

function truncateHash(hash: string, chars: number = 8): string {
  if (hash.length <= chars * 2) return hash
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`
}

export default function PreConfirmation({ receipt, latencyMs }: PreConfirmationProps) {
  if (!receipt) {
    return (
      <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-5">
        <div className="flex items-center gap-3 text-gray-500">
          <svg className="animate-pulse h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-25" />
            <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="text-sm">Awaiting confirmation...</span>
        </div>
      </div>
    )
  }

  const formattedTime = new Date(receipt.timestamp).toLocaleTimeString()
  const dateStr = new Date(receipt.timestamp).toLocaleDateString()

  return (
    <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">Pre-Confirmation Receipt</h3>
        {latencyMs !== null && (
          <span className={`text-sm font-mono ${getLatencyColor(latencyMs)}`}>
            {latencyMs}ms
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Order ID</span>
          <span className="text-sm font-mono text-white" title={receipt.matchId}>
            {truncateHash(receipt.matchId)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500 uppercase tracking-wider">State Root</span>
          <span className="text-sm font-mono text-white">
            {truncateHash(receipt.commitmentHash || 'N/A')}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Timestamp</span>
          <span className="text-sm text-white">
            {formattedTime} <span className="text-gray-500 text-xs">{dateStr}</span>
          </span>
        </div>

        {receipt.nullifierHash && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Signature</span>
            <span className="text-sm font-mono text-white" title={receipt.nullifierHash}>
              {truncateHash(receipt.nullifierHash)}
            </span>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-gray-700/50">
        <div className="flex items-center gap-2 text-green-400">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-xs font-medium">Order confirmed by sequencer</span>
        </div>
      </div>
    </div>
  )
}
