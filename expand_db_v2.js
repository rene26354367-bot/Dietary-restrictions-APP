const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'core_nutrition_db.json');

// --- 擴充資料包：台灣常見外食與飲品 ---
const expandedFoods = [
  { "name": "麥當勞 大麥克", "brand": "麥當勞", "nutrients": { "calories": 2.5, "protein": 0.12, "fat": 0.11, "carbohydrate": 0.21, "sugar": 0.04, "sodium": 4.5 }, "source": "processed_foods" },
  { "name": "麥當勞 麥脆雞", "brand": "麥當勞", "nutrients": { "calories": 2.8, "protein": 0.15, "fat": 0.18, "carbohydrate": 0.12, "sugar": 0.01, "sodium": 5.2 }, "source": "processed_foods" },
  { "name": "珍珠奶茶(大杯)", "brand": "手搖飲", "nutrients": { "calories": 0.85, "protein": 0.005, "fat": 0.03, "carbohydrate": 0.14, "sugar": 0.08, "sodium": 0.1 }, "source": "processed_foods" },
  { "name": "無糖綠茶", "brand": "通用", "nutrients": { "calories": 0, "protein": 0, "fat": 0, "carbohydrate": 0, "sugar": 0, "sodium": 0.05 }, "source": "processed_foods" },
  { "name": "台鐵排骨便當", "brand": "台鐵", "nutrients": { "calories": 1.6, "protein": 0.08, "fat": 0.06, "carbohydrate": 0.2, "sugar": 0.02, "sodium": 3.8 }, "source": "processed_foods" },
  { "name": "全家 鮪魚飯糰", "brand": "全家", "nutrients": { "calories": 1.8, "protein": 0.05, "fat": 0.03, "carbohydrate": 0.35, "sugar": 0.01, "sodium": 2.5 }, "source": "processed_foods" }
  // ... 此處可放入更多從 GitHub/FDA 獲取的數據
];

try {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    console.log(`目前資料庫筆數: ${db.length}`);

    let addedCount = 0;
    expandedFoods.forEach(food => {
        if (!db.some(f => f.name === food.name && f.brand === food.brand)) {
            db.push({ ...food, unit: "1g", verified: true });
            addedCount++;
        }
    });

    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    console.log(`擴充完成！新增 ${addedCount} 筆資料，總筆數: ${db.length}`);
} catch (e) {
    console.error("擴充失敗:", e.message);
}
