'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import logger from '../../../utils/logger'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function AlertsPage() {
  const [activeTab, setActiveTab] = useState<'manager' | 'builder'>('manager')
  const [alertName, setAlertName] = useState('')
  const [instrumentType, setInstrumentType] = useState('stocks')
  const [ibSymbol, setIbSymbol] = useState('')
  const [tvSymbol, setTvSymbol] = useState('')
  const [entryPrice, setEntryPrice] = useState('')
  const [stopLoss, setStopLoss] = useState('')
  const [takeProfit, setTakeProfit] = useState('')
  const [quantity, setQuantity] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [webhookJson, setWebhookJson] = useState<any>(null)
  const [alerts, setAlerts] = useState<any[]>([])
  const [copied, setCopied] = useState(false)

  // Symbol type info
  const typeIcons: Record<string, string> = {
    stocks: '📈',
    forex: '💱',
    futures: '📊',
    crypto: '₿',
    options: '📞'
  }

  // Search symbols
  const searchSymbols = async (query: string) => {
    if (!query) {
      setSearchResults([])
      return
    }
    try {
      const res = await axios.get(`${API_URL}/api/v1/alerts/symbols/search?query=${query}`)
      setSearchResults(res.data.results || [])
    } catch (error) {
      logger.error('Search error:', error)
    }
  }

  // Auto-map IB to TradingView
  useEffect(() => {
    const mapSymbol = async () => {
      if (!ibSymbol) {
        setTvSymbol('')
        return
      }
      try {
        const res = await axios.get(`${API_URL}/api/v1/alerts/symbols/map?ib_symbol=${ibSymbol}`)
        setTvSymbol(res.data.tradingview_symbol)
      } catch (error) {
          logger.error('Mapping error:', error)
        }
    }
    mapSymbol()
  }, [ibSymbol])

  // Generate webhook JSON
  useEffect(() => {
    if (entryPrice && stopLoss && takeProfit && quantity && tvSymbol && alertName) {
      const risk = Math.abs(parseFloat(entryPrice) - parseFloat(stopLoss)) * parseFloat(quantity)
      const reward = Math.abs(parseFloat(takeProfit) - parseFloat(entryPrice)) * parseFloat(quantity)
      const rrRatio = reward / risk || 0

      setWebhookJson({
        webhook_config: {
          name: alertName,
          instrument: {
            ib_symbol: ibSymbol,
            tradingview_symbol: tvSymbol,
            type: instrumentType,
          },
          price_levels: {
            entry: parseFloat(entryPrice),
            stop_loss: parseFloat(stopLoss),
            take_profit: parseFloat(takeProfit),
          },
          position_sizing: {
            quantity: parseFloat(quantity),
            risk_size: risk,
            risk_reward_ratio: Number(rrRatio.toFixed(2)),
          },
          metadata: {
            created_at: new Date().toISOString(),
          }
        }
      })
    }
  }, [entryPrice, stopLoss, takeProfit, quantity, tvSymbol, alertName, ibSymbol, instrumentType])

  const copyToClipboard = () => {
    if (webhookJson) {
      navigator.clipboard.writeText(JSON.stringify(webhookJson, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div style={{ padding: '24px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', minHeight: '100vh', color: '#fff', fontFamily: 'system-ui' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #334155', paddingBottom: '20px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, margin: '0 0 8px 0', color: '#f1f5f9' }}>🔔 Alerts Management</h1>
        <p style={{ fontSize: '14px', color: '#cbd5e1', margin: 0 }}>Create alerts & manage TradingView webhooks with auto symbol mapping</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #334155' }}>
        <button
          onClick={() => setActiveTab('manager')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'manager' ? '#3b82f6' : 'transparent',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            borderBottom: activeTab === 'manager' ? '2px solid #3b82f6' : 'none',
            fontSize: '14px',
            fontWeight: 600
          }}
        >
          📋 Alerts Manager
        </button>
        <button
          onClick={() => setActiveTab('builder')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'builder' ? '#3b82f6' : 'transparent',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            borderBottom: activeTab === 'builder' ? '2px solid #3b82f6' : 'none',
            fontSize: '14px',
            fontWeight: 600
          }}
        >
          ⚙️ TradingView Builder
        </button>
      </div>

      {/* Manager Tab */}
      {activeTab === 'manager' && (
        <div style={{ display: 'grid', gap: '24px' }}>
          {/* Statistics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px', textAlign: 'center', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>12</div>
              <div style={{ fontSize: '12px', color: '#cbd5e1' }}>Active Alerts</div>
            </div>
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px', textAlign: 'center', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#f59e0b' }}>45</div>
              <div style={{ fontSize: '12px', color: '#cbd5e1' }}>Triggered</div>
            </div>
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px', textAlign: 'center', borderLeft: '4px solid #ef4444' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>3</div>
              <div style={{ fontSize: '12px', color: '#cbd5e1' }}>Expired</div>
            </div>
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px', textAlign: 'center', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6' }}>78.5%</div>
              <div style={{ fontSize: '12px', color: '#cbd5e1' }}>Success Rate</div>
            </div>
          </div>

          {/* Active Alerts Table */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px', overflowX: 'auto' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' }}>📋 Active Alerts</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Alert</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Symbol (IB → TV)</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Entry</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>SL / TP</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>R:R</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '12px', color: '#e2e8f0' }}>AAPL Breakout</td>
                  <td style={{ padding: '12px', color: '#e2e8f0' }}>AAPL → AAPL</td>
                  <td style={{ padding: '12px', color: '#e2e8f0' }}>$150.25</td>
                  <td style={{ padding: '12px', color: '#e2e8f0' }}>$145 / $160</td>
                  <td style={{ padding: '12px', color: '#10b981', fontWeight: 600 }}>1:2</td>
                  <td style={{ padding: '12px' }}><span style={{ background: '#10b981', color: '#000', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>ACTIVE</span></td>
                </tr>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '12px', color: '#e2e8f0' }}>EUR Momentum</td>
                  <td style={{ padding: '12px', color: '#e2e8f0' }}>EUR.USD → EURUSD</td>
                  <td style={{ padding: '12px', color: '#e2e8f0' }}>1.0850</td>
                  <td style={{ padding: '12px', color: '#e2e8f0' }}>1.0800 / 1.0900</td>
                  <td style={{ padding: '12px', color: '#10b981', fontWeight: 600 }}>1:2</td>
                  <td style={{ padding: '12px' }}><span style={{ background: '#10b981', color: '#000', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>ACTIVE</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Builder Tab */}
      {activeTab === 'builder' && (
        <div style={{ display: 'grid', gap: '24px' }}>
          {/* Form */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' }}>⚙️ TradingView Webhook Builder</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              {/* Alert Name */}
              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Alert Name</label>
                <input
                  type="text"
                  value={alertName}
                  onChange={(e) => setAlertName(e.target.value)}
                  placeholder="e.g., AAPL Breakout"
                  style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Instrument Type */}
              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Instrument Type</label>
                <select
                  value={instrumentType}
                  onChange={(e) => setInstrumentType(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                >
                  <option value="stocks">📈 Stocks</option>
                  <option value="forex">💱 Forex</option>
                  <option value="futures">📊 Futures</option>
                  <option value="crypto">₿ Crypto</option>
                  <option value="options">📞 Options</option>
                </select>
              </div>

              {/* IB Symbol */}
              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, marginBottom: '4px', display: 'block' }}>IB Symbol</label>
                <input
                  type="text"
                  value={ibSymbol}
                  onChange={(e) => {
                    setIbSymbol(e.target.value.toUpperCase())
                    searchSymbols(e.target.value)
                  }}
                  placeholder={instrumentType === 'forex' ? 'EUR.USD' : 'AAPL'}
                  style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                />
                {searchResults.length > 0 && (
                  <div style={{ marginTop: '4px', background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', maxHeight: '100px', overflowY: 'auto' }}>
                    {searchResults.slice(0, 5).map((result, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setIbSymbol(result.ib_symbol)
                          setSearchResults([])
                        }}
                        style={{ padding: '6px 8px', cursor: 'pointer', fontSize: '12px', color: '#cbd5e1', borderBottom: '1px solid #334155' }}
                      >
                        {result.ib_symbol} → {result.tradingview_symbol}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* TV Symbol (Auto-filled) */}
              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, marginBottom: '4px', display: 'block' }}>TradingView Symbol</label>
                <input
                  type="text"
                  value={tvSymbol}
                  readOnly
                  placeholder="Auto-mapped"
                  style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #3b82f6', borderRadius: '8px', color: '#3b82f6', fontSize: '13px', boxSizing: 'border-box', fontWeight: 600 }}
                />
              </div>

              {/* Entry Price */}
              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Entry Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  placeholder="150.25"
                  style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Stop Loss */}
              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Stop Loss</label>
                <input
                  type="number"
                  step="0.01"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  placeholder="145.00"
                  style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Take Profit */}
              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Take Profit</label>
                <input
                  type="number"
                  step="0.01"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  placeholder="160.00"
                  style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Quantity */}
              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Quantity</label>
                <input
                  type="number"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="100"
                  style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* JSON Preview */}
          {webhookJson && (
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>📋 JSON Payload</h3>
                <button
                  onClick={copyToClipboard}
                  style={{
                    padding: '8px 16px',
                    background: copied ? '#10b981' : '#3b82f6',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                >
                  {copied ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>
              <pre style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '12px',
                overflow: 'auto',
                fontSize: '11px',
                color: '#cbd5e1',
                fontFamily: 'monospace',
                maxHeight: '300px'
              }}>
                {JSON.stringify(webhookJson, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}