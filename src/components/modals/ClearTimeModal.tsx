import { useState, useEffect } from 'react';
import { Boss, Difficulty } from '@/types/boss';
import { useStore } from '@/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Timer, Trash2, Check, Users } from 'lucide-react';
import { cn } from '@/utils/cn';
import { getBossCleanName } from '@/data/bosses';

interface ClearTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordKey: string;
  boss: Boss | null;
  initialTime?: number | null;
  characterName?: string;
}

const QUICK_MINUTES = [3, 5, 10, 15, 20, 25, 30];

export function ClearTimeModal({
  isOpen,
  onClose,
  recordKey,
  boss,
  initialTime,
  characterName,
}: ClearTimeModalProps) {
  const { store, updateWeeklyRecord, getCharName } = useStore();
  const [selectedMinutes, setSelectedMinutes] = useState<number | ''>('');
  const [isSaving, setIsSaving] = useState(false);

  const rec = store.weeklyRecords[recordKey];
  const targetTeamId = rec?.teamId;
  const team = targetTeamId ? store.teams[targetTeamId] : null;
  const rawMembers = team ? team.memberTargets || [] : [];
  const validMembers = rawMembers.filter((m) => {
    if (!m.charId.startsWith('guest_')) return true;
    return (store.guests || []).some((g) => g.id === m.charId);
  });
  const isMultiParty = validMembers.length > 1;
  const teamMemberNames = isMultiParty ? validMembers.map((m) => getCharName(m.charId)).join('、') : '';

  useEffect(() => {
    if (isOpen) {
      setSelectedMinutes(initialTime && initialTime > 0 ? initialTime : '');
      setIsSaving(false);
    }
  }, [isOpen, initialTime]);

  if (!boss) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const clearTimeVal = selectedMinutes === '' ? null : Number(selectedMinutes);
      await updateWeeklyRecord(recordKey, { clearTime: clearTimeVal });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setIsSaving(true);
    try {
      await updateWeeklyRecord(recordKey, { clearTime: null });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const cleanName = getBossCleanName(boss.name);

  const getDifficultyBadge = (diff: Difficulty) => {
    switch (diff) {
      case 'extreme':
        return (
          <span className="px-2 py-0.5 rounded-md bg-[#380E13] text-[#FF5722] font-fredoka font-black text-[10px] uppercase tracking-wider border border-[#FF3358]">
            Extreme
          </span>
        );
      case 'hard':
        return (
          <span className="px-2 py-0.5 rounded-md bg-[#2D2117] text-[#FFE3B3] font-fredoka font-black text-[10px] uppercase tracking-wider border border-[#C5A070]">
            Hard
          </span>
        );
      case 'normal':
        return (
          <span className="px-2 py-0.5 rounded-md bg-[#1D3D5E] text-white font-fredoka font-black text-[10px] uppercase tracking-wider border border-white">
            Normal
          </span>
        );
      case 'easy':
        return (
          <span className="px-2 py-0.5 rounded-md bg-[#35393E] text-white font-fredoka font-black text-[10px] uppercase tracking-wider border border-white">
            Easy
          </span>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent maxWidthClass="max-w-md">
        <DialogHeader>
          <DialogTitle>
            <Timer className="w-5 h-5 text-amber-500" />
            <span>設定攻略時間 (Memo)</span>
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* BOSS 資訊卡片 */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-amber-400/50 shrink-0">
              <img
                src={boss.image}
                alt={boss.name}
                className="w-full h-full object-cover object-center"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-sm text-[#3E2F20] dark:text-slate-100">
                  {cleanName}
                </span>
                {getDifficultyBadge(boss.difficulty)}
              </div>
              {characterName && (
                <div className="text-xs text-stone-600 dark:text-slate-400 font-bold mt-0.5 truncate">
                  角色：<span className="text-amber-800 dark:text-amber-300 font-black">{characterName}</span>
                </div>
              )}
            </div>
          </div>

          {/* 若為多人隊伍，顯示提示與全員名冊 */}
          {isMultiParty && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200">
              <Users className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="leading-tight">
                <div className="font-black">多人組隊 ({validMembers.length}人)：{teamMemberNames}</div>
                <div className="text-[11px] opacity-80 mt-1">此攻略時間 memo 將同步顯示並計算至隊伍內所有隊友的角色中</div>
              </div>
            </div>
          )}

          {/* 說明文字 */}
          <div className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
            {isMultiParty
              ? '設定此 BOSS 的預計攻略時間（1 ~ 30 分鐘）。設定後將同步套用至全體隊友的 BOSS 卡片，並計入所有隊友角色的攻略時間。'
              : '設定此 BOSS 的預計攻略時間（1 ~ 30 分鐘）。設定後將顯示於 BOSS 卡片，並自動彙整為該角色的攻略時間。'}
          </div>

          {/* 快速選擇標籤 */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-black text-stone-500 dark:text-slate-400">
              快速選擇常用時間：
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {QUICK_MINUTES.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setSelectedMinutes(mins)}
                  className={cn(
                    'px-2.5 py-1 rounded-xl text-xs font-mono font-black border transition-all cursor-pointer select-none',
                    selectedMinutes === mins
                      ? 'bg-amber-400 text-slate-900 border-amber-600 shadow-xs ring-1 ring-amber-400/60 scale-105'
                      : 'bg-white dark:bg-slate-800 text-stone-700 dark:text-slate-200 border-stone-300 dark:border-slate-700 hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-slate-700'
                  )}
                >
                  {mins} 分
                </button>
              ))}
            </div>
          </div>

          {/* 1~30 分鐘下拉選單 */}
          <div className="space-y-1.5 pt-1">
            <label
              htmlFor="clear-time-select"
              className="block text-xs font-black text-stone-700 dark:text-slate-200"
            >
              攻略時間選單：
            </label>
            <div className="relative">
              <select
                id="clear-time-select"
                value={selectedMinutes}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedMinutes(val === '' ? '' : Number(val));
                }}
                className={cn(
                  'w-full py-2.5 px-3.5 rounded-xl border-2 font-mono font-black text-sm appearance-none cursor-pointer outline-none transition-all',
                  'bg-white dark:bg-slate-800 text-stone-800 dark:text-slate-100',
                  'border-amber-400/80 dark:border-slate-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-400/30'
                )}
              >
                <option value="">未設定 (清除 memo)</option>
                {Array.from({ length: 30 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    ⏱️ {m} 分鐘 {m >= 60 ? `(${Math.floor(m / 60)}小時${m % 60}分)` : ''}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-stone-500">
                ▼
              </div>
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="flex items-center justify-between gap-2 pt-2 border-t border-amber-400/20">
          <div>
            {initialTime && initialTime > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={isSaving}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-bold"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                清除
              </Button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="parchment"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="gold"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="text-slate-900 border-2 border-kerning-stroke font-black shadow-sm"
            >
              <Check className="w-4 h-4 mr-1" />
              確認儲存
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
