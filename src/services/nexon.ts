// 台灣新楓之谷 (TMS) 官方 Open API 端點
const NEXON_API_BASE_TW = 'https://open.api.nexon.com/maplestorytw/v1';
const STORAGE_KEY = 'boss_party_nexon_api_key';

export interface NexonCharacterInfo {
  ocid: string;
  characterName: string;
  characterImage: string;
  characterLevel?: number;
  characterClass?: string;
  worldName?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 具備 429 (Rate Limit) 自動重試與指數退避機制的 fetch
 */
async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delayMs = 1200): Promise<Response> {
  try {
    const res = await fetch(url, options);

    if (res.status === 429 && retries > 0) {
      console.warn('[Nexon API] 429 Rate limited, waiting ' + delayMs + 'ms before retry... (剩餘重試次數: ' + retries + ')');
      await sleep(delayMs);
      return fetchWithRetry(url, options, retries - 1, delayMs * 1.5);
    }

    return res;
  } catch (err) {
    if (retries > 0) {
      await sleep(delayMs);
      return fetchWithRetry(url, options, retries - 1, delayMs * 1.5);
    }
    throw err;
  }
}

/**
 * 從目前使用者的瀏覽器 localStorage 讀取個人 Nexon API Key
 */
export function getNexonApiKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY)?.trim() || '';
  } catch {
    return '';
  }
}

/**
 * 將使用者的 Nexon API Key 儲存至本機瀏覽器 localStorage
 */
export function setNexonApiKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, key.trim());
  } catch (e) {
    console.error('Failed to save Nexon API key to localStorage', e);
  }
}

/**
 * 清除本機瀏覽器儲存的 Nexon API Key
 */
export function removeNexonApiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to remove Nexon API key from localStorage', e);
  }
}

/**
 * 測試 Nexon API Key 是否有效 (使用台灣新楓之谷 TMS 端點)
 */
export async function testNexonApiKey(key: string): Promise<{ success: boolean; error?: string }> {
  const cleanKey = key.trim();
  if (!cleanKey) {
    return { success: false, error: '請輸入 Nexon Open API Key！' };
  }

  try {
    const res = await fetchWithRetry(NEXON_API_BASE_TW + '/id?character_name=' + encodeURIComponent('oRumi幸運星'), {
      headers: {
        'x-nxopen-api-key': cleanKey,
      },
    });

    if (res.status === 401 || res.status === 403) {
      return { success: false, error: 'API Key 無效或已過期，請確認是否為新楓之谷 (TW) 的 API Key！' };
    }

    if (res.status === 429) {
      return { success: false, error: 'Nexon API 連線頻率過高 (HTTP 429)，請稍候 3 秒後再試！' };
    }

    if (res.ok) {
      return { success: true };
    }

    if (res.status === 400) {
      const errData = await res.json().catch(() => ({}));
      if (
        errData.error?.name === 'OPENAPI00004' ||
        errData.error?.message?.includes('Please input valid character_name') ||
        errData.error?.message?.includes('valid')
      ) {
        return { success: true };
      }
      return { success: false, error: errData.error?.message || ('連線失敗 (HTTP ' + res.status + ')') };
    }

    const errData = await res.json().catch(() => ({}));
    return { success: false, error: errData.error?.message || ('連線失敗 (HTTP ' + res.status + ')') };
  } catch (err: any) {
    return { success: false, error: err?.message || '無法連線至 Nexon Open API 伺服器，請檢查網路連線！' };
  }
}

/**
 * 透過角色名稱向台灣新楓之谷 (TMS) Nexon Open API 查詢角色立繪與基本資訊
 * 包含安全的 Rate Limit 限流與 429 智慧重試
 */
export async function fetchNexonCharacterInfo(
  characterName: string,
  apiKey?: string
): Promise<NexonCharacterInfo | null> {
  const cleanName = characterName.trim();
  const activeKey = (apiKey || getNexonApiKey()).trim();

  if (!cleanName || !activeKey) return null;

  try {
    // 1. 透過角色名稱查詢 OCID (使用台灣新楓之谷 TMS 端點)
    const ocidRes = await fetchWithRetry(NEXON_API_BASE_TW + '/id?character_name=' + encodeURIComponent(cleanName), {
      headers: {
        'x-nxopen-api-key': activeKey,
      },
    });

    if (!ocidRes.ok) {
      return null;
    }

    const ocidData = await ocidRes.json();
    const ocid = ocidData.ocid;
    if (!ocid) return null;

    // 禮貌性微延遲 300ms 防止高頻觸發 Nexon 429
    await sleep(300);

    // 2. 透過 OCID 查詢角色基本資訊 (包含最新高清立繪 character_image)
    const basicRes = await fetchWithRetry(NEXON_API_BASE_TW + '/character/basic?ocid=' + encodeURIComponent(ocid), {
      headers: {
        'x-nxopen-api-key': activeKey,
      },
    });

    if (!basicRes.ok) {
      return null;
    }

    const basicData = await basicRes.json();

    return {
      ocid,
      characterName: basicData.character_name || cleanName,
      characterImage: basicData.character_image || '',
      characterLevel: basicData.character_level,
      characterClass: basicData.character_class,
      worldName: basicData.world_name,
    };
  } catch (err) {
    console.warn('查詢 Nexon 角色資料失敗 (' + cleanName + '):', err);
    return null;
  }
}
