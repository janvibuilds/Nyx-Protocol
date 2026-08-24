import Link from 'next/link'
import WalletConnect from '@/components/WalletConnect'

export default function Home() {
  return (
    <main className="min-h-screen bg-midnight-950">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-midnight-500 rounded-lg" />
            <span className="text-xl font-bold gradient-text">Midnight</span>
          </div>
          <WalletConnect />
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <h1 className="text-6xl font-bold mb-6">
          <span className="gradient-text">Midnight Dark Pool</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12">
          The future of institutional trading on Cardano. Trade large blocks without
          market impact, protected by zero-knowledge proofs.
        </p>
        <Link
          href="/trade"
          className="inline-block px-8 py-4 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold text-lg transition-colors glow-purple"
        >
          Launch App
        </Link>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-center mb-16">Why Midnight?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="glass rounded-xl p-8">
            <div className="w-12 h-12 bg-midnight-500/20 rounded-lg flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-midnight-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">MEV Resistant</h3>
            <p className="text-gray-400">
              Your orders are hidden from front-runners and sandwich bots. Trade with
              confidence knowing your strategy stays private.
            </p>
          </div>

          <div className="glass rounded-xl p-8">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">ZK Proofs</h3>
            <p className="text-gray-400">
              All trades are verified with zero-knowledge proofs. Prove your trade
              executed correctly without revealing your position.
            </p>
          </div>

          <div className="glass rounded-xl p-8">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">Sub-15ms Settlement</h3>
            <p className="text-gray-400">
              Near-instant trade execution and settlement. Our optimized sequencer
              processes orders in under 15 milliseconds.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-midnight-500 rounded-lg" />
              <span className="text-lg font-bold gradient-text">Midnight Dark Pool</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <a href="/trade" className="hover:text-white transition-colors">Launch App</a>
              <a href="https://docs.midnight.network" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Docs</a>
              <a href="https://github.com/midnight-network" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-white/5 text-center text-gray-600 text-xs">
            Built on <span className="text-midnight-400">Midnight Network</span> — Privacy-first blockchain on Cardano
          </div>
        </div>
      </footer>
    </main>
  )
}
