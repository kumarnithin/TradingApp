'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function TradesPage() {
  // ===== STATE VARIABLES =====
  const [trades, setTrades] = useState<any[]>([])
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

  // ===== LOAD TRADES WHENEVER FILTER CHANGES =====
  useEffect(() => {
    console.log('🔄 Filter changed, loading trades...')
    console.log('Current state:', {
      currentAccountId,
      selectedAccounts,
      showAllAccounts,
      isMultiSelect,
    })
    loadTrades()
  }, [currentAccountId, selectedAccounts, showAllAccounts, isMultiSelect])

  // ===== LOAD TRADES FROM API =====
  const loadTrades = async () => {
    try {
      setLoading(true)

      // BUILD THE API URL
      let url = `${API_URL}/api/v1/trades/list`

      if (isMultiSelect && selectedAccounts.length > 0) {
        // MULTI-SELECT MODE: Send multiple account IDs
        const accountIds = selectedAccounts.join(',')
        url += `?account_ids=${accountIds}`
        console.log(`📋 Multi-select mode - Loading trades for accounts: ${accountIds}`)
      } else if (!showAllAccounts && currentAccountId) {
        // SINGLE ACCOUNT MODE: Send single account ID
        url += `?account_id=${currentAccountId}`
        console.log(`📋 Single account mode - Loading trades for account: ${currentAccountId}`)
      } else if (showAllAccounts) {
        // ALL ACCOUNTS MODE: No filter
        console.log('📋 All accounts mode - Loading trades for all accounts')
      }

      console.log('🌐 Fetching from:', url)

      const response = await axios.get(url)
      console.log('✅ Response received:', response.data)

      setTrades(response.data.trades || [])
      setLoading(false)
    } catch (error) {
      console.error('❌ Error loading trades:', error)
      setLoading(false)
    }
  }

  // ===== RENDER =====
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Trades</h1>

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
      {loading && <div style={{ textAlign: 'center', padding: '2rem' }}>Loading trades...</div>}

      {/* TRADES TABLE */}
      {!loading && (
        <div>
          {trades.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '2rem',
                background: '#1e293b',
                borderRadius: '8px',
                color: '#94a3b8',
              }}
            >
              No trades found for selected filter
            </div>
          ) : (
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                background: '#1e293b',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              <thead>
                <tr style={{ background: '#0f172a', borderBottom: '2px solid #334155' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#e2e8f0' }}>Symbol</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#e2e8f0' }}>Side</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#e2e8f0' }}>Quantity</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#e2e8f0' }}>Entry Price</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#e2e8f0' }}>P&L</th>
                  {(showAllAccounts || isMultiSelect) && (
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#e2e8f0' }}>Account</th>
                  )}
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#e2e8f0' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#e2e8f0' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade: any, index: number) => (
                  <tr
                    key={trade.id}
                    style={{
                      borderBottom: index < trades.length - 1 ? '1px solid #334155' : 'none',
                      background: index % 2 === 0 ? 'transparent' : '#0f172a30',
                    }}
                  >
                    <td style={{ padding: '1rem', color: '#e2e8f0' }}>
                      <strong>{trade.symbol}</strong>
                    </td>
                    <td
                      style={{
                        padding: '1rem',
                        color: trade.side === 'BUY' ? '#10b981' : '#ef4444',
                        fontWeight: 'bold',
                      }}
                    >
                      {trade.side}
                    </td>
                    <td style={{ padding: '1rem', color: '#e2e8f0' }}>{trade.quantity}</td>
                    <td style={{ padding: '1rem', color: '#e2e8f0' }}>${trade.entry_price}</td>
                    <td
                      style={{
                        padding: '1rem',
                        color: trade.pnl >= 0 ? '#10b981' : '#ef4444',
                        fontWeight: 'bold',
                      }}
                    >
                      ${trade.pnl}
                    </td>
                    {(showAllAccounts || isMultiSelect) && (
                      <td style={{ padding: '1rem', color: '#60a5fa' }}>{trade.account_name}</td>
                    )}
                    <td style={{ padding: '1rem', color: '#60a5fa' }}>{trade.status}</td>
                    <td style={{ padding: '1rem', color: '#94a3b8' }}>
                      {new Date(trade.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              tradesCount: trades.length,
            },
            null,
            2
          )}
        </pre>
      </details>
    </div>
  )
}
