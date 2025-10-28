import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface MicrostructureData {
  bidAskSpread: number
  spreadCompression: boolean
  quoteChangeRate: number
  quotingActivity: 'LOW' | 'NORMAL' | 'HIGH'
  lastTradeSize: number
  tradeIntensity: number
  volatilityRegime: 'LOW' | 'NORMAL' | 'HIGH'
  orderImbalanceRatio: number
}

export function useMicrostructure(symbol: string) {
  const [data, setData] = useState<MicrostructureData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMicrostructure = useCallback(async () => {
    if (!symbol) return

    setLoading(true)
    setError(null)

    try {
      const response = await axios.get(`${API_URL}/api/v1/lit/microstructure/${symbol}`)
      setData(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch microstructure data')
      // Mock data fallback
      setData({
        bidAskSpread: 0.02,
        spreadCompression: false,
        quoteChangeRate: 45,
        quotingActivity: 'HIGH',
        lastTradeSize: 5200,
        tradeIntensity: 87,
        volatilityRegime: 'NORMAL',
        orderImbalanceRatio: 1.35
      })
    } finally {
      setLoading(false)
    }
  }, [symbol])

  const isSpreadWidening = useCallback(() => {
    return data && data.bidAskSpread > 0.05
  }, [data])

  const isHighQuotingActivity = useCallback(() => {
    return data && data.quotingActivity === 'HIGH'
  }, [data])

  const isHighVolatility = useCallback(() => {
    return data && data.volatilityRegime === 'HIGH'
  }, [data])

  useEffect(() => {
    fetchMicrostructure()
    const interval = setInterval(fetchMicrostructure, 1000)
    return () => clearInterval(interval)
  }, [fetchMicrostructure])

  return {
    data,
    loading,
    error,
    refetch: fetchMicrostructure,
    isSpreadWidening,
    isHighQuotingActivity,
    isHighVolatility,
    marketQuality: data ? (data.bidAskSpread < 0.05 && data.volatilityRegime !== 'HIGH' ? 'GOOD' : 'POOR') : null
  }
}
