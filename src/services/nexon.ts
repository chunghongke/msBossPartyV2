const NEXON_API_BASE = 'https://open.api.nexon.com/maplestory/v1';

// 支援從環境變數讀取，預設不硬編碼任何明文密鑰
const DEFAULT_NEXON_API_KEY = (import.meta as any).env?.VITE_NEXON_API_KEY || '';

export interface NexonCharacterInfo {
  ocid: string;
  characterName: string;
  characterImage: string;
  characterLevel?: number;
  characterClass?: string;
}

export async function fetchNexonCharacterInfo(
  characterName: string,
  apiKey: string = DEFAULT_NEXON_API_KEY
): Promise<NexonCharacterInfo | null> {
  const cleanName = characterName.trim();
  if (!cleanName || !apiKey) return null;

  try {
    const ocidRes = await fetch(`${NEXON_API_BASE}/id?character_name=${encodeURIComponent(cleanName)}`, {
      headers: {
        'x-nxopen-api-key': apiKey,
      },
    });

    if (!ocidRes.ok) {
      return null;
    }

    const ocidData = await ocidRes.json();
    const ocid = ocidData.ocid;
    if (!ocid) return null;

    const basicRes = await fetch(`${NEXON_API_BASE}/character/basic?ocid=${encodeURIComponent(ocid)}`, {
      headers: {
        'x-nxopen-api-key': apiKey,
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
