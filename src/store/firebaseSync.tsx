import React, { useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { getRtdb } from '@/services/firebase';
import { useGroup } from '@/contexts/GroupContext';
import { useAppStore } from './index';
import { DEFAULT_STORE, hasPendingStoreWrites } from './slices/storeSlice';
import { sanitizeStoreAndTeams } from './sanitize';
import { Player } from '@/types/player';

// 模組層級熔斷器：防止多次自動回寫遭遇錯誤時引發無窮重試流量黑洞
let _lastSanitizeWriteTime = 0;
let _sanitizeFailCount = 0;

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

    let playersLoaded = false;
    let storeLoaded = false;

    const checkInitialLoadingDone = () => {
      if (playersLoaded && storeLoaded) {
        store.setIsLoading(false);
      }
    };

    // 1. 獨立監聽 players 節點（不讀取根節點）
    const playersRef = ref(db, 'players');
    const unsubPlayers = onValue(
      playersRef,
      (snapshot) => {
        let rawPlayers = snapshot.val();
        if (rawPlayers && rawPlayers.players) {
          rawPlayers = rawPlayers.players;
        }
        let parsedPlayers: Player[] = [];
        if (rawPlayers) {
          const list = Array.isArray(rawPlayers) ? rawPlayers : Object.values(rawPlayers);
          parsedPlayers = list.filter((p): p is Player => Boolean(p && typeof p === 'object' && p.name));
        }
        store.setPlayers(parsedPlayers);

        playersLoaded = true;
        checkInitialLoadingDone();
      },
      (error) => {
        console.error('Firebase DB players read error:', error);
        playersLoaded = true;
        checkInitialLoadingDone();
      }
    );

    // 2. 獨立監聽 store 節點（不讀取根節點）
    const storeRef = ref(db, 'store');
    const unsubStore = onValue(
      storeRef,
      (snapshot) => {
        let rawStore = snapshot.val();
        if (rawStore && rawStore.store) {
          rawStore = rawStore.store;
        }

        if (rawStore) {
          const rawGuests = rawStore.guests || [];
          const normalizedStore = {
            teams: rawStore.teams || {},
            weeklyRecords: rawStore.weeklyRecords || {},
            guests: Array.isArray(rawGuests) ? rawGuests : Object.values(rawGuests),
            lastResetWeekKey: rawStore.lastResetWeekKey,
            loots: rawStore.loots || {},
          };

          // 執行自我修復與幽靈隊伍 GC (Self-Healing)
          // 🔒 防呆保護：若玩家資料尚未讀取完成 (currentPlayers 為空)，絕不執行破壞性隊伍解散
          const currentPlayers = useAppStore.getState().players;
          const changed = currentPlayers.length > 0
            ? sanitizeStoreAndTeams(currentPlayers, normalizedStore)
            : false;

          // 🔒 防競爭保護：若有正在進行中的本地寫入（防抖尚未發送或剛發送），
          //    則跳過此次 onValue 覆蓋與自動修復回寫，避免舊快照把本地樂觀更新的狀態回滾。
          if (!hasPendingStoreWrites()) {
            store.setStore(normalizedStore);

            if (changed && activeGroup?.firebaseConfig) {
              const now = Date.now();
              // 熔斷防禦：若先前曾發生寫入錯誤（如權限被拒），冷卻 60 秒；平時修復回寫間隔至少 10 秒
              const cooldownMs = _sanitizeFailCount > 0 ? 60000 : 10000;
              if (now - _lastSanitizeWriteTime >= cooldownMs) {
                _lastSanitizeWriteTime = now;
                const currentDb = getRtdb(activeGroup.firebaseConfig);
                const payload: Record<string, any> = {
                  teams: normalizedStore.teams || {},
                  weeklyRecords: normalizedStore.weeklyRecords || {},
                  guests: normalizedStore.guests || [],
                };
                if (normalizedStore.lastResetWeekKey) {
                  payload.lastResetWeekKey = normalizedStore.lastResetWeekKey;
                }
                if (normalizedStore.loots) {
                  payload.loots = normalizedStore.loots;
                }

                set(ref(currentDb, 'store'), payload)
                  .then(() => {
                    _sanitizeFailCount = 0;
                  })
                  .catch((e) => {
                    _sanitizeFailCount++;
                    console.warn('Auto-sanitize sync error (熔斷保護中，冷卻 60 秒避免流量迴圈):', e);
                  });
              }
            }
          }
        } else {
          store.setStore(DEFAULT_STORE);
        }

        storeLoaded = true;
        checkInitialLoadingDone();
      },
      (error) => {
        console.error('Firebase DB store read error:', error);
        storeLoaded = true;
        checkInitialLoadingDone();
      }
    );

    return () => {
      unsubPlayers();
      unsubStore();
    };
  }, [activeGroup, isGroupLoading]);

  return <>{children}</>;
}
