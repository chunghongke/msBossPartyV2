import { useState, FormEvent, useCallback, memo } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { Character } from '@/types/player';
import { BOSS_GROUPS } from '@/data/bosses';
import { BossGroup } from '@/types/boss';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { fetchNexonCharacterInfo, getNexonApiKey } from '@/services/nexon';
import { UserPlus, Search, AlertCircle, Key, Sparkles } from 'lucide-react';

interface AddCharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  onOpenNexonKeyModal?: () => void;
}

const DIFFICULTY_CONFIG: Record<string, { label: string; activeStyle: string; inactiveStyle: string; glow: string }> = {
  easy: {
    label: '簡',
    activeStyle: 'bg-gradient-to-b from-[#4A4E54] to-[#2E3236] text-white border-2 border-white shadow-[0_0_8px_rgba(255,255,255,0.75)] font-black',
    inactiveStyle: 'bg-[#23262A] text-stone-300 border-2 border-[#3F444D] hover:border-stone-400 hover:text-white',
    glow: 'ring-1 ring-white/80',
  },
  normal: {
    label: '普',
    activeStyle: 'bg-gradient-to-b from-[#2E608F] to-[#1A3854] text-white border-2 border-white shadow-[0_0_10px_rgba(56,189,248,0.85)] font-black',
    inactiveStyle: 'bg-[#1C2836] text-[#A5C9EB] border-2 border-[#2E4763] hover:border-sky-400 hover:text-white',
    glow: 'ring-1 ring-sky-300',
  },
  hard: {
    label: '困',
    activeStyle: 'bg-gradient-to-b from-[#3E2D20] to-[#241910] text-[#FFE8C2] border-2 border-[#FFDF9E] shadow-[0_0_10px_rgba(245,158,11,0.8)] font-black',
    inactiveStyle: 'bg-[#241A12] text-[#E8C79B] border-2 border-[#C5A070] hover:border-amber-300 hover:text-[#FFF0D4]',
    glow: 'ring-1 ring-amber-300',
  },
  extreme: {
    label: '極',
    activeStyle: 'bg-gradient-to-b from-[#401217] to-[#22090C] text-[#FF5722] border-2 border-[#FF3358] shadow-[0_0_12px_rgba(255,51,88,0.9)] font-black',
    inactiveStyle: 'bg-[#260D10] text-[#FF6E40] border-2 border-[#E11D48] hover:border-rose-400 hover:text-[#FF8A65]',
    glow: 'ring-1 ring-rose-400',
  },
};

