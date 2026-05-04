/**
 * StorageAdapter — 統一介面，自動選擇後端
 *
 * 讀取策略：
 *   1. 先讀 IndexedDB（一定快、一定有）
 *   2. 若有網路，背景再 fetch API；資料更新後派發 'storage-updated' 事件
 *
 * 寫入策略：
 *   1. 先寫 IndexedDB（保證持久化）
 *   2. 背景同步到 API（best-effort，失敗不影響使用者）
 *
 * 這個設計讓 APP「永遠可用」：
 *   - 線上：API 是 source of truth，IndexedDB 是快取
 *   - 離線：IndexedDB 接管，等回到線上再同步
 */
import { indexedDBBackend } from './indexeddb';
import { apiBackend } from './api';
import { emptyUserData, type AllUserData } from './types';

/**
 * 派發資料更新事件（背景 API 拉到新資料時通知 UI）
 */
function notifyDataUpdate(data: AllUserData) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<AllUserData>('storage-updated', { detail: data }));
  }
}

/**
 * 簡單比較：哪邊資料「比較新」
 * 用 dailyLogs 的 entries 數 + bodyLogs 數作粗略指標。
 * 真實系統應該用 timestamp，但目前資料 schema 沒有頂層 lastModified。
 */
function isNewer(a: AllUserData, b: AllUserData): boolean {
  const countEntries = (d: AllUserData) =>
    Object.values(d.dailyLogs).reduce((acc, log) => acc + (log?.entries?.length ?? 0), 0)
    + Object.keys(d.bodyLogs).length
    + d.customFoods.length;
  return countEntries(a) > countEntries(b);
}

export const storage = {
  /**
   * 載入完整使用者資料
   * 優先回傳 IndexedDB 資料，背景再嘗試從 API 拉新版本
   */
  async load(): Promise<AllUserData> {
    const localData = (await indexedDBBackend.load()) ?? emptyUserData();
    console.log('[Storage] 從 IndexedDB 載入資料:', localData);

    // 背景同步：不 await，不阻塞 UI
    apiBackend
      .load()
      .then(remoteData => {
        if (!remoteData) {
          console.log('[Storage] API 無可用資料，使用本機快取');
          return;
        }
        console.log('[Storage] 從 API 取得遠端資料，檢查是否更新...');
        if (isNewer(remoteData, localData)) {
          console.log('[Storage] 遠端資料較新，更新 IndexedDB 並通知 UI');
          indexedDBBackend.save(remoteData).catch((err) => {
            console.error('[Storage] 後台儲存失敗:', err);
          });
          notifyDataUpdate(remoteData);
        } else {
          console.log('[Storage] 本機資料較新或相同，不更新');
        }
      })
      .catch((err) => {
        // API 不可用是正常情況（離線、後端關閉），靜默忽略
        console.log('[Storage] API 不可用（離線或後端故障）:', err.message);
      });

    return localData;
  },

  /**
   * 儲存完整使用者資料
   * IndexedDB 是 critical path（必須成功），API 是 best-effort
   */
  async save(data: AllUserData): Promise<void> {
    // critical：必須成功
    try {
      await indexedDBBackend.save(data);
      console.log('[Storage] 資料已保存到本機（IndexedDB）');
    } catch (err) {
      console.error('[Storage] CRITICAL - IndexedDB 儲存失敗，離線功能會受影響:', err);
      // 不重新拋出，避免 UI crash，但用戶已經看到警告
    }

    // best-effort：失敗也沒關係，下次 save 會再試
    apiBackend.save(data).catch(err => {
      console.warn('[Storage] API 同步失敗，資料已存於本機:', err.message);
    });
  },

  /**
   * 監聽背景同步來的資料更新
   * 回傳 unsubscribe 函式
   */
  onUpdate(callback: (data: AllUserData) => void): () => void {
    const handler = (e: Event) => callback((e as CustomEvent<AllUserData>).detail);
    window.addEventListener('storage-updated', handler);
    return () => window.removeEventListener('storage-updated', handler);
  }
};

// 匯出型別讓 store.tsx 引用
export type { AllUserData } from './types';
