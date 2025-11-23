'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import logger from '../../../utils/logger'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface SignalConfig {
  enabled: boolean
  default_quantity: number
  strategy_name: string
  auto_execute: boolean
  max_daily_trades: number
  risk_per_trade: number
  stop_loss_percent?: number
  take_profit_percent?: number
}

interface SignalStatus {
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

interface SignalEvent {
  id: number
  type: string
  message: string
  timestamp: string
}

export default function SignalsPage() {
  const [config, setConfig] = useState<SignalConfig>({
    enabled: true,
    default_quantity: 10,
    strategy_name: 'TradingView',
    auto_execute: true,
    max_daily_trades: 50,
    risk_per_trade: 0.02
  })
  const [status, setStatus] = useState<SignalStatus | null>(null)
  const [history, setHistory] = useState<SignalEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')

  useEffect(() => {
    loadStatus()
    loadConfig()
    loadHistory()
    const interval = setInterval(() => {
      loadStatus()
      loadHistory()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Generate webhook URL
    const url = `${API_URL}/api/v1/signals/webhook`
    setWebhookUrl(url)
  }, [])

  const loadStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/signals/status`)
      if (response.data.status === 'success') {
        setStatus(response.data.system)
      }
    } catch (error) {
      logger.error('Error loading status:', error)
    }
  }

  const loadConfig = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/signals/config`)
      if (response.data.status === 'success') {
        setConfig(response.data.config)
      }
    } catch (error) {
      logger.error('Error loading config:', error)
    }
  }