const AddBossGroupCard = memo(function AddBossGroupCard({
  group,
  selectedBossId,
  onToggleBoss,
}: {
  group: BossGroup;
  selectedBossId?: string;
  onToggleBoss: (bossId: string, groupKey: string) => void;
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
              onClick={() => onToggleBoss(boss.id, group.groupKey)}
              className={
                'flex-1 py-1 rounded-lg text-xs font-black border-2 select-none active:scale-95 transition-colors duration-75 flex items-center justify-center ' +
                (isSelected
                  ? conf.activeStyle + ' ' + conf.glow
                  : conf.inactiveStyle)
              }
              title={boss.name}
            >
              <span>{conf.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

export function AddCharacterModal({ isOpen, onClose, playerName, onOpenNexonKeyModal }: AddCharacterModalProps) {
  const { addCharacter } = useStore();

  const [charName, setCharName] = useState('');
  const [characterImage, setCharacterImage] = useState('');
  const [ocid, setOcid] = useState('');
  const [isSearchingNexon, setIsSearchingNexon] = useState(false);
  const [selectedBossIds, setSelectedBossIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [nexonNotice, setNexonNotice] = useState('');

  const handleSearchNexon = async () => {
    const clean = charName.trim();
    if (!clean) return;

    const storedKey = getNexonApiKey();
    if (!storedKey) {
      if (onOpenNexonKeyModal) {
        onOpenNexonKeyModal();
      } else {
        setErrorMsg('尚未設定 Nexon API Key，請先設定金鑰以啟用官方立繪查詢！');
      }
      return;
    }

    setIsSearchingNexon(true);
    setErrorMsg('');
    setNexonNotice('');

    try {
      const info = await fetchNexonCharacterInfo(clean);
      if (info) {
        setCharacterImage(info.characterImage);
        setOcid(info.ocid);
        setNexonNotice('✨ 成功獲取 ' + info.characterName + ' 官方立繪！');
      } else {
        setErrorMsg('找不到該角色的官方資料，請確認角色名稱是否正確，或檢查 Nexon API Key 是否有效。');
      }
    } catch {
      setErrorMsg('查詢失敗，請檢查網路或 Nexon API Key。');
    } finally {
      setIsSearchingNexon(false);
    }
  };

  const handleToggleBoss = useCallback((bossId: string, groupKey: string) => {
    setSelectedBossIds((prev) => {
      if (prev.includes(bossId)) {
        setErrorMsg('');
        return prev.filter((id) => id !== bossId);
      } else {
        const otherBossIdsInGroup = BOSS_GROUPS.find((g) => g.groupKey === groupKey)?.bosses.map((b) => b.id) || [];
        const withoutGroup = prev.filter((id) => !otherBossIdsInGroup.includes(id));

        if (withoutGroup.length >= 12) {
          setErrorMsg('每隻角色最多只能勾選 12 隻每週 BOSS 結晶！');
          return prev;
        }
        setErrorMsg('');
        return [...withoutGroup, bossId];
      }
    });
  }, []);

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
        id: 'char_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
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

  const hasNexonKey = Boolean(getNexonApiKey());
  const normalCount = selectedBossIds.length;
  const isFull = normalCount >= 12;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent maxWidthClass="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            <UserPlus className="w-5 h-5" />
            <span>為 {playerName} 新增角色</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4 max-h-[74vh]">
            <div className="flex flex-col sm:flex-row items-start gap-3">
              <div className="w-16 h-16 rounded-2xl bg-black/10 dark:bg-slate-800 border-2 border-kerning-stroke overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                {characterImage ? (
                  <img src={characterImage} alt={charName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">🗡️</span>
                )}
              </div>

              <div className="flex-1 w-full space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    角色名稱 (遊戲 ID) <span className="text-red-500">*</span>
                  </label>
                  {onOpenNexonKeyModal && (
                    <button
                      type="button"
                      onClick={onOpenNexonKeyModal}
                      className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      <Key className="w-3 h-3" />
                      <span>{hasNexonKey ? '變更 Nexon Key' : '🔑 設定 Nexon Key'}</span>
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={charName}
                    onChange={(e) => {
                      setCharName(e.target.value);
                      setErrorMsg('');
                      setNexonNotice('');
                    }}
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
                    title={hasNexonKey ? '從 Nexon 官方獲取角色立繪' : '尚未設定 Nexon Key，點擊前往設定'}
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Nexon 立繪</span>
                  </Button>
                </div>

                {nexonNotice && (
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mt-1">
                    <Sparkles className="w-3 h-3" />
                    <span>{nexonNotice}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                  選擇每週常態討伐 BOSS ({normalCount} / 12)
                </span>
                <span className={isFull ? 'text-xs font-black text-red-500' : 'text-xs font-bold text-slate-400'}>
                  {isFull ? '⚠️ 已達 12 隻上限' : `尚可選 ${12 - normalCount} 隻`}
                </span>
              </div>

              {/* V1 風格的 BOSS 圖像大卡片與極速滑塊開關切換器 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[380px] overflow-y-auto p-2.5 bg-black/5 dark:bg-black/25 rounded-2xl border-2 border-slate-300 dark:border-slate-700">
                {BOSS_GROUPS.map((group) => {
                  const selectedBoss = group.bosses.find((b) => selectedBossIds.includes(b.id));

                  return (
                    <AddBossGroupCard
                      key={group.groupKey}
                      group={group}
                      selectedBossId={selectedBoss?.id}
                      onToggleBoss={handleToggleBoss}
                    />
                  );
                })}
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
