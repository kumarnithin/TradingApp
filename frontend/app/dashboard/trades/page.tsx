'use client';

import React, { useState, useEffect } from 'react';
import logger from '../../../utils/logger';
import { ChevronDown, Plus, RefreshCw, Trash2, Check } from 'lucide-react';

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

interface Account {
  id: string;
  account_name: string;
  account_type?: string;
  is_ib_connected?: boolean;
}

export default function TradesPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
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
    trade_type: 'Market',
    notes: ''
  });

  useEffect(() => {
    logger.debug('🔄 [TradesPage] Component mounted - fetching accounts...');
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      logger.debug(`🔄 [TradesPage] Fetching trades for account: ${selectedAccount}`);
      fetchTrades(selectedAccount);
    }
  }, [selectedAccount]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      logger.debug('📡 [fetchAccounts] Calling: GET /api/v1/accounts/list');
      
      const response = await fetch('http://127.0.0.1:8000/api/v1/accounts/list', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors',
      });
      
      logger.debug(`📥 [fetchAccounts] Response Status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      logger.debug('✅ [fetchAccounts] Response:', result);
      
      if (result.accounts && Array.isArray(result.accounts)) {
        logger.info(`✅ [fetchAccounts] ${result.accounts.length} accounts loaded`);
        setAccounts(result.accounts);
        setError('');
        
        if (result.accounts.length > 0) {
          // Prefer an account flagged as IB-connected by the backend
          const ibConnected = result.accounts.find((a: any) => a.is_ib_connected);
          if (ibConnected && ibConnected.id) {
            setSelectedAccount(ibConnected.id);
          } else {
            setSelectedAccount(result.accounts[0].id);
          }
        }
      }
    } catch (err) {
      const errorMessage = `Failed to load accounts: ${(err as Error).message}`;
      logger.error('❌ [fetchAccounts]', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrades = async (accountId: string) => {
    if (!accountId) {
      setTrades([]);
      return;
    }

    try {
      setLoading(true);
      //const url = `http://127.0.0.1:8000/api/v1/trades/list-from-signals?account_id=${accountId}`;
      const url = `http://127.0.0.1:8000/api/v1/trades/list-from-ib?account_id=${accountId}`;
      logger.debug(`📡 [fetchTrades] Calling: GET ${url}`);
      

      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors',
      });
      
      logger.debug(`📥 [fetchTrades] Response Status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      logger.debug('✅ [fetchTrades] Response:', result);
      
      if (result.trades && Array.isArray(result.trades)) {
        logger.info(`✅ [fetchTrades] ${result.trades.length} trades loaded`);
        setTrades(result.trades);
        setError('');
      }
    } catch (err) {
      const errorMessage = `Failed to load trades: ${(err as Error).message}`;
      logger.error('❌ [fetchTrades]', errorMessage);
      setError(errorMessage);
      setTrades([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrade = async () => {
    if (!selectedAccount) {
      alert('Please select an account');
      return;
    }

    if (!newTrade.symbol) {
      alert('Please enter a symbol');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/trades/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: selectedAccount,
          ...newTrade,
          entry_price: parseFloat(newTrade.entry_price as any),
          quantity: parseFloat(newTrade.quantity as any)
        })
      });

      const result = await response.json();
      if (result.status === 'success') {
        setShowForm(false);
        setNewTrade({ symbol: '', action: 'BUY', entry_price: 0, quantity: 1, trade_type: 'Market', notes: '' });
        alert('Trade created successfully!');
        fetchTrades(selectedAccount);
      } else {
        alert('Error: ' + (result.detail || 'Unknown error'));
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
      const response = await fetch(`http://127.0.0.1:8000/api/v1/trades/${tradeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exit_price: exitPrice })
      });

      const result = await response.json();
      if (result.status === 'success') {
        alert('Trade closed!');
        fetchTrades(selectedAccount);
      }
    } catch (err) {
      alert('Error: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrade = async (tradeId: string) => {
    if (window.confirm('Delete this trade?')) {
      setLoading(true);
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/v1/trades/${tradeId}`, {
          method: 'DELETE'
        });

        const result = await response.json();
        if (result.status === 'success') {
          alert('Trade deleted!');
          fetchTrades(selectedAccount);
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
    if (symbolFilter && !trade.symbol.toUpperCase().includes(symbolFilter.toUpperCase())) return false;
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', padding: '2rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'rgba(30, 41, 59, 0.8)', borderRadius: '16px', padding: '2rem', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#0ea5e9', margin: 0, marginBottom: '0.5rem' }}>📊 Trades Portfolio</h1>
        <p style={{ color: '#94a3b8', margin: 0 }}>Manage and track all your trading activities</p>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', color: '#fca5a5', display: 'flex', justifyContent: 'space-between' }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Controls */}
      <div style={{ background: 'rgba(30, 41, 59, 0.6)', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Account Selector */}
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#cbd5e1' }}>📱 Select Account</label>
            <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} disabled={loading} style={{ width: '100%', padding: '0.75rem', border: '1px solid rgba(148, 163, 184, 0.3)', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.8)', color: '#e2e8f0', fontSize: '0.95rem' }}>
              <option value="">{accounts.length === 0 ? 'No accounts' : 'Choose account...'}</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.account_name} {acc.account_type ? `(${acc.account_type})` : ''} {acc.is_ib_connected ? '🔗' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#cbd5e1' }}>📌 Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid rgba(148, 163, 184, 0.3)', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.8)', color: '#e2e8f0' }}>
              <option value="">All</option>
              <option value="OPEN">🟢 Open</option>
              <option value="CLOSED">🔴 Closed</option>
            </select>
          </div>

          {/* Symbol Filter */}
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#cbd5e1' }}>🔍 Symbol</label>
            <input type="text" placeholder="Search..." value={symbolFilter} onChange={(e) => setSymbolFilter(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid rgba(148, 163, 184, 0.3)', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.8)', color: '#e2e8f0' }} />
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => setShowForm(!showForm)} disabled={loading || !selectedAccount} style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}><Plus size={18} style={{ marginRight: '0.5rem' }} /> {showForm ? 'Cancel' : 'New Trade'}</button>
          <button onClick={() => fetchTrades(selectedAccount)} disabled={loading} style={{ padding: '0.75rem 1.5rem', background: 'rgba(148, 163, 184, 0.1)', color: '#cbd5e1', border: '1px solid rgba(148, 163, 184, 0.3)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}><RefreshCw size={18} /> Refresh</button>
        </div>
      </div>

      {/* Form */}
      {showForm && selectedAccount && (
        <div style={{ background: 'rgba(30, 41, 59, 0.6)', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 1rem 0', color: '#e2e8f0' }}>➕ Create Trade</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <input type="text" placeholder="Symbol" value={newTrade.symbol} onChange={(e) => setNewTrade({ ...newTrade, symbol: e.target.value.toUpperCase() })} style={{ padding: '0.75rem', border: '1px solid rgba(148, 163, 184, 0.3)', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.8)', color: '#e2e8f0' }} />
            <select value={newTrade.action} onChange={(e) => setNewTrade({ ...newTrade, action: e.target.value })} style={{ padding: '0.75rem', border: '1px solid rgba(148, 163, 184, 0.3)', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.8)', color: '#e2e8f0' }}>
              <option value="BUY">🟢 BUY</option>
              <option value="SELL">🔴 SELL</option>
            </select>
            <input type="number" placeholder="Entry Price" value={newTrade.entry_price} onChange={(e) => setNewTrade({ ...newTrade, entry_price: parseFloat(e.target.value) })} step="0.0001" style={{ padding: '0.75rem', border: '1px solid rgba(148, 163, 184, 0.3)', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.8)', color: '#e2e8f0' }} />
            <input type="number" placeholder="Quantity" value={newTrade.quantity} onChange={(e) => setNewTrade({ ...newTrade, quantity: parseFloat(e.target.value) })} step="0.1" style={{ padding: '0.75rem', border: '1px solid rgba(148, 163, 184, 0.3)', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.8)', color: '#e2e8f0' }} />
          </div>
          <button onClick={handleCreateTrade} disabled={loading} style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}><Check size={18} /> {loading ? 'Creating...' : 'Create'}</button>
        </div>
      )}

      {/* Stats */}
      {selectedAccount && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: 'rgba(30, 41, 59, 0.6)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600 }}>📊 Total Trades</div>
            <div style={{ color: '#0ea5e9', fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem' }}>{filteredTrades.length}</div>
          </div>
          <div style={{ background: 'rgba(30, 41, 59, 0.6)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600 }}>🟢 Open</div>
            <div style={{ color: '#0ea5e9', fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem' }}>{filteredTrades.filter(t => t.status === 'OPEN').length}</div>
          </div>
          <div style={{ background: 'rgba(30, 41, 59, 0.6)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600 }}>🔴 Closed</div>
            <div style={{ color: '#0ea5e9', fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem' }}>{filteredTrades.filter(t => t.status === 'CLOSED').length}</div>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'rgba(30, 41, 59, 0.6)', borderRadius: '16px', overflow: 'hidden' }}>
        {loading && filteredTrades.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid rgba(14, 165, 233, 0.2)', borderTop: '3px solid #0ea5e9', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#94a3b8', marginTop: '1rem' }}>Loading...</p>
          </div>
        ) : filteredTrades.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'rgba(15, 23, 42, 0.8)' }}>
                <tr>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#cbd5e1', fontWeight: 700 }}>Symbol</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#cbd5e1', fontWeight: 700 }}>Action</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#cbd5e1', fontWeight: 700 }}>Qty</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#cbd5e1', fontWeight: 700 }}>Entry</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#cbd5e1', fontWeight: 700 }}>Exit</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#cbd5e1', fontWeight: 700 }}>P&L</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#cbd5e1', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#cbd5e1', fontWeight: 700 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map((trade) => (
                  <tr key={trade.id} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.1)', borderLeft: trade.status === 'OPEN' ? '4px solid #10b981' : '4px solid #ef4444' }}>
                    <td style={{ padding: '1rem', color: '#0ea5e9', fontWeight: 600 }}>{trade.symbol}</td>
                    <td style={{ padding: '1rem', color: '#e2e8f0' }}>{trade.action === 'BUY' ? '🟢' : '🔴'} {trade.action}</td>
                    <td style={{ padding: '1rem', color: '#e2e8f0' }}>{trade.quantity}</td>
                    <td style={{ padding: '1rem', color: '#e2e8f0' }}>${trade.entry_price?.toFixed(4)}</td>
                    <td style={{ padding: '1rem', color: '#e2e8f0' }}>${trade.exit_price ? trade.exit_price.toFixed(4) : '—'}</td>
                    <td style={{ padding: '1rem', color: trade.profit_loss && trade.profit_loss > 0 ? '#86efac' : trade.profit_loss && trade.profit_loss < 0 ? '#fca5a5' : '#e2e8f0', fontWeight: 600 }}>{trade.profit_loss !== null ? `$${trade.profit_loss.toFixed(2)}` : '—'}</td>
                    <td style={{ padding: '1rem', color: trade.status === 'OPEN' ? '#86efac' : '#fca5a5' }}>{trade.status === 'OPEN' ? '🟢' : '🔴'} {trade.status}</td>
                    <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                      {trade.status === 'OPEN' && <button onClick={() => { const price = prompt('Exit price:', trade.entry_price.toString()); if (price) handleUpdateTrade(trade.id, parseFloat(price)); }} style={{ width: '2rem', height: '2rem', border: '1px solid rgba(16, 185, 129, 0.5)', background: 'rgba(16, 185, 129, 0.2)', color: '#86efac', borderRadius: '6px', cursor: 'pointer' }}><Check size={16} /></button>}
                      <button onClick={() => handleDeleteTrade(trade.id)} style={{ width: '2rem', height: '2rem', border: '1px solid rgba(239, 68, 68, 0.5)', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', borderRadius: '6px', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
            <h3 style={{ color: '#e2e8f0', fontSize: '1.25rem', margin: 0 }}>No trades</h3>
            <p style={{ color: '#94a3b8', margin: '0.5rem 0 0 0' }}>{selectedAccount ? 'Create your first trade!' : 'Select an account.'}</p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}