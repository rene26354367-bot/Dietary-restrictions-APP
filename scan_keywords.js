const fs = require('fs');
const db = JSON.parse(fs.readFileSync('core_nutrition_db.json', 'utf8'));

const academicKeywords = ['清肉', '甘藍', '蕹菜', '苜蓿', '甘藷', '番茄', '牛乳', '乳粉'];
const findings = {};

academicKeywords.forEach(kw => {
    findings[kw] = db.filter(item => item.name.includes(kw)).map(item => item.name).slice(0, 5);
});

console.log(JSON.stringify(findings, null, 2));
