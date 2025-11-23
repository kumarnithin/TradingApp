'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import axios from 'axios'
import logger from '../../../utils/logger'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface SignalData {
  id: string
  account_id: string
  symbol: string
  action: string  // BUY, SELL
  quantity: number
  strategy_id?: string
  strategy?: string
  status: string  // PENDING, FILLED, CANCELLED
  entry_price?: number
  profit_loss?: number
  created_at?: string
  filled_at?: string
}

interface AccountData {
  id: string
  account_name: string
  account_type: string
}

export default function SignalsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const selectedAccountId = searchParams.get('account_id')

  const [signals, setSignals] = useState<SignalData[]>([])
  const [accounts, setAccounts] = useState<AccountData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'view' | 'create'>('view')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [symbolFilter, setSymbolFilter] = useState<string>('')

  const [formData, setFormData] = useState({
    account_id: selectedAccountId || '',
    symbol: '',
    action: 'BUY',
    quantity: '',
    strategy_id: '',
    strategy: '',
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

  // Fetch signals
  const fetchSignals = async () => {
    try {
      setLoading(true)
      let url = `${API_URL}/api/v1/signals/list`
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
      if (res.data.signals) {
        setSignals(res.data.signals)
      }
      setError(null)
    } catch (e) {
      logger.error('Error fetching signals:', e)
      setError('Failed to fetch signals')
      setSignals([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSignals()
  }, [selectedAccountId, statusFilter, symbolFilter])

  // Create signal
  const handleCreateSignal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.account_id || !formData.symbol || !formData.quantity) {
      setError('Please fill all required fields')
      return
    }

    try {
      const payload = {
        account_id: formData.account_id,
        symbol: formData.symbol.toUpperCase(),
        action: formData.action,
        quantity: parseInt(formData.quantity),
        strategy_id: formData.strategy_id,
        strategy: formData.strategy,
      }

      await axios.post(`${API_URL}/api/v1/signals/create`, payload)
      setError(null)
      setFormData({
        account_id: selectedAccountId || '',
        symbol: '',
        action: 'BUY',
        quantity: '',
        strategy_id: '',
        strategy: '',
      })
      setActiveTab('view')
      await fetchSignals()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to create signal')
    }
  }

  // Mark as filled
  const handleMarkFilled = async (signalId: string) => {
    try {
      await axios.put(`${API_URL}/api/v1/signals/${signalId}`, { status: 'FILLED' })
      setError(null)
      await fetchSignals()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to update signal')
    }
  }

  // Cancel signal
  const handleCancelSignal = async (signalId: string) => {
    if (!confirm('Cancel this signal?')) return

    try {
      await axios.delete(`${API_URL}/api/v1/signals/${signalId}`)
      setError(null)
      await fetchSignals()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to cancel signal')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return '#f59e0b'
      case 'FILLED':
        return '#10b981'
      case 'CANCELLED':
        return '#ef4444'
      default:
        return '#6b7280'
    }
  }

  const getActionColor = (action: string) => {
    return action === 'BUY' ? '#10b981' : '#ef4444'
  }

  const clearFilter = () => {
    router.push('/dashboard/signals')
  }

  return (
    <div style={{ padding: '24px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', minHeight: '100vh', color: '#fff', fontFamily: 'system-ui' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #334155', paddingBottom: '20px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 8px 0', color: '#f1f5f9' }}>Trading Signals</h1>
        <p style={{ fontSize: '14px', color: '#cbd5e1', margin: 0 }}>TradingView signals and strategy execution</p>
      </div>

      {/* Filter Banner */}
      {selectedAccountId && (
        <div style={{ background: '#1e40af', border: '1px solid #3b82f6', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#bfdbfe' }}>
            🔍 Filtered by account
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
          ⚠️ {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
        <button onClick={() => setActiveTab('view')} style={{ background: activeTab === 'view' ? '#3b82f6' : 'transparent', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '5px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
          📡 Signals ({signals.length})
        </button>
        <button onClick={() => { setActiveTab('create'); setFormData({ ...formData, account_id: selectedAccountId || '' }); }} style={{ background: activeTab === 'create' ? '#3b82f6' : 'transparent', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '5px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
          ➕ New Signal
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
              <option value="PENDING">Pending</option>
              <option value="FILLED">Filled</option>
              <option value="CANCELLED">Cancelled</option>
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
          ) : signals.length === 0 ? (
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '16px', marginBottom: '8px' }}>No signals found</div>
              <div style={{ fontSize: '12px', color: '#cbd5e1' }}>Create a new signal to get started</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>SYMBOL</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>ACTION</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>QTY</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>STRATEGY</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>STATUS</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>CREATED</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {signals.map(signal => (
                    <tr key={signal.id} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '12px', fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>{signal.symbol}</td>
                      <td style={{ padding: '12px', fontSize: '14px', fontWeight: 600, color: getActionColor(signal.action) }}>{signal.action}</td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#cbd5e1' }}>{signal.quantity}</td>
                      <td style={{ padding: '12px', fontSize: '12px', color: '#cbd5e1' }}>{signal.strategy || signal.strategy_id || '-'}</td>
                      <td style={{ padding: '12px' }}><span style={{ padding: '4px 8px', background: getStatusColor(signal.status), color: '#fff', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>{signal.status}</span></td>
                      <td style={{ padding: '12px', fontSize: '12px', color: '#cbd5e1' }}>{signal.created_at ? new Date(signal.created_at).toLocaleDateString() : '-'}</td>
                      <td style={{ padding: '12px', display: 'flex', gap: '4px' }}>
                        {signal.status === 'PENDING' && (
                          <button onClick={() => handleMarkFilled(signal.id)} style={{ background: '#10b981', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' }}>Fill</button>
                        )}
                        <button onClick={() => handleCancelSignal(signal.id)} style={{ background: '#ef4444', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' }}>Cancel</button>
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
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' }}>➕ New Signal</h2>
          <form onSubmit={handleCreateSignal}>
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
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>Quantity *</label>
                <input type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} placeholder="0" style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', color: '#fff', fontSize: '14px' }} />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>Strategy</label>
              <input type="text" value={formData.strategy} onChange={(e) => setFormData({ ...formData, strategy: e.target.value })} placeholder="e.g., Bollinger Bands" style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', color: '#fff', fontSize: '14px' }} />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>Strategy ID</label>
              <input type="text" value={formData.strategy_id} onChange={(e) => setFormData({ ...formData, strategy_id: e.target.value })} placeholder="e.g., strat-001" style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', color: '#fff', fontSize: '14px' }} />
            </div>

            <button type="submit" style={{ width: '100%', padding: '10px', background: '#3b82f6', border: 'none', color: '#fff', borderRadius: '5px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
              Create Signal
            </button>
          </form>
        </div>
      )}
    </div>
  )
}