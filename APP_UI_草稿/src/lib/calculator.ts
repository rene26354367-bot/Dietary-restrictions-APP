export const nutritionStandards = {
  bmi_categories: {
    underweight: { max: 18.5, label: '體重過輕' },
    normal: { max: 24, label: '正常範圍' },
    overweight: { max: 27, label: '異常過重' },
    obese: { max: 999, label: '肥胖' },
  }
};

export class UserTargetCalculator {
  static calculate(profile: any) {
    const { age, height, weight, activityLevel } = profile;

    const bmi = weight / ((height / 100) ** 2);

    let bmiCat = 'normal';
    if (bmi < 18.5) bmiCat = 'underweight';
    else if (bmi < 24) bmiCat = 'normal';
    else if (bmi < 27) bmiCat = 'overweight';
    else bmiCat = 'obese';

    const factorTable: any = {
      'underweight': { 'low': 35, 'moderate': 40, 'high': 45 },
      'normal': { 'low': 30, 'moderate': 35, 'high': 40 },
      'overweight': { 'low': 25, 'moderate': 30, 'high': 35 },
      'obese': { 'low': 20, 'moderate': 25, 'high': 30 }
    };
    
    const calFactor = factorTable[bmiCat][activityLevel] || 30;
    const targetCalories = Math.round(weight * calFactor);

    // 台灣 DRIs 八版：P 15%, F 25%, C 60%
    const targetProteinG = Math.round((targetCalories * 0.15) / 4);
    const targetFatG = Math.round((targetCalories * 0.25) / 9);
    const targetCarbsG = Math.round((targetCalories * 0.60) / 4);

    return {
      summary: {
        bmi: parseFloat(bmi.toFixed(1)),
        bmiLabel: (nutritionStandards.bmi_categories as any)[bmiCat].label,
        targetCalories: targetCalories,
      },
      macros: {
        protein: { g: targetProteinG, kcal: targetProteinG * 4 },
        carbohydrate: { g: targetCarbsG, kcal: targetCarbsG * 4 },
        fat: { g: targetFatG, kcal: targetFatG * 9 },
      },
      activityLevel: activityLevel,
    };
  }
}
