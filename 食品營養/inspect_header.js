const xlsx = require('xlsx');
const path = require('path');

const sourceFile = path.join('C:', 'Users', 'user', 'Downloads', '食品營養成分資料庫2024UPDATE2.ods');

console.log('正在讀取試算表標頭...');
const workbook = xlsx.readFile(sourceFile);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// 讀取前 3 列來查看標頭
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
console.log('第一列:', JSON.stringify(rows[0]));
console.log('第二列:', JSON.stringify(rows[1]));
console.log('第三列:', JSON.stringify(rows[2]));
