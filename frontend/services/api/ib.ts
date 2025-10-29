import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface IBConnection {
  host: string
  port: number
  client_id: number
}

export interface IBStatus {
  connected: boolean
  account?: string
  last_updated: string
}

export const ibAPI = {
  // Check connection status
  getConnectionStatus: async (): Promise<IBStatus> => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/ib/connection-status`)
      return response.data
    } catch (error) {
      console.error('Error fetching connection status:', error)
      throw error
    }
  },

  // Connect to IB
  connect: async (connectionData: IBConnection) => {
    try {
      const response = await axios.post(`${API_URL}/api/v1/ib/connect`, connectionData)
      return response.data
    } catch (error) {
      console.error('Error connecting to IB:', error)
      throw error
    }
  },

  // Disconnect from IB
  disconnect: async () => {
    try {
      const response = await axios.post(`${API_URL}/api/v1/ib/disconnect`)
      return response.data
    } catch (error) {
      console.error('Error disconnecting from IB:', error)
      throw error
    }
  },

  // Get available accounts
  getAccounts: async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/ib/accounts`)
      return response.data
    } catch (error) {
      console.error('Error fetching accounts:', error)
      throw error
    }
  }
}
