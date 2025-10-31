'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Alert {
  id: string
  symbol: string
  action: string
  quantity: number
  status: string
  strategy?: string
  created_at: string
  filled_at?: string
  profit_loss?: number
}

interface AlertStats {
  total_alerts: number
  filled: number
  pending: number
  failed: number
  success_rate: number
}

interface StrategyStats {
  strategy: string
  total_signals: number
  filled: number
  success_rate: number
  win_rate: number
  total_profit: number
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [stats, setStats] = useState<AlertStats | null>(null)
  const [strategyStats, setStrategyStats] = useState<StrategyStats[]>([])
  const [loading, setLoading] = useState(false)
  
  // Filters
  const [filters, setFilters] = useState({
    symbol: '',
    strategy: '',
    status: 'all',
    days: 7
  })

  useEffect(() => {
    loadAlerts()
    loadStats()
    loadStrategyStats()
    
    const interval = setInterval(() => {
      loadAlerts()
      loadStats()
    }, 10000) // Refresh every 10 seconds
    
    return () => clearInterval(interval)
  }, [filters])

  const loadAlerts = async () => {
    try {
      const params: any = { days: filters.days }
      if (filters.symbol) params.symbol = filters.symbol
      if (filters.strategy) params.strategy = filters.strategy
      if (filters.status !== 'all') params.status = filters.status

      const response = await axios.get(`${API_URL}/api/v1/alerts/list`, { params })
      if (response.data) {
        setAlerts(response.data)
      }
    } catch (error) {
      console.error('Error loading alerts:', error)
    }
  }

