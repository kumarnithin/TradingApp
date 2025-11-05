'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Alert {
  id: string
  account_id: string
  symbol: string
  action: string
  quantity: number
  status: string
  created_at: string
  profit_loss?: number
  strategy?: string
  account_name?: string
}

interface Account {
  id: string
  account_name: string
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [currentAccountId, setCurrentAccountId] = useState<string>('')
  const [showAllAccounts, setShowAllAccounts] = useState(false)
  const [isMultiSelect, setIsMultiSelect] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Fetch accounts on mount
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/v1/accounts/list`)
        if (response.data.accounts) {
          setAccounts(response.data.accounts)
          // Set first account as default
          if (response.data.accounts.length > 0) {
            setCurrentAccountId(response.data.accounts[0].id)
            setSelectedAccounts([response.data.accounts[0].id])
          }
        }
      } catch (err) {
        console.error('Error fetching accounts:', err)
        setError('Failed to load accounts')
      }
    }

    fetchAccounts()
  }, [])

  // Fetch alerts whenever selected accounts change
  useEffect(() => {
    if (selectedAccounts.length === 0) return

    const fetchAlerts = async () => {
      setLoading(true)
      try {
        // If showing all accounts, fetch all alerts, otherwise fetch for selected accounts
        const accountsToFetch = showAllAccounts ? accounts.map(a => a.id) : selectedAccounts

        let allAlerts: Alert[] = []

        for (const accountId of accountsToFetch) {
          const response = await axios.get(`${API_URL}/api/v1/alerts/list`, {
            params: { account_id: accountId }
          })

          if (response.data.alerts) {
            // Find account name and add to each alert
            const account = accounts.find(a => a.id === accountId)
            const alertsWithAccountName = response.data.alerts.map((alert: Alert) => ({
              ...alert,
              account_name: account?.account_name || 'Unknown'
            }))
            allAlerts = [...allAlerts, ...alertsWithAccountName]
          }
        }

        // Sort by created_at descending
        allAlerts.sort((a, b) => {
          const dateA = new Date(a.created_at).getTime()
          const dateB = new Date(b.created_at).getTime()
          return dateB - dateA
        })

        setAlerts(allAlerts)
        setError('')
      } catch (err) {
        console.error('Error fetching alerts:', err)
        setError('Failed to load alerts')
        setAlerts([])
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
  }, [selectedAccounts, showAllAccounts, accounts])

  const handleAccountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value

    if (value === 'ALL') {
      setShowAllAccounts(true)
      setIsMultiSelect(true)
      setSelectedAccounts(accounts.map(a => a.id))
    } else if (value === 'MULTI') {
      setIsMultiSelect(true)
      setShowAllAccounts(false)
    } else {
      setShowAllAccounts(false)
      setIsMultiSelect(false)
      setCurrentAccountId(value)
      setSelectedAccounts([value])
    }
  }

  const handleMultiSelectChange = (accountId: string, checked: boolean) => {
    if (checked) {
      setSelectedAccounts([...selectedAccounts, accountId])
    } else {
      setSelectedAccounts(selectedAccounts.filter(id => id !== accountId))
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Alerts</h1>
          <p className="text-gray-400 text-sm mt-2">
            Track all TradingView signals with persistent database storage
          </p>
        </div>
      </div>

      {/* Account Selector */}
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
        <label className="text-white text-sm font-medium mb-2 block">Select Account(s)</label>

        {!isMultiSelect ? (
          <select
            value={showAllAccounts ? 'ALL' : currentAccountId}
            onChange={handleAccountChange}
            className="w-full bg-gray-900 text-white p-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="">-- Select Account --</option>
            {accounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.account_name}
              </option>
            ))}
            <option value="MULTI">Multiple Accounts...</option>
            <option value="ALL">All Accounts</option>
          </select>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsMultiSelect(false)
                  setShowAllAccounts(false)
                  if (accounts.length > 0) {
                    setCurrentAccountId(accounts[0].id)
                    setSelectedAccounts([accounts[0].id])
                  }
                }}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Single Account
              </button>
              <button
                onClick={() => {
                  setShowAllAccounts(true)
                  setSelectedAccounts(accounts.map(a => a.id))
                }}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                All Accounts
              </button>
            </div>

            <div className="space-y-2">
              {accounts.map(account => (
                <label key={account.id} className="flex items-center gap-2 text-white">
                  <input
                    type="checkbox"
                    checked={selectedAccounts.includes(account.id)}
                    onChange={e => handleMultiSelectChange(account.id, e.target.checked)}
                    className="w-4 h-4"
                  />
                  {account.account_name}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Loading and Error States */}
      {loading && (
        <div className="bg-blue-900 text-blue-200 p-4 rounded-lg">
          Loading alerts...
        </div>
      )}

      {error && (
        <div className="bg-red-900 text-red-200 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Summary Statistics */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <p className="text-gray-400 text-sm">Total Alerts</p>
            <p className="text-2xl font-bold text-white mt-1">{alerts.length}</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <p className="text-gray-400 text-sm">Active</p>
            <p className="text-2xl font-bold text-yellow-400 mt-1">
              {alerts.filter(a => a.status === 'pending').length}
            </p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <p className="text-gray-400 text-sm">Filled</p>
            <p className="text-2xl font-bold text-green-400 mt-1">
              {alerts.filter(a => a.status === 'filled').length}
            </p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <p className="text-gray-400 text-sm">Failed</p>
            <p className="text-2xl font-bold text-red-400 mt-1">
              {alerts.filter(a => a.status === 'failed').length}
            </p>
          </div>
        </div>
      )}

      {/* Alerts Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900 border-b border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">
                  Symbol
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">
                  Qty
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">
                  Strategy
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">
                  Status
                </th>
                {(showAllAccounts || isMultiSelect) && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">
                    Account
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">
                  P&L
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    {loading ? 'Loading alerts...' : 'No alerts found'}
                  </td>
                </tr>
              ) : (
                alerts.map(alert => (
                  <tr key={alert.id} className="hover:bg-gray-750 transition">
                    <td className="px-4 py-3 text-sm text-white">
                      {new Date(alert.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-blue-400">
                      {alert.symbol}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          alert.action === 'BUY'
                            ? 'bg-green-900 text-green-200'
                            : 'bg-red-900 text-red-200'
                        }`}
                      >
                        {alert.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-white">{alert.quantity}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {alert.strategy || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          alert.status === 'pending'
                            ? 'bg-yellow-900 text-yellow-200'
                            : alert.status === 'filled'
                              ? 'bg-green-900 text-green-200'
                              : 'bg-red-900 text-red-200'
                        }`}
                      >
                        {alert.status}
                      </span>
                    </td>
                    {(showAllAccounts || isMultiSelect) && (
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {alert.account_name}
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm font-semibold">
                      <span
                        className={
                          alert.profit_loss && alert.profit_loss > 0
                            ? 'text-green-400'
                            : alert.profit_loss && alert.profit_loss < 0
                              ? 'text-red-400'
                              : 'text-white'
                        }
                      >
                        {alert.profit_loss ? `$${alert.profit_loss.toFixed(2)}` : '-'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Debug Info */}
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
        <details className="text-gray-400 text-xs">
          <summary className="cursor-pointer hover:text-gray-300">Debug Info</summary>
          <pre className="mt-2 text-gray-500 overflow-auto max-h-40">
            {JSON.stringify(
              {
                currentAccountId,
                selectedAccounts,
                showAllAccounts,
                isMultiSelect,
                alertsCount: alerts.length
              },
              null,
              2
            )}
          </pre>
        </details>
      </div>
    </div>
  )
}
