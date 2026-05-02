import React, { useState, useMemo } from 'react';
import { useDiet } from '../lib/store';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts';
import { format, parseISO, subDays, startOfDay, differenceInDays, isBefore } from 'date-fns';
import { Calendar, Filter, PieChart as PieIcon, TrendingUp, Info } from 'lucide-react';
import { cn } from '../lib/utils';

type MetricType = 'calories' | 'protein' | 'carbs' | 'fat' | 'weight' | 'avgCalories';
type TimeRange = '7days' | '30days' | 'custom';

const metricConfig = {
  calories: { label: '每日熱量', color: '#3b82f6', key: 'calories' },
  avgCalories: { label: '7日平均熱量', color: '#93c5fd', key: 'avgCalories' },
  weight: { label: '體重 (kg)', color: '#8b5cf6', key: 'weight' },
  protein: { label: '蛋白質 (g)', color: '#f43f5e', key: 'protein' },
  carbs: { label: '碳水 (g)', color: '#d97706', key: 'carbs' },
  fat: { label: '脂肪 (g)', color: '#10b981', key: 'fat' },
};

const MACRO_COLORS = ['#d97706', '#f43f5e', '#10b981']; // Carbs, Protein, Fat

export default function NutritionStats() {
  const { dailyLogs, bodyLogs, currentDate, targets } = useDiet();
  const [timeRange, setTimeRange] = useState<TimeRange>('7days');
  const [customStart, setCustomStart] = useState<string>(format(subDays(parseISO(currentDate), 6), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState<string>(currentDate);
  const [activeMetrics, setActiveMetrics] = useState<MetricType[]>(['calories', 'avgCalories', 'weight']);

  const toggleMetric = (metric: MetricType) => {
    setActiveMetrics(prev => {
      if (prev.includes(metric)) {
        if (prev.length === 1) return prev;
        return prev.filter(m => m !== metric);
      }
      return [...prev, metric];
    });
  };

  const { chartData, macroSummary } = useMemo(() => {
    const data = [];
    let start: Date;
    let end: Date;

    if (timeRange === 'custom') {
      start = startOfDay(parseISO(customStart));
      end = startOfDay(parseISO(customEnd));
    } else {
      const daysToSubtract = timeRange === '7days' ? 6 : 29;
      end = startOfDay(parseISO(currentDate));
      start = subDays(end, daysToSubtract);
    }

    const diffDays = differenceInDays(end, start);
    
    // Total macros for Pie Chart
    let totalC = 0, totalP = 0, totalF = 0;

    for (let i = diffDays; i >= 0; i--) {
      const currentDateObj = subDays(end, i);
      const d = format(currentDateObj, 'yyyy-MM-dd');
      const log = dailyLogs[d];
      const bodyLog = bodyLogs[d];
      
      let calories = 0, protein = 0, carbs = 0, fat = 0;
      if (log && log.entries) {
        log.entries.forEach(entry => {
          calories += entry.calories;
          protein += entry.protein;
          carbs += entry.carbs;
          fat += entry.fat;
        });
      }

      totalC += carbs;
      totalP += protein;
      totalF += fat;

      // Rolling Average calculation (simple version for the chart window)
      let sumCals = 0, count = 0;
      for (let j = 0; j < 7; j++) {
        const prevD = format(subDays(currentDateObj, j), 'yyyy-MM-dd');
        const prevLog = dailyLogs[prevD];
        if (prevLog && prevLog.entries.length > 0) {
          sumCals += prevLog.entries.reduce((s, e) => s + e.calories, 0);
          count++;
        }
      }

      data.push({
        date: format(currentDateObj, 'MM/dd'),
        dateFull: d,
        calories: Math.round(calories),
        avgCalories: count > 0 ? Math.round(sumCals / count) : null,
        protein: Math.round(protein),
        carbs: Math.round(carbs),
        fat: Math.round(fat),
        weight: bodyLog ? bodyLog.weight : null,
      });
    }

    const macroPie = [
      { name: '碳水', value: totalC * 4 },
      { name: '蛋白質', value: totalP * 4 },
      { name: '脂肪', value: totalF * 9 },
    ].filter(m => m.value > 0);

    return { chartData: data, macroSummary: macroPie };
  }, [dailyLogs, bodyLogs, currentDate, timeRange, customStart, customEnd]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800">趨勢統計分析</h2>
          <p className="text-sm text-slate-500">同步追蹤飲食與體重變化</p>
        </div>
      </div>

      {/* Summary Cards: Macro Split & Average */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-24 h-24 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={macroSummary}
                  innerRadius={25}
                  outerRadius={40}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {macroSummary.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={MACRO_COLORS[index % MACRO_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <PieIcon className="w-3 h-3" /> 期間熱量佔比
            </h3>
            <div className="space-y-1">
              {macroSummary.map((m, i) => {
                const total = macroSummary.reduce((s, x) => s + x.value, 0);
                const percent = total > 0 ? Math.round((m.value / total) * 100) : 0;
                return (
                  <div key={m.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: MACRO_COLORS[i] }}></div>
                    <span className="text-[10px] font-bold text-slate-600 w-10">{m.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{percent}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> 7日平均攝取
          </h3>
          <p className="text-3xl font-black text-slate-800 leading-none">
            {chartData.length > 0 ? chartData[chartData.length - 1].avgCalories || 0 : 0} 
            <span className="text-sm font-bold text-slate-400 ml-1">kcal</span>
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", 
              (chartData[chartData.length-1]?.avgCalories || 0) > (targets?.summary.targetCalories || 0) 
              ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-500"
            )}>
              {(chartData[chartData.length-1]?.avgCalories || 0) > (targets?.summary.targetCalories || 0) ? '高於目標' : '穩定控制'}
            </span>
            <span className="text-[10px] text-slate-400">vs 目標 {targets?.summary.targetCalories}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Calendar className="w-4 h-4" /> 時間範圍
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {['7days', '30days', 'custom'].map(r => (
               <button
                key={r}
                onClick={() => setTimeRange(r as TimeRange)}
                className={cn("px-3 py-1.5 text-xs font-medium rounded-lg transition-colors", timeRange === r ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}
               >
                {r === '7days' ? '近 7 天' : r === '30days' ? '近 30 天' : '自訂'}
               </button>
            ))}
          </div>
        </div>

        {timeRange === 'custom' && (
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-white border text-slate-700 border-slate-200 rounded-lg px-2 py-1 text-sm flex-1 w-full" />
            <span className="text-slate-400 text-sm font-medium">至</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-white border text-slate-700 border-slate-200 rounded-lg px-2 py-1 text-sm flex-1 w-full" />
          </div>
        )}

        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
            <Filter className="w-4 h-4" /> 顯示數據
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(metricConfig) as MetricType[]).map(metric => {
              const config = metricConfig[metric];
              const isActive = activeMetrics.includes(metric);
              return (
                <button
                  key={metric}
                  onClick={() => toggleMetric(metric)}
                  className={cn("px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border", isActive ? "bg-slate-50" : "bg-white border-slate-200 text-slate-400")}
                  style={isActive ? { color: config.color, borderColor: config.color, backgroundColor: `${config.color}10` } : undefined}
                >
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={10} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} hide={!activeMetrics.some(m => m.includes('calories'))} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} hide={!activeMetrics.some(m => ['protein', 'carbs', 'fat', 'weight'].includes(m))} />
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              
              {activeMetrics.map(metric => (
                <Line 
                  key={metric}
                  yAxisId={metric.includes('calories') ? 'left' : 'right'}
                  type="monotone" 
                  dataKey={metric} 
                  name={metricConfig[metric].label}
                  stroke={metricConfig[metric].color} 
                  strokeWidth={metric === 'avgCalories' ? 2 : 3}
                  strokeDasharray={metric === 'avgCalories' ? "5 5" : "0"}
                  dot={metric === 'avgCalories' ? false : { r: 3, strokeWidth: 2, fill: '#fff', stroke: metricConfig[metric].color }}
                  connectNulls={metric === 'weight'}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* History Detail with Insights */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-sm">歷史趨勢分析</h3>
          <Info className="w-4 h-4 text-slate-300" />
        </div>
        <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
          {chartData.slice().reverse().map(day => {
            const targetCals = targets?.summary.targetCalories || 2000;
            const diff = day.calories - targetCals;
            const isLogged = day.calories > 0;

            return (
              <div key={day.dateFull} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-black text-slate-800">{day.date}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{day.dateFull}</p>
                  </div>
                  {isLogged && (
                    <div className={cn("px-2 py-1 rounded-lg text-[10px] font-bold", 
                      Math.abs(diff) < 100 ? "bg-emerald-100 text-emerald-600" : 
                      diff > 0 ? "bg-rose-100 text-rose-600" : "bg-blue-100 text-blue-600"
                    )}>
                      {Math.abs(diff) < 100 ? '精準達標' : diff > 0 ? `超標 ${diff}` : `剩餘 ${Math.abs(diff)}`} kcal
                    </div>
                  )}
                </div>
                
                {isLogged ? (
                  <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <p className="text-[8px] text-slate-400 uppercase font-bold">總熱量</p>
                      <p className="text-sm font-black text-slate-700">{day.calories}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] text-amber-500 uppercase font-bold">碳水</p>
                      <p className="text-sm font-bold text-slate-600">{day.carbs}g</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] text-rose-500 uppercase font-bold">蛋白</p>
                      <p className="text-sm font-bold text-slate-600">{day.protein}g</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] text-emerald-500 uppercase font-bold">體重</p>
                      <p className="text-sm font-bold text-slate-600">{day.weight || '--'}kg</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-300 italic">當日無飲食紀錄</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

