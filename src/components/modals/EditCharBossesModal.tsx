import { useState, useEffect, FormEvent } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { Character } from '@/types/player';
import { BOSS_GROUPS, getBossCleanName } from '@/data/bosses';
import { DifficultyBadge } from '@/components/ui/Badge';
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

export function EditCharBossesModal({
  isOpen,
  onClose,
  character,
  playerName,
  onOpenNexonKeyModal,
}: EditCharBossesModalProps) {
  const { updateCharacter } = useStore();

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

  if (!character) return null;

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
      const info = await fetchNexonCharacterInfo(clean);
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
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const updated: Character = {
        ...character,
        name: charName.trim() || character.name,
        characterImage,
        bossIds: selectedBossIds,
      };

      await updateCharacter(playerName, updated);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || '更新失敗！');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasNexonKey = Boolean(getNexonApiKey());

  const getDifficultyBtnStyle = (difficulty: string, isSelected: boolean) => {
    if (!isSelected) {
      return 'bg-black/10 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 opacity-60 hover:opacity-100';
    }
    switch (difficulty) {
      case 'easy':
        return 'bg-gradient-to-b from-blue-300 to-sky-500 text-slate-900 border-sky-600 shadow-md scale-105 ring-2 ring-sky-300';
      case 'normal':
        return 'bg-gradient-to-b from-sky-400 to-blue-600 text-white border-blue-700 shadow-md scale-105 ring-2 ring-blue-300';
      case 'hard':
        return 'bg-gradient-to-b from-amber-400 to-orange-600 text-white border-orange-700 shadow-md scale-105 ring-2 ring-amber-300';
      case 'extreme':
        return 'bg-gradient-to-b from-red-500 to-red-700 text-white border-red-800 shadow-md scale-105 ring-2 ring-red-300';
      default:
        return 'bg-amber-500 text-slate-900 border-amber-600 shadow-md scale-105';
    }
  };

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
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                  每週常態討伐 BOSS ({selectedBossIds.length} / 12)
                </span>
                <span className={selectedBossIds.length >= 12 ? 'text-xs font-black text-red-500' : 'text-xs font-bold text-slate-400'}>
                  {selectedBossIds.length >= 12 ? '⚠️ 已達 12 隻上限' : '最多 12 隻'}
                </span>
              </div>

              {/* V1 風格的 BOSS 圖像大卡片網格 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[440px] overflow-y-auto p-2.5 bg-black/5 dark:bg-black/25 rounded-2xl border-2 border-slate-300 dark:border-slate-700">
                {BOSS_GROUPS.map((group) => {
                  const hasSelectedInGroup = group.bosses.some((b) => selectedBossIds.includes(b.id));

                  return (
                    <div
                      key={group.groupKey}
                      className="flex flex-col bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-2 items-center gap-2 shadow-xs transition-all"
                    >
                      {/* BOSS 形象大圖相框 */}
                      <div className="w-full h-20 bg-slate-900 rounded-xl overflow-hidden relative flex items-center justify-center border border-black/20">
                        <img
                          src={'./images/bosses/' + group.groupKey + '.png'}
                          alt={group.displayName}
                          onError={(e: any) => {
                            e.target.src = './icon.png';
                          }}
                          className={
                            'max-w-full max-h-full object-contain transition-all duration-200 ' +
                            (hasSelectedInGroup ? 'scale-105 brightness-105' : 'grayscale opacity-40')
                          }
                        />
                        <span className="absolute bottom-1 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[11px] font-black text-white shadow-xs max-w-[90%] truncate">
                          {group.displayName}
                        </span>
                      </div>

                      {/* 難度圓形切換按鈕組 (簡/普/困/極) */}
                      <div className="flex flex-wrap gap-1.5 w-full justify-center">
                        {group.bosses.map((boss) => {
                          const isSelected = selectedBossIds.includes(boss.id);
                          const btnStyle = getDifficultyBtnStyle(boss.difficulty, isSelected);

                          return (
                            <button
                              key={boss.id}
                              type="button"
                              onClick={() => handleToggleBoss(boss.id)}
                              className={
                                'px-2 py-1 rounded-xl text-xs font-black border-2 transition-all flex items-center gap-1 ' +
                                btnStyle
                              }
                              title={boss.name}
                            >
                              <DifficultyBadge difficulty={boss.difficulty} />
                              <span className="text-[11px]">{boss.difficulty === 'easy' ? '簡' : boss.difficulty === 'normal' ? '普' : boss.difficulty === 'hard' ? '困' : '極'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
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
