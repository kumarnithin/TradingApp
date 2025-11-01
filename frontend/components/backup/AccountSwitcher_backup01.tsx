'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Account {
  id: string
  account_name: string
  account_type: string
  account_balance: number
  status: string
  is_active: boolean
}

export default function AccountSwitcher() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load accounts on mount
  useEffect(() => {
    loadAccounts()
    loadCurrentAccount()
  }, [])

  const loadAccounts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/accounts/list`)
      if (response.data?.accounts) {
        setAccounts(response.data.accounts)
      }
      setLoading(false)
    } catch (error) {
      console.error('Error loading accounts:', error)
      setLoading(false)
    }
  }

  const loadCurrentAccount = () => {
    try {
      const saved = localStorage.getItem('currentAccountId')
      if (saved && accounts.length > 0) {
        const account = accounts.find(a => a.id === saved)
        if (account) {
          setCurrentAccount(account)
          return
        }
      }
      // Default to first account
      if (accounts.length > 0) {
        setCurrentAccount(accounts[0])
        localStorage.setItem('currentAccountId', accounts[0].id)
      }
    } catch (error) {
      console.error('Error loading current account:', error)
    }
  }

  const handleSwitchAccount = (account: Account) => {
    setCurrentAccount(account)
    localStorage.setItem('currentAccountId', account.id)
    setIsOpen(false)
    // Trigger reload of page data
    window.dispatchEvent(new CustomEvent('accountChanged', { detail: account }))
  }

  const getStatusText = (status: string) => {
    return status === 'CONNECTED' ? '🟢' : '🔴'
  }

  if (loading) {
    return (
      <div
        style={{
          width: '360px',
          height: '60px',
          background: '#1e293b',
          borderRadius: '12px',
          animation: 'pulse 2s infinite',
        }}
      />
    )
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block', width: '360px' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '1rem',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          border: '2px solid #334155',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          fontSize: '1.1rem',
          fontWeight: '600',
          color: '#e2e8f0',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#64748b'
          e.currentTarget.style.background = 'linear-gradient(135deg, #334155 0%, #1e293b 100%)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#334155'
          e.currentTarget.style.background = 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🏢</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#f1f5f9' }}>
              {currentAccount?.account_name || 'Select Account'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              {getStatusText(currentAccount?.status || 'DISCONNECTED')} {currentAccount?.status}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#60a5fa' }}>
              💰 ${(currentAccount?.account_balance || 0).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
          <span style={{ fontSize: '1.3rem', transition: 'transform 0.3s' }}>
            {isOpen ? '▲' : '▼'}
          </span>
        </div>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            marginTop: '0.75rem',
            width: '100%',
            background: '#1e293b',
            border: '2px solid #334155',
            borderRadius: '12px',
            boxShadow: '0 20px 25px rgba(0,0,0,0.3)',
            zIndex: 50,
            overflow: 'hidden',
          }}
        >
          {/* Account List */}
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {accounts.map((account, index) => (
              <button
                key={account.id}
                onClick={() => handleSwitchAccount(account)}
                style={{
                  width: '100%',
                  padding: '1rem',
                  textAlign: 'left',
                  background: currentAccount?.id === account.id ? '#0f172a' : 'transparent',
                  border: 'none',
                  borderBottom: index < accounts.length - 1 ? '1px solid #334155' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (currentAccount?.id !== account.id) {
                    e.currentTarget.style.background = '#0f172a'
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentAccount?.id !== account.id) {
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                <div>
                  <div style={{ fontWeight: '700', fontSize: '1rem', color: '#f1f5f9' }}>
                    {currentAccount?.id === account.id && '✓ '} {account.account_name}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                    {account.account_type} • {getStatusText(account.status)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.95rem', fontWeight: '600', color: '#60a5fa' }}>
                  ${(account.account_balance || 0).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid #334155' }} />

          {/* Quick Actions */}
          <button
            onClick={() => {
              window.location.href = '/dashboard/accounts'
              setIsOpen(false)
            }}
            style={{
              width: '100%',
              padding: '1rem',
              textAlign: 'left',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: '#94a3b8',
              fontSize: '1rem',
              fontWeight: '600',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#0f172a'
              e.currentTarget.style.color = '#f1f5f9'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#94a3b8'
            }}
          >
            <span>⚙️</span>
            <span>Manage Accounts</span>
          </button>
        </div>
      )}
    </div>
  )
}
