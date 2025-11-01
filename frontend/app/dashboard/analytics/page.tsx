'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function AnalyticsPage() {
  // ===== STATE VARIABLES =====
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Account filter states
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null)
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [showAllAccounts, setShowAllAccounts] = useState(false)
  const [isMultiSelect, setIsMultiSelect] = useState(false)

  // ===== LOAD FILTER STATE FROM LOCALSTORAGE =====
  useEffect(() => {
    console.log('🔄 Loading filter state from localStorage...')

    const savedShowAll = localStorage.getItem('showAllAccounts')
    const savedAccountId = localStorage.getItem('currentAccountId')
    const savedSelectedAccounts = localStorage.getItem('selectedAccounts')
    const savedIsMultiSelect = localStorage.getItem('isMultiSelectMode')

    if (savedIsMultiSelect === 'true' && savedSelectedAccounts) {
      console.log('✅ Setting Multi-Select mode')
      setIsMultiSelect(true)
      setSelectedAccounts(JSON.parse(savedSelectedAccounts))
      setShowAllAccounts(false)
      setCurrentAccountId(null)
    } else if (savedShowAll === 'true') {
      console.log('✅ Setting All Accounts mode')
      setShowAllAccounts(true)
      setSelectedAccounts([])
      setIsMultiSelect(false)
      setCurrentAccountId(null)
    } else if (savedAccountId) {
      console.log('✅ Setting Single Account mode:', savedAccountId)
      setCurrentAccountId(savedAccountId)
      setShowAllAccounts(false)
      setSelectedAccounts([])
      setIsMultiSelect(false)
    }
  }, [])

  // ===== LISTEN FOR ACCOUNT CHANGES FROM SWITCHER =====
  useEffect(() => {
    console.log('📡 Registering accountChanged event listener')

    const handleAccountChange = (event: any) => {
      console.log('📩 Received accountChanged event:', event.detail)

      const { account, showAll, selectedAccounts: selected, isMultiSelect: multiSelect } = event.detail

      if (multiSelect && selected && selected.length > 0) {
        console.log('✅ Multi-Select event received:', selected)
        setIsMultiSelect(true)
        setSelectedAccounts(selected)
        setShowAllAccounts(false)
        setCurrentAccountId(null)
      } else if (showAll) {
        console.log('✅ All Accounts event received')
        setShowAllAccounts(true)
        setSelectedAccounts([])
        setIsMultiSelect(false)
        setCurrentAccountId(null)
      } else if (account) {
        console.log('✅ Single Account event received:', account.id)
        setCurrentAccountId(account.id)
        setShowAllAccounts(false)
        setSelectedAccounts([])
        setIsMultiSelect(false)
      }
    }

    window.addEventListener('accountChanged', handleAccountChange)

    return () => {
      console.log('🧹 Cleaning up event listener')
      window.removeEventListener('accountChanged', handleAccountChange)
    }
  }, [])

  // ===== LOAD ANALYTICS WHENEVER FILTER CHANGES =====
  useEffect(() => {
    console.log('🔄 Filter changed, loading analytics...')
    console.log('Current state:', {
      currentAccountId,
      selectedAccounts,
      showAllAccounts,
      isMultiSelect,
    })
    loadAnalytics()
  }, [currentAccountId, selectedAccounts, showAllAccounts, isMultiSelect])

  // ===== LOAD ANALYTICS FROM API =====
  const loadAnalytics = async () => {
    try {
      setLoading(true)

      // BUILD THE API URL
      let url = `${API_URL}/api/v1/analytics/summary`

      if (isMultiSelect && selectedAccounts.length > 0) {
        // MULTI-SELECT MODE: Send multiple account IDs
        const accountIds = selectedAccounts.join(',')
        url += `?account_ids=${accountIds}`
        console.log(`📋 Multi-select mode - Loading analytics for accounts: ${accountIds}`)
      } else if (!showAllAccounts && currentAccountId) {
        // SINGLE ACCOUNT MODE: Send single account ID
        url += `?account_id=${currentAccountId}`
        console.log(`📋 Single account mode - Loading analytics for account: ${currentAccountId}`)
      } else if (showAllAccounts) {
        // ALL ACCOUNTS MODE: No filter
        console.log('📋 All accounts mode - Loading analytics for all accounts')
      }

      console.log('🌐 Fetching from:', url)

      const response = await axios.get(url)
      console.log('✅ Response received:', response.data)

      setAnalytics(response.data || {})
      setLoading(false)
    } catch (error) {
      console.error('❌ Error loading analytics:', error)
      setLoading(false)
    }
  }

  // ===== RENDER =====
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Analytics</h1>

      {/* FILTER INDICATOR */}
      <div
        style={{
          padding: '0.75rem 1rem',
          background: isMultiSelect ? '#8b5cf6' : showAllAccounts ? '#3b82f6' : '#10b981',
          color: 'white',
          borderRadius: '8px',
          marginBottom: '2rem',
          display: 'inline-block',
          fontWeight: '600',
          fontSize: '1rem',
        }}
      >
        {isMultiSelect
          ? `✅ ${selectedAccounts.length} Account${selectedAccounts.length !== 1 ? 's' : ''} Selected`
          : showAllAccounts
            ? '📊 All Accounts'
            : '🏢 Single Account'}
      </div>

      {/* LOADING STATE */}
      {loading && <div style={{ textAlign: 'center', padding: '2rem' }}>Loading analytics...</div>}

      {/* ANALYTICS CARDS */}
      {!loading && analytics && (
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem',
            }}
          >
            {/* Total Trades Card */}
            <div
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '1.5rem',
                borderLeft: '4px solid #3b82f6',
              }}
            >
              <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Total Trades</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6', marginTop: '0.5rem' }}>
                {analytics.total_trades || 0}
              </div>
            </div>

            {/* Win Rate Card */}
            <div
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '1.5rem',
                borderLeft: `4px solid ${(analytics.win_rate || 0) >= 50 ? '#10b981' : '#ef4444'}`,
              }}
            >
              <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Win Rate</div>
              <div
                style={{
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: (analytics.win_rate || 0) >= 50 ? '#10b981' : '#ef4444',
                  marginTop: '0.5rem',
                }}
              >
                {(analytics.win_rate || 0).toFixed(1)}%
              </div>
            </div>

            {/* Total P&L Card */}
            <div
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '1.5rem',
                borderLeft: `4px solid ${(analytics.total_pnl || 0) >= 0 ? '#10b981' : '#ef4444'}`,
              }}
            >
              <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Total P&L</div>
              <div
                style={{
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: (analytics.total_pnl || 0) >= 0 ? '#10b981' : '#ef4444',
                  marginTop: '0.5rem',
                }}
              >
                ${(analytics.total_pnl || 0).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>

            {/* Avg Trade P&L Card */}
            <div
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '1.5rem',
                borderLeft: '4px solid #8b5cf6',
              }}
            >
              <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Avg Trade P&L</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#8b5cf6', marginTop: '0.5rem' }}>
                ${(analytics.avg_trade_pnl || 0).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>

            {/* Best Trade Card */}
            <div
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '1.5rem',
                borderLeft: '4px solid #10b981',
              }}
            >
              <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Best Trade</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981', marginTop: '0.5rem' }}>
                ${(analytics.best_trade || 0).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>

            {/* Worst Trade Card */}
            <div
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '1.5rem',
                borderLeft: '4px solid #ef4444',
              }}
            >
              <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Worst Trade</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444', marginTop: '0.5rem' }}>
                ${(analytics.worst_trade || 0).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>

          {/* Additional Metrics */}
          {(showAllAccounts || isMultiSelect) && (
            <div
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '2rem',
                marginTop: '2rem',
              }}
            >
              <h2 style={{ color: '#e2e8f0', marginBottom: '1rem' }}>Account Details</h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                }}
              >
                {analytics.accounts && analytics.accounts.map((account: any) => (
                  <div key={account.id} style={{ padding: '1rem', background: '#0f172a', borderRadius: '4px' }}>
                    <div style={{ color: '#60a5fa', fontWeight: 'bold' }}>{account.account_name}</div>
                    <div style={{ color: '#94a3b8', marginTop: '0.5rem' }}>Trades: {account.total_trades}</div>
                    <div style={{ color: '#10b981', marginTop: '0.25rem' }}>P&L: ${account.total_pnl}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* DEBUG INFO (Remove later) */}
      <details
        style={{ marginTop: '2rem', padding: '1rem', background: '#0f172a', borderRadius: '8px', cursor: 'pointer' }}
      >
        <summary style={{ color: '#94a3b8', fontWeight: 'bold' }}>Debug Info</summary>
        <pre style={{ color: '#60a5fa', overflow: 'auto', marginTop: '1rem' }}>
          {JSON.stringify(
            {
              currentAccountId,
              selectedAccounts,
              showAllAccounts,
              isMultiSelect,
              analyticsLoaded: !!analytics,
            },
            null,
            2
          )}
        </pre>
      </details>
    </div>
  )
}
