const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '食品營養成分資料庫2024UPDATE2.xlsx');
const outputDir = __dirname;

const workbook = xlsx.readFile(sourceFile);
const sheet = workbook.Sheets[workbook.SheetNames[0]];

// 使用 header: 1 取得二維陣列，避免欄位名稱亂碼問題
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

// 跳過前兩列標題與說明，從第三列(index 2)開始是資料
// 根據 2024 更新版實測：
// Index 2: 樣品名稱
// Index 7: 修正熱量(kcal)
// Index 9: 粗蛋白(g)
// Index 10: 粗脂肪(g)
// Index 13: 總碳水化合物(g)
// Index 14: 膳食纖維(g)
// Index 17: 糖質(g)
// Index 22: 鈉(mg)

const foodArray = [];
const foodMap = {};

function parseNum(val) {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'string') {
        const cleaned = val.toLowerCase().trim();
        if (cleaned === 'trace' || cleaned === '-' || cleaned === '') return 0;
        // 處理可能包含括號的情況，例如 "10(2)"，只取數字部分
        const match = cleaned.match(/^([0-9.]+)/);
        return match ? parseFloat(match[1]) : 0;
    }
    return typeof val === 'number' ? val : 0;
}

// 偵測正確的索引
for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row[2]) continue; // 沒有名稱就跳過

    let name = row[2].toString().trim();
    const aliasRaw = row[3] ? row[3].toString().trim() : "";
    
    // 清理俗名，例如將 "俗名:高麗菜" 轉換為 "高麗菜"
    let alias = "";
    if (aliasRaw) {
        alias = aliasRaw.replace(/俗名:/g, '').replace(/;/g, '、');
        name = `${name} (${alias})`;
    }
    
    // 轉換為 1g 基準 (原始資料是每 100g)
    const entry = {
        name: name,
        alias: alias,
        calories: parseNum(row[7]) / 100,
        protein: parseNum(row[9]) / 100,
        fat: parseNum(row[10]) / 100,
        carbohydrate: parseNum(row[13]) / 100,
        fiber: parseNum(row[14]) / 100,
        sugar: parseNum(row[17]) / 100,
        sodium: parseNum(row[22]) / 100,
        unit: "1g"
    };

    foodArray.push(entry);
    foodMap[name] = entry;
}

console.log(`處理完成！共處理 ${foodArray.length} 筆食物資料。`);

fs.writeFileSync(path.join(outputDir, 'food_db_array.json'), JSON.stringify(foodArray, null, 2));
fs.writeFileSync(path.join(outputDir, 'food_db_map.json'), JSON.stringify(foodMap, null, 2));

console.log('檔案已儲存至:', outputDir);
