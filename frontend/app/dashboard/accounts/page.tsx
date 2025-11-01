'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { Trash2, Settings, Plug, Power, Plus } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Account {
  id: string
  account_name: string
  account_type: string
  account_balance: number
  available_balance: number
  status: string
  is_active: boolean
}

interface PortfolioSummary {
  total_balance: number
  total_pnl: number
  total_accounts: number
  accounts: Account[]
}

export default function AccountsDashboard() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newAccountName, setNewAccountName] = useState('')
  const [newAccountType, setNewAccountType] = useState('DEMO')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/accounts/summary/all`)
      if (response.data?.accounts) {
        setSummary(response.data)
        setAccounts(response.data.accounts)
      }
      setError(null)
    } catch (err: any) {
      console.error('Error loading accounts:', err)
      setError('Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) {
      alert('Please enter account name')
      return
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/v1/accounts/create?account_name=${newAccountName}&account_type=${newAccountType}`
      )
      if (response.data?.status === 'success') {
        setNewAccountName('')
        setShowCreateModal(false)
        loadData()
      }
    } catch (err: any) {
      alert(`Error: ${err.response?.data?.detail || err.message}`)
    }
  }

  const handleDeleteAccount = async (accountId: string, accountName: string) => {
    if (window.confirm(`Are you sure you want to delete account "${accountName}"?`)) {
      try {
        await axios.delete(`${API_URL}/api/v1/accounts/${accountId}`)
        loadData()
      } catch (err: any) {
        alert(`Error: ${err.response?.data?.detail || err.message}`)
      }
    }
  }

  const handleConnectAccount = async (accountId: string) => {
    try {
      await axios.post(`${API_URL}/api/v1/accounts/${accountId}/connect?account_balance=50000`)
      loadData()
    } catch (err: any) {
      alert(`Error: ${err.response?.data?.detail || err.message}`)
    }
  }

  const handleDisconnectAccount = async (accountId: string) => {
    try {
      await axios.post(`${API_URL}/api/v1/accounts/${accountId}/disconnect`)
      loadData()
    } catch (err: any) {
      alert(`Error: ${err.response?.data?.detail || err.message}`)
    }
  }

  const getStatusColor = (status: string) => {
    return status === 'CONNECTED' ? '#10b981' : '#ef4444'
  }

  const getStatusText = (status: string) => {
    return status === 'CONNECTED' ? '🟢 Connected' : '🔴 Disconnected'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-600">Loading accounts...</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937' }}>
          📊 Multi-Account Overview
        </h1>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>
          Manage and monitor all your trading accounts
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
          ⚠️ {error}
        </div>
      )}

      {/* Portfolio Summary */}
      {summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          {/* Total Balance */}
          <div
            style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '1.5rem',
              borderLeft: '4px solid #3b82f6',
            }}
          >
            <div style={{ fontSize: '0.9rem', color: '#666' }}>Total Portfolio Value</div>
            <div
              style={{
                fontSize: '1.8rem',
                fontWeight: 'bold',
                color: '#3b82f6',
                marginTop: '0.5rem',
              }}
            >
              ${(summary.total_balance || 0).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>

          {/* Total P&L */}
          <div
            style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '1.5rem',
              borderLeft: `4px solid ${summary.total_pnl >= 0 ? '#10b981' : '#ef4444'}`,
            }}
          >
            <div style={{ fontSize: '0.9rem', color: '#666' }}>Total P&L</div>
            <div
              style={{
                fontSize: '1.8rem',
                fontWeight: 'bold',
                color: summary.total_pnl >= 0 ? '#10b981' : '#ef4444',
                marginTop: '0.5rem',
              }}
            >
              {summary.total_pnl >= 0 ? '+' : ''}{(summary.total_pnl || 0).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>

          {/* Total Accounts */}
          <div
            style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '1.5rem',
              borderLeft: '4px solid #8b5cf6',
            }}
          >
            <div style={{ fontSize: '0.9rem', color: '#666' }}>Active Accounts</div>
            <div
              style={{
                fontSize: '1.8rem',
                fontWeight: 'bold',
                color: '#8b5cf6',
                marginTop: '0.5rem',
              }}
            >
              {summary.total_accounts || 0}
            </div>
          </div>
        </div>
      )}

      {/* Accounts Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {accounts.map((account) => (
          <div
            key={account.id}
            style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1f2937' }}>
                  🏢 {account.account_name}
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                  {account.account_type}
                </p>
              </div>
              <div
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  background: account.status === 'CONNECTED' ? '#d1fae5' : '#fee2e2',
                  color: account.status === 'CONNECTED' ? '#065f46' : '#7f1d1d',
                }}
              >
                {getStatusText(account.status)}
              </div>
            </div>

            {/* Balance */}
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f3f4f6' }}>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>Balance</div>
              <div
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: '#1f2937',
                  marginTop: '0.25rem',
                }}
              >
                ${(account.account_balance || 0).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>

            {/* Available Balance */}
            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>Available</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1f2937' }}>
                ${(account.available_balance || 0).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>

            {/* Actions */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem',
                marginTop: '1.5rem',
              }}
            >
              {account.status === 'CONNECTED' ? (
                <button
                  onClick={() => handleDisconnectAccount(account.id)}
                  style={{
                    padding: '0.5rem',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <Power size={14} /> Disconnect
                </button>
              ) : (
                <button
                  onClick={() => handleConnectAccount(account.id)}
                  style={{
                    padding: '0.5rem',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <Plug size={14} /> Connect
                </button>
              )}
              <button
                onClick={() => handleDeleteAccount(account.id, account.account_name)}
                style={{
                  padding: '0.5rem',
                  background: '#f3f4f6',
                  color: '#7f1d1d',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.25rem',
                }}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        ))}

        {/* Add New Account Card */}
        <div
          onClick={() => setShowCreateModal(true)}
          style={{
            background: '#dbeafe',
            border: '2px dashed #93c5fd',
            borderRadius: '8px',
            padding: '1.5rem',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '250px',
            transition: 'all 0.3s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#bfdbfe'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#dbeafe'
          }}
        >
          <Plus size={40} color="#1e40af" />
          <h3 style={{ marginTop: '1rem', fontSize: '1.1rem', fontWeight: 'bold', color: '#1e40af' }}>
            Add Account
          </h3>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#1e40af' }}>
            Create a new trading account
          </p>
        </div>
      </div>

      {/* Create Account Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '8px',
              padding: '2rem',
              maxWidth: '400px',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>
              Create New Account
            </h2>

            <div style={{ marginTop: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Account Name
              </label>
              <input
                type="text"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                placeholder="e.g., Demo, Live01, Live02"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                  color: '#1f2937',
                }}
              />
            </div>

            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Account Type
              </label>
              <select
                value={newAccountType}
                onChange={(e) => setNewAccountType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                  color: '#1f2937',
                }}
              >
                <option value="DEMO">Demo</option>
                <option value="LIVE">Live</option>
              </select>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginTop: '2rem',
              }}
            >
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  padding: '0.75rem',
                  background: '#f3f4f6',
                  color: '#1f2937',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAccount}
                style={{
                  padding: '0.75rem',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}