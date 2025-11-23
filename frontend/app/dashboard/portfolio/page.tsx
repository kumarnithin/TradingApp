'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import logger from '../../../utils/logger'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Category {
  id: string
  name: string
  description?: string
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
  const [filteredSymbols, setFilteredSymbols] = useState<Symbol[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [priceUpdateStatus, setPriceUpdateStatus] = useState('Auto-update: OFF')

  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showSymbolModal, setShowSymbolModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  const [newCatName, setNewCatName] = useState('')
  const [newCatDesc, setNewCatDesc] = useState('')
  const [newCatIcon, setNewCatIcon] = useState('STOCK')

  const [newSymbol, setNewSymbol] = useState('')
  const [newSymbolName, setNewSymbolName] = useState('')

  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [autoUpdate, setAutoUpdate] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    if (activeCategory) fetchSymbols(activeCategory)
  }, [activeCategory])

  useEffect(() => {
    const query = searchQuery.toLowerCase().trim()
    setFilteredSymbols(
      query ? symbols.filter(s => s.symbol.toLowerCase().includes(query) || s.name.toLowerCase().includes(query)) : symbols
    )
  }, [searchQuery, symbols])

  // Real-time price updates - every 10 seconds
  useEffect(() => {
    if (!autoUpdate || !activeCategory) return

    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API_URL}/api/v1/portfolio/categories/${activeCategory}/symbols-with-prices`)
        setSymbols(res.data.symbols || [])
        setFilteredSymbols(res.data.symbols || [])
        setPriceUpdateStatus(`Auto-update: ON (${new Date().toLocaleTimeString()})`)
      } catch (e) {
        logger.error('Price update error:', e)
      }
    }, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [autoUpdate, activeCategory])

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/v1/portfolio/categories`)
      setCategories(res.data.categories || [])
      if (res.data.categories.length > 0 && !activeCategory) {
        setActiveCategory(res.data.categories[0].id)
      }
    } catch (e) {
      logger.error('Error fetching categories:', e)
    }
  }

  const fetchSymbols = async (categoryId: string) => {
    try {
      const res = await axios.get(`${API_URL}/api/v1/portfolio/categories/${categoryId}/symbols-with-prices`)
      setSymbols(res.data.symbols || [])
      setFilteredSymbols(res.data.symbols || [])
      setSearchQuery('')
    } catch (e) {
      logger.error('Error fetching symbols:', e)
    }
  }

  const handleExportCSV = async () => {
    if (!activeCategory) {
      alert('Select a watchlist first')
      return
    }
    try {
      const res = await axios.get(`${API_URL}/api/v1/portfolio/categories/${activeCategory}/export`)
      
      // Create blob and download
      const element = document.createElement('a')
      const file = new Blob([res.data.csv_data], { type: 'text/csv' })
      element.href = URL.createObjectURL(file)
      element.download = res.data.filename
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
      
      alert('CSV exported successfully!')
    } catch (e) {
      alert('Failed to export CSV')
    }
  }

  const handleImportCSV = async (event: any) => {
    const file = event.target.files?.[0]
    if (!file || !activeCategory) {
      alert('Select a watchlist and CSV file')
      return
    }

    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const res = await axios.post(
        `${API_URL}/api/v1/portfolio/categories/${activeCategory}/import`,
        formData
      )
      
      alert(`Imported ${res.data.added} symbols, skipped ${res.data.skipped}`)
      await fetchSymbols(activeCategory)
    } catch (e) {
      alert('Failed to import CSV')
    }
    
    event.target.value = ''
  }

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return
    try {
      await axios.post(`${API_URL}/api/v1/portfolio/categories/create`, {
        name: newCatName,
        description: newCatDesc,
        icon: newCatIcon
      })
      setNewCatName('')
      setNewCatDesc('')
      setNewCatIcon('STOCK')
      setShowCategoryModal(false)
      await fetchCategories()
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed')
    }
  }

  const handleEditCategory = async () => {
    if (!editingCategory || !newCatName.trim()) return
    try {
      await axios.put(`${API_URL}/api/v1/portfolio/categories/${editingCategory.id}`, {
        name: newCatName,
        description: newCatDesc,
        icon: newCatIcon
      })
      setEditingCategory(null)
      setShowEditModal(false)
      await fetchCategories()
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed')
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category?')) return
    try {
      await axios.delete(`${API_URL}/api/v1/portfolio/categories/${id}`)
      await fetchCategories()
      setActiveCategory(null)
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed')
    }
  }

  const handleAddSymbol = async () => {
    if (!newSymbol.trim() || !activeCategory) return
    try {
      await axios.post(`${API_URL}/api/v1/portfolio/categories/${activeCategory}/symbols/add`, {
        symbol: newSymbol,
        name: newSymbolName
      })
      setNewSymbol('')
      setNewSymbolName('')
      setShowSymbolModal(false)
      await fetchSymbols(activeCategory)
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed')
    }
  }

  const handleDeleteSymbol = async (symbolId: string) => {
    if (!confirm('Remove?')) return
    try {
      await axios.delete(`${API_URL}/api/v1/portfolio/symbols/${symbolId}`)
      if (activeCategory) await fetchSymbols(activeCategory)
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed')
    }
  }

  const handleEditClick = (cat: Category) => {
    setEditingCategory(cat)
    setNewCatName(cat.name)
    setNewCatDesc(cat.description || '')
    setNewCatIcon(cat.icon)
    setShowEditModal(true)
  }

  const activecat = categories.find(c => c.id === activeCategory)

  return (
    <div style={{
      padding: '24px',
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      minHeight: '100vh',
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #334155', paddingBottom: '20px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 8px 0', color: '#f1f5f9' }}>
          Portfolio Manager
        </h1>
        <p style={{ fontSize: '14px', color: '#cbd5e1', margin: 0 }}>
          Track multiple watchlists with live charts • {priceUpdateStatus}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '32px', paddingBottom: '16px', borderBottom: '1px solid #334155' }}>
        {categories.map((cat) => (
          <div key={cat.id} style={{ position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => setActiveCategory(cat.id)}
              style={{
                background: activeCategory === cat.id ? '#3b82f6' : '#1e293b',
                border: `1px solid ${activeCategory === cat.id ? '#2563eb' : '#334155'}`,
                color: activeCategory === cat.id ? '#fff' : '#cbd5e1',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: activeCategory === cat.id ? '0 0 12px rgba(59, 130, 246, 0.3)' : 'none',
                transition: 'all 0.3s',
                whiteSpace: 'nowrap'
              }}
            >
              <span>{cat.name}</span>
              <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '3px', fontSize: '11px' }}>
                {cat.symbol_count}
              </span>
            </button>
            
            {activeCategory === cat.id && (
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => handleEditClick(cat)}
                  style={{
                    background: '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  style={{
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
        <button
          onClick={() => setShowCategoryModal(true)}
          style={{
            background: '#10b981',
            border: '1px solid #059669',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            flexShrink: 0,
            marginLeft: 'auto'
          }}
        >
          + New Watchlist
        </button>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '20px', minHeight: 'calc(100vh - 300px)' }}>
        {/* Left Panel */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f1f5f9', margin: 0 }}>Symbols</h2>
            <button
              onClick={() => setShowSymbolModal(true)}
              disabled={!activeCategory}
              style={{
                background: activeCategory ? '#3b82f6' : '#64748b',
                border: 'none',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: '5px',
                cursor: activeCategory ? 'pointer' : 'not-allowed',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              + Add
            </button>
          </div>

          <input
            type="text"
            placeholder="Search symbols..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '5px',
              color: '#f1f5f9',
              fontSize: '13px',
              marginBottom: '12px',
              boxSizing: 'border-box'
            }}
          />

          {/* Import/Export Buttons */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
            <button
              onClick={handleExportCSV}
              disabled={!activeCategory}
              style={{
                flex: 1,
                background: activeCategory ? '#06b6d4' : '#64748b',
                border: 'none',
                color: '#fff',
                padding: '6px 8px',
                borderRadius: '5px',
                cursor: activeCategory ? 'pointer' : 'not-allowed',
                fontSize: '11px',
                fontWeight: 600
              }}
            >
              Export CSV
            </button>
            <label style={{
              flex: 1,
              background: activeCategory ? '#f59e0b' : '#64748b',
              border: 'none',
              color: '#fff',
              padding: '6px 8px',
              borderRadius: '5px',
              cursor: activeCategory ? 'pointer' : 'not-allowed',
              fontSize: '11px',
              fontWeight: 600,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              Import CSV
              <input
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                disabled={!activeCategory}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {/* Auto-update toggle */}
          <button
            onClick={() => setAutoUpdate(!autoUpdate)}
            style={{
              width: '100%',
              background: autoUpdate ? '#10b981' : '#64748b',
              border: 'none',
              color: '#fff',
              padding: '6px 8px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
              marginBottom: '12px'
            }}
          >
            {autoUpdate ? '⏸ Stop Auto-update' : '▶ Auto-update Prices'}
          </button>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filteredSymbols.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '13px' }}>
                {symbols.length === 0 ? 'No symbols' : 'No matches'}
              </div>
            ) : (
              filteredSymbols.map((sym) => (
                <div
                  key={sym.id}
                  onClick={() => setSelectedSymbol(sym.symbol)}
                  style={{
                    background: selectedSymbol === sym.symbol ? '#3b82f6' : '#0f172a',
                    border: `1px solid ${selectedSymbol === sym.symbol ? '#2563eb' : '#334155'}`,
                    padding: '12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: selectedSymbol === sym.symbol ? '0 0 8px rgba(59, 130, 246, 0.3)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {sym.symbol}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {sym.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, marginTop: '2px' }}>
                      ${sym.current_price.toFixed(2)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteSymbol(sym.id)
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', padding: 0, marginLeft: '8px', flexShrink: 0 }}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f1f5f9', marginBottom: '16px', margin: '0 0 16px 0' }}>
            {selectedSymbol ? `${selectedSymbol} - Live Chart` : 'Select a symbol'}
          </h2>
          <div style={{ flex: 1, background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden', minHeight: '500px' }}>
            {selectedSymbol ? (
              <TradingViewChart symbol={selectedSymbol} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '16px', flexDirection: 'column', gap: '8px' }}>
                <div>Select a symbol from the left to view chart</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCategoryModal && <CategoryModal onClose={() => setShowCategoryModal(false)} onCreate={handleCreateCategory} catName={newCatName} setCatName={setNewCatName} catDesc={newCatDesc} setCatDesc={setNewCatDesc} />}
      {showEditModal && <EditModal onClose={() => setShowEditModal(false)} onSave={handleEditCategory} catName={newCatName} setCatName={setNewCatName} catDesc={newCatDesc} setCatDesc={setNewCatDesc} />}
      {showSymbolModal && <SymbolModal onClose={() => setShowSymbolModal(false)} onAdd={handleAddSymbol} symbol={newSymbol} setSymbol={setNewSymbol} symbolName={newSymbolName} setSymbolName={setNewSymbolName} />}
    </div>
  )
}

function CategoryModal({ onClose, onCreate, catName, setCatName, catDesc, setCatDesc }: any) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', width: '90%', maxWidth: '400px', padding: '20px' }}>
        <h3 style={{ fontSize: '18px', color: '#f1f5f9', marginBottom: '16px', margin: '0 0 16px 0' }}>Create Watchlist</h3>
        <input type="text" placeholder="Name" value={catName} onChange={(e) => setCatName(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', color: '#f1f5f9', marginBottom: '12px', boxSizing: 'border-box' }} />
        <input type="text" placeholder="Description" value={catDesc} onChange={(e) => setCatDesc(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', color: '#f1f5f9', marginBottom: '12px', boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', background: '#334155', border: 'none', color: '#fff', borderRadius: '5px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={onCreate} style={{ flex: 1, padding: '10px', background: '#10b981', border: 'none', color: '#fff', borderRadius: '5px', cursor: 'pointer' }}>Create</button>
        </div>
      </div>
    </div>
  )
}

function EditModal({ onClose, onSave, catName, setCatName, catDesc, setCatDesc }: any) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', width: '90%', maxWidth: '400px', padding: '20px' }}>
        <h3 style={{ fontSize: '18px', color: '#f1f5f9', marginBottom: '16px', margin: '0 0 16px 0' }}>Edit Watchlist</h3>
        <input type="text" value={catName} onChange={(e) => setCatName(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', color: '#f1f5f9', marginBottom: '12px', boxSizing: 'border-box' }} />
        <input type="text" value={catDesc} onChange={(e) => setCatDesc(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', color: '#f1f5f9', marginBottom: '12px', boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', background: '#334155', border: 'none', color: '#fff', borderRadius: '5px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={onSave} style={{ flex: 1, padding: '10px', background: '#3b82f6', border: 'none', color: '#fff', borderRadius: '5px', cursor: 'pointer' }}>Save</button>
        </div>
      </div>
    </div>
  )
}

function SymbolModal({ onClose, onAdd, symbol, setSymbol, symbolName, setSymbolName }: any) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', width: '90%', maxWidth: '400px', padding: '20px' }}>
        <h3 style={{ fontSize: '18px', color: '#f1f5f9', marginBottom: '16px', margin: '0 0 16px 0' }}>Add Symbol</h3>
        <input type="text" placeholder="Symbol (e.g., AAPL)" value={symbol} onChange={(e) => setSymbol(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', color: '#f1f5f9', marginBottom: '12px', boxSizing: 'border-box' }} />
        <input type="text" placeholder="Name (optional)" value={symbolName} onChange={(e) => setSymbolName(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', color: '#f1f5f9', marginBottom: '12px', boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', background: '#334155', border: 'none', color: '#fff', borderRadius: '5px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={onAdd} style={{ flex: 1, padding: '10px', background: '#10b981', border: 'none', color: '#fff', borderRadius: '5px', cursor: 'pointer' }}>Add</button>
        </div>
      </div>
    </div>
  )
}

function TradingViewChart({ symbol }: { symbol: string }) {
  const containerId = `tv_${symbol}_${Date.now()}`

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
          if (symbol.length <= 4 && /^[A-Z]+$/.test(symbol)) tvSymbol = `NASDAQ:${symbol}`
          else if (symbol.length === 6 && /^[A-Z]{6}$/.test(symbol)) tvSymbol = `FX_IDC:${symbol}`
          else if (symbol.includes('USDT') || symbol.includes('USD')) tvSymbol = `BINANCE:${symbol}`

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
        } catch (e) {
          logger.error(e)
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