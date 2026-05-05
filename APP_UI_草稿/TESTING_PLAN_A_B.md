# 完整測試計畫 (Step 2 驗證 + HTTPS PWA)

## 🚀 當前環境狀態

### ✅ 已啟動
- **後端服務**：http://localhost:3001 (AppEngine.js)
- **前端預覽**：http://localhost:4173 (Vite preview)
- **已安裝**：ngrok（用於 HTTPS 暴露）

### 📱 你的測試設備
- **手機 IP**：10.102.202.91（根據需要調整）
- **同一網路**：電腦和手機在同一 WiFi

---

## 方案對比

| 方案 | 優點 | 缺點 | 時間 |
|------|------|------|------|
| **方案 A**：本地IP測試 | 無需額外設置，立即測試離線 | HTTP，PWA 無法真正安裝 | ⏱️ 5分鐘 |
| **方案 B**：ngrok HTTPS | 真正 HTTPS，PWA 可安裝到主屏幕 | 需要 ngrok 帳號 | ⏱️ 10分鐘 |
| **方案 A+B**：推薦 | 先測離線功能，再測 PWA 安裝 | 需要兩次設置 | ⏱️ 15分鐘 |

---

# 🧪 方案 A：本地網路 IP 測試（立即可做）

## 步驟 1：手機連接測試

**在你的手機上：**
1. 確保手機和電腦在同一 WiFi 網路
2. 打開瀏覽器，輸入：`http://10.102.202.91:4173`
   - 將 `10.102.202.91` 替換為你的電腦 IP（從前面找出來）
3. 應該看到應用載入

## 步驟 2：測試線上模式

**預期看到：**
- ✓ 應用完全加載
- ✓ 顯示個人資料設定頁面（首次使用）
- ✓ 開啟 DevTools Console（F12 → Console）

**在 Console 中查看日誌：**
```
[Storage] 從 IndexedDB 載入資料: {profile: null, dailyLogs: {}, ...}
[Storage] 從 API 取得遠端資料，檢查是否更新...
[Storage] API 不可用（離線或後端故障）
```

## 步驟 3：設定個人資料

1. **填入基本資訊：**
   - 性別、年齡、身高、體重、活動量
   - 點擊「保存」

2. **觀察 Console 日誌：**
   ```
   [IndexedDB] 儲存成功，資料記錄數: {hasProfile: true, ...}
   [Store] 持久化資料到本機儲存...
   ```

3. **新增食物記錄：**
   - 點擊「＋」按鈕
   - 搜尋並添加 3-5 種食物（例如：米飯、雞蛋、蘋果）
   - 確認每次添加都有 IndexedDB 儲存日誌

## 步驟 4：測試離線模式 ⭐ 關鍵

1. **啟用飛航模式：**
   - 安卓：設定 → 網路和互聯網 → 飛航模式 ON
   - 或直接關閉 WiFi

2. **重新載入應用**（F5 或下拉刷新）
   - **預期：應該看到你之前添加的資料** ✓
   - 不應該崩潰或顯示「無法使用」

3. **檢查 Console 日誌：**
   ```
   [App] 應用已離線
   [Storage] 從 IndexedDB 載入資料: {profile: {...}, dailyLogs: {...}, ...}
   ```

4. **驗證功能：**
   - ✓ 查看今日紀錄
   - ✓ 查看身體統計
   - ✓ 修改已添加的食物
   - ✓ 添加新食物（保存在本地）

## 步驟 5：測試線上恢復

1. **關閉飛航模式 / 重新啟用 WiFi**
2. **應用應自動同步：**
   ```
   [App] 應用重新上線
   [Storage] 從 API 取得遠端資料，檢查是否更新...
   ```
3. 離線指示應消失

## ✅ 方案 A 完成標準

通過以下即為成功 ✓：
- [ ] 線上模式正常
- [ ] 個人資料成功保存
- [ ] 食物記錄成功保存
- [ ] 離線模式能看到本地資料
- [ ] 離線模式不崩潰
- [ ] 重新上線後自動同步

---

# 🔐 方案 B：使用 ngrok 啟用 HTTPS PWA（可選增強）

## 為什麼需要 HTTPS？

PWA 真正的「安裝到主屏幕」需要：
- HTTPS 連接（安全協議）
- 有效的 manifest.json
- Service Worker 正確註冊

