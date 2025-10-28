import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface OrderFlowData {
  bidVolume: number
  askVolume: number
  bidAskRatio: number
  largeOrdersCount: number
  cumulativeDelta: number
  vwap: number
  orderBookImbalance: number
  liquidityScore: number
}

export function useOrderFlow(symbol: string) {
  const [data, setData] = useState<OrderFlowData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOrderFlow = useCallback(async () => {
    if (!symbol) return

    setLoading(true)
    setError(null)

    try {
      const response = await axios.get(`${API_URL}/api/v1/lit/order-flow/${symbol}`)
      setData(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch order flow')
      // Mock data fallback
      setData({
        bidVolume: 125000,
        askVolume: 98000,
        bidAskRatio: 1.27,
        largeOrdersCount: 5,
        cumulativeDelta: 2800,
        vwap: 150.25,
        orderBookImbalance: 0.65,
        liquidityScore: 78
      })
    } finally {
      setLoading(false)
    }
  }, [symbol])

  useEffect(() => {
    fetchOrderFlow()
    const interval = setInterval(fetchOrderFlow, 1000)
    return () => clearInterval(interval)
  }, [fetchOrderFlow])

  return { data, loading, error, refetch: fetchOrderFlow }
}
