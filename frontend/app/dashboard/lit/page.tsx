'use client'

import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import styles from './lit.module.css'
import logger from '../../../utils/logger'

// Import all LIT components
import OrderFlowDashboard from './components/OrderFlowDashboard'
import SpoofingDetector from './components/SpoofingDetector'
import AccumulationDetector from './components/AccumulationDetector'
import IcebergDetector from './components/IcebergDetector'
import MicrostructureAnalysis from './components/MicrostructureAnalysis'
import DarkPoolMonitor from './components/DarkPoolMonitor'
import LiquidityHeatMap from './components/LiquidityHeatMap'
import OrderFlowPrediction from './components/OrderFlowPrediction'
import SmartExecution from './components/SmartExecution'
import AlertsPanel from './components/AlertsPanel'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface LITMetrics {
  orderFlow: unknown
  spoofing: unknown
  accumulation: unknown
  iceberg: unknown
  microstructure: unknown
  darkPool: unknown
  liquidity: unknown
  prediction: unknown
  execution: unknown
}

export default function LITPage() {
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL')
  const [activeTab, setActiveTab] = useState('overview')
  const [litMetrics, setLitMetrics] = useState<LITMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState<unknown[]>([
    { type: 'SPOOFING', message: 'Potential spoofing detected at $150.25', confidence: 85, time: '13:45' },
    { type: 'ACCUMULATION', message: 'Institutional accumulation phase detected', confidence: 78, time: '13:40' },
    { type: 'ICEBERG', message: 'Hidden iceberg order detected: ~50K shares', confidence: 92, time: '13:35' }
  ])

  const fetchLITData = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/lit/metrics/${selectedSymbol}`)
      setLitMetrics(response.data)
      setLoading(false)
    } catch (error) {
      logger.error('Error fetching LIT data:', error)
      // Use mock data if API fails
      setLitMetrics({
        orderFlow: {
          bidVolume: 125000,
          askVolume: 98000,
          bidAskRatio: 1.27,
          largeOrdersCount: 5,
          cumulativeDelta: 2800,
          vwap: 150.25,
          orderBookImbalance: 0.65,
          liquidityScore: 78
        },
        spoofing: {
          riskLevel: 45,
          suspiciousOrders: 8,
          layeringDetected: 2,
          washTradesDetected: 1,
          recentAlerts: [
            { id: 1, type: 'LAYERING', confidence: 92, time: '13:45' },
            { id: 2, type: 'SPOOFING', confidence: 78, time: '13:42' },
            { id: 3, type: 'WASH_TRADE', confidence: 65, time: '13:40' }
          ]
        },
        accumulation: {
          phase: 'ACCUMULATION',
          confidence: 78,
          institutionalBuyVolume: 450000,
          institutionalSellVolume: 120000,
          volumeInPhase: 1200000,
          priceChange: 2.35,
          estimatedTargetPrice: 155.50,
          whaleMovementsDetected: 3
        },
        iceberg: {
          icebergsDetected: 4,
          totalHiddenQuantity: 250000,
          visibleLiquidity: 85000,
          estimatedTotalSize: 335000,
          detectedOrders: [
            { id: 1, price: 150.25, visible: 10000, estimated: 50000, refreshRate: 250 },
            { id: 2, price: 150.50, visible: 20000, estimated: 75000, refreshRate: 300 }
          ]
        },
        microstructure: {
          bidAskSpread: 0.02,
          spreadCompression: false,
          quoteChangeRate: 45,
          quotingActivity: 'HIGH',
          lastTradeSize: 5200,
          tradeIntensity: 87,
          volatilityRegime: 'NORMAL',
          orderImbalanceRatio: 1.35
        },
        darkPool: {
          darkPoolVolume: 450000,
          darkPoolBuyVolume: 275000,
          darkPoolSellVolume: 175000,
          darkPoolVwap: 150.30,
          volumePctDarkpool: 22,
          executedAtPremium: 0.08,
          blockTradesDetected: 3
        },
        liquidity: { score: 78 },
        prediction: {
          nextMoveDirection: 'UP',
          confidence: 78,
          expectedMagnitude: 1.25,
          timeToMove: 45,
          buyPressure: 72,
          sellPressure: 28,
          orderFlowImbalance: 0.72,
          predictedVolumeSpike: true,
          estimatedSpike: 2300000
        },
        execution: {
          strategy: 'VWAP',
          targetSize: 100000,
          executedVolume: 67500,
          executionPercentage: 67.5,
          averageExecutionPrice: 150.18,
          vwap: 150.15,
          slippageAchieved: 0.03,
          maxSlippage: 0.15,
          participationRate: 8.5,
          estimatedTimeRemaining: 340
        }
      })
      setLoading(false)
    }
  }, [selectedSymbol])

  useEffect(() => {
    let mounted = true
    const run = async () => {
      await fetchLITData()
    }
    run()
    const interval = setInterval(() => { if (mounted) run() }, 1000)
    return () => { mounted = false; clearInterval(interval) }
  }, [fetchLITData])

  const clearAlerts = () => {
    setAlerts([])
  }

  const tabs = [
    { id: 'overview', label: '📊 Overview', icon: '📊' },
    { id: 'orderflow', label: '💰 Order Flow', icon: '💰' },
    { id: 'spoofing', label: '🔍 Spoofing', icon: '🔍' },
    { id: 'accumulation', label: '🏦 Accumulation', icon: '🏦' },
    { id: 'iceberg', label: '🧊 Iceberg', icon: '🧊' },
    { id: 'microstructure', label: '🔬 Microstructure', icon: '🔬' },
    { id: 'darkpool', label: '👻 Dark Pool', icon: '👻' },
    { id: 'liquidity', label: '🔥 Liquidity Map', icon: '🔥' },
    { id: 'prediction', label: '🤖 Prediction', icon: '🤖' },
    { id: 'execution', label: '⚡ Execution', icon: '⚡' }
  ]

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading LIT Metrics...</p>
      </div>
    )
  }

  return (
    <div className={styles.litPage}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>🎯 LIT Trading Suite</h1>
          <p className={styles.pageSubtitle}>Liquidity Inducement Theorem - Professional Order Flow Analysis</p>
        </div>
        <div className={styles.headerControls}>
          <select 
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className={styles.symbolSelect}
          >
            <option>AAPL</option>
            <option>GOOGL</option>
            <option>MSFT</option>
            <option>TSLA</option>
            <option>SPY</option>
            <option>QQQ</option>
          </select>
        </div>
      </div>

      {/* Status Bar */}
      <div className={styles.statusBar}>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>Order Flow Status:</span>
          <span className={`${styles.statusValue} ${litMetrics?.prediction?.nextMoveDirection === 'UP' ? styles.bullish : styles.bearish}`}>
            {litMetrics?.prediction?.nextMoveDirection} ({litMetrics?.prediction?.confidence}%)
          </span>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>Spoofing Risk:</span>
          <span className={`${styles.statusValue} ${litMetrics?.spoofing?.riskLevel > 70 ? styles.critical : styles.normal}`}>
            {litMetrics?.spoofing?.riskLevel}%
          </span>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>Liquidity Score:</span>
          <span className={styles.statusValue}>{litMetrics?.liquidity?.score}/100</span>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>Active Alerts:</span>
          <span className={`${styles.statusValue} ${alerts.length > 0 ? styles.critical : styles.normal}`}>
            {alerts.length}
          </span>
        </div>
      </div>

      {/* Alerts Panel */}
      {alerts.length > 0 && (
        <AlertsPanel alerts={alerts} onClear={clearAlerts} />
      )}

      {/* Navigation Tabs */}
      <div className={styles.tabsContainer}>
        <div className={styles.tabs}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className={styles.tabIcon}>{tab.icon}</span>
              <span className={styles.tabLabel}>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className={styles.contentArea}>
        {/* Overview Tab - All 10 features mini view */}
        {activeTab === 'overview' && litMetrics && (
          <div className={styles.overviewGrid}>
            <OrderFlowDashboard symbol={selectedSymbol} data={litMetrics.orderFlow} />
            <SpoofingDetector symbol={selectedSymbol} data={litMetrics.spoofing} />
            <AccumulationDetector symbol={selectedSymbol} data={litMetrics.accumulation} />
            <IcebergDetector symbol={selectedSymbol} data={litMetrics.iceberg} />
            <MicrostructureAnalysis symbol={selectedSymbol} data={litMetrics.microstructure} />
            <DarkPoolMonitor symbol={selectedSymbol} data={litMetrics.darkPool} />
          </div>
        )}

        {/* Individual Feature Tabs */}
        {activeTab === 'orderflow' && litMetrics && <OrderFlowDashboard symbol={selectedSymbol} data={litMetrics.orderFlow} fullscreen />}
        {activeTab === 'spoofing' && litMetrics && <SpoofingDetector symbol={selectedSymbol} data={litMetrics.spoofing} fullscreen />}
        {activeTab === 'accumulation' && litMetrics && <AccumulationDetector symbol={selectedSymbol} data={litMetrics.accumulation} fullscreen />}
        {activeTab === 'iceberg' && litMetrics && <IcebergDetector symbol={selectedSymbol} data={litMetrics.iceberg} fullscreen />}
        {activeTab === 'microstructure' && litMetrics && <MicrostructureAnalysis symbol={selectedSymbol} data={litMetrics.microstructure} fullscreen />}
        {activeTab === 'darkpool' && litMetrics && <DarkPoolMonitor symbol={selectedSymbol} data={litMetrics.darkPool} fullscreen />}
        {activeTab === 'liquidity' && litMetrics && <LiquidityHeatMap symbol={selectedSymbol} data={litMetrics.liquidity} />}
        {activeTab === 'prediction' && litMetrics && <OrderFlowPrediction symbol={selectedSymbol} data={litMetrics.prediction} />}
        {activeTab === 'execution' && litMetrics && <SmartExecution symbol={selectedSymbol} data={litMetrics.execution} />}
      </div>
    </div>
  )
}
