import { useCallback } from 'react';
import { Character } from '@/types/player';
import { StoreData } from '@/types/party';
import { getBoss } from '@/data/bosses';

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
   * 計算角色本週已完成擊破數量與總排定數量
   */
  const getProgress = useCallback(
    (character: Character): { completed: number; total: number } => {
      let completed = 0;
      let total = 0;

      const checkEntry = (bossId: string, entryIndex: number) => {
        total += 1;
        const recKey = `rec_${character.id}_${bossId}_${entryIndex}`;
        if (store.weeklyRecords[recKey]?.isCompleted) {
          completed += 1;
        }
      };

      (character.bossIds || []).forEach((bId) => checkEntry(bId, 1));
      (character.resetBossIds || []).forEach((bId) => checkEntry(bId, 2));

      return { completed, total };
    },
    [store]
  );

  return {
    calculateCrystal,
    calculateShard,
    getProgress,
    formatCrystal,
    formatShardNumber,
  };
}
