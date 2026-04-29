const fs = require('fs');
const path = require('path');

// 設定路徑
const sourcePath = path.join(__dirname, '食品營養', 'food_db_array.json');
const outputPath = path.join(__dirname, 'core_nutrition_db.json');

try {
    console.log('正在讀取原始資料...');
    const rawData = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

    console.log('正在精簡資料欄位...');
    const coreData = rawData.map(item => ({
        name: item.name,
        alias: item.alias || "",
        calories: item.calories,
        protein: item.protein,
        fat: item.fat,
        carbohydrate: item.carbohydrate,
        sugar: item.sugar || 0,
        sodium: item.sodium || 0,
        unit: "1g"
    }));

    console.log(`處理完成，共 ${coreData.length} 筆資料。`);
    
    fs.writeFileSync(outputPath, JSON.stringify(coreData, null, 2));
    console.log(`核心資料庫已建立：${outputPath}`);

} catch (error) {
    console.error('建立核心資料庫時發生錯誤：', error.message);
}
