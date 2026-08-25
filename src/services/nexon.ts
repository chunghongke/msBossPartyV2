// 台灣新楓之谷 (TMS) 官方 Open API 端點
const NEXON_API_BASE_TW = 'https://open.api.nexon.com/maplestorytw/v1';
const NEXON_API_BASE_GLOBAL = 'https://open.api.nexon.com/maplestory/v1';
const STORAGE_KEY = 'boss_party_nexon_api_key';

export interface NexonCharacterInfo {
  ocid: string;
  characterName: string;
  characterImage: string;
  characterLevel?: number;
  characterClass?: string;
  worldName?: string;
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
 * 測試 Nexon API Key 是否有效 (優先測試 TMS maplestorytw，相容 KMS maplestory)
 */
export async function testNexonApiKey(key: string): Promise<{ success: boolean; error?: string }> {
  const cleanKey = key.trim();
  if (!cleanKey) {
    return { success: false, error: '請輸入 Nexon Open API Key！' };
  }

  try {
    // 優先以新楓之谷 (TMS) 端點測試連線
    const res = await fetch(`${NEXON_API_BASE_TW}/id?character_name=${encodeURIComponent('oRumi幸運星')}`, {
      headers: {
        'x-nxopen-api-key': cleanKey,
      },
    });

    if (res.status === 401 || res.status === 403) {
      return { success: false, error: 'API Key 無效或已過期，請確認是否為新楓之谷 (TW) 的 API Key！' };
    }

    if (res.status === 429) {
      return { success: false, error: 'Nexon API 呼叫次數達上限，請稍後再試！' };
    }

    if (res.ok) {
      return { success: true };
    }

    // 若 TMS 提示 400 (角色未找到)，但 Key 驗證通過，也算測試成功
    if (res.status === 400) {
      const errData = await res.json().catch(() => ({}));
      // OPENAPI00004 代表角色不存在，但 API Key 是合法的
      if (errData.error?.name === 'OPENAPI00004' || errData.error?.message?.includes('Please input valid character_name')) {
        return { success: true };
      }
      return { success: false, error: errData.error?.message || `連線失敗 (HTTP ${res.status})` };
    }

    const errData = await res.json().catch(() => ({}));
    return { success: false, error: errData.error?.message || `連線失敗 (HTTP ${res.status})` };
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

  // 嘗試的 API 端點清單 (新楓之谷 TMS 優先)
  const bases = [NEXON_API_BASE_TW, NEXON_API_BASE_GLOBAL];

  for (const base of bases) {
    try {
      // 1. 透過角色名稱查詢 OCID
      const ocidRes = await fetch(`${base}/id?character_name=${encodeURIComponent(cleanName)}`, {
        headers: {
          'x-nxopen-api-key': activeKey,
        },
      });

      if (!ocidRes.ok) {
        continue;
      }

      const ocidData = await ocidRes.json();
      const ocid = ocidData.ocid;
      if (!ocid) continue;

      // 2. 透過 OCID 查詢角色基本資訊 (包含最新立繪 character_image)
      const basicRes = await fetch(`${base}/character/basic?ocid=${encodeURIComponent(ocid)}`, {
        headers: {
          'x-nxopen-api-key': activeKey,
        },
      });

      if (!basicRes.ok) {
        continue;
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
      console.warn(`查詢 Nexon 角色資料失敗 (${base}):`, err);
    }
  }

  return null;
}
