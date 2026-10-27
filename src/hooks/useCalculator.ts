import { useCallback } from 'react';
import { Character } from '@/types/player';
import { StoreData } from '@/types/party';
import { getBoss } from '@/data/bosses';
import { getCurrentResetWeekKey } from '@/hooks/useWeeklyReset';

export interface CrystalCountStats {
  sold: number;
  expected: number;
  max: number; // 12 或 13 (當週有黑魔法師可賣時為 13)
  maxLabel: string; // '12' 或 '12+1'
  hasMonthlyAvailable: boolean; // 當週是否有黑魔額度 (本週完成或本月待攻略)
  isMonthlySoldInPastWeek: boolean; // 黑魔是否已在先前週次售出
  isOverLimit: boolean;
  isExpectedOverLimit: boolean;
}

export interface PlayerCrystalCountStats {
  totalSold: number;
  totalExpected: number;
  max: number;
  isOverLimit: boolean;
  isExpectedOverLimit: boolean;
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
      const currentWeekKey = getCurrentResetWeekKey();

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
          if (rec?.isCompleted) {
            // 若為本週擊破（或無週次紀錄之舊資料），計入本週已獲得與預計
            const isDoneThisWeek = !rec.completedWeekKey || rec.completedWeekKey === currentWeekKey;
            if (isDoneThisWeek) {
              monthlyEarned += perPlayerValue;
              monthlyExpected += perPlayerValue;
            }
            // 若為先前週次擊破：結晶已在先前賣掉，本週不重複計入
          } else {
            // 本月尚未擊破：預期本週打完可領取
            monthlyExpected += perPlayerValue;
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
      let sold = 0;
      let expected = 0;
      let hasMonthlyAvailable = false;
      let isMonthlySoldInPastWeek = false;
      const currentWeekKey = getCurrentResetWeekKey();

      const processEntry = (bossId: string, entryIndex: number) => {
        const boss = getBoss(bossId);
        if (!boss || !boss.crystalValue) return;

        const recKey = `rec_${character.id}_${bossId}_${entryIndex}`;
        const rec = store.weeklyRecords[recKey];

        if (boss.isMonthly) {
          if (rec?.isCompleted) {
            const isDoneThisWeek = !rec.completedWeekKey || rec.completedWeekKey === currentWeekKey;
            if (isDoneThisWeek) {
              // 本週擊破黑魔法師：本週可賣 12 + 1 顆，本週 sold + 1, expected + 1
              hasMonthlyAvailable = true;
              sold += 1;
              expected += 1;
            } else {
              // 已經在前幾週擊破並售出：本週無法再打，不計入本週，不佔本週額度
              isMonthlySoldInPastWeek = true;
            }
          } else {
            // 本月尚未擊破：當週若擊破可享 12 + 1 額度，expected + 1
            hasMonthlyAvailable = true;
            expected += 1;
          }
        } else {
          // 每週常態 BOSS
          expected += 1;
          if (rec?.isCompleted) {
            sold += 1;
          }
        }
      };

      (character.bossIds || []).forEach((bId) => processEntry(bId, 1));
      (character.resetBossIds || []).forEach((bId) => processEntry(bId, 2));

      const max = hasMonthlyAvailable ? 13 : 12;
      const maxLabel = hasMonthlyAvailable ? '12+1' : '12';

      return {
        sold,
        expected,
        max,
        maxLabel,
        hasMonthlyAvailable,
        isMonthlySoldInPastWeek,
        isOverLimit: sold > max,
        isExpectedOverLimit: expected > max,
      };
    },
    [store]
  );

  /**
   * 計算玩家（同伺服器名下所有角色）本週販售結晶數量總和
   * 同伺服器每週上限 90 顆 (包含每週常態、重置 2 刷與黑魔法師，只要 crystalValue > 0)
   */
  const calculatePlayerCrystalCount = useCallback(
    (characters: Character[]): PlayerCrystalCountStats => {
      let totalSold = 0;
      let totalExpected = 0;

      (characters || []).forEach((char) => {
        const stats = calculateCrystalCount(char);
        totalSold += stats.sold;
        totalExpected += stats.expected;
      });

      return {
        totalSold,
        totalExpected,
        max: 90,
        isOverLimit: totalSold > 90,
        isExpectedOverLimit: totalExpected > 90,
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

  return {
    calculateCrystal,
    calculateCrystalCount,
    calculatePlayerCrystalCount,
    getRemovedCompletedBosses,
    calculateShard,
    getProgress,
    formatCrystal,
    formatShardNumber,
  };
}
