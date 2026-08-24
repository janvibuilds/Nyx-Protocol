'use client'

interface ConnectionStatusProps {
  isConnected: boolean
  reconnecting: boolean
  sequencerPubKey: string | null
}

function truncateKey(key: string): string {
  if (key.length <= 16) return key
  return `${key.slice(0, 8)}...${key.slice(-8)}`
}

export default function ConnectionStatus({
  isConnected,
  reconnecting,
  sequencerPubKey,
}: ConnectionStatusProps) {
  if (reconnecting) {
    return (
      <div className="flex items-center gap-2 glass rounded-lg px-4 py-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500" />
        </span>
        <span className="text-sm text-yellow-400">Reconnecting...</span>
      </div>
    )
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-2 glass rounded-lg px-4 py-2">
        <span className="relative flex h-3 w-3">
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
        </span>
        <span className="text-sm text-green-400">Connected</span>
        {sequencerPubKey && (
          <span className="text-xs text-gray-500 font-mono ml-2" title={sequencerPubKey}>
            {truncateKey(sequencerPubKey)}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 glass rounded-lg px-4 py-2">
      <span className="relative flex h-3 w-3">
        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
      </span>
      <span className="text-sm text-red-400">Disconnected</span>
    </div>
  )
}
