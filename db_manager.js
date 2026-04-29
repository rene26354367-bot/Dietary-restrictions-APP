const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'core_nutrition_db.json');
let db = [];

try {
    db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
} catch (e) {
    console.error("無法載入資料庫，請先執行 generate_core_db.js 或 import_expanded_db.js");
}

/**
 * 搜尋食材
 */
function searchFood(keyword) {
    if (keyword === undefined || keyword === null) return [];
    if (keyword === "") return db; // 空字串回傳所有資料
    return db.filter(item => item.name.includes(keyword));
}

/**
 * 顯示營養標示 (適配 2.0 格式)
 */
function displayLabel(food, amount = 100) {
    const ratio = amount;
    const n = food.nutrients;
    console.log(`\n=== 營養標示: ${food.brand ? '['+food.brand+'] ' : ''}${food.name} (${amount}g) ===`);
    console.log(`來源:       ${food.source || '未知'}`);
    console.log(`熱量:       ${(n.calories * ratio).toFixed(1)} kcal`);
    console.log(`蛋白質:     ${(n.protein * ratio).toFixed(1)} g`);
    console.log(`脂肪:       ${(n.fat * ratio).toFixed(1)} g`);
    console.log(`碳水化合物: ${(n.carbohydrate * ratio).toFixed(1)} g`);
    console.log(`  - 糖:     ${(n.sugar * ratio).toFixed(1)} g`);
    console.log(`鈉:         ${(n.sodium * ratio).toFixed(1)} mg`);
    console.log(`----------------------------------\n`);
}

// 命令列交互
const args = process.argv.slice(2);
const command = args[0];
const param = args[1];
const weight = args[2] ? parseFloat(args[2]) : 100;

if (command === 'search') {
    const results = searchFood(param);
    if (results.length === 0) {
        console.log(`找不到包含 "${param}" 的食材。`);
    } else {
        console.log(`找到 ${results.length} 筆結果:`);
        results.slice(0, 10).forEach((r, i) => {
            console.log(`${i + 1}. [${r.brand || '通用'}] ${r.name}`);
        });
    }
} else if (command === 'info') {
    const results = searchFood(param);
    if (results.length > 0) {
        displayLabel(results[0], weight);
    }
} else {
    console.log("用法: node db_manager.js search [關鍵字] | info [全名]");
}

module.exports = { searchFood, displayLabel };
