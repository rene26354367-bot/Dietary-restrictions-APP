const NutritionParser = require('./NutritionParser');

const testCases = [
  {
    name: "Case 5: 18.5g 規格雙欄 (精確小數)",
    text: `營  養  標  示
每一份量         18.5 公克
本包裝含         2.0 份
                每份      每 100 公克
熱量           112.4 大卡    607.6 大卡
蛋白質          3.15 公克    17.02 公克
脂肪            7.82 公克    42.27 公克
  飽和脂肪      4.06 公克    21.95 公克
  反式脂肪       0.0 公克      0.0 公克
碳水化合物      7.35 公克    39.73 公克
  糖            1.22 公克     6.59 公克
鈉              182 毫克      984 毫克`
  },
  {
    name: "Case 6: 混亂重複格式",
    text: `熱量           112.4 大卡    607.6 大卡
蛋白質          3.15 公克    17.02 公克
脂肪            7.82 公克    42.27 公克
  飽和脂肪      4.06 公克    21.95 公克
  反式脂肪       0.0 公克      0.0 公克
碳水化合物      7.35 公克    39.73 公克
  糖            1.22 公克     6.59 公克
鈉              182 毫克      984 毫克`
  },
  {
    name: "Case 7: 含微量元素與小於符號",
    text: `營 養 標 示
 每一份量 200 毫升
 本包裝含 5 份
           每份      每日參考值百分比
 熱量      92 大卡          5%
 蛋白質    6.2 公克         10%
 脂肪      3.0 公克          5%
  飽和脂肪 2.0 公克         11%
  反式脂肪 0.0 公克          *
 碳水化合物10.0 公克         3%
  糖       9.5 公克          *
 鈉        80 毫克           4%
 鈣        240 毫克         24%
 鐵        < 0.1 毫克        0%
 *參考值未訂定`
  },
  {
    name: "Case 8: ASCII 表格邊框格式",
    text: `+---------------------------------------+
| Nutrition Facts 營養標示               |
| Serving Size/份量: 50g                 |
| Servings/包裝次數: 2                   |
+-----------------------+---------------+
|                       |  Per Serving  |
|                       |    (每份)     |
+-----------------------+---------------+
| Calories (熱量)       |    245 kcal   |
| Total Fat (脂肪)      |     12.0 g    |
| - Sat Fat (飽和脂肪)   |      5.5 g    |
| - Trans Fat (反式脂肪) |        0 g    |
| Cholesterol (膽固醇)   |      5.0 mg   |
| Sodium (鈉)           |      120 mg   |
| Total Carb (碳水)     |     30.5 g    |
| - Dietary Fiber(纖維)  |      2.0 g    |
| - Sugars (糖)         |     15.0 g    |
| Protein (蛋白質)      |      4.5 g    |
+-----------------------+---------------+`
  }
];

testCases.forEach(tc => {
  console.log(`\n--- Testing: ${tc.name} ---`);
  try {
    const result = NutritionParser.parse(tc.text);
    console.log(JSON.stringify(result, null, 2));
    
    // 簡單檢證
    if (tc.name.includes("18.5g")) {
       console.log("驗證: 100g 熱量應為 607.6 -> ", result.raw.calories === 607.6 ? "PASS" : "FAIL");
    }
  } catch (e) {
    console.error(`Failed to parse ${tc.name}:`, e.message);
  }
});
