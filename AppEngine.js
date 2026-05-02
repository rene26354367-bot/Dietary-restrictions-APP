const UserTargetCalculator = require('./calculator.js');
const { searchFood } = require('./db_manager.js');
const StorageManager = require('./storage_manager.js');
const fs = require('fs');
const path = require('path');

/**
 * 飲食營養 APP 核心引擎 (產品規格版)
 * 支援：多層級搜尋、Fallback 建議、標準化 Schema、OCR 解析介面
 */
class AppEngine {
  constructor() {
    const savedData = StorageManager.load();
    this.userProfile = savedData.profile || { gender: 'male' };
    
    // 載入俗名別名表 (俗名 → 官方名，方向正確)
    try {
      const aliasPath = path.join(__dirname, 'aliases.json');
      if (fs.existsSync(aliasPath)) {
        this.aliasMap = JSON.parse(fs.readFileSync(aliasPath, 'utf8'));
      } else {
        this.aliasMap = {};
      }
    } catch (e) {
      console.error("無法載入別名對照表:", e);
      this.aliasMap = {};
    }

    // 保留舊的 namingMap 載入（向下相容）
    try {
      const namingPath = path.join(__dirname, 'manual_naming.json');
      this.namingMap = fs.existsSync(namingPath)
        ? JSON.parse(fs.readFileSync(namingPath, 'utf8'))
        : {};
    } catch (e) {
      this.namingMap = {};
    }
    
    // 執行資料遷移：確保舊格式的 Log 轉為 2.0 規格
    this.dailyLogs = this._migrateLogs(savedData.dailyLogs || {});
    this.bodyLogs = savedData.bodyLogs || [];
    this.customFoods = this._migrateCustomFoods(savedData.customFoods || []);
    this.barcodeCache = savedData.barcodeCache || {};
    
    this.dailyTarget = (this.userProfile && this.userProfile.height) 
      ? UserTargetCalculator.calculate(this.userProfile) 
      : null;

    this.MEAL_TYPES = ['早餐', '午餐', '晚餐', '點心', '訓練前/後'];
    this.SOURCES = {
      OFFICIAL: 'official_fda',
      C_STORE: 'convenience_store',
      USER: 'user_custom',
      OFF: 'open_food_facts'
    };
  }

  /**
   * 將不同格式的飲食紀錄遷移至標準格式
   * 支援：
   * 1. 舊版扁平陣列 (v1)
   * 2. UI 格式 { date, entries: [] }
   * 3. 標準 2.0 格式 [ { nutrients: { ... } } ]
   */
  _migrateLogs(logs) {
    const migrated = {};
    for (const date in logs) {
      let entries = [];
      
      // 情況 A: 直接是陣列 (可能是舊版或標準版)
      if (Array.isArray(logs[date])) {
        entries = logs[date];
      } 
      // 情況 B: UI 格式 { date, entries: [] }
      else if (logs[date] && Array.isArray(logs[date].entries)) {
        entries = logs[date].entries;
      }

      migrated[date] = entries.map(log => {
        // 如果已經是 2.0 規格 (有 nutrients 物件)，則進行欄位校正但保留結構
        if (log.nutrients) {
          return {
            ...log,
            // 確保 UI 欄位與後端欄位同步
            nutrients: {
              calories: log.nutrients.calories || log.calories || 0,
              protein: log.nutrients.protein || log.protein || 0,
              fat: log.nutrients.fat || log.fat || 0,
              carbohydrate: log.nutrients.carbohydrate || log.nutrients.carbs || log.carbs || 0,
              sugar: log.nutrients.sugar || log.sugar || 0,
              sodium: log.nutrients.sodium || log.sodium || 0
            }
          };
        }
        
        // 如果是舊版扁平規格，轉換為 2.0 規格
        return {
          ...log,
          nutrients: {
            calories: log.calories || 0,
            protein: log.protein || 0,
            fat: log.fat || 0,
            carbohydrate: log.carbohydrate || log.carbs || 0,
            sugar: log.sugar || 0,
            sodium: log.sodium || 0
          }
        };
      });
    }
    return migrated;
  }

