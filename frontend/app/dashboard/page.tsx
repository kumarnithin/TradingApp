'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import StatsCard from '@/components/StatsCard'
import { 
  BanknotesIcon, 
  ChartBarIcon, 
  TrophyIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon 
} from '@heroicons/react/24/solid'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

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
  strategy_id: string
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

  // Mock chart data (replace with real data later)
  const chartData = [
    { time: '9:00', value: 100000 },
    { time: '10:00', value: 100200 },
    { time: '11:00', value: 99800 },
    { time: '12:00', value: 100500 },
    { time: '1:00', value: 100800 },
    { time: '2:00', value: stats.balance },
  ]

  const symbolDistribution = trades.reduce((acc, trade) => {
    acc[trade.symbol] = (acc[trade.symbol] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const pieData = Object.entries(symbolDistribution).map(([symbol, count]) => ({
    name: symbol,
    value: count
  }))

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatsCard
          title="Account Balance"
          value={`$${stats.balance.toLocaleString()}`}
          change={2.5}
          icon={<BanknotesIcon className="h-6 w-6 text-white" />}
          gradient="gradient-blue"
        />
        <StatsCard
          title="Daily P&L"
          value={`${stats.daily_profit >= 0 ? '+' : ''}$${stats.daily_profit.toLocaleString()}`}
          change={stats.daily_profit >= 0 ? 5.2 : -3.1}
          icon={<ChartBarIcon className="h-6 w-6 text-white" />}
          gradient={stats.daily_profit >= 0 ? 'gradient-green' : 'gradient-red'}
        />
        <StatsCard
          title="Win Rate"
          value={`${stats.win_rate.toFixed(1)}%`}
          icon={<TrophyIcon className="h-6 w-6 text-white" />}
          gradient="gradient-purple"
        />
        <StatsCard
          title="Total Trades"
          value={stats.total_trades.toString()}
          icon={<CurrencyDollarIcon className="h-6 w-6 text-white" />}
          gradient="gradient-orange"
        />
        <StatsCard
          title="Open Positions"
          value={stats.open_positions.toString()}
          icon={<ArrowTrendingUpIcon className="h-6 w-6 text-white" />}
          gradient="gradient-blue"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portfolio Chart */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Portfolio Value</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#f1f5f9' }}
              />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Symbol Distribution */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Trades by Symbol</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              No trades yet
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Signals */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Recent Signals</h2>
          <div className="space-y-3">
            {signals.slice(0, 5).map((signal) => (
              <div key={signal.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg hover:bg-slate-900/70 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    signal.status === 'EXECUTED' ? 'bg-green-500' :
                    signal.status === 'PENDING' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}></div>
                  <div>
                    <p className="text-white font-semibold">{signal.symbol}</p>
                    <p className="text-xs text-gray-400">{signal.strategy_id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    signal.action === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {signal.action}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">{signal.quantity} shares</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Trades */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Recent Trades</h2>
          <div className="space-y-3">
            {trades.slice(0, 5).map((trade) => (
              <div key={trade.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg hover:bg-slate-900/70 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    trade.status === 'FILLED' ? 'bg-blue-500' : 'bg-yellow-500'
                  }`}></div>
                  <div>
                    <p className="text-white font-semibold">{trade.symbol}</p>
                    <p className="text-xs text-gray-400">
                      {trade.entry_price ? `$${trade.entry_price.toFixed(2)}` : 'Pending'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    trade.profit_loss >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {trade.profit_loss >= 0 ? '+' : ''}${trade.profit_loss.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400">{trade.quantity} shares</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
