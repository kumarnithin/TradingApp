'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Order {
  order_id: number
  symbol: string
  contract_type: string
  action: string
  quantity: number
  order_type: string
  limit_price?: number
  status: string
  filled: number
  remaining: number
  avg_fill_price: number
  timestamp: string
}

interface Position {
  account: string
  symbol: string
  contract_type: string
  quantity: number
  avg_cost: number
  market_price: number
  market_value: number
  unrealized_pnl: number
  realized_pnl: number
  timestamp: string
}

interface ConnectionStatus {
  connected: boolean
  account_type?: string
  account_name?: string
  account?: string
  equity?: number
  buying_power?: number
  timestamp?: string
}

export default function TradePage() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ connected: false })
  const [orders, setOrders] = useState<Order[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(false)
  const [tradeHistory, setTradeHistory] = useState<any[]>([])

  // Form state
  const [contractType, setContractType] = useState('stock')
  const [symbol, setSymbol] = useState('AAPL')
  const [quantity, setQuantity] = useState('10')
  const [action, setAction] = useState('BUY')
  const [orderType, setOrderType] = useState('MKT')
  const [limitPrice, setLimitPrice] = useState('')
  const [exchange, setExchange] = useState('NASDAQ')

  useEffect(() => {
    checkConnectionStatus()
    refreshOrders()
    refreshPositions()
    const interval = setInterval(() => {
      checkConnectionStatus()
      refreshOrders()
      refreshPositions()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const checkConnectionStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/ib/connection-status`)
      setConnectionStatus(response.data)
    } catch (error) {
      setConnectionStatus({ connected: false })
    }
  }

  const refreshOrders = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/ib/orders`)
      if (response.data.status === 'success') {
        setOrders(response.data.orders || [])
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
  }

  const refreshPositions = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/ib/positions`)
      if (response.data.status === 'success') {
        setPositions(response.data.positions || [])
      }
    } catch (error) {
      console.error('Error fetching positions:', error)
    }
  }

  const placeOrder = async () => {
    if (!connectionStatus.connected) {
      addToHistory('error', 'Not connected to IB. Connect first!')
      return
    }

    setLoading(true)
    const orderData: any = {
      contract_type: contractType,
      symbol,
      quantity: parseInt(quantity),
      action,
      order_type: orderType
    }

    if (contractType === 'stock' || contractType === 'option' || contractType === 'future') {
      orderData.exchange = exchange
    }

    if (orderType === 'LMT' && limitPrice) {
      orderData.limit_price = parseFloat(limitPrice)
    }

    if (contractType === 'forex') {
      orderData.pair = symbol
    }

    addToHistory('info', `Placing ${action} order: ${quantity} ${symbol}...`)

    try {
      const response = await axios.post(`${API_URL}/api/v1/ib/orders/place`, orderData)
      
      if (response.data.status === 'success') {
        addToHistory('success', `✅ Order placed! Order ID: ${response.data.order_id}`)
        setSymbol('AAPL')
        setQuantity('10')
        setLimitPrice('')
        refreshOrders()
        refreshPositions()
      } else {
        addToHistory('error', `Failed: ${response.data.error}`)
      }
    } catch (error: any) {
      addToHistory('error', `Error: ${error.response?.data?.detail || error.message}`)
    }

    setLoading(false)
  }

  const cancelOrder = async (orderId: number) => {
    setLoading(true)
    addToHistory('info', `Cancelling order ${orderId}...`)

    try {
      const response = await axios.delete(`${API_URL}/api/v1/ib/orders/${orderId}`)
      
      if (response.data.status === 'success') {
        addToHistory('success', `✅ Order ${orderId} cancelled`)
        refreshOrders()
      } else {
        addToHistory('error', `Failed: ${response.data.error}`)
      }
    } catch (error: any) {
      addToHistory('error', `Error: ${error.response?.data?.detail || error.message}`)
    }

    setLoading(false)
  }

  const addToHistory = (type: string, message: string) => {
    const newEntry = {
      id: Date.now(),
      type,
      message,
      timestamp: new Date().toISOString()
    }
    setTradeHistory([newEntry, ...tradeHistory.slice(0, 14)])
  }

  const getSampleOrders = () => {
    const samples = [
      { type: 'stock', symbol: 'AAPL', qty: 10, exchange: 'NASDAQ' },
      { type: 'stock', symbol: 'TSLA', qty: 5, exchange: 'NASDAQ' },
      { type: 'stock', symbol: 'SPY', qty: 3, exchange: 'ARCA' },
      { type: 'forex', symbol: 'EURUSD', qty: 100000 },
      { type: 'crypto', symbol: 'BTC', qty: 0.1 },
    ]
    return samples
  }

  const quickBuy = (sample: any) => {
    setContractType(sample.type)
    setSymbol(sample.symbol)
    setQuantity(sample.qty.toString())
    if (sample.exchange) {
      setExchange(sample.exchange)
    }
    setAction('BUY')
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          📈 Trading
        </h1>
        <p style={{ color: '#666' }}>Execute trades on your connected IB account</p>
      </div>

      {/* Connection Status */}
      <div style={{ 
        background: connectionStatus.connected ? '#10b981' : '#ef4444',
        color: 'white',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
            {connectionStatus.connected ? '🟢 CONNECTED' : '🔴 DISCONNECTED'}
          </span>
          {connectionStatus.connected && connectionStatus.account_name && (
            <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Account: <strong>{connectionStatus.account_name}</strong>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        {/* Trade Form */}
        <div style={{ 
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '2rem',
          background: 'white'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Place Order</h2>

          {!connectionStatus.connected && (
            <div style={{
              background: '#fef3c7',
              color: '#92400e',
              padding: '1rem',
              borderRadius: '4px',
              marginBottom: '1.5rem'
            }}>
              ⚠️ Connect to IB in Settings first!
            </div>
          )}

          {/* Contract Type */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
              Contract Type
            </label>
            <select
              value={contractType}
              onChange={(e) => {
                setContractType(e.target.value)
                if (e.target.value === 'forex') setSymbol('EURUSD')
                else if (e.target.value === 'crypto') setSymbol('BTC')
                else if (e.target.value === 'future') setSymbol('ES')
                else setSymbol('AAPL')
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            >
              <option value="stock">📈 Stock</option>
              <option value="forex">💱 Forex</option>
              <option value="future">📊 Futures</option>
              <option value="crypto">🪙 Crypto</option>
              <option value="option">📉 Option</option>
            </select>
          </div>

          {/* Symbol */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
              {contractType === 'forex' ? 'Pair' : 'Symbol'}
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder={contractType === 'forex' ? 'EURUSD' : 'AAPL'}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>

          {/* Exchange (for stocks/futures) */}
          {(contractType === 'stock' || contractType === 'future' || contractType === 'option') && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
                Exchange
              </label>
              <select
                value={exchange}
                onChange={(e) => setExchange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              >
                {contractType === 'stock' && (
                  <>
                    <option value="NASDAQ">NASDAQ</option>
                    <option value="NYSE">NYSE</option>
                    <option value="ARCA">ARCA</option>
                    <option value="SMART">SMART</option>
                  </>
                )}
                {contractType === 'future' && (
                  <>
                    <option value="CME">CME</option>
                    <option value="CBOT">CBOT</option>
                    <option value="NYMEX">NYMEX</option>
                  </>
                )}
                {contractType === 'option' && (
                  <>
                    <option value="SMART">SMART</option>
                    <option value="CBOE">CBOE</option>
                  </>
                )}
              </select>
            </div>
          )}

          {/* Quantity */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
              Quantity
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="0.1"
              step="0.1"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>

          {/* Action */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
              Action
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setAction('BUY')}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: action === 'BUY' ? '#10b981' : '#e5e7eb',
                  color: action === 'BUY' ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                📈 BUY
              </button>
              <button
                onClick={() => setAction('SELL')}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: action === 'SELL' ? '#ef4444' : '#e5e7eb',
                  color: action === 'SELL' ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                📉 SELL
              </button>
            </div>
          </div>

          {/* Order Type */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
              Order Type
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setOrderType('MKT')}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: orderType === 'MKT' ? '#3b82f6' : '#e5e7eb',
                  color: orderType === 'MKT' ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Market
              </button>
              <button
                onClick={() => setOrderType('LMT')}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: orderType === 'LMT' ? '#3b82f6' : '#e5e7eb',
                  color: orderType === 'LMT' ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Limit
              </button>
            </div>
          </div>

          {/* Limit Price */}
          {orderType === 'LMT' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
                Limit Price
              </label>
              <input
                type="number"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                placeholder="0.00"
                step="0.01"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={placeOrder}
            disabled={loading || !connectionStatus.connected}
            style={{
              width: '100%',
              padding: '1rem',
              background: connectionStatus.connected ? '#10b981' : '#9ca3af',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              fontSize: '1rem',
              cursor: connectionStatus.connected && !loading ? 'pointer' : 'not-allowed'
            }}
          >
            {loading ? '⏳ Placing...' : `📤 Place ${action} Order`}
          </button>
        </div>

        {/* Quick Buy Samples */}
        <div style={{ 
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '2rem',
          background: 'white'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Quick Buy Samples</h2>
          <p style={{ color: '#666', marginBottom: '1rem' }}>Click to auto-fill the form:</p>
          
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {getSampleOrders().map((sample, idx) => (
              <button
                key={idx}
                onClick={() => quickBuy(sample)}
                disabled={!connectionStatus.connected}
                style={{
                  padding: '1rem',
                  background: connectionStatus.connected ? '#f3f4f6' : '#e5e7eb',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  cursor: connectionStatus.connected ? 'pointer' : 'not-allowed',
                  textAlign: 'left',
                  opacity: connectionStatus.connected ? 1 : 0.6
                }}
              >
                <div style={{ fontWeight: 'bold' }}>
                  {sample.type === 'stock' && '📈'} 
                  {sample.type === 'forex' && '💱'} 
                  {sample.type === 'crypto' && '🪙'} 
                  {sample.symbol} - {sample.qty} units
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                  {sample.type.charAt(0).toUpperCase() + sample.type.slice(1)}
                </div>
              </button>
            ))}
          </div>

          <div style={{ marginTop: '2rem', padding: '1rem', background: '#f0fdf4', borderRadius: '4px' }}>
            <p style={{ fontSize: '0.9rem', color: '#166534' }}>
              💡 <strong>Tip:</strong> Demo trades are simulated. Great for testing without risk!
            </p>
          </div>
        </div>
      </div>

      {/* Open Orders */}
      {orders.length > 0 && (
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '2rem',
          background: 'white',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>📋 Open Orders ({orders.length})</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Order ID</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Symbol</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Type</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Action</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Qty</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Filled</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Avg Price</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.order_id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem' }}><strong>{order.order_id}</strong></td>
                    <td style={{ padding: '1rem' }}>{order.symbol}</td>
                    <td style={{ padding: '1rem' }}>{order.contract_type}</td>
                    <td style={{ padding: '1rem', fontWeight: 'bold', color: order.action === 'BUY' ? '#10b981' : '#ef4444' }}>
                      {order.action}
                    </td>
                    <td style={{ padding: '1rem' }}>{order.quantity}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        background: order.status === 'Filled' ? '#dbeafe' : '#fef3c7',
                        color: order.status === 'Filled' ? '#0c4a6e' : '#92400e',
                        borderRadius: '4px',
                        fontSize: '0.875rem'
                      }}>
                        {order.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>{order.filled}</td>
                    <td style={{ padding: '1rem' }}>${order.avg_fill_price.toFixed(2)}</td>
                    <td style={{ padding: '1rem' }}>
                      <button
                        onClick={() => cancelOrder(order.order_id)}
                        disabled={loading}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Positions */}
      {positions.length > 0 && (
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '2rem',
          background: 'white',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>💼 Open Positions ({positions.length})</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {positions.map((pos, idx) => (
              <div
                key={idx}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '1rem',
                  background: '#f9fafb'
                }}
              >
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  {pos.symbol}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                  <div>Qty: <strong>{pos.quantity}</strong></div>
                  <div>Avg Cost: <strong>${pos.avg_cost.toFixed(2)}</strong></div>
                  <div>Market Price: <strong>${pos.market_price.toFixed(2)}</strong></div>
                  <div>Market Value: <strong>${pos.market_value.toFixed(2)}</strong></div>
                </div>
                <div style={{
                  padding: '0.75rem',
                  background: pos.unrealized_pnl >= 0 ? '#dcfce7' : '#fee2e2',
                  borderRadius: '4px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  color: pos.unrealized_pnl >= 0 ? '#166534' : '#991b1b'
                }}>
                  P&L: ${pos.unrealized_pnl.toFixed(2)} ({((pos.unrealized_pnl / (pos.avg_cost * pos.quantity)) * 100).toFixed(2)}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trade History */}
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '2rem',
        background: 'white'
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>📝 Trade History</h2>
        <div style={{ 
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          background: 'white',
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          {tradeHistory.length > 0 ? (
            tradeHistory.map((entry) => (
              <div
                key={entry.id}
                style={{
                  padding: '1rem',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>
                    {entry.type === 'success' ? '✅' : entry.type === 'error' ? '❌' : entry.type === 'warning' ? '⚠️' : 'ℹ️'}
                  </span>
                  <span>{entry.message}</span>
                </div>
                <span style={{ color: '#666', fontSize: '0.8rem' }}>
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
              No trades yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function SignalsPage() {
  // 1️⃣ ADD STATE VARIABLES
  const [signals, setSignals] = useState([])
  const [loading, setLoading] = useState(false)
  
  // These 4 variables track the filter
  const [currentAccountId, setCurrentAccountId] = useState(null)
  const [selectedAccounts, setSelectedAccounts] = useState([])
  const [showAllAccounts, setShowAllAccounts] = useState(false)
  const [isMultiSelect, setIsMultiSelect] = useState(false)

  // 2️⃣ LOAD SAVED FILTER (Run once on mount)
  useEffect(() => {
    const savedShowAll = localStorage.getItem('showAllAccounts')
    const savedAccountId = localStorage.getItem('currentAccountId')
    const savedSelectedAccounts = localStorage.getItem('selectedAccounts')
    const savedIsMultiSelect = localStorage.getItem('isMultiSelectMode')

    if (savedIsMultiSelect === 'true' && savedSelectedAccounts) {
      setIsMultiSelect(true)
      setSelectedAccounts(JSON.parse(savedSelectedAccounts))
      setShowAllAccounts(false)
    } else if (savedShowAll === 'true') {
      setShowAllAccounts(true)
      setSelectedAccounts([])
      setIsMultiSelect(false)
    } else if (savedAccountId) {
      setCurrentAccountId(savedAccountId)
      setShowAllAccounts(false)
      setSelectedAccounts([])
      setIsMultiSelect(false)
    }
  }, []) // Empty array = run only once

  // 3️⃣ LISTEN FOR ACCOUNT SWITCHER CHANGES
  useEffect(() => {
    const handleAccountChange = (event) => {
      const { account, showAll, selectedAccounts: selected, isMultiSelect: multiSelect } = event.detail

      if (multiSelect && selected && selected.length > 0) {
        setIsMultiSelect(true)
        setSelectedAccounts(selected)
        setShowAllAccounts(false)
        setCurrentAccountId(null)
      } else if (showAll) {
        setShowAllAccounts(true)
        setSelectedAccounts([])
        setIsMultiSelect(false)
        setCurrentAccountId(null)
      } else if (account) {
        setCurrentAccountId(account.id)
        setShowAllAccounts(false)
        setSelectedAccounts([])
        setIsMultiSelect(false)
      }
    }

    window.addEventListener('accountChanged', handleAccountChange)
    return () => window.removeEventListener('accountChanged', handleAccountChange)
  }, []) // Empty array = run only once

  // 4️⃣ RELOAD DATA WHEN FILTER CHANGES
  useEffect(() => {
    loadSignals()
  }, [currentAccountId, selectedAccounts, showAllAccounts, isMultiSelect])
  // These 4 variables are dependencies - when ANY change, reload data

  // 5️⃣ BUILD API URL AND FETCH DATA
  const loadSignals = async () => {
    try {
      setLoading(true)
      let url = `${API_URL}/api/v1/signals/list`

      // BUILD URL BASED ON CURRENT FILTER
      if (isMultiSelect && selectedAccounts.length > 0) {
        // Multi-select mode: send multiple IDs
        url += `?account_ids=${selectedAccounts.join(',')}`
      } else if (!showAllAccounts && currentAccountId) {
        // Single account mode: send one ID
        url += `?account_id=${currentAccountId}`
      }
      // else: All accounts mode (no filter)

      const response = await axios.get(url)
      setSignals(response.data.signals || [])
      setLoading(false)
    } catch (error) {
      console.error('Error loading signals:', error)
      setLoading(false)
    }
  }

  // 6️⃣ RENDER THE PAGE
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Signals</h1>

      {/* SHOW WHICH FILTER IS ACTIVE */}
      <div style={{
        padding: '0.75rem 1rem',
        background: isMultiSelect ? '#8b5cf6' : (showAllAccounts ? '#3b82f6' : '#10b981'),
        color: 'white',
        borderRadius: '8px',
        marginBottom: '2rem',
        display: 'inline-block'
      }}>
        {isMultiSelect
          ? `✅ ${selectedAccounts.length} Selected`
          : showAllAccounts
            ? '📊 All Accounts'
            : '🏢 Single Account'
        }
      </div>

      {/* SHOW LOADING */}
      {loading && <div>Loading...</div>}

      {/* SHOW SIGNALS */}
      {!loading && signals.length === 0 && <div>No signals</div>}

      {!loading && signals.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Action</th>
              <th>Status</th>
              {(showAllAccounts || isMultiSelect) && <th>Account</th>}
            </tr>
          </thead>
          <tbody>
            {signals.map(signal => (
              <tr key={signal.id}>
                <td>{signal.symbol}</td>
                <td>{signal.action}</td>
                <td>{signal.status}</td>
                {(showAllAccounts || isMultiSelect) && <td>{signal.account_name}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
