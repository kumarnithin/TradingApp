'use client'

import { useState } from 'react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function AdvancedToolsPage() {
  const [activeTab, setActiveTab] = useState<'optimize' | 'calendar' | 'correlation' | 'volatility' | 'sessions'>('optimize')
  
  // Optimization State
  const [optWr, setOptWr] = useState('55')
  const [optAvgW, setOptAvgW] = useState('650')
  const [optAvgL, setOptAvgL] = useState('500')
  const [optTrades, setOptTrades] = useState('50')
  const [optPf, setOptPf] = useState('1.3')
  const [optResult, setOptResult] = useState<any>(null)
  
  // Calendar State
  const [calendarResult, setCalendarResult] = useState<any>(null)
  
  // Correlation State
  const [corrSymbols, setCorrSymbols] = useState('EUR/USD,GBP/USD,USD/JPY')
  const [corrResult, setCorrResult] = useState<any>(null)
  
  // Volatility State
  const [volResult, setVolResult] = useState<any>(null)
  
  // Sessions State
  const [sessionsResult, setSessionsResult] = useState<any>(null)

  const optimizeStrategy = async () => {
    try {
      const res = await axios.post(`${API_URL}/api/v1/advanced-tools/optimize-strategy`, null, {
        params: {
          win_rate: parseFloat(optWr),
          avg_win: parseFloat(optAvgW),
          avg_loss: parseFloat(optAvgL),
          total_trades: parseInt(optTrades),
          profit_factor: parseFloat(optPf),
        }
      })
      setOptResult(res.data.optimization)
    } catch (error) {
      console.error('Optimization error:', error)
    }
  }

  const getCalendar = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/v1/advanced-tools/economic-calendar`)
      setCalendarResult(res.data.calendar)
    } catch (error) {
      console.error('Calendar error:', error)
    }
  }

  const getCorrelation = async () => {
    try {
      const symbols = corrSymbols.split(',').map(s => s.trim())
      const params = new URLSearchParams()
      symbols.forEach(s => params.append('symbols', s))
      
      const res = await axios.post(`${API_URL}/api/v1/advanced-tools/correlation-matrix?${params}`)
      setCorrResult(res.data.correlation)
    } catch (error) {
      console.error('Correlation error:', error)
    }
  }

  const getVolatility = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/v1/advanced-tools/market-conditions`)
      setVolResult(res.data.market)
    } catch (error) {
      console.error('Volatility error:', error)
    }
  }

  const getSessions = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/v1/advanced-tools/trading-sessions`)
      setSessionsResult(res.data.sessions)
    } catch (error) {
      console.error('Sessions error:', error)
    }
  }

  return (
    <div style={{ padding: '24px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', minHeight: '100vh', color: '#fff', fontFamily: 'system-ui' }}>
      <div style={{ borderBottom: '1px solid #334155', paddingBottom: '20px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, margin: '0 0 8px 0', color: '#f1f5f9' }}>⚡ Advanced Trading Tools</h1>
        <p style={{ fontSize: '14px', color: '#cbd5e1', margin: 0 }}>AI-powered analysis & market intelligence</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #334155', overflowX: 'auto', paddingBottom: '12px' }}>
        {[
          { id: 'optimize', label: '⚙️ Optimize', icon: '⚙️' },
          { id: 'calendar', label: '📅 Calendar', icon: '📅' },
          { id: 'correlation', label: '🔗 Correlation', icon: '🔗' },
          { id: 'volatility', label: '🌡️ Volatility', icon: '🌡️' },
          { id: 'sessions', label: '⏰ Sessions', icon: '⏰' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
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

      {/* Optimization Tab */}
      {activeTab === 'optimize' && (
        <div style={{ display: 'grid', gap: '24px' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' }}>⚙️ Strategy Optimization Engine</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 600 }}>Win Rate %</label>
                <input type="number" value={optWr} onChange={(e) => setOptWr(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 600 }}>Avg Win</label>
                <input type="number" value={optAvgW} onChange={(e) => setOptAvgW(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 600 }}>Avg Loss</label>
                <input type="number" value={optAvgL} onChange={(e) => setOptAvgL(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 600 }}>Total Trades</label>
                <input type="number" value={optTrades} onChange={(e) => setOptTrades(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 600 }}>Profit Factor</label>
                <input type="number" value={optPf} onChange={(e) => setOptPf(e.target.value)} step="0.1" style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }} />
              </div>
            </div>

            <button onClick={optimizeStrategy} style={{ width: '100%', padding: '12px', background: '#3b82f6', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, marginBottom: '16px' }}>Analyze & Optimize</button>

            {optResult && (
              <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ color: '#f1f5f9', marginBottom: '12px' }}>🎯 Optimization Suggestions</h4>
                <div style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.6' }}>
                  <p><strong>Summary:</strong> {optResult.summary}</p>
                  <p><strong>Priority Areas:</strong> {optResult.priority_areas.join(', ')}</p>
                  <p><strong>Expected Improvement:</strong> +{optResult.expected_improvement}%</p>
                  {optResult.suggestions.slice(0, 3).map((sugg: any, idx: number) => (
                    <div key={idx} style={{ marginTop: '12px', padding: '10px', background: '#1e293b', borderRadius: '6px', borderLeft: '3px solid #3b82f6' }}>
                      <p><strong>{sugg.area}</strong> ({sugg.priority})</p>
                      <p>Current: {sugg.current} → Target: {sugg.target}</p>
                      <p style={{ fontSize: '12px', color: '#a1a5b1' }}>Action: {sugg.actions[0]}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <div style={{ display: 'grid', gap: '24px' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' }}>📅 Economic Calendar</h3>
            <button onClick={getCalendar} style={{ width: '100%', padding: '12px', background: '#3b82f6', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, marginBottom: '16px' }}>Load Events</button>

            {calendarResult && (
              <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px', maxHeight: '400px', overflowY: 'auto' }}>
                {calendarResult.events.slice(0, 5).map((event: any, idx: number) => (
                  <div key={idx} style={{ padding: '12px', borderBottom: idx < 4 ? '1px solid #334155' : 'none', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{event.event}</span>
                      <span style={{ 
                        padding: '2px 6px', 
                        borderRadius: '3px', 
                        fontSize: '10px', 
                        fontWeight: 600,
                        background: event.impact === 'CRITICAL' ? '#ef4444' : event.impact === 'HIGH' ? '#f59e0b' : '#10b981',
                        color: '#fff'
                      }}>
                        {event.impact}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#cbd5e1', margin: '4px 0' }}>{event.time} - {event.country}</p>
                    {event.previous && <p style={{ fontSize: '11px', color: '#94a3b8' }}>Previous: {event.previous} | Forecast: {event.forecast}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Correlation Tab */}
      {activeTab === 'correlation' && (
        <div style={{ display: 'grid', gap: '24px' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' }}>🔗 Correlation Matrix</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Symbols (comma separated)</label>
              <input 
                type="text" 
                value={corrSymbols} 
                onChange={(e) => setCorrSymbols(e.target.value)} 
                style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} 
                placeholder="EUR/USD,GBP/USD,USD/JPY"
              />
            </div>

            <button onClick={getCorrelation} style={{ width: '100%', padding: '12px', background: '#3b82f6', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, marginBottom: '16px' }}>Calculate Correlation</button>

            {corrResult && (
              <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ color: '#cbd5e1', marginBottom: '8px' }}>
                    <strong>Diversification Score:</strong> <span style={{ fontSize: '20px', fontWeight: 700, color: corrResult.diversification_score > 60 ? '#10b981' : '#f59e0b' }}>{corrResult.diversification_score}%</span>
                  </p>
                  <p style={{ fontSize: '12px', color: '#cbd5e1' }}>Portfolio Health: <strong>{corrResult.portfolio_health}</strong></p>
                </div>
                <p style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' }}>{corrResult.summary}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Volatility Tab */}
      {activeTab === 'volatility' && (
        <div style={{ display: 'grid', gap: '24px' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' }}>🌡️ Volatility Analysis</h3>
            <button onClick={getVolatility} style={{ width: '100%', padding: '12px', background: '#3b82f6', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, marginBottom: '16px' }}>Analyze Market</button>

            {volResult && (
              <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ color: '#f59e0b', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>🎯 Market Condition: {volResult.overall_condition}</p>
                  <p style={{ color: '#cbd5e1', fontSize: '12px' }}>Trading Style: {volResult.trading_style}</p>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ color: '#10b981', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>✓ Best Pairs: {volResult.best_pairs.join(', ')}</p>
                  <p style={{ color: '#ef4444', fontSize: '12px', fontWeight: 600 }}>✗ Avoid: {volResult.pairs_to_avoid.join(', ')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div style={{ display: 'grid', gap: '24px' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' }}>⏰ Trading Sessions</h3>
            <button onClick={getSessions} style={{ width: '100%', padding: '12px', background: '#3b82f6', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, marginBottom: '16px' }}>Load Sessions</button>

            {sessionsResult && (
              <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
                <div style={{ padding: '12px', background: '#1e293b', borderRadius: '6px', borderLeft: '3px solid #10b981', marginBottom: '12px' }}>
                  <p style={{ color: '#10b981', fontWeight: 600, margin: '0 0 4px 0' }}>🌟 {sessionsResult.best_session_name}</p>
                  <p style={{ color: '#cbd5e1', fontSize: '12px', margin: '0' }}>{sessionsResult.best_session_window}</p>
                </div>
                <p style={{ fontSize: '12px', color: '#cbd5e1' }}>{sessionsResult.recommendation}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}