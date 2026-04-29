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
    
    // 載入俗名對照表 (確保一定有值)
    try {
      const namingPath = path.join(__dirname, 'manual_naming.json');
      if (fs.existsSync(namingPath)) {
        this.namingMap = JSON.parse(fs.readFileSync(namingPath, 'utf8'));
      } else {
        this.namingMap = {};
      }
    } catch (e) {
      console.error("無法載入俗名對照表:", e);
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
      if (f.nutrients) return f;
      return {
        ...f,
        nutrients: {
          calories: f.calories || 0,
          protein: f.protein || 0,
          fat: f.fat || 0,
          carbohydrate: f.carbohydrate || f.carbs || 0,
          sugar: f.sugar || 0,
          sodium: f.sodium || 0
        }
      };
    });
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
    let searchTerms = [keyword];
    
    // 俗名對應搜尋 (反向映射) - 只有在有輸入時才執行
    if (this.namingMap && keyword.trim().length > 0) {
      Object.keys(this.namingMap).forEach(academicName => {
        const commonName = this.namingMap[academicName];
        if (commonName.includes(keyword) || keyword.includes(commonName)) {
          searchTerms.push(academicName);
        }
      });
    }

    // 如果關鍵字為空，給予預設關鍵字或直接回傳空陣列 (由 server 處理初始清單)
    if (keyword.trim().length === 0) {
      return this.customFoods.slice(0, 20).map(f => ({ ...f, source: this.SOURCES.USER }));
    }

    searchTerms = [...new Set(searchTerms)];

    let allResults = [];
    searchTerms.forEach(term => {
      const officialResults = searchFood(term).map(f => ({
        brand: "通用",
        source: this.SOURCES.OFFICIAL,
        verified: true,
        ...f // 優先使用資料庫中已有的欄位 (如品牌、來源)
      }));
      allResults = [...allResults, ...officialResults];
    });
    
    const customResults = this.customFoods
      .filter(f => f.name.includes(keyword))
      .map(f => ({ ...f, source: this.SOURCES.USER, verified: false }));

    return [...customResults, ...allResults];
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
