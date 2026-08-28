import { cn } from '@/utils/cn';
import { useState, useEffect, FormEvent, useCallback, memo } from 'react';
import { useStore } from '@/store';
import { Character } from '@/types/player';
import { BOSS_GROUPS, getBossGroupKey } from '@/data/bosses';
import { BossGroup } from '@/types/boss';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { fetchNexonCharacterInfo, getNexonApiKey } from '@/services/nexon';
import { Edit2, Search, AlertCircle, Key, Sparkles } from 'lucide-react';

interface EditCharBossesModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character | null;
  playerName: string;
  onOpenNexonKeyModal?: () => void;
}

const DIFFICULTY_CONFIG: Record<string, { label: string; activeStyle: string; inactiveStyle: string; glow: string }> = {
  easy: {
    label: '簡',
    activeStyle: 'bg-gradient-to-b from-[#64748B] to-[#334155] text-white border-2 border-white shadow-[0_0_14px_rgba(255,255,255,0.95),0_0_6px_rgba(255,255,255,0.8)] scale-105 ring-2 ring-white/80 font-black z-10',
    inactiveStyle: 'bg-[#181C21] text-[#64748B] border-2 border-[#2E3744] hover:border-slate-400 hover:text-slate-200',
    glow: '',
  },
  normal: {
    label: '普',
    activeStyle: 'bg-gradient-to-b from-[#2563EB] to-[#1D4ED8] text-white border-2 border-white shadow-[0_0_14px_rgba(56,189,248,0.95)] scale-105 ring-2 ring-sky-300 font-black z-10',
    inactiveStyle: 'bg-[#121E2E] text-[#60A5FA]/60 border-2 border-[#1E3A5F] hover:border-sky-400 hover:text-white',
    glow: '',
  },
  hard: {
    label: '困',
    activeStyle: 'bg-gradient-to-b from-[#D97706] to-[#92400E] text-[#FFFBEB] border-2 border-[#FEF08A] shadow-[0_0_14px_rgba(245,158,11,0.95)] scale-105 ring-2 ring-amber-300 font-black z-10',
    inactiveStyle: 'bg-[#22160C] text-[#FBBF24]/60 border-2 border-[#5C3D21] hover:border-amber-400 hover:text-[#FFFBEB]',
    glow: '',
  },
  extreme: {
    label: '極',
    activeStyle: 'bg-gradient-to-b from-[#E11D48] to-[#9F1239] text-[#FFF1F2] border-2 border-[#FFE4E6] shadow-[0_0_16px_rgba(244,63,94,1)] scale-105 ring-2 ring-rose-400 font-black z-10',
    inactiveStyle: 'bg-[#220B10] text-[#FB7185]/60 border-2 border-[#5E0D21] hover:border-rose-400 hover:text-[#FFF1F2]',
    glow: '',
  },
};

