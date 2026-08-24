'use client'

import { useWallet } from '@/hooks/useWallet'

export default function WalletConnect() {
  const {
    isConnected,
    address,
    balance,
    isConnecting,
    error,
    availableWallets,
    connect,
    disconnect,
  } = useWallet()

  const truncateAddress = (addr: string) => {
    if (addr.length <= 20) return addr
    return `${addr.slice(0, 8)}...${addr.slice(-8)}`
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-4">
        <div className="glass rounded-lg px-4 py-2">
          <div className="text-sm text-gray-400">Connected</div>
          <div className="font-mono text-sm">{truncateAddress(address)}</div>
        </div>
        {balance && (
          <div className="glass rounded-lg px-4 py-2">
            <div className="text-sm text-gray-400">Balance</div>
            <div className="font-mono text-sm">{balance} ADA</div>
          </div>
        )}
        <button
          onClick={disconnect}
          className="px-4 py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {availableWallets.length > 0 ? (
        <div className="flex gap-2">
          {availableWallets.map((wallet) => (
            <button
              key={wallet}
              onClick={() => connect(wallet)}
              disabled={isConnecting}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnecting ? 'Connecting...' : `Connect ${wallet}`}
            </button>
          ))}
        </div>
      ) : (
        <button
          onClick={() => connect()}
          disabled={isConnecting}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
      {error && (
        <div className="text-red-400 text-sm mt-2">{error}</div>
      )}
      {!isConnecting && availableWallets.length === 0 && !error && (
        <div className="text-gray-500 text-sm mt-2">
          No CIP-30 wallet detected. Please install{' '}
          <a
            href="https://eternl.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 underline"
          >
            Eternl
          </a>{' '}
          or{' '}
          <a
            href="https://1lam.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 underline"
          >
            1lam
          </a>{' '}
          wallet.
        </div>
      )}
    </div>
  )
}
