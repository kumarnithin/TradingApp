'use client'

import { useState } from 'react'
import axios from 'axios'
import logger from '../../../utils/logger'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState<'position' | 'riskReward' | 'drawdown' | 'kelly' | 'optimize' | 'calendar' | 'correlation' | 'volatility'>('position')
  
  // Position Size State
  const [posBalance, setPosBalance] = useState('100000')
  const [posRiskPercent, setPosRiskPercent] = useState('2')
  const [posEntry, setPosEntry] = useState('150.25')
  const [posSL, setPosSL] = useState('145.00')
  const [posType, setPosType] = useState('stocks')
  const [posResult, setPosResult] = useState<unknown>(null)
  
  // Risk/Reward State
  const [rrEntry, setRrEntry] = useState('150.25')
  const [rrSL, setRrSL] = useState('145.00')
  const [rrTP, setRrTP] = useState('160.00')
  const [rrQty, setRrQty] = useState('100')
  const [rrResult, setRrResult] = useState<unknown>(null)
  
  // Drawdown State
  const [ddPeak, setDdPeak] = useState('125000')
  const [ddCurrent, setDdCurrent] = useState('115000')
  const [ddResult, setDdResult] = useState<unknown>(null)
  
  // Kelly State
  const [kellyWr, setKellyWr] = useState('55')
  const [kellyAvgW, setKellyAvgW] = useState('650')
  const [kellyAvgL, setKellyAvgL] = useState('500')
  const [kellyResult, setKellyResult] = useState<unknown>(null)

  const calculatePosition = async () => {
    try {
      const res = await axios.post(`${API_URL}/api/v1/tools/position-size`, null, {
        params: {
          account_balance: parseFloat(posBalance),
          risk_percent: parseFloat(posRiskPercent),
          entry_price: parseFloat(posEntry),
          stop_loss: parseFloat(posSL),
          instrument_type: posType,
        }
      })
      setPosResult(res.data.calculation)
    } catch (error) {
      logger.error('Position calc error:', error)
    }
  }

  const calculateRiskReward = async () => {
    try {
      const res = await axios.post(`${API_URL}/api/v1/tools/risk-reward`, null, {
        params: {
          entry_price: parseFloat(rrEntry),
          stop_loss: parseFloat(rrSL),
          take_profit: parseFloat(rrTP),
          quantity: parseFloat(rrQty),
        }
      })
      setRrResult(res.data.analysis)
    } catch (error) {
      logger.error('Risk/Reward error:', error)
    }
  }

  const calculateDrawdown = async () => {
    try {
      const res = await axios.post(`${API_URL}/api/v1/tools/drawdown`, null, {
        params: {
          peak_equity: parseFloat(ddPeak),
          current_equity: parseFloat(ddCurrent),
        }
      })
      setDdResult(res.data.drawdown_metrics)
    } catch (error) {
      logger.error('Drawdown error:', error)
    }
  }

  const calculateKelly = async () => {
    try {
      const res = await axios.post(`${API_URL}/api/v1/tools/kelly-criterion`, null, {
        params: {
          win_rate: parseFloat(kellyWr),
          avg_win: parseFloat(kellyAvgW),
          avg_loss: parseFloat(kellyAvgL),
        }
      })
      setKellyResult(res.data.kelly)
    } catch (error) {
      logger.error('Kelly error:', error)
    }
  }

  return (
    <div style={{ padding: '24px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', minHeight: '100vh', color: '#fff', fontFamily: 'system-ui' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #334155', paddingBottom: '20px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, margin: '0 0 8px 0', color: '#f1f5f9' }}>🛠️ Trading Tools Hub</h1>
        <p style={{ fontSize: '14px', color: '#cbd5e1', margin: 0 }}>Professional calculators for traders</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #334155', overflowX: 'auto', paddingBottom: '12px' }}>
        {[
          { id: 'position', label: '📊 Position Size', icon: '📊' },
          { id: 'riskReward', label: '💰 Risk/Reward', icon: '💰' },
          { id: 'drawdown', label: '📉 Drawdown', icon: '📉' },
          { id: 'kelly', label: '🎲 Kelly %', icon: '🎲' },
          { id: 'optimize', label: '⚡ Optimize', icon: '⚡' },
          { id: 'calendar', label: '📅 Calendar', icon: '📅' },
          { id: 'correlation', label: '🔗 Correlation', icon: '🔗' },
          { id: 'volatility', label: '🌡️ Volatility', icon: '🌡️' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'position' | 'riskReward' | 'drawdown' | 'kelly' | 'optimize' | 'calendar' | 'correlation' | 'volatility')}
            style={{
              padding: '10px 16px',
              background: activeTab === tab.id ? '#3b82f6' : 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : 'none',
              fontSize: '12px',
              fontWeight: 600,
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Position Size Tab */}
      {activeTab === 'position' && (
        <div style={{ display: 'grid', gap: '24px' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' }}>📊 Position Size Calculator</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Account Balance</label>
                <input type="number" value={posBalance} onChange={(e) => setPosBalance(e.target.value)} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Risk %</label>
                <input type="number" value={posRiskPercent} onChange={(e) => setPosRiskPercent(e.target.value)} step="0.1" style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Entry Price</label>
                <input type="number" value={posEntry} onChange={(e) => setPosEntry(e.target.value)} step="0.01" style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Stop Loss</label>
                <input type="number" value={posSL} onChange={(e) => setPosSL(e.target.value)} step="0.01" style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Instrument Type</label>
                <select value={posType} onChange={(e) => setPosType(e.target.value)} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}>
                  <option value="stocks">Stocks</option>
                  <option value="forex">Forex</option>
                  <option value="futures">Futures</option>
                  <option value="crypto">Crypto</option>
                  <option value="options">Options</option>
                </select>
              </div>
            </div>

            <button onClick={calculatePosition} style={{ width: '100%', padding: '12px', background: '#3b82f6', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, marginBottom: '16px' }}>Calculate</button>

            {posResult && (
              <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div><span style={{ color: '#cbd5e1', fontSize: '12px' }}>Position Size:</span><br/><span style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>{posResult.shares || posResult.position_size}</span></div>
                  <div><span style={{ color: '#cbd5e1', fontSize: '12px' }}>Risk Amount:</span><br/><span style={{ fontSize: '20px', fontWeight: 700, color: '#ef4444' }}>${posResult.actual_risk}</span></div>
                  <div><span style={{ color: '#cbd5e1', fontSize: '12px' }}>Risk %:</span><br/><span style={{ fontSize: '18px', fontWeight: 700, color: '#f59e0b' }}>{posResult.risk_percent}%</span></div>
                  <div><span style={{ color: '#cbd5e1', fontSize: '12px' }}>Status:</span><br/><span style={{ fontSize: '14px', color: posResult.valid ? '#10b981' : '#ef4444', fontWeight: 600 }}>{posResult.message}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Risk/Reward Tab */}
      {activeTab === 'riskReward' && (
        <div style={{ display: 'grid', gap: '24px' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' }}>💰 Risk & Reward Analyzer</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Entry Price</label>
                <input type="number" value={rrEntry} onChange={(e) => setRrEntry(e.target.value)} step="0.01" style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Stop Loss</label>
                <input type="number" value={rrSL} onChange={(e) => setRrSL(e.target.value)} step="0.01" style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Take Profit</label>
                <input type="number" value={rrTP} onChange={(e) => setRrTP(e.target.value)} step="0.01" style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Quantity</label>
                <input type="number" value={rrQty} onChange={(e) => setRrQty(e.target.value)} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
            </div>

            <button onClick={calculateRiskReward} style={{ width: '100%', padding: '12px', background: '#3b82f6', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, marginBottom: '16px' }}>Calculate</button>

            {rrResult && (
              <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div><span style={{ color: '#cbd5e1', fontSize: '12px' }}>Risk/Reward:</span><br/><span style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>{rrResult.rr_ratio_text}</span></div>
                  <div><span style={{ color: '#cbd5e1', fontSize: '12px' }}>Win Rate Needed:</span><br/><span style={{ fontSize: '18px', fontWeight: 700, color: '#f59e0b' }}>{rrResult.win_rate_needed}%</span></div>
                  <div><span style={{ color: '#cbd5e1', fontSize: '12px' }}>Net Risk:</span><br/><span style={{ fontSize: '18px', fontWeight: 700, color: '#ef4444' }}>${rrResult.net_risk}</span></div>
                  <div><span style={{ color: '#cbd5e1', fontSize: '12px' }}>Net Reward:</span><br/><span style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>${rrResult.net_reward}</span></div>
                  <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#cbd5e1', fontSize: '12px' }}>Expected Value (50% WR):</span><br/><span style={{ fontSize: '18px', fontWeight: 700, color: '#3b82f6' }}>${rrResult.expected_value}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Drawdown Tab */}
      {activeTab === 'drawdown' && (
        <div style={{ display: 'grid', gap: '24px' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' }}>📉 Drawdown Tracker</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Peak Equity</label>
                <input type="number" value={ddPeak} onChange={(e) => setDdPeak(e.target.value)} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Current Equity</label>
                <input type="number" value={ddCurrent} onChange={(e) => setDdCurrent(e.target.value)} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
            </div>

            <button onClick={calculateDrawdown} style={{ width: '100%', padding: '12px', background: '#3b82f6', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, marginBottom: '16px' }}>Calculate</button>

            {ddResult && (
              <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div><span style={{ color: '#cbd5e1', fontSize: '12px' }}>Current Drawdown:</span><br/><span style={{ fontSize: '20px', fontWeight: 700, color: '#ef4444' }}>{ddResult.current_drawdown_percent}%</span></div>
                  <div><span style={{ color: '#cbd5e1', fontSize: '12px' }}>Max Historical DD:</span><br/><span style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b' }}>{ddResult.max_historical_drawdown}%</span></div>
                  <div><span style={{ color: '#cbd5e1', fontSize: '12px' }}>Recovery Needed:</span><br/><span style={{ fontSize: '18px', fontWeight: 700, color: '#3b82f6' }}>${ddResult.recovery_needed_amount}</span></div>
                  <div><span style={{ color: '#cbd5e1', fontSize: '12px' }}>Status:</span><br/><span style={{ fontSize: '16px', fontWeight: 700 }}>{ddResult.status}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Kelly Tab */}
      {activeTab === 'kelly' && (
        <div style={{ display: 'grid', gap: '24px' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' }}>🎲 Kelly Criterion</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Win Rate %</label>
                <input type="number" value={kellyWr} onChange={(e) => setKellyWr(e.target.value)} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Avg Win</label>
                <input type="number" value={kellyAvgW} onChange={(e) => setKellyAvgW(e.target.value)} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Avg Loss</label>
                <input type="number" value={kellyAvgL} onChange={(e) => setKellyAvgL(e.target.value)} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
            </div>

            <button onClick={calculateKelly} style={{ width: '100%', padding: '12px', background: '#3b82f6', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, marginBottom: '16px' }}>Calculate</button>

            {kellyResult && (
              <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                  <div><span style={{ color: '#cbd5e1', fontSize: '12px' }}>Kelly %:</span><br/><span style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>{kellyResult.kelly_percent}%</span></div>
                  <div><span style={{ color: '#cbd5e1', fontSize: '12px' }}>Safe Kelly (Half):</span><br/><span style={{ fontSize: '20px', fontWeight: 700, color: '#3b82f6' }}>{kellyResult.practical_kelly}%</span></div>
                  <div style={{ padding: '12px', background: '#1e293b', borderRadius: '6px' }}>
                    <span style={{ color: '#f59e0b', fontSize: '13px', fontWeight: 600 }}>📌 Recommendation: {kellyResult.recommendation}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Placeholder for other tabs */}
      {['optimize', 'calendar', 'correlation', 'volatility'].includes(activeTab) && (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
          <p style={{ fontSize: '16px', color: '#cbd5e1' }}>✨ {activeTab.toUpperCase()} Tab - Coming Soon</p>
          <p style={{ fontSize: '13px', color: '#94a3b8' }}>Advanced features being loaded...</p>
        </div>
      )}
    </div>
  )
}