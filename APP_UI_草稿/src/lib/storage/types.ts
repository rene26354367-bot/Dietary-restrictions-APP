/**
 * Storage 抽象層共用型別
 */
import type { UserProfile } from '../calculator';
import type { DailyLog, BodyLog, CustomFood, CustomTargets } from '../store';

/**
 * 完整使用者資料快照 — 一次讀寫的單位
 */
export interface AllUserData {
  profile: UserProfile | null;
  customTargets: CustomTargets | null;
  dailyLogs: Record<string, DailyLog>;
  bodyLogs: Record<string, BodyLog>;
  customFoods: CustomFood[];
}

/**
 * Storage 後端介面
 * 任何儲存實作（API / IndexedDB / SQLite）都要符合這個 shape
 */
export interface StorageBackend {
  /** 後端名稱（log 用） */
  readonly name: string;
  /** 載入完整資料；若無資料回傳 null */
  load(): Promise<AllUserData | null>;
  /** 寫入完整資料 */
  save(data: AllUserData): Promise<void>;
  /** 檢查此後端是否可用（async 因 API 需要 ping） */
  isAvailable(): Promise<boolean>;
}

/**
 * 空白資料工廠 — 首次啟動 / 完全沒資料時的回傳值
 */
export function emptyUserData(): AllUserData {
  return {
    profile: null,
    customTargets: null,
    dailyLogs: {},
    bodyLogs: {},
    customFoods: []
  };
}