// 獨立 memo 卡片：只有自身選取狀態改變時才觸發重繪，大幅消除整頁重繪延遲
const EditBossGroupCard = memo(function EditBossGroupCard({
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
    <div className={cn(
        'flex flex-col rounded-2xl border-2 p-2 items-center gap-2 transition-all duration-150',
        hasSelected
          ? 'bg-white dark:bg-slate-800 border-amber-400/90 dark:border-amber-400 shadow-[0_4px_12px_rgba(245,158,11,0.22)] ring-1 ring-amber-400/40'
          : 'bg-white/80 dark:bg-slate-850 border-slate-200 dark:border-slate-800 opacity-60'
      )}>
      {/* BOSS 形象大圖相框 */}
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

      {/* 滑塊開關切換組 */}
      <div className="flex gap-1.5 w-full justify-center p-0.5">
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

export function EditCharBossesModal({
  isOpen,
  onClose,
  character,
  playerName,
  onOpenNexonKeyModal,
}: EditCharBossesModalProps) {
  const { updateCharacter, players } = useStore();

  const [charName, setCharName] = useState('');
  const [characterImage, setCharacterImage] = useState('');
  const [selectedBossIds, setSelectedBossIds] = useState<string[]>([]);
  const [isSearchingNexon, setIsSearchingNexon] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [noticeMsg, setNoticeMsg] = useState('');

  useEffect(() => {
    if (character) {
      setCharName(character.name);
      setCharacterImage(character.characterImage || '');
      setSelectedBossIds(character.bossIds || []);
      setErrorMsg('');
      setNoticeMsg('');
    }
  }, [character]);

  // 取得有效重置券數量
  const currentResetIds = (character?.resetBossIds || []).filter((rId) => {
    return typeof rId === 'string' && selectedBossIds.some((bId) => typeof bId === 'string' && getBossGroupKey(bId) === getBossGroupKey(rId));
  });
  const normalCount = selectedBossIds.length;
  const resetCount = currentResetIds.length;
  const totalCount = normalCount + resetCount;
  const isFull = totalCount >= 12;

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
    setNoticeMsg('');

    try {
      const info = await fetchNexonCharacterInfo(clean, undefined, character?.ocid);
      if (info && info.characterImage) {
        setCharacterImage(info.characterImage);
        setNoticeMsg('✨ 成功獲取 ' + info.characterName + ' 官方最新立繪！');
      } else {
        setErrorMsg('找不到該角色的官方資料，請確認名稱是否正確，或檢查 Nexon API Key 是否有效。');
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

        if (withoutGroup.length + 1 + resetCount > 12) {
          setErrorMsg(`每週攻略總額度已達 12 隻上限！（常態 ${withoutGroup.length} 隻 ＋ 重置券 ${resetCount} 隻 ＝ 已達 12 隻）`);
          return prev;
        }
        setErrorMsg('');
        return [...withoutGroup, bossId];
      }
    });
  }, [resetCount]);

  if (!character) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const activeResetIds = (character.resetBossIds || []).filter((rId) =>
        typeof rId === 'string' && selectedBossIds.some((bId) => typeof bId === 'string' && getBossGroupKey(bId) === getBossGroupKey(rId))
      );

      const updated: Character = {
        ...character,
        name: charName.trim() || character.name,
        characterImage,
        bossIds: selectedBossIds,
        resetBossIds: activeResetIds,
      };

      const targetPlayerName = playerName || players.find((p) => (p.characters || []).some((c) => c.id === character.id))?.name || '';
      await updateCharacter(targetPlayerName, updated);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || '更新失敗！');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasNexonKey = Boolean(getNexonApiKey());

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent maxWidthClass="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            <Edit2 className="w-5 h-5" />
            <span>編輯 {character.name} 的討伐 BOSS</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4 max-h-[74vh]">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-black/10 dark:bg-slate-800 border-2 border-kerning-stroke overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                {characterImage ? (
                  <img src={characterImage} alt={charName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">🗡️</span>
                )}
              </div>

              <div className="space-y-1">
                <div className="text-sm font-black text-[#3E2F20] dark:text-slate-100">{charName}</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="parchment"
                    size="sm"
                    onClick={handleSearchNexon}
                    isLoading={isSearchingNexon}
                    className="text-xs h-7 px-2.5"
                    title={hasNexonKey ? '從 Nexon 官方獲取角色最新立繪' : '尚未設定 Nexon Key，點擊前往設定'}
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>更新 Nexon 立繪</span>
                  </Button>

                  {onOpenNexonKeyModal && (
                    <button
                      type="button"
                      onClick={onOpenNexonKeyModal}
                      className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      <Key className="w-3 h-3" />
                      <span>{hasNexonKey ? '變更 Key' : '🔑 設定 Nexon Key'}</span>
                    </button>
                  )}
                </div>

                {noticeMsg && (
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>{noticeMsg}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              {/* 額度統計列 (包含常態 + 重置券) */}
              <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                <div className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>每週常態討伐 BOSS ({normalCount} 隻)</span>
                  {resetCount > 0 && (
                    <span className="text-purple-600 dark:text-purple-400 font-bold">
                      ＋ 重置券 {resetCount} 隻
                    </span>
                  )}
                </div>
                <div className={isFull ? 'text-xs font-black text-red-500' : 'text-xs font-bold text-slate-400'}>
                  {isFull ? (
                    <span>⚠️ 總額度已達 12 / 12 隻上限</span>
                  ) : (
                    <span>
                      總計 {totalCount} / 12 隻 <strong className="text-emerald-600 dark:text-emerald-400 font-bold">(尚可選 {12 - totalCount} 隻)</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* V1 風格的 BOSS 圖像大卡片與極速滑塊開關切換器 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[440px] overflow-y-auto p-2.5 bg-black/5 dark:bg-black/25 rounded-2xl border-2 border-slate-300 dark:border-slate-700">
                {BOSS_GROUPS.map((group) => {
                  const selectedBoss = group.bosses.find((b) => selectedBossIds.includes(b.id));

                  return (
                    <EditBossGroupCard
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
              <span>儲存設定</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
