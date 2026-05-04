/**
 * HTTP API 後端 — 連接 Express server.cjs
 * 保留現有行為，做為線上時的同步來源
 */
import type { StorageBackend, AllUserData } from './types';

/**
 * 自動偵測 API 基底 URL：
 * - 從 localhost 開 → 用 localhost:3001
 * - 從手機透過網路 IP 開（如 http://192.168.1.5:4173）→ 自動用同 IP:3001
 * - window.__API_BASE__ 可在執行期覆蓋（部署到雲端時用）
 */
function detectAPIBase(): string {
  if (typeof window === 'undefined') return 'http://localhost:3001';
  const override = (window as any).__API_BASE__;
  if (override) return override;
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:3001`;
}

export const API_BASE = detectAPIBase();

const TIMEOUT_MS = 3000;

/** fetch with timeout — 避免 API 掛掉時卡住整個 APP */
async function fetchWithTimeout(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export const apiBackend: StorageBackend = {
  name: 'HTTP API',

  async load(): Promise<AllUserData | null> {
    const res = await fetchWithTimeout(`${API_BASE}/api/user-data`);
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
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`API save failed: ${res.status}`);
  },

  async isAvailable(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/user-data`);
      return res.ok;
    } catch {
      return false;
    }
  }
};
