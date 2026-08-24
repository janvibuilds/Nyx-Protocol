'use client'

interface BalanceDisplayProps {
  ethBalance: string
  usdcBalance: string
}

export default function BalanceDisplay({ ethBalance, usdcBalance }: BalanceDisplayProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="glass rounded-lg px-4 py-2">
        <div className="text-xs text-gray-400">ETH</div>
        <div className="font-mono text-sm text-white">{ethBalance}</div>
      </div>
      <div className="glass rounded-lg px-4 py-2">
        <div className="text-xs text-gray-400">USDC</div>
        <div className="font-mono text-sm text-white">{usdcBalance}</div>
      </div>
    </div>
  )
}
