'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import axios from 'axios'
import logger from '../../../../utils/logger'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface AccountData {
  id?: string
  account_name: string
  account_type: 'demo' | 'live'
  ib_account_number?: string
  broker_name?: string
  account_balance?: number
  available_balance?: number
  buying_power?: number
  currency?: string
  is_default?: boolean
  is_active?: boolean
  status?: string
  connected_at?: string
  created_at?: string
}

export default function AccountsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // âœ… FIX: Get filter from URL
  const selectedAccountId = searchParams.get('account_id')
  logger.debug('ðŸ” Filter Debug:', { selectedAccountId, urlParams: searchParams.toString() })
  
  const [accounts, setAccounts] = useState<AccountData[]>([])
  const [connectedAccount, setConnectedAccount] = useState<AccountData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'view' | 'create'>('view')
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state for both create and edit
  const [formData, setFormData] = useState({
    account_name: '',
    account_type: 'demo' as const,
    ib_account_number: '',
    broker_name: 'Interactive Brokers',
    account_balance: '',
    currency: 'USD',
  })
  const [formSubmitting, setFormSubmitting] = useState(false)

  // Fetch accounts
  const fetchAccounts = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${API_URL}/api/v1/accounts/list`)
      if (res.data.accounts) {
        setAccounts(res.data.accounts)
        logger.info('âœ… Accounts fetched: %s', res.data.accounts.length)
      }
      setError(null)
    } catch (e) {
      logger.error('âŒ Error fetching accounts:', e)
      setError('Failed to fetch accounts')
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch connected account
  const fetchConnectedAccount = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/v1/accounts/current`)
      if (res.data.status === 'connected' && res.data.account) {
        setConnectedAccount(res.data.account)
      } else {
        setConnectedAccount(null)
      }
    } catch (e) {
      logger.error('Error fetching connected account:', e)
      setConnectedAccount(null)
    }
  }

  useEffect(() => {
    fetchAccounts()
    fetchConnectedAccount()
    
    const interval = setInterval(fetchConnectedAccount, 10000)
    return () => clearInterval(interval)
  }, [])

  // âœ… FIX: Compute filtered accounts - THIS IS THE CRITICAL PART
  const filteredAccounts = selectedAccountId
    ? accounts.filter(acc => {
        const matches = acc.id === selectedAccountId
        logger.debug(`Checking account ${acc.id}: ${matches ? 'âœ… MATCH' : 'âŒ NO MATCH'} (looking for ${selectedAccountId})`)
        return matches
      })
    : accounts

  logger.debug('ðŸ“Š Display Debug: %o', {
    selectedAccountId,
    totalAccounts: accounts.length,
    filteredCount: filteredAccounts.length,
    accountIds: accounts.map(a => a.id),
    filteredAccountIds: filteredAccounts.map(a => a.id)
  })

  // Create account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.account_name.trim()) {
      setError('Account name is required')
      return
    }

    try {
      setFormSubmitting(true)
      const payload = {
        account_name: formData.account_name,
        account_type: formData.account_type,
        ib_account_number: formData.ib_account_number || undefined,
        broker_name: formData.broker_name,
        account_balance: formData.account_balance ? parseFloat(formData.account_balance) : undefined,
        currency: formData.currency,
      }

      await axios.post(`${API_URL}/api/v1/accounts/create`, payload)
      
      setError(null)
      setFormData({
        account_name: '',
        account_type: 'demo',
        ib_account_number: '',
        broker_name: 'Interactive Brokers',
        account_balance: '',
        currency: 'USD',
      })
      setActiveTab('view')
      await fetchAccounts()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to create account')
    } finally {
      setFormSubmitting(false)
    }
  }

  // Start editing
  const handleEditClick = (account: AccountData) => {
    setEditingId(account.id || null)
    setFormData({
      account_name: account.account_name,
      account_type: account.account_type,
      ib_account_number: account.ib_account_number || '',
      broker_name: account.broker_name || 'Interactive Brokers',
      account_balance: account.account_balance?.toString() || '',
      currency: account.currency || 'USD',
    })
    setActiveTab('create')
  }

  // Update account
  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return

    try {
      setFormSubmitting(true)
      const payload = {
        account_name: formData.account_name,
        account_type: formData.account_type,
        ib_account_number: formData.ib_account_number || undefined,
        broker_name: formData.broker_name,
        account_balance: formData.account_balance ? parseFloat(formData.account_balance) : undefined,
        currency: formData.currency,
      }

      await axios.put(`${API_URL}/api/v1/accounts/${editingId}`, payload)
      
      setError(null)
      setEditingId(null)
      setFormData({
        account_name: '',
        account_type: 'demo',
        ib_account_number: '',
        broker_name: 'Interactive Brokers',
        account_balance: '',
        currency: 'USD',
      })
      setActiveTab('view')
      await fetchAccounts()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to update account')
    } finally {
      setFormSubmitting(false)
    }
  }

  // Delete account
  const handleDeleteAccount = async (accountId: string, accountName: string) => {
    if (!confirm(`Delete account "${accountName}"? This cannot be undone.`)) return

    try {
      await axios.delete(`${API_URL}/api/v1/accounts/${accountId}`)
      setError(null)
      if (selectedAccountId === accountId) {
        router.push('/dashboard/accounts')
      }
      await fetchAccounts()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to delete account')
    }
  }

  // Get status badge
  const getStatusBadge = (status: string, accountName?: string) => {
    const isConnected = connectedAccount?.account_name === accountName
    
    if (isConnected) {
      return { text: 'ðŸŸ¢ Connected', color: '#10b981' }
    } else if (status === 'connected') {
      return { text: 'ðŸŸ¡ Was Connected', color: '#f59e0b' }
    } else {
      return { text: 'âšª Not Connected', color: '#6b7280' }
    }
  }

  // Clear filter button
  const clearFilter = () => {
    logger.debug('ðŸ”„ Clearing filter...')
    router.push('/dashboard/accounts')
  }

  return (
    <div style={{ padding: '24px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', minHeight: '100vh', color: '#fff', fontFamily: 'system-ui' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #334155', paddingBottom: '20px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 8px 0', color: '#f1f5f9' }}>Account Management</h1>
        <p style={{ fontSize: '14px', color: '#cbd5e1', margin: 0 }}>Manage your trading and IB accounts</p>
      </div>

      {/* Filter Info Banner */}
      {selectedAccountId && (
        <div style={{ background: '#1e40af', border: '1px solid #3b82f6', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#bfdbfe' }}>
            ðŸ” Filtered View: Showing only selected account
          </div>
          <button 
            onClick={clearFilter}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#bfdbfe', padding: '6px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* Connected Account Status */}
      {connectedAccount && (
        <div style={{ background: '#10b981', border: '1px solid #059669', borderRadius: '8px', padding: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>âœ… Currently Connected</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginTop: '4px' }}>
              Account: <strong>{connectedAccount.account_name}</strong> ({connectedAccount.account_type?.toUpperCase()})
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={fetchConnectedAccount} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
              Refresh
            </button>
            <button onClick={() => axios.delete(`${API_URL}/api/v1/accounts/current`).then(fetchConnectedAccount)} style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
              Disconnect
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: '#7f1d1d', border: '1px solid #dc2626', borderRadius: '8px', padding: '16px', color: '#fca5a5', marginBottom: '24px' }}>
          âš ï¸ {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
        <button onClick={() => setActiveTab('view')} style={{ background: activeTab === 'view' ? '#3b82f6' : 'transparent', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '5px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
          ðŸ“‹ View Accounts ({filteredAccounts.length} {selectedAccountId ? 'selected' : 'total'})
        </button>
        <button onClick={() => { setActiveTab('create'); setEditingId(null); setFormData({ account_name: '', account_type: 'demo', ib_account_number: '', broker_name: 'Interactive Brokers', account_balance: '', currency: 'USD' }); }} style={{ background: activeTab === 'create' ? '#3b82f6' : 'transparent', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '5px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
          âž• {editingId ? 'Edit' : 'Create'} Account
        </button>
      </div>

      {/* VIEW TAB */}
      {activeTab === 'view' && (
        <div>
          {loading ? (
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '40px', textAlign: 'center' }}>
              <div>Loading accounts...</div>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '16px', marginBottom: '8px' }}>
                {selectedAccountId ? 'No matching account found' : 'No accounts found'}
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                {selectedAccountId ? 'Try clearing the filter' : 'Create one to get started'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {filteredAccounts.map((account) => {
                const statusBadge = getStatusBadge(account.status || '', account.account_name)
                const isConnected = connectedAccount?.account_name === account.account_name

                return (
                  <div key={account.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '16px', alignItems: 'center' }}>
                    {/* Name & Type */}
                    <div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>ACCOUNT NAME</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9' }}>{account.account_name}</div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: account.account_type === 'demo' ? '#06b6d4' : '#ef4444', marginTop: '8px', textTransform: 'uppercase' }}>
                        {account.account_type === 'demo' ? 'ðŸ“Š Demo' : 'âš ï¸ Live'}
                      </div>
                    </div>

                    {/* Details */}
                    <div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>IB ACCOUNT</div>
                      <div style={{ fontSize: '14px', color: '#cbd5e1', marginBottom: '8px' }}>{account.ib_account_number || '-'}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>BALANCE</div>
                      <div style={{ fontSize: '14px', color: '#10b981', fontWeight: 600 }}>
                        {account.account_balance ? `${account.currency || 'USD'} ${account.account_balance.toLocaleString()}` : '-'}
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginBottom: '8px' }}>STATUS</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: statusBadge.color, padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: '5px', textAlign: 'center' }}>
                        {statusBadge.text}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleEditClick(account)}
                        style={{ background: '#3b82f6', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                      >
                        âœï¸ Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteAccount(account.id || '', account.account_name)}
                        style={{ background: '#ef4444', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                      >
                        ðŸ—‘ï¸ Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* CREATE/EDIT TAB */}
      {activeTab === 'create' && (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '24px', maxWidth: '600px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' }}>
            {editingId ? 'âœï¸ Edit Account' : 'âž• Create New Account'}
          </h2>

          <form onSubmit={editingId ? handleUpdateAccount : handleCreateAccount}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>Account Name *</label>
              <input type="text" value={formData.account_name} onChange={(e) => setFormData({ ...formData, account_name: e.target.value })} placeholder="e.g., My Trading Account" style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', color: '#fff', fontSize: '14px' }} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>Account Type *</label>
              <select value={formData.account_type} onChange={(e) => setFormData({ ...formData, account_type: e.target.value as any })} style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', color: '#fff', fontSize: '14px' }}>
                <option value="demo">ðŸ“Š Demo (Paper Trading)</option>
                <option value="live">âš ï¸ Live (Real Money)</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>IB Account Number</label>
              <input type="text" value={formData.ib_account_number} onChange={(e) => setFormData({ ...formData, ib_account_number: e.target.value })} placeholder="e.g., DU123456" style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', color: '#fff', fontSize: '14px' }} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>Broker Name</label>
              <input type="text" value={formData.broker_name} onChange={(e) => setFormData({ ...formData, broker_name: e.target.value })} placeholder="e.g., Interactive Brokers" style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', color: '#fff', fontSize: '14px' }} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>Account Balance</label>
              <input type="number" value={formData.account_balance} onChange={(e) => setFormData({ ...formData, account_balance: e.target.value })} placeholder="e.g., 100000" style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', color: '#fff', fontSize: '14px' }} />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>Currency</label>
              <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', color: '#fff', fontSize: '14px' }}>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="JPY">JPY - Japanese Yen</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" disabled={formSubmitting} style={{ flex: 1, padding: '10px', background: '#3b82f6', border: 'none', color: '#fff', borderRadius: '5px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, opacity: formSubmitting ? 0.6 : 1 }}>
                {formSubmitting ? 'Saving...' : editingId ? 'Update Account' : 'Create Account'}
              </button>
              {editingId && (
                <button 
                  type="button"
                  onClick={() => { setEditingId(null); setActiveTab('view'); }}
                  style={{ flex: 1, padding: '10px', background: '#6b7280', border: 'none', color: '#fff', borderRadius: '5px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
