# 離線功能測試指南 (Step 2)

## 概述
此版本實現了完整的離線-優先架構：
- **線上模式**：使用 API 作為資料源，本機 IndexedDB 作為快取
- **離線模式**：完全使用 IndexedDB，所有功能保持可用
- **背景同步**：當重新上線時，自動同步本機變更到 API

---

## 改進項目

### 1. **修復資料持久化流程**
- ✅ 修正 `applyData()` 函式，確保所有狀態值都被正確更新（包括空物件/陣列）
- ✅ 初始載入完成後，立即保存到 IndexedDB（即使用戶未做任何改動）
- ✅ API 背景同步返回新資料時，自動保存到 IndexedDB

### 2. **增加調試日誌**
所有日誌都輸出到瀏覽器控制台（DevTools Console），方便追蹤資料流：

```
[Storage] 從 IndexedDB 載入資料: {...}
[Storage] 從 API 取得遠端資料，檢查是否更新...
[Storage] 遠端資料較新，更新 IndexedDB 並通知 UI
[IndexedDB] 儲存成功，資料記錄數: {...}
[Store] 持久化資料到本機儲存...
[App] 應用已離線
[App] 應用重新上線
```

### 3. **改進離線 UI**
- ✅ 線上時：app 正常運作
- ✅ 離線且有本機資料：顯示本機資料 + 離線指示
- ✅ 離線且無本機資料：顯示離線提示，允許用戶設定個人資料

---

## 測試步驟

### 前置條件
1. 電腦上執行後端服務：`node AppEngine.js` (port 3001)
2. 電腦上執行前端預覽：`npm run preview` (port 4173)
3. 手機連接同一 WiFi 網路
4. 手機 IP：例如 `10.102.202.91`

### 測試場景 A：新用戶 + 線上

1. **手機瀏覽器打開**：`http://10.102.202.91:4173`
2. **等待初始載入完成**
   - 打開 DevTools（Chrome：F12）→ Console 標籤
   - 應該看到類似的日誌：
     ```
     [Storage] 從 IndexedDB 載入資料: {profile: null, dailyLogs: {}, ...}
     [Storage] 從 API 取得遠端資料，檢查是否更新...
     [Storage] API 不可用（離線或後端故障）: fetch failed
     ```
3. **設定個人資料**
   - 填入身體資訊（年齡、身高、體重、性別、活動量）
   - 點擊「保存」
4. **觀察日誌**
   ```
   [IndexedDB] 儲存成功，資料記錄數: {dailyLogsCount: 0, hasProfile: true, ...}
   [Store] 持久化資料到本機儲存...
   ```
5. **新增食物**
   - 點擊 「＋」 按鈕
   - 搜尋並添加一些食物（例如：米飯、雞蛋）
   - 確認日誌中有 IndexedDB 儲存記錄
6. **關閉應用**（完全退出瀏覽器或清空快取）

### 測試場景 B：離線模式

1. **啟用飛航模式**
   - 安卓：設定 → 網路 → 飛航模式
   - 或直接關閉 WiFi
2. **重新打開應用**：`http://10.102.202.91:4173`
3. **驗證離線指示**
   - 應該在頂部看到黃色的「離線模式 - 使用本機資料」提示
4. **驗證資料完整性**
   - 應該看到之前添加的食物和個人資料
   - 日誌應該顯示：
     ```
     [Storage] 從 IndexedDB 載入資料: {profile: {...}, dailyLogs: {...}, ...}
     [Storage] API 不可用（離線或後端故障）: fetch failed
     [App] 應用已離線
     ```
5. **測試離線功能**
   - 查看今日紀錄 ✓
   - 查看身體統計 ✓
   - 查看營養統計 ✓
   - 修改已添加的食物 ✓
   - 添加新食物 ✓（本地保存，待上線後同步）
6. **新增離線數據**
   - 添加更多食物記錄
   - 修改現有記錄
   - 檢查本地是否成功保存（日誌應有儲存記錄）

### 測試場景 C：離線 → 線上

