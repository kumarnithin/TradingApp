'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import styles from './alerts.module.css'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Alert {
  id: string
  type: 'PRICE' | 'TRADE' | 'ACCOUNT' | 'STRATEGY'
  title: string
  description: string
  condition: string
  value: string
  symbol?: string
  enabled: boolean
  channels: string[] // 'in_app', 'email', 'sound'
  createdAt: string
  lastTriggered?: string
  triggerCount: number
}

interface AlertHistory {
  id: string
  alertId: string
  title: string
  message: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  triggeredAt: string
  read: boolean
}

const ALERT_TYPES = [
  { value: 'PRICE', label: 'Price Alert', icon: '💰', color: '#8AB4F8' },
  { value: 'TRADE', label: 'Trade Alert', icon: '📊', color: '#22c55e' },
  { value: 'ACCOUNT', label: 'Account Alert', icon: '⚠️', color: '#f97316' },
  { value: 'STRATEGY', label: 'Strategy Alert', icon: '🎯', color: '#a855f7' }
]

const PRICE_CONDITIONS = [
  { value: 'above', label: 'Price >= (Above)' },
  { value: 'below', label: 'Price <= (Below)' },
  { value: 'change', label: 'Price Change %' }
]

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [alertHistory, setAlertHistory] = useState<AlertHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  // Form state
  const [formData, setFormData] = useState({
    type: 'PRICE',
    title: '',
    description: '',
    symbol: '',
    condition: 'above',
    value: '',
    channels: ['in_app'] as string[]
  })

  useEffect(() => {
    fetchAlerts()
    fetchAlertHistory()
    // Setup real-time polling for alerts
    const interval = setInterval(() => {
      fetchAlertHistory()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchAlerts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/alerts`)
      setAlerts(response.data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching alerts:', error)
      setLoading(false)
    }
  }

  const fetchAlertHistory = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/alerts/history?limit=50`)
      setAlertHistory(response.data)
      const unread = response.data.filter((h: AlertHistory) => !h.read).length
      setUnreadCount(unread)
    } catch (error) {
      console.error('Error fetching alert history:', error)
    }
  }

  const handleCreateAlert = async () => {
    if (!formData.title || !formData.value) {
      alert('Please fill in all required fields')
      return
    }

    try {
      await axios.post(`${API_URL}/api/v1/alerts`, formData)
      setFormData({
        type: 'PRICE',
        title: '',
        description: '',
        symbol: '',
        condition: 'above',
        value: '',
        channels: ['in_app']
      })
      setShowCreateModal(false)
      fetchAlerts()
      alert('Alert created successfully!')
    } catch (error) {
      console.error('Error creating alert:', error)
      alert('Failed to create alert')
    }
  }

  const handleToggleAlert = async (alertId: string, enabled: boolean) => {
    try {
      await axios.patch(`${API_URL}/api/v1/alerts/${alertId}`, { enabled: !enabled })
      fetchAlerts()
    } catch (error) {
      console.error('Error toggling alert:', error)
    }
  }

  const handleDeleteAlert = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) return

    try {
      await axios.delete(`${API_URL}/api/v1/alerts/${alertId}`)
      fetchAlerts()
      alert('Alert deleted successfully!')
    } catch (error) {
      console.error('Error deleting alert:', error)
    }
  }

  const handleMarkAsRead = async (historyId: string) => {
    try {
      await axios.patch(`${API_URL}/api/v1/alerts/history/${historyId}`, { read: true })
      fetchAlertHistory()
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const activeAlerts = alerts.filter(a => a.enabled).length
  const criticalAlerts = alertHistory.filter(h => h.severity === 'CRITICAL' && !h.read).length

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading alerts...</p>
      </div>
    )
  }

  return (
    <div className={styles.alertsPage}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>🔔 Alert Management</h1>
          <p className={styles.pageSubtitle}>Create and monitor trading alerts</p>
        </div>
        <button className={styles.createButton} onClick={() => setShowCreateModal(true)}>
          + Create Alert
        </button>
      </div>

      {/* Overview Cards */}
      <div className={styles.overviewGrid}>
        <div className={`${styles.overviewCard} glass-light`}>
          <div className={styles.cardValue}>{alerts.length}</div>
          <div className={styles.cardLabel}>Total Alerts</div>
        </div>
        <div className={`${styles.overviewCard} glass-light`}>
          <div className={styles.cardValue}>{activeAlerts}</div>
          <div className={styles.cardLabel}>Active</div>
        </div>
        <div className={`${styles.overviewCard} glass-light`}>
          <div className={styles.cardValue}>{unreadCount}</div>
          <div className={styles.cardLabel}>Unread Notifications</div>
        </div>
        <div className={`${styles.overviewCard} glass-light`}>
          <div className={styles.cardValue}>{criticalAlerts}</div>
          <div className={styles.cardLabel}>Critical Alerts</div>
        </div>
      </div>

      {/* Create Alert Modal */}
      {showCreateModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Create New Alert</h2>
              <button className={styles.closeButton} onClick={() => setShowCreateModal(false)}>✕</button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Alert Type</label>
                <div className={styles.typeGrid}>
                  {ALERT_TYPES.map(type => (
                    <button
                      key={type.value}
                      className={`${styles.typeButton} ${formData.type === type.value ? styles.selected : ''}`}
                      onClick={() => setFormData({...formData, type: type.value as any})}
                    >
                      <span>{type.icon}</span>
                      <span>{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Alert Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g., AAPL Price Alert"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Optional description"
                  className={styles.textarea}
                />
              </div>

              {formData.type === 'PRICE' && (
                <>
                  <div className={styles.formGroup}>
                    <label>Symbol *</label>
                    <input
                      type="text"
                      value={formData.symbol}
                      onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
                      placeholder="e.g., AAPL"
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Condition</label>
                    <select
                      value={formData.condition}
                      onChange={(e) => setFormData({...formData, condition: e.target.value})}
                      className={styles.select}
                    >
                      {PRICE_CONDITIONS.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Target Value *</label>
                    <input
                      type="number"
                      value={formData.value}
                      onChange={(e) => setFormData({...formData, value: e.target.value})}
                      placeholder="e.g., 150.50"
                      step="0.01"
                      className={styles.input}
                    />
                  </div>
                </>
              )}

              {formData.type === 'TRADE' && (
                <div className={styles.formGroup}>
                  <label>Trigger Condition *</label>
                  <select
                    value={formData.value}
                    onChange={(e) => setFormData({...formData, value: e.target.value})}
                    className={styles.select}
                  >
                    <option value="">Select...</option>
                    <option value="signal_received">New Signal Received</option>
                    <option value="trade_executed">Trade Executed</option>
                    <option value="take_profit">Take Profit Hit</option>
                    <option value="stop_loss">Stop Loss Hit</option>
                  </select>
                </div>
              )}

              {formData.type === 'ACCOUNT' && (
                <div className={styles.formGroup}>
                  <label>Alert Condition *</label>
                  <select
                    value={formData.value}
                    onChange={(e) => setFormData({...formData, value: e.target.value})}
                    className={styles.select}
                  >
                    <option value="">Select...</option>
                    <option value="daily_loss">Daily Loss Exceeded</option>
                    <option value="margin_warning">Margin Usage High</option>
                    <option value="connection_lost">Connection Lost</option>
                    <option value="max_dd">Max Drawdown Exceeded</option>
                  </select>
                </div>
              )}

              <div className={styles.formGroup}>
                <label>Notification Channels</label>
                <div className={styles.channelCheckboxes}>
                  {['in_app', 'email', 'sound'].map(channel => (
                    <label key={channel} className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={formData.channels.includes(channel)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              channels: [...formData.channels, channel]
                            })
                          } else {
                            setFormData({
                              ...formData,
                              channels: formData.channels.filter(c => c !== channel)
                            })
                          }
                        }}
                      />
                      <span>
                        {channel === 'in_app' && '🌐 In-App'}
                        {channel === 'email' && '📧 Email'}
                        {channel === 'sound' && '🔊 Sound'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button className={styles.btnCreate} onClick={handleCreateAlert}>
                Create Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Alerts */}
      <div className={`${styles.section} glass-light`}>
        <h2 className={styles.sectionTitle}>📍 Active Alerts</h2>
        {alerts.filter(a => a.enabled).length > 0 ? (
          <div className={styles.alertsList}>
            {alerts.filter(a => a.enabled).map(alert => (
              <div key={alert.id} className={styles.alertItem}>
                <div className={styles.alertLeft}>
                  <div className={styles.alertTypeIcon}>
                    {ALERT_TYPES.find(t => t.value === alert.type)?.icon}
                  </div>
                  <div className={styles.alertInfo}>
                    <h4 className={styles.alertTitle}>{alert.title}</h4>
                    <p className={styles.alertDesc}>{alert.description || 'No description'}</p>
                    <p className={styles.alertCondition}>
                      {alert.condition} | Triggered {alert.triggerCount} times
                    </p>
                  </div>
                </div>
                <div className={styles.alertRight}>
                  <div className={styles.alertChannels}>
                    {alert.channels.map(c => (
                      <span key={c} className={styles.channelBadge}>
                        {c === 'in_app' && '🌐'}
                        {c === 'email' && '📧'}
                        {c === 'sound' && '🔊'}
                      </span>
                    ))}
                  </div>
                  <div className={styles.alertActions}>
                    <button
                      className={styles.btnToggle}
                      onClick={() => handleToggleAlert(alert.id, alert.enabled)}
                    >
                      ⏸ Pause
                    </button>
                    <button
                      className={styles.btnDelete}
                      onClick={() => handleDeleteAlert(alert.id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyState}>No active alerts. Create one to get started!</p>
        )}
      </div>

      {/* Inactive Alerts */}
      {alerts.filter(a => !a.enabled).length > 0 && (
        <div className={`${styles.section} glass-light`}>
          <h2 className={styles.sectionTitle}>⏸️ Inactive Alerts</h2>
          <div className={styles.alertsList}>
            {alerts.filter(a => !a.enabled).map(alert => (
              <div key={alert.id} className={`${styles.alertItem} ${styles.inactive}`}>
                <div className={styles.alertLeft}>
                  <div className={styles.alertTypeIcon}>
                    {ALERT_TYPES.find(t => t.value === alert.type)?.icon}
                  </div>
                  <div className={styles.alertInfo}>
                    <h4 className={styles.alertTitle}>{alert.title}</h4>
                    <p className={styles.alertCondition}>{alert.condition}</p>
                  </div>
                </div>
                <button
                  className={styles.btnReactivate}
                  onClick={() => handleToggleAlert(alert.id, alert.enabled)}
                >
                  ▶ Activate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alert History */}
      <div className={`${styles.section} glass-light`}>
        <h2 className={styles.sectionTitle}>📜 Alert History (Last 50)</h2>
        {alertHistory.length > 0 ? (
          <div className={styles.historyList}>
            {alertHistory.map(history => (
              <div
                key={history.id}
                className={`${styles.historyItem} ${!history.read ? styles.unread : ''}`}
              >
                <div className={styles.historyLeft}>
                  <span className={`${styles.severityIcon} ${styles[`severity_${history.severity.toLowerCase()}`]}`}>
                    {history.severity === 'CRITICAL' && '🚨'}
                    {history.severity === 'WARNING' && '⚠️'}
                    {history.severity === 'INFO' && 'ℹ️'}
                  </span>
                  <div>
                    <h5 className={styles.historyTitle}>{history.title}</h5>
                    <p className={styles.historyMessage}>{history.message}</p>
                    <p className={styles.historyTime}>
                      {new Date(history.triggeredAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                {!history.read && (
                  <button
                    className={styles.btnMarkRead}
                    onClick={() => handleMarkAsRead(history.id)}
                  >
                    ✓ Mark Read
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyState}>No alert history yet</p>
        )}
      </div>
    </div>
  )
}
