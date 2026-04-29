const AppEngine = require('./AppEngine');
const engine = new AppEngine();

console.log("=== 測試俗名對應搜尋 ===");
const query = "雞胸肉";
const results = engine.searchFood(query);

if (results.length > 0) {
    console.log(`成功！搜尋 "${query}"，找到了 ${results.length} 筆資料。`);
    console.log(`第一筆結果: ${results[0].name}`);
} else {
    console.log(`失敗，仍找不到 "${query}"。`);
}
