'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import logger from '../../../../utils/logger'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function SignalsPage() {
  // ===== STATE VARIABLES =====
  const [signals, setSignals] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Account filter states
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null)
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [showAllAccounts, setShowAllAccounts] = useState(false)
  const [isMultiSelect, setIsMultiSelect] = useState(false)

  // ===== LOAD FILTER STATE FROM LOCALSTORAGE =====
  useEffect(() => {
    logger.debug('ðŸ”„ Loading filter state from localStorage...')

    const savedShowAll = localStorage.getItem('showAllAccounts')
    const savedAccountId = localStorage.getItem('currentAccountId')
    const savedSelectedAccounts = localStorage.getItem('selectedAccounts')
    const savedIsMultiSelect = localStorage.getItem('isMultiSelectMode')

    if (savedIsMultiSelect === 'true' && savedSelectedAccounts) {
      logger.debug('âœ… Setting Multi-Select mode')
      setIsMultiSelect(true)
      setSelectedAccounts(JSON.parse(savedSelectedAccounts))
      setShowAllAccounts(false)
      setCurrentAccountId(null)
    } else if (savedShowAll === 'true') {
      logger.debug('âœ… Setting All Accounts mode')
      setShowAllAccounts(true)
      setSelectedAccounts([])
      setIsMultiSelect(false)
      setCurrentAccountId(null)
    } else if (savedAccountId) {
      logger.debug('âœ… Setting Single Account mode:', savedAccountId)
      setCurrentAccountId(savedAccountId)
      setShowAllAccounts(false)
      setSelectedAccounts([])
      setIsMultiSelect(false)
    }
  }, [])

  // ===== LISTEN FOR ACCOUNT CHANGES FROM SWITCHER =====
  useEffect(() => {
    logger.debug('ðŸ“¡ Registering accountChanged event listener')

    const handleAccountChange = (event: any) => {
      logger.debug('ðŸ“© Received accountChanged event:', event.detail)

      const { account, showAll, selectedAccounts: selected, isMultiSelect: multiSelect } = event.detail

      if (multiSelect && selected && selected.length > 0) {
        logger.debug('âœ… Multi-Select event received:', selected)
        setIsMultiSelect(true)
        setSelectedAccounts(selected)
        setShowAllAccounts(false)
        setCurrentAccountId(null)
      } else if (showAll) {
        logger.debug('âœ… All Accounts event received')
        setShowAllAccounts(true)
        setSelectedAccounts([])
        setIsMultiSelect(false)
        setCurrentAccountId(null)
      } else if (account) {
        logger.debug('âœ… Single Account event received:', account.id)
        setCurrentAccountId(account.id)
        setShowAllAccounts(false)
        setSelectedAccounts([])
        setIsMultiSelect(false)
      }
    }

    window.addEventListener('accountChanged', handleAccountChange)

    return () => {
      logger.debug('ðŸ§¹ Cleaning up event listener')
      window.removeEventListener('accountChanged', handleAccountChange)
    }
  }, [])

  // ===== LOAD SIGNALS WHENEVER FILTER CHANGES =====
  useEffect(() => {
    logger.debug('ðŸ”„ Filter changed, loading signals...')
    logger.debug('Current state:', {
      currentAccountId,
      selectedAccounts,
      showAllAccounts,
      isMultiSelect,
    })
    loadSignals()
  }, [currentAccountId, selectedAccounts, showAllAccounts, isMultiSelect])

  // ===== LOAD SIGNALS FROM API =====
  const loadSignals = async () => {
    try {
      setLoading(true)

      // BUILD THE API URL
      let url = `${API_URL}/api/v1/signals/list`

      if (isMultiSelect && selectedAccounts.length > 0) {
        // MULTI-SELECT MODE: Send multiple account IDs
        const accountIds = selectedAccounts.join(',')
        url += `?account_ids=${accountIds}`
        logger.debug(`ðŸ“‹ Multi-select mode - Loading signals for accounts: ${accountIds}`)
      } else if (!showAllAccounts && currentAccountId) {
        // SINGLE ACCOUNT MODE: Send single account ID
        url += `?account_id=${currentAccountId}`
        logger.debug(`ðŸ“‹ Single account mode - Loading signals for account: ${currentAccountId}`)
      } else if (showAllAccounts) {
        // ALL ACCOUNTS MODE: No filter
        logger.debug('ðŸ“‹ All accounts mode - Loading signals for all accounts')
      }

      logger.debug('ðŸŒ Fetching from:', url)

      const response = await axios.get(url)
      logger.debug('âœ… Response received:', response.data)

      setSignals(response.data.signals || [])
      setLoading(false)
      } catch (error) {
      logger.error('âŒ Error loading signals:', error)
      setLoading(false)
    }
  }

  // ===== RENDER =====
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Signals</h1>

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
          ? `âœ… ${selectedAccounts.length} Account${selectedAccounts.length !== 1 ? 's' : ''} Selected`
          : showAllAccounts
            ? 'ðŸ“Š All Accounts'
            : 'ðŸ¢ Single Account'}
      </div>

      {/* LOADING STATE */}
      {loading && <div style={{ textAlign: 'center', padding: '2rem' }}>Loading signals...</div>}

      {/* SIGNALS TABLE */}
      {!loading && (
        <div>
          {signals.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '2rem',
                background: '#1e293b',
                borderRadius: '8px',
                color: '#94a3b8',
              }}
            >
              No signals found for selected filter
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
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#e2e8f0' }}>Signal Type</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#e2e8f0' }}>Strength</th>
                  {(showAllAccounts || isMultiSelect) && (
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#e2e8f0' }}>Account</th>
                  )}
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#e2e8f0' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#e2e8f0' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {signals.map((signal: any, index: number) => (
                  <tr
                    key={signal.id}
                    style={{
                      borderBottom: index < signals.length - 1 ? '1px solid #334155' : 'none',
                      background: index % 2 === 0 ? 'transparent' : '#0f172a30',
                    }}
                  >
                    <td style={{ padding: '1rem', color: '#e2e8f0' }}>
                      <strong>{signal.symbol}</strong>
                    </td>
                    <td style={{ padding: '1rem', color: '#e2e8f0' }}>{signal.signal_type}</td>
                    <td style={{ padding: '1rem', color: signal.strength === 'STRONG' ? '#10b981' : '#f59e0b' }}>
                      {signal.strength}
                    </td>
                    {(showAllAccounts || isMultiSelect) && (
                      <td style={{ padding: '1rem', color: '#60a5fa' }}>{signal.account_name}</td>
                    )}
                    <td style={{ padding: '1rem', color: '#10b981' }}>{signal.status}</td>
                    <td style={{ padding: '1rem', color: '#94a3b8' }}>
                      {new Date(signal.created_at).toLocaleTimeString()}
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
              signalsCount: signals.length,
            },
            null,
            2
          )}
        </pre>
      </details>
    </div>
  )
}
