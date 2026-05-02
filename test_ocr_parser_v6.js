const NutritionParser = require('./NutritionParser');

/**
 * 測試案例 V6 - 針對 photo_4, 5, 8 的失敗特徵進行模擬
 */
const cases = [
  {
    name: 'photo_5 類比: 關鍵字遺漏但有特徵錨定 (kcal)',
    text: `營養標示
每一份量 300 毫克
本包裝含 2 份
每份
每100毫克
熟量(讀錯字)
111 憭批
37 憭批
蛋白質
1.5 公克
0.5 公克`,
    expectedPer1g: { calories: 0.37, protein: 0.005 },
    checkSanity: true
  },
  {
    name: 'photo_8 類比: 數據錯位 (脂肪與飽和脂肪混淆)',
    // 預期：100g 欄位中，脂肪應為 18.9，飽和脂肪為 3.8。
    // 模擬 OCR 錯誤：把飽和脂肪的 3.8 誤認成總脂肪的 100g 數據。
    text: `營養標示
每一份量 29 公克
每份 每100公克
熱量 148 509
蛋白質 5.5 18.9
脂肪 9.3 3.8
飽和脂肪 1.1 3.8
碳水化合物 11.6 40`,
    // 預期的 Parser 行為：偵測到 509 / 148 ≈ 3.44，但 3.8 / 9.3 ≈ 0.4。
    // 應觸發比例警告或標記 sanityCheck: false
    shouldWarn: 'ratio mismatch',
    checkSanity: false // 預期會失敗
  },
  {
    name: 'photo_4 類比: 單項數據極端異常 (Sanity Check)',
    text: `營養標示
每一份量 90 公克
每份 每100公克
熱量 435 484
蛋白質 81.4 10.7
脂肪 22.2 24.7`,
    // 81.4g 蛋白質在 90g 份量中幾乎不可能（考慮到還有脂肪與水分）
    // 應觸發 Sanity Check 失敗 (P+F+C > 1.1)
    shouldFailSanity: true
  }
];

async function runTests() {
  let pass = 0;
  for (const tc of cases) {
    console.log(`\n=== Testing: ${tc.name} ===`);
    const result = NutritionParser.parse(tc.text);
    console.log('Metadata:', JSON.stringify(result.metadata, null, 2));
    
    let ok = true;
    if (tc.expectedPer1g) {
      for (const [k, v] of Object.entries(tc.expectedPer1g)) {
        const actual = result.per1g[k];
        if (Math.abs(actual - v) > 0.01) {
          console.error(`  [FAIL] ${k}: expected ${v}, got ${actual}`);
          ok = false;
        } else {
          console.log(`  [PASS] ${k}: ${actual}`);
        }
      }
    }

    if (tc.shouldFailSanity && result.metadata.sanityCheck !== false) {
      console.error(`  [FAIL] Expected sanityCheck: false, but got ${result.metadata.sanityCheck}`);
      ok = false;
    }

    if (ok) pass++;
  }
  console.log(`\nPassed ${pass}/${cases.length} tests`);
}

runTests();
