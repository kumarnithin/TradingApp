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
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showAllAccounts, setShowAllAccounts] = useState(false)
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  // hoisted functions: load accounts and restore filter
  async function loadAccounts() {
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

  function loadCurrentFilter() {
    try {
      const savedShowAll = localStorage.getItem('showAllAccounts')
      const savedAccountId = localStorage.getItem('currentAccountId')
      const savedSelectedAccounts = localStorage.getItem('selectedAccounts')
      const savedIsMultiSelect = localStorage.getItem('isMultiSelectMode')

      if (savedIsMultiSelect === 'true' && savedSelectedAccounts) {
        setIsMultiSelectMode(true)
        setSelectedAccounts(JSON.parse(savedSelectedAccounts))
        setCurrentAccount(null)
        setShowAllAccounts(false)
      } else if (savedShowAll === 'true') {
        setShowAllAccounts(true)
        setCurrentAccount(null)
        setSelectedAccounts([])
        setIsMultiSelectMode(false)
      } else if (savedAccountId && accounts.length > 0) {
        const account = accounts.find(a => a.id === savedAccountId)
        if (account) {
          setCurrentAccount(account)
          setShowAllAccounts(false)
          setSelectedAccounts([])
          setIsMultiSelectMode(false)
        }
      } else if (accounts.length > 0) {
        // Default to first account
        setCurrentAccount(accounts[0])
        localStorage.setItem('currentAccountId', accounts[0].id)
        setShowAllAccounts(false)
        setSelectedAccounts([])
        setIsMultiSelectMode(false)
      }
    } catch (error) {
      console.error('Error loading filter:', error)
    }
  }

  // Load accounts on mount
  useEffect(() => {
    const run = async () => {
      await loadAccounts()
    }
    run()
  }, [])

  useEffect(() => {
    const run = () => {
      loadCurrentFilter()
    }
    run()
  }, [accounts])

  const handleShowAllAccounts = () => {
    setCurrentAccount(null)
    setShowAllAccounts(true)
    setSelectedAccounts([])
    setIsMultiSelectMode(false)
    localStorage.setItem('showAllAccounts', 'true')
    localStorage.removeItem('currentAccountId')
    localStorage.removeItem('selectedAccounts')
    localStorage.removeItem('isMultiSelectMode')
    setIsOpen(false)

    window.dispatchEvent(new CustomEvent('accountChanged', {
      detail: { showAll: true, selectedAccounts: [] }
    }))
  }

  const handleSelectSingleAccount = (account: Account) => {
    setCurrentAccount(account)
    setShowAllAccounts(false)
    setSelectedAccounts([])
    setIsMultiSelectMode(false)
    localStorage.setItem('currentAccountId', account.id)
    localStorage.setItem('showAllAccounts', 'false')
    localStorage.removeItem('selectedAccounts')
    localStorage.removeItem('isMultiSelectMode')
    setIsOpen(false)

    window.dispatchEvent(new CustomEvent('accountChanged', {
      detail: { account, showAll: false, selectedAccounts: [], isMultiSelect: false }
    }))
  }

  const handleToggleMultiSelect = (accountId: string) => {
    let newSelected: string[]
    
    if (selectedAccounts.includes(accountId)) {
      newSelected = selectedAccounts.filter(id => id !== accountId)
    } else {
      newSelected = [...selectedAccounts, accountId]
    }

    setSelectedAccounts(newSelected)
    setIsMultiSelectMode(newSelected.length > 0)
    setCurrentAccount(null)
    setShowAllAccounts(false)

    if (newSelected.length > 0) {
      localStorage.setItem('selectedAccounts', JSON.stringify(newSelected))
      localStorage.setItem('isMultiSelectMode', 'true')
      localStorage.removeItem('currentAccountId')
      localStorage.removeItem('showAllAccounts')
    } else {
      localStorage.removeItem('selectedAccounts')
      localStorage.removeItem('isMultiSelectMode')
    }

    window.dispatchEvent(new CustomEvent('accountChanged', {
      detail: {
        selectedAccounts: newSelected,
        isMultiSelect: newSelected.length > 0,
        showAll: false
      }
    }))
  }

  const getStatusText = (status: string) => {
    return status === 'CONNECTED' ? '🟢' : '🔴'
  }

  const getTotalBalance = () => {
    return accounts.reduce((sum, acc) => sum + (acc.account_balance || 0), 0)
  }

  const getSelectedBalance = () => {
    return accounts
      .filter(acc => selectedAccounts.includes(acc.id))
      .reduce((sum, acc) => sum + (acc.account_balance || 0), 0)
  }

  const getDisplayLabel = () => {
    if (showAllAccounts) return 'All Accounts'
    if (isMultiSelectMode) return `${selectedAccounts.length} Selected`
    if (currentAccount) return currentAccount.account_name
    return 'Select Account'
  }

  const getDisplayIcon = () => {
    if (showAllAccounts) return '📊'
    if (isMultiSelectMode) return '✅'
    return '🏢'
  }

  const getDisplayBalance = () => {
    if (showAllAccounts) return getTotalBalance()
    if (isMultiSelectMode) return getSelectedBalance()
    return currentAccount?.account_balance || 0
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
          <span style={{ fontSize: '1.5rem' }}>{getDisplayIcon()}</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#f1f5f9' }}>
              {getDisplayLabel()}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              {isMultiSelectMode
                ? `${selectedAccounts.length} account${selectedAccounts.length !== 1 ? 's' : ''}`
                : showAllAccounts
                  ? `${accounts.length} accounts`
                  : `${getStatusText(currentAccount?.status || 'DISCONNECTED')} ${currentAccount?.status}`
              }
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#60a5fa' }}>
              💰 ${getDisplayBalance().toLocaleString('en-US', {
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
          {/* All Accounts Option */}
          <button
            onClick={handleShowAllAccounts}
            style={{
              width: '100%',
              padding: '1rem',
              textAlign: 'left',
              background: showAllAccounts ? '#0f172a' : 'transparent',
              border: 'none',
              borderBottom: '1px solid #334155',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!showAllAccounts) {
                e.currentTarget.style.background = '#0f172a'
              }
            }}
            onMouseLeave={(e) => {
              if (!showAllAccounts) {
                e.currentTarget.style.background = 'transparent'
              }
            }}
          >
            <div>
              <div style={{ fontWeight: '700', fontSize: '1rem', color: '#f1f5f9' }}>
                {showAllAccounts && '✓ '} 📊 All Accounts
              </div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                View combined data from all accounts
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.95rem', fontWeight: '600', color: '#60a5fa' }}>
              ${getTotalBalance().toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </button>

          {/* Multi-Select Mode Indicator */}
          {isMultiSelectMode && (
            <div style={{
              padding: '0.75rem 1rem',
              background: '#0f172a',
              borderBottom: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ color: '#60a5fa', fontSize: '0.9rem', fontWeight: '600' }}>
                ✅ Multi-Select Mode
              </div>
              <button
                onClick={() => {
                  setSelectedAccounts([])
                  setIsMultiSelectMode(false)
                  localStorage.removeItem('selectedAccounts')
                  localStorage.removeItem('isMultiSelectMode')
                  window.dispatchEvent(new CustomEvent('accountChanged', {
                    detail: { selectedAccounts: [], isMultiSelect: false }
                  }))
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 'bold'
                }}
              >
                Clear All
              </button>
            </div>
          )}

          {/* Account List with Checkboxes */}
          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {accounts.map((account, index) => (
              <div
                key={account.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '1rem',
                  borderBottom: index < accounts.length - 1 ? '1px solid #334155' : 'none',
                  background: selectedAccounts.includes(account.id) ? '#0f172a' : 'transparent',
                  transition: 'background 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#0f172a'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = selectedAccounts.includes(account.id) ? '#0f172a' : 'transparent'
                }}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedAccounts.includes(account.id)}
                  onChange={() => handleToggleMultiSelect(account.id)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '20px',
                    height: '20px',
                    marginRight: '1rem',
                    cursor: 'pointer',
                    accentColor: '#60a5fa',
                  }}
                />

                {/* Single Select (Radio) - when not in multi-select mode */}
                {!isMultiSelectMode && (
                  <button
                    onClick={() => handleSelectSingleAccount(account)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: 0,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'inherit',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '1rem', color: '#f1f5f9' }}>
                        {currentAccount?.id === account.id && !showAllAccounts && '✓ '} {account.account_name}
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
                )}

                {/* Multi-Select Mode Display */}
                {isMultiSelectMode && (
                  <button
                    onClick={() => handleToggleMultiSelect(account.id)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: 0,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'inherit',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '1rem', color: '#f1f5f9' }}>
                        {account.account_name}
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
                )}
              </div>
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
