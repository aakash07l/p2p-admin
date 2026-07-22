'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Compass, LayoutDashboard, Users, Settings, LogOut, CheckCircle,
  XCircle, Eye, RefreshCw, Loader2, DollarSign, ArrowUpRight, ArrowDownLeft,
  Copy, Check, Search, ShieldCheck, ShieldAlert, PlusCircle, MinusCircle, Wallet
} from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<'orders' | 'users' | 'rates'>('orders');
  const [orderFilter, setOrderFilter] = useState<'ALL' | 'PENDING_BUY' | 'PENDING_SELL' | 'COMPLETED' | 'FAILED'>('ALL');
  
  // Data States
  const [orders, setOrders] = useState<any[]>([]);
  const [userList, setUserList] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalDailyVolume: 0, pendingDeposits: 0, pendingWithdrawals: 0 });
  const [rates, setRates] = useState({
    BUY_RATE: '90',
    SELL_RATE: '88',
    PLATFORM_UPI_ID: 'p2pexchange@upi',
    PLATFORM_HOT_WALLET: '0x57db74fec2dfc517315ea6034aa746511dd80d4b'
  });
  
  const [rateLoading, setRateLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Search & Copy UI state
  const [userSearch, setUserSearch] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Modals state
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [rejectModalTx, setRejectModalTx] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Balance Adjustment Modal State
  const [balanceModalUser, setBalanceModalUser] = useState<any | null>(null);
  const [adjType, setAdjType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [adjLoading, setAdjLoading] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Fetch core data (Orders, Users/Stats, Settings)
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

      if (ordersData.success) setOrders(ordersData.transactions || []);
      if (usersData.success) {
        setUserList(usersData.users || []);
        setStats(usersData.stats || { totalDailyVolume: 0, pendingDeposits: 0, pendingWithdrawals: 0 });
      }
      if (ratesData.success && ratesData.settings) {
        setRates((prev) => ({ ...prev, ...ratesData.settings }));
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setDataLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
    // Real-time Updates: Poll every 5 seconds for instant queue updates
    const interval = setInterval(fetchData, 5000);
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

  // Balance Adjustment submit
  const handleBalanceAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!balanceModalUser || !adjAmount || Number(adjAmount) <= 0) return;

    setAdjLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADJUST_BALANCE',
          userId: balanceModalUser.id,
          adjustmentType: adjType,
          amount: parseFloat(adjAmount),
          reason: adjReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setBalanceModalUser(null);
        setAdjAmount('');
        setAdjReason('');
        fetchData();
      } else {
        alert(data.error || 'Failed to adjust balance');
      }
    } catch {
      alert('Network error modifying balance');
    } finally {
      setAdjLoading(false);
    }
  };

  // Toggle KYC Verification
  const handleToggleVerification = async (userId: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TOGGLE_VERIFY',
          userId,
          isVerified: !currentStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchData();
      } else {
        alert(data.error);
      }
    } catch {
      alert('Error updating user verification');
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
        alert('Exchange rates and gateway details successfully saved!');
        fetchData();
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

  // Filtered Orders Logic
  const filteredOrders = orders.filter((o) => {
    if (orderFilter === 'PENDING_BUY') return o.status === 'PENDING' && (o.type === 'BUY' || o.type === 'DEPOSIT');
    if (orderFilter === 'PENDING_SELL') return o.status === 'PENDING' && (o.type === 'SELL' || o.type === 'WITHDRAW');
    if (orderFilter === 'COMPLETED') return o.status === 'COMPLETED';
    if (orderFilter === 'FAILED') return o.status === 'FAILED' || o.status === 'CANCELLED';
    return true; // 'ALL'
  });

  const pendingBuyCount = orders.filter((o) => o.status === 'PENDING' && (o.type === 'BUY' || o.type === 'DEPOSIT')).length;
  const pendingSellCount = orders.filter((o) => o.status === 'PENDING' && (o.type === 'SELL' || o.type === 'WITHDRAW')).length;

  // Filtered User List
  const filteredUsers = userList.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.privyId?.toLowerCase().includes(q) ||
      u.wallet?.address?.toLowerCase().includes(q) ||
      u.upiId?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#020205] flex text-slate-300 font-sans">
      
      {/* 1. Left Sidebar Navigation */}
      <aside className="w-64 bg-[#0a0a14] border-r border-[#1e293b] flex flex-col justify-between fixed top-0 bottom-0 left-0 z-30">
        <div className="flex flex-col flex-1">
          {/* Logo Header */}
          <div className="p-6 border-b border-[#1e293b] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00f2fe] to-[#7f00ff] flex items-center justify-center shadow-lg shadow-[#00f2fe]/20">
              <Compass size={20} className="text-white" />
            </div>
            <div>
              <p className="font-black text-white text-base tracking-tight leading-none">P2Xchange</p>
              <span className="text-[9px] text-[#00f2fe] font-bold tracking-widest uppercase mt-0.5 block">Admin Control Terminal</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {[
              { id: 'orders', label: 'Orders & Sell Queue', icon: LayoutDashboard, badge: pendingBuyCount + pendingSellCount },
              { id: 'users', label: 'Users & Wallets', icon: Users, count: userList.length },
              { id: 'rates', label: 'Rate & Gateway Controls', icon: Settings },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id as any)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  tab === item.id 
                    ? 'bg-white/[0.06] text-[#00f2fe] border border-white/[0.08] shadow-inner shadow-black' 
                    : 'hover:bg-white/5 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-[#f97316] text-black animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Admin Logout */}
        <div className="p-4 border-t border-[#1e293b]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <main className="flex-1 ml-64 p-8 min-h-screen relative overflow-y-auto">
        
        {/* Top Header stats bar */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight uppercase">Platform Admin Dashboard</h2>
            <p className="text-[10px] text-[#64748b] font-extrabold uppercase tracking-widest mt-0.5">Manage live trades, sell orders, payouts and user balances</p>
          </div>
          <div className="flex items-center gap-3">
            {copiedText && (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg animate-fade-in flex items-center gap-1">
                <Check size={14} /> Copied {copiedText}!
              </span>
            )}
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all active:scale-95"
            >
              <RefreshCw size={14} className={dataLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Stats Summary Widgets grid */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="p-5 rounded-2xl bg-[#0a0a14] border border-[#1e293b] flex items-center justify-between shadow-md">
            <div>
              <p className="text-[9px] text-[#64748b] font-black uppercase tracking-widest">24h Trade Volume</p>
              <h3 className="text-2xl font-black text-white tracking-tight mt-1">
                {stats.totalDailyVolume.toFixed(2)} <span className="text-xs font-bold text-slate-500">USDT</span>
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center"><DollarSign size={20} /></div>
          </div>
          
          <div className="p-5 rounded-2xl bg-[#0a0a14] border border-[#1e293b] flex items-center justify-between shadow-md">
            <div>
              <p className="text-[9px] text-[#64748b] font-black uppercase tracking-widest">Pending Buy Orders (Deposits)</p>
              <h3 className="text-2xl font-black text-emerald-400 tracking-tight mt-1">
                {pendingBuyCount} <span className="text-xs font-bold text-slate-500">Orders</span>
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center"><ArrowDownLeft size={20} /></div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0a0a14] border border-[#1e293b] flex items-center justify-between shadow-md">
            <div>
              <p className="text-[9px] text-[#64748b] font-black uppercase tracking-widest">Pending Sell Orders (INR Payouts)</p>
              <h3 className="text-2xl font-black text-[#f97316] tracking-tight mt-1">
                {pendingSellCount} <span className="text-xs font-bold text-slate-500">Orders</span>
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#f97316]/10 text-[#f97316] flex items-center justify-center"><ArrowUpRight size={20} /></div>
          </div>
        </div>

        {/* Tab 1: Orders and Live Queue */}
        {tab === 'orders' && (
          <div className="space-y-6">
            
            {/* Filter Tabs Header */}
            <div className="flex items-center gap-2 border-b border-[#1e293b] pb-3">
              {[
                { id: 'ALL', label: 'All Orders', count: orders.length },
                { id: 'PENDING_SELL', label: 'Pending Sell Orders (Payouts)', count: pendingSellCount, color: 'text-[#f97316]' },
                { id: 'PENDING_BUY', label: 'Pending Buy Orders (Deposits)', count: pendingBuyCount, color: 'text-emerald-400' },
                { id: 'COMPLETED', label: 'Completed', count: orders.filter(o => o.status === 'COMPLETED').length },
                { id: 'FAILED', label: 'Failed / Rejected', count: orders.filter(o => o.status === 'FAILED').length },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setOrderFilter(f.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                    orderFilter === f.id
                      ? 'bg-[#00f2fe] text-[#020205] shadow-lg shadow-[#00f2fe]/10'
                      : 'bg-[#0a0a14] border border-[#1e293b] text-slate-400 hover:text-white'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                    orderFilter === f.id ? 'bg-[#020205] text-[#00f2fe]' : 'bg-white/5 text-slate-400'
                  }`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Orders Table Card */}
            <div className="p-6 rounded-2xl bg-[#0a0a14] border border-[#1e293b] shadow-md space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00f2fe] animate-pulse" />
                  Live Order Processing Queue
                </h3>
                <span className="text-[10px] text-[#64748b] font-mono">Real-time sync active (5s)</span>
              </div>

              {dataLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-[#00f2fe]" /></div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-16 text-[#64748b] font-bold text-xs uppercase tracking-widest">No orders matching current filter</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#1e293b] text-[10px] font-black uppercase text-[#64748b] tracking-wider">
                        <th className="py-3 px-4">Order ID</th>
                        <th className="py-3 px-4">User Details</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">USDT Amount</th>
                        <th className="py-3 px-4">INR Value</th>
                        <th className="py-3 px-4">Payout / Verification Target</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e293b]/50 text-xs">
                      {filteredOrders.map((o) => {
                        const isSell = o.type === 'SELL' || o.type === 'WITHDRAW';
                        const payoutUpi = o.metadata?.upiId || o.upiRef || o.toAddress;
                        
                        return (
                          <tr key={o.id} className="hover:bg-white/[0.02] transition-colors">
                            {/* Order ID */}
                            <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                              {o.id.slice(0, 10)}...
                            </td>

                            {/* User */}
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-white text-xs capitalize">{o.user?.name || 'User'}</div>
                              <div className="text-[10px] text-[#64748b] font-mono">{o.user?.email || o.user?.phone || o.userId.slice(0, 12)}</div>
                            </td>

                            {/* Type */}
                            <td className="py-3.5 px-4">
                              <span className={`text-[9px] px-2.5 py-1 rounded-lg font-black tracking-widest uppercase border ${
                                isSell
                                  ? 'bg-[#f97316]/10 text-[#f97316] border-[#f97316]/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              }`}>
                                {isSell ? 'SELL / PAYOUT' : 'BUY / DEPOSIT'}
                              </span>
                            </td>

                            {/* Amount */}
                            <td className="py-3.5 px-4 font-extrabold text-white">
                              {o.amount.toFixed(2)} USDT
                            </td>

                            {/* INR Value */}
                            <td className="py-3.5 px-4 font-extrabold text-slate-300">
                              ₹{(o.metadata?.amountInr || o.amount * 90).toLocaleString('en-IN')}
                            </td>

                            {/* Payout UPI ID / Hash */}
                            <td className="py-3.5 px-4">
                              {isSell ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] text-[#64748b] font-black uppercase">Pay UPI:</span>
                                    <code className="text-xs font-mono font-black text-[#00f2fe] bg-[#00f2fe]/10 px-2 py-0.5 rounded select-all">
                                      {payoutUpi || 'Not provided'}
                                    </code>
                                    {payoutUpi && (
                                      <button
                                        onClick={() => copyToClipboard(payoutUpi, 'UPI ID')}
                                        className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                        title="Copy Payout UPI ID"
                                      >
                                        <Copy size={12} />
                                      </button>
                                    )}
                                  </div>
                                  {o.txHash && (
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                                      <span>TX:</span>
                                      <span className="truncate max-w-[8rem]">{o.txHash}</span>
                                      <button
                                        onClick={() => copyToClipboard(o.txHash, 'TX Hash')}
                                        className="p-0.5 text-slate-400 hover:text-white"
                                        title="Copy TX Hash"
                                      >
                                        <Copy size={10} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] text-[#64748b] font-black uppercase">UTR Ref:</span>
                                    <code className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                                      {o.upiRef || 'N/A'}
                                    </code>
                                    {o.upiRef && (
                                      <button
                                        onClick={() => copyToClipboard(o.upiRef, 'UTR Number')}
                                        className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                                        title="Copy UTR Ref"
                                      >
                                        <Copy size={12} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4">
                              <span className={`text-[9px] px-2.5 py-1 rounded-lg font-black tracking-widest uppercase border ${
                                o.status === 'PENDING'
                                  ? 'bg-[#f97316]/10 text-[#f97316] border-[#f97316]/20 animate-pulse'
                                  : o.status === 'COMPLETED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}>
                                {o.status}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5 justify-end">
                                <button
                                  onClick={() => setSelectedTx(o)}
                                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#00f2fe] transition-colors"
                                  title="View Details"
                                >
                                  <Eye size={14} />
                                </button>
                                {o.status === 'PENDING' && (
                                  <>
                                    <button
                                      onClick={() => handleFinalize(o.id, 'APPROVE')}
                                      disabled={updatingId === o.id}
                                      className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black transition-all"
                                      title={isSell ? "Approve Payout Sent" : "Approve & Credit Balance"}
                                    >
                                      <CheckCircle size={14} />
                                    </button>
                                    <button
                                      onClick={() => setRejectModalTx(o)}
                                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-black transition-all"
                                      title="Reject / Refund"
                                    >
                                      <XCircle size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Users & Wallets Management */}
        {tab === 'users' && (
          <div className="space-y-6">
            
            {/* Search Header */}
            <div className="flex justify-between items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-4 top-3.5 text-[#64748b]" />
                <input
                  type="text"
                  placeholder="Search user by name, email, Privy ID or UPI..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-[#0a0a14] border border-[#1e293b] text-white text-xs focus:outline-none focus:border-[#00f2fe]"
                />
              </div>
              <div className="text-xs text-slate-400 font-bold">
                Total Users: <span className="text-white font-mono">{filteredUsers.length}</span>
              </div>
            </div>

            {/* Users Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredUsers.map((u) => (
                <div key={u.id} className="p-5 rounded-2xl bg-[#0a0a14] border border-[#1e293b] space-y-4 shadow-md">
                  
                  {/* Top Bar */}
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-white text-sm capitalize">{u.name || 'Anonymous User'}</h4>
                        {u.isVerified ? (
                          <span className="flex items-center gap-0.5 text-[8px] font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <ShieldCheck size={10} /> VERIFIED
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-[8px] font-black px-2 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20">
                            UNVERIFIED
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-[#64748b] block mt-0.5 select-all">{u.privyId}</span>
                    </div>

                    <span className={`text-[8px] px-2.5 py-1 rounded-lg font-black uppercase tracking-widest border ${
                      u.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-white/5 text-slate-400 border-white/10'
                    }`}>{u.role}</span>
                  </div>

                  {/* Wallet Metrics */}
                  <div className="grid grid-cols-3 gap-2 text-center bg-white/[0.01] border border-white/[0.03] p-3 rounded-xl text-xs">
                    <div>
                      <p className="text-[9px] text-[#64748b] font-bold uppercase">USDT Balance</p>
                      <p className="font-extrabold text-[#00f2fe] text-sm mt-0.5">{u.wallet?.usdtBalance?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-[#64748b] font-bold uppercase">Total Trades</p>
                      <p className="font-extrabold text-white text-sm mt-0.5">{u._count?.transactions || '0'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-[#64748b] font-bold uppercase">Referrals</p>
                      <p className="font-extrabold text-white text-sm mt-0.5">{u._count?.referrals || '0'}</p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5 text-xs text-slate-400 pt-1 border-t border-white/[0.03]">
                    {u.email && <div className="flex justify-between"><span>Email:</span><span className="text-white font-medium">{u.email}</span></div>}
                    {u.phone && <div className="flex justify-between"><span>Phone:</span><span className="text-white font-medium">{u.phone}</span></div>}
                    {u.wallet?.address && (
                      <div className="flex justify-between items-center">
                        <span>Privy Wallet:</span>
                        <code className="text-[10px] text-[#00f2fe] font-mono select-all truncate max-w-[12rem]">{u.wallet.address}</code>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-white/[0.03]">
                    <button
                      onClick={() => setBalanceModalUser(u)}
                      className="flex-1 py-2 rounded-xl bg-[#00f2fe]/10 hover:bg-[#00f2fe] text-[#00f2fe] hover:text-black border border-[#00f2fe]/20 text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                    >
                      <Wallet size={12} />
                      <span>Adjust Balance</span>
                    </button>

                    <button
                      onClick={() => handleToggleVerification(u.id, u.isVerified)}
                      className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-white transition-colors"
                    >
                      {u.isVerified ? 'Unverify' : 'Verify KYC'}
                    </button>

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
                      className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-white transition-colors"
                    >
                      Role: {u.role === 'admin' ? 'User' : 'Admin'}
                    </button>
                  </div>

                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Exchange Rate & Gateway settings */}
        {tab === 'rates' && (
          <div className="max-w-xl space-y-6">
            <div className="p-6 rounded-2xl bg-[#0a0a14] border border-[#1e293b] shadow-md space-y-6">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Exchange Rates & Hot Wallet Config</h3>
                <p className="text-[10px] text-[#64748b] font-bold mt-1 uppercase tracking-wide">Live rates and gateway details synchronize client applications instantly</p>
              </div>

              <form onSubmit={handleUpdateRates} className="space-y-4">
                
                <div className="space-y-1.5">
                  <label className="block text-[9px] text-[#64748b] font-black uppercase tracking-wider">Platform Sells Rate (1 USDT = INR Value User Pays)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={rates.BUY_RATE}
                      onChange={(e) => setRates({ ...rates, BUY_RATE: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-[#1e293b] text-white font-bold text-sm focus:outline-none focus:border-[#00f2fe]"
                      required
                    />
                    <span className="absolute right-4 top-3 text-xs font-bold text-slate-500">INR</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[9px] text-[#64748b] font-black uppercase tracking-wider">Platform Buys Rate (1 USDT = INR Value Platform Pays User)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={rates.SELL_RATE}
                      onChange={(e) => setRates({ ...rates, SELL_RATE: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-[#1e293b] text-white font-bold text-sm focus:outline-none focus:border-[#00f2fe]"
                      required
                    />
                    <span className="absolute right-4 top-3 text-xs font-bold text-slate-500">INR</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[9px] text-[#64748b] font-black uppercase tracking-wider">Platform Recipient UPI Gate ID (For User Buy Payments)</label>
                  <input
                    type="text"
                    value={rates.PLATFORM_UPI_ID}
                    onChange={(e) => setRates({ ...rates, PLATFORM_UPI_ID: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-[#1e293b] text-white font-mono text-xs focus:outline-none focus:border-[#00f2fe]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[9px] text-[#64748b] font-black uppercase tracking-wider">Platform Hot Wallet Address (BSC BEP-20 for USDT Sell Transfers)</label>
                  <input
                    type="text"
                    value={rates.PLATFORM_HOT_WALLET}
                    onChange={(e) => setRates({ ...rates, PLATFORM_HOT_WALLET: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-[#1e293b] text-[#00f2fe] font-mono text-xs focus:outline-none focus:border-[#00f2fe]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={rateLoading}
                  className="w-full py-3.5 rounded-xl bg-[#00f2fe] hover:bg-[#00f2fe]/90 text-[#020205] font-black text-xs tracking-widest uppercase transition-all shadow-md shadow-[#00f2fe]/10 flex items-center justify-center gap-2"
                >
                  {rateLoading ? <Loader2 size={16} className="animate-spin" /> : 'Save System Settings'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal 1: View Transaction Details */}
        {selectedTx && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md p-6 rounded-3xl bg-[#0a0a14] border border-[#1e293b] shadow-2xl space-y-5 animate-slide-up">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-[#64748b] font-black uppercase tracking-widest">Transaction Specification</span>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider mt-0.5">{selectedTx.type} USDT</h4>
                </div>
                <button onClick={() => setSelectedTx(null)} className="p-1 text-slate-500 hover:text-white"><XCircle size={18} /></button>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] text-xs space-y-3.5">
                <div className="flex justify-between"><span>User ID</span><span className="font-mono text-white select-all">{selectedTx.userId}</span></div>
                <div className="flex justify-between"><span>User Name</span><span className="font-semibold text-white capitalize">{selectedTx.user?.name || 'N/A'}</span></div>
                
                {/* Payout UPI ID */}
                <div className="flex justify-between items-center">
                  <span>Payout / Target UPI</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono font-bold text-[#00f2fe] bg-[#00f2fe]/10 px-2 py-0.5 rounded select-all">
                      {selectedTx.metadata?.upiId || selectedTx.upiRef || 'N/A'}
                    </span>
                    {(selectedTx.metadata?.upiId || selectedTx.upiRef) && (
                      <button
                        onClick={() => copyToClipboard(selectedTx.metadata?.upiId || selectedTx.upiRef, 'UPI ID')}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        <Copy size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* TX Hash */}
                {selectedTx.txHash && (
                  <div className="flex justify-between items-center">
                    <span>TX Hash</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-[#00f2fe] select-all truncate max-w-[12rem]">{selectedTx.txHash}</span>
                      <button onClick={() => copyToClipboard(selectedTx.txHash, 'TX Hash')} className="p-1 text-slate-400 hover:text-white">
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-between"><span>Amount USDT</span><span className="font-extrabold text-white">{selectedTx.amount} USDT</span></div>
                <div className="flex justify-between"><span>Value INR</span><span className="font-extrabold text-white">₹{(selectedTx.metadata?.amountInr || selectedTx.amount * 90).toLocaleString('en-IN')}</span></div>
                {selectedTx.user?.phone && (
                  <div className="flex justify-between"><span>User Phone</span><span className="font-semibold text-white">{selectedTx.user.phone}</span></div>
                )}
                {selectedTx.notes && (
                  <div className="flex justify-between"><span>Audit Log Notes</span><span className="text-slate-400 text-[11px] max-w-[14rem] text-right">{selectedTx.notes}</span></div>
                )}
              </div>

              {selectedTx.status === 'PENDING' && (
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
                    Reject Order
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal 2: Reject Reason Modal */}
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
                  placeholder="e.g. Invalid UTR reference number or payment not received."
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

        {/* Modal 3: Manual User Balance Adjustment Modal */}
        {balanceModalUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md p-6 rounded-3xl bg-[#0a0a14] border border-[#1e293b] shadow-2xl space-y-5 animate-slide-up">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">Adjust User Wallet Balance</h4>
                  <p className="text-[10px] text-[#64748b] font-mono mt-0.5">{balanceModalUser.name || balanceModalUser.id}</p>
                </div>
                <button onClick={() => setBalanceModalUser(null)} className="p-1 text-slate-500 hover:text-white"><XCircle size={18} /></button>
              </div>

              <form onSubmit={handleBalanceAdjustment} className="space-y-4">
                
                {/* Credit or Debit Selector */}
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-white/[0.02] border border-[#1e293b]">
                  <button
                    type="button"
                    onClick={() => setAdjType('CREDIT')}
                    className={`py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                      adjType === 'CREDIT' ? 'bg-emerald-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <PlusCircle size={14} />
                    <span>Credit USDT</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjType('DEBIT')}
                    className={`py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                      adjType === 'DEBIT' ? 'bg-red-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <MinusCircle size={14} />
                    <span>Debit USDT</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[9px] text-[#64748b] font-black uppercase tracking-wider">Amount (USDT)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 50.00"
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-[#1e293b] text-white font-bold text-sm focus:outline-none focus:border-[#00f2fe]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[9px] text-[#64748b] font-black uppercase tracking-wider">Reason / Audit Trail Note</label>
                  <input
                    type="text"
                    placeholder="e.g. Manual bank deposit verification"
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-[#1e293b] text-white text-xs focus:outline-none focus:border-[#00f2fe]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setBalanceModalUser(null)}
                    className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 font-black text-xs tracking-wider uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adjLoading || !adjAmount}
                    className={`flex-1 py-3 rounded-xl font-black text-xs tracking-wider uppercase transition-colors flex items-center justify-center gap-1.5 ${
                      adjType === 'CREDIT'
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-red-600 hover:bg-red-500 text-white'
                    }`}
                  >
                    {adjLoading ? <Loader2 size={14} className="animate-spin" /> : `${adjType} Balance`}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
