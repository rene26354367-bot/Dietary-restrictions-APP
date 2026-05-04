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
  // 紅蘿蔔：檢查所有結果
  let r = await search('紅蘿蔔');
  console.log('=== 紅蘿蔔 (前5筆) ===');
  r.slice(0,5).forEach(x => console.log(`  name=${x.name}  alias=${x.matchedAlias}`));

  // 牛奶：檢查所有結果
  r = await search('牛奶');
  console.log('\n=== 牛奶 (前5筆) ===');
  r.slice(0,5).forEach(x => console.log(`  name=${x.name}  alias=${x.matchedAlias}`));

  // 白米飯：直接搜
  r = await search('白米飯');
  console.log('\n=== 白米飯 ===');
  if (r.length === 0) console.log('  (0結果)');
  r.slice(0,5).forEach(x => console.log(`  name=${x.name}  alias=${x.matchedAlias}`));

  // 白米
  r = await search('白米');
  console.log('\n=== 白米 (前5筆) ===');
  r.slice(0,5).forEach(x => console.log(`  name=${x.name}  alias=${x.matchedAlias}`));
}
run();
