import { Player } from '@/types/player';

// V1.0 官方標準 Salt
const DEFAULT_SALT = 'msbossmemo_secure_salt_2026';

// 備用/舊版相容 Salt 清單
const COMPAT_SALTS = [
  'msbossmemo_secure_salt_2026',
  'ms_boss_memo_salt_2026',
];

/**
 * 密碼 SHA-256 雜湊計算 (與 V1.0 演算法 100% 完全對齊)
 */
export async function hashPassword(password: string, salt: string = DEFAULT_SALT): Promise<string> {
  if (!password) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode(password + ':' + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 輔助無冒號雜湊計算 (用於極端相容)
 */
async function hashRaw(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 密碼驗證 (支援多版本 Salt 自動相容校驗)
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash || !password) return false;
  const target = storedHash.trim().toLowerCase();

  // 1. 優先以 V1.0 標準雜湊驗證 (password + ':' + salt)
  for (const salt of COMPAT_SALTS) {
    const computed = await hashPassword(password, salt);
    if (computed.toLowerCase() === target) {
      return true;
    }
  }

  // 2. 次要以無冒號格式驗證 (password + salt)
  for (const salt of COMPAT_SALTS) {
    const computed = await hashRaw(password, salt);
    if (computed.toLowerCase() === target) {
      return true;
    }
  }

  // 3. 原始未加鹽 SHA-256 驗證
  const rawHash = await hashRaw(password, '');
  if (rawHash.toLowerCase() === target) {
    return true;
  }

  return false;
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
