import React, { useState, useEffect } from 'react';
import { useDiet, CustomTargets } from '../lib/store';
import { UserProfile, Gender, ActivityLevel } from '../lib/calculator';
import { Activity, User, Ruler, Weight, Target, Save, RotateCcw, RefreshCw, Check } from 'lucide-react';

// 由 vite.config.ts define 注入
declare const __APP_VERSION__: string;
declare const __BUILD_DATE__: string;

export default function ProfileSetup() {
  const { userProfile, saveProfile, customTargets, saveCustomTargets, targets } = useDiet();

  // ── 身體資訊表單 ─────────────────────────────────────────
  const [form, setForm] = useState<UserProfile>(userProfile || {
    age: 30,
    height: 170,
    weight: 70,
    gender: 'male',
    activityLevel: 'moderate'
  });

  // ── 自定義目標表單 ───────────────────────────────────────
  const [customForm, setCustomForm] = useState<CustomTargets>({
    calories: 2000,
    protein: 100,
    carbs: 250,
    fat: 60
  });

  // ── 更新檢查狀態 ─────────────────────────────────────────
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'updated'>('idle');

  // 當 customTargets 從 store 載入或更新時，同步到本地表單
  useEffect(() => {
    if (customTargets) {
      setCustomForm(customTargets);
    } else if (targets) {
      // 若無自定義，預設顯示自動計算的值作為參考
      setCustomForm({
        calories: targets.summary.targetCalories,
        protein: targets.macros.protein.g,
        carbs: targets.macros.carbohydrate.g,
        fat: targets.macros.fat.g
      });
    }
  }, [customTargets, targets]);

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveProfile(form);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveCustomTargets(customForm);
  };

  const resetToAuto = () => {
    saveCustomTargets(null);
  };

  // 監聽 Service Worker 更新
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      setUpdateStatus('updated');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  }, []);

  // 手動檢查更新
  const handleCheckUpdate = async () => {
    setUpdateStatus('checking');
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        registrations.forEach(reg => {
          reg.update(); // 檢查 Service Worker 更新
        });
        // 延遲一下再設為 available，讓使用者有反應時間
        setTimeout(() => {
          setUpdateStatus('available');
        }, 1000);
      } catch (err) {
        console.error('檢查更新失敗:', err);
        setUpdateStatus('idle');
      }
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 pb-20">
      {/* 身體資訊區塊 */}
      <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-800">身體資訊</h2>
            <p className="text-sm text-slate-500">輸入基本資料以自動計算基礎代謝</p>
          </div>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">性別</label>
              <select
                value={form.gender}
                onChange={e => setForm({ ...form, gender: e.target.value as Gender })}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-bold"
              >
                <option value="male">男性</option>
                <option value="female">女性</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">年齡 (歲)</label>
              <input
                type="number"
                min="1"
                value={form.age}
                onChange={e => setForm({ ...form, age: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-bold"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 flex items-center gap-1">
                <Ruler className="w-3 h-3" /> 身高 (cm)
              </label>
              <input
                type="number"
                min="1"
                value={form.height}
                onChange={e => setForm({ ...form, height: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-bold"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 flex items-center gap-1">
                <Weight className="w-3 h-3" /> 體重 (kg)
              </label>
              <input
                type="number"
                min="1"
                step="0.1"
                value={form.weight}
                onChange={e => setForm({ ...form, weight: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-bold"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 flex items-center gap-1">
              <Activity className="w-3 h-3" /> 運動強度
            </label>
            <select
              value={form.activityLevel}
              onChange={e => setForm({ ...form, activityLevel: e.target.value as ActivityLevel })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-bold"
            >
              <option value="low">低活動度 (不運動、久坐)</option>
              <option value="moderate">中等活動度 (每週運動3-5天)</option>
              <option value="high">高活動度 (每週高強度運動6-7天)</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-100 active:scale-95 text-sm"
          >
            儲存身體資訊
          </button>
        </form>
      </div>

      {/* 檢查更新區塊 */}
      <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl shadow-sm border border-blue-100">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-500 text-white rounded-lg shrink-0 mt-0.5">
            <RefreshCw className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 text-sm">更新管理</h3>
            <p className="text-[11px] text-blue-700/80 mt-1">檢查應用是否有新版本。更新會自動安裝。</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {updateStatus === 'idle' && (
            <button
              onClick={handleCheckUpdate}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm"
            >
              檢查更新
            </button>
          )}
          {updateStatus === 'checking' && (
            <button disabled className="w-full py-2.5 px-4 bg-blue-400 text-white font-medium rounded-lg text-sm flex items-center justify-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              檢查中...
            </button>
          )}
          {updateStatus === 'available' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
                <Check className="w-4 h-4" />
                已更新，即將重新載入...
              </div>
            </div>
          )}
          {updateStatus === 'updated' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-[11px] text-emerald-700">應用已更新！重新載入中...</p>
            </div>
          )}
        </div>
      </div>

      {/* 自定義目標區塊 */}
      <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-800">自定義目標</h2>
              <p className="text-sm text-slate-500">覆蓋自動計算的營養指標</p>
            </div>
          </div>
          {customTargets && (
            <button 
              onClick={resetToAuto}
              className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
              title="恢復為自動計算"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleCustomSubmit} className="space-y-5">
          <div className="p-4 bg-rose-50/30 rounded-2xl border border-rose-100 mb-2">
            <label className="block text-[10px] font-black text-rose-400 uppercase mb-2 ml-1 tracking-widest">目標每日熱量 (kcal)</label>
            <input
              type="number"
              value={customForm.calories}
              onChange={e => setCustomForm({ ...customForm, calories: Number(e.target.value) })}
              className="w-full bg-transparent text-3xl font-black text-rose-600 outline-none placeholder:text-rose-200"
              placeholder="2000"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">碳水 (g)</label>
              <input
                type="number"
                value={customForm.carbs}
                onChange={e => setCustomForm({ ...customForm, carbs: Number(e.target.value) })}
                className="w-full bg-transparent font-bold text-slate-700 outline-none text-base"
                required
              />
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">蛋白 (g)</label>
              <input
                type="number"
                value={customForm.protein}
                onChange={e => setCustomForm({ ...customForm, protein: Number(e.target.value) })}
                className="w-full bg-transparent font-bold text-slate-700 outline-none text-base"
                required
              />
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">脂肪 (g)</label>
              <input
                type="number"
                value={customForm.fat}
                onChange={e => setCustomForm({ ...customForm, fat: Number(e.target.value) })}
                className="w-full bg-transparent font-bold text-slate-700 outline-none text-base"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-all shadow-lg shadow-slate-200 active:scale-95 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            儲存自定義目標
          </button>
          
          {customTargets && (
            <p className="text-[10px] text-center text-emerald-500 font-bold animate-in fade-in">
              ✓ 目前正套用您的自定義飲食目標
            </p>
          )}
        </form>
      </div>

      {/* 版本號 */}
      <div className="text-center py-4 space-y-1">
        <p className="text-xs font-medium text-slate-400">
          飲食營養追蹤 APP
        </p>
        <p className="text-[10px] text-slate-300 font-mono">
          v{__APP_VERSION__} · Build {__BUILD_DATE__}
        </p>
      </div>
    </div>
  );
}
