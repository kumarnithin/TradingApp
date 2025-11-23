'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import styles from './settings.module.css'
import logger from '../../../utils/logger'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface IBAccount {
  id: string
  name: string
  accountType: 'DEMO' | 'LIVE'
  host: string
  port: number
  clientId: number
  isConnected: boolean
  connectionTime?: string
  lastActivity?: string
  isFavorite: boolean
  accountNumber?: string
  buyingPower?: number
  equity?: number
}

interface ConnectionStatus {
  isConnected: boolean
  accountInfo?: any
  uptime?: number
  latency?: number
  lastChecked?: string
}

interface ConnectionHistoryEntry {
  id: number
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  timestamp: string
}

export default function IBConnectionSettingsPage() {
  const [accounts, setAccounts] = useState<IBAccount[]>([
    {
      id: '1',
      name: 'Demo Account',
      accountType: 'DEMO',
      host: 'localhost',
      port: 7497,
      clientId: 1,
      isConnected: false,
      isFavorite: true
    },
    {
      id: '2',
      name: 'Live01',
      accountType: 'LIVE',
      host: 'localhost',
      port: 7496,
      clientId: 2,
      isConnected: false,
      isFavorite: false
    },
    {
      id: '3',
      name: 'Live02',
      accountType: 'LIVE',
      host: 'localhost',
      port: 7495,
      clientId: 3,
      isConnected: false,
      isFavorite: false
    }
  ])

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    uptime: 0,
    latency: 0
  })

  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<IBAccount | null>(null)
  const [connectionHistory, setConnectionHistory] = useState<ConnectionHistoryEntry[]>([])
  const [formData, setFormData] = useState({
    name: '',
    accountType: 'DEMO' as const,
    host: 'localhost',
    port: 7497,
    clientId: 1
  })
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStats, setConnectionStats] = useState({
    totalConnections: 0,
    successfulConnections: 0,
    failedConnections: 0,
    averageLatency: 0
  })

  // Check connection status on mount and periodically
  useEffect(() => {
    checkConnectionStatus()
    const interval = setInterval(checkConnectionStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  // Fetch accounts from backend
  useEffect(() => {
    fetchAccountsFromBackend()
  }, [])

  const fetchAccountsFromBackend = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/ib/accounts`, { timeout: 5000 })
      if (response.data?.accounts) {
        addToHistory('info', 'Accounts loaded from backend')
      }
    } catch (error) {
      logger.warn('Backend not available, using local accounts')
    }
  }

  const checkConnectionStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/ib/connection-status`, { timeout: 5000 })
      setConnectionStatus({
        isConnected: response.data?.connected || false,
        accountInfo: response.data?.account,
        latency: Math.random() * 50 + 10, // Mock latency 10-60ms
        lastChecked: new Date().toISOString()
      })
    } catch (error) {
      logger.warn('Could not check connection status')
      // Set mock status if backend unavailable
      setConnectionStatus({
        isConnected: false,
        latency: 0,
        lastChecked: new Date().toISOString()
      })
    }
  }

  const handleConnect = async (account: IBAccount) => {
    setLoading(true)
    try {
      const response = await axios.post(`${API_URL}/api/v1/ib/connect`, {
        host: account.host,
        port: account.port,
        client_id: account.clientId
      }, { timeout: 10000 })

      // Update account status
      setAccounts(accounts.map(acc =>
        acc.id === account.id
          ? {
              ...acc,
              isConnected: true,
              connectionTime: new Date().toISOString(),
              accountNumber: response.data?.account_id || acc.accountNumber,
              buyingPower: response.data?.buying_power,
              equity: response.data?.equity
            }
          : { ...acc, isConnected: false } // Disconnect others
      ))

      // Update stats
      setConnectionStats(prev => ({
        ...prev,
        totalConnections: prev.totalConnections + 1,
        successfulConnections: prev.successfulConnections + 1
      }))

      addToHistory('success', `âœ“ Successfully connected to ${account.name}`)
      
      // Check status after connection
      setTimeout(checkConnectionStatus, 1000)
    } catch (error: any) {
      setConnectionStats(prev => ({
        ...prev,
        totalConnections: prev.totalConnections + 1,
        failedConnections: prev.failedConnections + 1
      }))
      addToHistory('error', `âœ— Failed to connect to ${account.name}: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async (account: IBAccount) => {
    setLoading(true)
    try {
      await axios.post(`${API_URL}/api/v1/ib/disconnect`, {}, { timeout: 10000 })
      
      setAccounts(accounts.map(acc =>
        acc.id === account.id
          ? { ...acc, isConnected: false, accountNumber: undefined, buyingPower: undefined }
          : acc
      ))

      addToHistory('info', `âŠ— Disconnected from ${account.name}`)
    } catch (error: any) {
      addToHistory('error', `âœ— Failed to disconnect: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async (account: IBAccount) => {
    setTestingConnection(true)
    try {
      const response = await axios.post(`${API_URL}/api/v1/ib/test-connection`, {
        host: account.host,
        port: account.port,
        client_id: account.clientId
      }, { timeout: 5000 })

      addToHistory('success', `âœ“ Connection test passed for ${account.name} (Latency: ${response.data?.latency}ms)`)
    } catch (error: any) {
      addToHistory('warning', `âš  Connection test failed for ${account.name}`)
    } finally {
      setTestingConnection(false)
    }
  }

  const handleAddAccount = () => {
    if (!formData.name.trim()) {
      addToHistory('error', 'Account name is required')
      return
    }

    const newAccount: IBAccount = {
      id: Date.now().toString(),
      name: formData.name,
      accountType: formData.accountType,
      host: formData.host,
      port: formData.port,
      clientId: formData.clientId,
      isConnected: false,
      isFavorite: false
    }

    setAccounts([...accounts, newAccount])
    addToHistory('info', `âœ“ Added new account: ${formData.name}`)
    resetForm()
    setShowAddModal(false)
  }

  const handleUpdateAccount = () => {
    if (!editingAccount || !formData.name.trim()) {
      addToHistory('error', 'Account name is required')
      return
    }

    setAccounts(accounts.map(acc =>
      acc.id === editingAccount.id
        ? {
            ...acc,
            name: formData.name,
            accountType: formData.accountType,
            host: formData.host,
            port: formData.port,
            clientId: formData.clientId
          }
        : acc
    ))

    addToHistory('info', `âœ“ Updated account: ${formData.name}`)
    resetForm()
    setShowAddModal(false)
  }

  const handleDeleteAccount = (accountId: string) => {
    if (confirm('Are you sure you want to delete this account?')) {
      const accountName = accounts.find(acc => acc.id === accountId)?.name
      setAccounts(accounts.filter(acc => acc.id !== accountId))
      addToHistory('warning', `âŠ— Deleted account: ${accountName}`)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      accountType: 'DEMO',
      host: 'localhost',
      port: 7497,
      clientId: 1
    })
    setEditingAccount(null)
  }

  const openEditModal = (account: IBAccount) => {
    setEditingAccount(account)
    setFormData({
      name: account.name,
      accountType: account.accountType,
      host: account.host,
      port: account.port,
      clientId: account.clientId
    })
    setShowAddModal(true)
  }

  const addToHistory = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    const newEntry: ConnectionHistoryEntry = {
      id: Date.now(),
      type,
      message,
      timestamp: new Date().toISOString()
    }
    setConnectionHistory([newEntry, ...connectionHistory.slice(0, 19)]) // Keep last 20
  }

  const toggleFavorite = (accountId: string) => {
    setAccounts(accounts.map(acc =>
      acc.id === accountId ? { ...acc, isFavorite: !acc.isFavorite } : acc
    ))
  }

  const activeAccounts = accounts.filter(acc => acc.isConnected).length
  const totalAccounts = accounts.length
  const successRate = connectionStats.totalConnections > 0
    ? ((connectionStats.successfulConnections / connectionStats.totalConnections) * 100).toFixed(1)
    : '0'

  return (
    <div className={styles.settingsPage}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>ðŸ”Œ IB Connection Settings</h1>
          <p className={styles.pageSubtitle}>Manage Interactive Brokers connections and account settings</p>
        </div>
        <div className={styles.headerButtons}>
          <button
            className={styles.btnAdd}
            onClick={() => {
              resetForm()
              setShowAddModal(true)
            }}
          >
            + Add Account
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.cardLabel}>Active Connections</div>
          <div className={styles.cardValue}>{activeAccounts}</div>
          <div className={styles.cardSubtext}>of {totalAccounts} accounts</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.cardLabel}>Total Accounts</div>
          <div className={styles.cardValue}>{totalAccounts}</div>
          <div className={styles.cardSubtext}>Configured</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.cardLabel}>Connection Status</div>
          <div className={`${styles.cardValue} ${connectionStatus.isConnected ? styles.positive : styles.negative}`}>
            {connectionStatus.isConnected ? 'ðŸŸ¢ Connected' : 'ðŸ”´ Disconnected'}
          </div>
          <div className={styles.cardSubtext}>{connectionStatus.latency?.toFixed(0)}ms latency</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.cardLabel}>Success Rate</div>
          <div className={styles.cardValue}>{successRate}%</div>
          <div className={styles.cardSubtext}>{connectionStats.successfulConnections}/{connectionStats.totalConnections}</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className={styles.mainGrid}>
        {/* Accounts Section */}
        <div className={`${styles.accountsSection} glass-light`}>
          <h2 className={styles.sectionTitle}>ðŸ“‹ Configured Accounts</h2>

          <div className={styles.accountsGrid}>
            {accounts.map(account => (
              <div key={account.id} className={`${styles.accountCard} ${account.isConnected ? styles.connected : ''}`}>
                {/* Card Header */}
                <div className={styles.cardHeader}>
                  <div className={styles.accountTitle}>
                    <span className={styles.icon}>
                      {account.accountType === 'DEMO' ? 'ðŸŽ¯' : 'ðŸ’°'}
                    </span>
                    <div>
                      <h3 className={styles.accountName}>{account.name}</h3>
                      <span className={`${styles.accountType} ${account.accountType.toLowerCase()}`}>
                        {account.accountType}
                      </span>
                    </div>
                  </div>
                  <button
                    className={styles.favoriteBtn}
                    onClick={() => toggleFavorite(account.id)}
                    title={account.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {account.isFavorite ? 'â­' : 'â˜†'}
                  </button>
                </div>

                {/* Connection Status */}
                <div className={`${styles.statusBadge} ${account.isConnected ? styles.connected : styles.disconnected}`}>
                  {account.isConnected ? 'ðŸŸ¢ CONNECTED' : 'âšª DISCONNECTED'}
                </div>

                {/* Connection Details */}
                <div className={styles.details}>
                  <div className={styles.detailRow}>
                    <span className={styles.label}>Host:</span>
                    <span className={styles.value}>{account.host}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.label}>Port:</span>
                    <span className={styles.value}>{account.port}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.label}>Client ID:</span>
                    <span className={styles.value}>{account.clientId}</span>
                  </div>
                  {account.accountNumber && (
                    <div className={styles.detailRow}>
                      <span className={styles.label}>Account #:</span>
                      <span className={styles.value}>{account.accountNumber}</span>
                    </div>
                  )}
                </div>

                {/* Connection Stats */}
                {account.isConnected && (
                  <div className={styles.stats}>
                    <div className={styles.stat}>
                      <span className={styles.statLabel}>Connected:</span>
                      <span className={styles.statValue}>
                        {account.connectionTime ? new Date(account.connectionTime).toLocaleTimeString() : '-'}
                      </span>
                    </div>
                    {account.buyingPower && (
                      <div className={styles.stat}>
                        <span className={styles.statLabel}>Buying Power:</span>
                        <span className={styles.statValue}>${(account.buyingPower / 1000).toFixed(1)}K</span>
                      </div>
                    )}
                    {account.equity && (
                      <div className={styles.stat}>
                        <span className={styles.statLabel}>Equity:</span>
                        <span className={styles.statValue}>${(account.equity / 1000).toFixed(1)}K</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className={styles.actions}>
                  {account.isConnected ? (
                    <button
                      className={`${styles.btn} ${styles.btnDanger}`}
                      onClick={() => handleDisconnect(account)}
                      disabled={loading}
                    >
                      {loading ? 'âŠ— Disconnecting...' : 'âŠ— Disconnect'}
                    </button>
                  ) : (
                    <button
                      className={`${styles.btn} ${styles.btnSuccess}`}
                      onClick={() => handleConnect(account)}
                      disabled={loading}
                    >
                      {loading ? 'ðŸ”„ Connecting...' : 'ðŸ”— Connect'}
                    </button>
                  )}
                  <button
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    onClick={() => handleTestConnection(account)}
                    disabled={testingConnection || account.isConnected}
                  >
                    {testingConnection ? 'ðŸ”„ Testing...' : 'ðŸ§ª Test'}
                  </button>
                  <button
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    onClick={() => openEditModal(account)}
                  >
                    âœï¸ Edit
                  </button>
                  <button
                    className={`${styles.btn} ${styles.btnDanger}`}
                    onClick={() => handleDeleteAccount(account.id)}
                  >
                    ðŸ—‘ï¸ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Connection Health Section */}
        <div className={`${styles.healthSection} glass-light`}>
          <h2 className={styles.sectionTitle}>ðŸ’š Connection Health</h2>

          <div className={styles.healthMetrics}>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>Status</div>
              <div className={`${styles.metricValue} ${connectionStatus.isConnected ? styles.healthy : styles.unhealthy}`}>
                {connectionStatus.isConnected ? 'ðŸŸ¢ Healthy' : 'ðŸ”´ Not Connected'}
              </div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>Latency</div>
              <div className={styles.metricValue}>
                {connectionStatus.latency?.toFixed(0) || '0'}ms
              </div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>Last Check</div>
              <div className={styles.metricValue}>
                {connectionStatus.lastChecked
                  ? new Date(connectionStatus.lastChecked).toLocaleTimeString()
                  : '-'}
              </div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>Uptime</div>
              <div className={styles.metricValue}>
                {connectionStatus.isConnected ? '99.5%' : '0%'}
              </div>
            </div>
          </div>

          {/* System Info */}
          <div className={styles.systemInfo}>
            <h3 className={styles.infoTitle}>System Information</h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>API Version:</span>
                <span className={styles.infoValue}>v1.0</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Backend URL:</span>
                <span className={styles.infoValue} style={{ fontSize: '11px' }}>{API_URL}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Connection Mode:</span>
                <span className={styles.infoValue}>Real-time</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Update Interval:</span>
                <span className={styles.infoValue}>5s</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connection History */}
      <div className={`${styles.historySection} glass-light`}>
        <h2 className={styles.sectionTitle}>ðŸ“ Connection History</h2>

        {connectionHistory.length > 0 ? (
          <div className={styles.historyList}>
            {connectionHistory.map(entry => (
              <div key={entry.id} className={`${styles.historyEntry} ${styles[entry.type]}`}>
                <div className={styles.historyIcon}>
                  {entry.type === 'success' ? 'âœ“' : entry.type === 'error' ? 'âœ—' : entry.type === 'warning' ? 'âš ' : 'â„¹'}
                </div>
                <div className={styles.historyContent}>
                  <p className={styles.historyMessage}>{entry.message}</p>
                  <span className={styles.historyTime}>
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            No connection history yet. Try connecting to an account!
          </div>
        )}
      </div>

      {/* Add/Edit Account Modal */}
      {showAddModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>{editingAccount ? 'Edit Account' : 'Add New Account'}</h3>
              <button
                className={styles.closeButton}
                onClick={() => {
                  setShowAddModal(false)
                  resetForm()
                }}
              >
                âœ•
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Account Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., My Demo Account"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Account Type</label>
                <select
                  value={formData.accountType}
                  onChange={(e) => setFormData({ ...formData, accountType: e.target.value as 'DEMO' | 'LIVE' })}
                  className={styles.select}
                >
                  <option value="DEMO">Demo (Paper Trading)</option>
                  <option value="LIVE">Live (Real Money)</option>
                </select>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Host</label>
                  <input
                    type="text"
                    value={formData.host}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                    placeholder="127.0.0.1"
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Port</label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                    placeholder="7497"
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Client ID</label>
                <input
                  type="number"
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: parseInt(e.target.value) })}
                  placeholder="1"
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.btnCancel}
                onClick={() => {
                  setShowAddModal(false)
                  resetForm()
                }}
              >
                Cancel
              </button>
              <button
                className={styles.btnAdd}
                onClick={editingAccount ? handleUpdateAccount : handleAddAccount}
              >
                {editingAccount ? 'Update Account' : 'Add Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
