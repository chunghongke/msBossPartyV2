import { useState, useEffect, FormEvent, useCallback, memo } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { Character } from '@/types/player';
import { BOSS_GROUPS, getBossGroupKey } from '@/data/bosses';
import { BossGroup } from '@/types/boss';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Ticket, AlertCircle } from 'lucide-react';

interface ResetConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character | null;
  playerName: string;
}

const DIFFICULTY_CONFIG: Record<string, { label: string; activeStyle: string; glow: string }> = {
  easy: {
    label: '簡',
    activeStyle: 'bg-gradient-to-b from-blue-300 to-sky-500 text-slate-900 border-sky-600 shadow-md',
    glow: 'ring-2 ring-sky-300',
  },
  normal: {
    label: '普',
    activeStyle: 'bg-gradient-to-b from-sky-400 to-blue-600 text-white border-blue-700 shadow-md',
    glow: 'ring-2 ring-blue-300',
  },
  hard: {
    label: '困',
    activeStyle: 'bg-gradient-to-b from-amber-400 to-orange-600 text-white border-orange-700 shadow-md',
    glow: 'ring-2 ring-amber-300',
  },
  extreme: {
    label: '極',
    activeStyle: 'bg-gradient-to-b from-red-500 to-red-700 text-white border-red-800 shadow-md',
    glow: 'ring-2 ring-red-300',
  },
};

