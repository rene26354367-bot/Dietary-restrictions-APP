const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'core_nutrition_db.json');
const unitPath = path.join(__dirname, 'unit_conversions.json');
const manualNamingPath = path.join(__dirname, 'manual_naming.json');
const outputPath = path.join(__dirname, 'core_nutrition_db.json');

const rawData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const unitMapping = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
const manualNaming = JSON.parse(fs.readFileSync(manualNamingPath, 'utf8'));

function deepClean(str, aliasStr) {
    if (!str) return "";
    
    const techKeywords = /樣品狀態|前處理|描述|解析值|英文名稱|學名|樣品名稱/;
    
    // 1. 取得主名稱
    let baseName = str.split('(')[0].trim();
    
    // 2. 檢查是否有手動指定的俗名
    let cleanAlias = "";
    if (manualNaming[baseName]) {
        cleanAlias = manualNaming[baseName];
    } else {
        // 如果沒有手動指定，嘗試從官方別名提取
        if (aliasStr) {
            const parts = aliasStr.split(/[;；,，、]/);
            const aliasPart = parts.find(p => p.includes("俗名:"));
            if (aliasPart) {
                cleanAlias = aliasPart.replace("俗名:", "").replace(/[()]/g, '').trim();
            } else if (!techKeywords.test(aliasStr)) {
                cleanAlias = aliasStr.replace(/[()]/g, '').trim();
            }
        }
    }

    // 組合名稱： 如果俗名已經包含在主名稱裡了就不用重複
    if (cleanAlias && baseName.includes(cleanAlias)) return baseName;
    return cleanAlias ? `${baseName} (${cleanAlias})` : baseName;
}

const crypto = require('crypto');

const transformed = rawData.map(item => {
  let displayName = deepClean(item.name, item.alias);
  
  if (displayName.length < 2) {
      displayName = item.name.split(' (')[0].trim();
  }

  const brandSuffix = (item.brand && item.brand !== '通用') ? ` [${item.brand}]` : '';
  
  const servings = [];
  servings.push({ label: '100g', grams: 100 }); 

  // 強化匹配：即使是改名後的 displayName 也要能匹配到單位
  for (const [key, mapping] of Object.entries(unitMapping)) {
      if (displayName.includes(key) || key.includes(displayName) || item.name.includes(key)) {
          for (const [unitLabel, grams] of Object.entries(mapping)) {
              if (!servings.find(s => s.label === unitLabel)) {
                servings.push({ label: unitLabel, grams });
              }
          }
      }
  }

  // 確保有 ID
  const id = item.id || `gen_${crypto.createHash('md5').update(item.name + (item.brand || '')).digest('hex').slice(0, 8)}`;

  return {
    id: id,
    name: displayName + brandSuffix,
    fullName: item.name,
    brand: item.brand || "通用",
    nutrients: item.nutrients, // 保持 1g 基準的巢狀結構
    servings: servings,
    source: item.source || 'official_fda',
    verified: item.verified !== undefined ? item.verified : true,
    baseGrams: 1 // 標註這是 1g 基準
  };
});

fs.writeFileSync(outputPath, JSON.stringify(transformed, null, 2));
console.log(`Final Transform complete. Manual naming applied.`);
