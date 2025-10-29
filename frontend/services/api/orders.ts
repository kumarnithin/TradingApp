import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface Order {
  id: string
  symbol: string
  order_type: string
  side: string
  quantity: number
  price?: number
  status: string
  filled_qty: number
  created_at: string
}

export interface OrderCreateData {
  symbol: string
  side: 'BUY' | 'SELL'
  quantity: number
  order_type: 'MARKET' | 'LIMIT' | 'STOP'
  price?: number
  stop_price?: number
}

export const ordersAPI = {
  // Get orders
  getOrders: async (status?: string): Promise<{ orders: Order[]; total: number }> => {
    try {
      const params = status ? { status } : {}
      const response = await axios.get(`${API_URL}/api/v1/orders`, { params })
      return response.data
    } catch (error) {
      console.error('Error fetching orders:', error)
      throw error
    }
  },

  // Place order
  placeOrder: async (orderData: OrderCreateData) => {
    try {
      const response = await axios.post(`${API_URL}/api/v1/orders/place`, orderData)
      return response.data
    } catch (error) {
      console.error('Error placing order:', error)
      throw error
    }
  },

  // Cancel order
  cancelOrder: async (orderId: string) => {
    try {
      const response = await axios.delete(`${API_URL}/api/v1/orders/${orderId}`)
      return response.data
    } catch (error) {
      console.error('Error canceling order:', error)
      throw error
    }
  },

  // Get order status
  getOrderStatus: async (orderId: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/orders/${orderId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching order status:', error)
      throw error
    }
  }
}
