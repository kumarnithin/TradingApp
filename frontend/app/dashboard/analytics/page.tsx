'use client'

import { useEffect, useState } from 'react'

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(false)
  }, [])

  // Mock data
  const accounts = [
    { id: '1', account_name: 'Main Account', buying_power: 250000, account_balance: 125000, unrealized_pnl: 2300 }
  ]

  const tradeStats = {
    total_trades: 45,
    winning_trades: 32,
    losing_trades: 13,
    total_pnl: 12450.75,
    win_rate: 71.1,
    avg_win: 650.25,
    avg_loss: -425.50,
    profit_factor: 3.2,
    largest_win: 2850.00,
    largest_loss: -1200.00,
  }

  const signalStats = {
    total_signals: 128,
    pending: 12,
    filled: 98,
    cancelled: 18,
    average_confidence: 78.5,
  }

  const dailyPnL = [
    { date: 'Mon', pnl: 450, trades: 3 },
    { date: 'Tue', pnl: -150, trades: 2 },
    { date: 'Wed', pnl: 1200, trades: 5 },
    { date: 'Thu', pnl: 850, trades: 4 },
    { date: 'Fri', pnl: 2100, trades: 6 },
    { date: 'Mon', pnl: 600, trades: 3 },
    { date: 'Tue', pnl: 3200, trades: 5 },
  ]

  const symbolDistribution = [
    { symbol: 'AAPL', trades: 12, pnl: 2450 },
    { symbol: 'MSFT', trades: 10, pnl: 1850 },
    { symbol: 'GOOGL', trades: 8, pnl: 3200 },
    { symbol: 'TSLA', trades: 9, pnl: -450 },
    { symbol: 'NVDA', trades: 6, pnl: 5000 },
  ]

  const equityCurve = [
    { day: 1, equity: 100000 },
    { day: 2, equity: 100450 },
    { day: 3, equity: 100300 },
    { day: 4, equity: 101500 },
    { day: 5, equity: 102350 },
    { day: 6, equity: 102950 },
    { day: 7, equity: 106150 },
  ]

  // SAFE helper functions - NO .map() inside
  const getDailyMaxVal = () => {
    let max = 0
    for (let i = 0; i < dailyPnL.length; i++) {
      const val = Math.abs(dailyPnL[i]?.pnl || 0)
      if (val > max) max = val
    }
    return Math.max(max, 1)
  }

  const getSymbolMaxPnl = () => {
    let max = 0
    for (let i = 0; i < symbolDistribution.length; i++) {
      const val = Math.abs(symbolDistribution[i]?.pnl || 0)
      if (val > max) max = val
    }
    return Math.max(max, 1)
  }

  const getEquityMinMax = () => {
    let min = 100000
    let max = 100000
    for (let i = 0; i < equityCurve.length; i++) {
      const val = equityCurve[i]?.equity || 100000
      if (val < min) min = val
      if (val > max) max = val
    }
    return { min, max }
  }

  const dailyMaxVal = getDailyMaxVal()
  const symbolMaxPnl = getSymbolMaxPnl()
  const { min: minEquity, max: maxEquity } = getEquityMinMax()
  const equityRange = Math.max(maxEquity - minEquity, 1)

  const selectedAccount = '1'

  return (
    <div style={{ padding: '24px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', minHeight: '100vh', color: '#fff', fontFamily: 'system-ui' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #334155', paddingBottom: '20px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, margin: '0 0 8px 0', color: '#f1f5f9' }}>📊 Trading Analytics</h1>
        <p style={{ fontSize: '14px', color: '#cbd5e1', margin: 0 }}>Real-time performance metrics and insights</p>
      </div>

      {/* KPI Cards Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Total PnL */}
        <div style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', border: '1px solid #10b981', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '12px', color: '#d1fae5', marginBottom: '8px', fontWeight: 600 }}>TOTAL PnL</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#ecfdf5', marginBottom: '8px' }}>
            ${(tradeStats.total_pnl).toFixed(2)}
          </div>
          <div style={{ fontSize: '11px', color: '#a7f3d0' }}>📈 From {tradeStats.total_trades} trades</div>
        </div>

        {/* Win Rate */}
        <div style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', border: '1px solid #3b82f6', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '12px', color: '#dbeafe', marginBottom: '8px', fontWeight: 600 }}>WIN RATE</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#eff6ff', marginBottom: '8px' }}>
            {(tradeStats.win_rate).toFixed(1)}%
          </div>
          <div style={{ fontSize: '11px', color: '#93c5fd' }}>✅ {tradeStats.winning_trades} wins / {tradeStats.losing_trades} losses</div>
        </div>

        {/* Profit Factor */}
        <div style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', border: '1px solid #a855f7', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '12px', color: '#ede9fe', marginBottom: '8px', fontWeight: 600 }}>PROFIT FACTOR</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#f3e8ff', marginBottom: '8px' }}>
            {(tradeStats.profit_factor).toFixed(2)}x
          </div>
          <div style={{ fontSize: '11px', color: '#d8b4fe' }}>💰 Risk/Reward Ratio</div>
        </div>

        {/* Signal Confidence */}
        <div style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', border: '1px solid #ef4444', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '12px', color: '#fee2e2', marginBottom: '8px', fontWeight: 600 }}>AVG CONFIDENCE</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#fef2f2', marginBottom: '8px' }}>
            {(signalStats.average_confidence).toFixed(1)}%
          </div>
          <div style={{ fontSize: '11px', color: '#fca5a5' }}>🎯 Signal Quality</div>
        </div>
      </div>

      {/* KPI Cards Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Avg Win */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '8px', fontWeight: 600 }}>AVG WIN</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>
            ${(tradeStats.avg_win).toFixed(2)}
          </div>
        </div>

        {/* Avg Loss */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '8px', fontWeight: 600 }}>AVG LOSS</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>
            ${(tradeStats.avg_loss).toFixed(2)}
          </div>
        </div>

        {/* Largest Win */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '8px', fontWeight: 600 }}>LARGEST WIN</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>
            ${(tradeStats.largest_win).toFixed(2)}
          </div>
        </div>

        {/* Largest Loss */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '8px', fontWeight: 600 }}>LARGEST LOSS</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>
            ${(tradeStats.largest_loss).toFixed(2)}
          </div>
        </div>

        {/* Total Signals */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '8px', fontWeight: 600 }}>TOTAL SIGNALS</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#f59e0b' }}>
            {signalStats.total_signals}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{signalStats.filled} filled • {signalStats.pending} pending</div>
        </div>

        {/* Filled Rate */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '8px', fontWeight: 600 }}>FILL RATE</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>
            {signalStats.total_signals > 0 ? ((signalStats.filled / signalStats.total_signals) * 100).toFixed(1) : 0}%
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Daily PnL Chart */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' }}>📈 Daily P&L</h3>
          <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '8px', justifyContent: 'space-around' }}>
            {dailyPnL.length > 0 && dailyPnL.map((item, idx) => {
              const height = (Math.abs(item.pnl) / dailyMaxVal) * 150
              const color = item.pnl >= 0 ? '#10b981' : '#ef4444'
              return (
                <div key={`daily-${idx}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{ height: `${Math.max(height, 5)}px`, width: '30px', background: color, borderRadius: '4px', opacity: 0.8 }} />
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.date}</div>
                  <div style={{ fontSize: '10px', color: color, fontWeight: 600 }}>${item.pnl}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Symbol Distribution */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' }}>🎯 Symbol Performance</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {symbolDistribution.length > 0 && symbolDistribution.map((sym, idx) => {
              const width = (Math.abs(sym.pnl) / symbolMaxPnl) * 100
              const color = sym.pnl >= 0 ? '#10b981' : '#ef4444'
              return (
                <div key={`symbol-${idx}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1' }}>{sym.symbol}</div>
                    <div style={{ fontSize: '12px', color: color, fontWeight: 600 }}>
                      ${sym.pnl.toFixed(0)} ({sym.trades} trades)
                    </div>
                  </div>
                  <div style={{ height: '6px', background: '#0f172a', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.max(width, 2)}%`, background: color, borderRadius: '3px' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Equity Curve */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px', gridColumn: '1 / -1' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' }}>📊 Equity Curve</h3>
          <div style={{ height: '250px', display: 'flex', alignItems: 'flex-end', gap: '12px', justifyContent: 'space-around', paddingTop: '20px' }}>
            {equityCurve.length > 0 && equityCurve.map((item, idx) => {
              const height = equityRange > 0 ? ((item.equity - minEquity) / equityRange) * 200 : 100
              const prevEquity = idx > 0 ? equityCurve[idx - 1].equity : item.equity
              const trend = item.equity >= prevEquity ? '#10b981' : '#ef4444'
              return (
                <div key={`equity-${idx}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '4px' }}>
                  <div style={{ fontSize: '10px', color: '#94a3b8', height: '16px' }}>${(item.equity / 1000).toFixed(0)}k</div>
                  <div style={{ flex: 1, width: '100%', background: '#0f172a', borderRadius: '4px', position: 'relative', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
                    <div style={{ height: `${Math.max(height, 5)}px`, width: '100%', background: trend, opacity: 0.7, borderRadius: '2px' }} />
                  </div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>Day {item.day}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Win/Loss Ratio */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' }}>✅ Win/Loss Distribution</h3>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', padding: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', fontWeight: 700, color: '#10b981' }}>
                {tradeStats.winning_trades}
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1' }}>Wins</div>
            </div>
            <div style={{ fontSize: '20px', color: '#64748b' }}>vs</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', fontWeight: 700, color: '#ef4444' }}>
                {tradeStats.losing_trades}
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1' }}>Losses</div>
            </div>
          </div>
          <div style={{ width: '100%', height: '12px', background: '#0f172a', borderRadius: '6px', overflow: 'hidden', marginTop: '16px' }}>
            <div style={{ height: '100%', width: `${tradeStats.win_rate}%`, background: 'linear-gradient(90deg, #10b981 0%, #3b82f6 100%)' }} />
          </div>
        </div>

        {/* Signal Status */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' }}>📡 Signal Status</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', textAlign: 'center', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>{signalStats.filled}</div>
              <div style={{ fontSize: '11px', color: '#cbd5e1' }}>Filled</div>
            </div>
            <div style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', textAlign: 'center', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b' }}>{signalStats.pending}</div>
              <div style={{ fontSize: '11px', color: '#cbd5e1' }}>Pending</div>
            </div>
            <div style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', textAlign: 'center', borderLeft: '4px solid #ef4444', gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#ef4444' }}>{signalStats.cancelled}</div>
              <div style={{ fontSize: '11px', color: '#cbd5e1' }}>Cancelled</div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Summary Cards */}
      {accounts.length > 0 && (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' }}>💼 Account Snapshot</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
            {accounts.map(acc => (
              <div key={acc.id} style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', borderLeft: selectedAccount === acc.id ? '4px solid #3b82f6' : '4px solid #334155' }}>
                <div style={{ fontSize: '11px', color: '#cbd5e1', marginBottom: '4px' }}>{acc.account_name}</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#10b981', marginBottom: '4px' }}>${(acc.account_balance / 1000).toFixed(1)}k</div>
                <div style={{ fontSize: '10px', color: acc.unrealized_pnl >= 0 ? '#10b981' : '#ef4444' }}>
                  {acc.unrealized_pnl >= 0 ? '+' : ''}{acc.unrealized_pnl.toFixed(0)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}