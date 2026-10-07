import React, { useEffect } from 'react';
import { ref, onValue, get } from 'firebase/database';
import { getRtdb } from '@/services/firebase';
import { useGroup } from '@/contexts/GroupContext';
import { useAppStore } from './index';
import { DEFAULT_STORE, hasPendingStoreWrites, lockWritesDuringResync, getSuppressSyncRemainingMs } from './slices/storeSlice';
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

    let playersLoaded = false;
    let storeLoaded = false;

    const checkInitialLoadingDone = () => {
      if (playersLoaded && storeLoaded) {
        store.setIsLoading(false);
      }
    };

    // 0. 監聽 Firebase 實體 WebSocket 連線狀態
    const connectedRef = ref(db, '.info/connected');
    const unsubConnected = onValue(connectedRef, (snapshot) => {
      const isConnected = Boolean(snapshot.val());
      if (isConnected) {
        console.log(
          `🟢 [Firebase 連線成功] WebSocket 已與雲端即時連線！\n` +
          `  - 當前小隊: ${activeGroup.name}\n` +
          `  - 專案 ID: ${activeGroup.firebaseConfig.projectId}\n` +
          `  - 資料庫網址: ${activeGroup.firebaseConfig.databaseURL}`
        );
      } else {
        console.warn(
          `🔴 [Firebase 離線中] 目前尚未連上 Firebase 伺服器 (Connected: false)！\n` +
          `  若剛開啟頁面正在建立連線屬正常現象；若持續離線，請檢查網路、廣告攔截器或 Database URL 設定。\n` +
          `  離線狀態下發出的資料寫入會處於等待排隊中，直到連線恢復才會上傳。`
        );
      }
    });

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
    let stashedStoreSnapshot: any = null;
    let stashedFlushTimer: ReturnType<typeof setTimeout> | null = null;

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

          // 🔒 本地防禦校驗：僅在本地記憶體修復幽靈指標與防呆，供畫面正常渲染
          // ⚠️ 嚴禁在背景監聽中主動回寫雲端，徹底杜絕非同步載入時誤殺解散多人隊伍或覆寫戰利品！
          const currentPlayers = useAppStore.getState().players;
          if (currentPlayers.length > 0) {
            sanitizeStoreAndTeams(currentPlayers, normalizedStore);
          }

          // 🔒 防競爭保護：若有正在進行中的本地寫入（防抖尚未發送或剛發送）
          if (hasPendingStoreWrites()) {
            // 💡 抑制期快照暫存補償 (Stashed Snapshot Flush)：
            // 不直接丟棄雲端快照，而是暫存於記憶體中；待抑制期結束後自動補償刷新，確保本地永不落後！
            stashedStoreSnapshot = normalizedStore;
            if (stashedFlushTimer) clearTimeout(stashedFlushTimer);
            const remaining = getSuppressSyncRemainingMs();
            stashedFlushTimer = setTimeout(() => {
              stashedFlushTimer = null;
              if (!hasPendingStoreWrites() && stashedStoreSnapshot) {
                const toApply = stashedStoreSnapshot;
                stashedStoreSnapshot = null;
                const latestPlayers = useAppStore.getState().players;
                if (latestPlayers.length > 0) {
                  sanitizeStoreAndTeams(latestPlayers, toApply);
                }
                store.setStore(toApply);
                console.log('🔄 [Firebase 補償刷新] 已自動同步抑制期間隊友推送的最新雲端狀態！');
              }
            }, Math.max(remaining + 50, 200));
          } else {
            // 無本地寫入排隊，直接應用雲端最新狀態
            stashedStoreSnapshot = null;
            if (stashedFlushTimer) {
              clearTimeout(stashedFlushTimer);
              stashedFlushTimer = null;
            }
            store.setStore(normalizedStore);
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

    // 💡 3. 視窗喚醒與焦點即時強制刷新 (Wake-up & Focus Auto Re-sync)
    // 當隊友手機點亮解鎖、筆電掀開、或切換回本分頁時，立即強制拉取雲端最新快照，並鎖定本地寫入 1.5 秒
    const handleWakeupRefresh = async () => {
      if (document.visibilityState !== 'visible' && !navigator.onLine) return;
      console.log('🔄 [Firebase] 偵測到分頁喚醒 / 焦點切回，鎖定本地寫入並強刷雲端最新狀態...');
      lockWritesDuringResync(1500);

      try {
        const [playersSnap, storeSnap] = await Promise.all([
          get(playersRef),
          get(storeRef),
        ]);

        if (playersSnap.exists()) {
          let rawPlayers = playersSnap.val();
          if (rawPlayers && rawPlayers.players) rawPlayers = rawPlayers.players;
          const list = Array.isArray(rawPlayers) ? rawPlayers : Object.values(rawPlayers);
          const parsed = list.filter((p): p is Player => Boolean(p && typeof p === 'object' && p.name));
          store.setPlayers(parsed);
        }

        if (storeSnap.exists()) {
          let rawStore = storeSnap.val();
          if (rawStore && rawStore.store) rawStore = rawStore.store;
          const rawGuests = rawStore.guests || [];
          const normalized = {
            teams: rawStore.teams || {},
            weeklyRecords: rawStore.weeklyRecords || {},
            guests: Array.isArray(rawGuests) ? rawGuests : Object.values(rawGuests),
            lastResetWeekKey: rawStore.lastResetWeekKey,
            loots: rawStore.loots || {},
          };
          store.setStore(normalized);
        }
        console.log('✅ [Firebase 喚醒刷新] 已成功拉取最新雲端狀態！');
      } catch (err) {
        console.warn('⚠️ [Firebase 喚醒刷新] 拉取失敗:', err);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleWakeupRefresh();
      }
    };

    const handleFocus = () => {
      handleWakeupRefresh();
    };

    const handleOnline = () => {
      handleWakeupRefresh();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      if (stashedFlushTimer) clearTimeout(stashedFlushTimer);
      unsubConnected();
      unsubPlayers();
      unsubStore();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [activeGroup, isGroupLoading]);

  return <>{children}</>;
}
