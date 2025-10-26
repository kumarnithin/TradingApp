'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

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

interface Signal {
  id: number
  symbol: string
  action: string
  quantity: number
  status: string
  received_at: string
}

export default function Dashboard() {
  const [stats, setStats] = useState<AccountStats>({
    balance: 0,
    daily_profit: 0,
    win_rate: 0,
    total_trades: 0,
    open_positions: 0
  })
  const [trades, setTrades] = useState<Trade[]>([])
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const [statsRes, tradesRes, signalsRes] = await Promise.all([
        axios.get(`${API_URL}/api/v1/account/stats`),
        axios.get(`${API_URL}/api/v1/orders?limit=10`),
        axios.get(`${API_URL}/api/v1/webhook/signals?limit=10`)
      ])

      setStats(statsRes.data)
      setTrades(tradesRes.data)
      setSignals(signalsRes.data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid - 5 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard 
          title="Balance" 
          value={`$${stats.balance.toLocaleString()}`} 
          gradient="bg-gradient-to-br from-blue-500 to-cyan-600"
        />
        <StatCard 
          title="Daily P&L" 
          value={`${stats.daily_profit >= 0 ? '+' : ''}$${stats.daily_profit.toLocaleString()}`} 
          gradient={stats.daily_profit >= 0 ? "bg-gradient-to-br from-green-500 to-emerald-600" : "bg-gradient-to-br from-red-500 to-rose-600"}
        />
        <StatCard 
          title="Win Rate" 
          value={`${stats.win_rate.toFixed(1)}%`} 
          gradient="bg-gradient-to-br from-purple-500 to-pink-600"
        />
        <StatCard 
          title="Total Trades" 
          value={stats.total_trades.toString()} 
          gradient="bg-gradient-to-br from-orange-500 to-red-600"
        />
        <StatCard 
          title="Open Positions" 
          value={stats.open_positions.toString()} 
          gradient="bg-gradient-to-br from-cyan-500 to-blue-600"
        />
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Signals Panel */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Signals</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {signals.length > 0 ? (
              signals.slice(0, 5).map((signal) => (
                <div 
                  key={signal.id} 
                  className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg hover:bg-slate-900/70 transition-colors"
                >
                  <div className="flex-1">
                    <p className="text-white font-semibold text-sm">{signal.symbol}</p>
                    <p className="text-xs text-gray-500">{signal.status}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ml-2 ${
                    signal.action === 'BUY' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {signal.action}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-8">No signals yet</p>
            )}
          </div>
        </div>

        {/* Recent Trades Panel */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Trades</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {trades.length > 0 ? (
              trades.slice(0, 5).map((trade) => (
                <div 
                  key={trade.id} 
                  className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg hover:bg-slate-900/70 transition-colors"
                >
                  <div className="flex-1">
                    <p className="text-white font-semibold text-sm">{trade.symbol}</p>
                    <p className="text-xs text-gray-500">{trade.quantity} shares</p>
                  </div>
                  <div className="text-right ml-2">
                    <p className={`font-semibold text-sm ${
                      trade.profit_loss >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      ${trade.profit_loss.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">{trade.status}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-8">No trades yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ 
  title, 
  value, 
  gradient 
}: { 
  title: string
  value: string
  gradient: string 
}) {
  return (
    <div className={`${gradient} rounded-lg p-4 text-white shadow-lg transition-transform hover:scale-105`}>
      <p className="text-white/80 text-xs font-medium uppercase tracking-wide mb-1">{title}</p>
      <p className="text-xl sm:text-2xl font-bold truncate">{value}</p>
    </div>
  )
}
