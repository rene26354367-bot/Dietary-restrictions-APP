/**
 * HTTP API 後端 — 連接 Express server.cjs
 * 保留現有行為，做為線上時的同步來源
 */
import type { StorageBackend, AllUserData } from './types';

/**
 * 自動偵測 API 基底 URL（優先級由高到低）：
 * 1. window.__API_BASE__   — 執行期 override
 * 2. VITE_API_BASE         — Vite 建構時環境變數（Vercel 部署時設定）
 * 3. 自動偵測同主機:3001    — 本地開發用
 */
function detectAPIBase(): string {
  if (typeof window === 'undefined') return 'http://localhost:3001';
  const override = (window as any).__API_BASE__;
  if (override) return override;
  const envBase = import.meta.env.VITE_API_BASE;
  if (envBase) return envBase;
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:3001`;
}

/**
 * 取得/產生使用者 UID（資料隔離用）
 * - URL ?uid=alice 優先（跨設備共用同一份資料）
 * - 否則從 localStorage 讀取，首次自動產生並儲存
 */
function getUserId(): string {
  if (typeof window === 'undefined') return 'default';
  const urlUid = new URLSearchParams(window.location.search).get('uid');
  if (urlUid) return urlUid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30) || 'default';
  let uid = localStorage.getItem('_uid');
  if (!uid) {
    uid = Math.random().toString(36).substring(2, 9);
    localStorage.setItem('_uid', uid);
  }
  return uid;
}

export const API_BASE = detectAPIBase();
export const USER_ID = getUserId();

/**
 * 切換到另一個 UID（用於跨設備同步）
 * - 寫入 localStorage 後重新載入頁面，讓 store / IndexedDB 用新 UID 重新初始化
 * - 對 UID 做與後端一致的清洗，避免非法字元
 */
export function switchUserId(newUid: string): void {
  if (typeof window === 'undefined') return;
  const cleaned = newUid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30);
  if (!cleaned) return;
  localStorage.setItem('_uid', cleaned);
  // 清除 URL 上的 ?uid= 參數（避免覆蓋 localStorage）
  const url = new URL(window.location.href);
  url.searchParams.delete('uid');
  window.location.replace(url.toString());
}

/** 產生包含同步碼的分享連結 */
export function buildSyncLink(uid: string = USER_ID): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.origin);
  url.searchParams.set('uid', uid);
  return url.toString();
}

const DEFAULT_TIMEOUT_MS = 5000;

/** fetch with timeout — 避免 API 掛掉時卡住整個 APP */
async function fetchWithTimeout(
  input: RequestInfo,
  init?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * fetch with retry — Railway 免費方案冷啟動需 15-20 秒
 * 第 1 次：5 秒 timeout；之後各次：10 秒 timeout，間隔 2 秒
 */
async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = 3
): Promise<Response> {
  let lastError: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      const timeoutMs = i === 0 ? 5000 : 10000;
      const res = await fetchWithTimeout(url, options, timeoutMs);
      if (res.ok) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastError = e;
    }
    if (i < retries - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw lastError;
}

export const apiBackend: StorageBackend = {
  name: 'HTTP API',

  async load(): Promise<AllUserData | null> {
    const res = await fetchWithRetry(`${API_BASE}/api/user-data?uid=${USER_ID}`);
    if (!res.ok) throw new Error(`API load failed: ${res.status}`);
    const data = await res.json();
    return {
      profile: data.profile ?? null,
      customTargets: data.customTargets ?? null,
      dailyLogs: data.dailyLogs ?? {},
      bodyLogs: data.bodyLogs ?? {},
      customFoods: data.customFoods ?? []
    };
  },

  async save(data: AllUserData): Promise<void> {
    const res = await fetchWithTimeout(`${API_BASE}/api/user-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, uid: USER_ID })
    });
    if (!res.ok) throw new Error(`API save failed: ${res.status}`);
  },

  async isAvailable(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/user-data?uid=${USER_ID}`, undefined, 5000);
      return res.ok;
    } catch {
      return false;
    }
  }
};
