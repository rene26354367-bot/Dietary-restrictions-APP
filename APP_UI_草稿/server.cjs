const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

// 引入核心引擎 (路徑回到上一層)
const AppEngine = require('../AppEngine');
const NutritionParser = require('../NutritionParser');
const { searchFood } = require('../db_manager');

const app = express();
// 取得有效的 port 數字，過濾掉未解析的 ${WEB_PORT} 等字串
function resolvePort() {
  const candidates = [process.env.PORT, process.env.WEB_PORT, '8080'];
  for (const c of candidates) {
    if (!c) continue;
    const n = parseInt(c, 10);
    if (!isNaN(n) && n > 0 && n < 65536) return n;
  }
  return 8080;
}
const PORT = resolvePort();

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

// 0. Health check（Zeabur 用來確認服務存活）
app.get('/', (req, res) => {
    res.json({ status: 'ok' });
});

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

// 從 fullName 提取差異化標籤（用來區分名字相同的食材）
// 範例 fullName："馬鈴薯(2022年取樣) (樣品狀態:生,黃皮種、 前處理描述:去皮,混合均勻打碎)"
function extractTags(fullName, name) {
    if (!fullName || fullName === name) return [];
    const tags = [];
    const seen = new Set();
    const add = (t) => {
        const tag = String(t || '').trim();
        if (!tag || seen.has(tag)) return;
        // 過濾無資訊量的通用詞
        if (['混合均勻打碎', '混合均勻', '混合均勻磨碎', '打碎', '磨碎'].includes(tag)) return;
        seen.add(tag);
        tags.push(tag);
    };

    // 1. 從名稱緊接的括號提取（例如 馬鈴薯(2022年取樣) → 2022年取樣）
    const nameStripped = fullName.replace(/\s*\(樣品狀態[\s\S]*$/, '').replace(/\s*\(前處理描述[\s\S]*$/, '');
    const nameParen = nameStripped.match(/[(（]([^()（）]+)[)）]/);
    if (nameParen && nameParen[1] && !/[:：]/.test(nameParen[1])) {
        add(nameParen[1]);
    }

    // 2. 樣品狀態（如：生、熟、冷凍、紅皮種、黃皮種）
    const sampleMatch = fullName.match(/樣品狀態[:：]([^、)）]+)/);
    if (sampleMatch) {
        sampleMatch[1].split(/[,，]/).forEach(add);
    }

    // 3. 前處理描述（如：去皮、帶皮、去籽、去殼）— 只取簡短關鍵字
    const preMatch = fullName.match(/前處理描述[:：]([^、)）]+)/);
    if (preMatch) {
        preMatch[1].split(/[,，]/).forEach(t => {
            const tag = t.trim();
            // 只保留 4 個字以內的短語（去皮、帶皮、去籽等）
            if (tag.length > 0 && tag.length <= 4) add(tag);
        });
    }

    // 最多回傳 3 個最關鍵的標籤
    return tags.slice(0, 3);
}

