/**
 * IndexedDB 後端 — 離線儲存
 * 使用 idb 套件作為 IndexedDB 的輕量 Promise 包裝
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { StorageBackend, AllUserData } from './types';

const DB_NAME = 'nutrition-app';
const DB_VERSION = 1;
const STORE_NAME = 'userdata';
const KEY = 'main'; // 整份資料用單一 key 儲存

interface NutritionDBSchema extends DBSchema {
  userdata: {
    key: string;
    value: AllUserData;
  };
}

let dbPromise: Promise<IDBPDatabase<NutritionDBSchema>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<NutritionDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      }
    });
  }
  return dbPromise;
}

export const indexedDBBackend: StorageBackend = {
  name: 'IndexedDB',

  async load(): Promise<AllUserData | null> {
    try {
      const db = await getDB();
      const data = await db.get(STORE_NAME, KEY);
      if (data) {
        console.log('[IndexedDB] 載入成功，資料記錄數:', {
          dailyLogsCount: Object.keys(data.dailyLogs).length,
          bodyLogsCount: Object.keys(data.bodyLogs).length,
          customFoodsCount: data.customFoods?.length || 0,
          hasProfile: !!data.profile
        });
      } else {
        console.log('[IndexedDB] 無資料（首次使用或已清空）');
      }
      return data ?? null;
    } catch (e) {
      console.error('[IndexedDB] 載入失敗:', e);
      return null;
    }
  },

  async save(data: AllUserData): Promise<void> {
    try {
      const db = await getDB();
      await db.put(STORE_NAME, data, KEY);
      console.log('[IndexedDB] 儲存成功，資料記錄數:', {
        dailyLogsCount: Object.keys(data.dailyLogs).length,
        bodyLogsCount: Object.keys(data.bodyLogs).length,
        customFoodsCount: data.customFoods?.length || 0,
        hasProfile: !!data.profile
      });
    } catch (e) {
      console.error('[IndexedDB] 儲存失敗，這是嚴重錯誤！', e);
      throw e; // 重新拋出以供 adapter 處理
    }
  },

  async isAvailable(): Promise<boolean> {
    return typeof window !== 'undefined' && 'indexedDB' in window;
  }
};
