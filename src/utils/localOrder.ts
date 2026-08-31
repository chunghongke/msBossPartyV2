import { Character, Player } from '@/types/player';

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

export function getLocalPlayerOrder(): string[] {
  try {
    const raw = localStorage.getItem('boss_party_player_order');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalPlayerOrder(playerNames: string[]) {
  try {
    localStorage.setItem('boss_party_player_order', JSON.stringify(playerNames));
  } catch {}
}

/**
 * 排序玩家清單：
 * 💡 規則：若有當前登入者 (currentLoggedInName)，登入者永遠強制固定置頂在第 1 位；
 * 其餘隊員則嚴格依據自訂排序 (Local Order) 排列。
 */
export function sortPlayersByLocalOrder(players: Player[], currentLoggedInName?: string): Player[] {
  const current = currentLoggedInName ? players.find((p) => p.name === currentLoggedInName) : undefined;
  const remainingPlayers = currentLoggedInName
    ? players.filter((p) => p.name !== currentLoggedInName)
    : players;

  const order = getLocalPlayerOrder();
  const playerMap = new Map(remainingPlayers.map((p) => [p.name, p]));
  const sortedOthers: Player[] = [];

  // 依照自訂順序加入其餘玩家
  order.forEach((name) => {
    if (name === currentLoggedInName) return; // 登入者由置頂邏輯處理，跳過
    const p = playerMap.get(name);
    if (p) {
      sortedOthers.push(p);
      playerMap.delete(name);
    }
  });

  // 其餘新加入的玩家排在最後
  playerMap.forEach((p) => {
    sortedOthers.push(p);
  });

  // 當前登入者永遠固定在第 1 位
  return current ? [current, ...sortedOthers] : sortedOthers;
}
