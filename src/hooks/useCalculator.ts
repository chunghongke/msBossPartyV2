import { useCallback } from 'react';
import { Character } from '@/types/player';
import { StoreData } from '@/types/party';
import { getBoss } from '@/data/bosses';
import { getCurrentResetWeekKey } from '@/hooks/useWeeklyReset';
import { checkIsSoloTeam, checkIsPartyTeam, TeamFilterMode, getEffectiveClearTime } from '@/utils/teamFilter';

export interface CrystalCountStats {
  sold: number; // 本週總已賣出結晶數 (含當週擊破之黑魔法師)
  expected: number; // 本週預計總結晶數 (常態周王 + 若當週已擊破黑魔則 +1)
  weeklyBossSold: number; // 純每週常態 BOSS 已賣出
  weeklyBossExpected: number; // 純每週常態 BOSS 目前設定數量
  max: number; // 單角色上限 (若當週攻略黑魔為 13，否則為 12)
  maxLabel: string; // '12+1' 或 '12'
  hasMonthlyAvailable: boolean; // 是否有排定黑魔
  isMonthlyDoneThisWeek: boolean; // 黑魔是否於本週擊破
  isMonthlySoldInPastWeek: boolean; // 黑魔是否已於本月先前週次擊破
  isOverLimit: boolean; // 是否超過角色上限 (weeklyBossSold > 12 或 sold > max)
  isExpectedOverLimit: boolean; // 排定周王是否超過 12 顆上限 (weeklyBossExpected > 12)
  monthlySold: number; // 本月黑魔已完成數量
  monthlyExpected: number; // 本月黑魔設定數量
}

export interface PlayerCrystalCountStats {
  weeklySold: number; // 本週已賣結晶總數 (包含當週擊破之黑魔法師)
  weeklyExpected: number; // 目前設定的周王數量 (不包含黑魔法師)
  weeklyBossSold: number; // 純每週常態 BOSS 已賣出
  weeklyBossExpected: number; // 純每週常態 BOSS 目前設定數量
  monthlySold: number; // 本月黑魔已完成數量
  monthlyExpected: number; // 本月黑魔設定數量
  monthlySoldThisWeek: number; // 本週擊破之黑魔數量
  max: number; // 90 (周王數量上限)
  isOverLimit: boolean; // 週王已賣出數量是否超過 90 (不包含黑魔法師)
  isExpectedOverLimit: boolean; // 週王設定數量是否超過 90 (不包含黑魔法師)
  totalSold: number;
  totalExpected: number;
}

export interface CharacterClearTimeStats {
  total: number; // 總攻略時間 (分鐘)
  completed: number; // 已攻略時間 (已完成 BOSS 的時間總和，分鐘)
  remaining: number; // 剩餘攻略時間 (未完成 BOSS 的時間總和，分鐘)
  count: number; // 設定了時間的 BOSS 數量
}

export interface CrystalMesoStats {
  earned: number; // 總計 (每週 + 黑魔法師)
  expected: number; // 總計 (每週 + 黑魔法師)
  weeklyEarned: number; // 純每週常態 BOSS 已獲得
  weeklyExpected: number; // 純每週常態 BOSS 預計
  monthlyEarned: number; // 黑魔法師已獲得 (當週擊破)
  monthlyExpected: number; // 黑魔法師預計 (當週待攻略或已攻略)
}

/**
 * 把原始結晶錢數值格式化成「億」（四捨五入到億之後的第一位，例：18810990000 -> "188.1億"）
 */
export function formatCrystal(rawValue: number): string {
  if (!rawValue || rawValue <= 0) return '0.0億';
  if (rawValue >= 10000000) {
    const yi = rawValue / 100000000;
    return `${yi.toFixed(1)}億`;
  }
  const manValue = Math.round(rawValue / 10000);
  return `${manValue}萬`;
}

/**
 * 把艾里溫碎片數量格式化成千分位整數
 */
export function formatShardNumber(num: number): string {
  if (!num || num <= 0) return '0';
  return Math.round(num).toLocaleString('zh-TW');
}

