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
}

interface ConnectionStatus {
  isConnected: boolean
  accountInfo?: any
  uptime?: number
  latency?: number
}

export default function SettingsPage() {
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
    isConnected: false
  })
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [connectionHistory, setConnectionHistory] = useState<any[]>([])

  useEffect(() => {
    checkConnectionStatus()
    const interval = setInterval(checkConnectionStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  const checkConnectionStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/ib/status`)
      setConnectionStatus(response.data)
    } catch (error) {
      logger.error('Error checking connection:', error)
    }
  }

  const handleConnect = async (account: IBAccount) => {
    setLoading(true)
    try {
      const response = await axios.post(`${API_URL}/api/v1/ib/connect`, {
        host: account.host,
        port: account.port,
        client_id: account.clientId
      })
      
      // Update account status
      setAccounts(accounts.map(acc => 
        acc.id === account.id 
          ? { ...acc, isConnected: true, connectionTime: new Date().toISOString() }
          : { ...acc, isConnected: false } // Disconnect others
      ))

      // Add to history
      addToHistory('success', `Connected to ${account.name}`)
    } catch (error: any) {
      addToHistory('error', `Failed to connect to ${account.name}: ${error.message}`)
    }
    setLoading(false)
  }

  const handleDisconnect = async (account: IBAccount) => {
    setLoading(true)
    try {
      await axios.post(`${API_URL}/api/v1/ib/disconnect`)
      
      setAccounts(accounts.map(acc => 
        acc.id === account.id 
          ? { ...acc, isConnected: false }
          : acc
      ))

      addToHistory('info', `Disconnected from ${account.name}`)
    } catch (error: any) {
      addToHistory('error', `Failed to disconnect: ${error.message}`)
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
    setConnectionHistory([newEntry, ...connectionHistory.slice(0, 9)]) // Keep last 10
  }

  const toggleFavorite = (accountId: string) => {
    setAccounts(accounts.map(acc => 
      acc.id === accountId ? { ...acc, isFavorite: !acc.isFavorite } : acc
    ))
  }

  const activeAccounts = accounts.filter(acc => acc.isConnected).length
  const totalAccounts = accounts.length

  return (
    <div className={styles.settingsPage}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>ðŸ”Œ IB Connection Manager</h1>
          <p className={styles.pageSubtitle}>Manage Interactive Brokers connections</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.addButton} onClick={() => setShowAddModal(true)}>
            + Add Account
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} glass-light`}>
          <div className={styles.statIcon}>ðŸŸ¢</div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Active Connections</p>
            <p className={styles.statValue}>{activeAccounts}</p>
          </div>
        </div>

        <div className={`${styles.statCard} glass-light`}>
          <div className={styles.statIcon}>ðŸ¦</div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Total Accounts</p>
            <p className={styles.statValue}>{totalAccounts}</p>
          </div>
        </div>

        <div className={`${styles.statCard} glass-light`}>
          <div className={styles.statIcon}>â±ï¸</div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Uptime</p>
            <p className={styles.statValue}>99.5%</p>
          </div>
        </div>
      </div>

      {/* Account Cards */}
      <div className={styles.accountsSection}>
        <h2 className={styles.sectionTitle}>Configured Accounts</h2>
        <div className={styles.accountsGrid}>
          {accounts.map(account => (
            <div key={account.id} className={`${styles.accountCard} glass-light`}>
              {/* Card Header */}
              <div className={styles.cardHeader}>
                <div className={styles.accountInfo}>
                  <h3 className={styles.accountName}>
                    {account.accountType === 'DEMO' ? 'ðŸŽ¯' : 'ðŸ’°'} {account.name}
                  </h3>
                  <button 
                    className={styles.favoriteBtn}
                    onClick={() => toggleFavorite(account.id)}
                  >
                    {account.isFavorite ? 'â­' : 'â˜†'}
                  </button>
                </div>
                <div className={`${styles.statusBadge} ${
                  account.isConnected ? styles.statusConnected : styles.statusDisconnected
                }`}>
                  {account.isConnected ? 'ðŸŸ¢ CONNECTED' : 'âšª DISCONNECTED'}
                </div>
              </div>

              {/* Connection Details */}
              <div className={styles.connectionDetails}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Type:</span>
                  <span className={styles.detailValue}>{account.accountType}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Host:</span>
                  <span className={styles.detailValue}>{account.host}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Port:</span>
                  <span className={styles.detailValue}>{account.port}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Client ID:</span>
                  <span className={styles.detailValue}>{account.clientId}</span>
                </div>
              </div>

              {/* Connection Status */}
              {account.isConnected && account.connectionTime && (
                <div className={styles.connectionInfo}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Connected:</span>
                    <span className={styles.infoValue}>
                      {new Date(account.connectionTime).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Latency:</span>
                    <span className={styles.infoValue}>23ms</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className={styles.cardActions}>
                {account.isConnected ? (
                  <button
                    className={styles.disconnectBtn}
                    onClick={() => handleDisconnect(account)}
                    disabled={loading}
                  >
                    {loading ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                ) : (
                  <button
                    className={styles.connectBtn}
                    onClick={() => handleConnect(account)}
                    disabled={loading}
                  >
                    {loading ? 'Connecting...' : 'Connect'}
                  </button>
                )}
                <button className={styles.editBtn}>Edit</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connection Health */}
      <div className={`${styles.healthCard} glass-light`}>
        <h2 className={styles.sectionTitle}>Connection Health</h2>
        <div className={styles.healthGrid}>
          <div className={styles.healthItem}>
            <span className={styles.healthLabel}>Status</span>
            <span className={`${styles.healthValue} ${connectionStatus.isConnected ? styles.healthGood : styles.healthBad}`}>
              {connectionStatus.isConnected ? 'ðŸŸ¢ Healthy' : 'ðŸ”´ Not Connected'}
            </span>
          </div>
          <div className={styles.healthItem}>
            <span className={styles.healthLabel}>Latency</span>
            <span className={styles.healthValue}>23ms</span>
          </div>
          <div className={styles.healthItem}>
            <span className={styles.healthLabel}>Last Check</span>
            <span className={styles.healthValue}>2s ago</span>
          </div>
        </div>
      </div>

      {/* Connection History */}
      <div className={`${styles.historyCard} glass-light`}>
        <h2 className={styles.sectionTitle}>Connection History</h2>
        <div className={styles.historyList}>
          {connectionHistory.length > 0 ? (
            connectionHistory.map(entry => (
              <div key={entry.id} className={styles.historyItem}>
                <span className={`${styles.historyIcon} ${
                  entry.type === 'success' ? styles.iconSuccess :
                  entry.type === 'error' ? styles.iconError :
                  styles.iconInfo
                }`}>
                  {entry.type === 'success' ? 'âœ“' : entry.type === 'error' ? 'âœ—' : 'â„¹'}
                </span>
                <span className={styles.historyMessage}>{entry.message}</span>
                <span className={styles.historyTime}>
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          ) : (
            <div className={styles.emptyHistory}>
              No connection history yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
