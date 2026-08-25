import { Character } from '@/types/player';

export function getLocalCharacterOrder(playerName: string): string[] {
  try {
    const raw = localStorage.getItem(`boss_party_char_order_${playerName}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalCharacterOrder(playerName: string, charIds: string[]) {
  try {
    localStorage.setItem(`boss_party_char_order_${playerName}`, JSON.stringify(charIds));
  } catch {}
}

export function sortCharactersByLocalOrder(playerName: string, characters: Character[]): Character[] {
  const order = getLocalCharacterOrder(playerName);
  if (!order || order.length === 0) return characters;

  const charMap = new Map(characters.map((c) => [c.id, c]));
  const sorted: Character[] = [];

  // 依照自訂順序加入
  order.forEach((id) => {
    const c = charMap.get(id);
    if (c) {
      sorted.push(c);
      charMap.delete(id);
    }
  });

  // 其餘新加入的角色排在最後
  charMap.forEach((c) => {
    sorted.push(c);
  });

  return sorted;
}
