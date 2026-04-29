const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'core_nutrition_db.json');

// --- 擴充資料：台灣超商健身食品包 (範例數據，可持續擴充) ---
const convenienceStoreFoods = [
  {
    "name": "紐奧良風味雞胸肉",
    "brand": "7-11",
    "nutrients": {
      "calories": 1.15,
      "protein": 0.22,
      "fat": 0.02,
      "carbohydrate": 0.01,
      "sugar": 0.005,
      "sodium": 5.5
    },
    "source": "convenience_store",
    "verified": true
  },
  {
    "name": "大成雞胸肉(原味)",
    "brand": "全家",
    "nutrients": {
      "calories": 1.05,
      "protein": 0.23,
      "fat": 0.01,
      "carbohydrate": 0.01,
      "sugar": 0,
      "sodium": 4.8
    },
    "source": "convenience_store",
    "verified": true
  },
  {
    "name": "義式香草雞胸肉",
    "brand": "7-11",
    "nutrients": {
      "calories": 1.10,
      "protein": 0.22,
      "fat": 0.02,
      "carbohydrate": 0.01,
      "sugar": 0,
      "sodium": 5.2
    },
    "source": "convenience_store",
    "verified": true
  },
  {
    "name": "低脂高纖豆漿",
    "brand": "統一",
    "nutrients": {
      "calories": 0.35,
      "protein": 0.034,
      "fat": 0.012,
      "carbohydrate": 0.028,
      "sugar": 0.01,
      "sodium": 0.15
    },
    "source": "convenience_store",
    "verified": true
  }
];

try {
    console.log('正在讀取現有資料庫...');
    const oldData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

    console.log('正在執行規格升級 (Version 2.0)...');
    const upgradedData = oldData.map(item => {
        // 如果已經是新格式則跳過
        if (item.nutrients) return item;

        return {
            name: item.name,
            brand: "通用",
            nutrients: {
                calories: item.calories,
                protein: item.protein,
                fat: item.fat,
                carbohydrate: item.carbohydrate,
                sugar: item.sugar || 0,
                sodium: item.sodium || 0
            },
            source: "official_fda",
            verified: true,
            unit: "1g"
        };
    });

    console.log('正在匯入超商健身食品擴充包...');
    // 合併資料，並避免重複
    const finalData = [...upgradedData];
    convenienceStoreFoods.forEach(food => {
        if (!finalData.some(f => f.name === food.name && f.brand === food.brand)) {
            finalData.push({
                ...food,
                unit: "1g"
            });
        }
    });

    fs.writeFileSync(dbPath, JSON.stringify(finalData, null, 2));
    console.log(`\n升級完成！`);
    console.log(`- 原始資料筆數: ${oldData.length}`);
    console.log(`- 升級後總筆數: ${finalData.length}`);
    console.log(`- 資料庫已遷移至 2.0 規格 (支援品牌、來源標籤)`);

} catch (error) {
    console.error('匯入失敗:', error.message);
}
