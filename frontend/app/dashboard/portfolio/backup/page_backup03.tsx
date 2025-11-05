'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import styles from './portfolio.module.css'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Category {
  id: string
  name: string
  description?: string
  color: string
  icon: string
  symbol_count: number
}

interface Symbol {
  id: string
  symbol: string
  name: string
  current_price: number
}

export default function PortfolioPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [symbols, setSymbols] = useState<Symbol[]>([])
  const [loading, setLoading] = useState(false)
  
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showSymbolModal, setShowSymbolModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  
  const [newCatName, setNewCatName] = useState('')
  const [newCatDesc, setNewCatDesc] = useState('')
  const [newCatIcon, setNewCatIcon] = useState('📈')
  
  const [newSymbol, setNewSymbol] = useState('')
  const [newSymbolName, setNewSymbolName] = useState('')
  
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    if (activeCategory) {
      fetchSymbols(activeCategory)
    }
  }, [activeCategory])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${API_URL}/api/v1/portfolio/categories`)
      setCategories(res.data.categories || [])
      if (res.data.categories.length > 0 && !activeCategory) {
        setActiveCategory(res.data.categories[0].id)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSymbols = async (categoryId: string) => {
    try {
      const res = await axios.get(`${API_URL}/api/v1/portfolio/categories/${categoryId}/symbols`)
      setSymbols(res.data.symbols || [])
    } catch (error) {
      console.error('Error fetching symbols:', error)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) {
      alert('Please enter category name')
      return
    }

    try {
      await axios.post(`${API_URL}/api/v1/portfolio/categories/create`, {
        name: newCatName,
        description: newCatDesc,
        icon: newCatIcon
      })
      setNewCatName('')
      setNewCatDesc('')
      setNewCatIcon('📈')
      setShowCategoryModal(false)
      await fetchCategories()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to create category')
    }
  }

  const handleEditCategory = async () => {
    if (!editingCategory || !newCatName.trim()) {
      alert('Please enter category name')
      return
    }

    try {
      await axios.put(`${API_URL}/api/v1/portfolio/categories/${editingCategory.id}`, {
        name: newCatName,
        description: newCatDesc,
        icon: newCatIcon
      })
      setNewCatName('')
      setNewCatDesc('')
      setEditingCategory(null)
      setShowEditModal(false)
      await fetchCategories()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to edit category')
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category and all symbols?')) return

    try {
      await axios.delete(`${API_URL}/api/v1/portfolio/categories/${id}`)
      await fetchCategories()
      setActiveCategory(null)
      setSymbols([])
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete category')
    }
  }

  const handleAddSymbol = async () => {
    if (!newSymbol.trim() || !activeCategory) {
      alert('Please enter symbol and select category')
      return
    }

    try {
      await axios.post(`${API_URL}/api/v1/portfolio/categories/${activeCategory}/symbols/add`, {
        symbol: newSymbol,
        name: newSymbolName
      })
      setNewSymbol('')
      setNewSymbolName('')
      setShowSymbolModal(false)
      await fetchSymbols(activeCategory)
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to add symbol')
    }
  }

  const handleDeleteSymbol = async (symbolId: string) => {
    if (!confirm('Remove this symbol?')) return

    try {
      await axios.delete(`${API_URL}/api/v1/portfolio/symbols/${symbolId}`)
      if (activeCategory) {
        await fetchSymbols(activeCategory)
      }
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to remove symbol')
    }
  }

  const handleEditClick = (cat: Category) => {
    setEditingCategory(cat)
    setNewCatName(cat.name)
    setNewCatDesc(cat.description || '')
    setNewCatIcon(cat.icon)
    setShowEditModal(true)
  }

  const handleSymbolClick = (symbol: string) => {
    setSelectedSymbol(symbol)
  }

  const activecat = categories.find(c => c.id === activeCategory)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>📊 Portfolio</h1>
        <p className={styles.subtitle}>Manage multiple watchlists by category</p>
      </div>

      <div className={styles.topSection}>
        <div className={styles.leftSection}>
          <div className={styles.sectionHeader}>
            <h2>📋 Watchlists</h2>
            <button className={styles.addBtn} onClick={() => setShowCategoryModal(true)}>
              + New
            </button>
          </div>

          {loading ? (
            <div className={styles.loading}>Loading...</div>
          ) : categories.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No watchlists yet</p>
            </div>
          ) : (
            <div className={styles.categoryTabs}>
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`${styles.categoryTab} ${activeCategory === cat.id ? styles.active : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  <div className={styles.catContent}>
                    <span className={styles.catIcon}>{cat.icon}</span>
                    <div className={styles.catText}>
                      <div className={styles.catName}>{cat.name}</div>
                      <div className={styles.catCount}>{cat.symbol_count} symbols</div>
                    </div>
                  </div>
                  <div className={styles.catActions}>
                    <button
                      className={styles.editBtn}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditClick(cat)
                      }}
                      title="Edit"
                    >
                      ✎
                    </button>
                    <button
                      className={styles.deleteBtn}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCategory(cat.id)
                      }}
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.middleSection}>
          <div className={styles.sectionHeader}>
            <h2>{activecat?.icon} {activecat?.name || 'Symbols'}</h2>
            <button
              className={styles.addBtn}
              onClick={() => setShowSymbolModal(true)}
              disabled={!activeCategory}
            >
              + Add
            </button>
          </div>

          {symbols.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No symbols yet</p>
            </div>
          ) : (
            <div className={styles.symbolsList}>
              {symbols.map((sym) => (
                <div
                  key={sym.id}
                  className={`${styles.symbolCard} ${selectedSymbol === sym.symbol ? styles.selected : ''}`}
                  onClick={() => handleSymbolClick(sym.symbol)}
                >
                  <div className={styles.symHeader}>
                    <div className={styles.symSymbol}>{sym.symbol}</div>
                    <button
                      className={styles.deleteBtn}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteSymbol(sym.id)
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <div className={styles.symName}>{sym.name}</div>
                  <div className={styles.symPrice}>${sym.current_price.toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.chartSection}>
        <div className={styles.chartHeader}>
          <h2>📈 Chart: {selectedSymbol || 'Select Symbol'}</h2>
        </div>

        <div className={styles.chartContainerLarge}>
          {selectedSymbol ? (
            <TradingViewChart symbol={selectedSymbol} />
          ) : (
            <div className={styles.chartPlaceholder}>
              <p>Select a symbol to view chart</p>
            </div>
          )}
        </div>
      </div>

      {showCategoryModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Create New Watchlist</h3>
              <button className={styles.closeBtn} onClick={() => setShowCategoryModal(false)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Stocks, Forex"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateCategory()}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <input
                  type="text"
                  placeholder="Optional"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Icon</label>
                <div className={styles.iconPicker}>
                  {['📈', '💱', '🪙', '📊', '🔥', '⭐', '💎', '🚀'].map((icon) => (
                    <button
                      key={icon}
                      className={`${styles.iconBtn} ${newCatIcon === icon ? styles.selected : ''}`}
                      onClick={() => setNewCatIcon(icon)}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button className={styles.cancelBtn} onClick={() => setShowCategoryModal(false)}>
                  Cancel
                </button>
                <button className={styles.submitBtn} onClick={handleCreateCategory}>
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Edit Watchlist</h3>
              <button className={styles.closeBtn} onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Name *</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleEditCategory()}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Icon</label>
                <div className={styles.iconPicker}>
                  {['📈', '💱', '🪙', '📊', '🔥', '⭐', '💎', '🚀'].map((icon) => (
                    <button
                      key={icon}
                      className={`${styles.iconBtn} ${newCatIcon === icon ? styles.selected : ''}`}
                      onClick={() => setNewCatIcon(icon)}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button className={styles.cancelBtn} onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button className={styles.submitBtn} onClick={handleEditCategory}>
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSymbolModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Add Symbol</h3>
              <button className={styles.closeBtn} onClick={() => setShowSymbolModal(false)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Symbol *</label>
                <input
                  type="text"
                  placeholder="e.g., AAPL, EURUSD"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSymbol()}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Name</label>
                <input
                  type="text"
                  placeholder="e.g., Apple Inc"
                  value={newSymbolName}
                  onChange={(e) => setNewSymbolName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSymbol()}
                />
              </div>
              <div className={styles.modalFooter}>
                <button className={styles.cancelBtn} onClick={() => setShowSymbolModal(false)}>
                  Cancel
                </button>
                <button className={styles.submitBtn} onClick={handleAddSymbol}>
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TradingViewChart({ symbol }: { symbol: string }) {
  const containerId = `tradingview_${symbol}_${Date.now()}`

  useEffect(() => {
    const container = document.getElementById(containerId)
    if (container) container.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/tv.js'
    script.async = true
    script.onload = () => {
      if (window.TradingView) {
        try {
          let tvSymbol = symbol
          if (symbol.length <= 4 && /^[A-Z]+$/.test(symbol)) {
            tvSymbol = `NASDAQ:${symbol}`
          } else if (symbol.length === 6 && /^[A-Z]{6}$/.test(symbol)) {
            tvSymbol = `FX_IDC:${symbol}`
          } else if (symbol.includes('USDT') || symbol.includes('USD') || symbol.length > 8) {
            tvSymbol = `BINANCE:${symbol}`
          }

          new window.TradingView.widget({
            autosize: true,
            symbol: tvSymbol,
            interval: '1H',
            timezone: 'Etc/UTC',
            theme: 'dark',
            style: '1',
            locale: 'en',
            toolbar_bg: '#1a1a1a',
            container_id: containerId,
            hide_top_toolbar: false,
            allow_symbol_change: true,
          })
        } catch (error) {
          console.error('TradingView widget error:', error)
        }
      }
    }
    document.body.appendChild(script)

    return () => {
      const container = document.getElementById(containerId)
      if (container) container.innerHTML = ''
    }
  }, [symbol, containerId])

  return <div id={containerId} style={{ width: '100%', height: '100%' }} />
}

declare global {
  interface Window {
    TradingView: any
  }
}