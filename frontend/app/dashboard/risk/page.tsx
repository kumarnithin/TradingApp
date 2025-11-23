'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import styles from './risk.module.css'
import logger from '../../../utils/logger'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface RiskMetrics {
  accountBalance: number
  portfolioExposure: number
  dailyLoss: number
  dailyLossLimit: number
  marginUsed: number
  marginLimit: number
  maxDrawdown: number
  maxDrawdownLimit: number
  openPositions: number
  maxOpenPositions: number
}

interface Position {
  symbol: string
  quantity: number
  entryPrice: number
  currentPrice: number
  positionSize: number
  stopLoss: number
  riskAmount: number
  riskPercent: number
}

export default function RiskPage() {
  const [metrics, setMetrics] = useState<RiskMetrics>({
    accountBalance: 100000,
    portfolioExposure: 35000,
    dailyLoss: -520,
    dailyLossLimit: -2000,
    marginUsed: 45,
    marginLimit: 100,
    maxDrawdown: -8.5,
    maxDrawdownLimit: -20,
    openPositions: 3,
    maxOpenPositions: 5
  })

  const [riskRatio, setRiskRatio] = useState(2) // Risk % per trade
  const [stopLossDistance, setStopLossDistance] = useState(5) // %
  const [calculatedSize, setCalculatedSize] = useState(0)
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState<any[]>([])

  useEffect(() => {
    fetchRiskData()
    generateAlerts()
  }, [])

  const fetchRiskData = async () => {
    try {
      const [metricsRes, positionsRes] = await Promise.all([
        axios.get(`${API_URL}/api/v1/risk/metrics`),
        axios.get(`${API_URL}/api/v1/risk/positions`)
      ])
      setMetrics(metricsRes.data)
      setPositions(positionsRes.data)
      setLoading(false)
    } catch (error) {
      logger.error('Error fetching risk data:', error)
      setLoading(false)
    }
  }

  const calculatePositionSize = () => {
    // Formula: Position Size = (Risk % * Account Balance) / (Stop Loss % * Entry Price)
    const riskAmount = (riskRatio / 100) * metrics.accountBalance
    const riskPerShare = (stopLossDistance / 100)
    const size = Math.floor(riskAmount / riskPerShare)
    setCalculatedSize(size)
  }

  const generateAlerts = () => {
    const newAlerts: any[] = []

    if (metrics.dailyLoss < metrics.dailyLossLimit) {
      newAlerts.push({
        type: 'error',
        title: 'Daily Loss Limit',
        message: `Daily loss of $${Math.abs(metrics.dailyLoss)} exceeded limit of $${Math.abs(metrics.dailyLossLimit)}`
      })
    }

    if (metrics.marginUsed > 80) {
      newAlerts.push({
        type: 'warning',
        title: 'High Margin Usage',
        message: `Margin usage at ${metrics.marginUsed}%. Recommended max: 50%`
      })
    }

    if (metrics.openPositions >= metrics.maxOpenPositions) {
      newAlerts.push({
        type: 'warning',
        title: 'Max Positions Reached',
        message: `${metrics.openPositions} open positions. No new trades recommended.`
      })
    }

    if (metrics.maxDrawdown < metrics.maxDrawdownLimit) {
      newAlerts.push({
        type: 'error',
        title: 'Max Drawdown Exceeded',
        message: `Current drawdown ${metrics.maxDrawdown}% exceeds limit ${metrics.maxDrawdownLimit}%`
      })
    }

    setAlerts(newAlerts)
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading risk metrics...</p>
      </div>
    )
  }

  const exposurePercent = (metrics.portfolioExposure / metrics.accountBalance) * 100
  const dailyLossPercent = (Math.abs(metrics.dailyLoss) / metrics.accountBalance) * 100
  const marginPercent = metrics.marginUsed
  const drawdownPercent = Math.abs(metrics.maxDrawdown) / Math.abs(metrics.maxDrawdownLimit) * 100

  return (
    <div className={styles.riskPage}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>⚠️ Risk Management</h1>
          <p className={styles.pageSubtitle}>Monitor and control trading risk in real-time</p>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className={styles.alertsSection}>
          {alerts.map((alert, idx) => (
            <div key={idx} className={`${styles.alert} ${styles[`alert_${alert.type}`]}`}>
              <span className={styles.alertIcon}>
                {alert.type === 'error' ? '🚨' : '⚠️'}
              </span>
              <div className={styles.alertContent}>
                <h4 className={styles.alertTitle}>{alert.title}</h4>
                <p className={styles.alertMessage}>{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Risk Overview Cards */}
      <div className={styles.riskGrid}>
        <RiskCard
          title="Portfolio Exposure"
          value={`$${metrics.portfolioExposure.toLocaleString()}`}
          percent={exposurePercent.toFixed(1)}
          limit={`$${metrics.accountBalance.toLocaleString()}`}
          icon="📊"
          status={exposurePercent > 80 ? 'warning' : 'good'}
        />
        <RiskCard
          title="Daily Loss"
          value={`$${metrics.dailyLoss.toFixed(2)}`}
          percent={dailyLossPercent.toFixed(1)}
          limit={`$${Math.abs(metrics.dailyLossLimit).toFixed(2)}`}
          icon="📉"
          status={metrics.dailyLoss < metrics.dailyLossLimit ? 'danger' : 'good'}
        />
        <RiskCard
          title="Margin Usage"
          value={`${metrics.marginUsed}%`}
          percent={marginPercent.toFixed(1)}
          limit="100%"
          icon="💰"
          status={metrics.marginUsed > 80 ? 'warning' : 'good'}
        />
        <RiskCard
          title="Max Drawdown"
          value={`${metrics.maxDrawdown.toFixed(2)}%`}
          percent={drawdownPercent.toFixed(1)}
          limit={`${metrics.maxDrawdownLimit}%`}
          icon="📈"
          status={metrics.maxDrawdown < metrics.maxDrawdownLimit ? 'danger' : 'good'}
        />
      </div>

      {/* Position Size Calculator */}
      <div className={`${styles.calculator} glass-light`}>
        <h3 className={styles.panelTitle}>📐 Position Size Calculator</h3>
        <div className={styles.calcGrid}>
          <div className={styles.calcInput}>
            <label>Account Balance</label>
            <input 
              type="text" 
              value={`$${metrics.accountBalance.toLocaleString()}`}
              disabled
              className={styles.input}
            />
          </div>
          <div className={styles.calcInput}>
            <label>Risk Per Trade (%)</label>
            <input 
              type="number" 
              value={riskRatio}
              onChange={(e) => setRiskRatio(parseFloat(e.target.value))}
              className={styles.input}
              step="0.1"
              min="0.1"
              max="5"
            />
          </div>
          <div className={styles.calcInput}>
            <label>Stop Loss Distance (%)</label>
            <input 
              type="number" 
              value={stopLossDistance}
              onChange={(e) => setStopLossDistance(parseFloat(e.target.value))}
              className={styles.input}
              step="0.1"
              min="0.1"
              max="20"
            />
          </div>
          <button className={styles.calcButton} onClick={calculatePositionSize}>
            Calculate
          </button>
        </div>

        {calculatedSize > 0 && (
          <div className={styles.calcResult}>
            <div className={styles.resultCard}>
              <span className={styles.resultLabel}>Risk Amount:</span>
              <span className={styles.resultValue}>
                ${((riskRatio / 100) * metrics.accountBalance).toFixed(2)}
              </span>
            </div>
            <div className={styles.resultCard}>
              <span className={styles.resultLabel}>Recommended Size:</span>
              <span className={styles.resultValue}>{calculatedSize} shares</span>
            </div>
            <div className={styles.resultCard}>
              <span className={styles.resultLabel}>Max Position Size:</span>
              <span className={styles.resultValue}>
                {Math.floor(metrics.accountBalance * 0.2 / stopLossDistance)} shares
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Risk Gauges */}
      <div className={styles.gaugesGrid}>
        <RiskGauge 
          title="Portfolio Exposure Limit"
          current={exposurePercent}
          limit={100}
          unit="%"
        />
        <RiskGauge 
          title="Daily Loss Limit"
          current={dailyLossPercent}
          limit={100}
          unit="%"
        />
        <RiskGauge 
          title="Margin Usage Limit"
          current={marginPercent}
          limit={100}
          unit="%"
        />
        <RiskGauge 
          title="Open Positions"
          current={metrics.openPositions}
          limit={metrics.maxOpenPositions}
          unit="positions"
        />
      </div>

      {/* Open Positions Risk Table */}
      <div className={`${styles.positionsTable} glass-light`}>
        <h3 className={styles.panelTitle}>📋 Open Positions Risk Analysis</h3>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Quantity</th>
                <th>Entry Price</th>
                <th>Current Price</th>
                <th>Stop Loss</th>
                <th>Risk Amount</th>
                <th>Risk %</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {positions.length > 0 ? (
                positions.map((pos, idx) => (
                  <tr key={idx}>
                    <td className={styles.symbol}>{pos.symbol}</td>
                    <td>{pos.quantity}</td>
                    <td>${pos.entryPrice.toFixed(2)}</td>
                    <td>${pos.currentPrice.toFixed(2)}</td>
                    <td>${pos.stopLoss.toFixed(2)}</td>
                    <td className={pos.riskAmount > 0 ? styles.negative : styles.positive}>
                      ${Math.abs(pos.riskAmount).toFixed(2)}
                    </td>
                    <td className={styles.riskPercent}>
                      {pos.riskPercent.toFixed(2)}%
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${
                        pos.riskPercent > 5 ? styles.high :
                        pos.riskPercent > 2 ? styles.medium :
                        styles.low
                      }`}>
                        {pos.riskPercent > 5 ? '🔴' : pos.riskPercent > 2 ? '🟡' : '🟢'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className={styles.emptyState}>
                    No open positions
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risk Guidelines */}
      <div className={`${styles.guidelines} glass-light`}>
        <h3 className={styles.panelTitle}>📚 Risk Management Guidelines</h3>
        <div className={styles.guidelinesGrid}>
          <div className={styles.guideline}>
            <h4>Position Sizing</h4>
            <p>Risk only 1-2% per trade. Use stop loss to limit downside.</p>
          </div>
          <div className={styles.guideline}>
            <h4>Margin Safety</h4>
            <p>Keep margin usage below 50%. Avoid over-leveraging.</p>
          </div>
          <div className={styles.guideline}>
            <h4>Daily Limits</h4>
            <p>Set daily loss limits. Stop trading if limit exceeded.</p>
          </div>
          <div className={styles.guideline}>
            <h4>Diversification</h4>
            <p>Limit positions per symbol. Max 5-10 open trades.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Risk Card Component
function RiskCard({ title, value, percent, limit, icon, status }: any) {
  return (
    <div className={`${styles.riskCard} glass-light`}>
      <div className={styles.cardTop}>
        <span className={styles.cardIcon}>{icon}</span>
        <h3 className={styles.cardTitle}>{title}</h3>
      </div>
      <p className={`${styles.cardValue} ${styles[`status_${status}`]}`}>
        {value}
      </p>
      <div className={styles.progressBar}>
        <div 
          className={`${styles.progressFill} ${styles[`fill_${status}`]}`}
          style={{ width: `${Math.min(parseFloat(percent), 100)}%` }}
        ></div>
      </div>
      <p className={styles.cardLabel}>
        {percent}% of limit ({limit})
      </p>
    </div>
  )
}

// Risk Gauge Component
function RiskGauge({ title, current, limit, unit }: any) {
  const percent = (current / limit) * 100
  const status = percent > 80 ? 'danger' : percent > 50 ? 'warning' : 'good'

  return (
    <div className={`${styles.gauge} glass-light`}>
      <h4 className={styles.gaugeTitle}>{title}</h4>
      <div className={styles.gaugeContainer}>
        <div className={styles.gaugeCircle}>
          <svg className={styles.gaugeCharts} viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" className={styles.gaugeBackground} />
            <circle 
              cx="50" 
              cy="50" 
              r="45" 
              className={`${styles.gaugeFill} ${styles[`gauge_${status}`]}`}
              style={{ 
                strokeDasharray: `${(percent / 100) * 283} 283`,
                strokeDashoffset: 0
              }}
            />
          </svg>
          <div className={styles.gaugeText}>
            <span className={styles.gaugeValue}>{current}</span>
            <span className={styles.gaugeUnit}>{unit}</span>
          </div>
        </div>
      </div>
      <p className={styles.gaugeLimit}>Limit: {limit} {unit}</p>
    </div>
  )
}
