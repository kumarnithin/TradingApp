'use client';

import React, { useState, useEffect } from 'react';
import styles from './trades.module.css';

interface Trade {
  id: string;
  account_id: string;
  symbol: string;
  action: string;
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  trade_type: string;
  status: string;
  profit_loss: number | null;
  win_percentage: number | null;
  commission: number;
  notes: string;
  entry_at: string;
  exit_at: string | null;
  created_at: string;
}

export default function TradesPage() {
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [symbolFilter, setSymbolFilter] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [newTrade, setNewTrade] = useState({
    symbol: '',
    action: 'BUY',
    entry_price: 0,
    quantity: 1,
    trade_type: 'Market'
  });

  // ✅ FIXED: Don't auto-fetch accounts (they may not exist)
  // Just use manual account ID input
  useEffect(() => {
    // Load saved account ID from localStorage if available
    const savedAccountId = localStorage.getItem('selectedAccountId');
    if (savedAccountId) {
      setSelectedAccount(savedAccountId);
      fetchTrades(savedAccountId);
    }
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      // Save to localStorage
      localStorage.setItem('selectedAccountId', selectedAccount);
      fetchTrades(selectedAccount);
    }
  }, [selectedAccount]);

  // ✅ FIXED: Fetch trades from the correct endpoint
  const fetchTrades = async (accountId: string) => {
    if (!accountId) {
      setTrades([]);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const url = `/api/v1/trades/list-from-signals?account_id=${accountId}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Endpoint not found. Make sure backend is running.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.trades && Array.isArray(result.trades)) {
        setTrades(result.trades);
        setError('');
      } else {
        setTrades([]);
      }
    } catch (err) {
      console.error('Error fetching trades:', err);
      setError(`Failed to load trades: ${(err as Error).message}`);
      setTrades([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrade = async () => {
    if (!selectedAccount) {
      alert('Please enter an account ID');
      return;
    }

    if (!newTrade.symbol) {
      alert('Please enter a symbol');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/trades/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: selectedAccount,
          ...newTrade,
          entry_price: parseFloat(newTrade.entry_price as any),
          quantity: parseInt(newTrade.quantity as any)
        })
      });

      const result = await response.json();
      if (result.status === 'success') {
        setShowForm(false);
        setNewTrade({ symbol: '', action: 'BUY', entry_price: 0, quantity: 1, trade_type: 'Market' });
        alert('Trade created successfully!');
        fetchTrades(selectedAccount);
      } else {
        alert('Error creating trade: ' + (result.detail || result.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Error: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTrade = async (tradeId: string, exitPrice: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/trades/${tradeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exit_price: exitPrice })
      });

      const result = await response.json();
      if (result.status === 'success') {
        alert('Trade updated successfully!');
        fetchTrades(selectedAccount);
      } else {
        alert('Error updating trade: ' + (result.detail || result.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Error: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrade = async (tradeId: string) => {
    if (window.confirm('Are you sure you want to delete this trade?')) {
      setLoading(true);
      try {
        const response = await fetch(`/api/v1/trades/${tradeId}`, {
          method: 'DELETE'
        });

        const result = await response.json();
        if (result.status === 'success') {
          alert('Trade deleted successfully!');
          fetchTrades(selectedAccount);
        } else {
          alert('Error deleting trade: ' + (result.detail || result.message || 'Unknown error'));
        }
      } catch (err) {
        alert('Error: ' + (err as Error).message);
      } finally {
        setLoading(false);
      }
    }
  };

  const filteredTrades = trades.filter((trade: Trade) => {
    if (statusFilter && trade.status.toUpperCase() !== statusFilter.toUpperCase()) return false;
    if (symbolFilter && trade.symbol.toUpperCase() !== symbolFilter.toUpperCase()) return false;
    return true;
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>📊 Trades</h1>
        <p>Track and manage your trades</p>
      </div>

      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Enter Account ID (e.g., DU2348080)"
          value={selectedAccount}
          onChange={(e) => setSelectedAccount(e.target.value)}
          className={styles.input}
          disabled={loading}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={styles.select}
          disabled={loading}
        >
          <option value="">All Status</option>
          <option value="OPEN">OPEN</option>
          <option value="CLOSED">CLOSED</option>
        </select>

        <input
          type="text"
          placeholder="Filter by symbol (e.g., EURUSD)..."
          value={symbolFilter}
          onChange={(e) => setSymbolFilter(e.target.value)}
          className={styles.input}
          disabled={loading}
        />

        <button 
          onClick={() => setShowForm(!showForm)} 
          className={styles.button}
          disabled={loading || !selectedAccount}
        >
          {showForm ? 'Cancel' : '+ New Trade'}
        </button>

        <button 
          onClick={() => fetchTrades(selectedAccount)} 
          className={styles.button}
          disabled={loading || !selectedAccount}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {showForm && (
        <div className={styles.form}>
          <h2>Create New Trade</h2>
          <input
            type="text"
            placeholder="Symbol (e.g., EURUSD)"
            value={newTrade.symbol}
            onChange={(e) => setNewTrade({ ...newTrade, symbol: e.target.value })}
            className={styles.input}
            disabled={loading}
          />
          <select
            value={newTrade.action}
            onChange={(e) => setNewTrade({ ...newTrade, action: e.target.value })}
            className={styles.select}
            disabled={loading}
          >
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
          <input
            type="number"
            placeholder="Entry Price"
            value={newTrade.entry_price}
            onChange={(e) => setNewTrade({ ...newTrade, entry_price: parseFloat(e.target.value) })}
            className={styles.input}
            disabled={loading}
            step="0.0001"
          />
          <input
            type="number"
            placeholder="Quantity"
            value={newTrade.quantity}
            onChange={(e) => setNewTrade({ ...newTrade, quantity: parseInt(e.target.value) })}
            className={styles.input}
            disabled={loading}
          />
          <button 
            onClick={handleCreateTrade} 
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Trade'}
          </button>
        </div>
      )}

      {error && <div className={styles.error}>⚠️ {error}</div>}

      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.loading}>Loading trades...</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>SYMBOL</th>
                <th>ACTION</th>
                <th>QTY</th>
                <th>ENTRY</th>
                <th>EXIT</th>
                <th>P&L</th>
                <th>WIN %</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.length > 0 ? (
                filteredTrades.map((trade: Trade) => (
                  <tr key={trade.id} className={trade.status === 'OPEN' ? styles.openTrade : styles.closedTrade}>
                    <td><strong>{trade.symbol}</strong></td>
                    <td>
                      <span className={trade.action === 'BUY' ? styles.buy : styles.sell}>
                        {trade.action}
                      </span>
                    </td>
                    <td>{trade.quantity}</td>
                    <td>${trade.entry_price?.toFixed(4)}</td>
                    <td>${trade.exit_price ? trade.exit_price.toFixed(4) : '-'}</td>
                    <td className={
                      trade.profit_loss && trade.profit_loss > 0 ? styles.profit 
                      : trade.profit_loss && trade.profit_loss < 0 ? styles.loss 
                      : ''
                    }>
                      ${trade.profit_loss?.toFixed(2) || '-'}
                    </td>
                    <td>{trade.win_percentage?.toFixed(2) || '-'}%</td>
                    <td>
                      <span className={`${styles.status} ${styles[trade.status.toLowerCase()]}`}>
                        {trade.status}
                      </span>
                    </td>
                    <td>
                      {trade.status === 'OPEN' && (
                        <button
                          onClick={() => {
                            const exitPrice = prompt('Enter exit price:');
                            if (exitPrice) handleUpdateTrade(trade.id, parseFloat(exitPrice));
                          }}
                          className={styles.actionButton}
                          disabled={loading}
                        >
                          Close
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteTrade(trade.id)}
                        className={styles.deleteButton}
                        disabled={loading}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className={styles.empty}>
                    {selectedAccount 
                      ? 'No trades found. Send a TradingView signal to see trades here!' 
                      : 'Enter an account ID to load trades.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className={styles.stats}>
        <p>Total Trades: <strong>{filteredTrades.length}</strong></p>
      </div>
    </div>
  );
}