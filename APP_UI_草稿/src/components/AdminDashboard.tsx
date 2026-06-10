import React, { useState } from 'react';
import { ShieldCheck, Users, Flame, CalendarDays, RefreshCw, LogOut } from 'lucide-react';
import { API_BASE } from '../lib/storage/api';

interface UserStat {
  uid: string;
  daysLogged: number;
  totalEntries: number;
  bodyLogCount: number;
  customFoodCount: number;
  hasProfile: boolean;
  lastActive: string;
  daysSinceActive: number;
}

interface Stats {
  generatedAt: string;
  totalUsers: number;
  activeLast7Days: number;
  activeLast30Days: number;
  totalEntries: number;
  totalDaysLogged: number;
  users: UserStat[];
}

export default function AdminDashboard() {
  const [token, setToken] = useState(() => sessionStorage.getItem('_admin_token') || '');
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStats = async (tk: string = token) => {
    if (!tk.trim()) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/stats`, {
        headers: { 'x-admin-token': tk.trim() }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setStats(data);
      sessionStorage.setItem('_admin_token', tk.trim());
    } catch (e: any) {
      setError(e.message || '載入失敗');
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem('_admin_token');
    setToken('');
    setStats(null);
  };

  // ── 未登入：輸入密鑰 ─────────────────────────────────────
  if (!stats) {
    return (
      <div className="max-w-md mx-auto pt-16 px-4">
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-800">後台統計</h2>
              <p className="text-sm text-slate-500">輸入管理員密鑰以檢視使用情形</p>
            </div>
          </div>
          <form
            onSubmit={e => { e.preventDefault(); fetchStats(); }}
            className="space-y-3"
          >
            <input
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="ADMIN_TOKEN"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm"
              autoFocus
            />
            <button
              type="submit"
              disabled={!token.trim() || isLoading}
              className="w-full py-3 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
            >
              {isLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
              {isLoading ? '驗證中...' : '進入後台'}
            </button>
            {error && (
              <p className="text-sm text-rose-600 text-center">{error}</p>
            )}
          </form>
        </div>
      </div>
    );
  }

  // ── 已登入：統計面板 ─────────────────────────────────────
  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          後台統計
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => fetchStats()}
            disabled={isLoading}
            className="p-2 text-slate-500 hover:text-blue-600 transition-colors"
            title="重新整理"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={logout}
            className="p-2 text-slate-500 hover:text-rose-600 transition-colors"
            title="登出"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 總覽卡片 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase">總使用者</span>
          </div>
          <p className="text-3xl font-black text-slate-800">{stats.totalUsers}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            7日活躍 {stats.activeLast7Days}・30日活躍 {stats.activeLast30Days}
          </p>
        </div>
        <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Flame className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase">總飲食紀錄</span>
          </div>
          <p className="text-3xl font-black text-blue-600">{stats.totalEntries}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            累計記錄 {stats.totalDaysLogged} 天
          </p>
        </div>
      </div>

      {/* 使用者清單 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">使用者明細（依最近活躍排序）</span>
        </div>
        {stats.users.length === 0 ? (
          <p className="p-4 text-center text-slate-400 text-sm">尚無使用者資料</p>
        ) : (
          stats.users.map(u => (
            <div key={u.uid} className="px-4 py-3 border-b border-slate-50 last:border-0">
              <div className="flex justify-between items-center mb-1">
                <span className="font-mono text-sm font-bold text-slate-800">{u.uid}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    u.daysSinceActive <= 1
                      ? 'bg-emerald-50 text-emerald-600'
                      : u.daysSinceActive <= 7
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {u.daysSinceActive === 0 ? '今天活躍' : `${u.daysSinceActive} 天前`}
                </span>
              </div>
              <div className="flex gap-3 text-[11px] text-slate-500">
                <span>📝 {u.totalEntries} 筆</span>
                <span>📅 {u.daysLogged} 天</span>
                <span>⚖️ {u.bodyLogCount} 筆體重</span>
                {u.customFoodCount > 0 && <span>🍱 {u.customFoodCount} 自訂</span>}
                {!u.hasProfile && <span className="text-amber-500">未設定資料</span>}
              </div>
            </div>
          ))
        )}
      </div>

      <p className="text-[10px] text-slate-300 text-center font-mono">
        更新於 {new Date(stats.generatedAt).toLocaleString('zh-TW')}
      </p>
    </div>
  );
}
