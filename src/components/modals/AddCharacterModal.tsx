import { useState, FormEvent } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { Character } from '@/types/player';
import { BOSS_GROUPS, getBossCleanName } from '@/data/bosses';
import { DifficultyBadge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { fetchNexonCharacterInfo } from '@/services/nexon';
import { UserPlus, Search, AlertCircle } from 'lucide-react';

interface AddCharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
}

export function AddCharacterModal({ isOpen, onClose, playerName }: AddCharacterModalProps) {
  const { addCharacter } = useStore();

  const [charName, setCharName] = useState('');
  const [characterImage, setCharacterImage] = useState('');
  const [ocid, setOcid] = useState('');
  const [isSearchingNexon, setIsSearchingNexon] = useState(false);
  const [selectedBossIds, setSelectedBossIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSearchNexon = async () => {
    const clean = charName.trim();
    if (!clean) return;
    setIsSearchingNexon(true);
    setErrorMsg('');
    try {
      const info = await fetchNexonCharacterInfo(clean);
      if (info) {
        setCharacterImage(info.characterImage);
        setOcid(info.ocid);
      }
    } finally {
      setIsSearchingNexon(false);
    }
  };

  const handleToggleBoss = (bossId: string) => {
    if (selectedBossIds.includes(bossId)) {
      setSelectedBossIds(selectedBossIds.filter((id) => id !== bossId));
    } else {
      if (selectedBossIds.length >= 12) {
        setErrorMsg('每隻角色最多只能勾選 12 隻每週 BOSS 結晶！');
        return;
      }
      setErrorMsg('');
      setSelectedBossIds([...selectedBossIds, bossId]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const clean = charName.trim();
    if (!clean) {
      setErrorMsg('請輸入角色名稱！');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const newChar: Character = {
        id: `char_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: clean,
        characterImage,
        ocid,
        bossIds: selectedBossIds,
        resetBossIds: [],
        playerName,
      };

      await addCharacter(playerName, newChar);
      setCharName('');
      setCharacterImage('');
      setOcid('');
      setSelectedBossIds([]);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || '建立角色失敗！');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent maxWidthClass="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            <UserPlus className="w-5 h-5" />
            <span>為 {playerName} 新增角色</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4 max-h-[72vh]">
            <div className="flex flex-col sm:flex-row items-start gap-3">
              <div className="w-16 h-16 rounded-2xl bg-black/10 dark:bg-slate-800 border-2 border-kerning-stroke overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                {characterImage ? (
                  <img src={characterImage} alt={charName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">🗡️</span>
                )}
              </div>

              <div className="flex-1 w-full space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  角色名稱 (遊戲 ID) <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={charName}
                    onChange={(e) => {
                      setCharName(e.target.value);
                      setErrorMsg('');
                    }}
                    onBlur={handleSearchNexon}
                    placeholder="輸入楓之谷角色名稱"
                    className="flex-1 px-3 py-1.5 text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                    required
                  />
                  <Button
                    type="button"
                    variant="parchment"
                    size="sm"
                    onClick={handleSearchNexon}
                    isLoading={isSearchingNexon}
                    className="shrink-0 text-xs"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Nexon 立繪</span>
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                  選擇每週常態討伐 BOSS ({selectedBossIds.length}/12)
                </span>
                <span className="text-[10px] text-slate-400">最多 12 隻</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-2 bg-black/5 dark:bg-black/25 rounded-2xl border-2 border-slate-300 dark:border-slate-700">
                {BOSS_GROUPS.map((group) => (
                  <div key={group.groupKey} className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="text-xs font-black text-[#3E2F20] dark:text-slate-100 mb-1.5">
                      {group.displayName}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {group.bosses.map((boss) => {
                        const isSelected = selectedBossIds.includes(boss.id);
                        return (
                          <button
                            key={boss.id}
                            type="button"
                            onClick={() => handleToggleBoss(boss.id)}
                            className={`px-2 py-1 rounded-lg text-xs font-bold border-1.5 flex items-center gap-1 transition-all ${
                              isSelected
                                ? 'bg-amber-500 text-slate-900 border-amber-600 shadow-sm scale-105'
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
            <Button type="submit" variant="gold" size="md" isLoading={isSubmitting}>
              <span>建立角色</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
