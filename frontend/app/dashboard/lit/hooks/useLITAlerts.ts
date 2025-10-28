import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Alert {
  id: string
  type: 'SPOOFING' | 'ACCUMULATION' | 'ICEBERG' | 'LAYERING' | 'WHALE'
  message: string
  confidence: number
  time: string
  symbol: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

export function useLITAlerts(symbol: string) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAlerts = useCallback(async () => {
    if (!symbol) return

    setLoading(true)
    setError(null)

    try {
      const response = await axios.get(`${API_URL}/api/v1/lit/alerts/${symbol}`)
      setAlerts(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts')
      // Mock alerts fallback
      setAlerts([
        {
          id: '1',
          type: 'SPOOFING',
          message: 'Potential spoofing detected at $150.25',
          confidence: 85,
          time: '13:45',
          symbol,
          severity: 'HIGH'
        },
        {
          id: '2',
          type: 'ACCUMULATION',
          message: 'Institutional accumulation phase detected',
          confidence: 78,
          time: '13:40',
          symbol,
          severity: 'MEDIUM'
        },
        {
          id: '3',
          type: 'ICEBERG',
          message: 'Hidden iceberg order detected: ~50K shares',
          confidence: 92,
          time: '13:35',
          symbol,
          severity: 'CRITICAL'
        }
      ])
    } finally {
      setLoading(false)
    }
  }, [symbol])

  const clearAlerts = useCallback(() => {
    setAlerts([])
  }, [])

  const removeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id))
  }, [])

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 2000) // Update every 2 seconds
    return () => clearInterval(interval)
  }, [fetchAlerts])

  return {
    alerts,
    loading,
    error,
    clearAlerts,
    removeAlert,
    refetch: fetchAlerts,
    alertCount: alerts.length,
    criticalAlerts: alerts.filter(a => a.severity === 'CRITICAL').length
  }
}
