const standards = require('./nutrition_standards.json');

/**
 * 衛福部國健署標準營養計算機
 */
class UserTargetCalculator {
  static calculate(profile) {
    const { age, height, weight, activityLevel } = profile;

    // 1. 計算 BMI
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);

    // 2. 判定體位 (衛福部標準)
    let bmiCat = 'normal';
    if (bmi < 18.5) bmiCat = 'underweight';
    else if (bmi < 24) bmiCat = 'normal';
    else if (bmi < 27) bmiCat = 'overweight';
    else bmiCat = 'obese';

    // 3. 取得衛福部熱量係數 (kcal/kg)
    // 注意：為了符合生理邏輯，我們使用「實際體重」進行 TDEE 計算
    // 衛福部定義：過輕(35-45), 正常(30-40), 過重(25-35)
    const factorTable = {
      'underweight': { 'low': 35, 'moderate': 40, 'high': 45 },
      'normal': { 'low': 30, 'moderate': 35, 'high': 40 },
      'overweight': { 'low': 25, 'moderate': 30, 'high': 35 },
      'obese': { 'low': 20, 'moderate': 25, 'high': 30 }
    };
    
    const calFactor = factorTable[bmiCat][activityLevel] || 30;
    const targetCalories = Math.round(weight * calFactor);

    // 4. 三大營養素分配 (依據台灣 DRIs 八版建議比例)
    // 蛋白質 15%, 脂肪 25%, 碳水 60%
    const targetProteinG = Math.round((targetCalories * 0.15) / 4);
    const targetFatG = Math.round((targetCalories * 0.25) / 9);
    const targetCarbsG = Math.round((targetCalories * 0.60) / 4);

    const bmiLabels = {
      'underweight': '體重過輕',
      'normal': '正常範圍',
      'overweight': '異常過重',
      'obese': '肥胖'
    };

    return {
      summary: {
        bmi: parseFloat(bmi.toFixed(1)),
        bmiLabel: bmiLabels[bmiCat],
        targetCalories: targetCalories
      },
      macros: {
        protein: { g: targetProteinG, kcal: targetProteinG * 4 },
        carbohydrate: { g: targetCarbsG, kcal: targetCarbsG * 4 },
        fat: { g: targetFatG, kcal: targetFatG * 9 }
      },
      activityLevel: activityLevel
    };
  }
}

module.exports = UserTargetCalculator;
