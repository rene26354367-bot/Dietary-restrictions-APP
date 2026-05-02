import React, { useState, useEffect } from 'react';
import { useDiet } from '../lib/store';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { Flame, Droplets, Wheat, Utensils, Info, Lightbulb, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';

export default function DailySummary() {
  const { targets, dailyLogs, currentDate, setDate, removeEntry, updateEntry } = useDiet();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [advice, setAdvice] = useState<any[]>([]);

  // 取得智慧建議
  useEffect(() => {
    fetch(`http://localhost:3001/api/advice?date=${currentDate}`)
      .then(res => res.json())
      .then(data => setAdvice(data))
      .catch(err => console.error("Failed to fetch advice", err));
  }, [currentDate, dailyLogs]); // 當日期或紀錄變動時重新取得建議

  if (!targets) return null;
// ... rest of logic
  
  const isToday = currentDate === format(new Date(), 'yyyy-MM-dd');

  const todayLog = dailyLogs[currentDate];
  const entries = todayLog?.entries || [];

  const consumed = entries.reduce(
    (acc, cur) => ({
      calories: acc.calories + cur.calories,
      protein: acc.protein + cur.protein,
      carbs: acc.carbs + cur.carbs,
      fat: acc.fat + cur.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const calProgress = Math.min((consumed.calories / targets.summary.targetCalories) * 100, 100);
  const remainingCals = Math.max(targets.summary.targetCalories - consumed.calories, 0);

  return (
    <div className="h-full flex flex-col -m-4 bg-slate-100">
      {/* 頂部固定區：日期與進度概覽 */}
      <div className="bg-white px-6 pt-6 pb-6 shadow-sm z-20 sticky top-0 border-b border-slate-100">
        {/* Date Header - 標題更顯眼、更圓潤 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
              {isToday ? '今日紀錄' : '飲食紀錄'}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <input 
                type="date"
                value={currentDate}
                onChange={(e) => setDate(e.target.value)}
                className="text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {!isToday && (
            <button 
              onClick={() => setDate(format(new Date(), 'yyyy-MM-dd'))}
              className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-2 rounded-xl font-bold transition-colors"
            >
              回到今日
            </button>
          )}
        </div>

        {/* Main Calorie Summary */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-center">
            <p className="text-sm text-slate-500 mb-1">已攝取</p>
            <p className="text-2xl font-bold text-slate-800">{Math.round(consumed.calories)}</p>
          </div>
          <div className="w-32 h-32 relative">
            <CircularProgressbar
              value={calProgress}
              text={`${Math.round(remainingCals)}`}
              styles={buildStyles({
                textSize: '20px',
                pathColor: '#3b82f6',
                textColor: '#1e293b',
                trailColor: '#f1f5f9',
                strokeLinecap: 'round',
              })}
            />
            <p className="text-[10px] text-slate-400 absolute bottom-7 w-full text-center font-medium">剩餘 kcal</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-500 mb-1">目標</p>
            <p className="text-2xl font-bold text-slate-800">{targets.summary.targetCalories}</p>
          </div>
        </div>

        {/* Macros */}
        <div className="grid grid-cols-3 gap-4">
          <MacroCard
            label="碳水"
            consumed={consumed.carbs}
            target={targets.macros.carbohydrate.g}
            color="bg-amber-100 text-amber-600"
            icon={<Wheat className="w-4 h-4" />}
          />
          <MacroCard
            label="蛋白質"
            consumed={consumed.protein}
            target={targets.macros.protein.g}
            color="bg-rose-100 text-rose-600"
            icon={<Utensils className="w-4 h-4" />}
          />
          <MacroCard
            label="脂肪"
            consumed={consumed.fat}
            target={targets.macros.fat.g}
            color="bg-emerald-100 text-emerald-600"
            icon={<Droplets className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* 智慧建議與分析 */}
      {advice.length > 0 && (
        <div className="px-4 mt-6">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                <Lightbulb className="w-4 h-4 text-blue-500" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">智慧分析建議</h3>
            </div>
            <div className="space-y-3">
              {advice.map((item, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "p-3 rounded-2xl flex items-start gap-3 transition-all animate-in fade-in slide-in-from-left-2",
                    item.type === 'success' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                    item.type === 'warning' ? "bg-amber-50 text-amber-700 border border-amber-100" :
                    item.type === 'danger' ? "bg-rose-50 text-rose-700 border border-rose-100" :
                    "bg-blue-50 text-blue-700 border border-blue-100"
                  )}
                >
                  {item.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> :
                   item.type === 'warning' ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> :
                   item.type === 'danger' ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> :
                   <Info className="w-4 h-4 shrink-0 mt-0.5" />}
                  <p className="text-xs font-medium leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 飲食紀錄滾動區 */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="flex justify-between items-center mb-4 px-2">
          <h3 className="text-lg font-bold text-slate-800">細節清單</h3>
          <span className="text-xs text-slate-400 font-medium">{entries.length} 筆紀錄</span>
        </div>
        
        {entries.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl text-center shadow-sm border border-slate-100">
            <p className="text-slate-400 text-sm">目前還沒有紀錄，去新增一筆吧！</p>
          </div>
        ) : (
          <div className="space-y-3 pb-8">
            {entries.map(entry => (
              <React.Fragment key={entry.id}>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-50 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {entry.mealType && (
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg uppercase">
                          {
                            {
                              breakfast: '早餐',
                              snack1: '零食',
                              lunch: '午餐',
                              snack2: '點心',
                              dinner: '晚餐',
                              supper: '消夜'
                            }[entry.mealType] || entry.mealType
                          }
                        </span>
                      )}
                      <h4 className="font-bold text-slate-800 leading-tight">{entry.name}</h4>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <p className="text-xs font-bold text-slate-400">{Math.round(entry.amountEaten)}g</p>
                      <div className="flex gap-2">
                        <span className="text-[10px] text-amber-600/70 font-medium">碳 {Math.round(entry.carbs)}g</span>
                        <span className="text-[10px] text-rose-600/70 font-medium">蛋 {Math.round(entry.protein)}g</span>
                        <span className="text-[10px] text-emerald-600/70 font-medium">脂 {Math.round(entry.fat)}g</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-blue-600 text-lg">{Math.round(entry.calories)}<span className="text-xs ml-0.5 font-medium text-slate-400">kcal</span></p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setEditingId(entry.id === editingId ? null : entry.id)}
                        className="p-2 text-slate-300 hover:text-blue-500 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                      </button>
                      <button 
                        onClick={() => removeEntry(entry.id)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline Editor */}
                {editingId === entry.id && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">份量 (g)</label>
                        <input 
                          type="number"
                          defaultValue={entry.amountEaten}
                          id={`edit-amount-${entry.id}`}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">餐別</label>
                        <select 
                          defaultValue={entry.mealType}
                          id={`edit-meal-${entry.id}`}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="breakfast">早餐</option>
                          <option value="snack1">零食</option>
                          <option value="lunch">午餐</option>
                          <option value="snack2">點心</option>
                          <option value="dinner">晚餐</option>
                          <option value="supper">消夜</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const newAmount = Number((document.getElementById(`edit-amount-${entry.id}`) as HTMLInputElement).value);
                          const newMeal = (document.getElementById(`edit-meal-${entry.id}`) as HTMLSelectElement).value;
                          const ratio = newAmount / entry.amountEaten;
                          
                          updateEntry(entry.id, {
                            amountEaten: newAmount,
                            mealType: newMeal,
                            calories: entry.calories * ratio,
                            protein: entry.protein * ratio,
                            carbs: entry.carbs * ratio,
                            fat: entry.fat * ratio
                          });
                          setEditingId(null);
                        }}
                        className="flex-1 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-sm"
                      >
                        確認修改
                      </button>
                      <button 
                        onClick={() => setEditingId(null)}
                        className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-500 text-xs font-bold rounded-xl"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MacroCard({ label, consumed, target, color, icon }: { label: string, consumed: number, target: number, color: string, icon: React.ReactNode }) {
  const percent = Math.min((consumed / target) * 100, 100);
  
  return (
    <div className="bg-slate-50 p-3 rounded-2xl">
      <div className={cn("inline-flex items-center justify-center p-1.5 rounded-lg mb-2", color)}>
        {icon}
      </div>
      <p className="text-[10px] font-bold text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-slate-800">
        {Math.round(consumed)}<span className="text-[10px] font-normal text-slate-400">/{Math.round(target)}g</span>
      </p>
      <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden mt-2">
        <div 
          className={cn("h-full rounded-full transition-all", color.split(' ')[0].replace('-100', '-500'))} 
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
