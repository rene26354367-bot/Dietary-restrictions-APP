const http = require('http');

async function search(q) {
  return new Promise((resolve) => {
    http.get(`http://localhost:3001/api/search?q=${encodeURIComponent(q)}`, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve([]); } });
    }).on('error', () => resolve([]));
  });
}

async function run() {
  // 測試：對有別名的關鍵字，檢查前10筆是否有任一筆帶 matchedAlias
  //       對無別名的關鍵字，只要有結果即可
  const cases = [
    { input: '小黃瓜', expectAlias: '小黃瓜',  desc: '別名 → 胡瓜' },
    { input: '紅蘿蔔', expectAlias: '紅蘿蔔',  desc: '別名 → 胡蘿蔔（前面會有直接匹配的紅蘿蔔麵）' },
    { input: '高麗菜', expectAlias: '高麗菜',  desc: '別名 → 甘藍' },
    { input: '地瓜',   expectAlias: '地瓜',    desc: '別名 → 甘藷' },
    { input: '牛奶',   expectAlias: '牛奶',    desc: '別名 → 鮮乳（前面有名字含牛奶的加工品）' },
    { input: '胡瓜',   expectAlias: null,       desc: '直搜，無別名' },
    { input: '白米飯', expectAlias: '白米飯',  desc: '別名 → 白飯 (DB無白米飯直接項目)' },
    { input: '雞蛋',   expectAlias: null,       desc: '直搜' },
    { input: '空心菜', expectAlias: '空心菜',  desc: '別名 → 蕹菜' },
    { input: '番薯',   expectAlias: '番薯',    desc: '別名 → 甘藷' },
  ];

  let pass = 0;
  for (const c of cases) {
    const results = await search(c.input);
    
    let ok = false;
    if (c.expectAlias) {
      // 前10筆裡有任一筆帶正確 matchedAlias
      ok = results.slice(0, 10).some(r => r.matchedAlias === c.expectAlias);
    } else {
      // 只要有結果，且沒有意外的 matchedAlias
      ok = results.length > 0 && results[0].matchedAlias === null;
    }

    if (ok) pass++;
    const mark = ok ? '✅' : '❌';
    const first = results[0];
    const aliasHit = results.slice(0,10).find(r => r.matchedAlias);
    const detail = aliasHit
      ? `第${results.indexOf(aliasHit)+1}筆「${aliasHit.name}」帶 alias="${aliasHit.matchedAlias}"`
      : (results.length ? `第1筆「${first.name}」無別名` : '(0筆)');
    console.log(`${mark} [${c.input}] ${detail}  (${c.desc})`);
  }
  console.log(`\n結果: ${pass}/10 通過`);
}
run();
