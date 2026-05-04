const fs = require('fs');
const path = require('path');

// 手動讀取 .env
const envPath = path.join(__dirname, 'APP_UI_草稿', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\r\n]*)"?$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  });
}

const NutritionParser = require('./NutritionParser');
const IMAGE_DIR = 'C:/Users/user/Desktop/gemini_CLI_工作專區/飲食營養APP測試資料';

async function ocrImage(imagePath) {
  const apiKey = process.env.VITE_GOOGLE_CLOUD_VISION_KEY || process.env.GOOGLE_CLOUD_VISION_KEY;
  const buf = fs.readFileSync(imagePath);
  const b64 = buf.toString('base64');
  const resp = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{ image: { content: b64 }, features: [{ type: 'TEXT_DETECTION' }] }]
    })
  });
  const data = await resp.json();
  if (data.error) throw new Error(JSON.stringify(data.error));
  return data.responses?.[0]?.fullTextAnnotation?.text || null;
}

function formatNutrient(v) {
  if (v == null) return '  n/a  ';
  return (v * 100).toFixed(1).padStart(6);
}

async function main() {
  const files = fs.readdirSync(IMAGE_DIR)
    .filter(f => /\.(jpg|jpeg|png)$/i.test(f));

  console.log(`找到 ${files.length} 張圖片，開始批次 OCR...\n`);

  const results = [];

  for (const file of files) {
    const imgPath = path.join(IMAGE_DIR, file);
    process.stdout.write(`[${(files.indexOf(file)+1).toString().padStart(2)}/${files.length}] ${file} ... `);

    try {
      const rawText = await ocrImage(imgPath);
      if (!rawText) {
        console.log('⚠️  無文字');
        results.push({ file, status: 'no_text' });
        continue;
      }

      const result = NutritionParser.parse(rawText);
      const { metadata, per1g } = result;

      const cal = per1g.calories != null ? (per1g.calories * 100).toFixed(1) : 'n/a';
      const prot = per1g.protein != null ? (per1g.protein * 100).toFixed(1) : 'n/a';
      const fat = per1g.fat != null ? (per1g.fat * 100).toFixed(1) : 'n/a';
      const carb = per1g.carbohydrate != null ? (per1g.carbohydrate * 100).toFixed(1) : 'n/a';
      const sodium = per1g.sodium != null ? (per1g.sodium * 100).toFixed(1) : 'n/a';
      const hasWarning = metadata.warnings && metadata.warnings.length > 0;

      console.log(`✅ [${metadata.layout}/${metadata.targetColumn}] baseW=${metadata.baseWeight}g  熱量=${cal} 蛋白=${prot} 脂肪=${fat} 碳水=${carb} 鈉=${sodium}${hasWarning ? ' ⚠️警告' : ''}`);

      results.push({
        file, status: 'ok',
        layout: metadata.layout,
        targetColumn: metadata.targetColumn,
        baseWeight: metadata.baseWeight,
        cal, prot, fat, carb, sodium,
        warnings: metadata.warnings,
        rawText,
        per1g
      });

      // 有警告就印出細節
      if (hasWarning) {
        metadata.warnings.forEach(w => console.log(`       ⚠️  ${w}`));
      }

    } catch (e) {
      console.log(`❌ 錯誤: ${e.message}`);
      results.push({ file, status: 'error', error: e.message });
    }

    // 避免 API rate limit
    await new Promise(r => setTimeout(r, 300));
  }

  // 整理摘要
  console.log('\n' + '='.repeat(80));
  console.log('批次測試摘要');
  console.log('='.repeat(80));

  const ok = results.filter(r => r.status === 'ok');
  const noText = results.filter(r => r.status === 'no_text');
  const errors = results.filter(r => r.status === 'error');
  const warnings = ok.filter(r => r.warnings && r.warnings.length > 0);

  const layoutCounts = {};
  ok.forEach(r => { layoutCounts[r.layout] = (layoutCounts[r.layout] || 0) + 1; });

  console.log(`\n✅ 解析成功: ${ok.length}/${files.length}`);
  console.log(`⚠️  無文字:   ${noText.length}`);
  console.log(`❌ 錯誤:     ${errors.length}`);
  console.log(`⚠️  有警告:   ${warnings.length}`);
  console.log('\n佈局分布:');
  Object.entries(layoutCounts).forEach(([k, v]) => console.log(`  ${k}: ${v} 張`));

  // 印出每張的完整資料
  console.log('\n' + '='.repeat(80));
  console.log('詳細結果（每100g）');
  console.log('='.repeat(80));
  console.log('檔案名稱'.padEnd(45) + '佈局'.padEnd(10) + '份量  熱量   蛋白   脂肪   碳水   鈉');
  console.log('-'.repeat(100));
  ok.forEach(r => {
    const name = r.file.length > 44 ? r.file.substring(0, 41) + '...' : r.file;
    const layout = `${r.layout}/${r.targetColumn}`.padEnd(12);
    const base = `${r.baseWeight}g`.padStart(4);
    console.log(
      `${name.padEnd(45)}${layout}${base}  ${r.cal.padStart(6)} ${r.prot.padStart(6)} ${r.fat.padStart(6)} ${r.carb.padStart(6)} ${r.sodium.padStart(6)}` +
      (r.warnings?.length ? ' ⚠️' : '')
    );
  });

  if (warnings.length > 0) {
    console.log('\n⚠️  警告詳情：');
    warnings.forEach(r => {
      console.log(`\n  ${r.file}`);
      r.warnings.forEach(w => console.log(`    - ${w}`));
    });
  }

  // 儲存完整 OCR 文字以備後用
  const ocrDump = {};
  ok.forEach(r => { ocrDump[r.file] = r.rawText; });
  fs.writeFileSync(path.join(__dirname, 'ocr_batch_dump.json'), JSON.stringify(ocrDump, null, 2), 'utf8');
  console.log('\n📁 OCR 原文已存至 ocr_batch_dump.json');
}

main().catch(e => { console.error(e); process.exit(1); });
