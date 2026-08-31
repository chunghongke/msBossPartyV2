import { useState, useEffect, useLayoutEffect, useRef, DragEvent, MouseEvent } from 'react';
import { Player } from '@/types/player';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { cn } from '@/utils/cn';
import { GripVertical, ArrowUp, ArrowDown, ArrowUpToLine, RotateCcw, Check, Crown, SlidersHorizontal, Lock } from 'lucide-react';

interface ReorderPlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  visibleCount?: number;
  onSaveOrder: (reorderedPlayers: Player[]) => void;
}

export function ReorderPlayersModal({
  isOpen,
  onClose,
  players,
  visibleCount = 6,
  onSaveOrder,
}: ReorderPlayersModalProps) {
  const { currentPlayer } = useAuth();
  const [list, setList] = useState<Player[]>([]);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // 當前正在操作的玩家名稱
  const [activePlayerName, setActivePlayerName] = useState<string | null>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // 💡 游標絕對錨定補償 (Cursor Anchor Compensation)：記錄點擊前按鈕在螢幕上的精準 Y 座標
  const pendingAnchorRef = useRef<{ pName: string; action: 'up' | 'down'; beforeY: number } | null>(null);

  // 初始化列表：登入者固定在第 1 位
  useEffect(() => {
    if (isOpen) {
      const raw = [...players];
      if (currentPlayer) {
        const myIdx = raw.findIndex((p) => p.name === currentPlayer.name);
        if (myIdx > 0) {
          const [me] = raw.splice(myIdx, 1);
          raw.unshift(me);
        }
      }
      setList(raw);
      setDraggingIdx(null);
      setDragOverIdx(null);
      setActivePlayerName(null);
      pendingAnchorRef.current = null;
    }
  }, [isOpen, players, currentPlayer]);

  // 💡 在 DOM 繪製前同步補償滾動偏移量，使按鈕在螢幕上的座標完全不動，滑鼠不需位移即可連續點擊
  useLayoutEffect(() => {
    if (pendingAnchorRef.current && listContainerRef.current) {
      const { pName, action, beforeY } = pendingAnchorRef.current;
      pendingAnchorRef.current = null;

      const btn = document.querySelector(`[data-player-btn="${pName}-${action}"]`) as HTMLElement;
      if (btn) {
        const afterRect = btn.getBoundingClientRect();
        const deltaY = afterRect.top - beforeY;
        if (deltaY !== 0) {
          listContainerRef.current.scrollTop += deltaY;
        }
      }
    }
  }, [list]);

  // 移動項目 (上移 / 下移) - 登入者固定在 0，其餘從 index 1 開始
  const moveItem = (
    fromIndex: number,
    toIndex: number,
    pName: string,
    action: 'up' | 'down',
    e: MouseEvent<HTMLButtonElement>
  ) => {
    const minIndex = currentPlayer ? 1 : 0;
    if (fromIndex < minIndex || toIndex < minIndex || toIndex >= list.length || fromIndex === toIndex) return;

    const targetBtn = e.currentTarget;
    const beforeRect = targetBtn.getBoundingClientRect();
    pendingAnchorRef.current = {
      pName,
      action,
      beforeY: beforeRect.top,
    };

    const nextList = [...list];
    const [moved] = nextList.splice(fromIndex, 1);
    nextList.splice(toIndex, 0, moved);
    setActivePlayerName(pName);
    setList(nextList);
  };

  // 一鍵置頂 (移動至非登入者的第一位，即 index 1)
  const moveToTop = (index: number, pName: string) => {
    const targetIndex = currentPlayer ? 1 : 0;
    if (index <= targetIndex) return;

    const nextList = [...list];
    const [moved] = nextList.splice(index, 1);
    nextList.splice(targetIndex, 0, moved);
    setActivePlayerName(pName);
    setList(nextList);
    if (listContainerRef.current) {
      listContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 重設為原始預設排序 (登入者鎖定第 1 位)
  const handleReset = () => {
    const raw = [...players];
    if (currentPlayer) {
      const myIdx = raw.findIndex((p) => p.name === currentPlayer.name);
      if (myIdx > 0) {
        const [me] = raw.splice(myIdx, 1);
        raw.unshift(me);
      }
    }
    setActivePlayerName(null);
    setList(raw);
  };

  // 儲存並套用 (確保登入者永遠置頂)
  const handleSave = () => {
    const finalList = [...list];
    if (currentPlayer) {
      const myIdx = finalList.findIndex((p) => p.name === currentPlayer.name);
      if (myIdx > 0) {
        const [me] = finalList.splice(myIdx, 1);
        finalList.unshift(me);
      }
    }
    onSaveOrder(finalList);
    onClose();
  };

  // Drag and Drop 處理 (登入者不可被拖曳，也不可被 drop 取代 index 0)
  const handleDragStart = (e: DragEvent<HTMLDivElement>, index: number, pName: string) => {
    if (currentPlayer && pName === currentPlayer.name) {
      e.preventDefault();
      return;
    }
    setDraggingIdx(index);
    setActivePlayerName(pName);
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
    const minIndex = currentPlayer ? 1 : 0;
    if (draggingIdx === null || draggingIdx === index || index < minIndex) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDragLeave = (_e: DragEvent<HTMLDivElement>, index: number) => {
    if (dragOverIdx === index) {
      setDragOverIdx(null);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    const minIndex = currentPlayer ? 1 : 0;
    if (draggingIdx !== null && draggingIdx !== targetIndex && targetIndex >= minIndex && draggingIdx >= minIndex) {
      const pName = list[draggingIdx].name;
      const nextList = [...list];
      const [moved] = nextList.splice(draggingIdx, 1);
      nextList.splice(targetIndex, 0, moved);
      setActivePlayerName(pName);
      setList(nextList);
    }
    setDraggingIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggingIdx(null);
    setDragOverIdx(null);
  };

  const minIndex = currentPlayer ? 1 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent maxWidthClass="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            <SlidersHorizontal className="w-5 h-5 text-amber-500" />
            <span>⚙️ 調整玩家導覽列順序</span>
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-3">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 font-bold flex items-center justify-between">
              <span>💡 當前登入者固定置頂於首位，其他隊友可自由排序。</span>
              <span className="text-[11px] text-amber-700 dark:text-amber-300 font-fredoka">
                前 {Math.min(visibleCount, list.length)} 位在外顯區
              </span>
            </div>

            {/* 玩家列表 (支援內部高度微調與自動補償) */}
            <div
              ref={listContainerRef}
              className="max-h-[380px] overflow-y-auto no-scrollbar space-y-1.5 p-1 py-2"
            >
              {list.map((p, idx) => {
                const isDragging = draggingIdx === idx;
                const isDragOver = dragOverIdx === idx;
                const isVisible = idx < visibleCount;
                const isSelf = currentPlayer?.name === p.name;
                const isActive = activePlayerName === p.name;
                const charCount = p.characters?.length || 0;
                const isLockedFirst = isSelf && idx === 0;

                return (
                  <div
                    key={p.name}
                    data-player-row={p.name}
                    draggable={!isLockedFirst}
                    onDragStart={(e) => handleDragStart(e, idx, p.name)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragLeave={(e) => handleDragLeave(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      'flex items-center justify-between p-2 rounded-xl border-1.5 transition-all select-none',
                      isLockedFirst
                        ? 'border-amber-500/80 bg-gradient-to-r from-amber-50 to-orange-50/80 dark:from-amber-950/50 dark:to-slate-850 shadow-xs ring-1 ring-amber-400/50'
                        : isDragging
                        ? 'opacity-30 scale-95 border-dashed border-sky-500 bg-sky-50 dark:bg-slate-900'
                        : isDragOver
                        ? 'border-amber-500 bg-amber-200/90 dark:bg-amber-950/80 scale-[1.02] ring-2 ring-amber-400 shadow-md'
                        : isActive
                        ? 'border-amber-500 bg-amber-100/70 dark:bg-amber-950/60 ring-2 ring-amber-400/80 shadow-sm'
                        : isVisible
                        ? 'border-[#D4B982] dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs hover:border-amber-400'
                        : 'border-slate-300 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-850/50 opacity-85 hover:border-slate-400'
                    )}
                  >
                    {/* 左側：拖曳握把 / 鎖定圖示 + 順序編號 + 頭像 + 名稱 */}
                    <div className="flex items-center gap-2 min-w-0">
                      {isLockedFirst ? (
                        <div
                          className="text-amber-600 dark:text-amber-400 px-1 py-1"
                          title="當前登入者固定於首位"
                        >
                          <Lock className="w-4 h-4" />
                        </div>
                      ) : (
                        <div
                          className="cursor-grab active:cursor-grabbing text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 px-1 py-1"
                          title="拖曳調整順序"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>
                      )}

                      <span
                        className={cn(
                          'w-6 h-6 rounded-lg text-xs font-fredoka font-black flex items-center justify-center shrink-0 border',
                          isLockedFirst
                            ? 'bg-amber-400 text-slate-950 border-amber-500 font-black'
                            : isVisible
                            ? 'bg-amber-400/20 border-amber-500/50 text-amber-900 dark:text-amber-300'
                            : 'bg-black/5 dark:bg-white/5 border-stone-300 dark:border-slate-700 text-stone-500 dark:text-slate-400'
                        )}
                      >
                        #{idx + 1}
                      </span>

                      <PlayerAvatar
                        player={p}
                        size="sm"
                        className="w-7 h-7 rounded-lg text-xs shadow-xs border shrink-0"
                      />

                      <div className="min-w-0">
                        <div className="font-black text-xs text-[#3E2F20] dark:text-slate-100 flex items-center gap-1 truncate">
                          <span className="truncate">{p.name}</span>
                          {isSelf && (
                            <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold">
                              (我 • 已鎖定首位)
                            </span>
                          )}
                          {p.isAdmin && (
                            <Crown className="w-3 h-3 text-yellow-500 shrink-0" />
                          )}
                        </div>
                        <div className="text-[10px] text-stone-500 dark:text-slate-400 font-bold">
                          {charCount} 隻角色 {isVisible ? '• 外顯標籤' : '• 收納在更多'}
                        </div>
                      </div>
                    </div>

                    {/* 右側：快速移動按鈕 (登入者鎖定首位，禁用所有移動按鈕) */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isLockedFirst ? (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-400/25 text-amber-800 dark:text-amber-300 text-[10px] font-black border border-amber-500/40">
                          固定首位
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            data-player-btn={`${p.name}-top`}
                            disabled={idx <= minIndex}
                            onClick={() => moveToTop(idx, p.name)}
                            className="w-6 h-6 rounded-lg text-stone-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-400/25 focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all cursor-pointer"
                            title="一鍵置頂 (移動至隊員第 1 位)"
                          >
                            <ArrowUpToLine className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            data-player-btn={`${p.name}-up`}
                            disabled={idx <= minIndex}
                            onClick={(e) => moveItem(idx, idx - 1, p.name, 'up', e)}
                            className="w-6 h-6 rounded-lg text-stone-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-400/25 focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all cursor-pointer"
                            title="往上移一位"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            data-player-btn={`${p.name}-down`}
                            disabled={idx === list.length - 1}
                            onClick={(e) => moveItem(idx, idx + 1, p.name, 'down', e)}
                            className="w-6 h-6 rounded-lg text-stone-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-400/25 focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all cursor-pointer"
                            title="往下移一位"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-stone-500 hover:text-stone-800 dark:hover:text-slate-200 text-xs font-bold"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            <span>重設預設順序</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="parchment" size="sm" onClick={onClose}>
              取消
            </Button>
            <Button type="button" variant="gold" size="sm" onClick={handleSave} className="font-black">
              <Check className="w-3.5 h-3.5 mr-1" />
              <span>儲存並套用</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
