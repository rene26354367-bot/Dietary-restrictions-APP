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
  const r = await search('牛奶');
  console.log(`共 ${r.length} 筆結果`);
  const withAlias = r.filter(x => x.matchedAlias === '牛奶');
  const noAlias   = r.filter(x => !x.matchedAlias);
  console.log(`直接匹配(無alias): ${noAlias.length} 筆`);
  console.log(`鮮乳別名匹配(alias=牛奶): ${withAlias.length} 筆`);
  console.log('前3筆 alias 結果位置:');
  withAlias.slice(0,3).forEach(x => console.log(`  #${r.indexOf(x)+1} ${x.name}`));
}
run();