目前 HTTP 只能創建網頁快捷方式，不是真正的應用。

## 快速設置（5 分鐘）

### 方式 1：使用 ngrok（推薦）

**前置條件：** 需要 ngrok 免費帳號

1. **註冊 ngrok 帳號**
   - 訪問：https://ngrok.com/
   - 用 Google/GitHub 快速註冊

2. **獲取 authtoken**
   - 登錄後進入：https://dashboard.ngrok.com/auth/your-authtoken
   - 複製你的 token（長字符串）

3. **在終端配置 ngrok**
   ```bash
   ngrok config add-authtoken YOUR_TOKEN_HERE
   ```

4. **啟動 ngrok 隧道**
   ```bash
   ngrok http 4173
   ```

5. **複製 HTTPS URL**
   - ngrok 會輸出類似：`https://xxxx-xxxx-xxxx.ngrok-free.app`
   - 複製這個 URL

### 方式 2：不想註冊？跳過此步驟

- 方案 A 已足以測試離線功能
- PWA 安裝可以稍後再做（Step 3 時可用 Capacitor 替代）

## 測試 HTTPS PWA（如果你有 ngrok URL）

1. **在手機打開 HTTPS URL**
   ```
   https://xxxx-xxxx-xxxx.ngrok-free.app
   ```

2. **安裝應用**
   - Chrome：三點菜單 → 「安裝應用」或「添加到主屏幕」
   - 選擇「安裝」
   - 應用會出現在主屏幕 ✓

3. **啟動已安裝的應用**
   - 點擊新應用圖標
   - 應該以全屏模式打開（無地址欄）

4. **重複測試 A 中的離線場景**
   - 啟用飛航模式
   - 應用仍可正常使用 ✓

---

# 📋 完整檢查清單

## 必做（方案 A）
- [ ] 手機能訪問 `http://10.102.202.91:4173`
- [ ] 個人資料設定成功
- [ ] 食物記錄添加成功
- [ ] **離線模式能看到本地資料** ⭐ 最關鍵
- [ ] Console 顯示正確的日誌

## 可選（方案 B）
- [ ] 獲得 ngrok authtoken
- [ ] `ngrok http 4173` 成功啟動
- [ ] 手機訪問 HTTPS URL
- [ ] PWA 可以安裝到主屏幕
- [ ] 離線模式仍工作

---

# 🐛 故障排查

### 問題 1：離線後看不到資料

**檢查步驟：**
1. DevTools → Application → IndexedDB → nutrition-app
2. 點擊 「userdata」 → key 「main」
3. 應該能看到你的所有資料

**如果看不到：**
- 資料未被保存到 IndexedDB
- 檢查 Console 中是否有 `[IndexedDB] 儲存失敗` 錯誤
- 嘗試清除應用資料重新開始

### 問題 2：ngrok 連接失敗

**常見原因：**
- 未配置 authtoken（免費版需要）
- 4173 端口未運行（檢查 `npm run preview`）
- 防火牆阻止

**解決：**
```bash
# 檢查 4173 是否運行
curl http://localhost:4173

# 重新啟動 ngrok
ngrok http 4173
```

### 問題 3：PWA 無法安裝

**檢查：**
- 必須是 HTTPS（ngrok 或部署）
- manifest.json 必須有效（DevTools → Application → Manifest）
- Service Worker 已註冊（DevTools → Application → Service Workers）

---

# 🎯 預期結果

完成後，你應該有：
- ✅ 確認離線功能真的工作
- ✅ 本地資料正確保存在 IndexedDB
- ✅（可選）真正的 HTTPS PWA 應用

**下一步：** Step 3 Capacitor 原生打包（如需要）

---

# 💬 測試反饋模板

請告訴我測試結果：

```
方案 A 結果：
- 線上模式：[成功/失敗]
- 個人資料保存：[成功/失敗]
- 食物記錄保存：[成功/失敗]
- 離線模式看到資料：[成功/失敗] ⭐
- Console 日誌：[正常/異常]

方案 B 結果（如有嘗試）：
- ngrok 啟動：[成功/失敗]
- HTTPS URL：[工作/失敗]
- PWA 安裝：[成功/失敗]

遇到的問題：[描述]
```

