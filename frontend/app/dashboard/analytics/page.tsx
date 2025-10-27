'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import styles from './analytics.module.css'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface PerformanceMetrics {
  totalPnL: number
  winRate: number
  sharpeRatio: number
  maxDrawdown: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  averageWin: number
  averageLoss: number
  profitFactor: number
  bestTrade: number
  worstTrade: number
}

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    totalPnL: 0,
    winRate: 0,
    sharpeRatio: 0,
    maxDrawdown: 0,
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    averageWin: 0,
    averageLoss: 0,
    profitFactor: 0,
    bestTrade: 0,
    worstTrade: 0
  })
  const [loading, setLoading] = useState(true)
  const [equityData, setEquityData] = useState<any[]>([])
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [strategyData, setStrategyData] = useState<any[]>([])

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const [metricsRes, equityRes, monthlyRes, strategyRes] = await Promise.all([
        axios.get(`${API_URL}/api/v1/analytics/metrics`),
        axios.get(`${API_URL}/api/v1/analytics/equity-curve`),
        axios.get(`${API_URL}/api/v1/analytics/monthly-performance`),
        axios.get(`${API_URL}/api/v1/analytics/strategy-performance`)
      ])

      setMetrics(metricsRes.data)
      setEquityData(equityRes.data)
      setMonthlyData(monthlyRes.data)
      setStrategyData(strategyRes.data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching analytics:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading analytics...</p>
      </div>
    )
  }

  return (
    <div className={styles.analyticsPage}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>📊 Trading Analytics</h1>
          <p className={styles.pageSubtitle}>Comprehensive performance analysis and insights</p>
        </div>
      </div>

      {/* Performance Summary Cards */}
      <div className={styles.summaryGrid}>
        <MetricCard
          title="Total P&L"
          value={`$${metrics.totalPnL.toFixed(2)}`}
          change={((metrics.totalPnL / 100000) * 100).toFixed(2)}
          icon="💰"
          positive={metrics.totalPnL >= 0}
        />
        <MetricCard
          title="Win Rate"
          value={`${metrics.winRate.toFixed(1)}%`}
          subtitle={`${metrics.winningTrades}W / ${metrics.losingTrades}L`}
          icon="🎯"
          positive={metrics.winRate >= 50}
        />
        <MetricCard
          title="Sharpe Ratio"
          value={metrics.sharpeRatio.toFixed(2)}
          subtitle="Risk-adjusted return"
          icon="📈"
          positive={metrics.sharpeRatio >= 1}
        />
        <MetricCard
          title="Max Drawdown"
          value={`${metrics.maxDrawdown.toFixed(2)}%`}
          subtitle="Largest peak-to-trough"
          icon="📉"
          positive={metrics.maxDrawdown <= -10}
          inverse={true}
        />
      </div>

      {/* Detailed Metrics */}
      <div className={styles.detailedMetrics}>
        <div className={`${styles.metricsPanel} glass-light`}>
          <h3 className={styles.panelTitle}>Trade Statistics</h3>
          <div className={styles.metricsList}>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Total Trades</span>
              <span className={styles.metricValue}>{metrics.totalTrades}</span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Winning Trades</span>
              <span className={`${styles.metricValue} ${styles.positive}`}>{metrics.winningTrades}</span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Losing Trades</span>
              <span className={`${styles.metricValue} ${styles.negative}`}>{metrics.losingTrades}</span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Average Win</span>
              <span className={`${styles.metricValue} ${styles.positive}`}>
                ${metrics.averageWin.toFixed(2)}
              </span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Average Loss</span>
              <span className={`${styles.metricValue} ${styles.negative}`}>
                ${metrics.averageLoss.toFixed(2)}
              </span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Profit Factor</span>
              <span className={styles.metricValue}>{metrics.profitFactor.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className={`${styles.metricsPanel} glass-light`}>
          <h3 className={styles.panelTitle}>Best & Worst Trades</h3>
          <div className={styles.metricsList}>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Best Trade</span>
              <span className={`${styles.metricValue} ${styles.positive}`}>
                +${metrics.bestTrade.toFixed(2)}
              </span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Worst Trade</span>
              <span className={`${styles.metricValue} ${styles.negative}`}>
                ${metrics.worstTrade.toFixed(2)}
              </span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Risk/Reward Ratio</span>
              <span className={styles.metricValue}>
                {(Math.abs(metrics.averageWin / metrics.averageLoss) || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className={styles.chartsGrid}>
        {/* Equity Curve Placeholder */}
        <div className={`${styles.chartPanel} glass-light`}>
          <h3 className={styles.panelTitle}>📈 Equity Curve</h3>
          <div className={styles.chartPlaceholder}>
            <p>Equity curve chart</p>
            <p className={styles.chartNote}>(Install recharts to render)</p>
          </div>
        </div>

        {/* Monthly Heatmap Placeholder */}
        <div className={`${styles.chartPanel} glass-light`}>
          <h3 className={styles.panelTitle}>📅 Monthly Performance</h3>
          <div className={styles.heatmapGrid}>
            {[...Array(12)].map((_, i) => (
              <div key={i} className={styles.heatmapCell} style={{
                backgroundColor: Math.random() > 0.5 
                  ? 'rgba(34, 197, 94, 0.3)' 
                  : 'rgba(239, 68, 68, 0.3)'
              }}>
                <span className={styles.heatmapValue}>
                  {Math.floor(Math.random() * 2000 - 1000)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Strategy Comparison */}
      <div className={`${styles.strategySection} glass-light`}>
        <h3 className={styles.panelTitle}>🎯 Strategy Performance Comparison</h3>
        <div className={styles.strategyGrid}>
          {strategyData.length > 0 ? (
            strategyData.map((strategy, idx) => (
              <div key={idx} className={styles.strategyCard}>
                <div className={styles.strategyHeader}>
                  <h4 className={styles.strategyName}>{strategy.name}</h4>
                  <span className={`${styles.statusBadge} ${
                    strategy.pnl >= 0 ? styles.positive : styles.negative
                  }`}>
                    {strategy.pnl >= 0 ? '📈' : '📉'} ${strategy.pnl.toFixed(2)}
                  </span>
                </div>
                <div className={styles.strategyMetrics}>
                  <div className={styles.strategyMetric}>
                    <span>Win Rate:</span>
                    <span className={styles.value}>{strategy.winRate.toFixed(1)}%</span>
                  </div>
                  <div className={styles.strategyMetric}>
                    <span>Trades:</span>
                    <span className={styles.value}>{strategy.trades}</span>
                  </div>
                  <div className={styles.strategyMetric}>
                    <span>Avg Trade:</span>
                    <span className={styles.value}>${strategy.avgTrade.toFixed(2)}</span>
                  </div>
                </div>
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill}
                    style={{ 
                      width: `${strategy.winRate}%`,
                      background: strategy.winRate >= 50 
                        ? 'linear-gradient(90deg, #10b981, #22c55e)'
                        : 'linear-gradient(90deg, #ef4444, #f43f5e)'
                    }}
                  ></div>
                </div>
              </div>
            ))
          ) : (
            <p className={styles.emptyState}>No strategy data available</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Metric Card Component
function MetricCard({ title, value, change, subtitle, icon, positive, inverse }: any) {
  return (
    <div className={`${styles.metricCard} glass-light`}>
      <div className={styles.cardHeader}>
        <span className={styles.cardIcon}>{icon}</span>
        <h3 className={styles.cardTitle}>{title}</h3>
      </div>
      <p className={`${styles.cardValue} ${
        positive ? (inverse ? styles.negative : styles.positive) : 
        (inverse ? styles.positive : styles.negative)
      }`}>
        {value}
      </p>
      {change && (
        <p className={`${styles.cardChange} ${positive ? styles.positive : styles.negative}`}>
          {positive ? '+' : ''}{change}% from initial
        </p>
      )}
      {subtitle && (
        <p className={styles.cardSubtitle}>{subtitle}</p>
      )}
    </div>
  )
}
