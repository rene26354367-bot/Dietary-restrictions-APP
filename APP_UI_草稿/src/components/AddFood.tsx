import React, { useState, useRef } from 'react';
import { useDiet } from '../lib/store';
import { Search, ScanBarcode, ArrowLeft, CheckCircle2, BookmarkPlus, Camera, Loader2, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../lib/storage/api';

const MEAL_TYPES = [
  { id: 'breakfast', label: '早餐' },
  { id: 'snack1', label: '零食' },
  { id: 'lunch', label: '午餐' },
  { id: 'snack2', label: '點心' },
  { id: 'dinner', label: '晚餐' },
  { id: 'supper', label: '消夜' }
];
// ... rest of code (AddFood, PresetSearch)

export default function AddFood() {
  const [tab, setTab] = useState<'preset' | 'custom'>('preset');
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="bg-white px-4 py-4 flex items-center shadow-sm z-10 sticky top-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-600">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-slate-800 ml-2">新增紀錄</h1>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {/* Tabs */}
        <div className="flex bg-slate-200/50 p-1 rounded-xl mb-6">
          <button
            className={cn("flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2", tab === 'preset' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            onClick={() => setTab('preset')}
          >
            <Search className="w-4 h-4" /> 搜尋食材
          </button>
          <button
            className={cn("flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2", tab === 'custom' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            onClick={() => setTab('custom')}
          >
            <ScanBarcode className="w-4 h-4" /> 營養標示
          </button>
        </div>

        {tab === 'preset' ? <PresetSearch onAdd={() => navigate(-1)} /> : <CustomLabel onAdd={() => navigate(-1)} />}
      </div>
    </div>
  );
}

function PresetSearch({ onAdd }: { onAdd: () => void }) {
  const { addEntry, customFoods, currentDate } = useDiet();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [amount, setAmount] = useState<number>(100);
  const [mealType, setMealType] = useState<string>('breakfast');
  const [entryDate, setEntryDate] = useState<string>(currentDate);

  // 異步搜尋邏輯
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(true);
      fetch(`${API_BASE}/api/search?q=${encodeURIComponent(search)}`)
        .then(res => res.json())
        .then(data => {
          setResults(data);
          setIsLoading(false);
        })
        .catch(err => {
          console.error("Search failed", err);
          setIsLoading(false);
        });
    }, 300); // 300ms debounce
    return () => clearTimeout(timer);
  }, [search]);

  const handleSave = () => {
    if (!selected) return;
    const base = Number(selected.baseGrams) || 100;
    const ratio = amount / base;
    
    const getVal = (val: any) => (parseFloat(val) || 0) * ratio;

    addEntry({
      name: selected.name,
      amountEaten: amount,
      calories: getVal(selected.calories),
      protein: getVal(selected.protein),
      carbs: getVal(selected.carbs),
      fat: getVal(selected.fat),
      mealType,
    }, entryDate);
    onAdd();
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="搜尋食材 (例如：雞胸肉)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {!selected ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          {results.length > 0 ? results.map(item => (
            <button
              key={item.id}
              onClick={() => { 
                setSelected(item); 
                setAmount(Number(item.baseGrams) || 100); 
              }}
              className="w-full text-left px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors flex justify-between items-center"
            >
            <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-bold text-slate-800 flex items-baseline gap-1">
                    {item.source === 'user_custom' && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded mr-1 uppercase">自訂</span>}
                    {item.isFallback && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded mr-1 uppercase font-bold">建議</span>}
                    <span>{item.name}</span>
                    {item.detail && <span className="text-[10px] font-normal text-slate-400">({item.detail})</span>}
                  </p>
                  {item.matchedAlias && (
                    <p className="text-[11px] text-slate-400 mt-0.5">{item.matchedAlias}</p>
                  )}
                  <span className="text-sm font-black text-blue-600">
                    {typeof item.calories === 'number' ? item.calories.toFixed(0) : (parseFloat(item.calories) || 0).toFixed(0)} <span className="text-[10px] font-medium text-slate-400">kcal</span>
                  </span>
                </div>
                <div className="flex gap-3 mt-1.5">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                    <span className="text-[11px] text-slate-500">蛋 {typeof item.protein === 'number' ? item.protein.toFixed(1) : (parseFloat(item.protein) || 0).toFixed(1)}g</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                    <span className="text-[11px] text-slate-500">碳 {typeof item.carbs === 'number' ? item.carbs.toFixed(1) : (parseFloat(item.carbs) || 0).toFixed(1)}g</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div>
                    <span className="text-[11px] text-slate-500">脂 {typeof item.fat === 'number' ? item.fat.toFixed(1) : (parseFloat(item.fat) || 0).toFixed(1)}g</span>
                  </div>
                </div>
              </div>
            </button>
          )) : search.length > 0 && !isLoading ? (
            <p className="p-4 text-center text-slate-500">找不到相符的食材</p>
          ) : (
            <p className="p-4 text-center text-slate-400 text-sm italic">輸入關鍵字開始搜尋...</p>
          )}
        </div>
      ) : (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">{selected.name}</h3>
              <p className="text-sm text-slate-500">每 {selected.baseGrams || 100}g 含有 {selected.calories} kcal</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-sm text-blue-600 font-medium">重選</button>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">日期</label>
            <input
              type="date"
              value={entryDate}
              onChange={e => setEntryDate(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-700"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">餐別</label>
            <div className="grid grid-cols-3 gap-2">
              {MEAL_TYPES.map(meal => (
                <button
                  key={meal.id}
                  onClick={() => setMealType(meal.id)}
                  className={cn(
                    "py-2 px-3 rounded-lg text-sm font-medium transition-colors border text-center",
                    mealType === meal.id 
                      ? "bg-blue-50 border-blue-200 text-blue-700" 
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {meal.label}
                </button>
              ))}
            </div>
          </div>

          {/* 單位快速選擇 */}
          {selected.servings && selected.servings.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">快速選擇單位</label>
              <div className="flex flex-wrap gap-2">
                {selected.servings.map((serving: any) => (
                  <button
                    key={serving.label}
                    onClick={() => setAmount(serving.grams)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
                      amount === serving.grams
                        ? "bg-blue-600 border-blue-600 text-white shadow-md scale-105"
                        : "bg-white border-slate-200 text-slate-600 hover:border-blue-300"
                    )}
                  >
                    {serving.label} ({serving.grams}g)
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">自訂食用份量 (公克)</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                className="w-full text-lg px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-center font-bold font-mono"
              />
              <span className="text-slate-500 font-medium whitespace-nowrap">g</span>
            </div>
          </div>

          <button onClick={handleSave} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            新增每日食用量 {(selected.calories * (amount / selected.baseGrams)).toFixed(0)} kcal
          </button>
        </div>
      )}
    </div>
  );
}

function CustomLabel({ onAdd }: { onAdd: () => void }) {
  const { addEntry, addCustomFood, currentDate } = useDiet();
  const [mealType, setMealType] = useState<string>('breakfast');
  const [entryDate, setEntryDate] = useState<string>(currentDate);
  const [ocrText, setOcrText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [metadata, setMetadata] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [form, setForm] = useState({
    name: '',
    baseAmount: 100, 
    calories: '',
    carbs: '',
    protein: '',
    fat: '',
    sugar: '',
    sodium: '',
    amountEaten: 100,
  });

  const handleSmartParse = async (text: string = ocrText) => {
    if (!text.trim()) return;
    setIsParsing(true);
    setMetadata(null);
    try {
      const res = await fetch(`${API_BASE}/api/ocr-parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setForm(prev => ({
        ...prev,
        baseAmount: data.baseAmount || 100,
        calories: data.calories || '',
        carbs: data.carbs || '',
        protein: data.protein || '',
        fat: data.fat || '',
        sugar: data.sugar || '',
        sodium: data.sodium || ''
      }));
      setMetadata(data.metadata || null);
    } catch (e: any) {
      alert("解析失敗：" + e.message);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setMetadata(null);
    try {
      // 1. 判斷裝置性能與設定解析度上限
      const isLowEnd = (navigator.hardwareConcurrency || 4) <= 4;
      const MAX_EDGE = isLowEnd ? 1800 : 2400;

      // 2. 使用 createImageBitmap 在後台解碼，避免主執行緒卡頓
      const bitmap = await createImageBitmap(file);
      let { width, height } = bitmap;

      // 3. 計算縮放比例 (字體保護邏輯：不放大)
      let scale = 1;
      if (width > MAX_EDGE || height > MAX_EDGE) {
        scale = Math.min(MAX_EDGE / width, MAX_EDGE / height);
      }

      // 4. 準備 Canvas 進行高品質處理
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Canvas context unavailable');

      // 設定高品質重採樣
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // 自適應對比強化 (非強制灰階，保留顏色資訊)
      ctx.filter = 'contrast(1.15) brightness(1.03)';

      // 5. 繪製並進行處理
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close(); // 釋放記憶體

      // 6. 導出高品質 JPEG (0.85)
      const base64Image = canvas.toDataURL('image/jpeg', 0.85);

      const res = await fetch(`${API_BASE}/api/ocr-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setForm(prev => ({
        ...prev,
        baseAmount: Number(data.baseAmount) || 100,
        calories: data.calories || '',
        carbs: data.carbs || '',
        protein: data.protein || '',
        fat: data.fat || '',
        sugar: data.sugar || '',
        sodium: data.sodium || ''
      }));
      setMetadata(data.metadata || null);

      if (!data.calories && !data.protein) {
        alert("文字已辨識，但無法自動提取數值，請手動校對或重新拍攝清晰的標籤。");
      }
    } catch (e: any) {
       console.error("[Pipeline Error]", e);
       alert("影像處理或辨識發生錯誤，請重試。");
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveToDatabase = () => {
    if (!form.name || !form.calories) return;
    addCustomFood({
      name: form.name,
      baseGrams: form.baseAmount,
      calories: Number(form.calories),
      protein: Number(form.protein || 0),
      carbs: Number(form.carbs || 0),
      fat: Number(form.fat || 0),
      sugar: Number(form.sugar || 0),
      sodium: Number(form.sodium || 0),
      unit: `${form.baseAmount}g`,
    });
    alert('已儲存至搜尋食材庫');
  };

  const handleAddLog = () => {
    if (!form.name || !form.calories) return;
    const ratio = form.amountEaten / form.baseAmount;
    addEntry({
      name: form.name,
      amountEaten: form.amountEaten,
      calories: Number(form.calories) * ratio,
      protein: Number(form.protein || 0) * ratio,
      carbs: Number(form.carbs || 0) * ratio,
      fat: Number(form.fat || 0) * ratio,
      sugar: Number(form.sugar || 0) * ratio,
      sodium: Number(form.sodium || 0) * ratio,
      mealType,
    }, entryDate);
    onAdd();
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
      {/* Smart OCR Paste Area */}
      <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-sm font-bold text-blue-800 flex items-center gap-2">
            <ScanBarcode className="w-4 h-4" /> 智慧標籤辨識
          </label>
          <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">Cloud Vision</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isParsing}
            className="flex flex-col items-center justify-center gap-2 p-4 bg-white border-2 border-dashed border-blue-200 rounded-xl hover:border-blue-400 transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
              {isParsing ? <Loader2 className="w-5 h-5 text-blue-600 animate-spin group-hover:text-white" /> : <Camera className="w-5 h-5 text-blue-600 group-hover:text-white" />}
            </div>
            <span className="text-xs font-bold text-blue-700">拍攝/上傳標籤</span>
          </button>

          <div className="space-y-2">
             <p className="text-[10px] text-blue-600/80 leading-tight">
              拍下營養標示表格，系統將自動提取數據並進行品質校驗。
            </p>
            <div className="h-px bg-blue-100 w-full"></div>
            <div className="flex items-center gap-1">
               <Info className="w-3 h-3 text-blue-400" />
               <p className="text-[10px] text-slate-400 italic">
                支援交叉驗證與誤判修正
               </p>
            </div>
          </div>
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          capture="environment" 
          className="hidden" 
        />

        <div className="relative">
          <textarea
            value={ocrText}
            onChange={e => setOcrText(e.target.value)}
            placeholder="在此貼上標籤內容或觀察辨識結果..."
            className="w-full h-20 p-3 text-[10px] bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono"
          />
          {ocrText && !isParsing && (
             <button 
                onClick={() => handleSmartParse()}
                className="absolute bottom-2 right-2 px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-lg shadow-sm"
              >
                重新解析文字
              </button>
          )}
        </div>
      </div>

      {/* Sanity Check Warning UI */}
      {metadata && metadata.sanityCheck === false && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl animate-in zoom-in-95">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">數據可信度警告</h4>
              <p className="text-[11px] text-amber-700 mt-0.5">系統偵測到以下異常，建議手動校對數值：</p>
              <ul className="mt-2 space-y-1">
                {(metadata.sanityWarnings || []).map((msg: string, i: number) => (
                  <li key={i} className="text-[10px] text-amber-800 bg-white/50 px-2 py-1 rounded border border-amber-100/50 flex items-start gap-1">
                    <span className="mt-1 w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                    {msg}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {metadata && metadata.sanityCheck === true && (
        <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl flex items-center gap-2 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span className="text-[11px] font-medium text-emerald-700">數據已通過營養學邏輯驗證</span>
        </div>
      )}

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">食物名稱</label>
          <input
            type="text"
            placeholder="例如：御飯糰"
            value={form.name}
            onChange={e => setForm({...form, name: e.target.value})}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="pt-2 border-t border-slate-100">
          <p className="font-semibold text-slate-800 mb-3 text-sm flex justify-between items-center">
            <span>輸入營養標示</span>
            {(form.calories || form.protein || form.carbs) && (
              <span className="text-[10px] font-normal text-slate-400 italic animate-pulse">*數值已自動辨識填入</span>
            )}
          </p>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">每份重量 (g/ml)</label>
              <input
                type="number"
                value={form.baseAmount}
                onChange={e => setForm({...form, baseAmount: Number(e.target.value)})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">熱量 (kcal)</label>
              <input
                type="number"
                value={form.calories}
                onChange={e => setForm({...form, calories: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">蛋白質 (g)</label>
              <input
                type="number"
                value={form.protein}
                onChange={e => setForm({...form, protein: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">碳水 (g)</label>
              <input
                type="number"
                value={form.carbs}
                onChange={e => setForm({...form, carbs: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">脂肪 (g)</label>
              <input
                type="number"
                value={form.fat}
                onChange={e => setForm({...form, fat: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">糖 (g)</label>
              <input
                type="number"
                value={form.sugar}
                onChange={e => setForm({...form, sugar: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">鈉 (mg)</label>
              <input
                type="number"
                value={form.sodium}
                onChange={e => setForm({...form, sodium: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button 
            onClick={handleSaveToDatabase} 
            disabled={!form.name || !form.calories}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <BookmarkPlus className="w-4 h-4" />
            將此營養標示儲存至搜尋食材庫
          </button>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">日期</label>
            <input
              type="date"
              value={entryDate}
              onChange={e => setEntryDate(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-700"
            />
          </div>

          <label className="block text-sm font-medium text-slate-700 mb-2">餐別</label>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {MEAL_TYPES.map(meal => (
              <button
                key={meal.id}
                onClick={() => setMealType(meal.id)}
                className={cn(
                  "py-2 px-3 rounded-lg text-sm font-medium transition-colors border text-center",
                  mealType === meal.id 
                    ? "bg-amber-50 border-amber-200 text-amber-700" 
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                {meal.label}
              </button>
            ))}
          </div>

          <label className="block text-sm font-medium text-slate-700 mb-2">實際食用量 (g/ml)</label>
          <input
            type="number"
            value={form.amountEaten}
            onChange={e => setForm({...form, amountEaten: Number(e.target.value)})}
            className="w-full text-lg px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold text-center text-amber-900"
          />
        </div>
      </div>

      <button 
        onClick={handleAddLog} 
        disabled={!form.name || !form.calories}
        className="w-full py-3.5 bg-blue-600 disabled:opacity-50 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <CheckCircle2 className="w-5 h-5" />
        新增每日食用量
      </button>
    </div>
  );
}
