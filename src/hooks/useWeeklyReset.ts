import { useState, useEffect, useCallback } from 'react';
import { StoreData, Team, WeeklyRecord } from '@/types/party';
import { Player } from '@/types/player';

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
    if (store.lastResetWeekKey && store.lastResetWeekKey === currentWeekKey) {
      return;
    }

    // 若第一次套用（無 lastResetWeekKey），記錄當前基準週，不洗掉既有資料
    if (!store.lastResetWeekKey) {
      await saveStore({
        ...store,
        lastResetWeekKey: currentWeekKey,
      });
      return;
    }

    const updatedRecords: Record<string, WeeklyRecord> = {};
    Object.entries(store.weeklyRecords).forEach(([key, rec]) => {
      updatedRecords[key] = {
        ...rec,
        isCompleted: false,
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
    });

    const updatedTeams: Record<string, Team> = {};
    Object.entries(store.teams || {}).forEach(([tId, team]) => {
      if (team.schedule && team.schedule.tempOverride) {
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
      ...store,
      weeklyRecords: updatedRecords,
      teams: updatedTeams,
      lastResetWeekKey: currentWeekKey,
    };

    console.log(`🗓️ 偵測到新的一週（${currentWeekKey}），已重置每週 BOSS 完成狀態與臨時時間`);
    await saveStore(nextStore);
  }, [store, saveStore, isStoreLoading]);

  // 定期每 30 秒更新倒數計時器，並自動檢測是否跨週四 00:00 自動觸發重置
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getNextResetCountdown());
      if (!isStoreLoading && store) {
        const currentWeekKey = getCurrentResetWeekKey();
        if (!store.lastResetWeekKey || store.lastResetWeekKey !== currentWeekKey) {
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
      await saveStore({
        ...store,
        teams: nextTeams,
        weeklyRecords: nextRecords,
      });
    }
  }, [players, store, saveStore, isStoreLoading]);

  useEffect(() => {
    if (!isStoreLoading && store && players.length > 0) {
      checkAndPerformWeeklyReset().then(() => {
        ensureDefaultSingleTeams();
      });
    }
  }, [isStoreLoading, store.lastResetWeekKey, players.length]);

  return {
    countdown,
    checkAndPerformWeeklyReset,
    ensureDefaultSingleTeams,
  };
}
