const xlsx = require('xlsx');
const path = require('path');

const sourceFile = path.join('C:', 'Users', 'user', 'Downloads', '食品營養成分資料庫2024UPDATE2.ods');

const workbook = xlsx.readFile(sourceFile);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

// 分類映射邏輯
function categorize(originalType) {
    if (!originalType) return '其他';
    
    const type = originalType.toString().trim();
    
    if (type.includes('穀') || type.includes('澱粉')) return '全穀雜糧';
    if (type.includes('肉') || type.includes('蛋') || type.includes('魚') || type.includes('豆') && !type.includes('豆菜')) return '豆魚蛋肉';
    if (type.includes('蔬菜') || type.includes('藻') || type.includes('菇')) return '蔬菜類';
    if (type.includes('水果')) return '水果類';
    if (type.includes('乳')) return '乳品類';
    if (type.includes('油脂') || type.includes('堅果') || type.includes('種子')) return '油脂與堅果';
    if (type.includes('糖') || type.includes('飲料') || type.includes('調味')) return '調味與加工';
    
    return '其他';
}

// 試分類前 20 筆
console.log('--- 食材分類測試報告 ---');
const sampleData = [];

for (let i = 2; i < 22; i++) {
    const row = rows[i];
    if (!row[2]) continue;

    const originalType = row[1]; // 原始分類在 Index 1
    const name = row[2];
    const category = categorize(originalType);
    
    sampleData.push({
        name: name,
        originalType: originalType,
        mappedCategory: category
    });
}

console.table(sampleData);
