
'use client'
import { useEffect, useState } from 'react'
import logger from '../../utils/logger'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import styles from './dashboard.module.css'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface AccountData {
  id: string
  account_name: string
  account_type: string
  status?: string
}

interface SignalData {
  id: string
  symbol: string
  strategy_id?: string
  quantity: number
  created_at?: string
}

interface TradeData {
  id: string
  symbol: string
  quantity: number
  profit_loss?: number
  status?: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<AccountData[]>([])
  const [signals, setSignals] = useState<SignalData[]>([])
  const [trades, setTrades] = useState<TradeData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all')

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch accounts
        try {
          const accountsRes = await axios.get(`${API_URL}/api/v1/accounts/list`)
          if (accountsRes.data.accounts) {
            setAccounts(accountsRes.data.accounts)
          }
        } catch (e) {
          logger.error('Error fetching accounts:', e)
        }

        // Fetch signals
        try {
          const signalsRes = await axios.get(`${API_URL}/api/v1/signals/list`)
          if (signalsRes.data.signals) {
            setSignals(signalsRes.data.signals.slice(0, 5)) // Last 5
          }
        } catch (e) {
          logger.error('Error fetching signals:', e)
        }

        // Fetch trades
        try {
          const tradesRes = await axios.get(`${API_URL}/api/v1/trades/list`)
          if (tradesRes.data.trades) {
            setTrades(tradesRes.data.trades.slice(0, 5)) // Last 5
          }
        } catch (e) {
                  logger.error('Error fetching trades:', e)
                }
              } finally {
                setLoading(false)
              }
            }

            fetchData()
          }, [])

          // ✅ KEY FIX: Handle account selection with proper navigation
          const handleAccountSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
            const value = e.target.value
            logger.debug('📍 Account selected:', value)

            if (value === 'all' || value === '') {
              // Show all accounts
              setSelectedAccountId('all')
              router.push('/dashboard/accounts')
            } else if (value === 'manage') {
              // Go to manage accounts (no filter)
              setSelectedAccountId('all')
              router.push('/dashboard/accounts')
            } else {
              // Filter to specific account
              setSelectedAccountId(value)
              logger.debug('🔗 Navigating to:', `/dashboard/accounts?account_id=${value}`)
              router.push(`/dashboard/accounts?account_id=${value}`)
            }
          }

          return (
            <div style={{ padding: '24px', minHeight: '100vh', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: '#fff' }}>
              {/* Header with Dropdown */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
                <div>
                  <h1 style={{ fontSize: '32px', fontWeight: 700, margin: '0 0 8px 0', color: '#f1f5f9' }}>Dashboard</h1>
                  <p style={{ fontSize: '14px', color: '#cbd5e1', margin: 0 }}>Real-time trading overview and analytics</p>
                </div>

                {/* ✅ ACCOUNT SELECTOR DROPDOWN - FIXED */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1' }}>Select Account:</label>
                  <select 
                    value={selectedAccountId}
                    onChange={handleAccountSelect}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #3b82f6',
                      background: '#0f172a',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                      minWidth: '200px'
                    }}
                  >
                    <option value="all">📊 All Accounts</option>
                    <option disabled>─────────────</option>
            
                    {/* Account options */}
                    {accounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.account_name} ({account.account_type})
                        {account.status === 'connected' ? ' 🟢' : ''}
                      </option>
                    ))}

                    <option disabled>─────────────</option>
                    <option value="manage">🔧 Manage Accounts</option>
                  </select>
                </div>
              </div>

              {/* Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
                {/* Total Accounts */}
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginBottom: '8px' }}>TOTAL ACCOUNTS</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#3b82f6' }}>{accounts.length}</div>
                </div>

                {/* Active Accounts */}
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginBottom: '8px' }}>CONNECTED</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#10b981' }}>
                    {accounts.filter(a => a.status === 'connected').length}
                  </div>
                </div>

                {/* Recent Signals */}
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginBottom: '8px' }}>RECENT SIGNALS</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#f59e0b' }}>{signals.length}</div>
                </div>

                {/* Recent Trades */}
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginBottom: '8px' }}>RECENT TRADES</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#8b5cf6' }}>{trades.length}</div>
                </div>
              </div>

              {/* Main Content Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Recent Signals */}
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '20px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>📡 Recent Signals</span>
                    <button 
                      onClick={() => router.push('/dashboard/signals')}
                      style={{ fontSize: '12px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                      View All →
                    </button>
                  </div>

                  {loading ? (
                    <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Loading signals...</div>
                  ) : signals.length === 0 ? (
                    <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>No signals yet</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {signals.map(signal => (
                        <div key={signal.id} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>{signal.symbol}</div>
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{signal.quantity} shares</div>
                          </div>
                          <div style={{ fontSize: '12px', color: '#cbd5e1' }}>Strategy ID: {signal.strategy_id || '-'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Trades */}
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '20px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>💰 Recent Trades</span>
                    <button 
                      onClick={() => router.push('/dashboard/trades')}
                      style={{ fontSize: '12px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                      View All →
                    </button>
                  </div>

                  {loading ? (
                    <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Loading trades...</div>
                  ) : trades.length === 0 ? (
                    <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>No trades yet</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {trades.map(trade => (
                        <div key={trade.id} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>{trade.symbol}</div>
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{trade.quantity} shares</div>
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: trade.profit_loss && trade.profit_loss >= 0 ? '#10b981' : '#ef4444' }}>
                            {trade.profit_loss ? `$${trade.profit_loss.toFixed(2)}` : '-'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Accounts Overview */}
              <div style={{ marginTop: '24px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '20px' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>📊 Accounts Overview</span>
                  <button 
                    onClick={() => router.push('/dashboard/accounts')}
                    style={{ fontSize: '12px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Manage All →
                  </button>
                </div>

                {loading ? (
                  <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Loading accounts...</div>
                ) : accounts.length === 0 ? (
                  <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
                    <p>No accounts found. <button onClick={() => router.push('/dashboard/accounts')} style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Create one</button></p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                    {accounts.map(account => (
                      <div key={account.id} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>{account.account_name}</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>Type: {account.account_type?.toUpperCase() || 'N/A'}</div>
                        <div style={{ fontSize: '12px', color: account.status === 'connected' ? '#10b981' : '#f59e0b' }}>
                          Status: {account.status === 'connected' ? '🟢 Connected' : account.status === 'created' ? '🟡 Created' : '⚪ Disconnected'}
                        </div>
                        <button
                          onClick={() => router.push(`/dashboard/accounts?account_id=${account.id}`)}
                          style={{ marginTop: '8px', padding: '6px 12px', background: '#3b82f6', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                        >
                          View Details
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        }
