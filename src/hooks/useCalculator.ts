import { useCallback } from 'react';
import { Character } from '@/types/player';
import { StoreData } from '@/types/party';
import { getBoss } from '@/data/bosses';

export interface CrystalCountStats {
  sold: number;
  expected: number;
  max: number;
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

/**
 * 把原始結晶錢數值格式化成「億萬」（例：10368510000 -> "103億6,851萬", 27207040 -> "2720.7萬"）
 */
export function formatCrystal(rawValue: number): string {
  if (!rawValue || rawValue <= 0) return '0萬';
  const manValue = rawValue / 10000; // 換算成「萬」
  const yi = Math.floor(manValue / 10000);
  const remainderMan = manValue - yi * 10000;

  if (yi > 0) {
    if (remainderMan > 0) {
      const manStr = remainderMan >= 1000 ? Math.round(remainderMan).toLocaleString() : remainderMan.toFixed(1);
      return `${yi}億${manStr}萬`;
    }
    return `${yi}億`;
  }
  return `${manValue.toFixed(1)}萬`;
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
   * 計算角色本週的結晶楓幣：已獲得 (完成的)、預計總值 (排定的全部)
   */
  const calculateCrystal = useCallback(
    (character: Character): { earned: number; expected: number } => {
      let earned = 0;
      let expected = 0;

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

        expected += perPlayerValue;
        if (rec?.isCompleted) {
          earned += perPlayerValue;
        }
      };

      (character.bossIds || []).forEach((bId) => processEntry(bId, 1));
      (character.resetBossIds || []).forEach((bId) => processEntry(bId, 2));

      return { earned, expected };
    },
    [store]
  );

  /**
   * 計算角色本週販售結晶數量：已獲得 (完成的)、預計總數 (排定的全部有結晶 BOSS)
   * 單一角色每週上限 12 顆 (包含每週常態、重置 2 刷與黑魔法師，只要 crystalValue > 0)
   */
  const calculateCrystalCount = useCallback(
    (character: Character): CrystalCountStats => {
      let sold = 0;
      let expected = 0;

      const processEntry = (bossId: string, entryIndex: number) => {
        const boss = getBoss(bossId);
        if (!boss || !boss.crystalValue) return;

        expected += 1;
        const recKey = `rec_${character.id}_${bossId}_${entryIndex}`;
        const rec = store.weeklyRecords[recKey];
        if (rec?.isCompleted) {
          sold += 1;
        }
      };

      (character.bossIds || []).forEach((bId) => processEntry(bId, 1));
      (character.resetBossIds || []).forEach((bId) => processEntry(bId, 2));

      return {
        sold,
        expected,
        max: 12,
        isOverLimit: sold > 12,
        isExpectedOverLimit: expected > 12,
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
