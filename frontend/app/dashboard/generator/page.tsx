'use client'

import { useState } from 'react'
import axios from 'axios'
import styles from './generator.module.css'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Asset data by class
const ASSETS = {
  STOCKS: [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corp' },
    { symbol: 'TSLA', name: 'Tesla Inc.' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'META', name: 'Meta Platforms' },
    { symbol: 'NVIDIA', name: 'NVIDIA Corp' },
    { symbol: 'SPY', name: 'S&P 500 ETF' },
  ],
  FOREX: [
    { symbol: 'EURUSD', name: 'Euro/US Dollar' },
    { symbol: 'GBPUSD', name: 'British Pound/USD' },
    { symbol: 'USDJPY', name: 'US Dollar/Japanese Yen' },
    { symbol: 'AUDUSD', name: 'Australian Dollar/USD' },
    { symbol: 'USDCAD', name: 'US Dollar/Canadian Dollar' },
    { symbol: 'USDCHF', name: 'US Dollar/Swiss Franc' },
    { symbol: 'NZDUSD', name: 'New Zealand Dollar/USD' },
    { symbol: 'EURJPY', name: 'Euro/Japanese Yen' },
  ],
  FUTURES: [
    { symbol: 'ES', name: 'E-mini S&P 500' },
    { symbol: 'NQ', name: 'E-mini NASDAQ' },
    { symbol: 'CL', name: 'WTI Crude Oil' },
    { symbol: 'NG', name: 'Natural Gas' },
    { symbol: 'GC', name: 'Gold' },
    { symbol: 'SI', name: 'Silver' },
    { symbol: 'YM', name: 'E-mini Dow' },
    { symbol: 'RTY', name: 'E-mini Russell 2000' },
  ],
  OPTIONS: [
    { symbol: 'AAPL_CALL', name: 'Apple Call Options' },
    { symbol: 'AAPL_PUT', name: 'Apple Put Options' },
    { symbol: 'SPY_CALL', name: 'SPY Call Options' },
    { symbol: 'SPY_PUT', name: 'SPY Put Options' },
    { symbol: 'QQQ_CALL', name: 'QQQ Call Options' },
    { symbol: 'QQQ_PUT', name: 'QQQ Put Options' },
  ],
  CRYPTO: [
    { symbol: 'BTCUSD', name: 'Bitcoin' },
    { symbol: 'ETHUSD', name: 'Ethereum' },
    { symbol: 'BNBUSD', name: 'Binance Coin' },
    { symbol: 'XRPUSD', name: 'Ripple' },
    { symbol: 'ADAUSD', name: 'Cardano' },
    { symbol: 'DOGEUSD', name: 'Dogecoin' },
    { symbol: 'SOLUSD', name: 'Solana' },
  ]
}

const TEMPLATES = {
  RSI_OVERSOLD: {
    action: 'BUY',
    reason: 'RSI below 30 on 4h',
    stopLoss: -2,
    takeProfit: 3,
    orderType: 'MARKET'
  },
  MACD_CROSSOVER: {
    action: 'BUY',
    reason: 'MACD bullish crossover',
    stopLoss: -1.5,
    takeProfit: 3,
    orderType: 'LIMIT'
  },
  SUPPORT_BOUNCE: {
    action: 'BUY',
    reason: 'Price bounced from support',
    stopLoss: -1,
    takeProfit: 2,
    orderType: 'MARKET'
  },
  BREAKOUT: {
    action: 'BUY',
    reason: 'Price broke above resistance',
    stopLoss: -2,
    takeProfit: 4,
    orderType: 'STOP'
  }
}

interface Signal {
  symbol: string
  action: 'BUY' | 'SELL' | 'CLOSE'
  quantity: number
  orderType: 'MARKET' | 'LIMIT' | 'STOP'
  entryPrice?: number
  stopLoss: number
  takeProfit: number
  strategyId: string
  comment?: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  tags: string[]
  timeframe: string
  trailingStop?: boolean
  partialTP?: Array<{ level: number; price: number; quantity: number }>
}