  _migrateCustomFoods(foods) {
    if (!Array.isArray(foods)) return [];
    return foods.map(f => {
      // 如果已經有 nutrients 且看起來是 per 1g (例如熱量不應該是幾百)，則跳過
      // 但為了保險起見，我們統一以 baseGrams 進行歸一化
      const base = f.baseGrams || 100;
      
      // 如果已經是 2.0 規格且有 nutrients，我們確保它是 per 1g
      if (f.nutrients) {
        // 啟發式檢查：如果 nutrients.calories > 20，很可能是 per 100g 而非 per 1g (除非是極高熱量食物)
        // 但最準確的做法是看當初存入時是否已經歸一化。
        // 這裡我們假設如果從 UI 存入，nutrients 會是 null。
        return f;
      }

      return {
        ...f,
        nutrients: {
          calories: (f.calories || 0) / base,
          protein: (f.protein || 0) / base,
          fat: (f.fat || 0) / base,
          carbohydrate: (f.carbohydrate || f.carbs || 0) / base,
          sugar: (f.sugar || 0) / base,
          sodium: (f.sodium || 0) / base
        }
      };
    });
  }

  setCustomFoods(foods) {
    this.customFoods = this._migrateCustomFoods(foods);
    this.saveData();
  }

  // --- 強化搜尋引擎 ---
  
  smartSearch(query) {
    if (!query) return [];
    if (this.barcodeCache[query]) return [this.barcodeCache[query]];

    let results = this.searchFood(query);
    
    if (results.length === 0 && query.length > 2) {
      const fallbackKeyword = this._getFallbackKeyword(query);
      if (fallbackKeyword) {
        results = this.searchFood(fallbackKeyword);
        results = results.map(r => ({ ...r, isFallback: true }));
      }
    }
    return results;
  }

  searchFood(keyword) {
    if (keyword.trim().length === 0) {
      return this.customFoods.slice(0, 20).map(f => ({ ...f, source: this.SOURCES.USER }));
    }

    const kw = keyword.trim();
    let searchTerms = [kw];
    const matchedAliasMap = {}; // { officialTerm: "使用者輸入的俗名" }

    // Layer 2：別名查詢（俗名 → 官方名，方向正確）
    if (this.aliasMap) {
      // 精確匹配：「小黃瓜」→「胡瓜」
      if (this.aliasMap[kw]) {
        const official = this.aliasMap[kw];
        if (!searchTerms.includes(official)) {
          searchTerms.push(official);
          matchedAliasMap[official] = kw;
        }
      }
      // 部分匹配：輸入「黃瓜」→ 找到「小黃瓜」→ 再拿「胡瓜」搜
      Object.keys(this.aliasMap).forEach(alias => {
        if (alias !== kw && alias.includes(kw)) {
          const official = this.aliasMap[alias];
          if (!searchTerms.includes(official)) {
            searchTerms.push(official);
            // 部分匹配時顯示完整別名（如「黃瓜」→ 顯示「小黃瓜」）
            if (!matchedAliasMap[official]) matchedAliasMap[official] = alias;
          }
        }
      });
    }

    searchTerms = [...new Set(searchTerms)];

    // 分開收集：alias 展開的結果 vs 直接關鍵字匹配的結果
    // alias 結果優先顯示，讓使用者輸入俗名能直接看到官方食材
    let directResults = [];
    let aliasResults = [];
    searchTerms.forEach(term => {
      const officialResults = searchFood(term).map(f => {
        const base = {
          brand: "通用",
          source: this.SOURCES.OFFICIAL,
          verified: true,
          ...f,
        };
        // 若此搜尋詞是透過別名展開的，則所有結果都標記 matchedAlias
        if (matchedAliasMap[term]) {
          base.matchedAlias = matchedAliasMap[term];
        }
        return base;
      });
      if (matchedAliasMap[term]) {
        aliasResults = [...aliasResults, ...officialResults];
      } else {
        directResults = [...directResults, ...officialResults];
      }
    });

    const customResults = this.customFoods
      .filter(f => f.name.includes(kw))
      .map(f => ({ ...f, source: this.SOURCES.USER, verified: false }));

    // 排序：自訂食物 > alias官方食材 > 直接名稱匹配
    return [...customResults, ...aliasResults, ...directResults];
  }

  _getFallbackKeyword(query) {
    const commonBrands = ['全家', '7-11', '義美', '統一', '光泉'];
    let fallback = query;
    commonBrands.forEach(brand => { fallback = fallback.replace(brand, ''); });
    return fallback.length >= 2 ? fallback : null;
  }

