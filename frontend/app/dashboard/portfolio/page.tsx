'use client'

import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { createChart, ColorType } from 'lightweight-charts'
import styles from './portfolio.module.css'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Holding {
  symbol: string
  quantity: number
  avgCost: number
  currentPrice: number
  marketValue: number
  totalCost: number
  pnl: number
  pnlPercent: number
  sector: string
  dayChange: number
  dayChangePercent: number
}

interface Portfolio {
  id: string
  name: string
  totalValue: number
  totalCost: number
  totalPnL: number
  totalPnLPercent: number
  dayChange: number
  dayChangePercent: number
  holdings: Holding[]
  cash: number
}

interface WatchlistItem {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap: string
}

interface Watchlist {
  id: string
  name: string
  symbols: WatchlistItem[]
}

export default function PortfolioPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null)
  const [watchlists, setWatchlists] = useState<Watchlist[]>([
    { id: '1', name: 'My Watchlist', symbols: [] }
  ])
  const [activeWatchlistId, setActiveWatchlistId] = useState('1')
  const [selectedSymbol, setSelectedSymbol] = useState<string>('AAPL')
  const [loading, setLoading] = useState(true)
  const [showAddHolding, setShowAddHolding] = useState(false)
  const [showWatchlistModal, setShowWatchlistModal] = useState(false)
  const [editingWatchlist, setEditingWatchlist] = useState<Watchlist | null>(null)
  const [watchlistName, setWatchlistName] = useState('')
  
  const chartContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchPortfolios()
    fetchWatchlistData()
    const interval = setInterval(() => {
      fetchWatchlistData()
      if (selectedPortfolio) fetchPortfolios()
    }, 5000) // Update every 5 seconds
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (chartContainerRef.current && selectedSymbol) {
      initChart()
    }
  }, [selectedSymbol])

  const fetchPortfolios = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/portfolios`)
      setPortfolios(response.data)
      if (response.data.length > 0 && !selectedPortfolio) {
        setSelectedPortfolio(response.data[0])
      }
      setLoading(false)
    } catch (error) {
      console.error('Error fetching portfolios:', error)
      setLoading(false)
    }
  }

  const fetchWatchlistData = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/watchlist`)
      // Update the active watchlist with fetched data
      const activeWatchlist = getActiveWatchlist()
      if (activeWatchlist) {
        const updatedWatchlists = watchlists.map(w =>
          w.id === activeWatchlist.id ? { ...w, symbols: response.data } : w
        )
        setWatchlists(updatedWatchlists)
      }
    } catch (error) {
      console.error('Error fetching watchlist:', error)
    }
  }

  const getActiveWatchlist = () => {
    return watchlists.find(w => w.id === activeWatchlistId) || watchlists[0]
  }

  const handleCreateWatchlist = () => {
    if (!watchlistName.trim()) {
      alert('Please enter a watchlist name')
      return
    }
    const newWatchlist: Watchlist = {
      id: Date.now().toString(),
      name: watchlistName,
      symbols: []
    }
    setWatchlists([...watchlists, newWatchlist])
    setActiveWatchlistId(newWatchlist.id)
    setWatchlistName('')
    setShowWatchlistModal(false)
  }

  const handleEditWatchlist = (watchlist: Watchlist) => {
    setEditingWatchlist(watchlist)
    setWatchlistName(watchlist.name)
    setShowWatchlistModal(true)
  }

  const handleUpdateWatchlist = () => {
    if (!editingWatchlist || !watchlistName.trim()) return
    
    const updated = watchlists.map(w =>
      w.id === editingWatchlist.id ? { ...w, name: watchlistName } : w
    )
    setWatchlists(updated)
    setEditingWatchlist(null)
    setWatchlistName('')
    setShowWatchlistModal(false)
  }

  const handleDeleteWatchlist = (id: string) => {
    if (watchlists.length === 1) {
      alert('Cannot delete the last watchlist')
      return
    }
    if (!confirm('Delete this watchlist?')) return
    
    const filtered = watchlists.filter(w => w.id !== id)
    setWatchlists(filtered)
    if (activeWatchlistId === id) {
      setActiveWatchlistId(filtered[0].id)
    }
  }

  const handleAddSymbolToWatchlist = async (symbol: string) => {
    const activeWatchlist = getActiveWatchlist()
    if (!activeWatchlist) return
    
    // Check if symbol already exists
    if (activeWatchlist.symbols.some(s => s.symbol === symbol)) {
      alert('Symbol already in watchlist')
      return
    }
    
    try {
      // Try to fetch real data
      await axios.post(`${API_URL}/api/v1/watchlist`, { symbol: symbol.toUpperCase() })
      fetchWatchlistData()
    } catch (error) {
      // If API fails, add mock data
      const newSymbol: WatchlistItem = {
        symbol: symbol.toUpperCase(),
        name: symbol.toUpperCase(),
        price: 0,
        change: 0,
        changePercent: 0,
        volume: 0,
        marketCap: ''
      }
      
      const updated = watchlists.map(w =>
        w.id === activeWatchlist.id
          ? { ...w, symbols: [...w.symbols, newSymbol] }
          : w
      )
      setWatchlists(updated)
    }
  }

  const handleRemoveSymbolFromWatchlist = async (symbol: string) => {
    if (!confirm(`Remove ${symbol}?`)) return
    
    const activeWatchlist = getActiveWatchlist()
    if (!activeWatchlist) return
    
    try {
      await axios.delete(`${API_URL}/api/v1/watchlist/${symbol}`)
      fetchWatchlistData()
    } catch (error) {
      // If API fails, remove from local state
      const updated = watchlists.map(w =>
        w.id === activeWatchlist.id
          ? { ...w, symbols: w.symbols.filter(s => s.symbol !== symbol) }
          : w
      )
      setWatchlists(updated)
    }
  }

  const initChart = async () => {
    if (!chartContainerRef.current) return

    // Clear previous chart
    chartContainerRef.current.innerHTML = ''

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.1)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.1)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    })

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    })

    // Fetch chart data
    try {
      const response = await axios.get(`${API_URL}/api/v1/market/chart/${selectedSymbol}`)
      candlestickSeries.setData(response.data)
    } catch (error) {
      console.error('Error fetching chart data:', error)
      // Mock data for demonstration
      const mockData = generateMockChartData()
      candlestickSeries.setData(mockData)
    }

    chart.timeScale().fitContent()

    // Handle window resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }

  const generateMockChartData = () => {
    const data = []
    const basePrice = 150
    let price = basePrice
    const now = Date.now()

    for (let i = 30; i >= 0; i--) {
      const time = (now - i * 24 * 60 * 60 * 1000) / 1000
      const open = price
      const change = (Math.random() - 0.5) * 4
      const close = open + change
      const high = Math.max(open, close) + Math.random() * 2
      const low = Math.min(open, close) - Math.random() * 2
      
      data.push({
        time: time as any,
        open,
        high,
        low,
        close
      })
      
      price = close
    }

    return data
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading portfolio...</p>
      </div>
    )
  }

  const portfolio = selectedPortfolio || {
    name: 'Default Portfolio',
    totalValue: 0,
    totalCost: 0,
    totalPnL: 0,
    totalPnLPercent: 0,
    dayChange: 0,
    dayChangePercent: 0,
    holdings: [],
    cash: 0
  }

  const activeWatchlist = getActiveWatchlist()

  return (
    <div className={styles.portfolioPage}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>💼 Portfolio Manager</h1>
          <p className={styles.pageSubtitle}>Track holdings, watchlists and live market data</p>
        </div>
        <div className={styles.headerButtons}>
          <button className={styles.btnAdd} onClick={() => setShowAddHolding(true)}>
            + Add Holding
          </button>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className={styles.summaryGrid}>
        <div className={`${styles.summaryCard} glass-light`}>
          <div className={styles.cardLabel}>Total Value</div>
          <div className={styles.cardValue}>${portfolio.totalValue.toLocaleString()}</div>
          <div className={styles.cardSubtext}>Cash: ${portfolio.cash.toLocaleString()}</div>
        </div>
        <div className={`${styles.summaryCard} glass-light`}>
          <div className={styles.cardLabel}>Total P&L</div>
          <div className={`${styles.cardValue} ${portfolio.totalPnL >= 0 ? styles.positive : styles.negative}`}>
            ${portfolio.totalPnL.toFixed(2)}
          </div>
          <div className={`${styles.cardSubtext} ${portfolio.totalPnLPercent >= 0 ? styles.positive : styles.negative}`}>
            {portfolio.totalPnLPercent >= 0 ? '+' : ''}{portfolio.totalPnLPercent.toFixed(2)}%
          </div>
        </div>
        <div className={`${styles.summaryCard} glass-light`}>
          <div className={styles.cardLabel}>Day Change</div>
          <div className={`${styles.cardValue} ${portfolio.dayChange >= 0 ? styles.positive : styles.negative}`}>
            ${portfolio.dayChange.toFixed(2)}
          </div>
          <div className={`${styles.cardSubtext} ${portfolio.dayChangePercent >= 0 ? styles.positive : styles.negative}`}>
            {portfolio.dayChangePercent >= 0 ? '+' : ''}{portfolio.dayChangePercent.toFixed(2)}%
          </div>
        </div>
        <div className={`${styles.summaryCard} glass-light`}>
          <div className={styles.cardLabel}>Holdings</div>
          <div className={styles.cardValue}>{portfolio.holdings?.length || 0}</div>
          <div className={styles.cardSubtext}>Active positions</div>
        </div>
      </div>

      <div className={styles.mainGrid}>
        {/* Holdings Table */}
        <div className={`${styles.holdingsSection} glass-light`}>
          <h2 className={styles.sectionTitle}>📋 Holdings</h2>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Qty</th>
                  <th>Avg Cost</th>
                  <th>Current Price</th>
                  <th>Market Value</th>
                  <th>P&L</th>
                  <th>Day Change</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.holdings?.length > 0 ? (
                  portfolio.holdings.map((holding, idx) => (
                    <tr key={idx}>
                      <td className={styles.symbolCell}>
                        <button 
                          className={styles.symbolButton}
                          onClick={() => setSelectedSymbol(holding.symbol)}
                        >
                          {holding.symbol}
                        </button>
                      </td>
                      <td>{holding.quantity}</td>
                      <td>${holding.avgCost.toFixed(2)}</td>
                      <td className={styles.priceCell}>${holding.currentPrice.toFixed(2)}</td>
                      <td>${holding.marketValue.toLocaleString()}</td>
                      <td className={holding.pnl >= 0 ? styles.positive : styles.negative}>
                        ${holding.pnl.toFixed(2)}<br/>
                        <span className={styles.percentText}>
                          ({holding.pnlPercent >= 0 ? '+' : ''}{holding.pnlPercent.toFixed(2)}%)
                        </span>
                      </td>
                      <td className={holding.dayChange >= 0 ? styles.positive : styles.negative}>
                        ${holding.dayChange.toFixed(2)}<br/>
                        <span className={styles.percentText}>
                          ({holding.dayChangePercent >= 0 ? '+' : ''}{holding.dayChangePercent.toFixed(2)}%)
                        </span>
                      </td>
                      <td>
                        <button className={styles.btnAction}>📊</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className={styles.emptyState}>
                      No holdings yet. Add your first position!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Chart */}
        <div className={`${styles.chartSection} glass-light`}>
          <div className={styles.chartHeader}>
            <h2 className={styles.sectionTitle}>📈 Live Chart: {selectedSymbol}</h2>
            <div className={styles.chartControls}>
              <select 
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className={styles.symbolSelect}
              >
                {portfolio.holdings?.map(h => (
                  <option key={h.symbol} value={h.symbol}>{h.symbol}</option>
                ))}
                {activeWatchlist?.symbols.map(w => (
                  <option key={w.symbol} value={w.symbol}>{w.symbol}</option>
                ))}
              </select>
            </div>
          </div>
          <div ref={chartContainerRef} className={styles.chartContainer}></div>
        </div>
      </div>

      {/* Watchlist Section - ENHANCED */}
      <div className={`${styles.watchlistSection} glass-light`}>
        <div className={styles.watchlistHeader}>
          <h2 className={styles.sectionTitle}>👀 Watchlists</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className={styles.btnAdd} 
              onClick={() => {
                setEditingWatchlist(null)
                setWatchlistName('')
                setShowWatchlistModal(true)
              }}
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              + New Watchlist
            </button>
          </div>
        </div>

        {/* Watchlist Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '20px',
          overflowX: 'auto',
          paddingBottom: '8px'
        }}>
          {watchlists.map(wl => (
            <div key={wl.id} style={{ position: 'relative' }}>
              <button
                onClick={() => setActiveWatchlistId(wl.id)}
                style={{
                  padding: '10px 16px',
                  background: activeWatchlistId === wl.id 
                    ? 'rgba(138, 180, 248, 0.2)' 
                    : 'rgba(0, 0, 0, 0.2)',
                  border: activeWatchlistId === wl.id
                    ? '1px solid rgba(138, 180, 248, 0.4)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {wl.name} ({wl.symbols.length})
              </button>
              <div style={{ 
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                display: 'flex',
                gap: '4px'
              }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEditWatchlist(wl)
                  }}
                  style={{
                    width: '20px',
                    height: '20px',
                    background: 'rgba(138, 180, 248, 0.3)',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#8AB4F8',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ✏️
                </button>
                {watchlists.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteWatchlist(wl.id)
                    }}
                    style={{
                      width: '20px',
                      height: '20px',
                      background: 'rgba(239, 68, 68, 0.3)',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#ef4444',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Active Watchlist Content */}
        {activeWatchlist && (
          <>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '16px',
              padding: '12px',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '8px'
            }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '13px' }}>
                {activeWatchlist.symbols.length} symbols in {activeWatchlist.name}
              </span>
              <button 
                className={styles.btnAdd}
                onClick={() => {
                  const symbol = prompt('Enter symbol (e.g., AAPL):')
                  if (symbol) handleAddSymbolToWatchlist(symbol)
                }}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                + Add Symbol
              </button>
            </div>

            <div className={styles.watchlistGrid}>
              {activeWatchlist.symbols.length > 0 ? (
                activeWatchlist.symbols.map((item, idx) => (
                  <div key={idx} className={styles.watchlistCard}>
                    <div className={styles.watchlistTop}>
                      <div>
                        <h4 className={styles.watchlistSymbol}>{item.symbol}</h4>
                        <p className={styles.watchlistName}>{item.name}</p>
                      </div>
                      <button 
                        className={styles.btnRemove}
                        onClick={() => handleRemoveSymbolFromWatchlist(item.symbol)}
                      >
                        ✕
                      </button>
                    </div>
                    <div className={styles.watchlistPrice}>
                      ${item.price.toFixed(2)}
                    </div>
                    <div className={`${styles.watchlistChange} ${item.change >= 0 ? styles.positive : styles.negative}`}>
                      {item.change >= 0 ? '+' : ''}${item.change.toFixed(2)} ({item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%)
                    </div>
                    <div className={styles.watchlistFooter}>
                      <span>Vol: {item.volume.toLocaleString()}</span>
                      <button 
                        className={styles.btnChart}
                        onClick={() => setSelectedSymbol(item.symbol)}
                      >
                        📊 Chart
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyWatchlist}>
                  No symbols in this watchlist. Click "+ Add Symbol" to add some!
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Watchlist Modal */}
      {showWatchlistModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>{editingWatchlist ? 'Edit Watchlist' : 'Create New Watchlist'}</h3>
              <button 
                className={styles.closeButton} 
                onClick={() => {
                  setShowWatchlistModal(false)
                  setEditingWatchlist(null)
                  setWatchlistName('')
                }}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <input 
                type="text"
                value={watchlistName}
                onChange={(e) => setWatchlistName(e.target.value)}
                placeholder="Enter watchlist name"
                className={styles.input}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    editingWatchlist ? handleUpdateWatchlist() : handleCreateWatchlist()
                  }
                }}
                style={{ width: '100%' }}
              />
            </div>
            <div className={styles.modalFooter}>
              <button 
                className={styles.btnCancel} 
                onClick={() => {
                  setShowWatchlistModal(false)
                  setEditingWatchlist(null)
                  setWatchlistName('')
                }}
                style={{ padding: '10px 20px' }}
              >
                Cancel
              </button>
              <button 
                className={styles.btnAdd}
                onClick={() => {
                  editingWatchlist ? handleUpdateWatchlist() : handleCreateWatchlist()
                }}
                style={{ padding: '10px 20px' }}
              >
                {editingWatchlist ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
