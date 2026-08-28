import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/utils/cn';
import { useState, useEffect, FormEvent, useCallback, memo } from 'react';
import { useStore } from '@/store';
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
    <div className={cn(
        'flex flex-col rounded-2xl border-2 p-2 items-center gap-2 transition-all duration-150',
        hasSelected
          ? 'bg-white dark:bg-slate-800 border-amber-400/90 dark:border-amber-400 shadow-[0_4px_12px_rgba(245,158,11,0.22)] ring-1 ring-amber-400/40'
          : 'bg-white/80 dark:bg-slate-850 border-slate-200 dark:border-slate-800 opacity-60'
      )}>
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

export function AddCharacterModal({ isOpen, onClose, playerName, onOpenNexonKeyModal }: AddCharacterModalProps) {
  const { addCharacter, players } = useStore();
  const { currentPlayer, isAdmin } = useAuth();
  const [selectedPlayerName, setSelectedPlayerName] = useState<string>(playerName);

  useEffect(() => {
    if (isOpen) {
      setSelectedPlayerName(playerName);
    }
  }, [playerName, isOpen]);

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

      await addCharacter(selectedPlayerName, newChar);
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
            <span>為 {selectedPlayerName} 新增角色</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4 max-h-[74vh]">
            {/* 玩家身分選擇 (管理員可自由指派，一般玩家鎖定自己) */}
            {isAdmin ? (
              <div className="p-2.5 rounded-2xl bg-[#FFF8E7] dark:bg-slate-800 border-2 border-[#D4B982] dark:border-slate-700 space-y-1">
                <Label className="text-[#5C3E14] dark:text-amber-300">
                  👑 管理員專屬：指派角色給小隊玩家
                </Label>
                <select
                  value={selectedPlayerName}
                  onChange={(e) => setSelectedPlayerName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-black text-[#3E2F20] dark:text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  {players.map((p) => (
                    <option key={p.name} value={p.name}>
                      👤 {p.name} {p.name === currentPlayer?.name ? '(自己)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

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
                  <Label>
                    角色名稱 (遊戲 ID) <span className="text-red-500">*</span>
                  </Label>
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
                  <Input
                    type="text"
                    value={charName}
                    onChange={(e) => {
                      setCharName(e.target.value);
                      setErrorMsg('');
                      setNexonNotice('');
                    }}
                    placeholder="輸入楓之谷角色名稱"
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
