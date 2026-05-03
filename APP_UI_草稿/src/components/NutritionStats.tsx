import React, { useState, useMemo } from 'react';
import { useDiet } from '../lib/store';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts';
import { format, parseISO, subDays, startOfDay, differenceInDays, isBefore } from 'date-fns';
import { Calendar, Filter, PieChart as PieIcon, TrendingUp, Info } from 'lucide-react';
import { cn } from '../lib/utils';

type MetricType = 'calories' | 'protein' | 'carbs' | 'fat' | 'weight' | 'avgCalories' | 'avgProtein' | 'avgCarbs' | 'avgFat';
type TimeRange = '7days' | '30days' | 'custom';

const metricConfig = {
  calories: { label: '每日熱量', color: '#3b82f6', key: 'calories' },
  avgCalories: { label: '7日平均熱量', color: '#93c5fd', key: 'avgCalories' },
  weight: { label: '體重 (kg)', color: '#8b5cf6', key: 'weight' },
  protein: { label: '蛋白質 (g)', color: '#f43f5e', key: 'protein' },
  avgProtein: { label: '平均蛋白', color: '#fda4af', key: 'avgProtein' },
  carbs: { label: '碳水 (g)', color: '#d97706', key: 'carbs' },
  avgCarbs: { label: '平均碳水', color: '#fcd34d', key: 'avgCarbs' },
  fat: { label: '脂肪 (g)', color: '#10b981', key: 'fat' },
  avgFat: { label: '平均脂肪', color: '#6ee7b7', key: 'avgFat' },
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

      // Rolling Average calculation
      let sumCals = 0, sumP = 0, sumC = 0, sumF = 0, count = 0;
      for (let j = 0; j < 7; j++) {
        const prevD = format(subDays(currentDateObj, j), 'yyyy-MM-dd');
        const prevLog = dailyLogs[prevD];
        if (prevLog && prevLog.entries && prevLog.entries.length > 0) {
          sumCals += prevLog.entries.reduce((s, e) => s + e.calories, 0);
          sumP += prevLog.entries.reduce((s, e) => s + (e.protein || 0), 0);
          sumC += prevLog.entries.reduce((s, e) => s + (e.carbs || 0), 0);
          sumF += prevLog.entries.reduce((s, e) => s + (e.fat || 0), 0);
          count++;
        }
      }

      data.push({
        date: format(currentDateObj, 'MM/dd'),
        dateFull: d,
        calories: Math.round(calories),
        avgCalories: count > 0 ? Math.round(sumCals / count) : null,
        protein: Math.round(protein),
        avgProtein: count > 0 ? Math.round(sumP / count) : null,
        carbs: Math.round(carbs),
        avgCarbs: count > 0 ? Math.round(sumC / count) : null,
        fat: Math.round(fat),
        avgFat: count > 0 ? Math.round(sumF / count) : null,
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
    <div className="h-full flex flex-col -m-4 bg-slate-100">
      {/* 頂部固定區：標題 */}
      <div className="bg-white px-6 py-6 shadow-sm z-20 sticky top-0 border-b border-slate-100">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
          趨勢統計
        </h1>
        <p className="text-xs font-bold text-slate-400 mt-2 flex items-center gap-1 uppercase tracking-wider">
          <TrendingUp className="w-3 h-3" /> 飲食與體重連動分析
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
        {/* Summary Cards: Macro Split & Average */}
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div className="w-32 h-32 flex-shrink-0 -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={macroSummary.length > 0 ? macroSummary : [{ name: '無數據', value: 1 }]}
                    innerRadius={28}
                    outerRadius={42}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {macroSummary.length > 0 ? macroSummary.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={MACRO_COLORS[index % MACRO_COLORS.length]} />
                    )) : <Cell fill="#f1f5f9" />}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 ml-2">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                <PieIcon className="w-3.5 h-3.5" /> 總攝取佔比
              </h3>
              <div className="space-y-2">
                {macroSummary.length > 0 ? macroSummary.map((m, i) => {
                  const total = macroSummary.reduce((s, x) => s + x.value, 0);
                  const percent = total > 0 ? Math.round((m.value / total) * 100) : 0;
                  return (
                    <div key={m.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: MACRO_COLORS[i] }}></div>
                        <span className="text-xs font-bold text-slate-600">{m.name}</span>
                      </div>
                      <span className="text-xs text-slate-400 font-mono font-bold">{percent}%</span>
                    </div>
                  );
                }) : <p className="text-xs text-slate-300 italic">尚未有足夠數據</p>}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-blue-500" /> 週期平均攝取 (日均)
            </h3>
            
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div className="col-span-2 pb-4 border-b border-slate-50">
                <p className="text-[10px] font-black text-blue-500 uppercase mb-1">平均熱量</p>
                <p className="text-4xl font-black text-slate-800 leading-none">
                  {chartData.length > 0 ? chartData[chartData.length - 1].avgCalories || 0 : 0} 
                  <span className="text-sm font-bold text-slate-300 ml-2 italic uppercase">kcal</span>
                </p>
              </div>

              <div>
                <p className="text-[10px] font-black text-amber-500 uppercase mb-1">平均碳水</p>
                <p className="text-xl font-black text-slate-700 leading-none">
                  {chartData.length > 0 ? chartData[chartData.length - 1].avgCarbs || 0 : 0}
                  <span className="text-[10px] font-bold text-slate-300 ml-1 uppercase">g</span>
                </p>
              </div>

              <div>
                <p className="text-[10px] font-black text-rose-500 uppercase mb-1">平均蛋白</p>
                <p className="text-xl font-black text-slate-700 leading-none">
                  {chartData.length > 0 ? chartData[chartData.length - 1].avgProtein || 0 : 0}
                  <span className="text-[10px] font-bold text-slate-300 ml-1 uppercase">g</span>
                </p>
              </div>

              <div>
                <p className="text-[10px] font-black text-emerald-500 uppercase mb-1">平均脂肪</p>
                <p className="text-xl font-black text-slate-700 leading-none">
                  {chartData.length > 0 ? chartData[chartData.length - 1].avgFat || 0 : 0}
                  <span className="text-[10px] font-bold text-slate-300 ml-1 uppercase">g</span>
                </p>
              </div>

              <div className="col-span-2 pt-2">
                <div className="flex items-center gap-2">
                  {(() => {
                    const avg = chartData[chartData.length - 1]?.avgCalories || 0;
                    const target = targets?.summary.targetCalories || 2000;
                    const ratio = avg / target;

                    if (ratio < 0.9) {
                      return (
                        <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-amber-50 text-amber-600">
                          ⚠ 建議多補充
                        </span>
                      );
                    } else if (ratio > 1.1) {
                      return (
                        <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-rose-50 text-rose-600">
                          ⚠ 攝取過高警示
                        </span>
                      );
                    } else {
                      return (
                        <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600">
                          ✓ 控制良好
                        </span>
                      );
                    }
                  })()}
                  <span className="text-[10px] text-slate-400 font-medium">目標 {targets?.summary.targetCalories} kcal</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Calendar className="w-4 h-4" /> 分析區間
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {['7days', '30days', 'custom'].map(r => (
                 <button
                  key={r}
                  onClick={() => setTimeRange(r as TimeRange)}
                  className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-all", timeRange === r ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                 >
                  {r === '7days' ? '7日' : r === '30days' ? '30日' : '自訂'}
                 </button>
              ))}
            </div>
          </div>

          {timeRange === 'custom' && (
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 animate-in slide-in-from-top-1">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-white border text-slate-700 border-slate-200 rounded-xl px-3 py-2 text-xs flex-1" />
              <span className="text-slate-300 text-xs font-bold">~</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-white border text-slate-700 border-slate-200 rounded-xl px-3 py-2 text-xs flex-1" />
            </div>
          )}

          <div className="border-t border-slate-50 pt-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
              <Filter className="w-4 h-4" /> 篩選維度
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(metricConfig) as MetricType[]).map(metric => {
                const config = metricConfig[metric];
                const isActive = activeMetrics.includes(metric);
                return (
                  <button
                    key={metric}
                    onClick={() => toggleMetric(metric)}
                    className={cn("px-3 py-2 rounded-xl text-[10px] font-black transition-all border", isActive ? "" : "bg-white border-slate-200 text-slate-300")}
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
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 700 }} dy={10} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 700 }} hide={!activeMetrics.some(m => m.includes('calories'))} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 700 }} hide={!activeMetrics.some(m => ['protein', 'carbs', 'fat', 'weight'].includes(m))} />
                <Tooltip 
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px 16px' }}
                  itemStyle={{ fontWeight: 800, fontSize: '12px' }}
                />
                
                {activeMetrics.map(metric => (
                  <Line 
                    key={metric}
                    yAxisId={metric.includes('calories') ? 'left' : 'right'}
                    type="monotone" 
                    dataKey={metric} 
                    name={metricConfig[metric].label}
                    stroke={metricConfig[metric].color} 
                    strokeWidth={metric === 'avgCalories' ? 2 : 4}
                    strokeDasharray={metric === 'avgCalories' ? "6 6" : "0"}
                    dot={metric === 'avgCalories' ? false : { r: 4, strokeWidth: 3, fill: '#fff', stroke: metricConfig[metric].color }}
                    connectNulls={metric === 'weight'}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* History Detail with Insights */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm">數據細節回顧</h3>
            <Info className="w-4 h-4 text-slate-300" />
          </div>
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {chartData.slice().reverse().map(day => {
              const targetCals = targets?.summary.targetCalories || 2000;
              const diff = day.calories - targetCals;
              const isLogged = day.calories > 0;

              return (
                <div key={day.dateFull} className="p-5 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-black text-slate-800 text-base">{day.date}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{day.dateFull}</p>
                    </div>
                    {isLogged && (
                      <div className={cn("px-3 py-1 rounded-xl text-[10px] font-black", 
                        Math.abs(diff) < 100 ? "bg-emerald-100 text-emerald-600" : 
                        diff > 0 ? "bg-rose-100 text-rose-600" : "bg-blue-100 text-blue-600"
                      )}>
                        {Math.abs(diff) < 100 ? '達標 ✓' : diff > 0 ? `+${diff} kcal` : `${diff} kcal`}
                      </div>
                    )}
                  </div>
                  
                  {isLogged ? (
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <p className="text-[8px] text-slate-300 uppercase font-black">熱量</p>
                        <p className="text-sm font-black text-slate-700">{day.calories}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[8px] text-amber-400 uppercase font-black">碳水</p>
                        <p className="text-sm font-black text-slate-700">{day.carbs}g</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[8px] text-rose-400 uppercase font-black">蛋白</p>
                        <p className="text-sm font-black text-slate-700">{day.protein}g</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[8px] text-emerald-400 uppercase font-black">體重</p>
                        <p className="text-sm font-black text-slate-700">{day.weight || '--'}kg</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-300 italic font-medium">尚無攝取紀錄</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

