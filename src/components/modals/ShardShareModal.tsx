import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { useAuth } from '@/contexts/AuthContext';
import React, { useState, useEffect } from 'react';
import { useStore } from '@/store';
import { Boss } from '@/types/boss';
import { Team, ShardMode } from '@/types/party';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { Sparkles, AlertCircle, Check, Info } from 'lucide-react';

interface ShardShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  boss: Boss | null;
  team: Team | null;
  recordKey: string;
  pendingComplete?: boolean;
}

interface ShardMemberState {
  charId: string;
  entryIndex: number;
  recordKey: string;
  name: string;
  value: number;            // 份數 (0 ~ maxPartySize)
  lastWeek: number | null;  // 上週份數
  suggested: number | null; // 建議份數
  quantity: number;         // 顆數 (0 ~ totalShards)
  lastWeekQuantity: number | null; // 上週顆數
}

export function ShardShareModal({
  isOpen,
  onClose,
  boss,
  team,
  recordKey,
  pendingComplete = false,
}: ShardShareModalProps) {
  const { store, getCharName, getAllCharacters, saveStoreToCloud } = useStore();
  const { currentPlayer, isAdmin } = useAuth();

  const maxPartySize = boss?.maxPartySize || 1;
  const totalShards = boss?.erionVestiges || 0;

  // 計算初始成員名單工具函式 (即時同步運算，避免 Modal 打開時抖動)
  const computeInitialMembers = () => {
    if (!boss || !team) return { initialMode: 'shares' as ShardMode, memberStates: [] as ShardMemberState[], guests: 0 };
    const rawMembers = team.memberTargets || [];
    const validMembers = rawMembers.filter((m) => {
      if (!m.charId.startsWith('guest_')) return true;
      return (store.guests || []).some((g) => g.id === m.charId);
    });

    const formalMembers = validMembers.filter((m) => !m.charId.startsWith('guest_'));
    const guests = validMembers.length - formalMembers.length;

    const triggerRec = store.weeklyRecords[recordKey];
    const initialMode: ShardMode = triggerRec?.shardMode || 'shares';

    const fairAvg = maxPartySize / Math.max(1, validMembers.length);

    // 1. 計算預設份數
    const baseShare = Math.floor(maxPartySize / Math.max(1, validMembers.length));
    let remainingShares = maxPartySize - baseShare * validMembers.length;

    // 2. 計算預設數量 (均分)
    const baseQty = Math.floor(totalShards / Math.max(1, validMembers.length));
    let remainingQty = totalShards - baseQty * validMembers.length;

    const memberStates: ShardMemberState[] = formalMembers.map((m) => {
      const memberRecKey = `rec_${m.charId}_${boss.id}_${m.entryIndex}`;
      const memberRec = store.weeklyRecords[memberRecKey];

      const lastWeek =
        memberRec && memberRec.lastWeekShardShares !== null && memberRec.lastWeekShardShares !== undefined
          ? memberRec.lastWeekShardShares
          : null;

      const lastWeekQty =
        memberRec && memberRec.lastWeekShardQuantity !== null && memberRec.lastWeekShardQuantity !== undefined
          ? memberRec.lastWeekShardQuantity
          : null;

      // 建議份數：若上週拿超過均分，本週向下取整；若上週拿低於均分，本週向上取整
      const suggested =
        lastWeek !== null
          ? lastWeek > fairAvg
            ? Math.floor(fairAvg)
            : Math.ceil(fairAvg)
          : null;

      // 當前份數值
      let currentShare = memberRec?.shardShares;
      if (typeof currentShare !== 'number') {
        currentShare = baseShare + (remainingShares > 0 ? 1 : 0);
        if (remainingShares > 0) remainingShares -= 1;
      }

      // 當前數量值
      let currentQty = memberRec?.shardQuantity;
      if (typeof currentQty !== 'number') {
        currentQty = baseQty + (remainingQty > 0 ? 1 : 0);
        if (remainingQty > 0) remainingQty -= 1;
      }

      return {
        charId: m.charId,
        entryIndex: m.entryIndex,
        recordKey: memberRecKey,
        name: getCharName(m.charId) + (m.entryIndex === 2 ? ' (重置)' : ''),
        value: currentShare,
        lastWeek,
        suggested,
        quantity: currentQty,
        lastWeekQuantity: lastWeekQty,
      };
    });

    return { initialMode, memberStates, guests };
  };

  const [mode, setMode] = useState<ShardMode>('shares');
  const [members, setMembers] = useState<ShardMemberState[]>([]);
  const [guestCount, setGuestCount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // 追蹤彈窗開啟時的唯一特徵標籤，確保在首個 Render 週期內即時同步計算完成
  const [lastInitKey, setLastInitKey] = useState<string>('');
  const currentInitKey = isOpen && boss && team ? `${recordKey}_${boss.id}_${team.id}` : '';

  if (isOpen && boss && team && lastInitKey !== currentInitKey) {
    setLastInitKey(currentInitKey);
    const initial = computeInitialMembers();
    setMembers(initial.memberStates);
    setMode(initial.initialMode);
    setGuestCount(initial.guests);
    setErrorMsg('');
  }

  useEffect(() => {
    if (!isOpen) {
      setLastInitKey('');
      setMembers([]);
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!boss || !team) return null;

  // 份數模式校驗
  const formalSharesTotal = members.reduce((sum, m) => sum + (m.value || 0), 0);
  const sharesRemainder = maxPartySize - formalSharesTotal;
  const isSharesValid = guestCount > 0 ? sharesRemainder >= 0 : formalSharesTotal === maxPartySize;

  // 數量模式校驗
  const formalQtyTotal = members.reduce((sum, m) => sum + (m.quantity || 0), 0);
  const qtyRemainder = totalShards - formalQtyTotal;
  const isQtyValid =
    guestCount > 0
      ? qtyRemainder >= 0 && members.every((m) => m.quantity >= 0)
      : formalQtyTotal === totalShards;

  const isValid = mode === 'shares' ? isSharesValid : isQtyValid;

  // 更新單一隊員份數
  const handleUpdateShare = (idx: number, valStr: string) => {
    const val = parseInt(valStr, 10);
    const clamped = isNaN(val) ? 0 : Math.max(0, Math.min(maxPartySize, val));
    setMembers((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], value: clamped };
      return next;
    });
    setErrorMsg('');
  };

  // 更新單一隊員數量
  const handleUpdateQuantity = (idx: number, valStr: string) => {
    const val = parseInt(valStr, 10);
    const clamped = isNaN(val) ? 0 : Math.max(0, Math.min(totalShards, val));
    setMembers((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], quantity: clamped };
      return next;
    });
    setErrorMsg('');
  };

  // 點擊一鍵套用建議份數
  const handleApplySuggested = (idx: number) => {
    const m = members[idx];
    if (m && m.suggested !== null) {
      handleUpdateShare(idx, String(m.suggested));
    }
  };

  // 儲存確認
  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    // 檢查操作者是否為隊員或管理員
    const allChars = getAllCharacters();
    const isMemberOrAdmin =
      isAdmin ||
      members.some((m) => {
        const c = allChars.find((x) => x.id === m.charId);
        return c && c.playerName === currentPlayer?.name;
      });

    if (!isMemberOrAdmin) {
      setErrorMsg('⚠️ 唯讀模式：只有該隊伍成員或管理員可以儲存艾里溫碎片分配！');
      return;
    }

    // 連續兩週相同份數的防呆提醒 (V1 貼心特性)
    if (mode === 'shares') {
      const sameAsLastWeekNames = members
        .filter((m) => m.lastWeek !== null && m.lastWeek === m.value)
        .map((m) => m.name);

      if (sameAsLastWeekNames.length > 0) {
        const ok = confirm(
          `${sameAsLastWeekNames.join('、')} 這次選的份數跟上週一樣，連續兩週相同可能導致分配不均，確定要維持嗎？`
        );
        if (!ok) return;
      }
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const nextRecords = { ...store.weeklyRecords };

      // 1. 寫入每個成員的 shardMode 與分配數值
      members.forEach((m) => {
        const existing = nextRecords[m.recordKey] || {
          charId: m.charId,
          bossId: boss.id,
          entryIndex: m.entryIndex,
          teamId: team.id,
          isCompleted: false,
        };

        nextRecords[m.recordKey] = {
          ...existing,
          shardMode: mode,
          shardShares: mode === 'shares' ? m.value : null,
          shardQuantity: mode === 'quantity' ? m.quantity : null,
        };
      });

      // 2. 若為「出團完成連動」(pendingComplete)，同步將整隊標記為已完成！
      if (pendingComplete) {
        Object.keys(nextRecords).forEach((k) => {
          if (nextRecords[k].teamId === team.id) {
            nextRecords[k] = {
              ...nextRecords[k],
              isCompleted: true,
            };
          }
        });
      }

      await saveStoreToCloud({
        ...store,
        weeklyRecords: nextRecords,
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || '儲存失敗！');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent maxWidthClass="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span>🔹 {boss.name} - 艾里溫碎片分配</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleConfirm} className="space-y-4">
          <DialogBody className="space-y-3.5 max-h-[72vh]">
            {/* 模式切換 Tabs */}
            <Tabs value={mode} onValueChange={(val) => setMode(val as ShardMode)}>
              <TabsList>
                <TabsTrigger value="shares">
                  <span>🔹 份數模式 (0 ~ {maxPartySize} 份)</span>
                </TabsTrigger>
                <TabsTrigger value="quantity">
                  <span>🔢 顆數模式 (0 ~ {totalShards} 顆)</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* 提示 Banner (溫暖淺羊皮色調) */}
            <div className="p-2.5 rounded-xl bg-[#FFF8E7] dark:bg-slate-800 border-1.5 border-[#D4B982] dark:border-slate-700 text-xs text-[#5C3E14] dark:text-amber-200 flex items-start gap-2 shadow-2xs">
              <Info className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
              {mode === 'shares' ? (
                <span>
                  以 BOSS 最大人數上限（共 <strong className="text-[#3E2F20] dark:text-amber-300">{maxPartySize} 份</strong>）進行分配。每份約{' '}
                  <strong className="text-amber-700 dark:text-amber-300 font-mono">
                    {(totalShards / maxPartySize).toFixed(1)}
                  </strong>{' '}
                  顆碎片。
                </span>
              ) : (
                <span>
                  直接輸入本週各隊員實際取得的碎片顆數（含交易後）。BOSS 總掉落碎片：
                  <strong className="text-amber-700 dark:text-amber-300 font-mono"> {totalShards} 顆</strong>。
                </span>
              )}
            </div>

            {/* 成員列表 */}
            <div className="space-y-2">
              {members.map((m, idx) => {
                const lastWeekLabel =
                  mode === 'shares'
                    ? m.lastWeek !== null
                      ? `上週 ${m.lastWeek} 份`
                      : '上週無紀錄'
                    : m.lastWeekQuantity !== null
                    ? `上週 ${m.lastWeekQuantity} 顆`
                    : '上週無紀錄';

                const canApplySuggested = mode === 'shares' && m.suggested !== null && m.suggested !== m.value;

                return (
                  <div
                    key={m.recordKey}
                    className="p-2.5 rounded-2xl border-2 border-kerning-stroke bg-[#FFFDF9] dark:bg-slate-800 flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-xs text-[#3E2F20] dark:text-slate-100 truncate">
                          {m.name}
                        </span>
                        <span className="text-[10px] text-stone-500 dark:text-slate-400 font-bold bg-black/5 dark:bg-white/5 px-1.5 py-0.2 rounded-md">
                          {lastWeekLabel}
                        </span>
                        {canApplySuggested && (
                          <button
                            type="button"
                            onClick={() => handleApplySuggested(idx)}
                            className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/40 px-1.5 py-0.2 rounded-md hover:bg-emerald-500/25 transition-colors flex items-center gap-0.5 cursor-pointer"
                            title="點擊立即套用建議輪替份數"
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>建議 {m.suggested} 份</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 輸入控制項 */}
                    <div className="shrink-0">
                      {mode === 'shares' ? (
                        <select
                          value={m.value}
                          onChange={(e) => handleUpdateShare(idx, e.target.value)}
                          className="px-3 py-1.5 text-xs font-black rounded-xl border-2 border-[#D4B982] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#3E2F20] dark:text-slate-100 focus:outline-none focus:border-amber-500"
                        >
                          {Array.from({ length: maxPartySize + 1 }).map((_, i) => (
                            <option key={i} value={i}>
                              {i} 份
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            max={totalShards}
                            value={m.quantity}
                            onChange={(e) => handleUpdateQuantity(idx, e.target.value)}
                            className="w-16 px-2 py-1 text-xs font-black text-center rounded-xl border-2 border-[#D4B982] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#3E2F20] dark:text-slate-100 focus:outline-none focus:border-amber-500"
                          />
                          <span className="text-xs font-bold text-stone-500 dark:text-slate-400">
                            / {totalShards} 顆
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Guest 臨時隊友餘額列 */}
              {guestCount > 0 && (
                <div className="p-2.5 rounded-2xl border-2 border-dashed border-[#D4B982] dark:border-slate-700 bg-[#FFF8E7]/60 dark:bg-slate-800/40 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-black text-[#5C3E14] dark:text-amber-200">
                      👥 Guest（共 {guestCount} 位）
                    </span>
                    <span className="text-[10px] text-stone-500 dark:text-slate-400 block">
                      非固定成員，自動分配扣除正式隊員後的剩餘份數
                    </span>
                  </div>
                  <div className="font-black font-fredoka text-sm text-amber-700 dark:text-amber-300">
                    {mode === 'shares'
                      ? sharesRemainder >= 0
                        ? `${sharesRemainder} 份`
                        : '⚠️ 超額'
                      : qtyRemainder >= 0
                      ? `${qtyRemainder} 顆`
                      : '⚠️ 超額'}
                  </div>
                </div>
              )}
            </div>

            {/* 即時合計防呆檢查狀態列 */}
            <div
              className={cn(
                'p-3 rounded-2xl border-2 text-xs font-black flex items-center justify-between transition-colors',
                isValid
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                  : 'bg-red-500/10 border-red-500/40 text-red-700 dark:text-red-300'
              )}
            >
              <div className="flex items-center gap-1.5">
                {isValid ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                {mode === 'shares' ? (
                  guestCount > 0 ? (
                    <span>
                      正式隊員 {formalSharesTotal} 份 + Guest {Math.max(0, sharesRemainder)} 份 = {maxPartySize} / {maxPartySize} 份
                    </span>
                  ) : (
                    <span>目前合計：{formalSharesTotal} / {maxPartySize} 份</span>
                  )
                ) : (
                  guestCount > 0 ? (
                    <span>
                      正式隊員 {formalQtyTotal} 顆 + Guest {Math.max(0, qtyRemainder)} 顆 = {totalShards} / {totalShards} 顆
                    </span>
                  ) : (
                    <span>目前合計：{formalQtyTotal} / {totalShards} 顆</span>
                  )
                )}
              </div>

              {!isValid && (
                <span className="text-[11px] font-bold">
                  {mode === 'shares'
                    ? formalSharesTotal > maxPartySize
                      ? '⚠️ 已超過上限'
                      : `⚠️ 尚缺 ${maxPartySize - formalSharesTotal} 份`
                    : formalQtyTotal > totalShards
                    ? '⚠️ 已超過總量'
                    : `⚠️ 尚缺 ${totalShards - formalQtyTotal} 顆`}
                </span>
              )}
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500 text-xs text-red-500 font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="parchment" size="sm" onClick={onClose}>
              取消
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!isValid}
              isLoading={isSubmitting}
            >
              <Check className="w-4 h-4" />
              <span>{pendingComplete ? '確認分配並標記通關' : '儲存分配設定'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
