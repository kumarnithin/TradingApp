'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import styles from './signals.module.css'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Signal {
  id: number
  symbol: string
  action: string
  quantity: number
  order_type: string
  price: number | null
  stop_loss: number | null
  take_profit: number | null
  strategy_id: string
  status: string
  received_at: string
  processed_at: string | null
  rejection_reason: string | null
}

export default function SignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({
    status: 'ALL',
    action: 'ALL',
    symbol: ''
  })

  useEffect(() => {
    fetchSignals()
    const interval = setInterval(fetchSignals, 3000) // Update every 3 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchSignals = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/webhook/signals?limit=50`)
      setSignals(response.data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching signals:', error)
      setLoading(false)
    }
  }

  // Calculate statistics
  const stats = {
    total: signals.length,
    executed: signals.filter(s => s.status === 'EXECUTED').length,
    pending: signals.filter(s => s.status === 'PENDING').length,
    rejected: signals.filter(s => s.status === 'REJECTED').length
  }

  // Filter signals
  const filteredSignals = signals.filter(signal => {
    if (filter.status !== 'ALL' && signal.status !== filter.status) return false
    if (filter.action !== 'ALL' && signal.action !== filter.action) return false
    if (filter.symbol && !signal.symbol.toLowerCase().includes(filter.symbol.toLowerCase())) return false
    return true
  })

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading signals...</p>
      </div>
    )
  }

  return (
    <div className={styles.signalsPage}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Signal Monitor</h1>
          <p className={styles.pageSubtitle}>Real-time trading signals and execution tracking</p>
        </div>
        <div className={styles.liveIndicator}>
          <div className={styles.liveDot}></div>
          <span>Live</span>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} glass-light`}>
          <div className={styles.statIcon}>📊</div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Total Signals</p>
            <p className={styles.statValue}>{stats.total}</p>
          </div>
        </div>

        <div className={`${styles.statCard} glass-light`}>
          <div className={`${styles.statIcon} ${styles.iconGreen}`}>✓</div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Executed</p>
            <p className={styles.statValue}>{stats.executed}</p>
          </div>
        </div>

        <div className={`${styles.statCard} glass-light`}>
          <div className={`${styles.statIcon} ${styles.iconYellow}`}>⏳</div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Pending</p>
            <p className={styles.statValue}>{stats.pending}</p>
          </div>
        </div>

        <div className={`${styles.statCard} glass-light`}>
          <div className={`${styles.statIcon} ${styles.iconRed}`}>✗</div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Rejected</p>
            <p className={styles.statValue}>{stats.rejected}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={`${styles.filtersBar} glass-light`}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Status</label>
          <select 
            className={styles.filterSelect}
            value={filter.status}
            onChange={(e) => setFilter({...filter, status: e.target.value})}
          >
            <option value="ALL">All Status</option>
            <option value="EXECUTED">Executed</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Action</label>
          <select 
            className={styles.filterSelect}
            value={filter.action}
            onChange={(e) => setFilter({...filter, action: e.target.value})}
          >
            <option value="ALL">All Actions</option>
            <option value="BUY">Buy</option>
            <option value="SELL">Sell</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Symbol</label>
          <input 
            type="text"
            placeholder="Search symbol..."
            className={styles.filterInput}
            value={filter.symbol}
            onChange={(e) => setFilter({...filter, symbol: e.target.value})}
          />
        </div>

        <button 
          className={styles.resetButton}
          onClick={() => setFilter({ status: 'ALL', action: 'ALL', symbol: '' })}
        >
          Reset
        </button>
      </div>

      {/* Signals Table */}
      <div className={`${styles.tableContainer} glass-light`}>
        <div className={styles.tableHeader}>
          <h2 className={styles.tableTitle}>Signal History</h2>
          <span className={styles.tableBadge}>{filteredSignals.length} signals</span>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Symbol</th>
                <th>Action</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Strategy</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSignals.length > 0 ? (
                filteredSignals.map((signal) => (
                  <tr key={signal.id} className={styles.tableRow}>
                    <td className={styles.timeCell}>
                      {new Date(signal.received_at).toLocaleTimeString()}
                    </td>
                    <td className={styles.symbolCell}>{signal.symbol}</td>
                    <td>
                      <span className={`${styles.actionBadge} ${signal.action === 'BUY' ? styles.badgeBuy : styles.badgeSell}`}>
                        {signal.action}
                      </span>
                    </td>
                    <td className={styles.quantityCell}>{signal.quantity}</td>
                    <td className={styles.priceCell}>
                      {signal.price ? `$${signal.price.toFixed(2)}` : '-'}
                    </td>
                    <td className={styles.strategyCell}>{signal.strategy_id}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${
                        signal.status === 'EXECUTED' ? styles.statusExecuted :
                        signal.status === 'PENDING' ? styles.statusPending :
                        styles.statusRejected
                      }`}>
                        {signal.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className={styles.emptyState}>
                    No signals found matching your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Strategy Performance */}
      <div className={`${styles.performanceCard} glass-light`}>
        <h2 className={styles.performanceTitle}>Strategy Performance</h2>
        <div className={styles.performanceGrid}>
          {getStrategyStats(signals).map((strategy, index) => (
            <div key={index} className={styles.strategyItem}>
              <div className={styles.strategyHeader}>
                <span className={styles.strategyName}>{strategy.name}</span>
                <span className={styles.strategyRate}>
                  {strategy.successRate}% success
                </span>
              </div>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill}
                  style={{ width: `${strategy.successRate}%` }}
                ></div>
              </div>
              <div className={styles.strategyStats}>
                <span>{strategy.executed} executed</span>
                <span>{strategy.rejected} rejected</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Helper function to calculate strategy statistics
function getStrategyStats(signals: Signal[]) {
  const strategies = signals.reduce((acc, signal) => {
    if (!acc[signal.strategy_id]) {
      acc[signal.strategy_id] = { executed: 0, rejected: 0, total: 0 }
    }
    acc[signal.strategy_id].total++
    if (signal.status === 'EXECUTED') acc[signal.strategy_id].executed++
    if (signal.status === 'REJECTED') acc[signal.strategy_id].rejected++
    return acc
  }, {} as Record<string, { executed: number; rejected: number; total: number }>)

  return Object.entries(strategies).map(([name, stats]) => ({
    name,
    executed: stats.executed,
    rejected: stats.rejected,
    successRate: stats.total > 0 ? Math.round((stats.executed / stats.total) * 100) : 0
  }))
}
