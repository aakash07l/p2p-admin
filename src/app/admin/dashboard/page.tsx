'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Compass, LayoutDashboard, Users, ShieldAlert, Settings, LogOut, CheckCircle,
  XCircle, Eye, Info, RefreshCw, Loader2, DollarSign, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<'orders' | 'users' | 'rates' | 'logs'>('orders');
  
  // States
  const [orders, setOrders] = useState<any[]>([]);
  const [userList, setUserList] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalDailyVolume: 0, pendingDeposits: 0, pendingWithdrawals: 0 });
  const [rates, setRates] = useState({ BUY_RATE: '90', SELL_RATE: '88', PLATFORM_UPI_ID: 'p2pexchange@upi' });
  const [rateLoading, setRateLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Modal / Detail state
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [rejectModalTx, setRejectModalTx] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Fetch core data (Orders and Users/Stats)
  const fetchData = useCallback(async () => {
    try {
      const [ordersRes, usersRes, ratesRes] = await Promise.all([
        fetch('/api/admin/orders'),
        fetch('/api/admin/users'),
        fetch('/api/admin/settings'),
      ]);

      if (ordersRes.status === 401 || usersRes.status === 401) {
        router.push('/');
        return;
      }

      const ordersData = await ordersRes.json();
      const usersData = await usersRes.json();
      const ratesData = await ratesRes.json();

      if (ordersData.success) setOrders(ordersData.transactions);
      if (usersData.success) {
        setUserList(usersData.users);
        setStats(usersData.stats);
      }
      if (ratesData.success) {
        setRates(ratesData.settings);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setDataLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
    // Real-time Updates: Poll every 6 seconds to fetch new orders automatically
    const interval = setInterval(fetchData, 6000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Transaction finalization (Approve / Reject)
  const handleFinalize = async (transactionId: string, action: 'APPROVE' | 'REJECT', notes?: string) => {
    setUpdatingId(transactionId);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId, action, notes }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchData();
        setRejectModalTx(null);
        setRejectReason('');
      } else {
        alert(data.error || 'Failed to complete action');
      }
    } catch {
      alert('Network error finalizing order');
    } finally {
      setUpdatingId(null);
    }
  };

  // Update Exchange Rates
  const handleUpdateRates = async (e: React.FormEvent) => {
    e.preventDefault();
    setRateLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: rates }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Exchange rates and gateway details successfully updated!');
      } else {
        alert(data.error);
      }
    } catch {
      alert('Network error saving settings');
    } finally {
      setRateLoading(false);
    }
  };

  // Admin Logout
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  // Filter pending/success orders
  const pendingOrders = orders.filter((o) => o.status === 'PENDING');
  const finalizedOrders = orders.filter((o) => o.status !== 'PENDING');

  return (
    <div className="min-h-screen bg-[#020205] flex text-slate-300 font-sans">
      
      {/* 1. Left Navigation Sidebar */}
      <aside className="w-64 bg-[#0a0a14] border-r border-[#1e293b] flex flex-col justify-between fixed top-0 bottom-0 left-0">
        <div className="flex flex-col flex-1">
          {/* Logo Header */}
          <div className="p-6 border-b border-[#1e293b] flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#00f2fe] to-[#7f00ff] flex items-center justify-center shadow-md">
              <Compass size={18} className="text-white" />
            </div>
            <div>
              <p className="font-black text-white text-sm tracking-tight leading-none">P2Xchange</p>
              <span className="text-[8px] text-[#64748b] font-bold tracking-widest uppercase">Admin Terminal</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {[
              { id: 'orders', label: 'Order Queue', icon: LayoutDashboard },
              { id: 'users', label: 'User Analytics', icon: Users },
              { id: 'rates', label: 'Rate Controls', icon: Settings },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  tab === item.id 
                    ? 'bg-white/[0.04] text-[#00f2fe] border border-white/[0.05] shadow-inner shadow-black' 
                    : 'hover:bg-white/5 text-slate-400'
                }`}
              >
                <item.icon size={15} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Admin Logout */}
        <div className="p-4 border-t border-[#1e293b]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-slate-500 hover:text-red-400 hover:bg-red-500/5 border border-transparent hover:border-red-500/10 transition-all"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <main className="flex-1 ml-64 p-8 min-h-screen relative overflow-y-auto">
        
        {/* Top Header stats bar */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight uppercase">Admin Dashboard</h2>
            <p className="text-[10px] text-[#64748b] font-extrabold uppercase tracking-widest mt-0.5">Control live transactions and system parameters</p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-slate-400 hover:text-white transition-all active:scale-95"
          >
            <RefreshCw size={12} className={dataLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Stats Summary Widgets grid */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="p-5 rounded-2xl bg-[#0a0a14] border border-[#1e293b] flex items-center justify-between shadow-md">
            <div>
              <p className="text-[9px] text-[#64748b] font-black uppercase tracking-widest">Total Daily Volume</p>
              <h3 className="text-2xl font-black text-white tracking-tight mt-1">
                {stats.totalDailyVolume.toFixed(2)} <span className="text-xs font-bold text-slate-500">USDT</span>
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center"><DollarSign size={18} /></div>
          </div>
          <div className="p-5 rounded-2xl bg-[#0a0a14] border border-[#1e293b] flex items-center justify-between shadow-md">
            <div>
              <p className="text-[9px] text-[#64748b] font-black uppercase tracking-widest">Pending Buy Orders</p>
              <h3 className="text-2xl font-black text-[#f97316] tracking-tight mt-1">
                {stats.pendingDeposits} <span className="text-xs font-bold text-slate-500">Orders</span>
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#f97316]/10 text-[#f97316] flex items-center justify-center"><ArrowDownLeft size={18} /></div>
          </div>
          <div className="p-5 rounded-2xl bg-[#0a0a14] border border-[#1e293b] flex items-center justify-between shadow-md">
            <div>
              <p className="text-[9px] text-[#64748b] font-black uppercase tracking-widest">Pending Sell Orders</p>
              <h3 className="text-2xl font-black text-[#f97316] tracking-tight mt-1">
                {stats.pendingWithdrawals} <span className="text-xs font-bold text-slate-500">Orders</span>
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#f97316]/10 text-[#f97316] flex items-center justify-center"><ArrowUpRight size={18} /></div>
          </div>
        </div>

        {/* Tab 1: Orders and Live Queue */}
        {tab === 'orders' && (
          <div className="space-y-8">
            {/* Live Pending Queue */}
            <div className="p-6 rounded-2xl bg-[#0a0a14] border border-[#1e293b] shadow-md">
              <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f97316] animate-pulse" />
                Live Pending Order Queue
              </h3>
              
              {dataLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-[#00f2fe]" /></div>
              ) : pendingOrders.length === 0 ? (
                <div className="text-center py-12 text-[#64748b] font-bold text-xs uppercase tracking-widest">No pending orders in queue</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left table-data-dense">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>User</th>
                        <th>Trade Type</th>
                        <th>Amount (USDT)</th>
                        <th>Value (INR)</th>
                        <th>Status</th>
                        <th>UTR Ref / TX ID</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingOrders.map((o) => (
                        <tr key={o.id}>
                          <td className="font-mono-id text-white/70">{o.id}</td>
                          <td>
                            <div className="font-bold text-white text-xs">{o.user?.name || 'User'}</div>
                            <div className="text-[9px] text-[#64748b]">{o.user?.email || o.user?.id}</div>
                          </td>
                          <td>
                            <span className={`text-[9px] px-2 py-0.5 rounded font-black tracking-widest uppercase ${
                              o.type === 'BUY' || o.type === 'DEPOSIT' 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>{o.type}</span>
                          </td>
                          <td className="font-bold text-white">{o.amount.toFixed(2)} USDT</td>
                          <td className="font-bold text-white/70">₹{(o.metadata?.amountInr || o.amount * 90).toLocaleString()}</td>
                          <td>
                            <span className="text-[9px] px-2 py-0.5 rounded font-black tracking-widest glow-tag-pending uppercase">
                              {o.status}
                            </span>
                          </td>
                          <td className="font-mono-id text-[#00f2fe]">{o.upiRef || o.txHash?.slice(0, 15) + '...'}</td>
                          <td className="text-right">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <button
                                onClick={() => setSelectedTx(o)}
                                className="p-2 rounded bg-white/5 hover:bg-white/10 text-[#00f2fe] transition-colors"
                                title="View details / UTR verification"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                onClick={() => handleFinalize(o.id, 'APPROVE')}
                                disabled={updatingId === o.id}
                                className="p-2 rounded bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black transition-all"
                                title="Approve & Credit Balance"
                              >
                                <CheckCircle size={14} />
                              </button>
                              <button
                                onClick={() => setRejectModalTx(o)}
                                className="p-2 rounded bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-black transition-all"
                                title="Reject / Mark Failed"
                              >
                                <XCircle size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Historical Finalized Orders */}
            <div className="p-6 rounded-2xl bg-[#0a0a14] border border-[#1e293b] shadow-md">
              <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4">Historical Orders Activity Log</h3>
              
              {dataLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-[#00f2fe]" /></div>
              ) : finalizedOrders.length === 0 ? (
                <div className="text-center py-12 text-[#64748b] font-bold text-xs uppercase tracking-widest">No past actions logged</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left table-data-dense">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>User</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Final Status</th>
                        <th>Logs / Notes</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {finalizedOrders.map((o) => (
                        <tr key={o.id}>
                          <td className="font-mono-id text-white/50">{o.id}</td>
                          <td>
                            <div className="font-bold text-white text-xs">{o.user?.name || 'User'}</div>
                            <div className="text-[9px] text-[#64748b]">{o.user?.email || o.user?.id}</div>
                          </td>
                          <td>
                            <span className="text-[9px] px-2 py-0.5 rounded font-black tracking-widest uppercase">{o.type}</span>
                          </td>
                          <td className="font-bold text-white">{o.amount.toFixed(2)} USDT</td>
                          <td>
                            <span className={`text-[8px] px-2 py-0.5 rounded font-black tracking-widest uppercase ${
                              o.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>{o.status}</span>
                          </td>
                          <td className="text-xs text-slate-400 max-w-xs truncate" title={o.notes}>{o.notes || 'No logs recorded'}</td>
                          <td className="text-xs text-[#64748b]">{new Date(o.updatedAt).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: User Analytics Management */}
        {tab === 'users' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-[#0a0a14] border border-[#1e293b] shadow-md">
              <h3 className="text-sm font-black text-white uppercase tracking-wider mb-6">User Database & Wallet Health</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userList.map((u) => (
                  <div key={u.id} className="p-5 rounded-xl bg-white/[0.01] border border-white/[0.04] space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-black text-white text-sm capitalize">{u.name || 'Anonymous User'}</h4>
                        <span className="text-[9px] font-mono-id text-[#64748b] block mt-0.5">{u.privyId}</span>
                      </div>
                      <span className={`text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-widest ${
                        u.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-white/5 text-slate-400 border border-white/10'
                      }`}>{u.role}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center border-t border-b border-white/[0.03] py-3 text-xs">
                      <div>
                        <p className="text-[9px] text-[#64748b] font-bold uppercase">USDT Balance</p>
                        <p className="font-extrabold text-white mt-1">{u.wallet?.usdtBalance?.toFixed(2) || '0.00'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-[#64748b] font-bold uppercase">Active Trades</p>
                        <p className="font-extrabold text-white mt-1">{u._count?.transactions || '0'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-[#64748b] font-bold uppercase">Referrals</p>
                        <p className="font-extrabold text-white mt-1">{u._count?.referrals || '0'}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-[9px] text-[#64748b] font-black uppercase tracking-wide">Privy Wallet Address:</span>
                      <code className="text-[10px] text-[#00f2fe] font-mono select-all truncate max-w-[12rem]">{u.wallet?.address || 'No Address linked'}</code>
                    </div>

                    {/* Role toggle button */}
                    <div className="flex justify-end pt-2 border-t border-white/[0.03]">
                      <button
                        onClick={async () => {
                          const targetRole = u.role === 'admin' ? 'user' : 'admin';
                          if (confirm(`Are you sure you want to change role of ${u.name || u.id} to ${targetRole}?`)) {
                            const res = await fetch('/api/admin/users', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ userId: u.id, role: targetRole }),
                            });
                            const d = await res.json();
                            if (d.success) { alert(d.message); fetchData(); }
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-white transition-colors"
                      >
                        Set as {u.role === 'admin' ? 'Regular User' : 'System Admin'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: settings and Live Rate controls */}
        {tab === 'rates' && (
          <div className="max-w-md space-y-6">
            <div className="p-6 rounded-2xl bg-[#0a0a14] border border-[#1e293b] shadow-md space-y-6">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Exchange rate & platform controls</h3>
                <p className="text-[10px] text-[#64748b] font-bold mt-1 uppercase tracking-wide">Live rates updates directly synchronize client transactions</p>
              </div>

              <form onSubmit={handleUpdateRates} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[9px] text-[#64748b] font-black uppercase tracking-wider">Platform Sells Rate (1 USDT = INR Value)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={rates.BUY_RATE}
                    onChange={(e) => setRates({ ...rates, BUY_RATE: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-[#1e293b] text-white font-bold text-sm focus:outline-none focus:border-[#00f2fe]"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[9px] text-[#64748b] font-black uppercase tracking-wider">Platform Buys Rate (USDT = INR Payout Value)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={rates.SELL_RATE}
                    onChange={(e) => setRates({ ...rates, SELL_RATE: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-[#1e293b] text-white font-bold text-sm focus:outline-none focus:border-[#00f2fe]"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[9px] text-[#64748b] font-black uppercase tracking-wider">Recipient UPI Payout Gate ID</label>
                  <input
                    type="text"
                    value={rates.PLATFORM_UPI_ID}
                    onChange={(e) => setRates({ ...rates, PLATFORM_UPI_ID: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-[#1e293b] text-white font-mono text-xs focus:outline-none focus:border-[#00f2fe]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={rateLoading}
                  className="w-full py-3.5 rounded-xl bg-[#00f2fe] text-[#020205] font-black text-xs tracking-widest uppercase transition-all shadow-md shadow-[#00f2fe]/10 flex items-center justify-center"
                >
                  {rateLoading ? 'Saving rates configurations...' : 'Save Configuration Changes'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal: View Details */}
        {selectedTx && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md p-6 rounded-3xl bg-[#0a0a14] border border-[#1e293b] shadow-2xl space-y-5 animate-slide-up">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-[#64748b] font-black uppercase tracking-widest">Transaction details</span>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider mt-0.5">{selectedTx.type} USDT</h4>
                </div>
                <button onClick={() => setSelectedTx(null)} className="p-1 text-slate-500 hover:text-white"><XCircle size={18} /></button>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] text-xs space-y-3.5">
                <div className="flex justify-between"><span>User ID</span><span className="font-mono-id text-white">{selectedTx.userId}</span></div>
                <div className="flex justify-between"><span>User Name</span><span className="font-semibold text-white">{selectedTx.user?.name || 'N/A'}</span></div>
                <div className="flex justify-between"><span>UPI Reference (UTR)</span><span className="font-mono-id text-[#00f2fe]">{selectedTx.upiRef || 'N/A'}</span></div>
                {selectedTx.txHash && (
                  <div className="flex justify-between"><span>TX Hash</span><span className="font-mono-id text-[#00f2fe] select-all truncate max-w-[12rem]">{selectedTx.txHash}</span></div>
                )}
                <div className="flex justify-between"><span>Amount USDT</span><span className="font-bold text-white">{selectedTx.amount} USDT</span></div>
                <div className="flex justify-between"><span>Value INR</span><span className="font-bold text-white">₹{(selectedTx.metadata?.amountInr || selectedTx.amount * 90).toLocaleString()}</span></div>
                {selectedTx.metadata?.upiId && (
                  <div className="flex justify-between"><span>Payout UPI Destination</span><span className="font-semibold text-white">{selectedTx.metadata.upiId}</span></div>
                )}
                {selectedTx.user?.phone && (
                  <div className="flex justify-between"><span>Mobile Contacts</span><span className="font-semibold text-white">{selectedTx.user.phone}</span></div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    handleFinalize(selectedTx.id, 'APPROVE');
                    setSelectedTx(null);
                  }}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs tracking-wider uppercase transition-colors"
                >
                  Approve Order
                </button>
                <button
                  onClick={() => {
                    setRejectModalTx(selectedTx);
                    setSelectedTx(null);
                  }}
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs tracking-wider uppercase transition-colors"
                >
                  Reject / Fail
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Reject with Reason */}
        {rejectModalTx && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-55 flex items-center justify-center p-4">
            <div className="w-full max-w-md p-6 rounded-3xl bg-[#0a0a14] border border-[#1e293b] shadow-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-black text-white uppercase tracking-wider">Reject Order: {rejectModalTx.id.slice(0, 10)}...</h4>
                <button onClick={() => setRejectModalTx(null)} className="text-slate-500 hover:text-white"><XCircle size={18} /></button>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] text-[#64748b] font-black uppercase tracking-wider">Rejection Reason / Log Comments</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. UTR Ref ID is invalid or payment not received."
                  className="w-full h-24 p-3 rounded-xl bg-white/[0.02] border border-[#1e293b] text-white text-xs focus:outline-none focus:border-[#f97316] placeholder-white/10"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setRejectModalTx(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-black uppercase text-slate-400"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleFinalize(rejectModalTx.id, 'REJECT', rejectReason)}
                  disabled={!rejectReason}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs tracking-wider uppercase transition-colors disabled:opacity-40"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
