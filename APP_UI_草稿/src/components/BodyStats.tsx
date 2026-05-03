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
  const { bodyLogs, userProfile, addBodyLog, currentDate, setDate } = useDiet();

  // ── 表單 State ───────────────────────────────────────────
  const [logDate, setLogDate]           = useState(currentDate);
  const [height,  setHeight]            = useState<number>(userProfile?.height || 170);
  const [weight,  setWeight]            = useState<number>(userProfile?.weight || 60);
  const [bodyFat, setBodyFat]           = useState('');
  const [isEditing, setIsEditing]       = useState(false);
  const [timeRange,  setTimeRange]      = useState<'7days' | '30days' | 'all' | 'custom'>('30days');
  const [customRange, setCustomRange]   = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [visibleMetrics, setVisibleMetrics] = useState<Record<BodyMetric, boolean>>({
    weight: true,
    bmi: true,
    bodyFat: true
  });

  // 當全域日期變動時，同步更新表單預設日期
  React.useEffect(() => {
    setLogDate(currentDate);
    const log = bodyLogs[currentDate];
    if (log) {
      setHeight(log.height || userProfile?.height || 170);
      setWeight(log.weight || 0);
      setBodyFat(log.bodyFat != null ? String(log.bodyFat) : '');
      setIsEditing(true);
    } else {
      setIsEditing(false);
    }
  }, [currentDate, bodyLogs, userProfile]);

  // ── Handlers ─────────────────────────────────────────────
  const toggleMetric = (metric: BodyMetric) => {
    setVisibleMetrics(prev => ({ ...prev, [metric]: !prev[metric] }));
  };
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
    let start: Date;
    let end: Date;

    if (timeRange === 'custom') {
      start = parseISO(customRange.start);
      end = parseISO(customRange.end);
      if (!isValid(start)) start = subDays(new Date(), 30);
      if (!isValid(end)) end = new Date();
    } else {
      end = parseISO(currentDate);
      if (!isValid(end)) end = new Date();
      
      if (timeRange === '7days') start = subDays(end, 6);
      else if (timeRange === '30days') start = subDays(end, 29);
      else {
        const dates = Object.keys(bodyLogs).sort();
        start = dates.length > 0 ? parseISO(dates[0]) : subDays(end, 6);
      }
    }

    // 確保 start 不在 end 之後
    if (isValid(start) && isValid(end) && isBefore(end, start)) {
      const temp = start;
      start = end;
      end = temp;
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

  return (
    <div className="h-full flex flex-col -m-4 bg-slate-50">
      {/* 標題區 - 置頂固定 */}
      <div className="bg-white px-6 py-5 shadow-sm z-30 sticky top-0 border-b border-slate-100">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">身體數據追蹤</h2>
        <p className="text-xs font-medium text-slate-400 mt-2">記錄並檢視您的身體指標變化</p>
      </div>

      {/* 捲動內容區 */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
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
            
            <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setTimeRange('7days')}
                className={cn("px-3 py-1.5 text-xs font-bold rounded-lg transition-colors", timeRange === '7days' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}
              >
                7 天
              </button>
              <button
                onClick={() => setTimeRange('30days')}
                className={cn("px-3 py-1.5 text-xs font-bold rounded-lg transition-colors", timeRange === '30days' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}
              >
                30 天
              </button>
              <button
                onClick={() => setTimeRange('all')}
                className={cn("px-3 py-1.5 text-xs font-bold rounded-lg transition-colors", timeRange === 'all' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}
              >
                全部
              </button>
              <button
                onClick={() => setTimeRange('custom')}
                className={cn("px-3 py-1.5 text-xs font-bold rounded-lg transition-colors", timeRange === 'custom' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}
              >
                自定義
              </button>
            </div>
          </div>

          {/* 自定義日期選擇區 */}
          {timeRange === 'custom' && (
            <div className="flex items-center gap-2 p-3 bg-blue-50/50 rounded-2xl border border-blue-100 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex-1">
                <label className="block text-[8px] font-black text-blue-400 uppercase mb-1 ml-1">起始日期</label>
                <input 
                  type="date"
                  value={customRange.start}
                  onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full bg-white border border-blue-100 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="text-blue-300 mt-4 font-bold">→</div>
              <div className="flex-1">
                <label className="block text-[8px] font-black text-blue-400 uppercase mb-1 ml-1">結束日期</label>
                <input 
                  type="date"
                  value={customRange.end}
                  onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full bg-white border border-blue-100 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* 圖表圖例 (Legend) - 改為可點擊切換 */}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(metricConfig) as BodyMetric[]).map((key) => {
              const config = metricConfig[key];
              const isVisible = visibleMetrics[key];
              return (
                <button
                  key={key}
                  onClick={() => toggleMetric(key)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all active:scale-95",
                    isVisible 
                      ? "bg-white border-slate-200 shadow-sm" 
                      : "bg-slate-50 border-transparent grayscale opacity-50"
                  )}
                >
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: isVisible ? config.color : '#cbd5e1' }} />
                  <span className={cn("text-[10px] font-bold uppercase tracking-tight", isVisible ? "text-slate-700" : "text-slate-400")}>
                    {config.label}
                  </span>
                </button>
              );
            })}
          </div>
          
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
                  dy={10}
                />
                {/* 左 Y 軸: 體重 */}
                <YAxis 
                  yAxisId="left"
                  orientation="left"
                  domain={['dataMin - 5', 'dataMax + 5']} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: metricConfig.weight.color, fontSize: 10, fontWeight: 'bold' }}
                  hide={!visibleMetrics.weight}
                />
                {/* 右 Y 軸: BMI & 體脂 */}
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 'auto']} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                  hide={!visibleMetrics.bmi && !visibleMetrics.bodyFat}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ color: '#64748b', marginBottom: '4px', fontWeight: 'bold' }}
                  itemStyle={{ fontWeight: 'bold', fontSize: '12px' }}
                />
                
                {visibleMetrics.weight && (
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="weight" 
                    name="體重"
                    stroke={metricConfig.weight.color} 
                    strokeWidth={3}
                    dot={{ r: 3, fill: metricConfig.weight.color, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    connectNulls
                  />
                )}
                {visibleMetrics.bmi && (
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="bmi" 
                    name="BMI"
                    stroke={metricConfig.bmi.color} 
                    strokeWidth={3}
                    dot={{ r: 3, fill: metricConfig.bmi.color, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    connectNulls
                  />
                )}
                {visibleMetrics.bodyFat && (
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="bodyFat" 
                    name="體脂"
                    stroke={metricConfig.bodyFat.color} 
                    strokeWidth={3}
                    dot={{ r: 3, fill: metricConfig.bodyFat.color, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    connectNulls
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
