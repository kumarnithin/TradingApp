'use client'

import { useEffect, useState } from 'react'
import { ordersAPI, Order, OrderCreateData } from '@/services/api/orders'
import styles from './trades.module.css'
import logger from '../../../utils/logger'

export default function TradesPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [showPlaceOrder, setShowPlaceOrder] = useState(false)
  const [formData, setFormData] = useState<OrderCreateData>({
    symbol: 'AAPL',
    side: 'BUY',
    quantity: 100,
    order_type: 'MARKET'
  })

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchOrders = async () => {
    try {
      const data = await ordersAPI.getOrders()
      setOrders(data.orders)
      setLoading(false)
    } catch (error) {
      logger.error('Error fetching orders:', error)
      setLoading(false)
    }
  }

  const handlePlaceOrder = async () => {
    try {
      const result = await ordersAPI.placeOrder(formData)
      alert('Order placed: ' + result.order_id)
      setShowPlaceOrder(false)
      fetchOrders()
    } catch (error) {
      alert('Failed to place order')
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    if (confirm('Cancel this order?')) {
      try {
        await ordersAPI.cancelOrder(orderId)
        fetchOrders()
      } catch (error) {
        alert('Failed to cancel order')
      }
    }
  }

  return (
    <div className={styles.tradesPage}>
      <h1>Trades</h1>
      
      <button onClick={() => setShowPlaceOrder(true)} className={styles.btnAdd}>
        + Place Order
      </button>

      {/* Place Order Modal */}
      {showPlaceOrder && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Place Order</h2>
            <input
              placeholder="Symbol"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
            />
            <select
              value={formData.side}
              onChange={(e) => setFormData({ ...formData, side: e.target.value as 'BUY' | 'SELL' })}
            >
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
            <input
              type="number"
              placeholder="Quantity"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
            />
            <select
              value={formData.order_type}
              onChange={(e) => setFormData({ ...formData, order_type: e.target.value as any })}
            >
              <option value="MARKET">MARKET</option>
              <option value="LIMIT">LIMIT</option>
              <option value="STOP">STOP</option>
            </select>
            {formData.order_type === 'LIMIT' && (
              <input
                type="number"
                placeholder="Price"
                value={formData.price || ''}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
              />
            )}
            <div className={styles.buttons}>
              <button onClick={handlePlaceOrder}>Place Order</button>
              <button onClick={() => setShowPlaceOrder(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className={styles.ordersTable}>
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Side</th>
              <th>Quantity</th>
              <th>Type</th>
              <th>Price</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id}>
                <td>{order.symbol}</td>
                <td className={order.side === 'BUY' ? styles.buy : styles.sell}>
                  {order.side}
                </td>
                <td>{order.quantity}</td>
                <td>{order.order_type}</td>
                <td>${order.price || 'Market'}</td>
                <td className={styles[order.status.toLowerCase()]}>
                  {order.status}
                </td>
                <td>
                  {order.status === 'submitted' && (
                    <button onClick={() => handleCancelOrder(order.id)}>Cancel</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
