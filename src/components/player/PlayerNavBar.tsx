import * as HoverCard from '@radix-ui/react-hover-card';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { useMemo, useState, useRef, useEffect, useLayoutEffect, useCallback, DragEvent, WheelEvent } from 'react';
import { createPortal } from 'react-dom';
import { Player, Character } from '@/types/player';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/utils/cn';
import { sortCharactersByLocalOrder, saveLocalCharacterOrder, sortPlayersByLocalOrder, saveLocalPlayerOrder } from '@/utils/localOrder';
import { UserPlus, Users, Crown, UserX, PlusCircle, LayoutList, LayoutGrid, RefreshCw, ChevronLeft, ChevronRight, MoreHorizontal, SlidersHorizontal, Pin, ArrowDownToLine } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ReorderPlayersModal } from '@/components/modals/ReorderPlayersModal';

interface PlayerNavBarProps {
  players: Player[];
  selectedPlayerName: string | null;
  guestCount?: number;
  viewMode?: 'compact' | 'detailed';
  onSetViewMode?: (mode: 'compact' | 'detailed') => void;
  completedSort?: 'fixed' | 'to-end';
  onSetCompletedSort?: (mode: 'fixed' | 'to-end') => void;
  crystalEarned?: number;
  crystalExpected?: number;
  formatCrystal?: (num: number) => string;
  onSyncAllCharImages?: (player: Player) => void;
  isSyncingPlayer?: string | null;
  onSelectPlayer: (playerName: string) => void;
  onOpenAddPlayerModal: () => void;
  onOpenAddCharacterModal?: (playerName: string) => void;
  onOpenDeletePlayerModal?: (player: Player) => void;
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
  completedSort = 'fixed',
  onSetCompletedSort,
  crystalEarned = 0,
  crystalExpected = 0,
  formatCrystal,
  onSyncAllCharImages,
  isSyncingPlayer,
  onSelectPlayer,
  onOpenAddPlayerModal,
  onOpenAddCharacterModal,
  onOpenDeletePlayerModal,
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
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  const toggleOverflowMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOverflowOpen && moreBtnRef.current) {
      const rect = moreBtnRef.current.getBoundingClientRect();
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - 272));
      const top = rect.bottom + 8;
      setMenuPos({ top, left });
    }
    setIsOverflowOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOverflowOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOverflowOpen(false);
    };
    const handleResizeOrScroll = () => {
      if (moreBtnRef.current) {
        const rect = moreBtnRef.current.getBoundingClientRect();
        const left = Math.max(8, Math.min(rect.left, window.innerWidth - 272));
        const top = rect.bottom + 8;
        setMenuPos({ top, left });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, { passive: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll);
    };
  }, [isOverflowOpen]);

  // 玩家標籤溢位自適應計算 (Adaptive Player Overflow Calculation - Zero Flash)
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerItemWidthsRef = useRef<Map<string, number>>(new Map());
  const [visiblePlayerCount, setVisiblePlayerCount] = useState<number>(() => {
    return Math.min(players.length, 6);
  });

  // 角色快選滾動容器參照與狀態 (Character Scroll Refs & State)
  const charScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollCharLeft, setCanScrollCharLeft] = useState(false);
  const [canScrollCharRight, setCanScrollCharRight] = useState(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. 依據本地自訂排序 (支援 DnD 拖曳重排)
  const sortedPlayers = useMemo(() => {
    return sortPlayersByLocalOrder(players, currentPlayer?.name);
  }, [players, currentPlayer?.name, playerOrderVersion]);

  // 動態計算能完整容納的玩家標籤數量 (以 useCallback + useLayoutEffect 達成零閃爍)
  const updateVisibleCount = useCallback(() => {
    const container = playerContainerRef.current;
    if (!container) return;

    const availableWidth = container.clientWidth;
    if (availableWidth <= 0) return;

    const addBtnWidth = isAdmin ? 105 : 0;
    const moreBtnWidth = 56; // 省略符號按鈕寬度
    const gap = 6; // gap-1.5 是 6px

    let accumulated = addBtnWidth;
    let count = 0;

    for (let i = 0; i < sortedPlayers.length; i++) {
      const p = sortedPlayers[i];
      const w = playerItemWidthsRef.current.get(p.name) || 120;
      const nextWidth = accumulated + w + (count > 0 ? gap : 0);

      const isLast = i === sortedPlayers.length - 1;
      const totalNeeded = isLast ? nextWidth : nextWidth + gap + moreBtnWidth;

      if (totalNeeded <= availableWidth) {
        accumulated = nextWidth;
        count++;
      } else {
        break;
      }
    }

    const finalCount = Math.max(1, Math.min(sortedPlayers.length, count));
    setVisiblePlayerCount((prev) => (prev === finalCount ? prev : finalCount));
  }, [sortedPlayers, isAdmin]);

  // 💡 使用 useLayoutEffect 在 DOM 繪製前同步完成計算，徹底杜絕閃爍延遲
  useLayoutEffect(() => {
    updateVisibleCount();

    const container = playerContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      updateVisibleCount();
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [updateVisibleCount]);

  // 方案 B【嚴格固定排名模式】：前 N 位外顯，其餘嚴格依序收錄在省略選單
  const { visiblePlayers, overflowPlayers, isSelectedInOverflow } = useMemo(() => {
    if (visiblePlayerCount >= sortedPlayers.length) {
      return { visiblePlayers: sortedPlayers, overflowPlayers: [], isSelectedInOverflow: false };
    }

    const visible = sortedPlayers.slice(0, visiblePlayerCount);
    const overflow = sortedPlayers.slice(visiblePlayerCount);
    const isSelectedInOverflow = overflow.some((p) => p.name === selectedPlayerName);

    return { visiblePlayers: visible, overflowPlayers: overflow, isSelectedInOverflow };
  }, [sortedPlayers, visiblePlayerCount, selectedPlayerName]);

  // 監聽角色快選列表滾動狀態
  const updateCharScrollStatus = () => {
    const el = charScrollRef.current;
    if (!el) return;
    setCanScrollCharLeft(el.scrollLeft > 4);
    setCanScrollCharRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateCharScrollStatus();
    const cEl = charScrollRef.current;
    cEl?.addEventListener('scroll', updateCharScrollStatus, { passive: true });
    window.addEventListener('resize', updateCharScrollStatus);

    return () => {
      cEl?.removeEventListener('scroll', updateCharScrollStatus);
      window.removeEventListener('resize', updateCharScrollStatus);
    };
  }, [selectedPlayerName]);

  // 滾動輔助函式
  const scrollElement = (el: HTMLDivElement | null, offset: number) => {
    if (el) {
      el.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const startHoldScroll = (el: HTMLDivElement | null, offset: number) => {
    scrollElement(el, offset);
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    holdTimerRef.current = setInterval(() => {
      if (el) {
        el.scrollLeft += offset * 0.25;
      }
    }, 40);
  };

  const stopHoldScroll = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const handleWheelScroll = (e: WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0) {
      e.currentTarget.scrollLeft += e.deltaY;
    }
  };

  // 玩家拖曳排序處理函式 (Player DnD Event Handlers)
  const handlePlayerDragStart = (e: DragEvent<HTMLDivElement>, pName: string) => {
    if (currentPlayer && pName === currentPlayer.name) {
      e.preventDefault();
      return;
    }
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
    const minIndex = currentPlayer ? 1 : 0;

    if (fromIdx >= minIndex && toIdx >= minIndex) {
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
    <>
      <div className="sticky top-16 z-30 w-full bg-[#EBD8B8]/95 dark:bg-slate-900/95 backdrop-blur-md border-b-2.5 border-kerning-stroke shadow-md transition-colors select-none">
        <div className="max-w-[1880px] w-full mx-auto px-2.5 sm:px-4">
          {/* 第一列：玩家切換標籤列 (方案 B 嚴格固定排序，超量收納於省略號 ...) ＋ 右側常駐工具群 */}
          <div className="py-1.5 flex items-center justify-between gap-2.5 w-full">
            {/* 左側玩家標籤區域 (自適應排版，無卷軸，超量自動摺疊至 ...) */}
            <div ref={playerContainerRef} className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden py-0.5">
              {visiblePlayers.map((p) => {
                const isSelected = selectedPlayer?.name === p.name;
                const isSelf = currentPlayer?.name === p.name;
                const charCount = p.characters?.length || 0;
                const isDragging = draggingPlayerName === p.name;
                const isDragOver = dragOverPlayerName === p.name;

                return (
                  <div
                    key={p.name}
                    ref={(el) => {
                      if (el) {
                        playerItemWidthsRef.current.set(p.name, el.offsetWidth);
                      }
                    }}
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
                      'group/player px-2 sm:px-2.5 py-1 rounded-xl font-black text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 transition-all duration-100 border-1.5 select-none active:translate-y-[1px] cursor-grab active:cursor-grabbing min-w-0 shrink relative',
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

                    <span className="truncate max-w-[65px] sm:max-w-[110px] pointer-events-none font-bold">{p.name}</span>

                    {p.isAdmin && <Crown className="w-3.5 h-3.5 text-yellow-400 shrink-0 pointer-events-none" />}

                    <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[9.5px] opacity-90 pointer-events-none font-fredoka">
                      {charCount}
                    </span>
                  </div>
                );
              })}

              {/* 省略符號按鈕 (...)：方案 B 若選取的玩家在省略清單中，按鈕會亮起橘金選中高亮 */}
              {overflowPlayers.length > 0 && (
                <>
                  <button
                    ref={moreBtnRef}
                    type="button"
                    onClick={toggleOverflowMenu}
                    className={cn(
                      'px-2 sm:px-2.5 py-1 rounded-xl font-black text-xs sm:text-sm flex items-center gap-1 transition-all duration-100 border-1.5 select-none active:translate-y-[1px] cursor-pointer shrink-0 group z-10',
                      isSelectedInOverflow
                        ? 'border-kerning-stroke bg-gradient-to-b from-amber-400 to-orange-500 text-white shadow-[0_1.5px_0_rgba(0,0,0,0.35)] ring-2 ring-amber-400/80 font-black'
                        : 'border-kerning-stroke/70 bg-[#FDF5E6] dark:bg-slate-800 text-[#4A3B2C] dark:text-slate-200 hover:bg-amber-100/70 dark:hover:bg-slate-700 shadow-[0_1px_0_rgba(0,0,0,0.15)]'
                    )}
                    title={
                      isSelectedInOverflow
                        ? `目前選中玩家「${selectedPlayerName}」位於更多選單中（點擊查看）`
                        : `還有 ${overflowPlayers.length} 位玩家（點擊檢視與切換）`
                    }
                  >
                    <MoreHorizontal className={cn('w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-transform group-hover:scale-110', isSelectedInOverflow ? 'text-white' : 'text-amber-700 dark:text-amber-400')} />
                    <span className={cn('font-fredoka font-black text-xs shrink-0', isSelectedInOverflow ? 'text-white' : 'text-amber-800 dark:text-amber-300')}>
                      {isSelectedInOverflow ? `${selectedPlayerName}` : `+${overflowPlayers.length}`}
                    </span>
                  </button>

                  {isOverflowOpen &&
                    createPortal(
                      <div
                        className="fixed inset-0 z-[100] overflow-hidden"
                        onClick={() => setIsOverflowOpen(false)}
                      >
                        {/* 輕量半透明遮罩 (點擊背景關閉) */}
                        <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] animate-in fade-in-0 duration-150" />

                        {/* 彈出選單 */}
                        <div
                          style={{ top: `${menuPos.top}px`, left: `${menuPos.left}px` }}
                          onClick={(e) => e.stopPropagation()}
                          className="fixed z-[101] w-64 max-h-[380px] overflow-y-auto no-scrollbar p-2 bg-[#FFFDF9] dark:bg-slate-900 border-2.5 border-kerning-stroke rounded-2xl shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150 outline-none select-none drop-shadow-2xl space-y-1"
                        >
                          <div className="px-2 py-1 text-[11px] font-black text-stone-500 dark:text-slate-400 border-b border-kerning-stroke/40 dark:border-slate-700/60 flex items-center justify-between">
                            <span>👥 其他玩家 ({overflowPlayers.length} 位)</span>
                            <button
                              type="button"
                              onClick={() => {
                                setIsOverflowOpen(false);
                                setIsReorderModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 text-[10px] text-amber-800 dark:text-amber-200 hover:text-amber-950 dark:hover:text-white bg-amber-400/25 hover:bg-amber-400/40 px-2 py-0.5 rounded-lg border border-amber-500/50 transition-colors font-black cursor-pointer shadow-2xs"
                              title="開啟彈窗自訂玩家前後順序"
                            >
                              <SlidersHorizontal className="w-2.5 h-2.5" />
                              <span>調整排序</span>
                            </button>
                          </div>

                          <div className="pt-1 space-y-1">
                            {overflowPlayers.map((p) => {
                              const isSelected = selectedPlayer?.name === p.name;
                              const isSelf = currentPlayer?.name === p.name;
                              const charCount = p.characters?.length || 0;

                              return (
                                <div
                                  key={p.name}
                                  onClick={() => {
                                    onSelectPlayer(p.name);
                                    setIsOverflowOpen(false);
                                  }}
                                  className={cn(
                                    'flex items-center justify-between p-1.5 rounded-xl border transition-all cursor-pointer select-none text-xs font-bold active:scale-[0.98]',
                                    isSelected
                                      ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white border-kerning-stroke shadow-xs font-black'
                                      : isSelf
                                      ? 'bg-amber-400/15 text-[#4A3B2C] dark:text-yellow-300 border-amber-500/40 hover:bg-amber-400/25'
                                      : 'bg-white dark:bg-slate-800 text-[#4A3B2C] dark:text-slate-200 border-stone-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-slate-700 hover:border-amber-400'
                                  )}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <PlayerAvatar
                                      player={p}
                                      size="sm"
                                      className="w-6 h-6 rounded-lg text-xs shadow-xs border shrink-0"
                                    />
                                    <span className="truncate max-w-[120px] font-black">
                                      {p.name}
                                    </span>
                                    {p.isAdmin && (
                                      <Crown className="w-3 h-3 text-yellow-500 shrink-0" />
                                    )}
                                  </div>

                                  <span
                                    className={cn(
                                      'px-1.5 py-0.2 rounded-full text-[9.5px] font-fredoka font-black shrink-0',
                                      isSelected
                                        ? 'bg-black/20 text-white'
                                        : 'bg-black/10 dark:bg-white/10 text-stone-600 dark:text-slate-300'
                                    )}
                                  >
                                    {charCount} 角色
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>,
                      document.body
                    )}
                </>
              )}

              {/* 新增玩家虛線橢圓標籤 (僅管理員顯示) */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={onOpenAddPlayerModal}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-400/20 hover:bg-amber-400/35 text-amber-900 dark:text-amber-300 text-xs font-bold border-1.5 border-dashed border-amber-500/60 transition-colors shrink-0 cursor-pointer select-none"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>新增玩家</span>
                </button>
              )}
            </div>

            {/* 右側常駐工具群：臨時隊友 ＋ 檢視版面切換器 (固定在右邊，永不被推擠出畫面) */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 pl-1">
              <button
                type="button"
                onClick={() => onSelectPlayer('__guests__')}
                className={cn(
                  'h-7 sm:h-8 px-2.5 sm:px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all select-none border-1.5 active:translate-y-[1px] shrink-0',
                  selectedPlayerName === '__guests__'
                    ? 'bg-gradient-to-b from-indigo-500 to-purple-600 text-white border-indigo-400 shadow-md scale-105 font-black ring-2 ring-indigo-400/50'
                    : 'bg-[#FDF5E6] dark:bg-slate-800 text-[#4A3B2C] dark:text-slate-200 border-kerning-stroke/70 dark:border-slate-700 hover:bg-[#FFF8E7] dark:hover:bg-slate-700 shadow-[0_1px_0_rgba(0,0,0,0.15)]'
                )}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">臨時隊友</span>
                <span className="sm:hidden">隊友</span>
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
                      'px-2 sm:px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 transition-all',
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
                      'px-2 sm:px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 transition-all',
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

              {/* 完成排序模式切換器: 固定順序 / 完成置底 */}
              {onSetCompletedSort && (
                <button
                  type="button"
                  onClick={() => onSetCompletedSort(completedSort === 'fixed' ? 'to-end' : 'fixed')}
                  className={cn(
                    'p-1.5 rounded-xl border transition-all shrink-0 flex items-center justify-center',
                    completedSort === 'to-end'
                      ? 'bg-purple-500/20 border-purple-400/60 text-purple-700 dark:text-purple-300 shadow-xs'
                      : 'bg-black/5 dark:bg-slate-800 border-kerning-stroke/50 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  )}
                  title={
                    completedSort === 'to-end'
                      ? '目前模式：完成置底（已完成的 BOSS 卡片自動移至最後方）。點擊切換為固定順序。'
                      : '目前模式：固定順序（BOSS 卡片位置不變）。點擊切換為完成置底。'
                  }
                >
                  {completedSort === 'to-end' ? (
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                  ) : (
                    <Pin className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* 第二列：若選中臨時隊友，顯示專屬提示；若選中玩家，顯示角色快選 (左側滑動帶方向鍵) ＋ 結晶總計與按鈕 (右側常駐) */}
          {selectedPlayerName === '__guests__' ? (
            <div className="py-1.5 border-t border-kerning-stroke/30 dark:border-slate-700/50 flex items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-2 shrink-0 py-0.5">
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
            <div className="py-1.5 border-t border-kerning-stroke/30 dark:border-slate-700/50 flex items-center justify-between gap-2 w-full">
              {/* 左側可滾動角色快選清單 (含左右方向鍵) */}
              <div className="flex-1 min-w-0 relative flex items-center gap-1">
                {/* 左滾動箭頭按鈕 */}
                {canScrollCharLeft && (
                  <button
                    type="button"
                    onClick={() => scrollElement(charScrollRef.current, -200)}
                    onMouseDown={() => startHoldScroll(charScrollRef.current, -120)}
                    onMouseUp={stopHoldScroll}
                    onMouseLeave={stopHoldScroll}
                    aria-label="向左滑動角色清單"
                    className="w-5 h-5 rounded-lg bg-amber-400 hover:bg-amber-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-950 dark:text-slate-100 border border-amber-600/60 dark:border-slate-600 shadow-xs flex items-center justify-center shrink-0 cursor-pointer transition-all active:scale-90 z-10"
                    title="向左滑動 (可按住連續滑動)"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                )}

                <div
                  ref={charScrollRef}
                  onWheel={handleWheelScroll}
                  className="flex-1 min-w-0 overflow-x-auto no-scrollbar py-0.5"
                >
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-black text-stone-600 dark:text-slate-300 shrink-0">
                      角色快選 ({selectedCharacters.length})：
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
                            'group flex items-center gap-1.5 px-2.5 py-1 rounded-full border-1.5 shadow-xs transition-all shrink-0 select-none cursor-grab active:cursor-grabbing',
                            isDragging
                              ? 'opacity-30 scale-90 border-dashed border-sky-500 bg-sky-100 dark:bg-slate-900'
                              : isDragOver
                              ? 'border-amber-500 bg-amber-200/90 dark:bg-amber-950/80 scale-105 ring-2 ring-amber-400 shadow-md'
                              : 'border-kerning-stroke/60 bg-[#FFFDF9] dark:bg-slate-800 text-[#4A3B2C] dark:text-slate-200 hover:border-amber-500 hover:bg-amber-100/50 dark:hover:bg-slate-700'
                          )}
                          title="點擊滑動至該角色，左右拖曳可自訂排序"
                        >
                          {/* 角色頭像 (Radix Portal 高清立繪懸停預覽小窗) */}
                          <HoverCard.Root openDelay={150} closeDelay={150}>
                            <HoverCard.Trigger asChild>
                              <div className="shrink-0 cursor-pointer pointer-events-auto">
                                <div className="w-6 h-6 rounded-full overflow-hidden bg-amber-400/20 border border-amber-500/50 shrink-0 flex items-center justify-center">
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
                              </div>
                            </HoverCard.Trigger>
                            <HoverCard.Portal>
                              <HoverCard.Content
                                side="bottom"
                                align="center"
                                sideOffset={10}
                                className="z-[100] w-48 p-3 bg-[#FFFDF9] dark:bg-slate-900 border-2 border-amber-400/90 rounded-2xl shadow-2xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-150 outline-none select-none text-center drop-shadow-2xl"
                              >
                                <div className="w-28 h-28 mx-auto rounded-2xl overflow-hidden border-2 border-amber-500 bg-amber-400/20 shadow-md flex items-center justify-center mb-2 p-1">
                                  {char.characterImage ? (
                                    <img
                                      src={char.characterImage}
                                      alt={char.name}
                                      className="w-full h-full object-contain filter drop-shadow-md"
                                    />
                                  ) : (
                                    <span className="text-5xl">🗡️</span>
                                  )}
                                </div>
                                <div className="font-black text-xs text-[#3E2F20] dark:text-slate-100">
                                  {char.name}
                                </div>
                                <div className="text-[10px] text-stone-500 dark:text-slate-400 mt-0.5 font-sans">
                                  點擊可滑動定位至此角色
                                </div>
                              </HoverCard.Content>
                            </HoverCard.Portal>
                          </HoverCard.Root>

                          <span className="text-xs font-bold truncate max-w-[90px] pointer-events-none">
                            {char.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 右滾動箭頭按鈕 */}
                {canScrollCharRight && (
                  <button
                    type="button"
                    onClick={() => scrollElement(charScrollRef.current, 200)}
                    onMouseDown={() => startHoldScroll(charScrollRef.current, 120)}
                    onMouseUp={stopHoldScroll}
                    onMouseLeave={stopHoldScroll}
                    aria-label="向右滑動角色清單"
                    className="w-5 h-5 rounded-lg bg-amber-400 hover:bg-amber-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-950 dark:text-slate-100 border border-amber-600/60 dark:border-slate-600 shadow-xs flex items-center justify-center shrink-0 cursor-pointer transition-all active:scale-90 z-10"
                    title="向右滑動 (可按住連續滑動)"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* 右側常駐控制群：結晶楓幣統計 ＋ 同步立繪 ＋ 新增角色按鈕 (永不被推擠出畫面) */}
              <div className="flex items-center gap-1.5 shrink-0 pl-1">
                {/* 全部角色的結晶楓幣總和膠囊 */}
                {formatCrystal && crystalExpected > 0 && (
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-[#FFF8E7] dark:bg-slate-800 rounded-xl border-1.5 border-[#D4B982] dark:border-slate-700 shadow-2xs text-xs select-none shrink-0">
                    <span className="text-sm">🪙</span>
                    <span className="font-bold text-stone-500 dark:text-slate-400 hidden lg:inline">結晶總計：</span>
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
                  className="h-7 px-2 text-xs font-bold shrink-0"
                  title="一鍵連線 Nexon 官方，同步該玩家名下所有角色的最新官方立繪"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  <span className="hidden md:inline">同步全角色立繪</span>
                  <span className="md:hidden">同步</span>
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

              {/* 刪除玩家按鈕 (限管理員或該玩家本人) */}
              {onOpenDeletePlayerModal && canManage && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => onOpenDeletePlayerModal(selectedPlayer)}
                  className="h-7 px-2 text-xs font-bold shrink-0"
                  title="刪除此冒險者玩家"
                >
                  <UserX className="w-3.5 h-3.5 mr-1" />
                  <span className="hidden xl:inline">刪除玩家</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>

      {/* 玩家排序管理專屬彈窗 */}
      <ReorderPlayersModal
        isOpen={isReorderModalOpen}
        onClose={() => setIsReorderModalOpen(false)}
        players={sortedPlayers}
        visibleCount={visiblePlayerCount}
        onSaveOrder={(reordered) => {
          saveLocalPlayerOrder(reordered.map((p) => p.name));
          setPlayerOrderVersion((v) => v + 1);
          if (onReorderPlayers) {
            onReorderPlayers(reordered);
          }
        }}
      />
    </>
  );
}
