'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import StatCard from '@/components/StatCard'
import styles from './page.module.css'

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

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className={styles.dashboard}>
      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <StatCard
          title="Account Balance"
          value={`$${stats.balance.toLocaleString()}`}
          change={2.5}
          icon="💰"
          gradient="gradientBlue"
        />
        <StatCard
          title="Daily P&L"
          value={`${stats.daily_profit >= 0 ? '+' : ''}$${stats.daily_profit.toLocaleString()}`}
          change={stats.daily_profit >= 0 ? 5.2 : -3.1}
          icon="📊"
          gradient={stats.daily_profit >= 0 ? 'gradientGreen' : 'gradientRed'}
        />
        <StatCard
          title="Win Rate"
          value={`${stats.win_rate.toFixed(1)}%`}
          icon="🎯"
          gradient="gradientPurple"
        />
        <StatCard
          title="Total Trades"
          value={stats.total_trades.toString()}
          icon="📈"
          gradient="gradientOrange"
        />
        <StatCard
          title="Open Positions"
          value={stats.open_positions.toString()}
          icon="🔥"
          gradient="gradientBlue"
        />
      </div>

      {/* Activity Section */}
      <div className={styles.activityGrid}>
        {/* Recent Signals */}
        <div className={`${styles.panel} glass-light`}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Recent Signals</h2>
            <span className={styles.badge}>{signals.length}</span>
          </div>
          <div className={styles.panelContent}>
            {signals.length > 0 ? (
              signals.slice(0, 5).map((signal) => (
                <div key={signal.id} className={styles.listItem}>
                  <div className={styles.itemLeft}>
                    <div className={`${styles.statusDot} ${signal.status === 'EXECUTED' ? styles.dotGreen : signal.status === 'PENDING' ? styles.dotYellow : styles.dotRed}`}></div>
                    <div>
                      <p className={styles.itemTitle}>{signal.symbol}</p>
                      <p className={styles.itemSubtitle}>{signal.strategy_id}</p>
                    </div>
                  </div>
                  <div className={styles.itemRight}>
                    <span className={`${styles.actionBadge} ${signal.action === 'BUY' ? styles.badgeBuy : styles.badgeSell}`}>
                      {signal.action}
                    </span>
                    <p className={styles.itemQuantity}>{signal.quantity} shares</p>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                <p>No signals yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Trades */}
        <div className={`${styles.panel} glass-light`}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Recent Trades</h2>
            <span className={styles.badge}>{trades.length}</span>
          </div>
          <div className={styles.panelContent}>
            {trades.length > 0 ? (
              trades.slice(0, 5).map((trade) => (
                <div key={trade.id} className={styles.listItem}>
                  <div className={styles.itemLeft}>
                    <div className={`${styles.statusDot} ${trade.status === 'FILLED' ? styles.dotBlue : styles.dotYellow}`}></div>
                    <div>
                      <p className={styles.itemTitle}>{trade.symbol}</p>
                      <p className={styles.itemSubtitle}>{trade.quantity} shares</p>
                    </div>
                  </div>
                  <div className={styles.itemRight}>
                    <p className={`${styles.pnlValue} ${trade.profit_loss >= 0 ? styles.pnlPositive : styles.pnlNegative}`}>
                      ${trade.profit_loss.toFixed(2)}
                    </p>
                    <p className={styles.itemStatus}>{trade.status}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                <p>No trades yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