const ResetBossGroupCard = memo(function ResetBossGroupCard({
  group,
  selectedBossId,
  onToggleResetBoss,
}: {
  group: BossGroup;
  selectedBossId?: string;
  onToggleResetBoss: (bossId: string, groupKey: string) => void;
}) {
  const hasSelected = Boolean(selectedBossId);

  return (
    <div className="flex flex-col bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-2 items-center gap-2 shadow-xs">
      <div className="w-full h-20 bg-slate-900 rounded-xl overflow-hidden relative flex items-center justify-center border border-black/20">
        <img
          src={'./images/bosses/' + group.groupKey + '.png'}
          alt={group.displayName}
          loading="lazy"
          className={
            'max-w-full max-h-full object-contain pointer-events-none ' +
            (hasSelected ? 'brightness-105' : 'grayscale opacity-35')
          }
          onError={(e: any) => {
            e.target.src = './icon.png';
          }}
        />
        <span className="absolute bottom-1 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-[11px] font-black text-white shadow-xs max-w-[90%] truncate pointer-events-none">
          {group.displayName}
        </span>
      </div>

      <div className="flex p-1 bg-black/5 dark:bg-black/40 rounded-xl border border-slate-300/70 dark:border-slate-700 gap-1 w-full justify-center">
        {group.bosses.map((boss) => {
          const isSelected = selectedBossId === boss.id;
          const conf = DIFFICULTY_CONFIG[boss.difficulty] || {
            label: boss.difficulty,
            activeStyle: 'bg-amber-500 text-slate-900 border-amber-600 shadow-md',
            glow: 'ring-2 ring-amber-300',
          };

          return (
            <button
              key={boss.id}
              type="button"
              onClick={() => onToggleResetBoss(boss.id, group.groupKey)}
              className={
                'flex-1 py-1 rounded-lg text-xs font-black border-2 select-none active:scale-95 transition-colors duration-75 flex items-center justify-center ' +
                (isSelected
                  ? conf.activeStyle + ' ' + conf.glow
                  : 'bg-transparent text-slate-500 dark:text-slate-400 border-transparent hover:bg-black/5 dark:hover:bg-slate-700/50')
              }
              title={'2刷 ' + boss.name}
            >
              <span>{conf.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

export function ResetConfigModal({ isOpen, onClose, character, playerName }: ResetConfigModalProps) {
  const { updateCharacter, players } = useStore();
  const [selectedResetBossIds, setSelectedResetBossIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (character) {
      setSelectedResetBossIds(character.resetBossIds || []);
      setErrorMsg('');
    }
  }, [character]);

  const normalCount = character?.bossIds ? character.bossIds.length : 0;
  const resetCount = selectedResetBossIds.length;
  const totalCount = normalCount + resetCount;
  const isFull = totalCount >= 12;

  // 篩選出該角色原本常態有攻略 (bossIds) 且支援重置券 (allowReset) 的 BOSS 組別
  const normalGroupKeys = new Set((character?.bossIds || []).map((id) => getBossGroupKey(id)));
  const availableResetGroups = BOSS_GROUPS.map((g) => ({
    ...g,
    bosses: g.bosses.filter((b) => b.allowReset && normalGroupKeys.has(g.groupKey)),
  })).filter((g) => g.bosses.length > 0);

  const handleToggleResetBoss = useCallback((bossId: string, groupKey: string) => {
    setSelectedResetBossIds((prev) => {
      if (prev.includes(bossId)) {
        setErrorMsg('');
        return prev.filter((id) => id !== bossId);
      } else {
        const otherBossIdsInGroup = BOSS_GROUPS.find((g) => g.groupKey === groupKey)?.bosses.map((b) => b.id) || [];
        const withoutGroup = prev.filter((id) => !otherBossIdsInGroup.includes(id));

        if (normalCount + withoutGroup.length >= 12) {
          setErrorMsg('攻略總額度（常態 + 重置券）已達 12 隻上限！');
          return prev;
        }
        setErrorMsg('');
        return [...withoutGroup, bossId];
      }
    });
  }, [normalCount]);

  if (!character) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const updated: Character = {
        ...character,
        resetBossIds: selectedResetBossIds,
      };
      const targetPlayerName = playerName || players.find((p) => (p.characters || []).some((c) => c.id === character.id))?.name || '';
      await updateCharacter(targetPlayerName, updated);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || '儲存重置券設定失敗！');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent maxWidthClass="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            <Ticket className="w-5 h-5 text-purple-500" />
            <span>設定 {character.name} 每週重置券 BOSS (2刷)</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4 max-h-[74vh]">
            {/* 額度統計膠囊 */}
            <div className="p-3 bg-purple-500/10 border-2 border-purple-500/30 rounded-2xl flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="font-black text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                <Ticket className="w-4 h-4 text-purple-500" />
                <span>角色：{character.name} ({playerName})</span>
              </div>
              <div className={'font-black text-xs ' + (isFull ? 'text-red-500' : 'text-purple-700 dark:text-purple-300')}>
                📊 攻略額度：常態 {normalCount} 隻 ＋ 重置券 {resetCount} 隻 ＝ 總計 {totalCount} / 12 隻 {isFull ? '(已達上限)' : ''}
              </div>
            </div>

            {availableResetGroups.length === 0 ? (
              <div className="py-12 text-center parchment-card rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 space-y-2">
                <div className="text-3xl">🎫</div>
                <div className="text-sm font-black text-slate-700 dark:text-slate-300">
                  該角色目前排定的常態 BOSS 清單中，沒有支援重置券的王怪。
                </div>
                <div className="text-xs text-slate-400">
                  （請先在「編輯 BOSS」中勾選該角色要挑戰的常態 BOSS，例如史烏、戴米安、露希妲等）
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto p-2.5 bg-black/5 dark:bg-black/25 rounded-2xl border-2 border-slate-300 dark:border-slate-700">
                {availableResetGroups.map((group) => {
                  const selectedBoss = group.bosses.find((b) => selectedResetBossIds.includes(b.id));

                  return (
                    <ResetBossGroupCard
                      key={group.groupKey}
                      group={group}
                      selectedBossId={selectedBoss?.id}
                      onToggleResetBoss={handleToggleResetBoss}
                    />
                  );
                })}
              </div>
            )}

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
            <Button type="submit" variant="gold" size="md" isLoading={isSubmitting}>
              <span>儲存重置券設定</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
