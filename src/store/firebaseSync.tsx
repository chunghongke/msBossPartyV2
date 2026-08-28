import React, { useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { getRtdb } from '@/services/firebase';
import { useGroup } from '@/contexts/GroupContext';
import { useAppStore } from './index';
import { DEFAULT_STORE } from './slices/storeSlice';
import { sanitizeStoreAndTeams } from './sanitize';
import { Player } from '@/types/player';

export function FirebaseSyncProvider({ children }: { children: React.ReactNode }) {
  const { activeGroup, isLoading: isGroupLoading } = useGroup();

  useEffect(() => {
    const store = useAppStore.getState();
    store.setActiveGroup(activeGroup);

    if (isGroupLoading) {
      store.setIsLoading(true);
      return;
    }

    if (!activeGroup?.firebaseConfig) {
      store.setPlayers([]);
      store.setStore(DEFAULT_STORE);
      store.setIsLoading(false);
      return;
    }

    store.setIsLoading(true);
    const db = getRtdb(activeGroup.firebaseConfig);

    // 監聽根目錄以兼顧直接匯入與巢狀結構
    const rootRef = ref(db, '/');
    const unsub = onValue(
      rootRef,
      (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          store.setPlayers([]);
          store.setStore(DEFAULT_STORE);
          store.setIsLoading(false);
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
        store.setPlayers(parsedPlayers);

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
          store.setStore(normalizedStore);

          if (changed && activeGroup?.firebaseConfig) {
            const currentDb = getRtdb(activeGroup.firebaseConfig);
            set(ref(currentDb, 'store'), normalizedStore).catch((e) =>
              console.warn('Auto-sanitize sync error:', e)
            );
          }
        } else {
          store.setStore(DEFAULT_STORE);
        }

        store.setIsLoading(false);
      },
      (error) => {
        console.error('Firebase DB read error:', error);
        store.setIsLoading(false);
      }
    );

    return () => {
      unsub();
    };
  }, [activeGroup, isGroupLoading]);

  return <>{children}</>;
}
