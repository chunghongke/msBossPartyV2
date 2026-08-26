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

export function sortPlayersByLocalOrder(players: Player[], currentLoggedInName?: string): Player[] {
  const order = getLocalPlayerOrder();
  
  // 若尚未有自訂排序且有登入者，預設將登入者排在第一位
  if (!order || order.length === 0) {
    if (!currentLoggedInName) return players;
    const current = players.find((p) => p.name === currentLoggedInName);
    if (!current) return players;
    const others = players.filter((p) => p.name !== currentLoggedInName);
    return [current, ...others];
  }

  const playerMap = new Map(players.map((p) => [p.name, p]));
  const sorted: Player[] = [];

  // 依照自訂順序加入
  order.forEach((name) => {
    const p = playerMap.get(name);
    if (p) {
      sorted.push(p);
      playerMap.delete(name);
    }
  });

  // 其餘新加入的玩家排在最後
  playerMap.forEach((p) => {
    sorted.push(p);
  });

  return sorted;
}
