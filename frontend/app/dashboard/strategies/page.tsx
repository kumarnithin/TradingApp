'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import styles from './strategies.module.css'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Strategy {
  id: string
  name: string
  description: string
  type: string
  status: 'ACTIVE' | 'PAUSED' | 'STOPPED'
  allocation: number // % of portfolio
  symbols: string[]
  parameters: Record<string, any>
  metrics: {
    pnl: number
    winRate: number
    trades: number
    bestTrade: number
    worstTrade: number
  }
  createdAt: string
  updatedAt: string
}

const STRATEGY_TEMPLATES = [
  {
    name: 'RSI Oversold',
    description: 'Buy when RSI < 30, Sell when RSI > 70',
    type: 'momentum',
    icon: '📈'
  },
  {
    name: 'MACD Crossover',
    description: 'Buy on bullish MACD crossover, sell on bearish',
    type: 'trend',
    icon: '📊'
  },
  {
    name: 'Support/Resistance',
    description: 'Buy at support levels, sell at resistance',
    type: 'levels',
    icon: '🎯'
  },
  {
    name: 'Breakout',
    description: 'Buy breakouts above resistance, sell below support',
    type: 'breakout',
    icon: '🚀'
  },
  {
    name: 'Mean Reversion',
    description: 'Trade reversions to moving average',
    type: 'reversion',
    icon: '↩️'
  },
  {
    name: 'Trend Following',
    description: 'Follow trend using moving average crossovers',
    type: 'trend',
    icon: '📈'
  }
]

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: '',
    allocation: 10,
    symbols: '' as any,
    parameters: {}
  })

  useEffect(() => {
    fetchStrategies()
  }, [])

  const fetchStrategies = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/strategies`)
      setStrategies(response.data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching strategies:', error)
      setLoading(false)
    }
  }

  const handleCreateStrategy = async () => {
    if (!formData.name || !formData.type) {
      alert('Please fill in required fields')
      return
    }

    try {
      await axios.post(`${API_URL}/api/v1/strategies`, {
        ...formData,
        symbols: formData.symbols.split(',').map((s: string) => s.trim().toUpperCase())
      })
      setFormData({
        name: '',
        description: '',
        type: '',
        allocation: 10,
        symbols: '',
        parameters: {}
      })
      setShowCreateModal(false)
      setSelectedTemplate('')
      fetchStrategies()
      alert('Strategy created successfully!')
    } catch (error) {
      console.error('Error creating strategy:', error)
      alert('Failed to create strategy')
    }
  }

  const handleToggleStrategy = async (strategyId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    try {
      await axios.patch(`${API_URL}/api/v1/strategies/${strategyId}`, { status: newStatus })
      fetchStrategies()
    } catch (error) {
      console.error('Error updating strategy:', error)
    }
  }

  const handleStopStrategy = async (strategyId: string) => {
    if (!confirm('Stop this strategy? It cannot be restarted.')) return
    try {
      await axios.patch(`${API_URL}/api/v1/strategies/${strategyId}`, { status: 'STOPPED' })
      fetchStrategies()
      alert('Strategy stopped')
    } catch (error) {
      console.error('Error stopping strategy:', error)
    }
  }

  const handleDeleteStrategy = async (strategyId: string) => {
    if (!confirm('Delete this strategy permanently?')) return
    try {
      await axios.delete(`${API_URL}/api/v1/strategies/${strategyId}`)
      fetchStrategies()
      alert('Strategy deleted')
    } catch (error) {
      console.error('Error deleting strategy:', error)
    }
  }

  const handleSelectTemplate = (template: typeof STRATEGY_TEMPLATES) => {
    setSelectedTemplate(template.type)
    setFormData({
      ...formData,
      name: template.name,
      description: template.description,
      type: template.type
    })
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading strategies...</p>
      </div>
    )
  }

  const activeStrategies = strategies.filter(s => s.status === 'ACTIVE').length
  const totalAllocation = strategies.reduce((sum, s) => sum + s.allocation, 0)
  const totalPnL = strategies.reduce((sum, s) => sum + s.metrics.pnl, 0)
  const avgWinRate = strategies.length > 0 
    ? (strategies.reduce((sum, s) => sum + s.metrics.winRate, 0) / strategies.length).toFixed(1)
    : 0

  return (
    <div className={styles.strategiesPage}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>🎯 Strategy Management</h1>
          <p className={styles.pageSubtitle}>Manage and scale multiple trading strategies</p>
        </div>
        <button className={styles.createButton} onClick={() => setShowCreateModal(true)}>
          + Create Strategy
        </button>
      </div>

      {/* Overview Cards */}
      <div className={styles.overviewGrid}>
        <div className={`${styles.overviewCard} glass-light`}>
          <div className={styles.cardValue}>{strategies.length}</div>
          <div className={styles.cardLabel}>Total Strategies</div>
        </div>
        <div className={`${styles.overviewCard} glass-light`}>
          <div className={styles.cardValue}>{activeStrategies}</div>
          <div className={styles.cardLabel}>Active</div>
        </div>
        <div className={`${styles.overviewCard} glass-light`}>
          <div className={styles.cardValue}>${totalPnL.toFixed(0)}</div>
          <div className={styles.cardLabel}>Combined P&L</div>
        </div>
        <div className={`${styles.overviewCard} glass-light`}>
          <div className={styles.cardValue}>{avgWinRate}%</div>
          <div className={styles.cardLabel}>Avg Win Rate</div>
        </div>
      </div>

      {/* Create Strategy Modal */}
      {showCreateModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Create New Strategy</h2>
              <button className={styles.closeButton} onClick={() => {
                setShowCreateModal(false)
                setSelectedTemplate('')
              }}>✕</button>
            </div>

            <div className={styles.modalBody}>
              {!selectedTemplate ? (
                <>
                  <h3 className={styles.stepTitle}>Step 1: Select Template</h3>
                  <div className={styles.templateGrid}>
                    {STRATEGY_TEMPLATES.map((template, idx) => (
                      <button
                        key={idx}
                        className={styles.templateCard}
                        onClick={() => handleSelectTemplate(template)}
                      >
                        <span className={styles.templateIcon}>{template.icon}</span>
                        <h4 className={styles.templateName}>{template.name}</h4>
                        <p className={styles.templateDesc}>{template.description}</p>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h3 className={styles.stepTitle}>Step 2: Configure Strategy</h3>
                  
                  <div className={styles.formGroup}>
                    <label>Strategy Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className={styles.textarea}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Capital Allocation (% of portfolio)</label>
                    <div className={styles.inputRange}>
                      <input
                        type="range"
                        value={formData.allocation}
                        onChange={(e) => setFormData({...formData, allocation: parseInt(e.target.value)})}
                        min="1"
                        max="100"
                        className={styles.rangeSlider}
                      />
                      <span className={styles.rangeValue}>{formData.allocation}%</span>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Symbols (comma-separated)</label>
                    <input
                      type="text"
                      value={formData.symbols}
                      onChange={(e) => setFormData({...formData, symbols: e.target.value})}
                      placeholder="e.g., AAPL, GOOGL, MSFT"
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.strategyParams}>
                    <h4>Strategy Parameters</h4>
                    <div className={styles.paramsGrid}>
                      {formData.type === 'momentum' && (
                        <>
                          <div className={styles.paramInput}>
                            <label>RSI Period</label>
                            <input type="number" defaultValue="14" min="5" max="50" />
                          </div>
                          <div className={styles.paramInput}>
                            <label>Oversold Level</label>
                            <input type="number" defaultValue="30" min="0" max="50" />
                          </div>
                          <div className={styles.paramInput}>
                            <label>Overbought Level</label>
                            <input type="number" defaultValue="70" min="50" max="100" />
                          </div>
                        </>
                      )}
                      {formData.type === 'trend' && (
                        <>
                          <div className={styles.paramInput}>
                            <label>Fast MA Period</label>
                            <input type="number" defaultValue="20" min="5" max="50" />
                          </div>
                          <div className={styles.paramInput}>
                            <label>Slow MA Period</label>
                            <input type="number" defaultValue="50" min="20" max="200" />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button 
                className={styles.btnCancel} 
                onClick={() => {
                  setShowCreateModal(false)
                  setSelectedTemplate('')
                }}
              >
                Cancel
              </button>
              {selectedTemplate && (
                <>
                  <button 
                    className={styles.btnBack} 
                    onClick={() => setSelectedTemplate('')}
                  >
                    ← Back
                  </button>
                  <button className={styles.btnCreate} onClick={handleCreateStrategy}>
                    Create Strategy
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Strategies Grid */}
      <div className={styles.strategiesGrid}>
        {strategies.length > 0 ? (
          strategies.map(strategy => (
            <div key={strategy.id} className={`${styles.strategyCard} glass-light`}>
              {/* Card Header */}
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <h3>{strategy.name}</h3>
                  <p className={styles.cardType}>{strategy.type.toUpperCase()}</p>
                </div>
                <span className={`${styles.statusBadge} ${styles[`status_${strategy.status.toLowerCase()}`]}`}>
                  {strategy.status}
                </span>
              </div>

              {/* Description */}
              <p className={styles.cardDesc}>{strategy.description}</p>

              {/* Metrics */}
              <div className={styles.metricsGrid}>
                <div className={styles.metricItem}>
                  <span className={styles.metricLabel}>P&L</span>
                  <span className={`${styles.metricValue} ${strategy.metrics.pnl >= 0 ? styles.positive : styles.negative}`}>
                    ${strategy.metrics.pnl.toFixed(0)}
                  </span>
                </div>
                <div className={styles.metricItem}>
                  <span className={styles.metricLabel}>Win Rate</span>
                  <span className={styles.metricValue}>{strategy.metrics.winRate.toFixed(1)}%</span>
                </div>
                <div className={styles.metricItem}>
                  <span className={styles.metricLabel}>Trades</span>
                  <span className={styles.metricValue}>{strategy.metrics.trades}</span>
                </div>
                <div className={styles.metricItem}>
                  <span className={styles.metricLabel}>Allocation</span>
                  <span className={styles.metricValue}>{strategy.allocation}%</span>
                </div>
              </div>

              {/* Symbols */}
              <div className={styles.symbols}>
                {strategy.symbols.map(symbol => (
                  <span key={symbol} className={styles.symbolBadge}>{symbol}</span>
                ))}
              </div>

              {/* Best/Worst */}
              <div className={styles.tradeStats}>
                <div>
                  <span className={styles.label}>Best:</span>
                  <span className={styles.positive}>+${strategy.metrics.bestTrade.toFixed(0)}</span>
                </div>
                <div>
                  <span className={styles.label}>Worst:</span>
                  <span className={styles.negative}>${strategy.metrics.worstTrade.toFixed(0)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className={styles.cardControls}>
                <button
                  className={`${styles.btnToggle} ${strategy.status === 'ACTIVE' ? styles.pauseBtn : styles.playBtn}`}
                  onClick={() => handleToggleStrategy(strategy.id, strategy.status)}
                  disabled={strategy.status === 'STOPPED'}
                >
                  {strategy.status === 'ACTIVE' ? '⏸ Pause' : '▶ Resume'}
                </button>
                <button
                  className={styles.btnStop}
                  onClick={() => handleStopStrategy(strategy.id)}
                  disabled={strategy.status === 'STOPPED'}
                >
                  ⏹ Stop
                </button>
                <button
                  className={styles.btnDelete}
                  onClick={() => handleDeleteStrategy(strategy.id)}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>
            <p>No strategies yet</p>
            <p className={styles.emptyHint}>Create a new strategy to get started</p>
          </div>
        )}
      </div>

      {/* Capital Allocation */}
      {strategies.length > 0 && (
        <div className={`${styles.allocationSection} glass-light`}>
          <h3 className={styles.sectionTitle}>📊 Capital Allocation</h3>
          <div className={styles.allocationGrid}>
            {strategies.map(strategy => (
              <div key={strategy.id} className={styles.allocationItem}>
                <div className={styles.allocationHeader}>
                  <span className={styles.strategyName}>{strategy.name}</span>
                  <span className={styles.allocationPercent}>{strategy.allocation}%</span>
                </div>
                <div className={styles.allocationBar}>
                  <div 
                    className={styles.allocationFill}
                    style={{ width: `${strategy.allocation}%` }}
                  ></div>
                </div>
              </div>
            ))}
            <div className={styles.totalAllocation}>
              <span>Total Allocation:</span>
              <span className={totalAllocation === 100 ? styles.perfect : styles.warning}>
                {totalAllocation}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
