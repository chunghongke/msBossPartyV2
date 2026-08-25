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
  reorderCharacters: (playerName: string, reorderedChars: Character[]) => Promise<void>;
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
          setStore({
            teams: rawStore.teams || {},
            weeklyRecords: rawStore.weeklyRecords || {},
            guests: Array.isArray(rawGuests) ? rawGuests : Object.values(rawGuests),
            lastResetWeekKey: rawStore.lastResetWeekKey,
          });
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

  const reorderCharacters = useCallback(
    async (playerName: string, reorderedCharacters: Character[]) => {
      const updated = players.map((p) => {
        if (p.name === playerName) {
          return {
            ...p,
            characters: reorderedCharacters,
          };
        }
        return p;
      });
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
    },
    [players, savePlayersToCloud]
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
        reorderCharacters,
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