  const loadStats = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/v1/alerts/stats/overview?days=${filters.days}`
      )
      setStats(response.data)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const loadStrategyStats = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/v1/alerts/stats/by-strategy?days=${filters.days}`
      )
      setStrategyStats(response.data.strategies || [])
    } catch (error) {
      console.error('Error loading strategy stats:', error)
    }
  }

  const exportAlerts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/alerts/bulk/export`, {
        params: { symbol: filters.symbol, strategy: filters.strategy, days: filters.days }
      })
      
      // Download as JSON
      const dataStr = JSON.stringify(response.data.data, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `alerts_export_${new Date().toISOString()}.json`
      link.click()
    } catch (error) {
      console.error('Error exporting alerts:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FILLED': return '#10b981'
      case 'PENDING': return '#f59e0b'
      case 'REJECTED': return '#ef4444'
      case 'ERROR': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getActionColor = (action: string) => {
    return action === 'BUY' ? '#10b981' : '#ef4444'
  }

  const getProfitColor = (profit: number | undefined) => {
    if (!profit) return '#6b7280'
    return profit > 0 ? '#10b981' : '#ef4444'
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          📊 Alert Database Dashboard
        </h1>
        <p style={{ color: '#666' }}>Track all TradingView signals with persistent database storage</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            background: '#f3f4f6',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>Total Alerts</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
              {stats.total_alerts}
            </div>
          </div>

          <div style={{
            background: '#dbeafe',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #93c5fd'
          }}>
            <div style={{ fontSize: '0.9rem', color: '#1e40af' }}>Filled</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem', color: '#1e40af' }}>
              {stats.filled}
            </div>
          </div>

          <div style={{
            background: '#fef3c7',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #fcd34d'
          }}>
            <div style={{ fontSize: '0.9rem', color: '#92400e' }}>Pending</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem', color: '#92400e' }}>
              {stats.pending}
            </div>
          </div>

          <div style={{
            background: '#fee2e2',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #fca5a5'
          }}>
            <div style={{ fontSize: '0.9rem', color: '#7f1d1d' }}>Failed</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem', color: '#7f1d1d' }}>
              {stats.failed}
            </div>
          </div>

          <div style={{
            background: '#d1fae5',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #6ee7b7'
          }}>
            <div style={{ fontSize: '0.9rem', color: '#065f46' }}>Success Rate</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem', color: '#065f46' }}>
              {stats.success_rate.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Strategy Performance */}
      {strategyStats.length > 0 && (
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem', fontWeight: 'bold' }}>
            📈 Strategy Performance
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '1rem' }}>Strategy</th>
                  <th style={{ textAlign: 'center', padding: '1rem' }}>Total Signals</th>
                  <th style={{ textAlign: 'center', padding: '1rem' }}>Filled</th>
                  <th style={{ textAlign: 'center', padding: '1rem' }}>Success %</th>
                  <th style={{ textAlign: 'center', padding: '1rem' }}>Win Rate %</th>
                  <th style={{ textAlign: 'right', padding: '1rem' }}>Total Profit</th>
                </tr>
              </thead>
              <tbody>
                {strategyStats.map((s) => (
                  <tr key={s.strategy} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>{s.strategy}</td>
                    <td style={{ textAlign: 'center', padding: '1rem' }}>{s.total_signals}</td>
                    <td style={{ textAlign: 'center', padding: '1rem' }}>{s.filled}</td>
                    <td style={{ textAlign: 'center', padding: '1rem' }}>
                      {s.success_rate.toFixed(1)}%
                    </td>
                    <td style={{ textAlign: 'center', padding: '1rem' }}>
                      <span style={{ color: s.win_rate > 50 ? '#10b981' : '#ef4444' }}>
                        {s.win_rate.toFixed(1)}%
                      </span>
                    </td>
                    <td style={{
                      textAlign: 'right',
                      padding: '1rem',
                      color: getProfitColor(s.total_profit),
                      fontWeight: 'bold'
                    }}>
                      ${s.total_profit.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', fontWeight: 'bold' }}>🔍 Filters</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem'
        }}>
          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
              Symbol
            </label>
            <input
              type="text"
              value={filters.symbol}
              onChange={(e) => setFilters({ ...filters, symbol: e.target.value })}
              placeholder="e.g., AAPL"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px'
              }}
            />
          </div>

          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
              Strategy
            </label>
            <input
              type="text"
              value={filters.strategy}
              onChange={(e) => setFilters({ ...filters, strategy: e.target.value })}
              placeholder="e.g., RSI"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px'
              }}
            />
          </div>

          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px'
              }}
            >
              <option value="all">All</option>
              <option value="FILLED">Filled</option>
              <option value="PENDING">Pending</option>
              <option value="REJECTED">Rejected</option>
              <option value="ERROR">Error</option>
            </select>
          </div>

          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
              Period (Days)
            </label>
            <input
              type="number"
              value={filters.days}
              onChange={(e) => setFilters({ ...filters, days: parseInt(e.target.value) })}
              min="1"
              max="365"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px'
              }}
            />
          </div>
        </div>

        <button
          onClick={exportAlerts}
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1.5rem',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          📥 Export as JSON
        </button>
      </div>

      {/* Alerts Table */}
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '1.5rem'
      }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', fontWeight: 'bold' }}>
          📋 Alert History ({alerts.length})
        </h2>
        
        {alerts.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '1rem' }}>Time</th>
                  <th style={{ textAlign: 'center', padding: '1rem' }}>Symbol</th>
                  <th style={{ textAlign: 'center', padding: '1rem' }}>Action</th>
                  <th style={{ textAlign: 'center', padding: '1rem' }}>Qty</th>
                  <th style={{ textAlign: 'center', padding: '1rem' }}>Strategy</th>
                  <th style={{ textAlign: 'center', padding: '1rem' }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '1rem' }}>P&L</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                      {new Date(alert.created_at).toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'center', padding: '1rem', fontWeight: 'bold' }}>
                      {alert.symbol}
                    </td>
                    <td style={{
                      textAlign: 'center',
                      padding: '1rem',
                      color: getActionColor(alert.action),
                      fontWeight: 'bold'
                    }}>
                      {alert.action}
                    </td>
                    <td style={{ textAlign: 'center', padding: '1rem' }}>
                      {alert.quantity}
                    </td>
                    <td style={{ textAlign: 'center', padding: '1rem', fontSize: '0.9rem', color: '#666' }}>
                      {alert.strategy || '-'}
                    </td>
                    <td style={{
                      textAlign: 'center',
                      padding: '1rem',
                      color: getStatusColor(alert.status),
                      fontWeight: 'bold'
                    }}>
                      {alert.status}
                    </td>
                    <td style={{
                      textAlign: 'right',
                      padding: '1rem',
                      color: getProfitColor(alert.profit_loss),
                      fontWeight: 'bold'
                    }}>
                      {alert.profit_loss ? `$${alert.profit_loss.toFixed(2)}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
            No alerts found
          </div>
        )}
      </div>
    </div>
  )
}
