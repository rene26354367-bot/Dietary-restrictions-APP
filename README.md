# 🥗 飲食營養追蹤 APP

> 一款支援 PWA 離線安裝的個人飲食營養記錄應用，可部署於雲端供多人測試使用。

**🌐 線上 Demo：** https://dietary-restrictions-app.vercel.app/

---

## ✨ 功能特色

| 功能 | 說明 |
|------|------|
| 📊 每日營養追蹤 | 記錄熱量、蛋白質、碳水、脂肪、糖、鈉 |
| 🔍 食材智慧搜尋 | 搜尋 7,000+ 筆台灣 / FDA 認證食品資料庫 |
| 📷 OCR 營養標示掃描 | 拍照上傳包裝，自動辨識並解析營養成分 |
| 🤖 AI 營養建議 | 串接 Gemini AI，根據當日飲食提供個人化建議 |
| 📱 PWA 離線安裝 | iPhone / Android 可加入主畫面，離線也能查看記錄 |
| 👥 多用戶資料隔離 | 每位使用者自動分配獨立 UID，資料完全分離 |
| 📈 體重 & 體組成記錄 | 追蹤體重趨勢、BMI、體脂率 |
| 🎯 個人化目標設定 | 依身高、體重、年齡、目標自動計算每日營養需求 |

---

## 🛠 技術架構

### 前端
- **React 19** + **TypeScript**
- **Vite 6** + **Tailwind CSS 4**
- **vite-plugin-pwa** — Service Worker + 離線快取
- **IndexedDB (idb)** — 本地資料持久化
- **Recharts** — 營養趨勢圖表
- **Framer Motion** — UI 動畫效果

### 後端
- **Node.js** + **Express**
- **Google Cloud Vision API** — OCR 圖片文字辨識
- **Gemini API** — AI 飲食建議
- 自研 **NutritionParser** — 解析各式包裝營養標示格式

### 部署
| 角色 | 平台 | URL |
|------|------|-----|
| 前端 | Vercel | https://dietary-restrictions-app.vercel.app |
| 後端 API | Zeabur | https://dietary-restrictions-app.zeabur.app |

---

## 🚀 快速開始（本地開發）

### 環境需求
- Node.js 18+
- npm 9+

### 安裝步驟

```bash
# 1. Clone repo
git clone https://github.com/你的帳號/你的repo名稱.git
cd 你的repo名稱

# 2. 安裝根目錄依賴（後端）
npm install

# 3. 安裝前端依賴
cd APP_UI_草稿
npm install
```

### 設定環境變數

複製範例檔並填入 API Key：

```bash
cp APP_UI_草稿/.env.example APP_UI_草稿/.env
```

編輯 `.env`：

```env
# 後端
GEMINI_API_KEY=你的_Gemini_API_Key
GOOGLE_CLOUD_VISION_KEY=你的_Vision_API_Key
PORT=3001

# 前端（本地開發留空，自動偵測 localhost）
VITE_API_BASE=
```

### 啟動開發伺服器

```bash
# 終端機 1：啟動後端
node APP_UI_草稿/server.cjs

# 終端機 2：啟動前端
cd APP_UI_草稿
npm run dev
```

打開瀏覽器：http://localhost:3000

---

## 📱 PWA 安裝教學（iPhone）

1. 用 **Safari** 打開 https://dietary-restrictions-app.vercel.app/
2. 點擊下方 **分享按鈕**（方形加箭頭圖示）
3. 選擇「**加入主畫面**」
4. 點擊「新增」→ APP 圖示出現於桌面
5. 之後直接從桌面開啟，擁有全螢幕 + 離線體驗

---

## 👥 多人測試說明

每台設備開啟 APP 時會自動分配一個隨機 UID（儲存於 localStorage），資料完全獨立。

**跨設備共用同一份資料（選用）：**

在 URL 後面加上 `?uid=你的名字`，例如：

```
https://dietary-restrictions-app.vercel.app/?uid=alice
```

同一個 UID 在任何設備都能存取相同資料。

---

## 📁 專案結構

```
.
├── AppEngine.js              # 核心引擎（搜尋、建議邏輯）
├── NutritionParser.js        # 營養標示解析器
├── core_nutrition_db.json    # 食品營養資料庫（7,000+ 筆）
├── Dockerfile                # Docker 容器設定
├── APP_UI_草稿/
│   ├── server.cjs            # Express 後端（API 伺服器）
│   ├── zbpack.json           # Zeabur 部署設定
│   ├── vite.config.ts        # Vite + PWA 設定
│   └── src/
│       ├── App.tsx           # 主應用程式
│       ├── components/
│       │   ├── AddFood.tsx       # 新增食物 / 搜尋
│       │   ├── DailySummary.tsx  # 每日總結
│       │   ├── NutritionStats.tsx # 營養統計圖表
│       │   ├── BodyStats.tsx     # 體重記錄
│       │   └── ProfileSetup.tsx  # 個人資料設定
│       └── lib/
│           ├── storage/          # IndexedDB + API 層
│           ├── calculator.ts     # 營養目標計算
│           └── store.tsx         # 全域狀態管理
└── .env.example              # 環境變數範例
```

---

## 🔑 API 端點

| 端點 | 方法 | 說明 |
|------|------|------|
| `/` | GET | 健康檢查 |
| `/api/user-data?uid=xxx` | GET | 取得使用者資料 |
| `/api/user-data` | POST | 儲存使用者資料 |
| `/api/search?q=雞蛋&uid=xxx` | GET | 搜尋食材 |
| `/api/advice?date=2025-01-01` | GET | 取得 AI 飲食建議 |
| `/api/ocr-parse` | POST | 解析文字版營養標示 |
| `/api/ocr-scan` | POST | OCR 圖片掃描 |

---

## 🌐 雲端部署

### 後端（Zeabur）

環境變數設定：
```
DATA_DIR=/data
GEMINI_API_KEY=你的Key
GOOGLE_CLOUD_VISION_KEY=你的Key
```

掛載 Volume 到 `/data` 目錄以持久化用戶資料。

### 前端（Vercel）

環境變數設定：
```
VITE_API_BASE=https://你的後端.zeabur.app
```

Root Directory 設為 `APP_UI_草稿`，Build Command: `npm run build`。

---

## 📄 License

MIT