// ── 食材分類（v1.2 分類瀏覽） ─────────────────────────────────────────────────
// 依優先順序匹配；前者命中即不繼續往下找
// 設計原則：
//   1. 只看 name 不看 fullName（fullName 描述可能含不相關詞）
//   2. 加工食品最優先（冷凍魚捲不該歸海鮮）
//   3. 蔬菜在海鮮前面（蚵仔白菜歸蔬菜）
//   4. 結尾規則用於常見後綴（如「肉」、「米」、「魚」）
const CATEGORIES = [
    { id: 'processed', icon: '🥫', label: '加工食品',
      keywords: ['冷凍', '罐頭', '即食', '麵腸', '魚捲', '魚丸', '貢丸', '香腸', '火腿', '培根', '臘肉', '泡麵', '速食', '熱狗', '肉鬆', '肉乾', '蜜餞', '果乾'] },
    { id: 'beverage',  icon: '🧃', label: '飲料湯品',
      keywords: ['果汁', '蔬果汁', '蔗汁', '啤酒', '可樂', '汽水', '豆漿', '米漿', '烏龍茶', '紅茶', '綠茶', '奶茶', '普洱', '鐵觀音', '咖啡', '可可飲', '碳酸飲', '運動飲', '雞精', '湯品', '滴雞精', '雞湯', '魚湯', '排骨湯', '高湯', '味噌湯', '濃湯'],
      endsWith: ['汁', '茶', '咖啡', '酒'] },
    { id: 'egg',       icon: '🥚', label: '蛋類',
      keywords: ['蛋白', '蛋液', '蛋粉', '皮蛋', '鹹蛋', '茶葉蛋', '滷蛋'],
      endsWith: ['蛋'] },
    { id: 'dairy',     icon: '🥛', label: '乳製品',
      keywords: ['鮮乳', '牛乳', '羊乳', '奶粉', '起司', '乳酪', '優格', '優酪乳', '酸乳', '煉乳', '鮮奶油', '冰淇淋', '奶昔', '低脂奶', '全脂奶', '脫脂奶'] },
    { id: 'vegetable', icon: '🥬', label: '蔬菜',
      keywords: ['白菜', '高麗菜', '花椰菜', '青菜', '菠菜', '芹菜', '韭菜', '蘿蔔', '茄子', '番茄', '蕃茄', '黃瓜', '苦瓜', '絲瓜', '南瓜', '冬瓜', '櫛瓜', '萵苣', '青椒', '甜椒', '馬鈴薯', '地瓜', '番薯', '甘藷', '芋頭', '山藥', '蓮藕', '茭白', '秋葵', '青花菜', '蘆筍', '蔥', '蒜', '薑', '香菜', '九層塔', '生菜', '蕪菁', '荷蘭豆', '甜豆', '豆芽', '豆苗', '木瓜', '油菜', '空心菜', '地瓜葉', '莧菜', '油麥菜', '小白菜', '大白菜', '結球白菜', '甘藍', '青江菜', '皇宮菜', '川七', '茼蒿', '芥菜', '芥藍', '羽衣甘藍', '雪裡紅', '酸菜', '蘿蔓', '紫高麗', '球萵苣', '美生菜', '玉米筍', '冬筍', '春筍', '麻竹筍', '綠竹筍', '蘆薈', '節瓜', '佛手瓜', '蛇瓜', '葫蘆', '檳榔心芋', '荸薺', '菱角', '豆薯', '淮山'],
      endsWith: ['菜', '筍', '菇'] },
    { id: 'fruit',     icon: '🍎', label: '水果',
      keywords: ['蘋果', '香蕉', '葡萄', '柳橙', '柳丁', '橘子', '芒果', '鳳梨', '西瓜', '草莓', '藍莓', '酪梨', '荔枝', '龍眼', '芭樂', '蓮霧', '釋迦', '檸檬', '葡萄柚', '哈密瓜', '甜瓜', '蛋黃果', '桃子', '水蜜桃', '李子', '梅子', '櫻桃', '棗', '柿', '火龍果', '紅龍果', '奇異果', '百香果', '楊桃', '桑椹', '桑葚', '無花果', '榴槤', '山竹', '紅毛丹', '番石榴', '柚', '橙', '梨子', '甘蔗', '安石榴', '北蕉'],
      endsWith: ['蕉'] },
    { id: 'meat',      icon: '🥩', label: '肉類',
      keywords: ['排骨', '里肌', '絞肉', '雞胸', '雞翅', '雞腿肉', '牛腩', '牛排', '雞胗', '雞肝', '鴨胸', '豬腳', '豬肝', '豬血', '豬皮', '牛筋', '雞肫', '梅花肉', '五花肉', '肩胛肉', '頰肉'],
      endsWith: ['肉', '排', '胗', '肝', '腿', '翅'] },
    { id: 'seafood',   icon: '🐟', label: '海鮮',
      keywords: ['蝦', '蟹', '貝', '蛤', '蚵仔', '牡蠣', '烏賊', '章魚', '海帶', '紫菜', '海苔', '鮭', '鮪', '鯖', '鱈', '鰻', '鯛', '鮸', '鯧', '鱸', '小卷', '透抽', '干貝', '九孔', '鮑魚', '海參', '生蠔', '魷魚'],
      endsWith: ['魚'] },
    { id: 'grain',     icon: '🌾', label: '穀物',
      keywords: ['麵粉', '麵條', '麵線', '麵包', '吐司', '饅頭', '燕麥', '薏仁', '小麥', '黑麥', '蕎麥', '玉米', '大麥', '高粱', '高梁', '藜麥', '台灣藜', '小米', '糯小米', '米粉', '稻', '秈米', '稉米', '糯米', '糙米', '白米', '越光米', '胚芽米', '米胚芽', '糯稻', '紅米', '黑米', '長米', '加鈣米', '高纖米', '五穀米'],
      endsWith: ['米', '飯'] },
    { id: 'bean',      icon: '🌰', label: '豆類堅果',
      keywords: ['黃豆', '黑豆', '綠豆', '紅豆', '豌豆', '蠶豆', '鷹嘴豆', '毛豆', '豆腐', '豆乾', '豆皮', '納豆', '花豆', '皇帝豆', '米豆', '雲豆', '腰豆', '扁豆', '冬粉', '花生', '杏仁', '核桃', '腰果', '榛果', '夏威夷豆', '開心果', '松子', '栗子', '甘扁桃', '亞麻仁', '芡實', '蓮子', '南瓜籽', '葵花籽', '葵瓜子', '奇亞子', '銀杏'] },
    { id: 'seasoning', icon: '🍶', label: '調味油料',
      keywords: ['醬油', '沙拉油', '麻油', '橄欖油', '玉米油', '葵花油', '葡萄籽油', '茶油', '椰子油', '食用油', '芥花油', '苦茶油', '豬油', '雞油', '大豆油', '芝麻油', '醋', '辣椒醬', '胡椒', '咖哩', '味噌', '高湯粉', '雞粉', '蠔油', '蝦醬', '番茄醬', '美乃滋', '沙茶', '辣油', '蒜泥', '芝麻', '花生粉', '香料粉', '五香粉', '果糖', '砂糖', '冰糖', '蜂蜜', '糖漿'] },
    { id: 'other',     icon: '🍱', label: '其他', keywords: [], endsWith: [] }
];

