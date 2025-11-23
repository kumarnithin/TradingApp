'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface SystemStatus {
  connected_to_ib: boolean
  auto_execute_enabled: boolean
  signals_enabled: boolean
  daily_trades: number
  max_daily_trades: number
  remaining_trades: number
  account: {
    name: string
    type: string
  }
}

interface SignalConfig {
  enabled: boolean
  default_quantity: number
  strategy_name: string
  auto_execute: boolean
  max_daily_trades: number
}

interface SignalHistoryItem {
  id: number
  type: string
  message: string
  timestamp: string
}

export default function SignalsPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [config, setConfig] = useState<SignalConfig | null>(null)
  const [history, setHistory] = useState<SignalHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load data on mount
  useEffect(() => {
    loadStatus()
    loadConfig()
    loadHistory()

    // Refresh every 5 seconds
    const interval = setInterval(() => {
      loadStatus()
      loadHistory()
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const loadStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/signals/status`)
      if (response.data?.system) {
        setStatus(response.data.system)
      }
      setError(null)
    } catch (err: any) {
      logger.error('Error loading status:', err.message)
      setError('Failed to load system status')
    }
  }

  const loadConfig = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/signals/config`)
      if (response.data?.config) {
        setConfig(response.data.config)
      }
      setLoading(false)
      setError(null)
    } catch (err: any) {
      logger.error('Error loading config:', err.message)
      setError('Failed to load signal configuration')
      setLoading(false)
    }
  }

  const loadHistory = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/signals/history`)
      if (response.data?.history) {
        setHistory(response.data.history)
      }
      setError(null)
    } catch (err: any) {
      logger.error('Error loading history:', err.message)
    }
  }

  const toggleAutoExecute = async () => {
    try {
      await axios.post(`${API_URL}/api/v1/signals/config/toggle`)
      await loadConfig()
      await loadStatus()
      setError(null)
    } catch (err: any) {
      logger.error('Error toggling:', err.message)
      setError('Failed to toggle auto-execute')
    }
  }

  const resetDailyCount = async () => {
    try {
      await axios.post(`${API_URL}/api/v1/signals/config/reset-daily-count`)
      await loadStatus()
      await loadConfig()
      setError(null)
    } catch (err: any) {
      logger.error('Error resetting:', err.message)
      setError('Failed to reset daily count')
    }
  }

  const getStatusColor = (connected: boolean) => {
    return connected ? '#10b981' : '#ef4444'
  }

  const getStatusText = (connected: boolean) => {
    return connected ? 'ðŸŸ¢ Connected' : 'ðŸ”´ Disconnected'
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading signal configuration...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>ðŸ“¨ TradingView Signals</h1>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>
          Configure and monitor TradingView webhook alerts
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '2rem',
            color: '#7f1d1d',
          }}
        >
          âš ï¸ {error}
        </div>
      )}

      {/* System Status */}
      {status && (
        <div
          style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem', fontWeight: 'bold' }}>
            ðŸ”Œ System Status
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
            }}
          >
            {/* IB Connection */}
            <div
              style={{
                background: '#f3f4f6',
                padding: '1rem',
                borderRadius: '8px',
                borderLeft: `4px solid ${getStatusColor(status.connected_to_ib)}`,
              }}
            >
              <div style={{ fontSize: '0.9rem', color: '#666' }}>IB Connection</div>
              <div
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  marginTop: '0.5rem',
                  color: getStatusColor(status.connected_to_ib),
                }}
              >
                {getStatusText(status.connected_to_ib)}
              </div>
            </div>

            {/* Auto-Execute */}
            <div
              style={{
                background: '#f3f4f6',
                padding: '1rem',
                borderRadius: '8px',
                borderLeft: `4px solid ${status.auto_execute_enabled ? '#10b981' : '#ef4444'}`,
              }}
            >
              <div style={{ fontSize: '0.9rem', color: '#666' }}>Auto-Execute</div>
              <div
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  marginTop: '0.5rem',
                  color: status.auto_execute_enabled ? '#10b981' : '#ef4444',
                }}
              >
                {status.auto_execute_enabled ? 'ðŸŸ¢ Enabled' : 'ðŸ”´ Disabled'}
              </div>
            </div>

            {/* Daily Trades */}
            <div
              style={{
                background: '#f3f4f6',
                padding: '1rem',
                borderRadius: '8px',
                borderLeft: '4px solid #3b82f6',
              }}
            >
              <div style={{ fontSize: '0.9rem', color: '#666' }}>Daily Trades</div>
              <div
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  marginTop: '0.5rem',
                  color: '#3b82f6',
                }}
              >
                {status.daily_trades} / {status.max_daily_trades}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.5rem' }}>
                {status.remaining_trades} remaining
              </div>
            </div>

            {/* Account */}
            <div
              style={{
                background: '#f3f4f6',
                padding: '1rem',
                borderRadius: '8px',
                borderLeft: '4px solid #8b5cf6',
              }}
            >
              <div style={{ fontSize: '0.9rem', color: '#666' }}>Account</div>
              <div
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  marginTop: '0.5rem',
                  color: '#8b5cf6',
                }}
              >
                {status.account?.name || 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration */}
      {config && (
        <div
          style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem', fontWeight: 'bold' }}>
            âš™ï¸ Configuration
          </h2>

          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
                Default Quantity
              </label>
              <div style={{ fontSize: '1.2rem', color: '#3b82f6' }}>
                {config.default_quantity} shares per trade
              </div>
            </div>

            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
                Max Daily Trades
              </label>
              <div style={{ fontSize: '1.2rem', color: '#3b82f6' }}>
                {config.max_daily_trades} trades/day
              </div>
            </div>

            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
                Strategy Name
              </label>
              <div style={{ fontSize: '1.2rem', color: '#3b82f6' }}>
                {config.strategy_name}
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
            <button
              onClick={toggleAutoExecute}
              style={{
                padding: '0.75rem 1.5rem',
                background: config.auto_execute ? '#ef4444' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              {config.auto_execute ? 'ðŸ”´ Disable Auto-Execute' : 'ðŸŸ¢ Enable Auto-Execute'}
            </button>

            <button
              onClick={resetDailyCount}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              ðŸ”„ Reset Daily Counter
            </button>
          </div>
        </div>
      )}

      {/* Webhook Info */}
      <div
        style={{
          background: '#dbeafe',
          border: '1px solid #93c5fd',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem', fontWeight: 'bold', color: '#1e40af' }}>
          ðŸ“¨ TradingView Webhook Setup
        </h2>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', color: '#1e40af' }}>
            Webhook URL:
          </label>
          <code
            style={{
              background: '#f0f9ff',
              padding: '0.75rem',
              borderRadius: '4px',
              display: 'block',
              wordBreak: 'break-all',
              color: '#1e40af',
            }}
          >
            {API_URL}/api/v1/signals/webhook
          </code>
        </div>

        <div>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', color: '#1e40af' }}>
            Signal JSON Format:
          </label>
          <pre
            style={{
              background: '#f0f9ff',
              padding: '0.75rem',
              borderRadius: '4px',
              overflow: 'auto',
              color: '#1e40af',
              fontSize: '0.85rem',
            }}
          >
            {JSON.stringify(
              {
                symbol: 'AAPL',
                action: 'BUY',
                contract_type: 'stock',
                quantity: 10,
                order_type: 'MKT',
                strategy: 'My Strategy',
                timeframe: '1H',
              },
              null,
              2
            )}
          </pre>
        </div>
      </div>

      {/* Signal History */}
      <div
        style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '1.5rem',
        }}
      >
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem', fontWeight: 'bold' }}>
          ðŸ“œ Recent Signal History ({history.length})
        </h2>

        {history.length > 0 ? (
          <div style={{ maxHeight: '400px', overflow: 'auto' }}>
            {history
              .slice()
              .reverse()
              .map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '0.75rem',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                      {item.message}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#999' }}>
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      background:
                        item.type === 'success'
                          ? '#d1fae5'
                          : item.type === 'error'
                          ? '#fee2e2'
                          : '#fef3c7',
                      color:
                        item.type === 'success'
                          ? '#065f46'
                          : item.type === 'error'
                          ? '#7f1d1d'
                          : '#92400e',
                    }}
                  >
                    {item.type.toUpperCase()}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div style={{ padding: '1rem', textAlign: 'center', color: '#999' }}>
            No signal history yet
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import logger from '../../../utils/logger'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function SignalsPage() {
  // 1ï¸âƒ£ ADD STATE VARIABLES
  const [signals, setSignals] = useState([])
  const [loading, setLoading] = useState(false)
  
  // These 4 variables track the filter
  const [currentAccountId, setCurrentAccountId] = useState(null)
  const [selectedAccounts, setSelectedAccounts] = useState([])
  const [showAllAccounts, setShowAllAccounts] = useState(false)
  const [isMultiSelect, setIsMultiSelect] = useState(false)

  // 2ï¸âƒ£ LOAD SAVED FILTER (Run once on mount)
  useEffect(() => {
    const savedShowAll = localStorage.getItem('showAllAccounts')
    const savedAccountId = localStorage.getItem('currentAccountId')
    const savedSelectedAccounts = localStorage.getItem('selectedAccounts')
    const savedIsMultiSelect = localStorage.getItem('isMultiSelectMode')

    if (savedIsMultiSelect === 'true' && savedSelectedAccounts) {
      setIsMultiSelect(true)
      setSelectedAccounts(JSON.parse(savedSelectedAccounts))
      setShowAllAccounts(false)
    } else if (savedShowAll === 'true') {
      setShowAllAccounts(true)
      setSelectedAccounts([])
      setIsMultiSelect(false)
    } else if (savedAccountId) {
      setCurrentAccountId(savedAccountId)
      setShowAllAccounts(false)
      setSelectedAccounts([])
      setIsMultiSelect(false)
    }
  }, []) // Empty array = run only once

  // 3ï¸âƒ£ LISTEN FOR ACCOUNT SWITCHER CHANGES
  useEffect(() => {
    const handleAccountChange = (event) => {
      const { account, showAll, selectedAccounts: selected, isMultiSelect: multiSelect } = event.detail

      if (multiSelect && selected && selected.length > 0) {
        setIsMultiSelect(true)
        setSelectedAccounts(selected)
        setShowAllAccounts(false)
        setCurrentAccountId(null)
      } else if (showAll) {
        setShowAllAccounts(true)
        setSelectedAccounts([])
        setIsMultiSelect(false)
        setCurrentAccountId(null)
      } else if (account) {
        setCurrentAccountId(account.id)
        setShowAllAccounts(false)
        setSelectedAccounts([])
        setIsMultiSelect(false)
      }
    }

    window.addEventListener('accountChanged', handleAccountChange)
    return () => window.removeEventListener('accountChanged', handleAccountChange)
  }, []) // Empty array = run only once

  // 4ï¸âƒ£ RELOAD DATA WHEN FILTER CHANGES
  useEffect(() => {
    loadSignals()
  }, [currentAccountId, selectedAccounts, showAllAccounts, isMultiSelect])
  // These 4 variables are dependencies - when ANY change, reload data

  // 5ï¸âƒ£ BUILD API URL AND FETCH DATA
  const loadSignals = async () => {
    try {
      setLoading(true)
      let url = `${API_URL}/api/v1/signals/list`

      // BUILD URL BASED ON CURRENT FILTER
      if (isMultiSelect && selectedAccounts.length > 0) {
        // Multi-select mode: send multiple IDs
        url += `?account_ids=${selectedAccounts.join(',')}`
      } else if (!showAllAccounts && currentAccountId) {
        // Single account mode: send one ID
        url += `?account_id=${currentAccountId}`
      }
      // else: All accounts mode (no filter)

      const response = await axios.get(url)
      setSignals(response.data.signals || [])
      setLoading(false)
    } catch (error) {
      logger.error('Error loading signals:', error)
      setLoading(false)
    }
  }

  // 6ï¸âƒ£ RENDER THE PAGE
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Signals</h1>

      {/* SHOW WHICH FILTER IS ACTIVE */}
      <div style={{
        padding: '0.75rem 1rem',
        background: isMultiSelect ? '#8b5cf6' : (showAllAccounts ? '#3b82f6' : '#10b981'),
        color: 'white',
        borderRadius: '8px',
        marginBottom: '2rem',
        display: 'inline-block'
      }}>
        {isMultiSelect
          ? `âœ… ${selectedAccounts.length} Selected`
          : showAllAccounts
            ? 'ðŸ“Š All Accounts'
            : 'ðŸ¢ Single Account'
        }
      </div>

      {/* SHOW LOADING */}
      {loading && <div>Loading...</div>}

      {/* SHOW SIGNALS */}
      {!loading && signals.length === 0 && <div>No signals</div>}

      {!loading && signals.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Action</th>
              <th>Status</th>
              {(showAllAccounts || isMultiSelect) && <th>Account</th>}
            </tr>
          </thead>
          <tbody>
            {signals.map(signal => (
              <tr key={signal.id}>
                <td>{signal.symbol}</td>
                <td>{signal.action}</td>
                <td>{signal.status}</td>
                {(showAllAccounts || isMultiSelect) && <td>{signal.account_name}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
