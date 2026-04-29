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
- [x] 開始開發流程 (實作 AppEngine, NutritionParser, UI 框架)
- [x] 同步衛福部計算邏輯 (TDEE, BMI, Macros)
- [x] 優化搜尋體驗與 UI 滾動佈局
- [ ] 整合前後端數據 (Next Step: 實作 OCR 與 統計圖表連動)

## 工作流程說明
1. 所有的任務日誌將自動記錄於 `.gemini-agent/memory/` 下對應的角色目錄中。
2. 開發過程中請遵循 Researcher -> Coder -> Reviewer 的協作模式。
3. 成本追蹤記錄於 `.gemini-agent/cost-tracking/`。
4. 除非我明確要求資料內容，請不要讀取 *.json 大型資料庫，只看 schema 或前 10 筆樣本。