export default function GeneratorPage() {
  const [assetClass, setAssetClass] = useState('STOCKS')
  const [selectedAsset, setSelectedAsset] = useState(ASSETS.STOCKS)
  const [signal, setSignal] = useState<Signal>({
    symbol: 'AAPL',
    action: 'BUY',
    quantity: 100,
    orderType: 'MARKET',
    stopLoss: 0,
    takeProfit: 0,
    strategyId: 'rsi_oversold',
    priority: 'MEDIUM',
    tags: [],
    timeframe: '4h'
  })
  const [jsonPreview, setJsonPreview] = useState('')
  const [history, setHistory] = useState<any[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Update JSON preview whenever signal changes
  const updateJsonPreview = (updatedSignal: Signal) => {
    const json = {
      symbol: updatedSignal.symbol,
      action: updatedSignal.action,
      quantity: updatedSignal.quantity,
      order_type: updatedSignal.orderType,
      ...(updatedSignal.entryPrice && { entry_price: updatedSignal.entryPrice }),
      stop_loss: updatedSignal.stopLoss,
      take_profit: updatedSignal.takeProfit,
      strategy_id: updatedSignal.strategyId,
      priority: updatedSignal.priority,
      timeframe: updatedSignal.timeframe,
      ...(updatedSignal.comment && { comment: updatedSignal.comment }),
      ...(updatedSignal.tags.length > 0 && { tags: updatedSignal.tags }),
      ...(updatedSignal.trailingStop && { trailing_stop: true }),
      ...(updatedSignal.partialTP && { take_profits: updatedSignal.partialTP })
    }
    setJsonPreview(JSON.stringify(json, null, 2))
    setSignal(updatedSignal)
  }

  const handleAssetClassChange = (assetClass: string) => {
    setAssetClass(assetClass)
    const newAsset = ASSETS[assetClass as keyof typeof ASSETS]
    updateJsonPreview({
      ...signal,
      symbol: newAsset.symbol
    })
  }

  const handleAssetSelect = (asset: any) => {
    setSelectedAsset(asset)
    updateJsonPreview({
      ...signal,
      symbol: asset.symbol
    })
  }

  const handleLoadTemplate = (templateKey: keyof typeof TEMPLATES) => {
    const template = TEMPLATES[templateKey]
    updateJsonPreview({
      ...signal,
      action: template.action as 'BUY' | 'SELL',
      strategyId: templateKey.toLowerCase(),
      comment: template.reason
    })
  }

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(jsonPreview)
    alert('JSON copied to clipboard!')
  }

  const handleSendTest = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/v1/webhook/test`, JSON.parse(jsonPreview))
      addToHistory('success', `Test signal sent: ${signal.symbol} ${signal.action}`)
      alert('Test signal sent successfully!')
    } catch (error: any) {
      addToHistory('error', `Failed to send test signal: ${error.message}`)
      alert(`Error: ${error.message}`)
    }
  }

  const handleBacktest = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/v1/backtest`, JSON.parse(jsonPreview))
      addToHistory('info', `Backtest completed for ${signal.symbol}`)
      alert(`Backtest Result: ${JSON.stringify(response.data, null, 2)}`)
    } catch (error: any) {
      alert(`Backtest Error: ${error.message}`)
    }
  }

  const addToHistory = (type: string, message: string) => {
    const entry = {
      id: Date.now(),
      type,
      message,
      timestamp: new Date().toLocaleTimeString()
    }
    setHistory([entry, ...history.slice(0, 9)])
  }

  const clearForm = () => {
    const newSignal: Signal = {
      symbol: 'AAPL',
      action: 'BUY',
      quantity: 100,
      orderType: 'MARKET',
      stopLoss: 0,
      takeProfit: 0,
      strategyId: 'rsi_oversold',
      priority: 'MEDIUM',
      tags: [],
      timeframe: '4h'
    }
    updateJsonPreview(newSignal)
  }

  return (
    <div className={styles.generatorPage}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>📡 Signal Generator</h1>
          <p className={styles.pageSubtitle}>Create TradingView-compatible JSON signals</p>
        </div>
        <div className={styles.headerButtons}>
          <button className={styles.btnPrimary} onClick={() => setShowAdvanced(!showAdvanced)}>
            {showAdvanced ? 'Basic View' : 'Advanced'}
          </button>
          <button className={styles.btnDanger} onClick={clearForm}>Clear</button>
        </div>
      </div>

      <div className={styles.container}>
        {/* Left Panel - Asset Selection */}
        <div className={styles.leftPanel}>
          {/* Asset Class Tabs */}
          <div className={`${styles.assetTabs} glass-light`}>
            <h3 className={styles.panelTitle}>Asset Class</h3>
            <div className={styles.tabs}>
              {Object.keys(ASSETS).map(assetClass => (
                <button
                  key={assetClass}
                  className={`${styles.tab} ${assetClass === assetClass ? styles.active : ''}`}
                  onClick={() => handleAssetClassChange(assetClass)}
                >
                  {assetClass === 'STOCKS' ? '📈' : 
                   assetClass === 'FOREX' ? '💱' :
                   assetClass === 'FUTURES' ? '📊' :
                   assetClass === 'OPTIONS' ? '📋' : '₿'}
                  {assetClass}
                </button>
              ))}
            </div>

            {/* Asset List */}
            <div className={styles.assetList}>
              {ASSETS[assetClass as keyof typeof ASSETS].map(asset => (
                <button
                  key={asset.symbol}
                  className={`${styles.assetItem} ${selectedAsset.symbol === asset.symbol ? styles.selected : ''}`}
                  onClick={() => handleAssetSelect(asset)}
                >
                  <span className={styles.symbol}>{asset.symbol}</span>
                  <span className={styles.name}>{asset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Templates */}
          <div className={`${styles.templates} glass-light`}>
            <h3 className={styles.panelTitle}>Quick Templates</h3>
            <div className={styles.templateList}>
              {Object.keys(TEMPLATES).map(templateKey => (
                <button
                  key={templateKey}
                  className={styles.templateBtn}
                  onClick={() => handleLoadTemplate(templateKey as keyof typeof TEMPLATES)}
                >
                  {templateKey.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Signal Builder */}
        <div className={styles.rightPanel}>
          {/* Signal Form */}
          <div className={`${styles.signalForm} glass-light`}>
            <h3 className={styles.panelTitle}>Signal Configuration</h3>
            
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Symbol</label>
                <input 
                  type="text" 
                  value={signal.symbol}
                  onChange={(e) => updateJsonPreview({...signal, symbol: e.target.value})}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Action</label>
                <select 
                  value={signal.action}
                  onChange={(e) => updateJsonPreview({...signal, action: e.target.value as any})}
                  className={styles.select}
                >
                  <option>BUY</option>
                  <option>SELL</option>
                  <option>CLOSE</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Quantity</label>
                <input 
                  type="number" 
                  value={signal.quantity}
                  onChange={(e) => updateJsonPreview({...signal, quantity: parseInt(e.target.value)})}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Order Type</label>
                <select 
                  value={signal.orderType}
                  onChange={(e) => updateJsonPreview({...signal, orderType: e.target.value as any})}
                  className={styles.select}
                >
                  <option>MARKET</option>
                  <option>LIMIT</option>
                  <option>STOP</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Entry Price (optional)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={signal.entryPrice || ''}
                  onChange={(e) => updateJsonPreview({...signal, entryPrice: e.target.value ? parseFloat(e.target.value) : undefined})}
                  className={styles.input}
                  placeholder="Leave blank for MARKET orders"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Stop Loss</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={signal.stopLoss}
                  onChange={(e) => updateJsonPreview({...signal, stopLoss: parseFloat(e.target.value)})}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Take Profit</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={signal.takeProfit}
                  onChange={(e) => updateJsonPreview({...signal, takeProfit: parseFloat(e.target.value)})}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Timeframe</label>
                <select 
                  value={signal.timeframe}
                  onChange={(e) => updateJsonPreview({...signal, timeframe: e.target.value})}
                  className={styles.select}
                >
                  <option>1m</option>
                  <option>5m</option>
                  <option>15m</option>
                  <option>1h</option>
                  <option>4h</option>
                  <option>1D</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Strategy</label>
                <input 
                  type="text" 
                  value={signal.strategyId}
                  onChange={(e) => updateJsonPreview({...signal, strategyId: e.target.value})}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Priority</label>
                <select 
                  value={signal.priority}
                  onChange={(e) => updateJsonPreview({...signal, priority: e.target.value as any})}
                  className={styles.select}
                >
                  <option>LOW</option>
                  <option>MEDIUM</option>
                  <option>HIGH</option>
                </select>
              </div>
            </div>

            {/* Advanced Options */}
            {showAdvanced && (
              <div className={styles.advancedOptions}>
                <h4>Advanced Options</h4>
                <div className={styles.checkboxGroup}>
                  <label>
                    <input 
                      type="checkbox"
                      checked={signal.trailingStop || false}
                      onChange={(e) => updateJsonPreview({...signal, trailingStop: e.target.checked})}
                    />
                    Trailing Stop Loss
                  </label>
                </div>
                <div className={styles.formGroup}>
                  <label>Comments</label>
                  <textarea 
                    value={signal.comment || ''}
                    onChange={(e) => updateJsonPreview({...signal, comment: e.target.value})}
                    className={styles.textarea}
                    placeholder="Add notes for this signal..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* JSON Preview */}
          <div className={`${styles.jsonPreview} glass-light`}>
            <div className={styles.previewHeader}>
              <h3>JSON Preview</h3>
              <div className={styles.previewButtons}>
                <button className={styles.btnSmall} onClick={handleCopyJSON}>📋 Copy</button>
              </div>
            </div>
            <pre className={styles.jsonContent}>{jsonPreview}</pre>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button className={styles.btnTest} onClick={handleSendTest}>🧪 Send Test</button>
            <button className={styles.btnBacktest} onClick={handleBacktest}>📈 Backtest</button>
          </div>
        </div>
      </div>

      {/* Signal History */}
      <div className={`${styles.history} glass-light`}>
        <h3 className={styles.historyTitle}>📜 Signal History</h3>
        <div className={styles.historyList}>
          {history.length > 0 ? (
            history.map(entry => (
              <div key={entry.id} className={styles.historyItem}>
                <span className={`${styles.historyIcon} ${styles[`type_${entry.type}`]}`}>
                  {entry.type === 'success' ? '✓' : entry.type === 'error' ? '✗' : 'ℹ'}
                </span>
                <span className={styles.historyMessage}>{entry.message}</span>
                <span className={styles.historyTime}>{entry.timestamp}</span>
              </div>
            ))
          ) : (
            <p className={styles.emptyHistory}>No signals generated yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
