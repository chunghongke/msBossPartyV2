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
  saveTeamAndRecords: (team: Team, updatedRecords: Record<string, WeeklyRecord>) => Promise<void>;
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
    async (team: Team, updatedRecords: Record<string, WeeklyRecord>) => {
      const nextTeams = {
        ...store.teams,
        [team.id]: team,
      };
      const nextRecords = {
        ...store.weeklyRecords,
        ...updatedRecords,
      };
      await saveStoreToCloud({
        ...store,
        teams: nextTeams,
        weeklyRecords: nextRecords,
      });
    },
    [store, saveStoreToCloud]
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
