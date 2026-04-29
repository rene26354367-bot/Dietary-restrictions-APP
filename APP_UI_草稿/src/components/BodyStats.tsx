import React, { useState, useMemo } from 'react';
import { useDiet } from '../lib/store';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Activity, Weight, Calendar, Ruler, Percent } from 'lucide-react';
import { format, parseISO, subDays, differenceInDays, startOfDay, isBefore } from 'date-fns';
import { cn } from '../lib/utils';

type BodyMetric = 'weight' | 'bmi' | 'bodyFat';
type TimeRange = '7days' | '30days' | 'all';

const metricConfig = {
  weight: { label: '體重 (kg)', color: '#3b82f6', unit: 'kg' },
  bmi: { label: 'BMI', color: '#8b5cf6', unit: '' },
  bodyFat: { label: '體脂率 (%)', color: '#ec4899', unit: '%' }
};

export default function BodyStats() {
  const { bodyLogs, userProfile, addBodyLog, currentDate } = useDiet();

  // 輸入表單狀態
  const [logDate, setLogDate] = useState(currentDate);
  const [weight, setWeight] = useState(bodyLogs[currentDate]?.weight || userProfile?.weight || 70);
  const [height, setHeight] = useState(bodyLogs[currentDate]?.height || userProfile?.height || 170);
  const [bodyFat, setBodyFat] = useState<string>(bodyLogs[currentDate]?.bodyFat?.toString() || '');

  // 圖表控制狀態
  const [activeMetric, setActiveMetric] = useState<BodyMetric>('weight');
  const [timeRange, setTimeRange] = useState<TimeRange>('7days');

  const handleSave = () => {
    addBodyLog(logDate, weight, height, bodyFat ? Number(bodyFat) : undefined);
    alert(`已儲存 ${logDate} 的身體數據`);
  };

  // 根據日期切換自動填入當天現有數據
  const handleDateChange = (date: string) => {
    setLogDate(date);
    const existing = bodyLogs[date];
    if (existing) {
      setWeight(existing.weight);
      setHeight(existing.height);
      setBodyFat(existing.bodyFat?.toString() || '');
    }
  };

  // 整理圖表資料
  const chartData = useMemo(() => {
    const data = [];
    const end = parseISO(currentDate);
    let start: Date;
    
    if (timeRange === '7days') start = subDays(end, 6);
    else if (timeRange === '30days') start = subDays(end, 29);
    else {
      // "all" - 找到最早的一筆紀錄
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
          儲存此日數據
        </button>
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
