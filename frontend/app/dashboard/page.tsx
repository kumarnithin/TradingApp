'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import Link from 'next/link'

// Types for our data
interface AccountStats {
  balance: number
  daily_profit: number
  win_rate: number
  total_trades: number
  open_positions: number
}

interface Trade {
  id: number
  symbol: string
  action: string
  quantity: number
  entry_price: number | null
  profit_loss: number
  status: string
  created_at: string
}

// Get backend URL from environment
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function Dashboard() {
  // State variables (like Excel cells that update)
  const [stats, setStats] = useState<AccountStats>({
    balance: 0,
    daily_profit: 0,
    win_rate: 0,
    total_trades: 0,
    open_positions: 0
  })
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Run once when page loads
  useEffect(() => {
    fetchData()
    // Refresh every 5 seconds
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  // Fetch data from backend
  const fetchData = async () => {
    try {
      // Get account stats
      const statsRes = await axios.get(`${API_URL}/api/v1/account/stats`)
      setStats(statsRes.data)

      // Get recent trades
      const tradesRes = await axios.get(`${API_URL}/api/v1/orders?limit=10`)
      setTrades(tradesRes.data)

      setLoading(false)
      setError(null)
    } catch (err: any) {
      console.error('Error fetching data:', err)
      setError('Failed to connect to backend')
      setLoading(false)
    }
  }

  // While loading, show loading message
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Trading Dashboard</h1>
          <Link href="/" className="text-gray-400 hover:text-white">
            ← Back
          </Link>
        </div>
      </header>

      {/* Error message if connection failed */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 p-4 m-6 rounded">
          ⚠️ {error}
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid - Shows key numbers */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard
            title="Account Balance"
            value={`$${stats.balance.toFixed(2)}`}
            color="from-blue-500 to-cyan-600"
          />
          <StatCard
            title="Daily P&L"
            value={`$${stats.daily_profit.toFixed(2)}`}
            color={stats.daily_profit >= 0 ? "from-green-500 to-emerald-600" : "from-red-500 to-rose-600"}
          />
          <StatCard
            title="Win Rate"
            value={`${stats.win_rate.toFixed(1)}%`}
            color="from-purple-500 to-pink-600"
          />
          <StatCard
            title="Total Trades"
            value={stats.total_trades.toString()}
            color="from-orange-500 to-red-600"
          />
          <StatCard
            title="Open Positions"
            value={stats.open_positions.toString()}
            color="from-cyan-500 to-blue-600"
          />
        </div>

        {/* Recent Trades Table */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-6">Recent Trades</h2>
          
          {trades.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No trades yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-slate-700">
                    <th className="pb-3 text-gray-400 font-medium">Symbol</th>
                    <th className="pb-3 text-gray-400 font-medium">Action</th>
                    <th className="pb-3 text-gray-400 font-medium">Qty</th>
                    <th className="pb-3 text-gray-400 font-medium">Entry Price</th>
                    <th className="pb-3 text-gray-400 font-medium">P&L</th>
                    <th className="pb-3 text-gray-400 font-medium">Status</th>
                    <th className="pb-3 text-gray-400 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade) => (
                    <tr key={trade.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-4 text-white font-medium">{trade.symbol}</td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded text-sm font-semibold ${
                          trade.action === 'BUY' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {trade.action}
                        </span>
                      </td>
                      <td className="py-4 text-gray-300">{trade.quantity}</td>
                      <td className="py-4 text-gray-300">
                        {trade.entry_price ? `$${trade.entry_price.toFixed(2)}` : '-'}
                      </td>
                      <td className={`py-4 font-semibold ${
                        trade.profit_loss >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        ${trade.profit_loss.toFixed(2)}
                      </td>
                      <td className="py-4 text-gray-300">
                        <span className={`px-2 py-1 rounded text-sm ${
                          trade.status === 'FILLED' ? 'bg-blue-500/20 text-blue-300' : 'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          {trade.status}
                        </span>
                      </td>
                      <td className="py-4 text-gray-400 text-sm">
                        {new Date(trade.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// Stat Card Component - Reusable card for showing numbers
function StatCard({ title, value, color }: { title: string; value: string; color: string }) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-xl p-6 shadow-lg`}>
      <p className="text-white/80 text-sm mb-2">{title}</p>
      <p className="text-white text-2xl md:text-3xl font-bold">{value}</p>
    </div>
  )
}
