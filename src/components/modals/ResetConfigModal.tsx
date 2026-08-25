import { useState, useEffect, FormEvent } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { Character } from '@/types/player';
import { BOSS_GROUPS, getBossCleanName } from '@/data/bosses';
import { DifficultyBadge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Ticket } from 'lucide-react';

interface ResetConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character | null;
  playerName: string;
}

export function ResetConfigModal({ isOpen, onClose, character, playerName }: ResetConfigModalProps) {
  const { updateCharacter } = useStore();
  const [selectedResetBossIds, setSelectedResetBossIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (character) {
      setSelectedResetBossIds(character.resetBossIds || []);
    }
  }, [character]);

  if (!character) return null;

  const handleToggleResetBoss = (bossId: string) => {
    if (selectedResetBossIds.includes(bossId)) {
      setSelectedResetBossIds(selectedResetBossIds.filter((id) => id !== bossId));
    } else {
      setSelectedResetBossIds([...selectedResetBossIds, bossId]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const updated: Character = {
        ...character,
        resetBossIds: selectedResetBossIds,
      };
      await updateCharacter(playerName, updated);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetGroups = BOSS_GROUPS.map((g) => ({
    ...g,
    bosses: g.bosses.filter((b) => b.allowReset),
  })).filter((g) => g.bosses.length > 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent maxWidthClass="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            <Ticket className="w-5 h-5 text-purple-400" />
            <span>設定 {character.name} 每週重置券 BOSS (2刷)</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4 max-h-[72vh]">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              設定使用「每週 BOSS 重置入場券」進行 2 刷的 BOSS。勾選後將在卡片上產生獨立的 🎟️ 2刷格位。
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-2 bg-black/5 dark:bg-black/25 rounded-2xl border-2 border-slate-300 dark:border-slate-700">
              {resetGroups.map((group) => (
                <div key={group.groupKey} className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="text-xs font-black text-[#3E2F20] dark:text-slate-100 mb-1.5">
                    {group.displayName}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.bosses.map((boss) => {
                      const isSelected = selectedResetBossIds.includes(boss.id);
                      return (
                        <button
                          key={boss.id}
                          type="button"
                          onClick={() => handleToggleResetBoss(boss.id)}
                          className={`px-2 py-1 rounded-lg text-xs font-bold border-1.5 flex items-center gap-1 transition-all ${
                            isSelected
                              ? 'bg-purple-600 text-white border-purple-700 shadow-sm scale-105'
                              : 'bg-black/5 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-transparent hover:border-slate-400'
                          }`}
                        >
                          <DifficultyBadge difficulty={boss.difficulty} />
                          <span>{getBossCleanName(boss.name)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="parchment" size="sm" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" variant="gold" size="md" isLoading={isSubmitting}>
              <span>儲存設定</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
