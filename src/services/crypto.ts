import { Player } from '@/types/player';

const DEFAULT_SALT = 'ms_boss_memo_salt_2026';

export async function hashPassword(password: string, salt: string = DEFAULT_SALT): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, storedHash: string, salt: string = DEFAULT_SALT): Promise<boolean> {
  if (!storedHash) return false;
  const computed = await hashPassword(password, salt);
  return computed.toLowerCase() === storedHash.toLowerCase();
}

export function isSuperUser(player?: Player | null): boolean {
  if (!player) return false;
  return Boolean(player.isAdmin);
}

export function canManagePlayer(currentPlayer: Player | null, targetPlayerName: string): boolean {
  if (!currentPlayer) return false;
  if (isSuperUser(currentPlayer)) return true;
  return currentPlayer.name.trim().toLowerCase() === targetPlayerName.trim().toLowerCase();
}

export function canManageCharacter(currentPlayer: Player | null, charOwnerPlayerName: string): boolean {
  return canManagePlayer(currentPlayer, charOwnerPlayerName);
}