  const loadHistory = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/signals/history`)
      if (response.data.status === 'success') {
        setHistory(response.data.history.reverse())
      }
    } catch (error) {
      logger.error('Error loading history:', error)
    }
  }

  const updateConfig = async () => {
    setLoading(true)
    try {
      const response = await axios.post(`${API_URL}/api/v1/signals/config`, config)
      if (response.data.status === 'success') {
        alert('âœ… Configuration updated successfully!')
        loadConfig()
      }
    } catch (error: any) {
      alert(`âŒ Error: ${error.response?.data?.detail || error.message}`)
    }
    setLoading(false)
  }

  const toggleAutoExecute = async () => {
    setLoading(true)
    try {
      const response = await axios.post(`${API_URL}/api/v1/signals/config/toggle`)
      if (response.data.status === 'success') {
        loadStatus()
        loadConfig()
      }
    } catch (error: any) {
      alert(`âŒ Error: ${error.response?.data?.detail || error.message}`)
    }
    setLoading(false)
  }

  const resetDailyCount = async () => {
    if (!confirm('Reset daily trade count?')) return
    setLoading(true)
    try {
      const response = await axios.post(`${API_URL}/api/v1/signals/config/reset-daily-count`)
      if (response.data.status === 'success') {
        loadStatus()
      }
    } catch (error: any) {
      alert(`âŒ Error: ${error.response?.data?.detail || error.message}`)
    }
    setLoading(false)
  }

  const testSignal = async () => {
    setLoading(true)
    try {
      const response = await axios.post(`${API_URL}/api/v1/signals/test`)
      if (response.data.status === 'success') {
        alert('âœ… Test signal sent!')
        loadHistory()
      }
    } catch (error: any) {
      alert(`âŒ Error: ${error.response?.data?.detail || error.message}`)
    }
    setLoading(false)
  }

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl)
    alert('âœ… Webhook URL copied to clipboard!')
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          ðŸ¤– Auto Trading - TradingView Signals
        </h1>
        <p style={{ color: '#666' }}>Automatically execute trades from TradingView alerts</p>
      </div>

      {/* Status Card */}
      {status && (
        <div style={{
          background: status.auto_execute_enabled ? '#10b981' : '#f97316',
          color: 'white',
          padding: '2rem',
          borderRadius: '8px',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
            <div>
              <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>IB Connection</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {status.connected_to_ib ? 'ðŸŸ¢ Connected' : 'ðŸ”´ Disconnected'}
              </div>
              <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                {status.account.name}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Auto Execute</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {status.auto_execute_enabled ? 'âœ… ENABLED' : 'âŒ DISABLED'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Daily Trades</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {status.daily_trades} / {status.max_daily_trades}
              </div>
              <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                {status.remaining_trades} remaining
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
            <button
              onClick={toggleAutoExecute}
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'white',
                color: status.auto_execute_enabled ? '#f97316' : '#10b981',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {status.auto_execute_enabled ? 'â›” Disable' : 'âœ… Enable'}
            </button>

            <button
              onClick={resetDailyCount}
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid white',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              ðŸ”„ Reset Count
            </button>

            <button
              onClick={testSignal}
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid white',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              ðŸ§ª Test Signal
            </button>
          </div>
        </div>
      )}

      {/* Configuration */}
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '2rem',
        background: 'white',
        marginBottom: '2rem'
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>âš™ï¸ Configuration</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
              Strategy Name
            </label>
            <input
              type="text"
              value={config.strategy_name}
              onChange={(e) => setConfig({ ...config, strategy_name: e.target.value })}
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
              Default Quantity
            </label>
            <input
              type="number"
              value={config.default_quantity}
              onChange={(e) => setConfig({ ...config, default_quantity: parseFloat(e.target.value) })}
              min="0.1"
              step="0.1"
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
              Max Daily Trades
            </label>
            <input
              type="number"
              value={config.max_daily_trades}
              onChange={(e) => setConfig({ ...config, max_daily_trades: parseInt(e.target.value) })}
              min="1"
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
              Risk Per Trade (%)
            </label>
            <input
              type="number"
              value={config.risk_per_trade * 100}
              onChange={(e) => setConfig({ ...config, risk_per_trade: parseFloat(e.target.value) / 100 })}
              min="0.1"
              step="0.1"
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
              Stop Loss (%)
            </label>
            <input
              type="number"
              value={config.stop_loss_percent || ''}
              onChange={(e) => setConfig({ ...config, stop_loss_percent: e.target.value ? parseFloat(e.target.value) : undefined })}
              min="0.1"
              step="0.1"
              placeholder="Optional"
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
              Take Profit (%)
            </label>
            <input
              type="number"
              value={config.take_profit_percent || ''}
              onChange={(e) => setConfig({ ...config, take_profit_percent: e.target.value ? parseFloat(e.target.value) : undefined })}
              min="0.1"
              step="0.1"
              placeholder="Optional"
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
          onClick={updateConfig}
          disabled={loading}
          style={{
            padding: '0.75rem 2rem',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          {loading ? 'â³ Saving...' : 'ðŸ’¾ Save Configuration'}
        </button>
      </div>

      {/* Webhook Setup */}
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '2rem',
        background: '#f9fafb',
        marginBottom: '2rem'
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>ðŸ”— TradingView Webhook Setup</h2>

        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '4px', marginBottom: '1rem' }}>
          <p style={{ color: '#666', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            Webhook URL:
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={webhookUrl}
              readOnly
              style={{
                flex: 1,
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '0.875rem'
              }}
            />
            <button
              onClick={copyWebhookUrl}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              ðŸ“‹ Copy
            </button>
          </div>
        </div>

        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '4px' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Signal JSON Format:</p>
          <pre style={{
            background: '#1f2937',
            color: '#10b981',
            padding: '1rem',
            borderRadius: '4px',
            overflowX: 'auto',
            fontSize: '0.85rem'
          }}>
{`{
  "symbol": "AAPL",
  "action": "BUY",
  "contract_type": "stock",
  "quantity": 10,
  "order_type": "MKT",
  "strategy": "My Strategy",
  "timeframe": "1H",
  "exchange": "NASDAQ"
}`}
          </pre>
        </div>
      </div>

      {/* Signal History */}
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '2rem',
        background: 'white'
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>ðŸ“ Signal History</h2>
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          maxHeight: '500px',
          overflowY: 'auto'
        }}>
          {history.length > 0 ? (
            history.map((event) => (
              <div
                key={event.id}
                style={{
                  padding: '1rem',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>
                    {event.type === 'success' ? 'âœ…' : event.type === 'error' ? 'âŒ' : event.type === 'warning' ? 'âš ï¸' : event.type === 'info' ? 'â„¹ï¸' : 'ðŸ“¨'}
                  </span>
                  <span>{event.message}</span>
                </div>
                <span style={{ color: '#666', fontSize: '0.8rem' }}>
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
              No signals yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
