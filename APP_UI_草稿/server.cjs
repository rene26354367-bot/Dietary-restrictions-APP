const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

// 引入核心引擎 (路徑回到上一層)
const AppEngine = require('../AppEngine');

const app = express();
const PORT = 3001;
const engine = new AppEngine();

app.use(cors());
app.use(express.json());

// 1. 取得使用者資料 (適配前端舊有的 store.tsx 格式)
app.get('/api/user-data', (req, res) => {
    // 轉換 dailyLogs 格式
    const uiDailyLogs = {};
    if (engine.dailyLogs) {
        for (const date in engine.dailyLogs) {
            uiDailyLogs[date] = {
                date: date,
                entries: (engine.dailyLogs[date] || []).map(log => ({
                    id: log.logId || log.id,
                    name: log.name,
                    calories: log.nutrients.calories,
                    protein: log.nutrients.protein,
                    carbs: log.nutrients.carbohydrate,
                    fat: log.nutrients.fat,
                    amountEaten: log.weight,
                    timestamp: new Date(log.timestamp).getTime(),
                    mealType: log.mealType
                }))
            };
        }
    }

    // 轉換 bodyLogs 格式 (陣列轉物件)
    const uiBodyLogs = {};
    if (Array.isArray(engine.bodyLogs)) {
        engine.bodyLogs.forEach(log => {
            if (log.date) uiBodyLogs[log.date] = log;
        });
    }

    // 檢查 Profile 是否完整，如果不完整則回傳 null 讓前端跳轉註冊
    const hasProfile = engine.userProfile && engine.userProfile.gender && engine.userProfile.height;

    res.json({
        profile: hasProfile ? engine.userProfile : null,
        dailyLogs: uiDailyLogs,
        bodyLogs: uiBodyLogs,
        customFoods: engine.customFoods || [],
        targets: engine.dailyTarget
    });
});

// 2. 儲存使用者資料
app.post('/api/user-data', (req, res) => {
    const data = req.body;
    if (data.profile) engine.setUserProfile(data.profile);
    
    // 轉換 UI 格式回到後端規格
    if (data.dailyLogs) {
        const backendDailyLogs = {};
        for (const date in data.dailyLogs) {
            const dayData = data.dailyLogs[date];
            
            // 如果是 UI 格式 { date, entries: [] }
            if (dayData && Array.isArray(dayData.entries)) {
                backendDailyLogs[date] = dayData.entries.map(entry => ({
                    logId: entry.id,
                    name: entry.name,
                    weight: entry.amountEaten,
                    mealType: entry.mealType,
                    timestamp: new Date(entry.timestamp).toISOString(),
                    nutrients: {
                        calories: entry.calories,
                        protein: entry.protein,
                        fat: entry.fat,
                        carbohydrate: entry.carbs,
                        sugar: entry.sugar || 0,
                        sodium: entry.sodium || 0
                    }
                }));
            } 
            // 如果已經是後端格式 (陣列)
            else if (Array.isArray(dayData)) {
                backendDailyLogs[date] = dayData;
            }
        }
        engine.dailyLogs = backendDailyLogs;
    }

    if (data.bodyLogs) {
        // UI 是物件，後端是陣列
        if (typeof data.bodyLogs === 'object' && !Array.isArray(data.bodyLogs)) {
            engine.bodyLogs = Object.values(data.bodyLogs);
        } else {
            engine.bodyLogs = data.bodyLogs;
        }
    }

    if (data.customFoods) engine.customFoods = data.customFoods;
    
    engine.saveData();
    res.json({ success: true, targets: engine.dailyTarget });
});

// 3. 搜尋食材 API (極致優化版：支援空搜尋、直接使用資料庫預洗後的欄位)
app.get('/api/search', (req, res) => {
    const query = req.query.q || "";
    
    let results;
    if (query.trim() === "") {
        // 空查詢直接回傳前 50 筆
        results = engine.searchFood("").slice(0, 50);
    } else {
        results = engine.smartSearch(query);
    }

    const uiResults = results.map(r => {
        // 因為資料庫已經由 transform_for_ui.js 預先清洗過了，這裡可以直接使用
        // 1g 基準轉為 100g 基準方便前端顯示
        const multiplier = 100;

        return {
            id: r.id,
            name: r.name,
            fullName: r.fullName || r.name,
            brand: r.brand || "通用",
            calories: r.nutrients.calories * multiplier,
            protein: r.nutrients.protein * multiplier,
            carbs: r.nutrients.carbohydrate * multiplier,
            fat: r.nutrients.fat * multiplier,
            baseGrams: 100,
            servings: r.servings || [{ label: '100g', grams: 100 }],
            source: r.source,
            isFallback: r.isFallback
        };
    });

    res.json(uiResults);
});


app.listen(PORT, () => {
    console.log(`Backend API Server running at http://localhost:${PORT}`);
});
