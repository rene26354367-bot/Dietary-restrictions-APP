const NutritionParser = require('./NutritionParser');

const testCases = [
  {
    name: "標準直式",
    text: `每一份量          20 公克
本包裝含          15 份
                每份      每 100 公克
熱量           98.5 大卡     492.5 大卡
蛋白質          1.2 公克       6.0 公克
脂肪            4.8 公克      24.0 公克
  飽和脂肪      2.5 公克      12.5 公克
  反式脂肪        0 公克         0 公克
碳水化合物     12.6 公克      63.0 公克
  糖            3.8 公克      19.0 公克
鈉               52 毫克       260 毫克`
  },
  {
    name: "橫向連續字串",
    text: "每一份量 250 毫升，本包裝含 1 份。每份：熱量 115 大卡、蛋白質 3.5 公克、脂肪 2.8 公克 (飽和脂肪 1.6 公克、反式脂肪 0 公克)、碳水化合物 18.9 公克 (糖 15.2 公克)、鈉 85 毫克。"
  },
  {
    name: "含每日參考值百分比",
    text: `營 養 標 示
每一份量 30 公克
本包裝含 8 份
          每份     每日參考值百分比
熱量     156 大卡          8%
蛋白質   2.5 公克          4%
脂肪     8.2 公克         14%
 飽和脂肪3.1 公克         17%
 反式脂肪  0 公克          *
碳水化合物18.1 公克        6%
 糖      4.5 公克          *
鈉       110 毫克          6%
*參考值未訂定`
  },
  {
    name: "中英文對照與分隔線",
    text: `Nutrition Information 營養標示
Serving Size/每一份量 330 ml(毫升)
Servings Per Package/本包裝含 1 份
---------------------------------
              Per Serving  Per 100ml
              (每份)       (每100毫升)
Calories/熱量   142 kcal     43 kcal
Protein/蛋白質    0 g          0 g
Fat/脂肪          0 g          0 g
 - Saturated Fat  0 g          0 g
 - Trans Fat      0 g          0 g
Carbohydrates   35.6 g       10.8 g
 - Sugars/糖     35.0 g       10.6 g
Sodium/鈉         33 mg        10 mg`
  }
];

testCases.forEach(tc => {
  console.log(`\n--- Testing: ${tc.name} ---`);
  try {
    const result = NutritionParser.parse(tc.text);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`Failed to parse ${tc.name}:`, e.message);
  }
});
