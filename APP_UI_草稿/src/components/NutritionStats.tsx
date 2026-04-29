import React, { useState, useMemo } from 'react';
import { useDiet } from '../lib/store';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { format, parseISO, subDays, startOfDay, differenceInDays, isBefore } from 'date-fns';
import { Calendar, Filter } from 'lucide-react';
import { cn } from '../lib/utils';

type MetricType = 'calories' | 'protein' | 'carbs' | 'fat';
type TimeRange = '7days' | '30days' | 'custom';

const metricConfig = {
  calories: { label: '熱量 (kcal)', color: '#3b82f6', key: 'calories' },
  protein: { label: '蛋白質 (g)', color: '#f43f5e', key: 'protein' },
  carbs: { label: '碳水 (g)', color: '#d97706', key: 'carbs' },
  fat: { label: '脂肪 (g)', color: '#10b981', key: 'fat' },
};

export default function NutritionStats() {
  const { dailyLogs, currentDate } = useDiet();
  const [timeRange, setTimeRange] = useState<TimeRange>('7days');
  const [customStart, setCustomStart] = useState<string>(format(subDays(parseISO(currentDate), 6), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState<string>(currentDate);
  const [activeMetrics, setActiveMetrics] = useState<MetricType[]>(['calories']);

  const toggleMetric = (metric: MetricType) => {
    setActiveMetrics(prev => {
      if (prev.includes(metric)) {
        // Prevent unselecting the last metric
        if (prev.length === 1) return prev;
        return prev.filter(m => m !== metric);
      }
      return [...prev, metric];
    });
  };

  const chartData = useMemo(() => {
    const data = [];
    let start: Date;
    let end: Date;

    if (timeRange === 'custom') {
      start = startOfDay(parseISO(customStart));
      end = startOfDay(parseISO(customEnd));
      if (isBefore(end, start)) {
        const temp = start;
        start = end;
        end = temp;
      }
    } else {
      const daysToSubtract = timeRange === '7days' ? 6 : 29;
      end = startOfDay(parseISO(currentDate));
      start = subDays(end, daysToSubtract);
    }

    const diffDays = differenceInDays(end, start);
    const actualDiff = Math.min(diffDays, 90); // Cap at 90 days

    for (let i = actualDiff; i >= 0; i--) {
      const currentDateObj = subDays(end, i);
      const d = format(currentDateObj, 'yyyy-MM-dd');
      const displayDate = format(currentDateObj, 'MM/dd');
      const log = dailyLogs[d];
      
      let calories = 0, protein = 0, carbs = 0, fat = 0;
      
      if (log && log.entries) {
        log.entries.forEach(entry => {
          calories += entry.calories;
          protein += entry.protein;
          carbs += entry.carbs;
          fat += entry.fat;
        });
      }

      data.push({
        date: displayDate,
        dateFull: d,
        calories: Math.round(calories),
        protein: Math.round(protein),
        carbs: Math.round(carbs),
        fat: Math.round(fat),
        hasLog: !!log && log.entries.length > 0
      });
    }
    return data;
  }, [dailyLogs, currentDate, timeRange, customStart, customEnd]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800">營養攝取統計</h2>
          <p className="text-sm text-slate-500">檢視您的飲食趨勢</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Calendar className="w-4 h-4" /> 時間範圍
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setTimeRange('7days')}
              className={cn("px-3 py-1.5 text-xs font-medium rounded-lg transition-colors", timeRange === '7days' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}
            >
              近 7 天
            </button>
            <button
              onClick={() => setTimeRange('30days')}
              className={cn("px-3 py-1.5 text-xs font-medium rounded-lg transition-colors", timeRange === '30days' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}
            >
              近 30 天
            </button>
            <button
              onClick={() => setTimeRange('custom')}
              className={cn("px-3 py-1.5 text-xs font-medium rounded-lg transition-colors", timeRange === 'custom' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}
            >
              自訂日期
            </button>
          </div>
        </div>

        {timeRange === 'custom' && (
          <div className="flex items-center gap-2 mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="bg-white border text-slate-700 border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 w-full"
            />
            <span className="text-slate-400 text-sm font-medium">至</span>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="bg-white border text-slate-700 border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 w-full"
            />
          </div>
        )}

        <div className="border-t border-slate-100 pt-4 mt-2">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
            <Filter className="w-4 h-4" /> 顯示數據 (可複選)
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(metricConfig) as MetricType[]).map(metric => {
              const config = metricConfig[metric];
              const isActive = activeMetrics.includes(metric);
              return (
                <button
                  key={metric}
                  onClick={() => toggleMetric(metric)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-medium transition-all border",
                    isActive 
                      ? "bg-slate-50 border-transparent" 
                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                  )}
                  style={isActive ? { color: config.color, borderColor: config.color, backgroundColor: `${config.color}15` } : undefined}
                >
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12 }} 
                dy={10}
                tickFormatter={(val, i) => {
                   const total = chartData.length;
                   if (total <= 14) return val;
                   if (i % Math.ceil(total / 8) !== 0) return '';
                   return val;
                }}
              />
              <YAxis 
                yAxisId="left"
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                hide={!activeMetrics.includes('calories')}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                hide={!(activeMetrics.includes('protein') || activeMetrics.includes('carbs') || activeMetrics.includes('fat'))}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                labelStyle={{ color: '#64748b', marginBottom: '8px', fontWeight: 'bold' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
              
              {activeMetrics.map(metric => {
                const config = metricConfig[metric];
                const yAxisId = metric === 'calories' ? 'left' : 'right';
                // Only connect lines if user has actually logged data (prevents graphing 0s for missing days)
                return (
                  <Line 
                    key={metric}
                    yAxisId={yAxisId}
                    type="monotone" 
                    dataKey={config.key} 
                    name={config.label}
                    stroke={config.color} 
                    strokeWidth={3}
                    dot={{ r: 3, strokeWidth: 2, fill: '#fff', stroke: config.color }}
                    activeDot={{ r: 6 }}
                  />
                )
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* History List */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm">歷史數據明細</h3>
        </div>
        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
          {chartData.slice().reverse().map(day => (
            <div key={day.dateFull} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div>
                <p className="font-bold text-slate-800">{day.date}</p>
                <p className="text-xs text-slate-500">{day.hasLog ? '有紀錄' : '無紀錄'}</p>
              </div>
              {day.hasLog ? (
                <div className="text-right">
                  <p className="font-bold text-blue-600">{day.calories} <span className="text-xs text-slate-500 font-normal">kcal</span></p>
                  <p className="text-xs text-slate-400 mt-1">碳: {day.carbs}g · 蛋: {day.protein}g · 脂: {day.fat}g</p>
                </div>
              ) : (
                <div className="text-right text-sm text-slate-400">
                  --
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
