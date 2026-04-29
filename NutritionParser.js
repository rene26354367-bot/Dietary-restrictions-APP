/**
 * 台灣營養標籤解析器 (Taiwan Nutrition Label Parser)
 * 負責將 OCR 辨識出的原始文字轉化為 1g 基準的營養數據
 */
class NutritionParser {
  /**
   * 解析 OCR 文字
   * @param {string} text 
   * @returns {Object} 1g 基準的營養素
   */
  static parse(text) {
    // 1. 清理文字 (移除空格、統一數字半角)
    const cleanText = text.replace(/\s+/g, '').replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xfee0));

    // 2. 偵測基準量 (每 100g 或 每一份量)
    // 預設為 100g 基準，除非偵測到「每一份量」
    let baseWeight = 100;
    const servingMatch = cleanText.match(/每一份量(\d+)(g|公克|毫升|ml)/i);
    if (servingMatch) {
      baseWeight = parseFloat(servingMatch[1]);
    }

    // 3. 提取營養素數值 (正則表達式)
    const nutrients = {
      calories: this._extractValue(cleanText, /熱量(\d+\.?\d*)/),
      protein: this._extractValue(cleanText, /(蛋白質|蛋白)(\d+\.?\d*)/),
      fat: this._extractValue(cleanText, /(脂肪|脂質)(\d+\.?\d*)/),
      carbohydrate: this._extractValue(cleanText, /(碳水化合物|碳水)(\d+\.?\d*)/),
      sugar: this._extractValue(cleanText, /糖(\d+\.?\d*)/),
      sodium: this._extractValue(cleanText, /鈉(\d+\.?\d*)/)
    };

    // 4. 轉換為 1g 基準
    const coreNutrients = {};
    for (const key in nutrients) {
      coreNutrients[key] = nutrients[key] / baseWeight;
    }

    return {
      parsedFrom: baseWeight === 100 ? "每 100g" : `每一份量 (${baseWeight}g)`,
      data: coreNutrients
    };
  }

  static _extractValue(text, regex) {
    const match = text.match(regex);
    return match ? parseFloat(match[match.length - 1]) : 0;
  }
}

module.exports = NutritionParser;

// --- 解析器測試 ---
if (require.main === module) {
  const sample1 = "每一份量 50公克 本包裝含 2份 熱量 200大卡 蛋白質 10公克 脂肪 5公克 碳水化合物 30公克 糖 5公克 鈉 100毫克";
  const result1 = NutritionParser.parse(sample1);
  console.log("測試 1 (每一份量基準):");
  console.log(result1);

  const sample2 = "每100公克 熱量 400大卡 蛋白質 20公克 脂肪 10公克 碳水化合物 60公克 糖 10公克 鈉 200毫克";
  const result2 = NutritionParser.parse(sample2);
  console.log("\n測試 2 (每 100g 基準):");
  console.log(result2);
}
