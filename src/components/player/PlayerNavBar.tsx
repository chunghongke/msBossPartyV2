import * as HoverCard from '@radix-ui/react-hover-card';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { useMemo, useState, DragEvent } from 'react';
import { Player, Character } from '@/types/player';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/utils/cn';
import { sortCharactersByLocalOrder, saveLocalCharacterOrder, sortPlayersByLocalOrder, saveLocalPlayerOrder } from '@/utils/localOrder';
import { UserPlus, Users, Crown, PlusCircle, LayoutList, LayoutGrid, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface PlayerNavBarProps {
  players: Player[];
  selectedPlayerName: string | null;
  guestCount?: number;
  viewMode?: 'compact' | 'detailed';
  onSetViewMode?: (mode: 'compact' | 'detailed') => void;
  crystalEarned?: number;
  crystalExpected?: number;
  formatCrystal?: (num: number) => string;
  onSyncAllCharImages?: (player: Player) => void;
  isSyncingPlayer?: string | null;
  onSelectPlayer: (playerName: string) => void;
  onOpenAddPlayerModal: () => void;
  onOpenAddCharacterModal?: (playerName: string) => void;
  onScrollToCharacter?: (charId: string) => void;
  onReorderCharacters?: (playerName: string, reorderedChars: Character[]) => void;
  onReorderPlayers?: (reorderedPlayers: Player[]) => void;
}

export function PlayerNavBar({
  players,
  selectedPlayerName,
  guestCount = 0,
  viewMode = 'compact',
  onSetViewMode,
  crystalEarned = 0,
  crystalExpected = 0,
  formatCrystal,
  onSyncAllCharImages,
  isSyncingPlayer,
  onSelectPlayer,
  onOpenAddPlayerModal,
  onOpenAddCharacterModal,
  onScrollToCharacter,
  onReorderCharacters,
  onReorderPlayers,
}: PlayerNavBarProps) {
  const { currentPlayer, isAdmin, canManagePlayerName } = useAuth();
  const [draggingCharId, setDraggingCharId] = useState<string | null>(null);
  const [dragOverCharId, setDragOverCharId] = useState<string | null>(null);
  const [navOrderVersion, setNavOrderVersion] = useState(0);

  const [draggingPlayerName, setDraggingPlayerName] = useState<string | null>(null);
  const [dragOverPlayerName, setDragOverPlayerName] = useState<string | null>(null);
  const [playerOrderVersion, setPlayerOrderVersion] = useState(0);

  // 1. 依據本地自訂排序 (支援 DnD 拖曳重排)
  const sortedPlayers = useMemo(() => {
    return sortPlayersByLocalOrder(players, currentPlayer?.name);
  }, [players, currentPlayer?.name, playerOrderVersion]);

  // 玩家拖曳排序處理函式 (Player DnD Event Handlers)
  const handlePlayerDragStart = (e: DragEvent<HTMLDivElement>, pName: string) => {
    setDraggingPlayerName(pName);
    e.dataTransfer.setData('text/plain', `player:${pName}`);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handlePlayerDragOver = (e: DragEvent<HTMLDivElement>, targetPlayerName: string) => {
    if (!draggingPlayerName || draggingPlayerName === targetPlayerName) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverPlayerName !== targetPlayerName) {
      setDragOverPlayerName(targetPlayerName);
    }
  };

  const handlePlayerDragLeave = (_e: DragEvent<HTMLDivElement>, targetPlayerName: string) => {
    if (dragOverPlayerName === targetPlayerName) {
      setDragOverPlayerName(null);
    }
  };

  const handlePlayerDrop = (e: DragEvent<HTMLDivElement>, targetPlayerName: string) => {
    e.preventDefault();
    const sourceData = draggingPlayerName || e.dataTransfer.getData('text/plain');
    const sourcePlayerName = sourceData.startsWith('player:') ? sourceData.slice(7) : sourceData;

    if (!sourcePlayerName || sourcePlayerName === targetPlayerName) {
      setDraggingPlayerName(null);
      setDragOverPlayerName(null);
      return;
    }

    const currentList = [...sortedPlayers];
    const fromIdx = currentList.findIndex((p) => p.name === sourcePlayerName);
    const toIdx = currentList.findIndex((p) => p.name === targetPlayerName);

    if (fromIdx !== -1 && toIdx !== -1) {
      const [movedPlayer] = currentList.splice(fromIdx, 1);
      currentList.splice(toIdx, 0, movedPlayer);

      saveLocalPlayerOrder(currentList.map((p) => p.name));
      setPlayerOrderVersion((v) => v + 1);

      if (onReorderPlayers) {
        onReorderPlayers(currentList);
      }
    }

    setDraggingPlayerName(null);
    setDragOverPlayerName(null);
  };

  const handlePlayerDragEnd = () => {
    setDraggingPlayerName(null);
    setDragOverPlayerName(null);
  };

  // 取得當前選取的玩家物件
  const selectedPlayer = useMemo(() => {
    if (!selectedPlayerName || selectedPlayerName === '__guests__') return null;
    return players.find((p) => p.name === selectedPlayerName) || null;
  }, [players, selectedPlayerName]);

  // 取得該玩家的角色並套用本地自訂排序 (由左至右)
  const selectedCharacters = useMemo(() => {
    if (!selectedPlayer) return [];
    return sortCharactersByLocalOrder(selectedPlayer.name, selectedPlayer.characters || []);
  }, [selectedPlayer, navOrderVersion]);

  // 角色拖曳排序處理函式 (Character DnD Event Handlers)
  const handleDragStart = (e: DragEvent<HTMLDivElement>, charId: string) => {
    setDraggingCharId(charId);
    e.dataTransfer.setData('text/plain', charId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, targetCharId: string) => {
    if (!draggingCharId || draggingCharId === targetCharId) return;
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

    if (!sourceCharId || sourceCharId === targetCharId || !selectedPlayer) {
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

      saveLocalCharacterOrder(selectedPlayer.name, currentChars.map((c) => c.id));
      setNavOrderVersion((v) => v + 1);

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

  const canManage = selectedPlayer ? canManagePlayerName(selectedPlayer.name) : false;

  return (
    <div className="sticky top-16 z-30 w-full bg-[#EBD8B8]/95 dark:bg-slate-900/95 backdrop-blur-md border-b-2.5 border-kerning-stroke shadow-md transition-colors select-none">
      <div className="max-w-[1880px] w-full mx-auto px-2.5 sm:px-4">
        {/* 第一列：玩家切換標籤列 ＋ 臨時隊友 ＋ 緊湊/大圖模式切換 */}
        <div className="py-2 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar p-1">
          <div className="flex items-center gap-2 shrink-0 py-1 pl-1 pr-1">
            {sortedPlayers.map((p) => {
              const isSelected = selectedPlayer?.name === p.name;
              const isSelf = currentPlayer?.name === p.name;
              const charCount = p.characters?.length || 0;
              const isDragging = draggingPlayerName === p.name;
              const isDragOver = dragOverPlayerName === p.name;

              return (
                <div
                  key={p.name}
                  draggable={true}
                  onDragStart={(e) => handlePlayerDragStart(e, p.name)}
                  onDragOver={(e) => handlePlayerDragOver(e, p.name)}
                  onDragLeave={(e) => handlePlayerDragLeave(e, p.name)}
                  onDrop={(e) => handlePlayerDrop(e, p.name)}
                  onDragEnd={handlePlayerDragEnd}
                  onClick={() => {
                    if (!isDragging) {
                      onSelectPlayer(p.name);
                    }
                  }}
                  className={cn(
                    'group/player px-2.5 py-1 rounded-xl font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all duration-100 border-1.5 select-none active:translate-y-[1px] cursor-grab active:cursor-grabbing shrink-0 relative',
                    isDragging
                      ? 'opacity-30 scale-90 border-dashed border-sky-500 bg-sky-100 dark:bg-slate-900'
                      : isDragOver
                      ? 'border-amber-500 bg-amber-200/90 dark:bg-amber-950/80 scale-105 ring-2 ring-amber-400 shadow-md'
                      : isSelected
                      ? 'border-kerning-stroke bg-gradient-to-b from-amber-400 to-orange-500 text-white shadow-[0_1.5px_0_rgba(0,0,0,0.35)] dark:shadow-[0_1.5px_0_#000000]'
                      : isSelf
                      ? 'border-amber-600/50 bg-amber-400/15 text-[#4A3B2C] dark:text-yellow-300 hover:bg-amber-400/25 shadow-[0_1px_0_rgba(0,0,0,0.15)]'
                      : 'border-kerning-stroke/70 bg-[#FDF5E6] dark:bg-slate-800 text-[#4A3B2C] dark:text-slate-200 hover:bg-[#FFF8E7] dark:hover:bg-slate-700 shadow-[0_1px_0_rgba(0,0,0,0.15)]'
                  )}
                  title="左右拖曳可調整玩家排序，點擊可切換至該玩家"
                >
                  {/* 玩家頭像 (Radix Portal 高清大圖懸停預覽) */}
                  <HoverCard.Root openDelay={150} closeDelay={150}>
                    <HoverCard.Trigger asChild>
                      <div className="shrink-0 cursor-pointer pointer-events-auto">
                        <PlayerAvatar
                          player={p}
                          size="sm"
                          className="w-6 h-6 rounded-lg text-xs shadow-xs border-1.5"
                        />
                      </div>
                    </HoverCard.Trigger>
                    <HoverCard.Portal>
                      <HoverCard.Content
                        side="bottom"
                        align="center"
                        sideOffset={10}
                        className="z-[100] w-48 p-3 bg-[#FFFDF9] dark:bg-slate-900 border-2 border-amber-400/90 rounded-2xl shadow-2xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-150 outline-none select-none text-center drop-shadow-2xl"
                      >
                        <div className="w-28 h-28 mx-auto rounded-full overflow-hidden border-2 border-amber-500 bg-amber-400/20 shadow-md flex items-center justify-center mb-2">
                          {p.avatarImage ? (
                            <img
                              src={p.avatarImage}
                              alt={p.name}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <span className="text-5xl">{p.avatarEmoji || '👤'}</span>
                          )}
                        </div>
                        <div className="font-black text-xs text-[#3E2F20] dark:text-slate-100 flex items-center justify-center gap-1">
                          <span>{p.name}</span>
                          {p.isAdmin && <Crown className="w-3 h-3 text-yellow-500 shrink-0" />}
                        </div>
                        <div className="text-[10px] text-stone-500 dark:text-slate-400 mt-0.5 font-sans">
                          名下共有 {charCount} 隻角色
                        </div>
                      </HoverCard.Content>
                    </HoverCard.Portal>
                  </HoverCard.Root>

                  <span className="truncate max-w-[100px] pointer-events-none font-bold">{p.name}</span>

                  {p.isAdmin && <Crown className="w-3 h-3 text-yellow-400 shrink-0 pointer-events-none" />}

                  <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[9.5px] opacity-90 pointer-events-none font-fredoka">
                    {charCount}
                  </span>
                </div>
              );
            })}

            {/* 新增玩家虛線橢圓標籤 (僅管理員顯示) */}
            {isAdmin && (
              <button
                type="button"
                onClick={onOpenAddPlayerModal}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-400/20 hover:bg-amber-400/35 text-amber-900 dark:text-amber-300 text-xs font-bold border-2 border-dashed border-amber-500/60 transition-colors shrink-0 cursor-pointer select-none"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>新增玩家</span>
              </button>
            )}
          </div>

          {/* 右側工具群：臨時隊友 ＋ 檢視版面切換器 (緊湊條列 / 詳細大圖) */}
          <div className="flex items-center gap-2 shrink-0 py-1 pr-1">
            <button
              type="button"
              onClick={() => onSelectPlayer('__guests__')}
              className={cn(
                'h-8 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all select-none border-1.5 active:translate-y-[1px]',
                selectedPlayerName === '__guests__'
                  ? 'bg-gradient-to-b from-indigo-500 to-purple-600 text-white border-indigo-400 shadow-md scale-105 font-black ring-2 ring-indigo-400/50'
                  : 'bg-[#FDF5E6] dark:bg-slate-800 text-[#4A3B2C] dark:text-slate-200 border-kerning-stroke/70 dark:border-slate-700 hover:bg-[#FFF8E7] dark:hover:bg-slate-700 shadow-[0_1px_0_rgba(0,0,0,0.15)]'
              )}
            >
              <Users className="w-3.5 h-3.5" />
              <span>臨時隊友</span>
              {guestCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] opacity-90 font-fredoka">
                  {guestCount}
                </span>
              )}
            </button>

            {/* 檢視版面切換器: 緊湊條列 / 詳細大圖 */}
            {onSetViewMode && (
              <div className="flex items-center p-0.5 bg-black/10 dark:bg-slate-800 rounded-xl border border-kerning-stroke/50 select-none shrink-0 shadow-inner">
                <button
                  type="button"
                  onClick={() => onSetViewMode('compact')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 transition-all',
                    viewMode === 'compact'
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  )}
                  title="緊湊條列模式：一屏容納多隻角色"
                >
                  <LayoutList className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">緊湊條列</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSetViewMode('detailed')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 transition-all',
                    viewMode === 'detailed'
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  )}
                  title="詳細大圖模式：寬鬆大立繪卡片"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">詳細大圖</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 第二列：若選中臨時隊友，顯示專屬提示；若選中玩家，顯示角色快選、結晶總計與操作按鈕 */}
        {selectedPlayerName === '__guests__' ? (
          <div className="py-2 border-t border-kerning-stroke/30 dark:border-slate-700/50 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar p-1">
            <div className="flex items-center gap-2 shrink-0 py-1 pl-1 pr-1">
              <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 shrink-0">
                <Users className="w-4 h-4" />
                <span>👥 臨時隊友名冊 (Guest) 管理面板</span>
              </span>
              <span className="text-xs text-stone-500 dark:text-slate-400 font-bold hidden sm:inline">
                （非固定常駐成員，點選上方任一玩家標籤可隨時返回角色清單）
              </span>
            </div>
          </div>
        ) : selectedPlayer && (
          <div className="py-1.5 border-t border-kerning-stroke/30 dark:border-slate-700/50 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar p-1">
            {/* 左側：精簡角色快選 (移除重複玩家名稱) */}
            <div className="flex items-center gap-2 shrink-0 py-1 pl-1 pr-1">
              <span className="text-xs font-black text-stone-600 dark:text-slate-300 flex items-center gap-1 shrink-0">
                <span>角色快選 ({selectedCharacters.length})：</span>
              </span>

              {selectedCharacters.map((char) => {
                const isDragging = draggingCharId === char.id;
                const isDragOver = dragOverCharId === char.id;

                return (
                  <div
                    key={char.id}
                    draggable={true}
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
                      'group flex items-center gap-1 px-2 py-0.5 rounded-full border-1.5 shadow-xs transition-all shrink-0 select-none cursor-grab active:cursor-grabbing',
                      isDragging
                        ? 'opacity-30 scale-90 border-dashed border-sky-500 bg-sky-100 dark:bg-slate-900'
                        : isDragOver
                        ? 'border-amber-500 bg-amber-200/90 dark:bg-amber-950/80 scale-105 ring-2 ring-amber-400 shadow-md'
                        : 'border-kerning-stroke/60 bg-[#FFFDF9] dark:bg-slate-800 text-[#4A3B2C] dark:text-slate-200 hover:border-amber-500 hover:bg-amber-100/50 dark:hover:bg-slate-700'
                    )}
                    title="點擊滑動至該角色，左右拖曳可自訂排序"
                  >
                    <div className="w-5 h-5 rounded-full overflow-hidden bg-amber-400/20 border border-amber-500/50 shrink-0 flex items-center justify-center pointer-events-none">
                      {char.characterImage ? (
                        <img
                          src={char.characterImage}
                          alt={char.name}
                          className="w-full h-full object-cover object-top pointer-events-none"
                          onError={(e: any) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-[10px] pointer-events-none">🗡️</span>
                      )}
                    </div>

                    <span className="text-[11px] font-bold truncate max-w-[85px] pointer-events-none">
                      {char.name}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 右側：結晶楓幣統計 ＋ 同步立繪 ＋ 新增角色按鈕 */}
            <div className="flex items-center gap-2 shrink-0 py-1 pr-1">
              {/* 全部角色的結晶楓幣總和膠囊 */}
              {formatCrystal && crystalExpected > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-[#FFF8E7] dark:bg-slate-800 rounded-xl border-2 border-[#D4B982] dark:border-slate-700 shadow-sm text-xs select-none shrink-0">
                  <span className="text-sm">🪙</span>
                  <span className="font-bold text-stone-500 dark:text-slate-400 hidden md:inline">結晶總計：</span>
                  <span className="font-fredoka font-black text-amber-700 dark:text-amber-300 text-xs sm:text-sm">
                    {formatCrystal(crystalEarned)} / {formatCrystal(crystalExpected)}
                  </span>
                </div>
              )}

              {/* 同步官方立繪按鈕 */}
              {onSyncAllCharImages && selectedCharacters.length > 0 && (
                <Button
                  size="sm"
                  variant="parchment"
                  onClick={() => onSyncAllCharImages(selectedPlayer)}
                  isLoading={isSyncingPlayer === selectedPlayer.name}
                  className="h-7 px-2.5 text-xs font-bold shrink-0"
                  title="一鍵連線 Nexon 官方，同步該玩家名下所有角色的最新官方立繪"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  <span className="hidden sm:inline">同步全角色立繪</span>
                  <span className="sm:hidden">同步</span>
                </Button>
              )}

              {/* 新增角色按鈕 */}
              {onOpenAddCharacterModal && canManage && (
                <Button
                  size="sm"
                  variant="gold"
                  onClick={() => onOpenAddCharacterModal(selectedPlayer.name)}
                  className="h-7 px-2.5 text-xs font-bold shrink-0"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1" />
                  <span>新增角色</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
