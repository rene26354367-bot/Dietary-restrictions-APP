const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, 'core_nutrition_db.json');

function generateId(prefix, index) {
    // 使用 md5 產生短 hash 確保 ID 的唯一性與一致性
    const hash = crypto.createHash('md5').update(`${prefix}_${index}`).digest('hex').substring(0, 8);
    return `${prefix}_${hash}`;
}

try {
    console.log('正在讀取資料庫進行統一化遷移...');
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

    const unifiedData = data.map((item, index) => {
        // 判定來源前綴
        let prefix = 'gen';
        if (item.source === 'official_fda') prefix = 'fda';
        else if (item.source === 'convenience_store') prefix = 'cst';
        else if (item.source === 'processed_foods') prefix = 'pro';

        // 結構化營養素
        const nutrients = item.nutrients || {
            calories: item.calories || 0,
            protein: item.protein || 0,
            fat: item.fat || 0,
            carbohydrate: item.carbohydrate || item.carbs || 0, // 容錯處理
            sugar: item.sugar || 0,
            sodium: item.sodium || 0
        };

        return {
            id: item.id || generateId(prefix, index),
            name: item.name,
            alias: item.alias || "",
            brand: item.brand || "通用",
            barcode: item.barcode || null,
            nutrients: {
                calories: parseFloat(nutrients.calories.toFixed(6)),
                protein: parseFloat(nutrients.protein.toFixed(6)),
                fat: parseFloat(nutrients.fat.toFixed(6)),
                carbohydrate: parseFloat(nutrients.carbohydrate.toFixed(6)),
                sugar: parseFloat(nutrients.sugar.toFixed(6)),
                sodium: parseFloat(nutrients.sodium.toFixed(6))
            },
            source: item.source || "official_fda",
            verified: item.verified !== undefined ? item.verified : true,
            unit: "1g"
        };
    });

    fs.writeFileSync(dbPath, JSON.stringify(unifiedData, null, 2));
    console.log(`\n遷移成功！`);
    console.log(`- 總計處理: ${unifiedData.length} 筆`);
    console.log(`- 已補齊所有項目的 ID、Barcode、Brand 與 Verified 標籤`);
    console.log(`- 營養素結構已統一為 nested object 模式`);

} catch (error) {
    console.error('遷移過程中發生錯誤:', error.message);
}
