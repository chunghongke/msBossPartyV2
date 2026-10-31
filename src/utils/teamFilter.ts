import { StoreData } from '@/types/party';
import { Boss } from '@/types/boss';

export type TeamFilterMode = 'all' | 'solo' | 'party';

/**
 * 檢查角色在特定 BOSS (與刷次 entryIndex) 是否為單人隊伍
 * 條件：
 * 1. BOSS 本身為單人限定 (例如 maxPartySize === 1 的賽季 BOSS 凱伊)
 * 2. 尚未建立隊伍 (無 teamId)
 * 3. 隊伍有效成員數 <= 1 (包含單人隊伍、或隊友為已刪除之 Guest)
 */
export function checkIsSoloTeam(
  charId: string,
  boss: Boss,
  entryIndex: number,
  store: StoreData
): boolean {
  if (boss.maxPartySize === 1) return true;

  const recKey = `rec_${charId}_${boss.id}_${entryIndex}`;
  const rec = store.weeklyRecords[recKey];
  if (!rec?.teamId) return true;

  const team = store.teams[rec.teamId];
  if (!team) return true;

  const rawMembers = team.memberTargets || (team.memberCharIds || []).map((id) => ({ charId: id, entryIndex }));
  const guestList = store.guests || [];
  const validMembers = rawMembers.filter((m: any) => {
    if (!m.charId.startsWith('guest_')) return true;
    return guestList.some((g) => g.id === m.charId);
  });

  const teamSize = validMembers.length > 0 ? validMembers.length : 1;
  return teamSize <= 1;
}

/**
 * 檢查角色在特定 BOSS 是否為多人隊伍 (成員數 >= 2)
 */
export function checkIsPartyTeam(
  charId: string,
  boss: Boss,
  entryIndex: number,
  store: StoreData
): boolean {
  return !checkIsSoloTeam(charId, boss, entryIndex, store);
}

/**
 * 取得指定玩家的隊伍過濾偏好
 * 預設為 'all' (顯示全部隊伍)
 */
export function getLocalPlayerTeamFilter(playerName: string): TeamFilterMode {
  try {
    const val = localStorage.getItem(`boss_party_team_filter_${playerName}`);
    if (val === 'solo' || val === 'party') return val;
    return 'all';
  } catch {
    return 'all';
  }
}

/**
 * 儲存指定玩家的隊伍過濾偏好至 LocalStorage
 */
export function saveLocalPlayerTeamFilter(playerName: string, filter: TeamFilterMode) {
  try {
    localStorage.setItem(`boss_party_team_filter_${playerName}`, filter);
  } catch {}
}

/**
 * 取得指定 BOSS 隊伍的有效攻略時間 memo (分鐘)
 * 1. 優先取該角色的 record.clearTime
 * 2. 若未設定，取 team.clearTime
 * 3. 若未設定，檢查該隊伍是否有其他隊友已設定 record.clearTime (同隊隊友共享)
 */
export function getEffectiveClearTime(
  recordKey: string,
  charId: string,
  bossId: string,
  entryIndex: number,
  store: StoreData
): number | null {
  const rec = store.weeklyRecords?.[recordKey];
  if (rec && typeof rec.clearTime === 'number' && rec.clearTime > 0) {
    return rec.clearTime;
  }

  const teamId = rec?.teamId || `single_${charId}_${bossId}_${entryIndex}`;
  if (!teamId || teamId.startsWith('single_')) {
    return null;
  }

  const team = store.teams?.[teamId];
  if (team && typeof team.clearTime === 'number' && team.clearTime > 0) {
    return team.clearTime;
  }

  // 檢查同隊伍中是否有其他隊友已設定 clearTime
  if (store.weeklyRecords) {
    for (const r of Object.values(store.weeklyRecords)) {
      if (r && r.teamId === teamId && typeof r.clearTime === 'number' && r.clearTime > 0) {
        if (r.bossId === bossId) {
          return r.clearTime;
        }
      }
    }
  }

  return null;
}
