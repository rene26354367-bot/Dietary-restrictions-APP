const NutritionParser = require('./NutritionParser');

const testCases = [
  {
    name: "Case 12: 非標雙欄 (沖泡前/後) - 驗證欄位鎖定",
    text: `[ 營養標示 ]
每一份量 100 公克
本包裝含 2 份
                  沖泡前        沖泡後(加 200ml 水)
熱量             350.5 大卡     350.5 大卡
蛋白質            12.0 公克      12.2 公克
脂肪              5.6 公克       6.8 公克
  飽和脂肪         2.1 公克       2.5 公克
  反式脂肪         0.0 公克       0.0 公克
碳水化合物        63.0 公克      68.0 公克
  糖              15.0 公克      15.0 公克
鈉               450 毫克       480 毫克`
  },
  {
    name: "Case 14: 嵌入式文字流 (品名/成分夾雜標示)",
    text: `品名：手作黑糖餅乾。成分：麵粉、黑糖、奶油、雞蛋、食鹽、膨脹劑(碳酸氫鈉)。淨重：150g。有效日期：見包裝標示。營養標示：每一份量 30 公克，本包裝含 5 份。每份：熱量 145 kcal、蛋白質 2.1g、脂肪 6.5g(飽和脂肪 3.0g、反式脂肪 0g)、碳水化合物 19.5g(糖 8.2g)、鈉 45mg。原產地：台灣。本產品含有麩質之穀物及奶蛋製品。`
  },
  {
    name: "Case 13: OCR 嚴重誤判 (複驗)",
    text: `營 養 標 示 (每100g)
--------------------
熱量 ....... 42O.5 kca1
蛋白質 ..... 8.2 g
脂肪 ....... 12.O g
- 飽和脂肪 .. 5.I g
- 反式脂盁 .. O g
碳水化合物 .. 7O.5 g
- 糖 ....... 22.8 g
鈉 ......... 11O mg
* 數據僅供參考 | 2O24.O8`
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
