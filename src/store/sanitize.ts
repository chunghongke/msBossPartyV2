import { Player, Character } from '@/types/player';
import { BOSSES } from '@/data/bosses';

export function sanitizeStoreAndTeams(
  parsedPlayers: Player[],
  rawStore: { teams: Record<string, any>; weeklyRecords: Record<string, any>; guests: any[]; lastResetWeekKey?: string }
): boolean {
  if (!rawStore.teams || !rawStore.weeklyRecords) return false;

  let hasChanged = false;
  const allCharsMap = new Map<string, Character>();
  parsedPlayers.forEach((p) => {
    (p.characters || []).forEach((c) => {
      allCharsMap.set(c.id, c);
    });
  });

  const guestIds = new Set((rawStore.guests || []).map((g) => g.id));

  // 1. 檢查所有多人隊伍的成員是否有效
  Object.keys(rawStore.teams).forEach((teamId) => {
    if (teamId.startsWith('single_')) return;
    const team = rawStore.teams[teamId];
    if (!team || !team.memberTargets) return;

    // 找出此隊伍對應的 BOSS ID（從 weeklyRecords 尋找關聯）
    let teamBossId = '';
    for (const r of Object.values(rawStore.weeklyRecords)) {
      if (r && r.teamId === teamId && r.bossId) {
        teamBossId = r.bossId;
        break;
      }
    }

    if (!teamBossId && teamId.startsWith('party_')) {
      const match = BOSSES.find((b) => teamId.includes(`_${b.id}_`));
      if (match) teamBossId = match.id;
      else {
        const parts = teamId.split('_');
        if (parts.length >= 2) teamBossId = parts[1];
      }
    }

    const validMembers = team.memberTargets.filter((m: any) => {
      if (m.charId.startsWith('guest_')) {
        return guestIds.has(m.charId);
      }
      const char = allCharsMap.get(m.charId);
      if (!char) return false;
      if (!teamBossId) return true;

      // 檢查該角色是否仍有排定此 BOSS
      if (m.entryIndex === 2) {
        return Array.isArray(char.resetBossIds) && char.resetBossIds.includes(teamBossId);
      }
      return Array.isArray(char.bossIds) && char.bossIds.includes(teamBossId);
    });

    // 若成員被過濾後只剩 <= 1 人，解散該隊伍
    if (validMembers.length <= 1) {
      if (validMembers.length === 1) {
        const solo = validMembers[0];
        const defaultSingleId = `single_${solo.charId}_${teamBossId}_${solo.entryIndex}`;
        rawStore.teams[defaultSingleId] = {
          id: defaultSingleId,
          memberTargets: [solo],
        };
        const soloRecKey = `rec_${solo.charId}_${teamBossId}_${solo.entryIndex}`;
        if (rawStore.weeklyRecords[soloRecKey]) {
          rawStore.weeklyRecords[soloRecKey] = {
            ...rawStore.weeklyRecords[soloRecKey],
            teamId: defaultSingleId,
          };
        }
      }
      delete rawStore.teams[teamId];
      hasChanged = true;
    } else if (validMembers.length !== team.memberTargets.length) {
      team.memberTargets = validMembers;
      hasChanged = true;
    }
  });

  // 2. 確保多人隊伍中成員的 weeklyRecord.teamId 指向正確
  Object.keys(rawStore.teams).forEach((teamId) => {
    if (teamId.startsWith('single_')) return;
    const team = rawStore.teams[teamId];
    if (!team || !team.memberTargets) return;

    let teamBossId = '';
    for (const r of Object.values(rawStore.weeklyRecords)) {
      if (r && r.teamId === teamId && r.bossId) {
        teamBossId = r.bossId;
        break;
      }
    }
    if (!teamBossId && teamId.startsWith('party_')) {
      const match = BOSSES.find((b) => teamId.includes(`_${b.id}_`));
      if (match) teamBossId = match.id;
      else {
        const parts = teamId.split('_');
        if (parts.length >= 2) teamBossId = parts[1];
      }
    }

    team.memberTargets.forEach((m: any) => {
      const recKey = `rec_${m.charId}_${teamBossId}_${m.entryIndex}`;
      if (rawStore.weeklyRecords[recKey] && rawStore.weeklyRecords[recKey].teamId !== teamId) {
        rawStore.weeklyRecords[recKey].teamId = teamId;
        hasChanged = true;
      }
    });
  });

  // 3. 幽靈隊伍 GC：檢查是否有無人引用的幽靈多人隊伍
  const referencedTeamIds = new Set<string>();
  Object.values(rawStore.weeklyRecords).forEach((r) => {
    if (r && r.teamId) {
      referencedTeamIds.add(r.teamId);
    }
  });

  Object.keys(rawStore.teams).forEach((teamId) => {
    if (teamId.startsWith('single_')) return;
    if (!referencedTeamIds.has(teamId)) {
      delete rawStore.teams[teamId];
      hasChanged = true;
    }
  });

  // 4. 檢查所有 weeklyRecords 的隊伍指標有效性 (Orphaned Record & Missing Member Repair)
  Object.entries(rawStore.weeklyRecords).forEach(([recKey, rec]) => {
    if (!rec || !rec.teamId) return;

    const team = rawStore.teams[rec.teamId];

    // 情況 A：指向的隊伍完全不存在
    if (!team) {
      const defaultSingleId = `single_${rec.charId}_${rec.bossId}_${rec.entryIndex}`;
      rec.teamId = defaultSingleId;
      if (!rawStore.teams[defaultSingleId]) {
        rawStore.teams[defaultSingleId] = {
          id: defaultSingleId,
          memberTargets: [{ charId: rec.charId, entryIndex: rec.entryIndex }],
          schedule: null,
        };
      }
      hasChanged = true;
      return;
    }

    // 情況 B：指向多人隊伍，但該多人隊伍的 memberTargets 中根本沒有這個成員
    if (!rec.teamId.startsWith('single_')) {
      const isMemberInTeam = (team.memberTargets || []).some(
        (m: any) => m.charId === rec.charId && m.entryIndex === rec.entryIndex
      );

      if (!isMemberInTeam) {
        // 此紀錄被孤立在該多人隊伍外，自動重置回預設單人隊伍！
        const defaultSingleId = `single_${rec.charId}_${rec.bossId}_${rec.entryIndex}`;
        rec.teamId = defaultSingleId;
        if (!rawStore.teams[defaultSingleId]) {
          rawStore.teams[defaultSingleId] = {
            id: defaultSingleId,
            memberTargets: [{ charId: rec.charId, entryIndex: rec.entryIndex }],
            schedule: null,
          };
        }
        hasChanged = true;
      }
    }
  });

  return hasChanged;
}
