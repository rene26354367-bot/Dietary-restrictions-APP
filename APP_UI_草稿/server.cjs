const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

// 引入核心引擎 (路徑回到上一層)
const AppEngine = require('../AppEngine');
const NutritionParser = require('../NutritionParser');

const app = express();
const PORT = 3001;
const engine = new AppEngine();

app.use(cors());
app.use(express.json({ limit: '10mb' })); // 增加限制以支援圖片上傳

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

    if (data.customFoods) engine.setCustomFoods(data.customFoods);
    
    // engine.saveData() 已包含在 setCustomFoods 中，但如果是 profile 或 logs 變動仍需呼叫
    if (data.profile || data.dailyLogs || data.bodyLogs) {
        engine.saveData();
    }
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

        // 安全檢查：如果 nutrients 遺失，嘗試回退到根路徑或給予預設值
        const n = r.nutrients || {
            calories: (r.calories || 0) / (r.baseGrams || 100),
            protein: (r.protein || 0) / (r.baseGrams || 100),
            carbohydrate: (r.carbs || r.carbohydrate || 0) / (r.baseGrams || 100),
            fat: (r.fat || 0) / (r.baseGrams || 100)
        };

        return {
            id: r.id,
            name: r.name,
            fullName: r.fullName || r.name,
            brand: r.brand || "通用",
            calories: (n.calories || 0) * multiplier,
            protein: (n.protein || 0) * multiplier,
            carbs: (n.carbohydrate || 0) * multiplier,
            fat: (n.fat || 0) * multiplier,
            baseGrams: 100,
            servings: r.servings || [{ label: '100g', grams: 100 }],
            source: r.source,
            isFallback: r.isFallback,
            matchedAlias: r.matchedAlias || null
        };
    });

    res.json(uiResults);
});


// 4. OCR 智慧解析 API (文字版)
app.post('/api/ocr-parse', (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "請提供要解析的文字" });

    try {
        const result = NutritionParser.parse(text);
        
        // 統一基準為 100g
        const uiBase = 100;
        const formatValue = (val) => (val === null || val === undefined) ? '' : (val * uiBase).toFixed(1);

        const uiData = {
            name: "解析輸入食品",
            baseAmount: uiBase, // 永遠回傳 100
            calories: formatValue(result.per1g.calories),
            protein: formatValue(result.per1g.protein),
            carbs: formatValue(result.per1g.carbohydrate),
            fat: formatValue(result.per1g.fat),
            sugar: formatValue(result.per1g.sugar),
            sodium: formatValue(result.per1g.sodium),
            parsedFrom: result.metadata.targetColumn === 'per100' ? '每 100g' : '每份',
            metadata: result.metadata,
            warnings: result.metadata.warnings || [],
            missingFields: result.metadata.missingFields || []
        };
        
        res.json(uiData);
    } catch (e) {
        console.error("OCR 解析失敗:", e);
        res.status(500).json({ error: "解析失敗，請手動輸入" });
    }
});

// 5. OCR 圖片掃描 API (串接 Google Cloud Vision)
app.post('/api/ocr-scan', async (req, res) => {
    const { image } = req.body; // Base64 string
    const apiKey = process.env.VITE_GOOGLE_CLOUD_VISION_KEY || process.env.GOOGLE_CLOUD_VISION_KEY;

    console.log(`[OCR] 收到掃描請求, API Key 已設定: ${!!apiKey}`);

    if (!image) return res.status(400).json({ error: "未接收到圖片數據" });
    if (!apiKey) {
        console.error("[OCR] 錯誤: 未設定 API Key");
        return res.status(500).json({ error: "伺服器未設定 Google Cloud Vision API Key" });
    }

    try {
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        
        console.log("[OCR] 正在傳送請求至 Google Cloud Vision...");
        const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
            method: 'POST',
            body: JSON.stringify({
                requests: [{
                    image: { content: base64Data },
                    features: [{ type: 'TEXT_DETECTION' }]
                }]
            })
        });

        const data = await response.json();

        const apiError = data.error || data.responses?.[0]?.error;
        if (!response.ok || apiError) {
            console.error("[OCR] Google API 傳回錯誤:", JSON.stringify(apiError || data, null, 2));
            return res.status(500).json({ error: `Google API 錯誤: ${(apiError && apiError.message) || response.statusText}` });
        }

        const fullText = data.responses[0]?.fullTextAnnotation?.text;

        if (!fullText) {
            console.warn("[OCR] 辨識完成，但未偵測到文字");
            return res.status(404).json({ error: "圖片中未辨識到任何文字" });
        }

        console.log("[OCR] 辨識成功，正在解析內容...");
        // 使用我們強大的解析器處理辨識出來的文字
        const result = NutritionParser.parse(fullText);
        
        // 統一基準為 100g，不論標籤原始基準為何
        const uiBase = 100;
        const formatValue = (val) => (val === null || val === undefined) ? '' : (val * uiBase).toFixed(1);

        const responseData = {
            name: "掃描標籤食品",
            baseAmount: uiBase, // 永遠顯示 100
            calories: formatValue(result.per1g.calories),
            protein: formatValue(result.per1g.protein),
            carbs: formatValue(result.per1g.carbohydrate),
            fat: formatValue(result.per1g.fat),
            sugar: formatValue(result.per1g.sugar),
            sodium: formatValue(result.per1g.sodium),
            rawText: fullText,
            metadata: result.metadata,
            warnings: result.metadata.warnings || [],
            missingFields: result.metadata.missingFields || []
        };
        
        console.log("[OCR] 解析完成:", responseData.calories, "kcal");
        res.json(responseData);

    } catch (e) {
        console.error("[OCR] 發生例外狀況:", e);
        res.status(500).json({ error: `伺服器例外: ${e.message}` });
    }
});



app.listen(PORT, () => {
    console.log(`Backend API Server running at http://localhost:${PORT}`);
});

