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
  // 鮮乳 直接搜
  let r = await search('鮮乳');
  console.log(`=== 鮮乳 (${r.length}筆) ===`);
  r.slice(0,5).forEach(x => console.log(`  name=${x.name}  alias=${x.matchedAlias}`));

  // 米飯
  r = await search('米飯');
  console.log(`\n=== 米飯 (${r.length}筆) ===`);
  r.slice(0,5).forEach(x => console.log(`  name=${x.name}`));

  // 飯
  r = await search('飯');
  console.log(`\n=== 飯 (${r.length}筆) ===`);
  r.slice(0,3).forEach(x => console.log(`  name=${x.name}`));

  // 米
  r = await search('米');
  console.log(`\n=== 米 (${r.length}筆) ===`);
  r.slice(0,5).forEach(x => console.log(`  name=${x.name}`));
}
run();
