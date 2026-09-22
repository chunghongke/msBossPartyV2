import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { useStore } from '@/store';
import { useAuth } from '@/contexts/AuthContext';
import { LootItem } from '@/types/loot';
import { LOOT_CATEGORIES } from '@/data/lootPresets';
import { getBossGroupName, getBossGroupImage } from '@/data/bosses';
import {
  formatMapleMeso,
  formatMapleMesoShort,
  formatTwd,
  formatTwdShort,
  formatLootPrice,
  formatLootPriceShort,
} from '@/utils/currency';
import { LootEditModal } from './LootEditModal';
import { cn } from '@/utils/cn';
import {
  Coins,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  User,
  Users,
  Check,
  Banknote,
} from 'lucide-react';

interface LootManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAddModal?: () => void;
}

type TabType = 'mine' | 'active' | 'done';

export function LootManagementModal({ isOpen, onClose }: LootManagementModalProps) {
  const { store, deleteLoot, toggleLootMemberPaid, batchSetLootMembersPaid } = useStore();
  const { currentPlayer, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('mine');
  const [editingLoot, setEditingLoot] = useState<LootItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [autoFocusPrice, setAutoFocusPrice] = useState(false);

  // 取得所有戰利品陣列 (依更新/建立時間由新到舊排序)
  const allLoots = useMemo(() => {
    const list = Object.values(store.loots || {});
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [store.loots]);

  // 登入者角色 ID 清單 (用於比對「與我相關」)
  const myCharIds = useMemo(() => {
    if (!currentPlayer?.characters) return new Set<string>();
    return new Set(currentPlayer.characters.map((c) => c.id));
  }, [currentPlayer]);

  // 計算與登入者相關的個人財務統計
  const myStats = useMemo(() => {
    let pendingMeso = 0; // 待領取金額 (楓幣)
    let pendingTwd = 0;  // 待領取金額 (台幣)
    let sellingCount = 0;  // 待售中件數 (有我的份，但尚未售出)
    let receivedMeso = 0; // 歷史已實收金額 (楓幣)
    let receivedTwd = 0;  // 歷史已實收金額 (台幣)

    allLoots.forEach((loot) => {
      const myPayout = loot.members.find(
        (m) => (m.playerName === currentPlayer?.name || myCharIds.has(m.charId)) && !m.isGuest
      );
      if (!myPayout) return;

      if (loot.status === 'selling') {
        sellingCount += 1;
      } else if (loot.status === 'distributing' || loot.status === 'done') {
        const isTwd = loot.saleCurrency === 'twd';
        if (myPayout.isPaid) {
          if (isTwd) receivedTwd += loot.splitAmountPerMember;
          else receivedMeso += loot.splitAmountPerMember;
        } else {
          if (isTwd) pendingTwd += loot.splitAmountPerMember;
          else pendingMeso += loot.splitAmountPerMember;
        }
      }
    });

    return { pendingMeso, pendingTwd, sellingCount, receivedMeso, receivedTwd };
  }, [allLoots, currentPlayer, myCharIds]);

  // 篩選各分頁的清單
  const filteredLoots = useMemo(() => {
    switch (activeTab) {
      case 'mine':
        return allLoots.filter((loot) =>
          loot.members.some(
            (m) => (m.playerName === currentPlayer?.name || myCharIds.has(m.charId)) && !m.isGuest
          )
        );
      case 'active':
        return allLoots.filter((loot) => loot.status !== 'done');
      case 'done':
        return allLoots.filter((loot) => loot.status === 'done');
      default:
        return allLoots;
    }
  }, [allLoots, activeTab, currentPlayer, myCharIds]);

  // 計數徽章
  const minePendingCount = useMemo(() => {
    return allLoots.filter((loot) => {
      if (loot.status === 'done') return false;
      return loot.members.some(
        (m) =>
          (m.playerName === currentPlayer?.name || myCharIds.has(m.charId)) &&
          !m.isGuest &&
          !m.isPaid
      );
    }).length;
  }, [allLoots, currentPlayer, myCharIds]);

  const activeCount = useMemo(() => allLoots.filter((l) => l.status !== 'done').length, [allLoots]);
  const doneCount = useMemo(() => allLoots.filter((l) => l.status === 'done').length, [allLoots]);

  const handleOpenAdd = () => {
    setEditingLoot(null);
    setAutoFocusPrice(false);
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (loot: LootItem, focusPrice: boolean = false) => {
    const isHandler = Boolean(
      currentPlayer &&
      loot.handlerPlayerName &&
      loot.handlerPlayerName.trim().toLowerCase() === currentPlayer.name.trim().toLowerCase()
    );
    const canManage = Boolean(isAdmin || isHandler || (!loot.handlerPlayerName?.trim() && currentPlayer));
    if (!canManage) {
      alert(`此戰利品由「${loot.handlerPlayerName || '其他玩家'}」保管，只有保管人或管理員才能編輯！`);
      return;
    }
    setEditingLoot(loot);
    setAutoFocusPrice(focusPrice);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (loot: LootItem) => {
    const isHandler = Boolean(
      currentPlayer &&
      loot.handlerPlayerName &&
      loot.handlerPlayerName.trim().toLowerCase() === currentPlayer.name.trim().toLowerCase()
    );
    const canManage = Boolean(isAdmin || isHandler || (!loot.handlerPlayerName?.trim() && currentPlayer));
    if (!canManage) {
      alert(`此戰利品由「${loot.handlerPlayerName || '其他玩家'}」保管，只有保管人或管理員才能刪除！`);
      return;
    }
    if (confirm(`確定要刪除「${loot.itemName}」的分贓紀錄嗎？此動作無法復原。`)) {
      await deleteLoot(loot.id);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent maxWidthClass="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
          {/* 彈窗標題與新增快捷鍵 */}
          <DialogHeader className="p-5 sm:px-6 border-b border-kerning-stroke/30 dark:border-slate-700 bg-black/5 dark:bg-black/20 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-lg sm:text-xl font-black flex items-center gap-2">
                <span className="text-2xl">🎁</span>
                <span>戰利品分贓管理中心</span>
                {activeCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-xs font-black">
                    {activeCount} 件進行中
                  </span>
                )}
              </DialogTitle>
              <p className="text-xs text-stone-600 dark:text-slate-400 mt-0.5">
                每週隊友團戰利品拍賣、收益分配與交付發放一站式追蹤，跨週常駐直至全員結清。
              </p>
            </div>

            <Button
              size="sm"
              variant="gold"
              onClick={handleOpenAdd}
              className="font-black text-xs h-8 gap-1.5 shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>登記新戰利品</span>
            </Button>
          </DialogHeader>

          <DialogBody className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* 登入者個人收益儀表板 (當有登入玩家時展示) */}
            {currentPlayer && (
              <div className="bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-transparent dark:from-amber-950/40 dark:via-amber-900/20 rounded-2xl p-3.5 sm:p-4 border-2 border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-lg shadow-xs">
                    {myStats.pendingTwd > 0 && myStats.pendingMeso === 0 ? '💵' : '🪙'}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-600 dark:text-slate-400 flex items-center gap-1.5">
                      <span>{currentPlayer.name} 的分贓收益儀表板</span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-stone-500 dark:text-slate-400 font-bold">待領取總計：</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {myStats.pendingMeso === 0 && myStats.pendingTwd === 0 ? (
                          <span className="text-base sm:text-lg font-black text-stone-400 dark:text-slate-500">
                            0 楓幣
                          </span>
                        ) : (
                          <>
                            {myStats.pendingMeso > 0 && (
                              <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                                {formatMapleMeso(myStats.pendingMeso)}
                              </span>
                            )}
                            {myStats.pendingMeso > 0 && myStats.pendingTwd > 0 && (
                              <span className="text-stone-400 font-black text-xs">＋</span>
                            )}
                            {myStats.pendingTwd > 0 && (
                              <span className="text-base sm:text-lg font-black text-cyan-600 dark:text-cyan-400">
                                {formatTwd(myStats.pendingTwd)}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-bold text-stone-600 dark:text-slate-400">
                  <div>
                    <span className="block text-[11px] opacity-75">待售中件數</span>
                    <span className="text-stone-900 dark:text-slate-100 font-black text-sm">
                      {myStats.sellingCount} 件
                    </span>
                  </div>
                  <div className="border-l border-kerning-stroke/30 pl-4">
                    <span className="block text-[11px] opacity-75">歷史已實收</span>
                    <div className="text-stone-900 dark:text-slate-100 font-black text-sm flex items-center gap-1 flex-wrap">
                      {myStats.receivedMeso === 0 && myStats.receivedTwd === 0 ? (
                        <span>0 楓幣</span>
                      ) : (
                        <>
                          {myStats.receivedMeso > 0 && (
                            <span>{formatMapleMesoShort(myStats.receivedMeso)}</span>
                          )}
                          {myStats.receivedMeso > 0 && myStats.receivedTwd > 0 && (
                            <span className="text-stone-400 font-normal">＋</span>
                          )}
                          {myStats.receivedTwd > 0 && (
                            <span className="text-cyan-700 dark:text-cyan-300">{formatTwdShort(myStats.receivedTwd)}</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 分頁按鈕群 (與我相關 / 進行中 / 已結清) */}
            <div className="flex items-center justify-between gap-2 border-b border-kerning-stroke/30 dark:border-slate-700 pb-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {currentPlayer && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('mine')}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 select-none shrink-0',
                      activeTab === 'mine'
                        ? 'bg-amber-400 text-slate-950 shadow-xs'
                        : 'bg-black/5 dark:bg-slate-800 text-stone-600 dark:text-slate-400 hover:text-stone-900'
                    )}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>與我相關</span>
                    {minePendingCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
                        待領 {minePendingCount}
                      </span>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveTab('active')}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 select-none shrink-0',
                    activeTab === 'active'
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'bg-black/5 dark:bg-slate-800 text-stone-600 dark:text-slate-400 hover:text-stone-900'
                  )}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>進行中 (待售 / 分贓中)</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-black/15 text-[10px] font-black">
                    {activeCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('done')}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 select-none shrink-0',
                    activeTab === 'done'
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'bg-black/5 dark:bg-slate-800 text-stone-600 dark:text-slate-400 hover:text-stone-900'
                  )}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>歷史結清紀錄</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-black/15 text-[10px] font-black">
                    {doneCount}
                  </span>
                </button>
              </div>

              <div className="text-[11px] text-stone-500 dark:text-slate-400 hidden sm:block">
                共 {filteredLoots.length} 筆
              </div>
            </div>

            {/* 戰利品清單卡片列表 */}
            {filteredLoots.length > 0 ? (
              <div className="space-y-3.5">
                {filteredLoots.map((loot) => {
                  const bossGroupName = getBossGroupName(loot.bossId);
                  const bossImage = getBossGroupImage(loot.bossId);
                  const categoryMeta = LOOT_CATEGORIES[loot.category] || LOOT_CATEGORIES.custom;
                  const paidCount = loot.members.filter((m) => m.isPaid).length;
                  const totalMembers = loot.members.length;
                  const isDone = loot.status === 'done';
                  const isSelling = loot.status === 'selling';
                  const isTwd = loot.saleCurrency === 'twd';

                  // 判斷權限：管理員、此戰利品保管人、或未指定保管人時的登入者
                  const isHandler = Boolean(
                    currentPlayer &&
                    loot.handlerPlayerName &&
                    loot.handlerPlayerName.trim().toLowerCase() === currentPlayer.name.trim().toLowerCase()
                  );
                  const canManage = Boolean(
                    isAdmin || isHandler || (!loot.handlerPlayerName?.trim() && currentPlayer)
                  );

                  // 檢查當前登入者是否在此戰利品名單內
                  const myPayout = loot.members.find(
                    (m) => (m.playerName === currentPlayer?.name || myCharIds.has(m.charId)) && !m.isGuest
                  );

                  return (
                    <div
                      key={loot.id}
                      className={cn(
                        'rounded-2xl border-2 p-4 transition-all space-y-3',
                        isDone
                          ? 'bg-stone-50/80 dark:bg-slate-900/40 border-stone-300 dark:border-slate-700/60 opacity-80 hover:opacity-100'
                          : myPayout && !myPayout.isPaid && !isSelling
                          ? 'bg-amber-500/5 dark:bg-amber-950/20 border-amber-500/60 shadow-md'
                          : 'bg-white dark:bg-slate-800 border-kerning-stroke/50 shadow-xs'
                      )}
                    >
                      {/* 卡片頂部：圖示、名稱、分類徽章、狀態、操作按鈕 */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* 縮圖 / 代表圖示 */}
                          <div className="w-11 h-11 rounded-xl bg-black/5 dark:bg-slate-700/80 border border-stone-300 dark:border-slate-600 flex items-center justify-center shrink-0 overflow-hidden text-2xl shadow-inner">
                            {loot.imageUrl ? (
                              <img
                                src={loot.imageUrl}
                                alt={loot.itemName}
                                className="w-full h-full object-contain"
                                onError={(e) => ((e.target as any).style.display = 'none')}
                              />
                            ) : (
                              <span>{categoryMeta.icon}</span>
                            )}
                          </div>

                          {/* 物品名稱與類別標籤 */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm sm:text-base font-black text-stone-900 dark:text-slate-100 truncate">
                                {loot.itemName}
                              </h3>
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded-md border text-[10px] font-black shrink-0',
                                  categoryMeta.badgeClass
                                )}
                              >
                                {categoryMeta.icon} {categoryMeta.label}
                              </span>
                              {isTwd ? (
                                <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-500/40 text-[10px] font-black shrink-0 flex items-center gap-1">
                                  <Banknote className="w-3 h-3" />
                                  <span>台幣交易</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-[10px] font-black shrink-0">
                                  🪙 楓幣拍賣
                                </span>
                              )}
                            </div>

                            {/* 來源 BOSS 與週次備註 */}
                            <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-slate-400 mt-0.5 flex-wrap">
                              <span className="font-bold flex items-center gap-1.5">
                                {bossImage && (
                                  <img
                                    src={bossImage}
                                    alt=""
                                    className="w-4 h-4 rounded-full object-cover border border-stone-300 dark:border-slate-600 shrink-0"
                                  />
                                )}
                                <span>{bossGroupName}</span>
                              </span>
                              <span>•</span>
                              <span>週次：{loot.weekKey}</span>
                              {loot.handlerPlayerName && (
                                <>
                                  <span>•</span>
                                  <span className={cn(
                                    "font-bold",
                                    isHandler ? "text-amber-700 dark:text-amber-300 font-black" : "text-stone-600 dark:text-slate-400"
                                  )}>
                                    保管人：{loot.handlerPlayerName}
                                    {isHandler && ' (你)'}
                                    {!isHandler && isAdmin && ' (管理員)'}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 右側：狀態徽章與編輯/刪除按鈕 */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isDone ? (
                            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 text-xs font-black flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>已結清</span>
                            </span>
                          ) : isSelling ? (
                            <span className={cn(
                              "px-2.5 py-1 rounded-xl text-slate-950 font-black text-xs flex items-center gap-1 shadow-xs",
                              isTwd ? "bg-cyan-400" : "bg-amber-400"
                            )}>
                              <Clock className="w-3.5 h-3.5" />
                              <span>{isTwd ? '台幣待成交' : '拍賣待售中'}</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-xs flex items-center gap-1 shadow-xs">
                              <Coins className="w-3.5 h-3.5" />
                              <span>分贓中 ({paidCount}/{totalMembers})</span>
                            </span>
                          )}

                          {canManage && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenEdit(loot)}
                                className="p-1.5 h-8 w-8 text-stone-500 hover:text-stone-900"
                                title="編輯此戰利品"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(loot)}
                                className="p-1.5 h-8 w-8 text-stone-400 hover:text-rose-600"
                                title="刪除此紀錄"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* 金額統計列 (若已售出) */}
                      {!isSelling && loot.totalSalePrice > 0 ? (
                        <div className="bg-black/5 dark:bg-slate-900/60 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs border border-kerning-stroke/30">
                          <div className="flex items-center gap-4 flex-wrap">
                            <div>
                              <span className="text-stone-500 dark:text-slate-400 text-[10px] block">
                                {isTwd ? '台幣總售價' : '拍賣總售價'}
                              </span>
                              <span className={cn("font-black", isTwd ? "text-cyan-700 dark:text-cyan-300" : "text-stone-900 dark:text-slate-100")}>
                                {formatLootPrice(loot.totalSalePrice, loot.saleCurrency)}
                              </span>
                            </div>

                            <div className="border-l border-kerning-stroke/30 pl-4">
                              <span className="text-stone-500 dark:text-slate-400 text-[10px] block">
                                扣稅淨額 (手續費 {loot.taxRatePercent ?? (isTwd ? 0 : 3)}%)
                              </span>
                              <span className={cn("font-black", isTwd ? "text-cyan-700 dark:text-cyan-300" : "text-stone-900 dark:text-slate-100")}>
                                {formatLootPrice(loot.netSalePrice, loot.saleCurrency)}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-stone-500 dark:text-slate-400 text-[10px] block">
                              每人應分得 ({totalMembers} 人均分)
                            </span>
                            <span className={cn(
                              "font-black text-base",
                              isTwd ? "text-cyan-600 dark:text-cyan-400" : "text-emerald-600 dark:text-emerald-400"
                            )}>
                              {formatLootPrice(loot.splitAmountPerMember, loot.saleCurrency)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className={cn(
                          "py-2 px-3 rounded-xl border border-dashed text-xs flex items-center justify-between gap-2",
                          isTwd
                            ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-900 dark:text-cyan-200"
                            : "bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200"
                        )}>
                          <span>
                            {canManage
                              ? (isTwd
                                  ? '💵 此戰利品設定為台幣交易，待買家成交付款後點擊右方「填寫售出金額」。'
                                  : '📦 此戰利品目前仍在拍賣場上架中，待售出後點擊右方「填寫售出金額」。')
                              : (isTwd
                                  ? `💵 此戰利品設定為台幣交易，等待保管人（${loot.handlerPlayerName || '未指定'}）結算金額。`
                                  : `📦 此戰利品目前仍在拍賣場上架中，等待保管人（${loot.handlerPlayerName || '未指定'}）結算金額。`)}
                          </span>
                          {canManage ? (
                            <Button
                              size="sm"
                              variant="parchment"
                              onClick={() => handleOpenEdit(loot, true)}
                              className={cn(
                                "text-xs h-6 shrink-0",
                                isTwd
                                  ? "text-cyan-900 dark:text-cyan-200 border-cyan-500/40"
                                  : "text-amber-900 dark:text-amber-200 border-amber-500/40"
                              )}
                            >
                              填寫售出金額
                            </Button>
                          ) : (
                            <span className={cn(
                              "text-[11px] px-2 py-0.5 rounded font-bold shrink-0",
                              isTwd
                                ? "bg-cyan-500/20 text-cyan-800 dark:text-cyan-300"
                                : "bg-amber-500/20 text-amber-800 dark:text-amber-300"
                            )}>
                              等待保管人結算
                            </span>
                          )}
                        </div>
                      )}

                      {/* 成員交付清單 */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-stone-600 dark:text-slate-400 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            <span>隊員交付進度 ({paidCount}/{totalMembers} 人已給)</span>
                          </span>

                          {/* 批次交付按鈕 (僅保管人或管理員可操作) */}
                          {!isSelling && canManage && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => batchSetLootMembersPaid(loot.id, true)}
                                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                              >
                                全員標記已給
                              </button>
                              <span className="text-stone-300 dark:text-slate-700">|</span>
                              <button
                                type="button"
                                onClick={() => batchSetLootMembersPaid(loot.id, false)}
                                className="text-[11px] font-bold text-stone-500 hover:underline cursor-pointer"
                              >
                                全部重設未給
                              </button>
                            </div>
                          )}
                        </div>

                        {/* 成員膠囊網格 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {loot.members.map((member) => {
                            const isMe =
                              (member.playerName === currentPlayer?.name || myCharIds.has(member.charId)) &&
                              !member.isGuest;

                            return (
                              <div
                                key={member.charId}
                                className={cn(
                                  'p-2 rounded-xl border flex items-center justify-between gap-2 transition-all',
                                  isMe
                                    ? 'bg-amber-400/10 border-amber-500/50 ring-1 ring-amber-400/40'
                                    : 'bg-black/5 dark:bg-slate-800/80 border-kerning-stroke/30 dark:border-slate-700'
                                )}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-black text-xs text-stone-900 dark:text-slate-100 truncate">
                                      {member.charName}
                                    </span>
                                    {isMe && (
                                      <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black text-[9px]">
                                        你
                                      </span>
                                    )}
                                    {member.isGuest && (
                                      <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold text-[9px]">
                                        隊友
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-stone-500 dark:text-slate-400 truncate flex items-center gap-1.5">
                                    <span>{member.playerName}</span>
                                    {!isSelling && loot.splitAmountPerMember > 0 && (
                                      <span className={cn(
                                        "font-bold",
                                        isTwd ? "text-cyan-700 dark:text-cyan-400" : "text-emerald-700 dark:text-emerald-400"
                                      )}>
                                        ({formatLootPriceShort(loot.splitAmountPerMember, loot.saleCurrency)})
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* 交付狀態切換按鈕 (保管人/管理員可點擊切換，其他隊員為唯讀狀態徽章) */}
                                {canManage ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleLootMemberPaid(loot.id, member.charId)}
                                    className={cn(
                                      'px-2 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 shrink-0 select-none cursor-pointer',
                                      member.isPaid
                                        ? 'bg-emerald-500 text-white shadow-xs hover:bg-emerald-600'
                                        : 'bg-stone-200 dark:bg-slate-700 text-stone-600 dark:text-slate-300 hover:bg-stone-300 dark:hover:bg-slate-600'
                                    )}
                                    title={member.isPaid ? '點擊切換為未給' : '點擊標記為已交付'}
                                  >
                                    {member.isPaid ? (
                                      <>
                                        <Check className="w-3 h-3" />
                                        <span>已給</span>
                                      </>
                                    ) : (
                                      <span>未給</span>
                                    )}
                                  </button>
                                ) : (
                                  <div
                                    className={cn(
                                      'px-2 py-1 rounded-lg text-xs font-black flex items-center gap-1 shrink-0 select-none cursor-default opacity-90',
                                      member.isPaid
                                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                        : 'bg-stone-200/70 dark:bg-slate-700/60 text-stone-500 dark:text-slate-400 border border-transparent'
                                    )}
                                    title="僅保管人或管理員可更新交付狀態"
                                  >
                                    {member.isPaid ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                        <span>已給</span>
                                      </>
                                    ) : (
                                      <span>未給</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 備註 */}
                      {loot.note && (
                        <div className="text-[11px] text-stone-500 dark:text-slate-400 bg-black/5 dark:bg-slate-800/40 px-2.5 py-1.5 rounded-lg">
                          📝 備註：{loot.note}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center bg-black/5 dark:bg-slate-900/40 rounded-2xl border-2 border-dashed border-stone-300 dark:border-slate-700 space-y-3">
                <span className="text-4xl block">🎁</span>
                <p className="text-sm font-black text-stone-700 dark:text-slate-300">
                  {activeTab === 'mine'
                    ? '目前沒有與你相關的戰利品分贓紀錄'
                    : activeTab === 'active'
                    ? '太棒了！目前沒有待售出或分贓中的戰利品'
                    : '目前尚無已結清的歷史紀錄'}
                </p>
                <p className="text-xs text-stone-500 dark:text-slate-400">
                  打完每週 BOSS 若有掉落漆黑飾品、戒指箱或永恆裝備，點擊上方「登記新戰利品」快速開始分贓！
                </p>
                <Button size="sm" variant="gold" onClick={handleOpenAdd} className="mt-2 font-black">
                  <Plus className="w-4 h-4 mr-1" />
                  <span>立即登記戰利品</span>
                </Button>
              </div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* 登記 / 編輯彈窗 */}
      <LootEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingLoot(null);
          setAutoFocusPrice(false);
        }}
        lootToEdit={editingLoot}
        autoFocusPrice={autoFocusPrice}
      />
    </>
  );
}
