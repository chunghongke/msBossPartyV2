const NEXON_API_BASE = 'https://open.api.nexon.com/maplestory/v1';
const STORAGE_KEY = 'boss_party_nexon_api_key';

export interface NexonCharacterInfo {
  ocid: string;
  characterName: string;
  characterImage: string;
  characterLevel?: number;
  characterClass?: string;
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
 * 測試 Nexon API Key 是否有效
 */
export async function testNexonApiKey(key: string): Promise<{ success: boolean; error?: string }> {
  const cleanKey = key.trim();
  if (!cleanKey) {
    return { success: false, error: '請輸入 Nexon Open API Key！' };
  }

  try {
    // 使用熱門官方公眾角色測試連線
    const res = await fetch(`${NEXON_API_BASE}/id?character_name=${encodeURIComponent('oRumi幸運星')}`, {
      headers: {
        'x-nxopen-api-key': cleanKey,
      },
    });

    if (res.status === 401 || res.status === 403) {
      return { success: false, error: 'API Key 無效或已過期，請確認是否為新楓之谷的 API Key！' };
    }

    if (res.status === 429) {
      return { success: false, error: 'Nexon API 呼叫次數達上限，請稍後再試！' };
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.error?.message || `連線失敗 (HTTP ${res.status})` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || '無法連線至 Nexon Open API 伺服器，請檢查網路連線！' };
  }
}

/**
 * 透過角色名稱向 Nexon Open API 查詢角色立繪與基本資訊
 */
export async function fetchNexonCharacterInfo(
  characterName: string,
  apiKey?: string
): Promise<NexonCharacterInfo | null> {
  const cleanName = characterName.trim();
  const activeKey = (apiKey || getNexonApiKey()).trim();

  if (!cleanName || !activeKey) return null;

  try {
    // 1. 透過角色名稱查詢 OCID
    const ocidRes = await fetch(`${NEXON_API_BASE}/id?character_name=${encodeURIComponent(cleanName)}`, {
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

    // 2. 透過 OCID 查詢角色立繪與基礎資料
    const basicRes = await fetch(`${NEXON_API_BASE}/character/basic?ocid=${encodeURIComponent(ocid)}`, {
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
    };
  } catch (error) {
    console.error('Fetch Nexon character info error:', error);
    return null;
  }
}
