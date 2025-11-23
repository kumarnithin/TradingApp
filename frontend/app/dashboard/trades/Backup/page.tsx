'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import axios from 'axios'
import logger from '../../../utils/logger'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface TradeData {
  id: string
  account_id: string
  symbol: string
  action: string
  entry_price: number
  exit_price?: number
  quantity: number
  trade_type: string
  status: string
  profit_loss?: number
  win_percentage?: number
  commission?: number
  notes?: string
  entry_at?: string
  exit_at?: string
  created_at?: string
}

interface StatsData {
  total_trades: number
  open_trades: number
  closed_trades: number
  win_rate: number
  total_profit: number
  total_loss: number
  best_trade: number
  worst_trade: number
  average_win: number
  average_loss: number
}

interface AccountData {
  id: string
  account_name: string
  account_type: string
}

export default function TradesPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const selectedAccountId = searchParams.get('account_id')

  const [trades, setTrades] = useState<TradeData[]>([])
  const [accounts, setAccounts] = useState<AccountData[]>([])
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'view' | 'create' | 'edit'>('view')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [symbolFilter, setSymbolFilter] = useState<string>('')

  const [formData, setFormData] = useState({
    account_id: selectedAccountId || '',
    symbol: '',
    action: 'BUY',
    entry_price: '',
    quantity: '',
    trade_type: 'Market',
    commission: '',
    notes: '',
  })

  const [editFormData, setEditFormData] = useState({
    exit_price: '',
    status: '',
    notes: '',
    commission: '',
  })

  // Fetch accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/v1/accounts/list`)
        if (res.data.accounts) {
          setAccounts(res.data.accounts)
        }
      } catch (e) {
        logger.error('Error fetching accounts:', e)
      }
    }
    fetchAccounts()
  }, [])

  // Fetch trades
  const fetchTrades = async () => {
    try {
      setLoading(true)
      let url = `${API_URL}/api/v1/trades/list`
      const params = new URLSearchParams()

      if (selectedAccountId) {
        params.append('account_id', selectedAccountId)
      }
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (symbolFilter) {
        params.append('symbol', symbolFilter)
      }

      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const res = await axios.get(url)
      if (res.data.trades) {
        setTrades(res.data.trades)
      }
      setError(null)
    } catch (e) {
      logger.error('Error fetching trades:', e)
      setError('Failed to fetch trades')
      setTrades([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch stats
  const fetchStats = async () => {
    if (!selectedAccountId) return

    try {
      const res = await axios.get(`${API_URL}/api/v1/trades/stats/${selectedAccountId}`)
      if (res.data.stats) {
        setStats(res.data.stats)
      }
    } catch (e) {
      logger.error('Error fetching stats:', e)
    }
  }

  useEffect(() => {
    fetchTrades()
    fetchStats()
  }, [selectedAccountId, statusFilter, symbolFilter])

  // Create trade
  const handleCreateTrade = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.account_id || !formData.symbol || !formData.entry_price || !formData.quantity) {
      setError('Please fill all required fields')
      return
    }

    try {
      const payload = {
        account_id: formData.account_id,
        symbol: formData.symbol.toUpperCase(),
        action: formData.action,
        entry_price: parseFloat(formData.entry_price),
        quantity: parseInt(formData.quantity),
        trade_type: formData.trade_type,
        commission: formData.commission ? parseFloat(formData.commission) : 0,
        notes: formData.notes,
      }

      await axios.post(`${API_URL}/api/v1/trades/create`, payload)
      setError(null)
      setFormData({
        account_id: selectedAccountId || '',
        symbol: '',
        action: 'BUY',
        entry_price: '',
        quantity: '',
        trade_type: 'Market',
        commission: '',
        notes: '',
      })
      setActiveTab('view')
      await fetchTrades()
      await fetchStats()
    } catch (e: unknown {
      setError(e.response?.data?.detail || 'Failed to create trade')
    }
  }

  // Update trade
  const handleUpdateTrade = async (e: React.FormEvent, tradeId: string) => {
    e.preventDefault()

    try {
      const payload = {
        exit_price: editFormData.exit_price ? parseFloat(editFormData.exit_price) : undefined,
        status: editFormData.status || undefined,
        notes: editFormData.notes || undefined,
        commission: editFormData.commission ? parseFloat(editFormData.commission) : undefined,
      }

      await axios.put(`${API_URL}/api/v1/trades/${tradeId}`, payload)
      setError(null)
      setEditingId(null)
      setActiveTab('view')
      await fetchTrades()
      await fetchStats()
    } catch (e: unknown {
      setError(e.response?.data?.detail || 'Failed to update trade')
    }
  }

  // Delete trade
  const handleDeleteTrade = async (tradeId: string) => {
    if (!confirm('Delete this trade?')) return

    try {
      await axios.delete(`${API_URL}/api/v1/trades/${tradeId}`)
      setError(null)
      await fetchTrades()
      await fetchStats()
    } catch (e: unknown {
      setError(e.response?.data?.detail || 'Failed to delete trade')
    }
  }

  // Start editing
  const handleEditClick = (trade: TradeData) => {
    setEditingId(trade.id)
    setEditFormData({
      exit_price: trade.exit_price?.toString() || '',
      status: trade.status,
      notes: trade.notes || '',
      commission: trade.commission?.toString() || '',
    })
    setActiveTab('edit')
  }

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'OPEN':
        return '#3b82f6'
      case 'CLOSED':
        return '#10b981'
      case 'PENDING':
        return '#f59e0b'
      default:
        return '#6b7280'
    }
  }

  const getPnLColor = (pnl?: number) => {
    if (!pnl) return '#6b7280'
    return pnl > 0 ? '#10b981' : '#ef4444'
  }

  const clearFilter = () => {
    router.push('/dashboard/trades')
  }

  return (
    <div style={{ padding: '24px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', minHeight: '100vh', color: '#fff', fontFamily: 'system-ui' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #334155', paddingBottom: '20px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 8px 0', color: '#f1f5f9' }}>Trade Management</h1>
        <p style={{ fontSize: '14px', color: '#cbd5e1', margin: 0 }}>Track and manage your trades</p>
      </div>

      {/* Filter Banner */}
      {selectedAccountId && (
        <div style={{ background: '#1e40af', border: '1px solid #3b82f6', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#bfdbfe' }}>
            ðŸ” Filtered by account
          </div>
          <button 
            onClick={clearFilter}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#bfdbfe', padding: '6px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: '#7f1d1d', border: '1px solid #dc2626', borderRadius: '8px', padding: '16px', color: '#fca5a5', marginBottom: '24px' }}>
          âš ï¸ {error}
        </div>
      )}

      {/* Stats Grid (if account selected) */}
      {selectedAccountId && stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>TOTAL</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#f1f5f9' }}>{stats.total_trades}</div>
          </div>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>WIN RATE</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>{stats.win_rate}%</div>
          </div>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>PROFIT</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>${stats.total_profit}</div>
          </div>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>AVG WIN</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>${stats.average_win}</div>
          </div>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>OPEN</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#3b82f6' }}>{stats.open_trades}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
        <button onClick={() => setActiveTab('view')} style={{ background: activeTab === 'view' ? '#3b82f6' : 'transparent', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '5px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
          ðŸ“‹ Trades ({trades.length})
        </button>
        <button onClick={() => { setActiveTab('create'); setFormData({ ...formData, account_id: selectedAccountId || '' }); }} style={{ background: activeTab === 'create' ? '#3b82f6' : 'transparent', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '5px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
          âž• New Trade
        </button>
      </div>

      {/* VIEW TAB */}
      {activeTab === 'view' && (
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', color: '#fff', cursor: 'pointer' }}
            >
              <option value="all">All Status</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
              <option value="PENDING">Pending</option>
            </select>

            <input 
              type="text"
              placeholder="Filter by symbol..."
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value)}
              style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', color: '#fff', fontSize: '14px' }}
            />
          </div>

          {loading ? (
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '40px', textAlign: 'center' }}>Loading...</div>
          ) : trades.length === 0 ? (
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '16px', marginBottom: '8px' }}>No trades found</div>
              <div style={{ fontSize: '12px', color: '#cbd5e1' }}>Create a new trade to get started</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>SYMBOL</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>ACTION</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>QTY</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>ENTRY</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>EXIT</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>P&L</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>WIN %</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>STATUS</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map(trade => (
                    <tr key={trade.id} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '12px', fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>{trade.symbol}</td>
                      <td style={{ padding: '12px', fontSize: '14px', fontWeight: 600, color: trade.action === 'BUY' ? '#10b981' : '#ef4444' }}>{trade.action}</td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#cbd5e1' }}>{trade.quantity}</td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#cbd5e1' }}>${trade.entry_price}</td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#cbd5e1' }}>${trade.exit_price || '-'}</td>
                      <td style={{ padding: '12px', fontSize: '14px', fontWeight: 600, color: getPnLColor(trade.profit_loss) }}>${trade.profit_loss?.toFixed(2) || '-'}</td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#cbd5e1' }}>{trade.win_percentage?.toFixed(2) || '-'}%</td>
                      <td style={{ padding: '12px' }}><span style={{ padding: '4px 8px', background: getStatusColor(trade.status), color: '#fff', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>{trade.status}</span></td>
                      <td style={{ padding: '12px', display: 'flex', gap: '4px' }}>
                        <button onClick={() => handleEditClick(trade)} style={{ background: '#3b82f6', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' }}>Edit</button>
                        <button onClick={() => handleDeleteTrade(trade.id)} style={{ background: '#ef4444', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CREATE TAB */}
      {activeTab === 'create' && (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '24px', maxWidth: '600px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' }}>âž• New Trade</h2>
          <form onSubmit={handleCreateTrade}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>Account *</label>
              <select value={formData.account_id} onChange={(e) => setFormData({ ...formData, account_id: e.target.value })} style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', color: '#fff', fontSize: '14px' }}>
                <option value="">Select Account</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.account_name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>Symbol *</label>
              <input type="text" value={formData.symbol} onChange={(e) => setFormData({ ...formData, symbol: e.target.value })} placeholder="e.g., AAPL" style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', color: '#fff', fontSize: '14px' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>Action *</label>
                <select value={formData.action} onChange={(e) => setFormData({ ...formData, action: e.target.value })} style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', color: '#fff', fontSize: '14px' }}>
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>Type</label>
                <select value={formData.trade_type} onChange={(e) => setFormData({ ...formData, trade_type: e.target.value })} style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', color: '#fff', fontSize: '14px' }}>
                  <option value="Market">Market</option>
                  <option value="Limit">Limit</option>
                  <option value="Stop">Stop</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>Entry Price *</label>
                <input type="number" step="0.01" value={formData.entry_price} onChange={(e) => setFormData({ ...formData, entry_price: e.target.value })} placeholder="0.00" style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', color: '#fff', fontSize: '14px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>Quantity *</label>
                <input type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} placeholder="0" style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', color: '#fff', fontSize: '14px' }} />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>Commission</label>
              <input type="number" step="0.01" value={formData.commission} onChange={(e) => setFormData({ ...formData, commission: e.target.value })} placeholder="0.00" style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', color: '#fff', fontSize: '14px' }} />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>Notes</label>
              <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Add notes..." style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', color: '#fff', fontSize: '14px', minHeight: '80px' }} />
            </div>

            <button type="submit" style={{ width: '100%', padding: '10px', background: '#3b82f6', border: 'none', color: '#fff', borderRadius: '5px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
              Create Trade
            </button>
          </form>
        </div>
      )}

      {/* EDIT TAB */}
      {activeTab === 'edit' && editingId && (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '24px', maxWidth: '600px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' }}>âœï¸ Update Trade</h2>
          <form onSubmit={(e) => handleUpdateTrade(e, editingId)}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>Exit Price</label>
              <input type="number" step="0.01" value={editFormData.exit_price} onChange={(e) => setEditFormData({ ...editFormData, exit_price: e.target.value })} placeholder="0.00" style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', color: '#fff', fontSize: '14px' }} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>Status</label>
              <select value={editFormData.status} onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })} style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', color: '#fff', fontSize: '14px' }}>
                <option value="">Select Status</option>
                <option value="OPEN">OPEN</option>
                <option value="CLOSED">CLOSED</option>
                <option value="PENDING">PENDING</option>
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>Notes</label>
              <textarea value={editFormData.notes} onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })} placeholder="Add notes..." style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', color: '#fff', fontSize: '14px', minHeight: '80px' }} />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" style={{ flex: 1, padding: '10px', background: '#3b82f6', border: 'none', color: '#fff', borderRadius: '5px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                Update Trade
              </button>
              <button type="button" onClick={() => { setEditingId(null); setActiveTab('view'); }} style={{ flex: 1, padding: '10px', background: '#6b7280', border: 'none', color: '#fff', borderRadius: '5px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
