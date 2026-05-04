const NutritionParser = require('./NutritionParser');

// 真實 Google Vision OCR 輸出 (來源: 2016-06-08 at 10-09-46.jpg)
// 格式：「每份」與「每100公克」相鄰兩行 (stacked headers)
// 期望：取 per100 欄位，per1g.calories ≈ 2.446
const stackedHeaderText = `品名:起司香雞塊(重組)
內容量:90g(6入)
營養標示
每一份量90公克
本包裝含1份
每份
每100公克
熱量
220.1 大卡
244.6大卡
蛋白質
10.8公克
12.0公克
脂肪
14.2公克
15.8公克
飽和脂肪
5.2公克
5.8公克
反式脂肪
0公克
0公克
碳水化合物
12.2公克
13.6公克
糖
0.5公克
0.6公克
鈉:
585毫克
650毫克`;

// 單欄「每100g」 (對照組)
const single100Text = `營養標示 每100g
熱量 250 大卡
蛋白質 10 公克
脂肪 12 公克
碳水化合物 25 公克
糖 5 公克
鈉 300 毫克`;

// 單欄「每份 50g」 (要走 baseWeight=50 換算)
const singlePerServingText = `營養標示
每一份量 50 公克
熱量 100 大卡
蛋白質 5 公克
脂肪 3 公克
碳水化合物 15 公克
糖 2 公克
鈉 100 毫克`;

const cases = [
  {
    name: 'Stacked headers (測試圖, baseWeight=90, 取每100g)',
    text: stackedHeaderText,
    expectedPer1g: {
      calories: 2.446,
      protein: 0.12,
      fat: 0.158,
      carbohydrate: 0.136,
      sugar: 0.006,
      sodium: 6.5,
    },
    tol: 0.005,
  },
  {
    name: 'Single per100 column',
    text: single100Text,
    expectedPer1g: {
      calories: 2.5,
      protein: 0.1,
      fat: 0.12,
      carbohydrate: 0.25,
      sugar: 0.05,
      sodium: 3.0,
    },
    tol: 0.005,
  },
  {
    name: 'Single per-serving (50g) - 應走 baseWeight 換算',
    text: singlePerServingText,
    expectedPer1g: {
      calories: 2.0,        // 100/50
      protein: 0.1,         // 5/50
      fat: 0.06,            // 3/50
      carbohydrate: 0.3,    // 15/50
      sugar: 0.04,          // 2/50
      sodium: 2.0,          // 100/50
    },
    tol: 0.005,
  },
];

let pass = 0, fail = 0;
for (const tc of cases) {
  console.log(`\n=== ${tc.name} ===`);
  const result = NutritionParser.parse(tc.text);
  let ok = true;
  for (const [k, expected] of Object.entries(tc.expectedPer1g)) {
    const actual = result.per1g[k];
    const diff = actual == null ? Infinity : Math.abs(actual - expected);
    const status = diff <= tc.tol ? 'PASS' : 'FAIL';
    if (status === 'FAIL') ok = false;
    console.log(`  ${status}  ${k.padEnd(14)} expected=${expected}  actual=${actual}`);
  }
  if (ok) pass++; else fail++;
  console.log(`  metadata: ${JSON.stringify(result.metadata)}`);
}

console.log(`\n總計: ${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