1. **在離線狀態下添加數據**（參考場景 B 第 6 步）
2. **關閉飛航模式 / 重新啟用 WiFi**
3. **觀察應用反應**
   - 離線指示應消失
   - 應該看到日誌：
     ```
     [App] 應用重新上線
     [Storage] 從 API 取得遠端資料，檢查是否更新...
     [Storage] 遠端資料較新，更新 IndexedDB 並通知 UI
     [Store] 後台 API 同步，更新資料: {...}
     ```
4. **驗證數據同步**
   - 檢查離線期間添加的數據是否保留
   - 如果有多用戶場景，應看到來自 API 的最新數據

---

## 常見問題排查

### Q1：應用還是顯示「無法使用」（無法使用）

**檢查清單：**
1. 開啟 DevTools Console，查看是否有錯誤訊息
2. 檢查 `[IndexedDB]` 日誌 - 看是否成功保存
3. 檢查 `[Storage]` 日誌 - 看是否從 IndexedDB 讀取到資料
4. 嘗試手動清除應用資料並重新設定（見下方）

**可能原因：**
- IndexedDB 被禁用（檢查隱私設定）
- 資料從未保存到 IndexedDB（API 連線失敗）
- 瀏覽器快取問題

**解決方法：**
```javascript
// 在 Console 執行，清除 IndexedDB
indexedDB.deleteDatabase('nutrition-app')
// 然後重新載入頁面
```

### Q2：離線後無法看到之前的數據

**可能原因：**
1. 初次設定後，用戶未等待背景 API 同步完成就離線了
2. IndexedDB 儲存失敗（檢查日誌中 `[IndexedDB] 儲存失敗` 錯誤）

**解決方法：**
1. 確保在離線前，應用已完全載入並穩定 10 秒以上
2. 檢查瀏覽器隱私設定是否限制 IndexedDB

### Q3：無法添加新食物或修改記錄

**檢查清單：**
- 離線模式下應該仍可添加記錄（儲存在本機）
- 檢查 DevTools Console 是否有 JavaScript 錯誤
- 嘗試刷新頁面

---

## 調試技巧

### 查看完整的 IndexedDB 資料

在瀏覽器 DevTools 中：
1. 開啟 Application 標籤（Chrome / Edge）或 Storage 標籤（Firefox）
2. 左側選單 → IndexedDB → nutrition-app → userdata
3. 點擊 key 「main」查看完整的 AllUserData 物件

### 查看網路請求

在瀏覽器 DevTools 中：
1. 開啟 Network 標籤
2. 刷新頁面
3. 篩選 `api/` 開頭的請求
4. 檢查請求是否成功 (200) 或失敗 (failed/timeout)

### 啟用詳細日誌

在應用初始化時，可看到完整的載入順序：
```
[Storage] 從 IndexedDB 載入資料
[Storage] 從 API 取得遠端資料
[IndexedDB] 儲存成功
[Store] 持久化資料到本機儲存
```

---

## 期望行為總結

| 場景 | 預期結果 |
|------|---------|
| 線上 + 新用戶 | 顯示個人資料設定頁面 |
| 線上 + 有本機資料 | 顯示主應用，本機資料可見，背景同步 API |
| 離線 + 有本機資料 | 顯示主應用 + 離線指示，所有功能可用 |
| 離線 + 無本機資料 | 顯示個人資料設定頁面 + 離線警告 |
| 離線 → 線上 | 自動同步數據，離線指示消失 |

---

## 提交更改

此版本已準備好提交，包含以下改進：
- ✅ 修復 IndexedDB 持久化邏輯
- ✅ 增加詳細調試日誌
- ✅ 改進離線 UI 提示
- ✅ 支援線上/離線自動偵測

使用以下命令提交：
```bash
git add -A
git commit -m "fix: improve offline-first functionality with better data persistence and debugging logs

- Fix applyData() to properly update all state values
- Add comprehensive logging to storage adapter and IndexedDB
- Add offline detection and UI indicators
- Ensure IndexedDB is populated even without user changes
- Improve error handling for offline scenarios"
```
