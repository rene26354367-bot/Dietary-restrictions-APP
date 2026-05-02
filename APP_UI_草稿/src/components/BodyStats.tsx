import React, { useState, useMemo } from 'react';
import { useDiet, BodyLog } from '../lib/store';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Activity, Weight, Calendar, Ruler, Percent, Edit, Trash2, ChevronRight, History } from 'lucide-react';
import { format, parseISO, subDays, differenceInDays, startOfDay, isBefore, isValid } from 'date-fns';
import { cn } from '../lib/utils';

type BodyMetric = 'weight' | 'bmi' | 'bodyFat';

const metricConfig: Record<BodyMetric, { label: string; color: string; unit: string }> = {
  weight:  { label: '體重 kg',  color: '#3b82f6', unit: 'kg' },
  bmi:     { label: 'BMI 指數', color: '#8b5cf6', unit: '' },
  bodyFat: { label: '體脂率 %', color: '#f43f5e', unit: '%' },
};

export default function BodyStats() {
  const { bodyLogs, userProfile, addBodyLog, currentDate } = useDiet();

  // ── 表單 State ───────────────────────────────────────────
  const [logDate, setLogDate]           = useState(format(new Date(), 'yyyy-MM-dd'));
  const [height,  setHeight]            = useState<number>(userProfile?.height || 170);
  const [weight,  setWeight]            = useState<number>(userProfile?.weight || 60);
  const [bodyFat, setBodyFat]           = useState('');
  const [isEditing, setIsEditing]       = useState(false);
  const [timeRange,  setTimeRange]      = useState<'7days' | '30days' | 'all'>('30days');
  const [activeMetric, setActiveMetric] = useState<BodyMetric>('weight');

  // ── Handlers ─────────────────────────────────────────────
  const handleDateChange = (date: string) => {
    setLogDate(date);
    const log = bodyLogs[date];
    if (log) {
      setHeight(log.height || userProfile?.height || 170);
      setWeight(log.weight || 0);
      setBodyFat(log.bodyFat != null ? String(log.bodyFat) : '');
      setIsEditing(true);
    } else {
      setIsEditing(false);
    }
  };

  const handleSave = () => {
    if (!weight || !height) return;
    addBodyLog(logDate, weight, height, bodyFat ? parseFloat(bodyFat) : undefined);
    setIsEditing(true);
  };

  const startEdit = (date: string) => {
    handleDateChange(date);
  };

  // 歷史紀錄清單 (僅顯示有測量的天數，並加入日期合法性檢查防止崩潰)
  const historyList = useMemo(() => {
    if (!bodyLogs) return [];
    return (Object.values(bodyLogs) as BodyLog[])
      .filter(log => log && log.date && isValid(parseISO(log.date)))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [bodyLogs]);

  // 整理圖表資料
  const chartData = useMemo(() => {
    const data = [];
    const end = parseISO(currentDate);
    let start: Date;
    
    if (timeRange === '7days') start = subDays(end, 6);
    else if (timeRange === '30days') start = subDays(end, 29);
    else {
      const dates = Object.keys(bodyLogs).sort();
      start = dates.length > 0 ? parseISO(dates[0]) : subDays(end, 6);
    }

    const diff = differenceInDays(end, start);
    for (let i = 0; i <= diff; i++) {
      const dObj = subDays(end, diff - i);
      const dStr = format(dObj, 'yyyy-MM-dd');
      const log = bodyLogs[dStr];
      
      data.push({
        date: format(dObj, 'MM/dd'),
        fullDate: dStr,
        weight: log?.weight || null,
        bmi: log?.bmi || null,
        bodyFat: log?.bodyFat || null
      });
    }
    return data;
  }, [bodyLogs, currentDate, timeRange]);

  const currentConfig = metricConfig[activeMetric];

  return (
    <div className="space-y-6">
      {/* 標題區 */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800">身體數據追蹤</h2>
          <p className="text-sm text-slate-500">記錄並檢視您的身體變化</p>
        </div>
      </div>

      {/* 紀錄表單 */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Weight className="w-5 h-5 text-blue-500" /> 更新身體指標
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <Calendar className="w-5 h-5 text-slate-400" />
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase">記錄日期</label>
              <input
                type="date"
                value={logDate}
                onChange={e => handleDateChange(e.target.value)}
                className="w-full bg-transparent font-bold text-slate-700 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <label className="block text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Ruler className="w-3 h-3" /> 身高 (cm)
              </label>
              <input
                type="number"
                step="0.1"
                value={height}
                onChange={e => setHeight(Number(e.target.value))}
                className="w-full bg-transparent font-bold text-slate-700 text-lg outline-none"
              />
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <label className="block text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Weight className="w-3 h-3" /> 體重 (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={e => setWeight(Number(e.target.value))}
                className="w-full bg-transparent font-bold text-slate-700 text-lg outline-none"
              />
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <label className="block text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Percent className="w-3 h-3" /> 體脂率 (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={bodyFat}
                onChange={e => setBodyFat(e.target.value)}
                className="w-full bg-transparent font-bold text-slate-700 text-lg outline-none"
                placeholder="選填"
              />
            </div>
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
              <label className="block text-[10px] font-bold text-blue-400 uppercase">計算 BMI</label>
              <div className="text-lg font-black text-blue-700">
                {(weight && height) ? (weight / Math.pow(height / 100, 2)).toFixed(1) : '--'}
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={handleSave}
          className="w-full mt-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 transition-all active:scale-95"
        >
          {isEditing ? '更新測量數據' : '儲存此日數據'}
        </button>
      </div>

      {/* 歷史紀錄清單 */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
            <History className="w-4 h-4 text-slate-400" /> 測量歷史紀錄
          </h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{historyList.length} 次測量</span>
        </div>
        
        <div className="divide-y divide-slate-50">
          {historyList.length > 0 ? historyList.map(log => {
            const dateObj = parseISO(log.date);
            const displayDate = isValid(dateObj) ? format(dateObj, 'MM/dd') : '??/??';
            
            return (
              <div key={log.date} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-black text-slate-800">{displayDate}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{log.date}</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-black text-blue-500">WT</span>
                      <span className="text-sm font-bold text-slate-600">{log.weight}kg</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-black text-indigo-500">BMI</span>
                      <span className="text-sm font-bold text-slate-600">{log.bmi}</span>
                    </div>
                    {log.bodyFat && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-black text-rose-500">FAT</span>
                        <span className="text-sm font-bold text-slate-600">{log.bodyFat}%</span>
                      </div>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => startEdit(log.date)}
                  className="p-2.5 bg-slate-100 text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            );
          }) : (
            <div className="p-12 text-center">
              <p className="text-sm text-slate-400 italic">尚無歷史測量紀錄</p>
            </div>
          )}
        </div>
      </div>

      {/* 圖表分析 */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" /> 趨勢分析
          </h3>
          
          <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setTimeRange('7days')}
              className={cn("flex-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors", timeRange === '7days' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}
            >
              7 天
            </button>
            <button
              onClick={() => setTimeRange('30days')}
              className={cn("flex-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors", timeRange === '30days' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}
            >
              30 天
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={cn("flex-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors", timeRange === 'all' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}
            >
              全部
            </button>
          </div>
        </div>

        {/* 指標切換 (一次只顯示一種) */}
        <div className="flex gap-2">
          {(Object.keys(metricConfig) as BodyMetric[]).map(m => (
            <button
              key={m}
              onClick={() => setActiveMetric(m)}
              className={cn(
                "flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all",
                activeMetric === m 
                  ? "bg-slate-800 border-slate-800 text-white shadow-md" 
                  : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
              )}
            >
              {metricConfig[m].label.split(' ')[0]}
            </button>
          ))}
        </div>
        
        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }} 
                dy={10}
              />
              <YAxis 
                domain={['auto', 'auto']} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: currentConfig.color, fontWeight: 'bold' }}
                formatter={(value: number) => [`${value}${currentConfig.unit}`, currentConfig.label.split(' ')[0]]}
                labelStyle={{ color: '#64748b', marginBottom: '4px', fontWeight: 'bold' }}
              />
              <Line 
                type="monotone" 
                dataKey={activeMetric} 
                stroke={currentConfig.color} 
                strokeWidth={4}
                dot={{ r: 4, fill: currentConfig.color, strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 8, strokeWidth: 0 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
