const fs = require('fs');
const path = require('path');

const STORAGE_FILE = path.join(__dirname, 'user_data.json');

const StorageManager = {
  /**
   * 儲存資料
   */
  save(data) {
    try {
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('儲存失敗:', error.message);
      return false;
    }
  },

  /**
   * 讀取資料
   */
  load() {
    try {
      if (!fs.existsSync(STORAGE_FILE)) {
        return { profile: null, logs: [] };
      }
      const content = fs.readFileSync(STORAGE_FILE, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('讀取失敗:', error.message);
      return { profile: null, logs: [] };
    }
  }
};

module.exports = StorageManager;
