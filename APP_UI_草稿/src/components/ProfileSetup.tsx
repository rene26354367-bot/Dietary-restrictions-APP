import React, { useState } from 'react';
import { useDiet } from '../lib/store';
import { UserProfile, Gender, ActivityLevel } from '../lib/calculator';
import { Activity, User, Ruler, Weight } from 'lucide-react';

export default function ProfileSetup() {
  const { userProfile, saveProfile } = useDiet();

  const [form, setForm] = useState<UserProfile>(userProfile || {
    age: 30,
    height: 170,
    weight: 70,
    gender: 'male',
    activityLevel: 'moderate'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveProfile(form);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
          <User className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-800">身體資訊</h2>
          <p className="text-sm text-slate-500">輸入您的基本資料以計算營養目標</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">性別</label>
            <select
              value={form.gender}
              onChange={e => setForm({ ...form, gender: e.target.value as Gender })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="male">男性</option>
              <option value="female">女性</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">年齡 (歲)</label>
            <input
              type="number"
              min="1"
              value={form.age}
              onChange={e => setForm({ ...form, age: Number(e.target.value) })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
              <Ruler className="w-4 h-4" /> 身高 (cm)
            </label>
            <input
              type="number"
              min="1"
              value={form.height}
              onChange={e => setForm({ ...form, height: Number(e.target.value) })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
              <Weight className="w-4 h-4" /> 體重 (kg)
            </label>
            <input
              type="number"
              min="1"
              step="0.1"
              value={form.weight}
              onChange={e => setForm({ ...form, weight: Number(e.target.value) })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
            <Activity className="w-4 h-4" /> 運動強度
          </label>
          <select
            value={form.activityLevel}
            onChange={e => setForm({ ...form, activityLevel: e.target.value as ActivityLevel })}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="low">低活動度 (不運動、久坐)</option>
            <option value="moderate">中等活動度 (每週運動3-5天)</option>
            <option value="high">高活動度 (每週高強度運動6-7天)</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors mt-6"
        >
          {userProfile ? '儲存更新' : '開始使用'}
        </button>
      </form>
    </div>
  );
}
