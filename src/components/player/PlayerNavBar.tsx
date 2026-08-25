import { useMemo, useState, DragEvent } from 'react';
import { Player, Character } from '@/types/player';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { sortCharactersByLocalOrder } from '@/utils/localOrder';
import { cn } from '@/utils/cn';
import { UserPlus, Users, Crown, PlusCircle, GripVertical } from 'lucide-react';

interface PlayerNavBarProps {
  players: Player[];
  selectedPlayerName: string | null;
  onSelectPlayer: (playerName: string) => void;
  onOpenAddPlayerModal: () => void;
  onOpenAddCharacterModal?: (playerName: string) => void;
  onScrollToGuests?: () => void;
  onScrollToCharacter?: (charId: string) => void;
  onReorderCharacters?: (playerName: string, reorderedChars: Character[]) => void;
}

export function PlayerNavBar({
  players,
  selectedPlayerName,
  onSelectPlayer,
  onOpenAddPlayerModal,
  onOpenAddCharacterModal,
  onScrollToGuests,
  onScrollToCharacter,
  onReorderCharacters,
}: PlayerNavBarProps) {
  const { currentPlayer, canManageChar } = useAuth();
  const [draggingCharId, setDraggingCharId] = useState<string | null>(null);
  const [dragOverCharId, setDragOverCharId] = useState<string | null>(null);

  // 1. 當前登入者一律排序在最前面
  const sortedPlayers = useMemo(() => {
    if (!currentPlayer) return players;
    const current = players.find((p) => p.name === currentPlayer.name);
    if (!current) return players;
    const others = players.filter((p) => p.name !== currentPlayer.name);
    return [current, ...others];
  }, [players, currentPlayer]);

  // 當前選中的玩家物件
  const selectedPlayer = useMemo(() => {
    return players.find((p) => p.name === selectedPlayerName) || sortedPlayers[0] || null;
  }, [players, selectedPlayerName, sortedPlayers]);

  const rawSelectedChars = selectedPlayer?.characters || [];
  const selectedCharacters = useMemo(() => {
    if (!selectedPlayer) return [];
    return sortCharactersByLocalOrder(selectedPlayer.name, rawSelectedChars);
  }, [selectedPlayer, rawSelectedChars]);
  const isManageable = selectedPlayer ? canManageChar(selectedPlayer.name) : false;

  // 角色拖曳排序處理函式 (DnD Event Handlers)
  const handleDragStart = (e: DragEvent<HTMLDivElement>, charId: string) => {
    if (!isManageable) return;
    setDraggingCharId(charId);
    e.dataTransfer.setData('text/plain', charId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, targetCharId: string) => {
    if (!isManageable || !draggingCharId || draggingCharId === targetCharId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCharId !== targetCharId) {
      setDragOverCharId(targetCharId);
    }
  };

  const handleDragLeave = (_e: DragEvent<HTMLDivElement>, targetCharId: string) => {
    if (dragOverCharId === targetCharId) {
      setDragOverCharId(null);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, targetCharId: string) => {
    e.preventDefault();
    const sourceCharId = draggingCharId || e.dataTransfer.getData('text/plain');
    if (!isManageable || !sourceCharId || sourceCharId === targetCharId || !selectedPlayer) {
      setDraggingCharId(null);
      setDragOverCharId(null);
      return;
    }

    const currentChars = [...selectedCharacters];
    const fromIdx = currentChars.findIndex((c) => c.id === sourceCharId);
    const toIdx = currentChars.findIndex((c) => c.id === targetCharId);

    if (fromIdx !== -1 && toIdx !== -1) {
      const [movedChar] = currentChars.splice(fromIdx, 1);
      currentChars.splice(toIdx, 0, movedChar);

      if (onReorderCharacters) {
        onReorderCharacters(selectedPlayer.name, currentChars);
      }
    }

    setDraggingCharId(null);
    setDragOverCharId(null);
  };

  const handleDragEnd = () => {
    setDraggingCharId(null);
    setDragOverCharId(null);
  };

  return (
    <div className="sticky top-16 z-30 w-full bg-[#EBD8B8]/95 dark:bg-slate-900/95 backdrop-blur-md border-b-2.5 border-kerning-stroke shadow-md transition-colors select-none">
      <div className="max-w-[1880px] w-full mx-auto px-2.5 sm:px-4">
        {/* 第一列：玩家切換標籤列 */}
        <div className="py-2 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar p-1">
          <div className="flex items-center gap-2 shrink-0 py-1 pl-1 pr-1">
            {sortedPlayers.map((p) => {
              const isSelected = selectedPlayer?.name === p.name;
              const isSelf = currentPlayer?.name === p.name;
              const charCount = p.characters?.length || 0;

              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => onSelectPlayer(p.name)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all duration-100 border-1.5 select-none active:translate-y-[1px]',
                    isSelected
                      ? 'border-kerning-stroke bg-gradient-to-b from-amber-400 to-orange-500 text-white shadow-[0_1.5px_0_rgba(0,0,0,0.35)] dark:shadow-[0_1.5px_0_#000000]'
                      : isSelf
                      ? 'border-amber-600/50 bg-amber-400/15 text-[#4A3B2C] dark:text-yellow-300 hover:bg-amber-400/25 shadow-[0_1px_0_rgba(0,0,0,0.15)]'
                      : 'border-kerning-stroke/70 bg-[#FDF5E6] dark:bg-slate-800 text-[#4A3B2C] dark:text-slate-200 hover:bg-[#FFF8E7] dark:hover:bg-slate-700 shadow-[0_1px_0_rgba(0,0,0,0.15)]'
                  )}
                >
                  <span className="w-5 h-5 rounded-md bg-black/10 flex items-center justify-center text-xs shrink-0">
                    {p.avatarEmoji || '👤'}
                  </span>

                  <span className="truncate max-w-[110px]">{p.name}</span>

                  {p.isAdmin && <Crown className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}

                  <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] opacity-90">
                    {charCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 右側工具按鈕 */}
          <div className="flex items-center gap-1.5 shrink-0 py-1 pr-1">
            {onScrollToGuests && (
              <Button
                size="sm"
                variant="parchment"
                onClick={onScrollToGuests}
                className="h-8 px-2.5 text-xs"
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">臨時隊友</span>
              </Button>
            )}

            <Button
              size="sm"
              variant="gold"
              onClick={onOpenAddPlayerModal}
              className="h-8 px-3 text-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>新增玩家</span>
            </Button>
          </div>
        </div>

        {/* 第二列：當前選中玩家所擁有的角色圓形頭像列 (支援 DnD 拖曳排序) */}
        {selectedPlayer && (
          <div className="py-2 border-t border-kerning-stroke/30 dark:border-slate-700/50 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar p-1">
            <div className="flex items-center gap-2.5 shrink-0 py-1 pl-1 pr-1">
              <span className="text-xs font-black text-stone-600 dark:text-slate-300 flex items-center gap-1 shrink-0">
                <span>{selectedPlayer.name} 的角色 ({selectedCharacters.length})：</span>
              </span>

              {selectedCharacters.map((char) => {
                const isDragging = draggingCharId === char.id;
                const isDragOver = dragOverCharId === char.id;

                return (
                  <div
                    key={char.id}
                    draggable={isManageable}
                    onDragStart={(e) => handleDragStart(e, char.id)}
                    onDragOver={(e) => handleDragOver(e, char.id)}
                    onDragLeave={(e) => handleDragLeave(e, char.id)}
                    onDrop={(e) => handleDrop(e, char.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => {
                      if (!isDragging && onScrollToCharacter) {
                        onScrollToCharacter(char.id);
                      }
                    }}
                    className={cn(
                      'group flex items-center gap-1.5 px-2.5 py-1 rounded-full border-2 shadow-xs transition-all shrink-0 select-none',
                      isManageable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
                      isDragging
                        ? 'opacity-30 scale-90 border-dashed border-sky-500 bg-sky-100 dark:bg-slate-900'
                        : isDragOver
                        ? 'border-amber-500 bg-amber-200/90 dark:bg-amber-950/80 scale-105 ring-2 ring-amber-400 shadow-md'
                        : 'bg-[#FFFDF9]/90 dark:bg-slate-800/90 hover:bg-amber-100 dark:hover:bg-slate-700 border-kerning-stroke/70 hover:border-amber-500 active:scale-95'
                    )}
                    title={isManageable ? "左右拖曳可調整角色顯示順序，點擊可直接定位至該角色" : "點擊可直接定位至該角色"}
                  >
                    {/* 圓形立繪頭像 */}
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-b from-[#FFF5DC] to-[#ECD2A8] dark:from-slate-700 dark:to-slate-900 border border-amber-600/50 overflow-hidden flex items-center justify-center shrink-0 shadow-inner pointer-events-none">
                      {char.characterImage ? (
                        <img
                          src={char.characterImage}
                          alt={char.name}
                          className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform pointer-events-none"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-xs">🗡️</span>
                      )}
                    </div>

                    <span className="text-xs font-black text-[#3E2F20] dark:text-slate-200 truncate max-w-[110px] pointer-events-none">
                      {char.name}
                    </span>

                    {isManageable && (
                      <GripVertical className="w-3 h-3 text-stone-400 group-hover:text-amber-600 opacity-40 group-hover:opacity-100 transition-opacity shrink-0 pointer-events-none" />
                    )}
                  </div>
                );
              })}

              {onOpenAddCharacterModal && (
                <button
                  type="button"
                  onClick={() => onOpenAddCharacterModal(selectedPlayer.name)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/20 hover:bg-amber-400/35 text-amber-900 dark:text-amber-300 text-xs font-bold border border-dashed border-amber-500/60 transition-colors shrink-0"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>新增角色</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
