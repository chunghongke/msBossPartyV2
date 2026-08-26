import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { Player, Character } from '@/types/player';
import { StoreData, Team, WeeklyRecord, Guest } from '@/types/party';
import { useGroup } from './GroupContext';
import { getRtdb } from '@/services/firebase';

interface StoreContextType {
  players: Player[];
  store: StoreData;
  isLoading: boolean;
  savePlayersToCloud: (players: Player[]) => Promise<void>;
  saveStoreToCloud: (store: StoreData) => Promise<void>;
  getAllCharacters: () => (Character & { playerName: string })[];
  getCharName: (charId: string) => string;
  toggleBossStatus: (recordKey: string) => Promise<void>;
  updateWeeklyRecord: (recordKey: string, partialRecord: Partial<WeeklyRecord>) => Promise<void>;
  saveTeamAndRecords: (team: Team, updatedRecords: Record<string, WeeklyRecord>, bossId?: string) => Promise<void>;
  addGuest: (guestName: string) => Promise<Guest>;
  deleteGuest: (guestId: string) => Promise<void>;
  addPlayer: (newPlayer: Player) => Promise<void>;
  updatePlayer: (updatedPlayer: Player) => Promise<void>;
  deletePlayer: (playerName: string) => Promise<void>;
  addCharacter: (playerName: string, newChar: Character) => Promise<void>;
  updateCharacter: (playerName: string, updatedChar: Character) => Promise<void>;
  renameCharacter: (charId: string, newName: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | null>(null);

const DEFAULT_STORE: StoreData = {
  teams: {},
  weeklyRecords: {},
  guests: [],
};

function sanitizeStoreAndTeams(
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
      const parts = teamId.split('_');
      if (parts.length >= 2) teamBossId = parts[1];
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

  // 2. 雙向同步校驗：確保多人隊伍內的所有成員，其 weeklyRecord 的 teamId 均正確指向該多人隊伍
  Object.entries(rawStore.teams).forEach(([teamId, team]) => {
    if (teamId.startsWith('single_') || !team || !team.memberTargets || team.memberTargets.length <= 1) return;

    let teamBossId = '';
    for (const r of Object.values(rawStore.weeklyRecords)) {
      if (r && r.teamId === teamId && r.bossId) {
        teamBossId = r.bossId;
        break;
      }
    }
    if (!teamBossId && teamId.startsWith('party_')) {
      const parts = teamId.split('_');
      if (parts.length >= 2) teamBossId = parts[1];
    }
    if (!teamBossId) return;

    team.memberTargets.forEach((m: any) => {
      if (m.charId.startsWith('guest_')) return;
      const recKey = `rec_${m.charId}_${teamBossId}_${m.entryIndex}`;
      const rec = rawStore.weeklyRecords[recKey];
      if (rec && rec.teamId !== teamId) {
        rawStore.weeklyRecords[recKey] = {
          ...rec,
          teamId,
        };
        hasChanged = true;
      }
    });
  });

  // 3. 幽靈隊伍 GC：清除沒有任何 weeklyRecord 引用的非 single_ 隊伍
  const allRecords = Object.values(rawStore.weeklyRecords);
  Object.keys(rawStore.teams).forEach((teamId) => {
    if (teamId.startsWith('single_')) return;
    const isReferenced = allRecords.some((r: any) => r && r.teamId === teamId);
    if (!isReferenced) {
      delete rawStore.teams[teamId];
      hasChanged = true;
    }
  });

  return hasChanged;
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeGroup } = useGroup();
  const [players, setPlayers] = useState<Player[]>([]);
  const [store, setStore] = useState<StoreData>(DEFAULT_STORE);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!activeGroup?.firebaseConfig) {
      setPlayers([]);
      setStore(DEFAULT_STORE);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const db = getRtdb(activeGroup.firebaseConfig);

    // 監聽根目錄以兼顧直接匯入與巢狀結構
    const rootRef = ref(db, '/');
    const unsub = onValue(
      rootRef,
      (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          setPlayers([]);
          setStore(DEFAULT_STORE);
          setIsLoading(false);
          return;
        }

        // 1. 解析 Players
        let rawPlayers = data.players;
        if (rawPlayers && rawPlayers.players) {
          rawPlayers = rawPlayers.players;
        }
        let parsedPlayers: Player[] = [];
        if (rawPlayers) {
          const list = Array.isArray(rawPlayers) ? rawPlayers : Object.values(rawPlayers);
          parsedPlayers = list.filter((p): p is Player => Boolean(p && typeof p === 'object' && p.name));
        }
        setPlayers(parsedPlayers);

        // 2. 解析 Store (teams, weeklyRecords, guests)
        let rawStore = data.store;
        if (!rawStore && data.players && data.players.store) {
          rawStore = data.players.store;
        }
        if (!rawStore && (data.teams || data.weeklyRecords)) {
          rawStore = {
            teams: data.teams || {},
            weeklyRecords: data.weeklyRecords || {},
            guests: data.guests || [],
            lastResetWeekKey: data.lastResetWeekKey,
          };
        }

        if (rawStore) {
          const rawGuests = rawStore.guests || [];
          const normalizedStore = {
            teams: rawStore.teams || {},
            weeklyRecords: rawStore.weeklyRecords || {},
            guests: Array.isArray(rawGuests) ? rawGuests : Object.values(rawGuests),
            lastResetWeekKey: rawStore.lastResetWeekKey,
          };

          // 執行自我修復與幽靈隊伍 GC (Self-Healing)
          const changed = sanitizeStoreAndTeams(parsedPlayers, normalizedStore);
          setStore(normalizedStore);

          if (changed && activeGroup?.firebaseConfig) {
            const db = getRtdb(activeGroup.firebaseConfig);
            set(ref(db, 'store'), normalizedStore).catch((e) =>
              console.warn('Auto-sanitize sync error:', e)
            );
          }
        } else {
          setStore(DEFAULT_STORE);
        }

        setIsLoading(false);
      },
      (error) => {
        console.error('Firebase DB read error:', error);
        setIsLoading(false);
      }
    );

