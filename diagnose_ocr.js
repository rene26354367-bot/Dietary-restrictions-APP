const fs = require('fs');
const path = require('path');

// 手動讀取 .env，避免依賴 dotenv
const envPath = path.join(__dirname, 'APP_UI_草稿', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\r\n]*)"?$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  });
}

const IMAGE_PATH = process.argv[2] || 'C:/Users/user/Desktop/gemini_CLI_工作專區/飲食營養APP測試資料/2016-06-08 at 10-09-46.jpg';

async function main() {
  const apiKey = process.env.VITE_GOOGLE_CLOUD_VISION_KEY || process.env.GOOGLE_CLOUD_VISION_KEY;
  if (!apiKey) {
    console.error('No Vision API key. Check APP_UI_草稿/.env');
    process.exit(1);
  }
  if (!fs.existsSync(IMAGE_PATH)) {
    console.error('Image not found:', IMAGE_PATH);
    process.exit(1);
  }

  const buf = fs.readFileSync(IMAGE_PATH);
  const b64 = buf.toString('base64');

  console.log(`Calling Vision API for ${IMAGE_PATH} (${(buf.length/1024).toFixed(1)} KB)...`);
  const resp = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{
        image: { content: b64 },
        features: [{ type: 'TEXT_DETECTION' }]
      }]
    })
  });
  const data = await resp.json();
  if (data.error) {
    console.error('Vision API error:', JSON.stringify(data.error, null, 2));
    process.exit(1);
  }
  const fullText = data.responses?.[0]?.fullTextAnnotation?.text;
  if (!fullText) {
    console.error('No text detected. Raw response:', JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log('================ FULL TEXT ================');
  console.log(fullText);
  console.log('================ END ================');

  const out = path.join(__dirname, 'ocr_output_sample.txt');
  fs.writeFileSync(out, fullText, 'utf8');
  console.log('Saved to:', out);

  const NutritionParser = require('./NutritionParser');
  const result = NutritionParser.parse(fullText);
  console.log('\n================ CURRENT PARSER OUTPUT ================');
  console.log(JSON.stringify(result, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
