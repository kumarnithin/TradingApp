'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface IBAccount {
  account_name: string
  account_type: string
  account_pattern: string
  equity?: number
  cash?: number
  buying_power?: number
  error?: string
}

interface ConnectionStatus {
  connected: boolean
  account_type?: string
  account_name?: string
  account?: string
  equity?: number
  buying_power?: number
  timestamp?: string
}

export default function SettingsPage() {
  const [availableAccounts, setAvailableAccounts] = useState<IBAccount[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ connected: false })
  const [loading, setLoading] = useState(false)
  const [scanningAccounts, setScanningAccounts] = useState(false)
  const [selectedAccountType, setSelectedAccountType] = useState<'demo' | 'live'>('demo')
  const [connectionHistory, setConnectionHistory] = useState<any[]>([])

  useEffect(() => {
    checkConnectionStatus()
    const interval = setInterval(checkConnectionStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  const checkConnectionStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/ib/connection-status`)
      setConnectionStatus(response.data)
    } catch (error) {
      console.error('Error checking connection:', error)
      setConnectionStatus({ connected: false })
    }
  }

  const scanAccounts = async () => {
    setScanningAccounts(true)
    addToHistory('info', `Scanning ${selectedAccountType.toUpperCase()} accounts...`)
    
    try {
      const response = await axios.post(`${API_URL}/api/v1/ib/get-accounts`, {
        account_type: selectedAccountType
      })
      
      if (response.data.status === 'success' && response.data.accounts) {
        setAvailableAccounts(response.data.accounts)
        addToHistory('success', `Found ${response.data.count} ${selectedAccountType.toUpperCase()} account(s)`)
      } else {
        setAvailableAccounts([])
        addToHistory('warning', response.data.message || 'No accounts found')
      }
    } catch (error: any) {
      addToHistory('error', `Failed to scan accounts: ${error.response?.data?.detail || error.message}`)
      setAvailableAccounts([])
    }
    
    setScanningAccounts(false)
  }

  const handleConnect = async (account: IBAccount) => {
    setLoading(true)
    addToHistory('info', `Connecting to ${account.account_name}...`)
    
    try {
      const response = await axios.post(`${API_URL}/api/v1/ib/connect`, {
        account_name: account.account_name
      })
      
      if (response.data.status === 'success') {
        setConnectionStatus({
          connected: true,
          account_name: account.account_name,
          account_type: account.account_type,
          ...response.data
        })
        addToHistory('success', `✅ Connected to ${account.account_name}`)
      } else {
        addToHistory('error', `Failed to connect: ${response.data.error}`)
      }
    } catch (error: any) {
      addToHistory('error', `Connection failed: ${error.response?.data?.detail || error.message}`)
    }
    
    setLoading(false)
  }

  const handleDisconnect = async () => {
    setLoading(true)
    addToHistory('info', 'Disconnecting...')
    
    try {
      await axios.post(`${API_URL}/api/v1/ib/disconnect`)
      setConnectionStatus({ connected: false })
      addToHistory('success', '✅ Disconnected successfully')
    } catch (error: any) {
      addToHistory('error', `Disconnection failed: ${error.message}`)
    }
    
    setLoading(false)
  }

  const addToHistory = (type: string, message: string) => {
    const newEntry = {
      id: Date.now(),
      type,
      message,
      timestamp: new Date().toISOString()
    }
    setConnectionHistory([newEntry, ...connectionHistory.slice(0, 9)])
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          🔌 IB Connection Manager
        </h1>
        <p style={{ color: '#666' }}>Connect to Interactive Brokers accounts</p>
      </div>

      {/* Connection Status Card */}
      <div style={{ 
        background: connectionStatus.connected ? '#10b981' : '#ef4444',
        color: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          {connectionStatus.connected ? '🟢 CONNECTED' : '🔴 DISCONNECTED'}
        </div>
        {connectionStatus.connected && (
          <div style={{ fontSize: '0.9rem' }}>
            <div>Account: <strong>{connectionStatus.account_name}</strong></div>
            <div>Type: <strong>{connectionStatus.account_type?.toUpperCase()}</strong></div>
            <div>Equity: <strong>${connectionStatus.equity?.toLocaleString()}</strong></div>
            <div>Buying Power: <strong>${connectionStatus.buying_power?.toLocaleString()}</strong></div>
            <button
              onClick={handleDisconnect}
              disabled={loading}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                background: 'white',
                color: '#ef4444',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              {loading ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </div>
        )}
      </div>

      {!connectionStatus.connected && (
        <>
          {/* Account Type Selector */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Step 1: Select Account Type</h2>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setSelectedAccountType('demo')}
                style={{
                  padding: '1rem 2rem',
                  background: selectedAccountType === 'demo' ? '#3b82f6' : '#e5e7eb',
                  color: selectedAccountType === 'demo' ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem'
                }}
              >
                🎯 Demo (Paper Trading)
              </button>
              <button
                onClick={() => setSelectedAccountType('live')}
                style={{
                  padding: '1rem 2rem',
                  background: selectedAccountType === 'live' ? '#ef4444' : '#e5e7eb',
                  color: selectedAccountType === 'live' ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem'
                }}
              >
                💰 Live (Real Trading) ⚠️
              </button>
            </div>
          </div>

          {/* Scan Accounts */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Step 2: Scan for Accounts</h2>
            <button
              onClick={scanAccounts}
              disabled={scanningAccounts}
              style={{
                padding: '1rem 2rem',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: scanningAccounts ? 'wait' : 'pointer',
                fontWeight: 'bold',
                fontSize: '1rem'
              }}
            >
              {scanningAccounts ? '🔍 Scanning...' : `🔍 Scan ${selectedAccountType.toUpperCase()} Accounts`}
            </button>
            <p style={{ color: '#666', marginTop: '0.5rem', fontSize: '0.9rem' }}>
              Make sure TWS/Gateway is running on port {selectedAccountType === 'demo' ? '7497' : '7496'}
            </p>
          </div>

          {/* Available Accounts */}
          {availableAccounts.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
                Step 3: Select Account to Connect ({availableAccounts.length} found)
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
                {availableAccounts.map((account) => (
                  <div
                    key={account.account_name}
                    style={{
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '1.5rem',
                      background: 'white'
                    }}
                  >
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                      {account.account_pattern === 'DU' ? '🎯' : '💰'} {account.account_name}
                    </div>
                    
                    {account.error ? (
                      <div style={{ color: '#ef4444', marginBottom: '1rem' }}>
                        Error: {account.error}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                        <div><strong>Type:</strong> {account.account_type.toUpperCase()}</div>
                        <div><strong>Pattern:</strong> {account.account_pattern}</div>
                        {account.equity !== undefined && (
                          <>
                            <div><strong>Equity:</strong> ${account.equity.toLocaleString()}</div>
                            <div><strong>Cash:</strong> ${account.cash?.toLocaleString()}</div>
                            <div><strong>Buying Power:</strong> ${account.buying_power?.toLocaleString()}</div>
                          </>
                        )}
                      </div>
                    )}

                    <button
                      onClick={() => handleConnect(account)}
                      disabled={loading || !!account.error}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: account.error ? '#9ca3af' : '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: account.error || loading ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      {loading ? 'Connecting...' : 'Connect to this Account'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Connection History */}
      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Connection History</h2>
        <div style={{ 
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          background: 'white',
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          {connectionHistory.length > 0 ? (
            connectionHistory.map((entry) => (
              <div
                key={entry.id}
                style={{
                  padding: '1rem',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>
                    {entry.type === 'success' ? '✅' : entry.type === 'error' ? '❌' : entry.type === 'warning' ? '⚠️' : 'ℹ️'}
                  </span>
                  <span>{entry.message}</span>
                </div>
                <span style={{ color: '#666', fontSize: '0.8rem' }}>
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
              No connection history yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
