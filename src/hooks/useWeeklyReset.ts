import { useState, useEffect, useCallback, useRef } from 'react';
import { StoreData, Team, WeeklyRecord } from '@/types/party';
import { Player } from '@/types/player';
import { useAppStore } from '@/store';
import { getBoss } from '@/data/bosses';

export function getCurrentResetWeekKey(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = (day - 4 + 7) % 7;
  const thursday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff, 0, 0, 0, 0);
  const y = thursday.getFullYear();
  const m = String(thursday.getMonth() + 1).padStart(2, '0');
  const d = String(thursday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getCurrentResetMonthKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function getNextResetCountdown(): { days: number; hours: number; minutes: number; text: string } {
  const now = new Date();
  const day = now.getDay();
  let daysUntilThursday = (4 - day + 7) % 7;
  if (daysUntilThursday === 0) {
    daysUntilThursday = 7;
  }
  const nextThursday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilThursday, 0, 0, 0, 0);
  const diffMs = nextThursday.getTime() - now.getTime();

  const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const text = `${days} 天 ${hh} 小時 ${mm} 分`;

  return { days, hours, minutes, text };
}

export function useWeeklyReset(
  store: StoreData,
  players: Player[],
  saveStore: (newStore: StoreData) => Promise<void>,
  isStoreLoading: boolean = false
) {
  const [countdown, setCountdown] = useState(getNextResetCountdown());

  const checkAndPerformWeeklyReset = useCallback(async () => {
    if (isStoreLoading || !store || Object.keys(store.weeklyRecords || {}).length === 0) return;

    const currentWeekKey = getCurrentResetWeekKey();
    const currentMonthKey = getCurrentResetMonthKey();
    const currentLatest = useAppStore.getState().store;

    const isWeekResetNeeded = !currentLatest.lastResetWeekKey || currentLatest.lastResetWeekKey !== currentWeekKey;
    const isMonthResetNeeded = !currentLatest.lastResetMonthKey || currentLatest.lastResetMonthKey !== currentMonthKey;

    if (!isWeekResetNeeded && !isMonthResetNeeded) {
      return;
    }

    // 若第一次套用（無 lastResetWeekKey 或無 lastResetMonthKey），記錄當前基準週期，不洗掉既有資料
    const isFirstWeekSetup = !currentLatest.lastResetWeekKey;
    const isFirstMonthSetup = !currentLatest.lastResetMonthKey;

    if (isFirstWeekSetup || isFirstMonthSetup) {
      await saveStore({
        ...currentLatest,
        lastResetWeekKey: currentLatest.lastResetWeekKey || currentWeekKey,
        lastResetMonthKey: currentLatest.lastResetMonthKey || currentMonthKey,
      });
      return;
    }

    const updatedRecords: Record<string, WeeklyRecord> = {};
    Object.entries(currentLatest.weeklyRecords || {}).forEach(([key, rec]) => {
      const boss = getBoss(rec.bossId);
      const isMonthlyBoss = Boolean(boss?.isMonthly);

      if (isMonthlyBoss) {
        if (isMonthResetNeeded) {
          // 跨月重置每月 BOSS 完成狀態
          updatedRecords[key] = {
            ...rec,
            isCompleted: false,
            completedWeekKey: null,
            shardShares: null,
            shardQuantity: null,
          };
        } else {
          // 僅跨週，完整保留每月 BOSS 完成狀態與資料 (保留完成之週次標記)
          updatedRecords[key] = {
            ...rec,
            completedWeekKey: rec.completedWeekKey || (rec.isCompleted ? (currentLatest.lastResetWeekKey || 'previous') : null),
          };
        }
      } else {
        if (isWeekResetNeeded) {
          // 跨週重置每週常態與賽季 BOSS
          updatedRecords[key] = {
            ...rec,
            isCompleted: false,
            completedWeekKey: null,
            // 艾里溫碎片：若上週有完成且有紀錄，存入 lastWeek 作為本週提示
            lastWeekShardShares:
              rec.isCompleted && rec.shardShares !== null && rec.shardShares !== undefined
                ? rec.shardShares
                : (rec.lastWeekShardShares ?? null),
            lastWeekShardQuantity:
              rec.isCompleted && rec.shardQuantity !== null && rec.shardQuantity !== undefined
                ? rec.shardQuantity
                : (rec.lastWeekShardQuantity ?? null),
            shardShares: null,
            shardQuantity: null,
          };
        } else {
          // 僅跨月，完整保留每週 BOSS 完成狀態
          updatedRecords[key] = rec;
        }
      }
    });

    const updatedTeams: Record<string, Team> = {};
    Object.entries(currentLatest.teams || {}).forEach(([tId, team]) => {
      if (isWeekResetNeeded && team.schedule && team.schedule.tempOverride) {
        updatedTeams[tId] = {
          ...team,
          schedule: {
            ...team.schedule,
            tempOverride: null,
          },
        };
      } else {
        updatedTeams[tId] = team;
      }
    });

    const nextStore: StoreData = {
      ...currentLatest,
      weeklyRecords: updatedRecords,
      teams: updatedTeams,
      lastResetWeekKey: isWeekResetNeeded ? currentWeekKey : currentLatest.lastResetWeekKey,
      lastResetMonthKey: isMonthResetNeeded ? currentMonthKey : currentLatest.lastResetMonthKey,
    };

    const resetLabels: string[] = [];
    if (isWeekResetNeeded) resetLabels.push(`每週（${currentWeekKey}）`);
    if (isMonthResetNeeded) resetLabels.push(`每月（${currentMonthKey}）`);
    console.log(`🗓️ 偵測到新週期【${resetLabels.join(' & ')}】，已重置對應 BOSS 完成狀態`);
    await saveStore(nextStore);
  }, [store, saveStore, isStoreLoading]);

  // 定期每 30 秒更新倒數計時器，並自動檢測是否跨週四 00:00 或每月 1 號 00:00 自動觸發重置
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getNextResetCountdown());
      if (!isStoreLoading && store) {
        const currentWeekKey = getCurrentResetWeekKey();
        const currentMonthKey = getCurrentResetMonthKey();
        if (
          !store.lastResetWeekKey || store.lastResetWeekKey !== currentWeekKey ||
          !store.lastResetMonthKey || store.lastResetMonthKey !== currentMonthKey
        ) {
          checkAndPerformWeeklyReset();
        }
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [isStoreLoading, store, checkAndPerformWeeklyReset]);

  const ensureDefaultSingleTeams = useCallback(async () => {
    if (isStoreLoading || !players || players.length === 0) return;

    let hasChanges = false;
    const nextTeams = { ...store.teams };
    const nextRecords = { ...store.weeklyRecords };

    players.forEach((p) => {
      (p.characters || []).forEach((c) => {
        (c.bossIds || []).forEach((bossId) => {
          const recKey = `rec_${c.id}_${bossId}_1`;
          const singleTeamId = `single_${c.id}_${bossId}_1`;

          if (!nextRecords[recKey]) {
            nextRecords[recKey] = {
              charId: c.id,
              bossId,
              entryIndex: 1,
              teamId: singleTeamId,
              isCompleted: false,
            };
            hasChanges = true;
          }

          const existingTeamId = nextRecords[recKey].teamId || singleTeamId;
          const existingTeam = nextTeams[existingTeamId];
          const isReallyInTeam = existingTeam && (
            existingTeamId.startsWith('single_') ||
            (existingTeam.memberTargets || []).some((m: any) => m.charId === c.id && m.entryIndex === 1)
          );

          if (!existingTeam || !isReallyInTeam) {
            nextRecords[recKey] = {
              ...nextRecords[recKey],
              teamId: singleTeamId,
            };
            nextTeams[singleTeamId] = {
              id: singleTeamId,
              memberTargets: [{ charId: c.id, entryIndex: 1 }],
              schedule: null,
            };
            hasChanges = true;
          }
        });

        (c.resetBossIds || []).forEach((bossId) => {
          const recKey = `rec_${c.id}_${bossId}_2`;
          const singleTeamId = `single_${c.id}_${bossId}_2`;

          if (!nextRecords[recKey]) {
            nextRecords[recKey] = {
              charId: c.id,
              bossId,
              entryIndex: 2,
              teamId: singleTeamId,
              isCompleted: false,
            };
            hasChanges = true;
          }

          const existingTeamId = nextRecords[recKey].teamId || singleTeamId;
          const existingTeam = nextTeams[existingTeamId];
          const isReallyInTeam = existingTeam && (
            existingTeamId.startsWith('single_') ||
            (existingTeam.memberTargets || []).some((m: any) => m.charId === c.id && m.entryIndex === 2)
          );

          if (!existingTeam || !isReallyInTeam) {
            nextRecords[recKey] = {
              ...nextRecords[recKey],
              teamId: singleTeamId,
            };
            nextTeams[singleTeamId] = {
              id: singleTeamId,
              memberTargets: [{ charId: c.id, entryIndex: 2 }],
              schedule: null,
            };
            hasChanges = true;
          }
        });
      });
    });

    if (hasChanges) {
      // 🔒 防禦改進：只在本地 Zustand 記憶體中補齊預設單人隊伍，防止畫面渲染缺漏或報錯。
      // ⚠️ 嚴禁在背景自動回寫至雲端，徹底防止網路延遲時把雲端上既有的多人組隊覆蓋拆散為單人隊！
      const currentLatest = useAppStore.getState().store;
      useAppStore.getState().setStore({
        ...currentLatest,
        teams: nextTeams,
        weeklyRecords: nextRecords,
      });
    }
  }, [players, store, isStoreLoading]);

  const lastRunRef = useRef(0);

  useEffect(() => {
    if (!isStoreLoading && store && players.length > 0) {
      const now = Date.now();
      if (now - lastRunRef.current < 5000) return;
      lastRunRef.current = now;

      checkAndPerformWeeklyReset().then(() => {
        ensureDefaultSingleTeams();
      });
    }
  }, [isStoreLoading, store.lastResetWeekKey, store.lastResetMonthKey, players.length]);

  return {
    countdown,
    checkAndPerformWeeklyReset,
    ensureDefaultSingleTeams,
  };
}
