'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Compass, ShieldAlert, Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/admin/dashboard');
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020205] flex items-center justify-center p-4">
      <div className="w-full max-w-sm p-8 rounded-3xl bg-[#0a0a14] border border-slate-800 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#00f2fe] to-[#7f00ff] flex items-center justify-center shadow-lg shadow-[#00f2fe]/10">
            <Compass size={24} className="text-white animate-spin-slow" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-xl font-black text-white tracking-tight">P2Xchange Admin</h1>
            <p className="text-[9px] text-[#64748b] font-black uppercase tracking-wider">Enterprise Financial Portal</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[9px] text-[#64748b] font-black uppercase tracking-wider">Admin Username / Privy ID</label>
            <input
              type="text"
              placeholder="e.g. admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-[#1e293b] text-white text-xs placeholder-white/10 focus:outline-none focus:border-[#00f2fe]"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[9px] text-[#64748b] font-black uppercase tracking-wider">Access Security Key</label>
            <input
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-[#1e293b] text-white text-xs placeholder-white/10 focus:outline-none focus:border-[#00f2fe]"
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-semibold">
              <ShieldAlert size={14} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-[#00f2fe] hover:bg-[#00f2fe]/90 disabled:opacity-50 text-[#020205] font-black text-xs tracking-widest uppercase transition-all shadow-md shadow-[#00f2fe]/10 flex items-center justify-center gap-1.5"
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> Authenticating...</> : 'Enter Control Panel'}
          </button>
        </form>
      </div>
    </div>
  );
}