function categorize(name) {
    const text = name || '';
    for (const cat of CATEGORIES) {
        if (cat.id === 'other') continue;
        if (cat.keywords && cat.keywords.some(kw => text.includes(kw))) return cat.id;
        if (cat.endsWith && cat.endsWith.some(suf => text.endsWith(suf))) return cat.id;
    }
    return 'other';
}

// 預計算所有食材的分類（啟動時跑一次）
const ALL_FOODS = searchFood(''); // 空字串 → 回傳全資料庫
const FOODS_BY_CATEGORY = {};
CATEGORIES.forEach(cat => { FOODS_BY_CATEGORY[cat.id] = []; });
ALL_FOODS.forEach(f => {
    const catId = categorize(f.name);
    FOODS_BY_CATEGORY[catId].push(f);
});
const CATEGORY_COUNTS = CATEGORIES.map(c => ({
    id: c.id,
    icon: c.icon,
    label: c.label,
    count: FOODS_BY_CATEGORY[c.id].length
}));
console.log('[Categorize] 分類完成:', CATEGORY_COUNTS.map(c => `${c.label}=${c.count}`).join(', '));

// 將 DB 原始記錄轉成前端 UI 格式（與 /api/search 一致）
function toUiFood(r) {
    return {
        id: r.id,
        name: r.name,
        brand: r.brand || '通用',
        calories: r.nutrients ? (r.nutrients.calories * 100).toFixed(1) : (r.calories || 0).toFixed(1),
        protein:  r.nutrients ? (r.nutrients.protein  * 100).toFixed(1) : (r.protein  || 0).toFixed(1),
        carbs:    r.nutrients ? (r.nutrients.carbohydrate * 100).toFixed(1) : (r.carbs || 0).toFixed(1),
        fat:      r.nutrients ? (r.nutrients.fat * 100).toFixed(1) : (r.fat || 0).toFixed(1),
        sugar:    r.nutrients ? (r.nutrients.sugar * 100).toFixed(1) : (r.sugar || 0).toFixed(1),
        sodium:   r.nutrients ? (r.nutrients.sodium * 100).toFixed(1) : (r.sodium || 0).toFixed(1),
        source: r.source,
        verified: r.verified,
        tags: extractTags(r.fullName, r.name)
    };
}

// 取得分類清單與每類筆數
app.get('/api/categories', (req, res) => {
    res.json(CATEGORY_COUNTS);
});

// 瀏覽某分類食材（支援分頁）
app.get('/api/browse', (req, res) => {
    const category = String(req.query.category || '').replace(/[^a-z]/g, '');
    const limit  = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    const list = FOODS_BY_CATEGORY[category];
    if (!list) return res.status(400).json({ error: 'Unknown category' });

    const page = list.slice(offset, offset + limit).map(toUiFood);
    res.json({
        category,
        total: list.length,
        offset,
        limit,
        items: page
    });
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
        isFallback: r.isFallback,
        tags: extractTags(r.fullName, r.name)
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

