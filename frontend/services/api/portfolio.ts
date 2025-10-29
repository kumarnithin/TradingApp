import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface Position {
  id: string
  symbol: string
  quantity: number
  avg_cost: number
  current_price: number
  market_value: number
  pnl: number
  pnl_percent: number
  day_change: number
  day_change_percent: number
}

export interface PortfolioSummary {
  total_value: number
  total_cost: number
  total_pnl: number
  total_pnl_percent: number
  day_change: number
  day_change_percent: number
  cash: number
  buying_power: number
}

export const portfolioAPI = {
  // Get positions
  getPositions: async (): Promise<{ positions: Position[]; total: number }> => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/portfolio/positions`)
      return response.data
    } catch (error) {
      console.error('Error fetching positions:', error)
      throw error
    }
  },

  // Get portfolio summary
  getSummary: async (): Promise<PortfolioSummary> => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/portfolio/summary`)
      return response.data
    } catch (error) {
      console.error('Error fetching portfolio summary:', error)
      throw error
    }
  }
}
