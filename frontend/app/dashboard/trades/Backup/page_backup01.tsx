'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import styles from './trades.module.css'
import logger from '../../../utils/logger'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Trade {
  id: number
  symbol: string
  action: string
  quantity: number
  entry_price: number | null
  exit_price: number | null
  profit_loss: number
  status: string
  created_at: string
  closed_at: string | null
}

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({
    symbol: '',
    status: 'ALL'
  })

  useEffect(() => {
    fetchTrades()
    const interval = setInterval(fetchTrades, 5000) // Update every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchTrades = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/orders?limit=100`)
      setTrades(response.data)
      setLoading(false)
    } catch (error) {
      logger.error('Error fetching trades:', error)
      setLoading(false)
    }
  }

  // Calculate statistics
  const closedTrades = trades.filter(t => t.status === 'FILLED' && t.exit_price)
  const openPositions = trades.filter(t => t.status === 'FILLED' && !t.exit_price)
  const totalPnL = trades.reduce((sum, t) => sum + t.profit_loss, 0)
  const winningTrades = closedTrades.filter(t => t.profit_loss > 0)
  const winRate = closedTrades.length > 0 
    ? (winningTrades.length / closedTrades.length) * 100 
    : 0
  const bestTrade = closedTrades.length > 0
    ? Math.max(...closedTrades.map(t => t.profit_loss))
    : 0
  const worstTrade = closedTrades.length > 0
    ? Math.min(...closedTrades.map(t => t.profit_loss))
    : 0

  // Filter trades
  const filteredTrades = trades.filter(trade => {
    if (filter.symbol && !trade.symbol.toLowerCase().includes(filter.symbol.toLowerCase())) return false
    if (filter.status !== 'ALL') {
      if (filter.status === 'OPEN' && (trade.status !== 'FILLED' || trade.exit_price)) return false
      if (filter.status === 'CLOSED' && (!trade.exit_price)) return false
    }
    return true
  })

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Date', 'Symbol', 'Action', 'Quantity', 'Entry Price', 'Exit Price', 'P&L', 'Status']
    const rows = filteredTrades.map(t => [
      new Date(t.created_at).toLocaleString(),
      t.symbol,
      t.action,
      t.quantity,
      t.entry_price?.toFixed(2) || '-',
      t.exit_price?.toFixed(2) || '-',
      t.profit_loss.toFixed(2),
      t.status
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trades_${new Date().toISOString().split('T')}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading trades...</p>
      </div>
    )
  }

  return (
    <div className={styles.tradesPage}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Trade Manager</h1>
          <p className={styles.pageSubtitle}>Monitor positions and track performance</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} glass-light`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Total P&L</span>
            <span className={styles.statIcon}>ðŸ’°</span>
          </div>
          <p className={`${styles.statValue} ${totalPnL >= 0 ? styles.positive : styles.negative}`}>
            ${totalPnL.toFixed(2)}
          </p>
          <p className={styles.statSubtext}>{closedTrades.length} closed trades</p>
        </div>

        <div className={`${styles.statCard} glass-light`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Win Rate</span>
            <span className={styles.statIcon}>ðŸŽ¯</span>
          </div>
          <p className={styles.statValue}>{winRate.toFixed(1)}%</p>
          <p className={styles.statSubtext}>{winningTrades.length} wins / {closedTrades.length - winningTrades.length} losses</p>
        </div>

        <div className={`${styles.statCard} glass-light`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Best Trade</span>
            <span className={styles.statIcon}>ðŸš€</span>
          </div>
          <p className={`${styles.statValue} ${styles.positive}`}>+${bestTrade.toFixed(2)}</p>
          <p className={styles.statSubtext}>Highest profit</p>
        </div>

        <div className={`${styles.statCard} glass-light`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Worst Trade</span>
            <span className={styles.statIcon}>ðŸ“‰</span>
          </div>
          <p className={`${styles.statValue} ${styles.negative}`}>${worstTrade.toFixed(2)}</p>
          <p className={styles.statSubtext}>Largest loss</p>
        </div>
      </div>

      {/* Open Positions */}
      {openPositions.length > 0 && (
        <div className={`${styles.openPositions} glass-light`}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>ðŸ”¥ Open Positions</h2>
            <span className={styles.positionBadge}>{openPositions.length} active</span>
          </div>
          <div className={styles.positionsGrid}>
            {openPositions.map(trade => (
              <div key={trade.id} className={styles.positionCard}>
                <div className={styles.positionHeader}>
                  <span className={styles.positionSymbol}>{trade.symbol}</span>
                  <span className={`${styles.positionAction} ${trade.action === 'BUY' ? styles.actionBuy : styles.actionSell}`}>
                    {trade.action}
                  </span>
                </div>
                <div className={styles.positionDetails}>
                  <div className={styles.positionDetail}>
                    <span className={styles.detailLabel}>Quantity</span>
                    <span className={styles.detailValue}>{trade.quantity}</span>
                  </div>
                  <div className={styles.positionDetail}>
                    <span className={styles.detailLabel}>Entry Price</span>
                    <span className={styles.detailValue}>${trade.entry_price?.toFixed(2)}</span>
                  </div>
                  <div className={styles.positionDetail}>
                    <span className={styles.detailLabel}>Current P&L</span>
                    <span className={`${styles.detailValue} ${trade.profit_loss >= 0 ? styles.positive : styles.negative}`}>
                      ${trade.profit_loss.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className={`${styles.filtersBar} glass-light`}>
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

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Status</label>
          <select 
            className={styles.filterSelect}
            value={filter.status}
            onChange={(e) => setFilter({...filter, status: e.target.value})}
          >
            <option value="ALL">All Trades</option>
            <option value="OPEN">Open Positions</option>
            <option value="CLOSED">Closed Trades</option>
          </select>
        </div>

        <button 
          className={styles.resetButton}
          onClick={() => setFilter({ symbol: '', status: 'ALL' })}
        >
          Reset
        </button>

        <button 
          className={styles.exportButton}
          onClick={exportToCSV}
        >
          ðŸ“¥ Export CSV
        </button>
      </div>

      {/* Trades Table */}
      <div className={`${styles.tableContainer} glass-light`}>
        <div className={styles.tableHeader}>
          <h2 className={styles.tableTitle}>Trade History</h2>
          <span className={styles.tableBadge}>{filteredTrades.length} trades</span>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Symbol</th>
                <th>Action</th>
                <th>Quantity</th>
                <th>Entry Price</th>
                <th>Exit Price</th>
                <th>P&L</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.length > 0 ? (
                filteredTrades.map((trade) => (
                  <tr key={trade.id} className={styles.tableRow}>
                    <td className={styles.dateCell}>
                      {new Date(trade.created_at).toLocaleDateString()}<br/>
                      <span className={styles.timeText}>{new Date(trade.created_at).toLocaleTimeString()}</span>
                    </td>
                    <td className={styles.symbolCell}>{trade.symbol}</td>
                    <td>
                      <span className={`${styles.actionBadge} ${trade.action === 'BUY' ? styles.badgeBuy : styles.badgeSell}`}>
                        {trade.action}
                      </span>
                    </td>
                    <td className={styles.quantityCell}>{trade.quantity}</td>
                    <td className={styles.priceCell}>
                      {trade.entry_price ? `$${trade.entry_price.toFixed(2)}` : '-'}
                    </td>
                    <td className={styles.priceCell}>
                      {trade.exit_price ? `$${trade.exit_price.toFixed(2)}` : '-'}
                    </td>
                    <td className={`${styles.pnlCell} ${trade.profit_loss >= 0 ? styles.positive : styles.negative}`}>
                      ${trade.profit_loss.toFixed(2)}
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${
                        trade.exit_price ? styles.statusClosed : styles.statusOpen
                      }`}>
                        {trade.exit_price ? 'CLOSED' : 'OPEN'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className={styles.emptyState}>
                    No trades found matching your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* P&L by Symbol */}
      <div className={`${styles.pnlCard} glass-light`}>
        <h2 className={styles.pnlTitle}>P&L by Symbol</h2>
        <div className={styles.pnlGrid}>
          {getSymbolPnL(trades).map((item, index) => (
            <div key={index} className={styles.pnlItem}>
              <div className={styles.pnlHeader}>
                <span className={styles.pnlSymbol}>{item.symbol}</span>
                <span className={`${styles.pnlValue} ${item.pnl >= 0 ? styles.positive : styles.negative}`}>
                  ${item.pnl.toFixed(2)}
                </span>
              </div>
              <div className={styles.pnlBar}>
                <div 
                  className={`${styles.pnlFill} ${item.pnl >= 0 ? styles.fillPositive : styles.fillNegative}`}
                  style={{ width: `${Math.min(Math.abs(item.pnl / Math.max(...getSymbolPnL(trades).map(s => Math.abs(s.pnl)))) * 100, 100)}%` }}
                ></div>
              </div>
              <div className={styles.pnlStats}>
                <span>{item.trades} trades</span>
                <span>{item.winRate.toFixed(0)}% win rate</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Helper function to calculate P&L by symbol
function getSymbolPnL(trades: Trade[]) {
  const symbols = trades.reduce((acc, trade) => {
    if (!acc[trade.symbol]) {
      acc[trade.symbol] = { pnl: 0, trades: 0, wins: 0 }
    }
    acc[trade.symbol].pnl += trade.profit_loss
    acc[trade.symbol].trades++
    if (trade.profit_loss > 0) acc[trade.symbol].wins++
    return acc
  }, {} as Record<string, { pnl: number; trades: number; wins: number }>)

  return Object.entries(symbols)
    .map(([symbol, data]) => ({
      symbol,
      pnl: data.pnl,
      trades: data.trades,
      winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0
    }))
    .sort((a, b) => b.pnl - a.pnl)
}
