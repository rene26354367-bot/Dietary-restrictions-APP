const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

// 引入核心引擎 (路徑回到上一層)
const AppEngine = require('../AppEngine');
const NutritionParser = require('../NutritionParser');

const app = express();
const PORT = process.env.PORT || process.env.WEB_PORT || 3001;

// ── 多用戶 JSON 儲存 ──────────────────────────────────────────────────────────
// DATA_DIR：Railway Volume 掛載路徑（生產）或專案根目錄（本地開發）
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..');

// 確保目錄存在（Railway Volume 首次掛載時可能尚未建立）
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
console.log('[Server] DATA_DIR:', DATA_DIR);

/** 安全化 uid：只允許英數字、底線、連字號，最多 30 字 */
function getSafeUid(req) {
  const uid = req.query.uid || req.headers['x-user-id'] || req.body?.uid || 'default';
  return String(uid).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30) || 'default';
}

function getUserDataPath(uid) {
  return path.join(DATA_DIR, `user_data_${uid}.json`);
}

function loadUserData(uid) {
  const file = getUserDataPath(uid);
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`[UserData] 讀取失敗 uid=${uid}:`, e.message);
    return null;
  }
}

/** Atomic write：先寫 .tmp 再 rename，避免 crash 時產生損壞的 JSON */
function saveUserData(uid, data) {
  const file = getUserDataPath(uid);
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
  console.log(`[UserData] 已儲存 uid=${uid}`);
}
// ─────────────────────────────────────────────────────────────────────────────

const engine = new AppEngine();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' })); // 增加限制以支援圖片上傳

// 1. 取得使用者資料（per-uid，直接回傳 UI 格式 JSON）
app.get('/api/user-data', (req, res) => {
    const uid = getSafeUid(req);
    const data = loadUserData(uid);
    if (!data) {
        return res.json({ profile: null, dailyLogs: {}, bodyLogs: {}, customFoods: [], customTargets: null });
    }
    res.json(data);
});

// 2. 儲存使用者資料（per-uid，直接儲存 UI 格式 JSON）
app.post('/api/user-data', (req, res) => {
    const uid = getSafeUid(req);
    // 移除 uid 欄位後儲存（uid 是路由用途，不需存入資料）
    const { uid: _uid, ...dataToStore } = req.body;
    try {
        saveUserData(uid, dataToStore);
        res.json({ success: true });
    } catch (e) {
        console.error('[UserData] 儲存失敗:', e);
        res.status(500).json({ error: '儲存失敗' });
    }
});

// 3. 搜尋食材 API
app.get('/api/search', (req, res) => {
    const q = req.query.q;
    if (!q) return res.json([]);

    console.log(`[Search] 正在搜尋: ${q}`);
    const results = engine.smartSearch(q);
    
    // 轉換為前端 UI 預期的格式
    const uiResults = results.map(r => ({
        id: r.id,
        name: r.name,
        brand: r.brand || "通用",
        calories: r.nutrients ? (r.nutrients.calories * 100).toFixed(1) : (r.calories || 0).toFixed(1),
        protein: r.nutrients ? (r.nutrients.protein * 100).toFixed(1) : (r.protein || 0).toFixed(1),
        carbs: r.nutrients ? (r.nutrients.carbohydrate * 100).toFixed(1) : (r.carbs || 0).toFixed(1),
        fat: r.nutrients ? (r.nutrients.fat * 100).toFixed(1) : (r.fat || 0).toFixed(1),
        sugar: r.nutrients ? (r.nutrients.sugar * 100).toFixed(1) : (r.sugar || 0).toFixed(1),
        sodium: r.nutrients ? (r.nutrients.sodium * 100).toFixed(1) : (r.sodium || 0).toFixed(1),
        source: r.source,
        verified: r.verified,
        matchedAlias: r.matchedAlias,
        isFallback: r.isFallback
    }));

    res.json(uiResults);
});

// 4. 智慧建議 API
app.get('/api/advice', (req, res) => {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const advice = engine.getAdvice(date);
    res.json(advice);
});

// 5. OCR 智慧解析 API (文字版)
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
    console.log(`[Server] Backend API running on port ${PORT}`);
});