    return () => {
      unsub();
    };
  }, [activeGroup]);

  const savePlayersToCloud = useCallback(
    async (newPlayers: Player[]) => {
      if (!activeGroup?.firebaseConfig) return;
      setPlayers(newPlayers);
      const db = getRtdb(activeGroup.firebaseConfig);
      await set(ref(db, 'players'), newPlayers);
    },
    [activeGroup]
  );

  const saveStoreToCloud = useCallback(
    async (newStore: StoreData) => {
      if (!activeGroup?.firebaseConfig) return;
      setStore(newStore);
      const db = getRtdb(activeGroup.firebaseConfig);
      await set(ref(db, 'store'), newStore);
    },
    [activeGroup]
  );

  const getAllCharacters = useCallback(() => {
    const list: (Character & { playerName: string })[] = [];
    players.forEach((p) => {
      (p.characters || []).forEach((c) => {
        list.push({ ...c, playerName: p.name });
      });
    });
    return list;
  }, [players]);

  const getCharName = useCallback(
    (charId: string): string => {
      const allChars = getAllCharacters();
      const c = allChars.find((x) => x.id === charId);
      if (c) return c.name;

      const g = (store.guests || []).find((x) => x.id === charId);
      if (g) return `${g.name}(臨時)`;

      return '未知角色';
    },
    [getAllCharacters, store.guests]
  );

  const toggleBossStatus = useCallback(
    async (recordKey: string) => {
      const targetRecord = store.weeklyRecords[recordKey];
      const targetTeamId = targetRecord?.teamId;
      const nextCompleted = !targetRecord?.isCompleted;

      const nextRecords = { ...store.weeklyRecords };

      if (targetTeamId && store.teams[targetTeamId]) {
        const team = store.teams[targetTeamId];
        const bossId = targetRecord?.bossId || (typeof recordKey === 'string' ? recordKey.split('_')[2] : '');

        const members = team.memberTargets || (team.memberCharIds || []).map((id) => ({ charId: id, entryIndex: 1 }));
        members.forEach((member) => {
          const mKey = `rec_${member.charId}_${bossId}_${member.entryIndex}`;
          nextRecords[mKey] = {
            ...(nextRecords[mKey] || {
              charId: member.charId,
              bossId,
              entryIndex: member.entryIndex,
              teamId: targetTeamId,
            }),
            isCompleted: nextCompleted,
          };
        });
      } else {
        const parts = typeof recordKey === 'string' ? recordKey.split('_') : [];
        nextRecords[recordKey] = {
          ...(targetRecord || {
            charId: parts[1],
            bossId: parts[2],
            entryIndex: Number(parts[3]) || 1,
          }),
          isCompleted: nextCompleted,
        };
      }

      await saveStoreToCloud({
        ...store,
        weeklyRecords: nextRecords,
      });
    },
    [store, saveStoreToCloud]
  );

  const updateWeeklyRecord = useCallback(
    async (recordKey: string, partialRecord: Partial<WeeklyRecord>) => {
      const existing = store.weeklyRecords[recordKey] || {};
      const nextRecords = {
        ...store.weeklyRecords,
        [recordKey]: {
          ...existing,
          ...partialRecord,
        } as WeeklyRecord,
      };
      await saveStoreToCloud({
        ...store,
        weeklyRecords: nextRecords,
      });
    },
    [store, saveStoreToCloud]
  );

  const saveTeamAndRecords = useCallback(
    async (team: Team, updatedRecords: Record<string, WeeklyRecord>, bossId?: string) => {
      const nextTeams = { ...store.teams };
      const nextWeeklyRecords = { ...store.weeklyRecords };

      // 1. 取得本次組隊涵蓋的所有成員 targets
      const currentTargets = team.memberTargets || [];

      // 2. 針對加入本隊伍的所有成員，檢查並退出他們原本參與的其他隊伍 (避免雙重組隊與殘留幽靈隊友)
      currentTargets.forEach((t) => {
        Object.entries(nextTeams).forEach(([tId, existingTeam]) => {
          if (tId === team.id) return;
          if (tId.startsWith('single_')) return;

          const hasMember = (existingTeam.memberTargets || []).some(
            (m) => m.charId === t.charId && m.entryIndex === t.entryIndex
          );

          if (hasMember) {
            // 從原隊伍移除此成員
            const remainingMembers = (existingTeam.memberTargets || []).filter(
              (m) => !(m.charId === t.charId && m.entryIndex === t.entryIndex)
            );

            if (remainingMembers.length <= 1) {
              // 原隊伍剩餘人數 <= 1 人，自動解散該隊伍
              delete nextTeams[tId];

              // 若剩餘 1 人，且該隊友「沒有加入新隊伍」，將其恢復為單人隊伍 (single team)
              if (remainingMembers.length === 1) {
                const solo = remainingMembers[0];
                const isSoloInNewTeam = currentTargets.some(
                  (m) => m.charId === solo.charId && m.entryIndex === solo.entryIndex
                );

                if (!isSoloInNewTeam) {
                  const bId = bossId || (existingTeam.id.startsWith('party_') ? existingTeam.id.split('_')[1] : '');
                  const recKey = bId ? `rec_${solo.charId}_${bId}_${solo.entryIndex}` : null;
                  const defaultSingleId = bId
                    ? `single_${solo.charId}_${bId}_${solo.entryIndex}`
                    : `single_${solo.charId}_${solo.entryIndex}`;

                  if (recKey && nextWeeklyRecords[recKey]) {
                    nextWeeklyRecords[recKey] = {
                      ...nextWeeklyRecords[recKey],
                      teamId: defaultSingleId,
                    };
                  }

                  nextTeams[defaultSingleId] = {
                    id: defaultSingleId,
                    memberTargets: [solo],
                    schedule: null,
                  };
                }
              }
            } else {
              // 隊伍仍有多人，更新剩餘成員
              nextTeams[tId] = {
                ...existingTeam,
                memberTargets: remainingMembers,
              };
            }
          }
        });
      });

      // 3. 寫入新隊伍與清理空隊伍
      if (team.memberTargets.length > 0) {
        nextTeams[team.id] = team;
      } else {
        delete nextTeams[team.id];
      }

      // 4. 強制覆蓋寫入所有新隊伍成員的 updatedRecords，確保每個成員的 weeklyRecord 100% 正確指向新隊伍
      Object.entries(updatedRecords).forEach(([recKey, recVal]) => {
        nextWeeklyRecords[recKey] = {
          ...(nextWeeklyRecords[recKey] || {}),
          ...recVal,
          teamId: team.id,
        };
      });

      // 5. 再次呼叫 sanitizeStoreAndTeams 進行最終雙向校驗與防禦修復
      sanitizeStoreAndTeams(players, {
        teams: nextTeams,
        weeklyRecords: nextWeeklyRecords,
        guests: store.guests || [],
      });

      await saveStoreToCloud({
        ...store,
        teams: nextTeams,
        weeklyRecords: nextWeeklyRecords,
      });
    },
    [store, players, saveStoreToCloud]
  );

  const addGuest = useCallback(
    async (name: string): Promise<Guest> => {
      const newGuest: Guest = {
        id: `guest_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: name.trim(),
      };
      const nextGuests = [...(store.guests || []), newGuest];
      await saveStoreToCloud({
        ...store,
        guests: nextGuests,
      });
      return newGuest;
    },
    [store, saveStoreToCloud]
  );

  const deleteGuest = useCallback(
    async (guestId: string) => {
      const nextGuests = (store.guests || []).filter((g) => g.id !== guestId);
      const nextTeams = { ...store.teams };
      Object.keys(nextTeams).forEach((tId) => {
        nextTeams[tId] = {
          ...nextTeams[tId],
          memberTargets: (nextTeams[tId].memberTargets || []).filter((m) => m.charId !== guestId),
          memberCharIds: (nextTeams[tId].memberCharIds || []).filter((id) => id !== guestId),
        };
      });

      await saveStoreToCloud({
        ...store,
        guests: nextGuests,
        teams: nextTeams,
      });
    },
    [store, saveStoreToCloud]
  );

  const addPlayer = useCallback(
    async (newPlayer: Player) => {
      const updated = [...players, newPlayer];
      await savePlayersToCloud(updated);
    },
    [players, savePlayersToCloud]
  );

  const updatePlayer = useCallback(
    async (updatedPlayer: Player) => {
      const updated = players.map((p) => (p.name === updatedPlayer.name ? updatedPlayer : p));
      await savePlayersToCloud(updated);
    },
    [players, savePlayersToCloud]
  );

  const deletePlayer = useCallback(
    async (playerName: string) => {
      const updated = players.filter((p) => p.name !== playerName);
      await savePlayersToCloud(updated);
    },
    [players, savePlayersToCloud]
  );

    const addCharacter = useCallback(
    async (playerName: string, newChar: Character) => {
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
    [players, savePlayersToCloud]
  );

  const updateCharacter = useCallback(
    async (playerName: string, updatedChar: Character) => {
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
            };
          } else {
            // 未完成：重置為預設 single 未完成
            nextWeeklyRecords[recKey] = {
              ...existingRec,
              teamId: defaultSingleId,
              isCompleted: false,
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

      await savePlayersToCloud(updated);

      if (storeDirty) {
        await saveStoreToCloud({
          ...store,
          teams: nextTeams,
          weeklyRecords: nextWeeklyRecords,
        });
      }
    },
    [players, store, savePlayersToCloud, saveStoreToCloud]
  );

  const renameCharacter = useCallback(
    async (charId: string, newName: string) => {
      const updated = players.map((p) => ({
        ...p,
        characters: (p.characters || []).map((c) => (c.id === charId ? { ...c, name: newName } : c)),
      }));
      await savePlayersToCloud(updated);
    },
    [players, savePlayersToCloud]
  );

  return (
    <StoreContext.Provider
      value={{
        players,
        store,
        isLoading,
        toggleBossStatus,
        updateWeeklyRecord,
        saveTeamAndRecords,
        addGuest,
        deleteGuest,
        addPlayer,
        updatePlayer,
        deletePlayer,
        addCharacter,
        updateCharacter,
        renameCharacter,
        savePlayersToCloud,
        saveStoreToCloud,
        getAllCharacters,
        getCharName,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore 必須在 StoreProvider 內部使用！');
  }
  return context;
};
