'use client'

import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-6">
          Trading Automation Platform
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          Interactive Brokers + TradingView Integration
        </p>
        <p className="text-gray-400 mb-12">
          Automate your trading strategies with professional risk management
        </p>
        <Link 
          href="/dashboard"
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition inline-block"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
