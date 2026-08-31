import { getBoss, BOSSES } from '@/data/bosses';
import { ref, set } from 'firebase/database';
import { getRtdb } from '@/services/firebase';
import { Player, Character } from '@/types/player';
import { AppSlice, PlayerSlice } from '../types';
import { sanitizeStoreAndTeams } from '../sanitize';

export const createPlayerSlice: AppSlice<PlayerSlice> = (setSlice, get) => ({
  players: [],

  setPlayers: (players) => setSlice({ players }),

  savePlayersToCloud: async (newPlayers: Player[]) => {
    const { activeGroup } = get();
    // 💡 關鍵修復：深層序列化過濾所有 undefined 欄位，徹底防止 Firebase RTDB 拋出 Error: set failed: value contains undefined
    const cleanPlayers = JSON.parse(JSON.stringify(newPlayers));
    setSlice({ players: cleanPlayers });
    if (!activeGroup?.firebaseConfig) return;
    const db = getRtdb(activeGroup.firebaseConfig);
    await set(ref(db, 'players'), cleanPlayers);
  },

  addPlayer: async (newPlayer: Player) => {
    const { players, savePlayersToCloud } = get();
    const updated = [...players, newPlayer];
    await savePlayersToCloud(updated);
  },

  updatePlayer: async (updatedPlayer: Player) => {
    const { players, savePlayersToCloud } = get();
    const updated = players.map((p) => (p.name === updatedPlayer.name ? updatedPlayer : p));
    await savePlayersToCloud(updated);
  },

  deletePlayer: async (playerName: string) => {
    const { players, savePlayersToCloud } = get();
    const updated = players.filter((p) => p.name !== playerName);
    await savePlayersToCloud(updated);
  },

  addCharacter: async (playerName: string, newChar: Character) => {
    const { players, savePlayersToCloud } = get();
    const updated = players.map((p) => {
      if (p.name === playerName) {
        return {
          ...p,
          characters: [...(p.characters || []), newChar],
        };
      }
      return p;
    });
    await savePlayersToCloud(updated);
  },

  updateCharacter: async (playerName: string, updatedChar: Character) => {
    const { players, store, savePlayersToCloud, saveStoreToCloud } = get();

    // 1. 找出原本的角色資料
    let oldChar: Character | undefined;
    for (const p of players) {
      const found = (p.characters || []).find((c) => c.id === updatedChar.id);
      if (found) {
        oldChar = found;
        break;
      }
    }

    // 2. 找出被移除的 BOSS 清單 (首刷與重置刷)
    const oldNormal = oldChar?.bossIds || [];
    const newNormal = updatedChar.bossIds || [];
    const removedNormal = oldNormal.filter((bId) => !newNormal.includes(bId));

    const oldReset = oldChar?.resetBossIds || [];
    const newReset = updatedChar.resetBossIds || [];
    const removedReset = oldReset.filter((bId) => !newReset.includes(bId));

    const removedEntries: { bossId: string; entryIndex: number }[] = [
      ...removedNormal.map((bId) => ({ bossId: bId, entryIndex: 1 })),
      ...removedReset.map((bId) => ({ bossId: bId, entryIndex: 2 })),
    ];

    let nextTeams = { ...(store.teams || {}) };
    let nextWeeklyRecords = { ...(store.weeklyRecords || {}) };
    let storeDirty = false;

    // 3. 處理被移除 BOSS 的組隊退出與解散
    removedEntries.forEach(({ bossId, entryIndex }) => {
      const recKey = `rec_${updatedChar.id}_${bossId}_${entryIndex}`;
      const existingRec = nextWeeklyRecords[recKey];
      const teamId = existingRec?.teamId;

      if (teamId && nextTeams[teamId] && !teamId.startsWith('single_')) {
        const targetTeam = nextTeams[teamId];
        const remainingMembers = (targetTeam.memberTargets || []).filter(
          (m: any) => !(m.charId === updatedChar.id && m.entryIndex === entryIndex)
        );

        if (remainingMembers.length <= 1) {
          // 隊伍只剩 <= 1 人，解散該多人隊伍！
          delete nextTeams[teamId];
          if (remainingMembers.length === 1) {
            const solo = remainingMembers[0];
            const soloDefaultTeamId = `single_${solo.charId}_${bossId}_${solo.entryIndex}`;
            const soloRecKey = `rec_${solo.charId}_${bossId}_${solo.entryIndex}`;

            nextTeams[soloDefaultTeamId] = {
              id: soloDefaultTeamId,
              memberTargets: [solo],
              schedule: null,
            };
            if (nextWeeklyRecords[soloRecKey]) {
              nextWeeklyRecords[soloRecKey] = {
                ...nextWeeklyRecords[soloRecKey],
                teamId: soloDefaultTeamId,
              };
            }
          }
        } else {
          // 隊伍仍有 2 人以上，更新成員名單
          nextTeams[teamId] = {
            ...targetTeam,
            memberTargets: remainingMembers,
          };
        }
        storeDirty = true;
      }

      // 處理該角色自己的 weeklyRecord
      if (existingRec) {
        const defaultSingleId = `single_${updatedChar.id}_${bossId}_${entryIndex}`;
        if (existingRec.isCompleted) {
          // 已完成：保留紀錄 (計入完成次數)，teamId 改為 single
          nextWeeklyRecords[recKey] = {
            ...existingRec,
            teamId: defaultSingleId,
          };
          nextTeams[defaultSingleId] = {
            id: defaultSingleId,
            memberTargets: [{ charId: updatedChar.id, entryIndex }],
            schedule: null,
          };
        } else {
          // 未完成：重置為預設 single 未完成
          nextWeeklyRecords[recKey] = {
            ...existingRec,
            teamId: defaultSingleId,
            isCompleted: false,
          };
          nextTeams[defaultSingleId] = {
            id: defaultSingleId,
            memberTargets: [{ charId: updatedChar.id, entryIndex }],
            schedule: null,
          };
        }
        storeDirty = true;
      }
    });

    // 4. 更新 Players
    const updated = players.map((p) => {
      const isTarget = p.name === playerName || (p.characters || []).some((c) => c.id === updatedChar.id);
      if (isTarget) {
        return {
          ...p,
          characters: (p.characters || []).map((c) => (c.id === updatedChar.id ? updatedChar : c)),
        };
      }
      return p;
    });

    // 5. 確保新加入的 BOSS 有預設的 single 隊伍與紀錄
    const ensureEntries = [
      ...(updatedChar.bossIds || []).map((bId) => ({ bossId: bId, entryIndex: 1 })),
      ...(updatedChar.resetBossIds || []).map((bId) => ({ bossId: bId, entryIndex: 2 })),
    ];

    ensureEntries.forEach(({ bossId, entryIndex }) => {
      const recKey = `rec_${updatedChar.id}_${bossId}_${entryIndex}`;
      const defaultSingleId = `single_${updatedChar.id}_${bossId}_${entryIndex}`;

      if (!nextWeeklyRecords[recKey]) {
        nextWeeklyRecords[recKey] = {
          charId: updatedChar.id,
          bossId,
          entryIndex,
          teamId: defaultSingleId,
          isCompleted: false,
        };
        storeDirty = true;
      }

      const currentTeamId = nextWeeklyRecords[recKey].teamId || defaultSingleId;
      const currentTeam = nextTeams[currentTeamId];
      const isReallyInTeam = currentTeam && (
        currentTeamId.startsWith('single_') ||
        (currentTeam.memberTargets || []).some((m: any) => m.charId === updatedChar.id && m.entryIndex === entryIndex)
      );

      if (!currentTeam || !isReallyInTeam) {
        nextWeeklyRecords[recKey] = {
          ...nextWeeklyRecords[recKey],
          teamId: defaultSingleId,
        };
        nextTeams[defaultSingleId] = {
          id: defaultSingleId,
          memberTargets: [{ charId: updatedChar.id, entryIndex }],
          schedule: null,
        };
        storeDirty = true;
      }
    });

    // 6. 執行全域自我修復與防禦校驗
    const sanitizedChanged = sanitizeStoreAndTeams(updated, {
      teams: nextTeams,
      weeklyRecords: nextWeeklyRecords,
      guests: store.guests || [],
    });

    await savePlayersToCloud(updated);

    if (storeDirty || sanitizedChanged) {
      await saveStoreToCloud({
        ...store,
        teams: nextTeams,
        weeklyRecords: nextWeeklyRecords,
      });
    }
  },

    deleteCharacter: async (playerName: string, charId: string) => {
    const { players, store, savePlayersToCloud, saveStoreToCloud } = get();

    // 1. 從玩家陣列中移除該角色
    const updatedPlayers = players.map((p) => {
      if (p.name === playerName) {
        return {
          ...p,
          characters: (p.characters || []).filter((c) => c.id !== charId),
        };
      }
      return p;
    });

    const nextTeams = { ...(store.teams || {}) };
    const nextWeeklyRecords = { ...(store.weeklyRecords || {}) };

    // 2. 刪除該角色的所有專屬單人隊伍
    Object.keys(nextTeams).forEach((teamId) => {
      if (teamId.startsWith(`single_${charId}_`)) {
        delete nextTeams[teamId];
      }
    });

    // 3. 處理該角色參與的所有多人隊伍 (退出、解散或降級)
    Object.entries(nextTeams).forEach(([teamId, team]) => {
      if (teamId.startsWith('single_')) return;
      const hasChar = (team.memberTargets || []).some((m: any) => m.charId === charId);
      if (!hasChar) return;

      const remaining = (team.memberTargets || []).filter((m: any) => m.charId !== charId);

      const hasRealChar = remaining.some((m: any) => !m.charId.startsWith('guest_'));

      if (!hasRealChar || remaining.length <= 1) {
        // 多人小隊無正式角色或人數 <= 1，解散該隊伍！
        delete nextTeams[teamId];

        // 找出此隊伍所屬的 BOSS ID
        let teamBossId = '';
        for (const r of Object.values(nextWeeklyRecords)) {
          if (r && r.teamId === teamId && r.bossId) {
            teamBossId = r.bossId;
            break;
          }
        }
        if (!teamBossId) {
          const match = BOSSES.find((b) => teamId.includes(`_${b.id}_`));
          if (match) teamBossId = match.id;
        }

        if (remaining.length === 1 && !remaining[0].charId.startsWith('guest_')) {
          const solo = remaining[0];
          if (teamBossId) {
            const defaultSingleId = `single_${solo.charId}_${teamBossId}_${solo.entryIndex}`;
            nextTeams[defaultSingleId] = {
              id: defaultSingleId,
              memberTargets: [solo],
              schedule: team.schedule || null,
            };
            const soloRecKey = `rec_${solo.charId}_${teamBossId}_${solo.entryIndex}`;
            if (nextWeeklyRecords[soloRecKey]) {
              nextWeeklyRecords[soloRecKey] = {
                ...nextWeeklyRecords[soloRecKey],
                teamId: defaultSingleId,
              };
            }
          }
        } else {
          // 若剩餘成員為 Guest，徹底刪除該 Guest 的每週紀錄
          remaining.forEach((m: any) => {
            if (m.charId.startsWith('guest_') && teamBossId) {
              const guestRecKey = `rec_${m.charId}_${teamBossId}_${m.entryIndex || 1}`;
              delete nextWeeklyRecords[guestRecKey];
            }
          });
        }
      } else {
        // 多人小隊仍有 2 人以上，更新成員名單
        nextTeams[teamId] = {
          ...team,
          memberTargets: remaining,
        };

        // 若為掉落艾里溫碎片的 BOSS 且可整除，重新均分份數
        let teamBossId = '';
        for (const r of Object.values(nextWeeklyRecords)) {
          if (r && r.teamId === teamId && r.bossId) {
            teamBossId = r.bossId;
            break;
          }
        }
        const boss = teamBossId ? getBoss(teamBossId) : null;
        if (boss && boss.erionVestiges > 0) {
          const validMembers = remaining.filter((m: any) => {
            if (!m.charId.startsWith('guest_')) return true;
            return (store.guests || []).some((g) => g.id === m.charId);
          });
          const actualSize = validMembers.length;
          const maxPartySize = boss.maxPartySize || 1;
          const dividesEvenly = maxPartySize % actualSize === 0;
          const fairShare = dividesEvenly ? maxPartySize / actualSize : null;

          if (dividesEvenly && fairShare !== null) {
            remaining.forEach((m: any) => {
              const mKey = `rec_${m.charId}_${teamBossId}_${m.entryIndex}`;
              if (nextWeeklyRecords[mKey] && nextWeeklyRecords[mKey].isCompleted) {
                nextWeeklyRecords[mKey] = {
                  ...nextWeeklyRecords[mKey],
                  shardShares: fairShare,
                };
              }
            });
          }
        }
      }
    });

    // 4. 清空該角色的所有每週討伐紀錄
    Object.keys(nextWeeklyRecords).forEach((key) => {
      if (key.startsWith(`rec_${charId}_`)) {
        delete nextWeeklyRecords[key];
      }
    });

    // 5. 清理 localStorage 中的自訂角色排序
    try {
      const orderKey = `boss_party_char_order_${playerName}`;
      const currentOrder = JSON.parse(localStorage.getItem(orderKey) || '[]');
      const nextOrder = currentOrder.filter((id: string) => id !== charId);
      localStorage.setItem(orderKey, JSON.stringify(nextOrder));
    } catch {}

    // 6. 執行全域自我修復與防禦校驗
    sanitizeStoreAndTeams(updatedPlayers, {
      teams: nextTeams,
      weeklyRecords: nextWeeklyRecords,
      guests: store.guests || [],
    });

    // 7. 同步儲存至 Firebase 與 Zustand
    await savePlayersToCloud(updatedPlayers);
    await saveStoreToCloud({
      ...store,
      teams: nextTeams,
      weeklyRecords: nextWeeklyRecords,
    });
  },

  renameCharacter: async (charId: string, newName: string) => {
    const { players, savePlayersToCloud } = get();
    const updated = players.map((p) => ({
      ...p,
      characters: (p.characters || []).map((c) => (c.id === charId ? { ...c, name: newName } : c)),
    }));
    await savePlayersToCloud(updated);
  },
});