  addFoodLog({ dateStr, foodObj, weight, mealType = '點心' }) {
    if (!this.dailyLogs[dateStr]) this.dailyLogs[dateStr] = [];
    const nutrients = foodObj.nutrients;
    const logEntry = {
      id: foodObj.id,
      logId: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: foodObj.name,
      brand: foodObj.brand || "通用",
      weight: weight,
      mealType: mealType,
      source: foodObj.source,
      nutrients: {
        calories: parseFloat((nutrients.calories * weight).toFixed(2)),
        protein: parseFloat((nutrients.protein * weight).toFixed(2)),
        fat: parseFloat((nutrients.fat * weight).toFixed(2)),
        carbohydrate: parseFloat((nutrients.carbohydrate * weight).toFixed(2)),
        sugar: parseFloat((nutrients.sugar * weight).toFixed(2)),
        sodium: parseFloat((nutrients.sodium * weight).toFixed(2))
      },
      timestamp: new Date().toISOString()
    };
    this.dailyLogs[dateStr].push(logEntry);
    this.saveData();
    return logEntry;
  }

  setUserProfile(profile) {
    this.userProfile = profile;
    this.dailyTarget = UserTargetCalculator.calculate(profile);
    this.saveData();
    return this.dailyTarget;
  }

  addBodyLog({ dateStr, height, weight, bodyFat = null }) {
    const bmi = (height && weight) ? parseFloat((weight / ((height / 100) ** 2)).toFixed(2)) : null;
    const leanBodyMass = (weight && bodyFat) ? parseFloat((weight * (1 - bodyFat / 100)).toFixed(2)) : null;
    const entry = { date: dateStr, height, weight, bodyFat, bmi, leanBodyMass, timestamp: new Date().toISOString() };
    const idx = this.bodyLogs.findIndex(l => l.date === dateStr);
    if (idx > -1) this.bodyLogs[idx] = entry; else this.bodyLogs.push(entry);
    this.userProfile.height = height;
    this.userProfile.weight = weight;
    if (bodyFat) this.userProfile.bodyFat = bodyFat;
    this.dailyTarget = UserTargetCalculator.calculate(this.userProfile);
    this.saveData();
    return entry;
  }

  getDailyTotal(dateStr) {
    const logs = this.dailyLogs[dateStr] || [];
    return logs.reduce((acc, log) => {
      Object.keys(log.nutrients).forEach(key => acc[key] = (acc[key] || 0) + log.nutrients[key]);
      return acc;
    }, { calories: 0, protein: 0, fat: 0, carbohydrate: 0, sugar: 0, sodium: 0 });
  }

  getAdvice(dateStr) {
    const total = this.getDailyTotal(dateStr);
    const targets = this.dailyTarget;
    if (!targets) return [];

    const advice = [];
    const calDiff = targets.summary.targetCalories - total.calories;

    // 1. 熱量分析
    if (total.calories === 0) {
      advice.push({ type: 'info', text: '今天還沒有紀錄喔，開始記錄你的第一餐吧！' });
    } else if (calDiff > 500) {
      advice.push({ type: 'warning', text: `熱量缺口達 ${Math.round(calDiff)} kcal，建議適量補充避免基礎代謝下降。` });
    } else if (calDiff < -200) {
      advice.push({ type: 'danger', text: '今日攝取已超過目標，建議增加運動量或調整下一餐份量。' });
    } else {
      advice.push({ type: 'success', text: '熱量控制得非常完美，請繼續保持！' });
    }

    // 2. 蛋白質分析
    const proteinTarget = targets.macros.protein.g;
    const proteinGap = proteinTarget - total.protein;
    if (total.calories > 0 && total.protein < proteinTarget * 0.7) {
      advice.push({ type: 'warning', text: `蛋白質缺口較大 (${Math.round(proteinGap)}g)，建議晚餐補充雞胸肉、雞蛋或豆漿。` });
    }

    // 3. 鈉含量警告
    if (total.sodium > 2300) {
      advice.push({ type: 'danger', text: '今日鈉攝取量過高，請多喝水幫助代謝，並減少加工食品攝取。' });
    }

    // 4. 週趨勢提示 (簡化版)
    const dates = Object.keys(this.dailyLogs).sort().reverse().slice(0, 7);
    if (dates.length >= 3) {
      const avgCals = dates.reduce((acc, d) => acc + this.getDailyTotal(d).calories, 0) / dates.length;
      if (avgCals > targets.summary.targetCalories * 1.1) {
        advice.push({ type: 'info', text: '近三日攝取持續偏高，建議檢視飲食清單中的加工食品比例。' });
      }
    }

    return advice;
  }

  saveData() {
    StorageManager.save({
      profile: this.userProfile,
      dailyLogs: this.dailyLogs,
      bodyLogs: this.bodyLogs,
      customFoods: this.customFoods,
      barcodeCache: this.barcodeCache
    });
  }
}

module.exports = AppEngine;
