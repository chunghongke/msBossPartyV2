import React, { useEffect } from 'react';
import { ref, onValue, get, update } from 'firebase/database';
import { getRtdb } from '@/services/firebase';
import { useGroup } from '@/contexts/GroupContext';
import { useAppStore } from './index';
import { DEFAULT_STORE, hasPendingStoreWrites, lockWritesDuringResync } from './slices/storeSlice';
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

                // 💡 關鍵修復：改用 update 避免覆蓋其他獨立節點
                update(ref(currentDb, 'store'), payload)
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
