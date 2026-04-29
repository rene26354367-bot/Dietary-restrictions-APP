const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '..', '食品營養成分資料庫2024UPDATE2.xlsx');
const outputDir = __dirname;

const workbook = xlsx.readFile(sourceFile);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

function categorize(originalType) {
    if (!originalType) return '其他';
    const type = originalType.toString().trim();
    
    if (type.includes('穀') || type.includes('澱粉')) return '全穀雜糧';
    if (type.includes('肉') || type.includes('蛋') || type.includes('魚') || (type.includes('豆') && !type.includes('豆菜'))) return '豆魚蛋肉';
    if (type.includes('蔬菜') || type.includes('藻') || type.includes('菇')) return '蔬菜類';
    if (type.includes('水果')) return '水果類';
    if (type.includes('乳')) return '乳品類';
    if (type.includes('油脂') || type.includes('堅果') || type.includes('種子')) return '油脂與堅果';
    if (type.includes('糖') || type.includes('飲料') || type.includes('調味') || type.includes('糕餅') || type.includes('零食') || type.includes('加工')) return '調味與加工';
    
    return '其他';
}

function parseNum(val) {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'string') {
        const cleaned = val.toLowerCase().trim();
        if (cleaned === 'trace' || cleaned === '-' || cleaned === '') return 0;
        return parseFloat(cleaned) || 0;
    }
    return typeof val === 'number' ? val : 0;
}

const foodArray = [];
const foodMap = {};
const categoryGroups = {};

for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row[2]) continue;

    const name = row[2].toString().trim();
    const originalType = row[1] ? row[1].toString().trim() : '';
    const category = categorize(originalType);
    
    const entry = {
        name: name,
        category: category,
        originalType: originalType,
        calories: parseNum(row[6]) / 100,
        protein: parseNum(row[8]) / 100,
        fat: parseNum(row[9]) / 100,
        carbohydrate: parseNum(row[13]) / 100,
        fiber: parseNum(row[14]) / 100,
        sugar: parseNum(row[17]) / 100,
        sodium: parseNum(row[22]) / 100,
        unit: "1g"
    };

    foodArray.push(entry);
    foodMap[name] = entry;

    if (!categoryGroups[category]) categoryGroups[category] = [];
    categoryGroups[category].push(entry);
}

console.log(`處理完成！總計 ${foodArray.length} 筆資料。`);

// 儲存檔案
fs.writeFileSync(path.join(outputDir, 'food_db_array.json'), JSON.stringify(foodArray, null, 2));
fs.writeFileSync(path.join(outputDir, 'food_db_map.json'), JSON.stringify(foodMap, null, 2));
fs.writeFileSync(path.join(outputDir, 'categories.json'), JSON.stringify(categoryGroups, null, 2));

console.log('--- 分類統計 ---');
Object.keys(categoryGroups).forEach(cat => {
    console.log(`${cat}: ${categoryGroups[cat].length} 筆`);
});

console.log('\n所有資料已更新並儲存至:', outputDir);
