# 飲食營養 APP 專案 - Multi-Agent 任務管理

本專案已完成基礎結構整理，並初始化多代理 (Multi-Agent) 環境。

## 專案結構
- `calculator.js`: 核心計算邏輯 (BMI/TDEE/營養素)。
- `nutrition_standards.json`: 官方營養標準 (DRIs)。
- `食品營養/`: 食品資料庫與轉換腳本。
  - `convert_db.js`: Excel 轉 JSON 腳本。
  - `已分類食材資料/`: 包含分類邏輯的進階資料處理。
- `.gemini-agent/`: 代理記憶與日誌。

## 任務狀態
- [x] 初始化專案結構與多代理環境
- [x] 整理專案目錄與規範化命名
- [x] 建立核心營養標示資料庫 (calories, protein, fat, carbohydrate, sugar, sodium)
- [x] 定義核心功能需求 (Smart Search, OCR Parser, 2.0 Schema)
- [x] 開始開發流程 (實作 AppEngine, NutritionParser v3.2, UI 框架)
- [x] 同步衛福部計算邏輯 (TDEE, BMI, Macros)
- [x] 優化搜尋體驗與 UI 滾動佈局
- [x] 實作高健壯性 OCR 解析器 (v5.3 支援三層匹配與邏輯校驗)
- [x] 整合前後端數據 (完成 UI Sanity Check 反饋)
- [x] 統計圖表連動 (v4.0 完成)
- [x] 最終系統整合測試與效能優化 (High-Signal Pipeline 實作完成)
- [ ] 歷史紀錄管理 (實作刪除、編輯與日期回溯) - 進行中
- [ ] 智慧營養建議系統 (根據趨勢產出 AI 建議) - 進行中

## 長遠待辦清單 (Future Roadmap)
- [ ] **PWA 支援**: 實作 Service Worker 支援離線查詢與主畫面安裝。
- [ ] **全流程自動化測試**: 建立 Cypress/Playwright E2E 測試覆蓋核心流程。
- [ ] **多裝置同步**: 支援透過雲端備份使用者數據。

## 技術架構規範 (OCR 2.0)
1. **影像鏈 (Pipeline)**: 採用動態解析度 (1800/2400px) 與 `createImageBitmap` 背景解碼。
2. **解析邏輯**: 實作「精確/容錯/特徵」三層關鍵字錨定，拒絕自動腦補，改用 `sanityCheck` 標籤化。
3. **校驗機制**: 引入營養學熱量守恆 (±20% 容差) 與總重量約束 (P+F+C ≤ 1.1)。

## 工作流程說明
1. 所有的任務日誌將自動記錄於 `.gemini-agent/memory/` 下對應的角色目錄中。
2. 開發過程中請遵循 Researcher -> Coder -> Reviewer 的協作模式。
3. 成本追蹤記錄於 `.gemini-agent/cost-tracking/`。
4. 除非我明確要求資料內容，請不要讀取 *.json 大型資料庫，只看 schema 或前 10 筆樣本。
