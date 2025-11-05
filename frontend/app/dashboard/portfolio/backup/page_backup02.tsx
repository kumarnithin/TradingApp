'use client'

import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { createChart, ColorType } from 'lightweight-charts'
import styles from './portfolio.module.css'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Position {
  id: string
  symbol: string
  quantity: number
  avg_cost: number
  current_price: number
  market_value: number
  totalCost: number
  pnl: number
  pnl_percent: number
  sector: string
  day_change: number
  day_change_percent: number
}

interface PortfolioSummary {
  total_value: number
  total_cost: number
  total_pnl: number
  total_pnl_percent: number
  day_change: number
  day_change_percent: number
  cash: number
  buying_power?: number
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
  const [positions, setPositions] = useState<Position[]>([])
  const [summary, setSummary] = useState<PortfolioSummary | null>(null)
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
  const [showAddSymbol, setShowAddSymbol] = useState(false)
  const [symbolToAdd, setSymbolToAdd] = useState('')
  const [error, setError] = useState<string | null>(null)

  const chartContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchPortfolioData()
    const interval = setInterval(fetchPortfolioData, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (chartContainerRef.current && selectedSymbol) {
      initChart()
    }
  }, [selectedSymbol])

  const fetchPortfolioData = async () => {
    try {
      setError(null)
      
      // Mock data if backend not available
      const mockSummary: PortfolioSummary = {
        total_value: 250000,
        total_cost: 245000,
        total_pnl: 5000,
        total_pnl_percent: 2.04,
        day_change: 1250,
        day_change_percent: 0.5,
        cash: 50000,
        buying_power: 100000
      }

      const mockPositions: Position[] = [
        {
          id: '1',
          symbol: 'AAPL',
          quantity: 100,
          avg_cost: 150.00,
          current_price: 155.00,
          market_value: 15500,
          totalCost: 15000,
          pnl: 500,
          pnl_percent: 3.33,
          sector: 'Technology',
          day_change: 100,
          day_change_percent: 0.65
        },
        {
          id: '2',
          symbol: 'MSFT',
          quantity: 50,
          avg_cost: 380.00,
          current_price: 385.00,
          market_value: 19250,
          totalCost: 19000,
          pnl: 250,
          pnl_percent: 1.32,
          sector: 'Technology',
          day_change: 50,
          day_change_percent: 0.13
        },
        {
          id: '3',
          symbol: 'TSLA',
          quantity: 75,
          avg_cost: 230.00,
          current_price: 245.00,
          market_value: 18375,
          totalCost: 17250,
          pnl: 1125,
          pnl_percent: 6.52,
          sector: 'Automotive',
          day_change: 225,
          day_change_percent: 0.92
        }
      ]

      try {
        const [positionsResponse, summaryResponse] = await Promise.all([
          axios.get(`${API_URL}/api/v1/portfolio/positions`, { timeout: 5000 }),
          axios.get(`${API_URL}/api/v1/portfolio/summary`, { timeout: 5000 })
        ])

        if (positionsResponse.data?.positions) {
          setPositions(positionsResponse.data.positions)
        } else {
          setPositions(mockPositions)
        }

        if (summaryResponse.data) {
          setSummary(summaryResponse.data)
        } else {
          setSummary(mockSummary)
        }
      } catch (apiError) {
        console.warn('Backend not available, using mock data:', apiError)
        setPositions(mockPositions)
        setSummary(mockSummary)
      }

      setLoading(false)
    } catch (error) {
      console.error('Error fetching portfolio:', error)
      setError('Failed to fetch portfolio data')
      setLoading(false)
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

  const handleAddSymbolToWatchlist = () => {
    if (!symbolToAdd.trim()) return

    const activeWatchlist = getActiveWatchlist()
    if (!activeWatchlist) return

    if (activeWatchlist.symbols.some(s => s.symbol === symbolToAdd)) {
      alert('Symbol already in watchlist')
      return
    }

    const newSymbol: WatchlistItem = {
      symbol: symbolToAdd.toUpperCase(),
      name: symbolToAdd.toUpperCase(),
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
    setSymbolToAdd('')
    setShowAddSymbol(false)
  }

  const handleRemoveSymbolFromWatchlist = (symbol: string) => {
    if (!confirm(`Remove ${symbol}?`)) return

    const activeWatchlist = getActiveWatchlist()
    if (!activeWatchlist) return

    const updated = watchlists.map(w =>
      w.id === activeWatchlist.id
        ? { ...w, symbols: w.symbols.filter(s => s.symbol !== symbol) }
        : w
    )
    setWatchlists(updated)
  }

  const initChart = async () => {
    if (!chartContainerRef.current) return

    chartContainerRef.current.innerHTML = ''

    try {
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

      const mockData = generateMockChartData()
      candlestickSeries.setData(mockData)
      chart.timeScale().fitContent()

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
    } catch (err) {
      console.error('Chart error:', err)
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

  const portfolio = {
    name: 'Default Portfolio',
    totalValue: summary?.total_value || 0,
    totalCost: summary?.total_cost || 0,
    totalPnL: summary?.total_pnl || 0,
    totalPnLPercent: summary?.total_pnl_percent || 0,
    dayChange: summary?.day_change || 0,
    dayChangePercent: summary?.day_change_percent || 0,
    holdings: positions,
    cash: summary?.cash || 0
  }

  const activeWatchlist = getActiveWatchlist()

  return (
    <div className={styles.portfolioPage}>
      {/* Error Banner */}
      {error && (
        <div style={{
          padding: '12px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          marginBottom: '20px',
          color: '#ef4444',
          fontSize: '13px'
        }}>
          ⚠️ {error}
        </div>
      )}

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
                      <td>${holding.avg_cost.toFixed(2)}</td>
                      <td className={styles.priceCell}>${holding.current_price.toFixed(2)}</td>
                      <td>${holding.market_value.toLocaleString()}</td>
                      <td className={holding.pnl >= 0 ? styles.positive : styles.negative}>
                        ${holding.pnl.toFixed(2)}<br />
                        <span className={styles.percentText}>
                          ({holding.pnl_percent >= 0 ? '+' : ''}{holding.pnl_percent.toFixed(2)}%)
                        </span>
                      </td>
                      <td className={holding.day_change >= 0 ? styles.positive : styles.negative}>
                        ${holding.day_change.toFixed(2)}<br />
                        <span className={styles.percentText}>
                          ({holding.day_change_percent >= 0 ? '+' : ''}{holding.day_change_percent.toFixed(2)}%)
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

      {/* Watchlist Section */}
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
                onClick={() => setShowAddSymbol(true)}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                + Add Symbol
              </button>
            </div>

            {showAddSymbol && (
              <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '16px',
                padding: '12px',
                background: 'rgba(138, 180, 248, 0.1)',
                borderRadius: '8px'
              }}>
                <input
                  type="text"
                  value={symbolToAdd}
                  onChange={(e) => setSymbolToAdd(e.target.value.toUpperCase())}
                  placeholder="Enter symbol (e.g., AAPL)"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleAddSymbolToWatchlist()
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid rgba(138, 180, 248, 0.3)',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '12px'
                  }}
                />
                <button
                  onClick={handleAddSymbolToWatchlist}
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(34, 197, 94, 0.3)',
                    border: '1px solid rgba(34, 197, 94, 0.5)',
                    borderRadius: '6px',
                    color: '#22c55e',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddSymbol(false)
                    setSymbolToAdd('')
                  }}
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(239, 68, 68, 0.3)',
                    border: '1px solid rgba(239, 68, 68, 0.5)',
                    borderRadius: '6px',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}
                >
                  Cancel
                </button>
              </div>
            )}

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