export function useCalculator(store: StoreData) {
  /**
   * 計算角色本週的結晶楓幣：分開計算每週常態 BOSS 與黑魔法師（每月 BOSS）
   * 黑魔法師若於本週擊破計入本週收益；若已於先前週次擊破，則不重複計入本週收益
   */
  const calculateCrystal = useCallback(
    (character: Character): CrystalMesoStats => {
      let weeklyEarned = 0;
      let weeklyExpected = 0;
      let monthlyEarned = 0;
      let monthlyExpected = 0;

      const processEntry = (bossId: string, entryIndex: number) => {
        const boss = getBoss(bossId);
        if (!boss || !boss.crystalValue) return;

        const recKey = `rec_${character.id}_${bossId}_${entryIndex}`;
        const rec = store.weeklyRecords[recKey];
        const teamId = rec?.teamId;
        const team = teamId ? store.teams[teamId] : null;

        const rawMembers = team ? team.memberTargets || [] : [];
        const validMembers = rawMembers.filter((m) => {
          if (!m.charId.startsWith('guest_')) return true;
          return (store.guests || []).some((g) => g.id === m.charId);
        });

        const teamSize = validMembers.length > 0 ? validMembers.length : 1;
        const perPlayerValue = Math.floor(boss.crystalValue / teamSize);

        if (boss.isMonthly) {
          // 💡 黑魔法師（每月 BOSS）：一個月結算一次，整月期間均維持當月預計與完成收益，不隨每週重算
          monthlyExpected += perPlayerValue;
          if (rec?.isCompleted) {
            monthlyEarned += perPlayerValue;
          }
        } else {
          // 常態每週 BOSS
          weeklyExpected += perPlayerValue;
          if (rec?.isCompleted) {
            weeklyEarned += perPlayerValue;
          }
        }
      };

      (character.bossIds || []).forEach((bId) => processEntry(bId, 1));
      (character.resetBossIds || []).forEach((bId) => processEntry(bId, 2));

      return {
        earned: weeklyEarned + monthlyEarned,
        expected: weeklyExpected + monthlyExpected,
        weeklyEarned,
        weeklyExpected,
        monthlyEarned,
        monthlyExpected,
      };
    },
    [store]
  );

  /**
   * 計算角色本週販售結晶數量：已獲得 (完成的)、預計總數 (排定的全部有結晶 BOSS)
   * 單一角色每週常態上限 12 顆；若當週攻略黑魔法師（每月獨立結晶），該週可賣 12 + 1 = 13 顆
   * 若黑魔法師已於本月先前週次擊破並售出，本週不再計入且恢復為 12 顆常態上限
   */
  const calculateCrystalCount = useCallback(
    (character: Character): CrystalCountStats => {
      let weeklyBossSold = 0;
      let weeklyBossExpected = 0;
      let monthlySold = 0;
      let monthlyExpected = 0;
      let isMonthlyDoneThisWeek = false;
      let isMonthlySoldInPastWeek = false;
      const currentWeekKey = getCurrentResetWeekKey();

      const processEntry = (bossId: string, entryIndex: number) => {
        const boss = getBoss(bossId);
        if (!boss || !boss.crystalValue) return;

        const recKey = `rec_${character.id}_${bossId}_${entryIndex}`;
        const rec = store.weeklyRecords[recKey];

        if (boss.isMonthly) {
          // 💡 黑魔法師（每月 BOSS）：獨立統計數量
          monthlyExpected += 1;
          if (rec?.isCompleted) {
            monthlySold += 1;
            const isDoneThisWeek = !rec.completedWeekKey || rec.completedWeekKey === currentWeekKey;
            if (isDoneThisWeek) {
              isMonthlyDoneThisWeek = true;
            } else {
              isMonthlySoldInPastWeek = true;
            }
          }
        } else {
          // 每週常態 BOSS
          weeklyBossExpected += 1;
          if (rec?.isCompleted) {
            weeklyBossSold += 1;
          }
        }
      };

      (character.bossIds || []).forEach((bId) => processEntry(bId, 1));
      (character.resetBossIds || []).forEach((bId) => processEntry(bId, 2));

      // 💡 點選黑魔法師卡片完成時，該週的結晶已賣數量也要 +1 (12+1)
      const sold = weeklyBossSold + (isMonthlyDoneThisWeek ? 1 : 0);
      const expected = weeklyBossExpected + (isMonthlyDoneThisWeek ? 1 : 0);
      const max = isMonthlyDoneThisWeek ? 13 : 12;
      const maxLabel = isMonthlyDoneThisWeek ? '12+1' : '12';

      return {
        sold,
        expected,
        weeklyBossSold,
        weeklyBossExpected,
        max,
        maxLabel,
        hasMonthlyAvailable: monthlyExpected > 0,
        isMonthlyDoneThisWeek,
        isMonthlySoldInPastWeek,
        isOverLimit: weeklyBossSold > 12 || sold > max,
        isExpectedOverLimit: weeklyBossExpected > 12,
        monthlySold,
        monthlyExpected,
      };
    },
    [store]
  );

  /**
   * 計算玩家（同伺服器名下所有角色）結晶數量總和
   * 周王每週上限 90 顆（不包含黑魔法師）；當週擊破黑魔法師時，該週已賣數量 +1
   */
  const calculatePlayerCrystalCount = useCallback(
    (characters: Character[]): PlayerCrystalCountStats => {
      let weeklyBossSold = 0;
      let weeklyBossExpected = 0;
      let monthlySold = 0;
      let monthlyExpected = 0;
      let monthlySoldThisWeek = 0;

      (characters || []).forEach((char) => {
        const stats = calculateCrystalCount(char);
        weeklyBossSold += stats.weeklyBossSold;
        weeklyBossExpected += stats.weeklyBossExpected;
        monthlySold += stats.monthlySold;
        monthlyExpected += stats.monthlyExpected;
        if (stats.isMonthlyDoneThisWeek) {
          monthlySoldThisWeek += 1;
        }
      });

      // 💡 點選黑魔法師卡片完成時，該週的結晶數量也要 +1
      const weeklySold = weeklyBossSold + monthlySoldThisWeek;
      // 💡 每週 BOSS 數量上限為 90 個的限制 (不包含黑魔法師)
      const weeklyExpected = weeklyBossExpected;

      return {
        weeklySold,
        weeklyExpected,
        weeklyBossSold,
        weeklyBossExpected,
        monthlySold,
        monthlyExpected,
        monthlySoldThisWeek,
        totalSold: weeklySold,
        totalExpected: weeklyExpected,
        max: 90,
        // 💡 90 顆上限僅限制每週常態 BOSS（不包含黑魔法師）
        isOverLimit: weeklyBossSold > 90,
        isExpectedOverLimit: weeklyBossExpected > 90,
      };
    },
    [calculateCrystalCount]
  );

  /**
   * 計算角色本週的艾里溫碎片：
   * - 碎片的「每份」固定是 boss.erionVestiges / boss.maxPartySize
   * - 單人隊伍 (只有自己)：視為撿走全部 (boss.erionVestiges)，自動算滿額
   * - 多人隊伍：預計數量固定用「1 份 (unitShare)」當基準；
   *   已完成的部分：
   *   - 若 shardMode === 'quantity'：若有指定數量則為該數量，否則為 unitShare
   *   - 若 shardMode === 'shares'：依選擇的份數 (record.shardShares ?? 1) 計算
   */
  const calculateShard = useCallback(
    (character: Character): { earned: number; expected: number } => {
      let earned = 0;
      let expected = 0;

      const processEntry = (bossId: string, entryIndex: number) => {
        const boss = getBoss(bossId);
        if (!boss || !boss.erionVestiges) return;

        const recKey = `rec_${character.id}_${bossId}_${entryIndex}`;
        const rec = store.weeklyRecords[recKey];
        const teamId = rec?.teamId;
        const team = teamId ? store.teams[teamId] : null;

        const rawMembers = team ? team.memberTargets || [] : [];
        const validMembers = rawMembers.filter((m) => {
          if (!m.charId.startsWith('guest_')) return true;
          return (store.guests || []).some((g) => g.id === m.charId);
        });

        const isSolo = validMembers.length <= 1;
        const maxPartySize = boss.maxPartySize || 1;
        const unitShare = boss.erionVestiges / maxPartySize;

        expected += isSolo ? boss.erionVestiges : unitShare;

        if (rec?.isCompleted) {
          if (rec.shardMode === 'quantity') {
            const hasChosenQty = typeof rec.shardQuantity === 'number';
            earned += isSolo ? boss.erionVestiges : (hasChosenQty ? (rec.shardQuantity as number) : unitShare);
          } else {
            const hasChosen = typeof rec.shardShares === 'number';
            const shares = isSolo ? maxPartySize : (hasChosen ? (rec.shardShares as number) : 1);
            earned += unitShare * shares;
          }
        }
      };

      (character.bossIds || []).forEach((bId) => processEntry(bId, 1));
      (character.resetBossIds || []).forEach((bId) => processEntry(bId, 2));

      return { earned, expected };
    },
    [store]
  );

  /**
   * 計算角色本週已完成擊破數量與總排定數量 (分開常態、賽季與每月)
   */
  const getProgress = useCallback(
    (character: Character): {
      completed: number;
      total: number;
      seasonalCompleted: number;
      seasonalTotal: number;
      monthlyCompleted: number;
      monthlyTotal: number;
    } => {
      let completed = 0;
      let total = 0;
      let seasonalCompleted = 0;
      let seasonalTotal = 0;
      let monthlyCompleted = 0;
      let monthlyTotal = 0;

      const checkEntry = (bossId: string, entryIndex: number) => {
        const boss = getBoss(bossId);
        const recKey = `rec_${character.id}_${bossId}_${entryIndex}`;
        const isDone = Boolean(store.weeklyRecords[recKey]?.isCompleted);

        if (boss?.isMonthly) {
          monthlyTotal += 1;
          if (isDone) monthlyCompleted += 1;
        } else if (boss?.isSeasonal || boss?.excludeFromWeeklyLimit) {
          seasonalTotal += 1;
          if (isDone) seasonalCompleted += 1;
        } else {
          total += 1;
          if (isDone) completed += 1;
        }
      };

      (character.bossIds || []).forEach((bId) => checkEntry(bId, 1));
      (character.resetBossIds || []).forEach((bId) => checkEntry(bId, 2));

      return { completed, total, seasonalCompleted, seasonalTotal, monthlyCompleted, monthlyTotal };
    },
    [store]
  );

  /**
   * 找出角色「本週已完成，但已被移出 BOSS 清單」的紀錄（唯讀顯示、不可再互動切換）
   */
  const getRemovedCompletedBosses = useCallback(
    (character: Character): { bossId: string; entryIndex: number; bossName: string }[] => {
      const removed: { bossId: string; entryIndex: number; bossName: string }[] = [];
      if (!store.weeklyRecords) return removed;

      Object.values(store.weeklyRecords).forEach((record) => {
        if (!record || record.charId !== character.id || !record.isCompleted) return;

        const stillAssigned =
          record.entryIndex === 2
            ? character.resetBossIds && character.resetBossIds.includes(record.bossId)
            : character.bossIds && character.bossIds.includes(record.bossId);

        if (stillAssigned) return;

        const boss = getBoss(record.bossId);
        if (!boss) return;

        removed.push({
          bossId: record.bossId,
          entryIndex: record.entryIndex,
          bossName: record.entryIndex === 2 ? `${boss.name}(重置)` : boss.name,
        });
      });

      return removed;
    },
    [store.weeklyRecords]
  );

  /**
   * 計算角色的攻略時間 (分鐘 memo)：
   * 包含排定的每週常態 BOSS、重置券 BOSS 與每月黑魔法師之 clearTime 總和
   * 支援依據隊伍過濾模式 (全部 'all'、個人 'solo'、多人 'party') 篩選
   */
  const calculateClearTime = useCallback(
    (character: Character, teamFilter: TeamFilterMode = 'all'): CharacterClearTimeStats => {
      let total = 0;
      let completed = 0;
      let count = 0;

      const processEntry = (bossId: string, entryIndex: number) => {
        const boss = getBoss(bossId);
        if (!boss) return;

        if (teamFilter === 'solo' && !checkIsSoloTeam(character.id, boss, entryIndex, store)) {
          return;
        }
        if (teamFilter === 'party' && !checkIsPartyTeam(character.id, boss, entryIndex, store)) {
          return;
        }

        const recKey = `rec_${character.id}_${bossId}_${entryIndex}`;
        const rec = store.weeklyRecords[recKey];
        const effectiveClearTime = getEffectiveClearTime(recKey, character.id, bossId, entryIndex, store);
        if (effectiveClearTime) {
          total += effectiveClearTime;
          count += 1;
          if (rec?.isCompleted) {
            completed += effectiveClearTime;
          }
        }
      };

      (character.bossIds || []).forEach((bId) => processEntry(bId, 1));
      (character.resetBossIds || []).forEach((bId) => processEntry(bId, 2));

      return {
        total,
        completed,
        remaining: Math.max(0, total - completed),
        count,
      };
    },
    [store]
  );

  return {
    calculateCrystal,
    calculateCrystalCount,
    calculatePlayerCrystalCount,
    calculateClearTime,
    getRemovedCompletedBosses,
    calculateShard,
    getProgress,
    formatCrystal,
    formatShardNumber,
  };
}
