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

  renameCharacter: async (charId: string, newName: string) => {
    const { players, savePlayersToCloud } = get();
    const updated = players.map((p) => ({
      ...p,
      characters: (p.characters || []).map((c) => (c.id === charId ? { ...c, name: newName } : c)),
    }));
    await savePlayersToCloud(updated);
  },
});
