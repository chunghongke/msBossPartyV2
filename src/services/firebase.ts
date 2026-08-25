import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, off, Database, DatabaseReference } from 'firebase/database';
import { FirebaseConfig } from '@/types/group';
import { Player } from '@/types/player';
import { StoreData } from '@/types/party';

let currentApp: FirebaseApp | null = null;
let currentDb: Database | null = null;

export function getFirebaseApp(config?: FirebaseConfig): FirebaseApp {
  if (!config) {
    if (currentApp) return currentApp;
    const existing = getApps();
    if (existing.length > 0) return existing[0];
    throw new Error('Firebase 未初始化且無提供設定檔！');
  }

  const appName = `group_${config.projectId}_${config.databaseURL.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const existing = getApps().find((a) => a.name === appName);
  if (existing) {
    currentApp = existing;
    currentDb = getDatabase(existing);
    return existing;
  }

  currentApp = initializeApp(config, appName);
  currentDb = getDatabase(currentApp);
  return currentApp;
}

export function getRtdb(config?: FirebaseConfig): Database {
  if (config) {
    getFirebaseApp(config);
  }
  if (!currentDb) {
    if (currentApp) {
      currentDb = getDatabase(currentApp);
    } else {
      const existing = getApps();
      if (existing.length > 0) {
        currentApp = existing[0];
        currentDb = getDatabase(existing[0]);
      } else {
        throw new Error('Realtime Database 尚未初始化！');
      }
    }
  }
  return currentDb;
}

export function getDbRef(path: string, config?: FirebaseConfig): DatabaseReference {
  return ref(getRtdb(config), path);
}

export async function testFirebaseConnection(config: FirebaseConfig): Promise<{ success: boolean; error?: string }> {
  // 1. 檢查 API Key 格式與長度
  const apiKey = (config.apiKey || '').trim();
  if (!apiKey.startsWith('AIzaSy') || apiKey.length < 35 || apiKey.length > 45) {
    return {
      success: false,
      error: 'Firebase API Key 格式不正確 (必須為以 AIzaSy 開頭的 39 位字串，請檢查是否複製完整)！',
    };
  }

  // 2. 檢查 Database URL 格式
  const dbUrl = (config.databaseURL || '').trim();
  if (!dbUrl.startsWith('https://') || (!dbUrl.includes('firebaseio.com') && !dbUrl.includes('firebasedatabase.app'))) {
    return {
      success: false,
      error: 'Database URL 必須為有效的 Firebase 網址 (例如 https://xxx-default-rtdb.firebaseio.com)！',
    };
  }

  // 3. 檢查 Project ID
  if (!config.projectId || !config.projectId.trim()) {
    return { success: false, error: '請填寫 Project ID 專案識別碼！' };
  }

  // 4. 實際對 Realtime Database 進行 REST PUT 寫入、GET 讀取與 DELETE 清理測試
  try {
    const cleanUrl = dbUrl.replace(/\/$/, '');
    const pingUrl = `${cleanUrl}/_connection_test.json`;

    // 嘗試寫入測試資料
    const putRes = await fetch(pingUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ping: Date.now() }),
      signal: AbortSignal.timeout(6000),
    });

    if (!putRes.ok) {
      if (putRes.status === 401 || putRes.status === 403) {
        return {
          success: false,
          error: '資料庫權限不足 (Permission Denied)！請至 Firebase 控制台「規則 (Rules)」分頁將規則設為 .read: true, .write: true 並發布。',
        };
      }
      if (putRes.status === 404) {
        return {
          success: false,
          error: '找不到該 Realtime Database，請確認 Database URL 是否正確！',
        };
      }
      return {
        success: false,
        error: `資料庫伺服器回應錯誤 (HTTP ${putRes.status} ${putRes.statusText})，請檢查連線設定！`,
      };
    }

    // 嘗試讀取剛寫入的資料
    const getRes = await fetch(pingUrl, { signal: AbortSignal.timeout(5000) });
    if (!getRes.ok) {
      return { success: false, error: '資料庫讀取驗證失敗，請確認安全規則設定！' };
    }

    // 清理測試節點
    await fetch(pingUrl, { method: 'DELETE', signal: AbortSignal.timeout(5000) });

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: `無法連線至資料庫：${err?.message || '網路連線逾時或 Database URL 錯誤'}`,
    };
  }
}

export async function initializeGroupDatabase(
  config: FirebaseConfig,
  adminPlayer: { name: string; passwordHash: string; avatarEmoji?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getRtdb(config);

    const initialPlayers: Player[] = [
      {
        name: adminPlayer.name.trim(),
        avatarEmoji: adminPlayer.avatarEmoji || '👑',
        passwordHash: adminPlayer.passwordHash,
        isAdmin: true,
        characters: [],
      },
    ];

    const initialStore: StoreData = {
      teams: {},
      weeklyRecords: {},
      guests: [],
    };

    await set(ref(db, 'players'), initialPlayers);
    await set(ref(db, 'store'), initialStore);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || '初始化資料庫失敗！' };
  }
}

export { ref, set, get, onValue, off };
