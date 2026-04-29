const xlsx = require('xlsx');
const path = require('path');

const sourceFile = path.join('C:', 'Users', 'user', 'Downloads', '食品營養成分資料庫2024UPDATE2.ods');

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
    if (type.includes('糖') || type.includes('飲料') || type.includes('調味') || type.includes('糕餅') || type.includes('零食')) return '調味與加工';
    
    return '其他';
}

// 1. 先分類所有資料
const allClassified = [];
for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row[2]) continue;
    const cat = categorize(row[1]);
    allClassified.push({
        name: row[2].toString().trim(),
        originalType: row[1] ? row[1].toString().trim() : '無',
        mappedCategory: cat
    });
}

// 2. 按分類分組
const groups = {};
allClassified.forEach(item => {
    if (!groups[item.mappedCategory]) groups[item.mappedCategory] = [];
    groups[item.mappedCategory].push(item);
});

// 3. 執行隨機抽樣
const finalSample = [];
const categories = Object.keys(groups);

// 每個分類至少抽 5 筆
categories.forEach(cat => {
    const pool = groups[cat];
    const countToPick = Math.min(pool.length, 5);
    for (let i = 0; i < countToPick; i++) {
        const randomIndex = Math.floor(Math.random() * pool.length);
        finalSample.push(pool.splice(randomIndex, 1)[0]);
    }
});

// 隨機補足至 100 筆
const remainingPool = [];
categories.forEach(cat => remainingPool.push(...groups[cat]));

while (finalSample.length < 100 && remainingPool.length > 0) {
    const randomIndex = Math.floor(Math.random() * remainingPool.length);
    finalSample.push(remainingPool.splice(randomIndex, 1)[0]);
}

// 打亂順序以便觀察
finalSample.sort(() => Math.random() - 0.5);

console.log(`--- 分類隨機抽樣報告 (總樣本數: ${finalSample.length}) ---`);
console.table(finalSample.map(s => ({ 
    '食材名稱': s.name, 
    '原始分類': s.originalType, 
    '新分類': s.mappedCategory 
})));

// 統計各類數量
const stats = {};
finalSample.forEach(s => {
    stats[s.mappedCategory] = (stats[s.mappedCategory] || 0) + 1;
});
console.log('--- 抽樣統計 ---');
console.table(stats);
