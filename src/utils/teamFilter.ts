import { StoreData } from '@/types/party';
import { Boss } from '@/types/boss';

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
 * 取得指定玩家的單人隊伍過濾偏好
 * 預設為 'all' (顯示全部隊伍)
 */
export function getLocalPlayerTeamFilter(playerName: string): 'all' | 'solo' {
  try {
    const val = localStorage.getItem(`boss_party_team_filter_${playerName}`);
    return (val as 'all' | 'solo') || 'all';
  } catch {
    return 'all';
  }
}

/**
 * 儲存指定玩家的單人隊伍過濾偏好至 LocalStorage
 */
export function saveLocalPlayerTeamFilter(playerName: string, filter: 'all' | 'solo') {
  try {
    localStorage.setItem(`boss_party_team_filter_${playerName}`, filter);
  } catch {}
}
