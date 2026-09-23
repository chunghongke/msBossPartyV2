import { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useStore } from '@/store';
import { useAuth } from '@/contexts/AuthContext';
import { LootItem, LootCategory, LootMemberPayout, LootStatus, LootSaleCurrency } from '@/types/loot';
import { LOOT_PRESETS, LOOT_CATEGORIES, PRIMARY_LOOT_CATEGORIES, inferCategoryByName } from '@/data/lootPresets';
import { BOSS_GROUPS, getBossGroupKey } from '@/data/bosses';
import { getCurrentResetWeekKey } from '@/hooks/useWeeklyReset';
import {
  formatMapleMeso,
  formatMapleMesoShort,
  calculateNetAndSplit,
  parseMapleMesoInput,
  formatTwd,
  formatTwdShort,
  parseTwdInput,
  formatLootPrice,
  formatLootPriceShort,
} from '@/utils/currency';
import { cn } from '@/utils/cn';
import { Sparkles, Users, Coins, Calendar, Trash2, Plus, Banknote, X, ChevronDown, ChevronRight, Search, Zap } from 'lucide-react';

interface LootEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  lootToEdit?: LootItem | null;
  initialBossId?: string;
  initialEntryIndex?: number;
  initialWeekKey?: string;
  initialTeamId?: string;
  initialMembers?: Array<{ charId: string; charName: string; playerName: string; isGuest?: boolean }>;
  autoFocusPrice?: boolean;
}

export function LootEditModal({
  isOpen,
  onClose,
  lootToEdit,
  initialBossId,
  initialEntryIndex = 1,
  initialWeekKey,
  initialTeamId,
  initialMembers,
  autoFocusPrice = false,
}: LootEditModalProps) {
  const { store, addLoot, updateLoot, getAllCharacters, players, addGuest, deleteGuest } = useStore();
  const { currentPlayer, isAdmin } = useAuth();
  const priceInputRef = useRef<HTMLInputElement>(null);

  // 權限檢查：管理員、新增模式、或此戰利品的保管人（未指定保管人時開放登入者）
  const isHandler = Boolean(
    currentPlayer &&
    lootToEdit?.handlerPlayerName &&
    lootToEdit.handlerPlayerName.trim().toLowerCase() === currentPlayer.name.trim().toLowerCase()
  );
  const canManage = Boolean(
    isAdmin ||
    !lootToEdit ||
    isHandler ||
    (!lootToEdit?.handlerPlayerName?.trim() && currentPlayer)
  );

  // ── 表單狀態 ──
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<LootCategory>('ring_related');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<LootCategory | 'all'>('all');
  const [isCapsuleView, setIsCapsuleView] = useState(false);

  const [bossGroupKey, setBossGroupKey] = useState(() =>
    initialBossId ? getBossGroupKey(initialBossId) : 'lotus'
  );
  const [entryIndex, setEntryIndex] = useState(initialEntryIndex);
  const [weekKey, setWeekKey] = useState(initialWeekKey || getCurrentResetWeekKey());
  const [teamId, setTeamId] = useState(initialTeamId || '');
  const [droppedAt, setDroppedAt] = useState(() => new Date().toISOString().split('T')[0]);
  const [handlerPlayerName, setHandlerPlayerName] = useState(
    () => currentPlayer?.name || (players && players[0]?.name) || ''
  );

  // 拍賣售價與狀態
  const [isSold, setIsSold] = useState(false);
  const [saleCurrency, setSaleCurrency] = useState<LootSaleCurrency>('meso');
  const [totalSalePrice, setTotalSalePrice] = useState<number>(0);
  const [priceInputStr, setPriceInputStr] = useState('');
  const [taxRatePercent, setTaxRatePercent] = useState<number>(3);

  // 分配成員
  // 分配成員
  const [members, setMembers] = useState<LootMemberPayout[]>([]);
  const [note, setNote] = useState('');

  // 隊員選擇器狀態 (依照玩家分群 Checkbox 模式)
  const [memberSearchFilter, setMemberSearchFilter] = useState('');
  const [expandedPlayerNames, setExpandedPlayerNames] = useState<Set<string>>(new Set());
  const [quickGuestName, setQuickGuestName] = useState('');

  const allCharacters = useMemo(() => getAllCharacters(), [getAllCharacters]);

  // ── 初始化或填入要編輯的戰利品 ──
  useEffect(() => {
    if (!isOpen) return;

    if (lootToEdit) {
      setItemName(lootToEdit.itemName);
      setCategory(lootToEdit.category);
      setSelectedCategoryTab(lootToEdit.category);
      setIsCapsuleView(LOOT_PRESETS.some((p) => p.name === lootToEdit.itemName));
      setBossGroupKey(getBossGroupKey(lootToEdit.bossId));
      setEntryIndex(lootToEdit.entryIndex);
      setWeekKey(lootToEdit.weekKey);
      setTeamId(lootToEdit.teamId || '');
      setDroppedAt(lootToEdit.droppedAt);
      setHandlerPlayerName(lootToEdit.handlerPlayerName || currentPlayer?.name || (players && players[0]?.name) || '');
      const curr = lootToEdit.saleCurrency || 'meso';
      setSaleCurrency(curr);
      setIsSold(lootToEdit.status !== 'selling' && lootToEdit.totalSalePrice > 0);
      setTotalSalePrice(lootToEdit.totalSalePrice);
      setPriceInputStr(lootToEdit.totalSalePrice > 0 ? String(lootToEdit.totalSalePrice) : '');
      setTaxRatePercent(lootToEdit.taxRatePercent ?? (curr === 'twd' ? 0 : 3));
      const editMembers = lootToEdit.members || [];
      setMembers(editMembers);
      setNote(lootToEdit.note || '');

      // 自動展開有成員被選取的玩家手風琴
      const initExpanded = new Set<string>();
      editMembers.forEach((m) => {
        if (m.isGuest) initExpanded.add('__GUEST__');
        else if (m.playerName) initExpanded.add(m.playerName);
      });
      setExpandedPlayerNames(initExpanded);
    } else {
      // 新增模式
      setItemName('');
      setCategory('ring_related');
      setSelectedCategoryTab('all');
      setIsCapsuleView(false);
      const defaultGroup = initialBossId ? getBossGroupKey(initialBossId) : 'lotus';
      setBossGroupKey(defaultGroup);
      setEntryIndex(initialEntryIndex);
      setWeekKey(initialWeekKey || getCurrentResetWeekKey());
      setTeamId(initialTeamId || '');
      setDroppedAt(new Date().toISOString().split('T')[0]);
      setHandlerPlayerName(currentPlayer?.name || (players && players[0]?.name) || '');
      setSaleCurrency('meso');
      setIsSold(false);
      setTotalSalePrice(0);
      setPriceInputStr('');
      setTaxRatePercent(3);
      setNote('');

      // 若有帶入初始隊伍成員
      if (initialMembers && initialMembers.length > 0) {
        const resolved = initialMembers.map((m) => ({
          charId: m.charId,
          charName: m.charName,
          playerName: m.playerName,
          isGuest: m.isGuest,
          isPaid: false,
        }));
        setMembers(resolved);

        const initExpanded = new Set<string>();
        resolved.forEach((m) => {
          if (m.isGuest) initExpanded.add('__GUEST__');
          else if (m.playerName) initExpanded.add(m.playerName);
        });
        setExpandedPlayerNames(initExpanded);
      } else {
        // 入口 A（由右上角全域打開）：
        // 預設帶入當前操作者的第 1 個角色
        const myFirstChar = currentPlayer?.characters?.[0];
        if (myFirstChar && currentPlayer) {
          setMembers([
            {
              charId: myFirstChar.id,
              charName: myFirstChar.name,
              playerName: currentPlayer.name,
              isGuest: false,
              isPaid: false,
            },
          ]);
          setExpandedPlayerNames(new Set([currentPlayer.name]));
        } else {
          setMembers([]);
          setExpandedPlayerNames(new Set());
        }
      }
    }
  }, [isOpen, lootToEdit, initialBossId, initialEntryIndex, initialWeekKey, initialTeamId, initialMembers, store, allCharacters, currentPlayer, players]);

  // 當要求自動聚焦金額時，自動切為已售出並聚焦到輸入框
  useEffect(() => {
    if (!isOpen) return;
    if (autoFocusPrice) {
      setIsSold(true);
      const timer = setTimeout(() => {
        if (priceInputRef.current) {
          priceInputRef.current.focus();
          priceInputRef.current.select();
          priceInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoFocusPrice]);

  // ── 切換 BOSS 群組 ──
  const handleBossGroupChange = (newGroupKey: string) => {
    setBossGroupKey(newGroupKey);
  };

  // ── 點擊預設物品 ──
  const handleSelectPreset = (presetName: string) => {
    // 若已選中該標籤且處於膠囊狀態，再次點擊等同於取消選取
    if (itemName === presetName && isCapsuleView) {
      setItemName('');
      setIsCapsuleView(false);
      return;
    }
    const preset = LOOT_PRESETS.find((p) => p.name === presetName);
    setItemName(presetName);
    setIsCapsuleView(true);
    if (preset) {
      setCategory(preset.category);
    } else {
      setCategory(inferCategoryByName(presetName));
    }
  };

  const handleClearCapsule = () => {
    setItemName('');
    setIsCapsuleView(false);
  };

  // ── 幣別切換 ──
  const handleCurrencyChange = (newCurrency: LootSaleCurrency) => {
    if (newCurrency === saleCurrency) return;
    setSaleCurrency(newCurrency);
    // 自動根據新幣別設定合理的手續費率預設值
    if (newCurrency === 'twd') {
      if (taxRatePercent === 3 || taxRatePercent === 5) {
        setTaxRatePercent(0); // 台幣交易預設 0% (轉帳實拿)
      }
    } else {
      if (taxRatePercent === 0) {
        setTaxRatePercent(3); // 楓幣拍賣預設 3% (拍賣特權)
      }
    }
    // 重新解析當前輸入字串以套用新幣別規則
    if (priceInputStr.trim()) {
      const parsed = newCurrency === 'twd' ? parseTwdInput(priceInputStr) : parseMapleMesoInput(priceInputStr);
      setTotalSalePrice(parsed);
    }
  };

  // ── 售出金額與快速按鈕 ──
  const handlePriceChange = (val: string) => {
    setPriceInputStr(val);
    const parsed = saleCurrency === 'twd' ? parseTwdInput(val) : parseMapleMesoInput(val);
    setTotalSalePrice(parsed);
  };

  const handleQuickAddPrice = (addAmount: number) => {
    const current = saleCurrency === 'twd' ? parseTwdInput(priceInputStr) : parseMapleMesoInput(priceInputStr);
    const next = current + addAmount;
    setTotalSalePrice(next);
    setPriceInputStr(String(next));
  };

  // 即時試算
  const splitCalc = useMemo(() => {
    return calculateNetAndSplit(
      isSold ? totalSalePrice : 0,
      taxRatePercent,
      members.length
    );
  }, [isSold, totalSalePrice, taxRatePercent, members.length]);

  // 尋找當前 BOSS 隊伍 (僅當有明確的小隊 ID 時才具備「本團」上下文)
  const currentBossTeam = useMemo(() => {
    const targetTeamId = initialTeamId || teamId;
    if (targetTeamId && store.teams[targetTeamId]) {
      return store.teams[targetTeamId];
    }
    return null;
  }, [initialTeamId, teamId, store.teams]);

  // 依玩家分群的角色清單與過濾 (保持自然穩定順序，選取後不跳動)
  const filteredPlayersWithChars = useMemo(() => {
    const query = memberSearchFilter.trim().toLowerCase();
    return (players || []).map((player) => {
      const allChars = player.characters || [];
      const matchesPlayerName = player.name.toLowerCase().includes(query);
      const matchingChars = query
        ? allChars.filter((c) => matchesPlayerName || c.name.toLowerCase().includes(query))
        : allChars;

      const selectedCount = allChars.filter((c) =>
        members.some((m) => m.charId === c.id)
      ).length;

      return {
        player,
        chars: matchingChars,
        totalCharCount: allChars.length,
        selectedCount,
        matchesQuery: !query || matchesPlayerName || matchingChars.length > 0,
      };
    }).filter((item) => item.matchesQuery);
  }, [players, memberSearchFilter, members]);

  const filteredGuests = useMemo(() => {
    const query = memberSearchFilter.trim().toLowerCase();
    return (store.guests || []).filter((g) => !query || g.name.toLowerCase().includes(query));
  }, [store.guests, memberSearchFilter]);

  const isAllExpanded = useMemo(() => {
    if (!players || players.length === 0) return false;
    return players.every((p) => expandedPlayerNames.has(p.name));
  }, [players, expandedPlayerNames]);

  const togglePlayerAccordion = (pName: string) => {
    setExpandedPlayerNames((prev) => {
      const next = new Set(prev);
      if (next.has(pName)) {
        next.delete(pName);
      } else {
        next.add(pName);
      }
      return next;
    });
  };

  const toggleAllAccordions = () => {
    if (isAllExpanded) {
      setExpandedPlayerNames(new Set());
    } else {
      const allNames = new Set((players || []).map((p) => p.name));
      allNames.add('__GUEST__');
      setExpandedPlayerNames(allNames);
    }
  };

  // ── 成員勾選 / 反選 ──
  const handleToggleMember = (
    charId: string,
    charName: string,
    playerName: string,
    isGuest: boolean = false
  ) => {
    setMembers((prev) => {
      const exists = prev.some((m) => m.charId === charId);
      if (exists) {
        return prev.filter((m) => m.charId !== charId);
      } else {
        return [
          ...prev,
          {
            charId,
            charName,
            playerName,
            isGuest,
            isPaid: false,
          },
        ];
      }
    });
  };

  // ── 清空所有已選成員 ──
  const handleClearAllMembers = () => {
    setMembers([]);
  };

  // ── 帶入當前 BOSS 隊伍成員 ──
  const handleFillCurrentBossTeam = () => {
    if (!currentBossTeam || !currentBossTeam.memberTargets) return;
    const resolved: LootMemberPayout[] = currentBossTeam.memberTargets.map((mt) => {
      if (mt.charId.startsWith('guest_')) {
        const guest = (store.guests || []).find((g) => g.id === mt.charId);
        return {
          charId: mt.charId,
          charName: guest?.name || '臨時隊友',
          playerName: '臨時隊友',
          isGuest: true,
          isPaid: false,
        };
      }
      const char = allCharacters.find((c) => c.id === mt.charId);
      return {
        charId: mt.charId,
        charName: char?.name || '未知角色',
        playerName: char?.playerName || '未知玩家',
        isGuest: false,
        isPaid: false,
      };
    });

    setMembers(resolved);

    // 自動展開有成員被選取的玩家手風琴
    const nextExpanded = new Set<string>();
    resolved.forEach((m) => {
      if (m.isGuest) {
        nextExpanded.add('__GUEST__');
      } else if (m.playerName) {
        nextExpanded.add(m.playerName);
      }
    });
    setExpandedPlayerNames(nextExpanded);
  };

  // ── 快速新增 Guest 並自動勾選 ──
  const handleQuickAddGuest = async () => {
    const clean = quickGuestName.trim();
    if (!clean) return;
    try {
      const newGuest = await addGuest(clean);
      setQuickGuestName('');
      setMembers((prev) => {
        if (prev.some((m) => m.charId === newGuest.id)) return prev;
        return [
          ...prev,
          {
            charId: newGuest.id,
            charName: newGuest.name,
            playerName: '臨時隊友',
            isGuest: true,
            isPaid: false,
          },
        ];
      });
      setExpandedPlayerNames((prev) => new Set([...prev, '__GUEST__']));
    } catch (err) {
      console.error('Failed to add guest:', err);
    }
  };

  // ── 刪除臨時隊友 ──
  const handleDeleteGuest = async (guestId: string) => {
    if (confirm('確定要刪除此臨時隊友嗎？此動作將同步自名冊中移除。')) {
      setMembers((prev) => prev.filter((m) => m.charId !== guestId));
      await deleteGuest(guestId);
    }
  };

  // ── 儲存送出 ──
  const handleSave = async () => {
    if (lootToEdit && !canManage) {
      alert('只有此戰利品的保管人或管理員才能儲存修改！');
      return;
    }
    if (!itemName.trim()) {
      alert('請填寫或選取戰利品名稱！');
      return;
    }
    if (members.length === 0) {
      alert('請至少加入一位參與分配的隊友成員！');
      return;
    }

    const finalStatus: LootStatus = isSold
      ? members.every((m) => m.isPaid)
        ? 'done'
        : 'distributing'
      : 'selling';

    const payload = {
      itemName: itemName.trim(),
      category,
      imageUrl: lootToEdit?.imageUrl,
      bossId: bossGroupKey,
      entryIndex,
      weekKey,
      teamId: teamId || undefined,
      droppedAt,
      handlerPlayerName: handlerPlayerName.trim() || undefined,
      status: finalStatus,
      saleCurrency,
      totalSalePrice: isSold ? totalSalePrice : 0,
      taxRatePercent,
      netSalePrice: isSold ? splitCalc.netSalePrice : 0,
      splitAmountPerMember: isSold ? splitCalc.splitAmountPerMember : 0,
      members,
      note: note.trim() || undefined,
    };

    if (lootToEdit) {
      await updateLoot(lootToEdit.id, payload);
    } else {
      await addLoot(payload);
    }

    onClose();
  };

  // 篩選預設物品
  const filteredPresets = useMemo(() => {
    if (selectedCategoryTab === 'all') return LOOT_PRESETS;
    return LOOT_PRESETS.filter((p) => p.category === selectedCategoryTab);
  }, [selectedCategoryTab]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent maxWidthClass="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-5 sm:px-6 border-b border-kerning-stroke/30 dark:border-slate-700 bg-black/5 dark:bg-black/20">
          <DialogTitle className="text-base sm:text-lg font-black flex items-center gap-2">
            <span className="text-xl">🎁</span>
            <span>
              {lootToEdit
                ? canManage
                  ? '編輯戰利品分配紀錄'
                  : '檢視戰利品分配明細 (唯讀模式)'
                : '登記新獲得戰利品'}
            </span>
          </DialogTitle>
          <p className="text-xs text-stone-600 dark:text-slate-400 mt-0.5">
            登錄掉落物品、綁定來源隊友名冊，自動計算拍賣扣稅後均分收益。
          </p>
        </DialogHeader>

        <DialogBody className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* 唯讀權限提示 */}
          {!canManage && lootToEdit && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2 font-bold">
              <span className="text-base">🔒</span>
              <span>
                此戰利品由「{lootToEdit.handlerPlayerName || '未指定玩家'}」保管。目前為唯讀檢視模式，僅保管人或系統管理員有權修改內容、登記售出金額或分配收益。
              </span>
            </div>
          )}

          {/* 1. 戰利品名稱與預設快捷選取 */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-stone-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>戰利品物品名稱</span>
                <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-1 text-[11px] font-bold text-stone-500 dark:text-slate-400">
                <span>分類：</span>
                <span className={cn('px-2 py-0.5 rounded-md border text-[10px] font-black', LOOT_CATEGORIES[category].badgeClass)}>
                  {LOOT_CATEGORIES[category].icon} {LOOT_CATEGORIES[category].label}
                </span>
              </div>
            </div>

            {isCapsuleView && itemName ? (
              <div className="flex h-10 w-full items-center justify-between rounded-xl border-2 border-[#D4B982] dark:border-slate-700 bg-[#FFFDF9] dark:bg-slate-900/90 px-3 shadow-inner">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/25 dark:bg-amber-400/20 text-slate-950 dark:text-amber-200 border border-amber-500/50 text-xs sm:text-sm font-black shadow-xs select-none animate-in fade-in zoom-in-95 duration-150">
                  <span className="text-sm leading-none">{LOOT_CATEGORIES[category]?.icon || '📦'}</span>
                  <span className="leading-none">{itemName}</span>
                  {canManage && (
                    <button
                      type="button"
                      onClick={handleClearCapsule}
                      className="ml-1 p-0.5 rounded-full hover:bg-amber-500/30 text-stone-600 dark:text-amber-300 hover:text-rose-600 dark:hover:text-rose-300 transition-colors cursor-pointer flex items-center justify-center"
                      title="取消選取 / 清除"
                      aria-label="取消選取"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {canManage && (
                  <button
                    type="button"
                    onClick={() => setIsCapsuleView(false)}
                    className="text-[11px] font-bold text-stone-400 hover:text-stone-700 dark:text-slate-500 dark:hover:text-slate-300 transition-colors cursor-pointer px-1 py-0.5"
                    title="切換為手動輸入自訂名稱"
                  >
                    改為自訂名稱
                  </button>
                )}
              </div>
            ) : (
              <Input
                type="text"
                disabled={!canManage}
                value={itemName}
                onChange={(e) => {
                  setItemName(e.target.value);
                  setCategory(inferCategoryByName(e.target.value));
                }}
                placeholder="例如：受詛咒的魔導書、全面控制核心、根源的耳語、卓越鐵鎚 (口紅)、規範四..."
                className="font-bold text-sm"
                rightIcon={
                  itemName && canManage ? (
                    <button
                      type="button"
                      onClick={handleClearCapsule}
                      className="p-1 hover:bg-black/5 dark:hover:bg-slate-700 rounded-full text-stone-400 hover:text-stone-700 cursor-pointer"
                      title="清空"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : undefined
                }
              />
            )}

            {/* 預設分類與快選標籤 */}
            <div className="bg-black/5 dark:bg-slate-800/80 rounded-2xl p-2.5 border border-kerning-stroke/30 dark:border-slate-700 space-y-2">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-bold scrollbar-none">
                <button
                  type="button"
                  disabled={!canManage}
                  onClick={() => setSelectedCategoryTab('all')}
                  className={cn(
                    'px-2 py-0.8 rounded-lg shrink-0 transition-all disabled:opacity-60 disabled:cursor-not-allowed',
                    selectedCategoryTab === 'all'
                      ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                      : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-200'
                  )}
                >
                  全部預設
                </button>
                {PRIMARY_LOOT_CATEGORIES.map((catKey) => {
                  const catMeta = LOOT_CATEGORIES[catKey];
                  if (!catMeta) return null;
                  return (
                    <button
                      key={catKey}
                      type="button"
                      disabled={!canManage}
                      onClick={() => setSelectedCategoryTab(catKey)}
                      className={cn(
                        'px-2 py-0.8 rounded-lg shrink-0 transition-all flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed',
                        selectedCategoryTab === catKey
                          ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                          : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-200'
                      )}
                    >
                      <span>{catMeta.icon}</span>
                      <span>{catMeta.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* 預設物品快選標籤 */}
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                {filteredPresets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    disabled={!canManage}
                    onClick={() => handleSelectPreset(preset.name)}
                    className={cn(
                      'px-2 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 select-none disabled:opacity-60 disabled:cursor-not-allowed',
                      itemName === preset.name
                        ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs font-black ring-1 ring-amber-400'
                        : 'bg-white/80 dark:bg-slate-900/60 border-stone-300 dark:border-slate-700 text-stone-700 dark:text-slate-300 hover:border-amber-400'
                    )}
                  >
                    <span>{LOOT_CATEGORIES[preset.category]?.icon || '📦'}</span>
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. 來源資訊：BOSS、週次、掉落日期、保管人 */}
          <div className="bg-black/5 dark:bg-slate-800/50 rounded-2xl p-3 sm:p-4 border border-kerning-stroke/30 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-black text-stone-800 dark:text-slate-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>來源隊伍與掉落紀錄</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* BOSS 選擇 (依 BOSS GROUP 分組，不分難度) */}
              <div>
                <label className="text-[11px] font-bold text-stone-600 dark:text-slate-400 mb-1 block">
                  來源 BOSS
                </label>
                <select
                  value={bossGroupKey}
                  disabled={!canManage}
                  onChange={(e) => handleBossGroupChange(e.target.value)}
                  className="w-full h-9 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs font-bold text-stone-900 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {BOSS_GROUPS.map((g) => (
                    <option key={g.groupKey} value={g.groupKey}>
                      {g.displayName}
                    </option>
                  ))}
                </select>
              </div>

              {/* 保管人 / 上架者 (玩家選單) */}
              <div>
                <label className="text-[11px] font-bold text-stone-600 dark:text-slate-400 mb-1 block">
                  保管人 / 拍賣上架者
                </label>
                <select
                  value={handlerPlayerName}
                  disabled={!canManage}
                  onChange={(e) => setHandlerPlayerName(e.target.value)}
                  className="w-full h-9 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs font-bold text-stone-900 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">-- 請選擇上架玩家 --</option>
                  {players.map((p) => (
                    <option key={p.name} value={p.name}>
                      👤 {p.name} {p.name === currentPlayer?.name ? '(本人)' : ''}
                    </option>
                  ))}
                  {/* 若原本存有名稱且不在現有 players 列表，保留以防資料丟失 */}
                  {handlerPlayerName && !players.some((p) => p.name === handlerPlayerName) && (
                    <option value={handlerPlayerName}>👤 {handlerPlayerName}</option>
                  )}
                </select>
              </div>

              {/* 掉落日期 */}
              <div>
                <label className="text-[11px] font-bold text-stone-600 dark:text-slate-400 mb-1 block">
                  掉落日期
                </label>
                <Input
                  type="date"
                  disabled={!canManage}
                  value={droppedAt}
                  onChange={(e) => setDroppedAt(e.target.value)}
                  className="text-xs h-9 font-bold"
                />
              </div>

              {/* 所屬週次 */}
              <div>
                <label className="text-[11px] font-bold text-stone-600 dark:text-slate-400 mb-1 block">
                  每週循環基準週
                </label>
                <Input
                  type="text"
                  disabled={!canManage}
                  value={weekKey}
                  onChange={(e) => setWeekKey(e.target.value)}
                  placeholder="YYYY-MM-DD"
                  className="text-xs h-9 font-bold"
                />
              </div>
            </div>
          </div>

          {/* 3. 拍賣售出與分配金額試算 */}
          <div className="bg-amber-500/10 dark:bg-amber-950/20 rounded-2xl p-3.5 sm:p-4 border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h4 className="text-xs font-black text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span>售價與收益分配試算</span>
              </h4>

              {/* 售出狀態切換 */}
              <div className="flex items-center p-0.5 bg-black/10 dark:bg-slate-800 rounded-xl border border-kerning-stroke/40 select-none">
                <button
                  type="button"
                  disabled={!canManage}
                  onClick={() => setIsSold(false)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-black transition-all disabled:opacity-60 disabled:cursor-not-allowed',
                    !isSold
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'text-stone-600 dark:text-slate-400 hover:text-stone-900'
                  )}
                >
                  🟡 上架待售中
                </button>
                <button
                  type="button"
                  disabled={!canManage}
                  onClick={() => {
                    setIsSold(true);
                    setTimeout(() => {
                      if (priceInputRef.current) {
                         priceInputRef.current.focus();
                         priceInputRef.current.select();
                      }
                    }, 50);
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-black transition-all disabled:opacity-60 disabled:cursor-not-allowed',
                    isSold
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-xs'
                      : 'text-stone-600 dark:text-slate-400 hover:text-stone-900'
                  )}
                >
                  🔵 已售出，開始分配收益
                </button>
              </div>
            </div>

            {/* 交易幣別切換分頁 (🪙 楓幣拍賣 vs 💵 台幣交易) */}
            <div className="flex items-center gap-1 p-1 bg-black/5 dark:bg-slate-800/80 rounded-xl border border-kerning-stroke/30">
              <button
                type="button"
                disabled={!canManage}
                onClick={() => handleCurrencyChange('meso')}
                className={cn(
                  'flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed select-none',
                  saleCurrency === 'meso'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-200'
                )}
              >
                <span>🪙</span>
                <span>楓幣拍賣 (Meso)</span>
              </button>
              <button
                type="button"
                disabled={!canManage}
                onClick={() => handleCurrencyChange('twd')}
                className={cn(
                  'flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed select-none',
                  saleCurrency === 'twd'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-200'
                )}
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>台幣交易 (TWD)</span>
              </button>
            </div>

            {isSold ? (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* 總售價輸入 */}
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-stone-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span>
                        {saleCurrency === 'twd' ? '售出成交金額 (新台幣 NT$)' : '拍賣總售價 (楓幣)'}
                      </span>
                      <span className={cn('font-black', saleCurrency === 'twd' ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300')}>
                        {saleCurrency === 'twd' ? formatTwd(totalSalePrice) : formatMapleMeso(totalSalePrice)}
                      </span>
                    </label>
                    <Input
                      ref={priceInputRef}
                      type="text"
                      disabled={!canManage}
                      value={priceInputStr}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      placeholder={saleCurrency === 'twd' ? '輸入金額或例如：15000、1.5萬' : '輸入數字或例如：120億、50.5億'}
                      className={cn('text-sm font-black', saleCurrency === 'twd' ? 'text-emerald-950 dark:text-emerald-100' : 'text-amber-950 dark:text-amber-100')}
                    />

                    {/* 快捷增額按鈕 */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {saleCurrency === 'twd'
                        ? [500, 1000, 3000, 5000, 10000].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              disabled={!canManage}
                              onClick={() => handleQuickAddPrice(amt)}
                              className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/25 transition-all border border-emerald-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              +{formatTwdShort(amt)}
                            </button>
                          ))
                        : [100000000, 500000000, 1000000000, 5000000000, 10000000000].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              disabled={!canManage}
                              onClick={() => handleQuickAddPrice(amt)}
                              className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/20 text-amber-900 dark:text-amber-200 hover:bg-amber-500/30 transition-all border border-amber-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              +{formatMapleMesoShort(amt)}
                            </button>
                          ))}
                      <button
                        type="button"
                        disabled={!canManage}
                        onClick={() => {
                          setPriceInputStr('');
                          setTotalSalePrice(0);
                        }}
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold text-stone-500 hover:text-rose-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        歸零
                      </button>
                    </div>
                  </div>

                  {/* 手續費率 */}
                  <div>
                    <label className="text-[11px] font-bold text-stone-700 dark:text-slate-300 mb-1 block">
                      {saleCurrency === 'twd' ? '交易/平台手續費 (%)' : '拍賣手續費率 (%)'}
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      disabled={!canManage}
                      value={taxRatePercent}
                      onChange={(e) => setTaxRatePercent(Number(e.target.value) || 0)}
                      className="text-xs h-9 font-bold"
                    />
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {saleCurrency === 'twd'
                        ? [0, 6, 3].map((rate) => (
                            <button
                              key={rate}
                              type="button"
                              disabled={!canManage}
                              onClick={() => setTaxRatePercent(rate)}
                              className={cn(
                                'px-2 py-0.5 rounded-md text-[10px] font-black transition-all border disabled:opacity-60 disabled:cursor-not-allowed',
                                taxRatePercent === rate
                                  ? 'bg-emerald-500 text-white border-emerald-600'
                                  : 'bg-black/5 dark:bg-slate-800 text-stone-600 dark:text-slate-400 border-transparent'
                              )}
                            >
                              {rate === 0 ? '0% (轉帳實拿)' : rate === 6 ? '6% (8591)' : `${rate}%`}
                            </button>
                          ))
                        : [3, 5, 0].map((rate) => (
                            <button
                              key={rate}
                              type="button"
                              disabled={!canManage}
                              onClick={() => setTaxRatePercent(rate)}
                              className={cn(
                                'px-2 py-0.5 rounded-md text-[10px] font-black transition-all border disabled:opacity-60 disabled:cursor-not-allowed',
                                taxRatePercent === rate
                                  ? 'bg-amber-400 text-slate-950 border-amber-500'
                                  : 'bg-black/5 dark:bg-slate-800 text-stone-600 dark:text-slate-400 border-transparent'
                              )}
                            >
                              {rate === 3 ? '3% (特權)' : rate === 5 ? '5% (標準)' : '0% (實拿)'}
                            </button>
                          ))}
                    </div>
                  </div>
                </div>

                {/* 實拿試算明細卡 */}
                <div className="bg-white/80 dark:bg-slate-900/80 rounded-xl p-3 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-stone-500 dark:text-slate-400 block text-[10px]">
                      {saleCurrency === 'twd' ? '扣手續費後淨收益' : '扣稅後總淨收益'}
                    </span>
                    <span className="font-black text-sm text-stone-900 dark:text-slate-100">
                      {formatLootPrice(splitCalc.netSalePrice, saleCurrency)}
                    </span>
                    {splitCalc.taxAmount > 0 && (
                      <span className="text-[10px] text-stone-400 dark:text-slate-500 block">
                        (手續費 -{formatLootPriceShort(splitCalc.taxAmount, saleCurrency)})
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-stone-500 dark:text-slate-400 block text-[10px]">
                      每人應得 ({members.length} 人均分)
                    </span>
                    <span className="font-black text-base text-emerald-600 dark:text-emerald-400">
                      {formatLootPrice(splitCalc.splitAmountPerMember, saleCurrency)}
                    </span>
                    {splitCalc.remainder > 0 && (
                      <span className="text-[10px] text-stone-400 dark:text-slate-500 block">
                        (餘數 {saleCurrency === 'twd' ? `NT$ ${splitCalc.remainder}` : `${splitCalc.remainder.toLocaleString()} 楓幣`} 由保管人吸收)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-amber-900/80 dark:text-amber-200/80 leading-relaxed font-bold">
                {saleCurrency === 'twd'
                  ? '物品預計以台幣交易出售中。買家交易完成後，隨時切換為「已售出，開始分配收益」並填入成交金額，系統將自動精算每人應分配份額。'
                  : '物品仍在拍賣場上架中。售出後可隨時切換為「已售出，開始分配收益」並填入成交金額，系統將自動精算每人應分配數額。'}
              </p>
            )}
          </div>

          {/* 4. 參與分配的隊友名冊 (依照玩家分群 Checkbox 模式) */}
          <div className="space-y-3">
            {/* 標題與快捷按鈕列 */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-black text-stone-800 dark:text-slate-200 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                <span>參與分配的隊友成員 ({members.length} 人)</span>
                <span className="text-rose-500">*</span>
              </label>

              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                {canManage && currentBossTeam && (
                  <Button
                    type="button"
                    size="sm"
                    variant="parchment"
                    onClick={handleFillCurrentBossTeam}
                    className="h-7 px-2 text-[11px] font-bold gap-1 text-amber-700 dark:text-amber-300"
                    title="自動帶入當前此 BOSS 排定隊伍的名單"
                  >
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span>帶入本團成員</span>
                  </Button>
                )}

                <Button
                  type="button"
                  size="sm"
                  variant="parchment"
                  onClick={toggleAllAccordions}
                  className="h-7 px-2 text-[11px] font-bold text-stone-600 dark:text-slate-300"
                >
                  {isAllExpanded ? '全部收合' : '全部展開'}
                </Button>

                {canManage && members.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="parchment"
                    onClick={handleClearAllMembers}
                    className="h-7 px-2 text-[11px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>清空名單</span>
                  </Button>
                )}
              </div>
            </div>

            {/* 已選成員摘要預覽 */}
            {members.length === 0 ? (
              <div className="py-4 px-3 text-center text-xs text-rose-500 bg-rose-500/10 border border-dashed border-rose-400/80 rounded-xl">
                尚未勾選任何隊友！請在下方玩家名冊中勾選參與此次掉落分配的成員。
              </div>
            ) : !isSold ? (
              /* 待售中：精簡標籤膠囊預覽 */
              <div className="p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/30">
                <div className="text-[11px] font-black text-amber-900 dark:text-amber-200 mb-1.5 flex items-center justify-between">
                  <span>已選成員 ({members.length} 人)：</span>
                  <span className="text-[10px] text-stone-500 dark:text-slate-400 font-normal">
                    點擊標籤 ✕ 或下方核取方塊可取消
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {members.map((m) => {
                    const isCurrent = currentPlayer?.name === m.playerName;
                    return (
                      <span
                        key={m.charId}
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold transition-all',
                          m.isGuest
                            ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700'
                            : isCurrent
                            ? 'bg-amber-200 dark:bg-amber-800/60 text-amber-950 dark:text-amber-100 border border-amber-400'
                            : 'bg-white dark:bg-slate-800 text-stone-800 dark:text-slate-200 border border-stone-300 dark:border-slate-700'
                        )}
                      >
                        <span>{m.charName}</span>
                        {m.isGuest ? (
                          <span className="text-[9px] opacity-75 font-normal">(Guest)</span>
                        ) : (
                          <span className="text-[9px] opacity-60 font-normal">({m.playerName})</span>
                        )}
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => handleToggleMember(m.charId, m.charName, m.playerName, m.isGuest)}
                            className="hover:text-rose-500 ml-0.5 p-0.5 rounded transition-colors cursor-pointer"
                            title="取消勾選"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* 已售出：顯示分配金額與個人交付狀態 */
              <div className="p-2.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                <div className="text-[11px] font-black text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                  <span>已選成員與收益分配 ({members.length} 人)：</span>
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                    每人應得：{formatLootPrice(splitCalc.splitAmountPerMember, saleCurrency)}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                  {members.map((member) => {
                    const isCurrent = currentPlayer?.name === member.playerName;
                    return (
                      <div
                        key={member.charId}
                        className={cn(
                          'p-2 rounded-lg border flex items-center justify-between gap-1.5 transition-all text-xs',
                          isCurrent
                            ? 'bg-amber-500/10 border-amber-500/40 dark:bg-amber-950/30'
                            : 'bg-white dark:bg-slate-800 border-stone-300 dark:border-slate-700'
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-xs text-stone-900 dark:text-slate-100 truncate">
                              {member.charName}
                            </span>
                            {member.isGuest ? (
                              <span className="px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 text-[9px] font-black">
                                Guest
                              </span>
                            ) : (
                              <span className="text-[10px] text-stone-500 dark:text-slate-400 truncate">
                                ({member.playerName})
                              </span>
                            )}
                            {isCurrent && (
                              <span className="px-1 py-0.2 rounded bg-amber-500 text-slate-950 text-[9px] font-black">
                                你
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {canManage ? (
                            <button
                              type="button"
                              onClick={() => {
                                setMembers((prev) =>
                                  prev.map((m) =>
                                    m.charId === member.charId
                                      ? { ...m, isPaid: !m.isPaid, paidAt: !m.isPaid ? new Date().toISOString() : undefined }
                                      : m
                                  )
                                );
                              }}
                              className={cn(
                                'px-1.5 py-0.5 rounded text-[10px] font-black transition-all cursor-pointer',
                                member.isPaid
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-stone-200 dark:bg-slate-700 text-stone-600 dark:text-slate-300'
                              )}
                            >
                              {member.isPaid ? '✓ 已交付' : '未交付'}
                            </button>
                          ) : (
                            <span
                              className={cn(
                                'px-1.5 py-0.5 rounded text-[10px] font-black',
                                member.isPaid
                                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-stone-200/70 dark:bg-slate-700/60 text-stone-500 dark:text-slate-400'
                              )}
                            >
                              {member.isPaid ? '✓ 已交付' : '未交付'}
                            </span>
                          )}
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleToggleMember(member.charId, member.charName, member.playerName, member.isGuest)}
                              className="p-1 text-stone-400 hover:text-rose-500 transition-colors"
                              title="取消勾選此成員"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 搜尋過濾輸入框 */}
            <div className="relative">
              <Input
                type="text"
                placeholder="搜尋玩家或角色名稱..."
                value={memberSearchFilter}
                onChange={(e) => setMemberSearchFilter(e.target.value)}
                className="text-xs h-8 pl-8 pr-7"
              />
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5 pointer-events-none" />
              {memberSearchFilter && (
                <button
                  type="button"
                  onClick={() => setMemberSearchFilter('')}
                  className="absolute right-2 top-2 p-0.5 text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 雙欄排版：左欄為全體玩家手風琴名冊，右欄為臨時隊友 (Guest) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
              {/* 第 1 欄：👥 小隊正式角色名冊 (所有玩家手風琴置於同一容器區塊內) */}
              <div className="flex flex-col bg-black/5 dark:bg-black/25 rounded-2xl border-2 border-slate-300 dark:border-slate-700 p-3 space-y-2">
                <div className="font-black text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between pb-1 border-b border-slate-300/60 dark:border-slate-700">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-500" />
                    <span>小隊正式角色名冊</span>
                  </div>
                  <span className="text-[10px] text-stone-400 font-normal">依玩家分群</span>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {filteredPlayersWithChars.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 italic">
                      無符合條件的玩家或角色
                    </div>
                  ) : (
                    filteredPlayersWithChars.map(({ player, chars, totalCharCount, selectedCount }) => {
                      const isExpanded = memberSearchFilter.trim() !== '' || expandedPlayerNames.has(player.name);
                      return (
                        <div
                          key={player.name}
                          className="rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 overflow-hidden shadow-2xs"
                        >
                          {/* 玩家標題列 */}
                          <button
                            type="button"
                            onClick={() => togglePlayerAccordion(player.name)}
                            className="w-full px-2.5 py-2 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-left"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span>{player.avatarEmoji || '👤'}</span>
                              <span className="font-black text-xs text-[#3E2F20] dark:text-slate-100 truncate">
                                {player.name}
                              </span>
                              <span className="text-[10px] text-stone-400 font-bold">
                                ({totalCharCount})
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {selectedCount > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black">
                                  已選 {selectedCount}
                                </span>
                              )}
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                              )}
                            </div>
                          </button>

                          {/* 展開之角色勾選清單 */}
                          {isExpanded && (
                            <div className="p-1.5 pt-0 space-y-1 border-t border-slate-200 dark:border-slate-700">
                              {chars.length === 0 ? (
                                <div className="py-2 text-center text-[11px] text-stone-400 italic">
                                  無符合角色
                                </div>
                              ) : (
                                chars.map((char) => {
                                  const isChecked = members.some((m) => m.charId === char.id);
                                  return (
                                    <label
                                      key={char.id}
                                      className={cn(
                                        'flex items-center justify-between p-1.5 rounded-lg border transition-all cursor-pointer text-xs select-none',
                                        isChecked
                                          ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-500 font-black text-amber-900 dark:text-amber-200'
                                          : 'hover:bg-slate-100 dark:hover:bg-slate-700/60 border-transparent text-slate-700 dark:text-slate-300'
                                      )}
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <input
                                          type="checkbox"
                                          disabled={!canManage}
                                          checked={isChecked}
                                          onChange={() => handleToggleMember(char.id, char.name, player.name, false)}
                                          className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-400 cursor-pointer disabled:cursor-not-allowed"
                                        />
                                        <span className="truncate">{char.name}</span>
                                      </div>
                                    </label>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 第 2 欄：👥 臨時隊友 (Guest) */}
              <div className="flex flex-col bg-black/5 dark:bg-black/25 rounded-2xl border-2 border-slate-300 dark:border-slate-700 p-3 space-y-2">
                <div className="font-black text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between pb-1 border-b border-slate-300/60 dark:border-slate-700">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-500" />
                    <span>臨時隊友 (Guest)</span>
                  </div>
                  <span className="text-[10px] text-stone-400 font-normal">快速建立/勾選</span>
                </div>

                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {filteredGuests.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 italic">
                      目前尚無 Guest 隊友
                    </div>
                  ) : (
                    filteredGuests.map((guest) => {
                      const isChecked = members.some((m) => m.charId === guest.id);
                      return (
                        <div
                          key={guest.id}
                          className={cn(
                            'flex items-center justify-between p-1.5 rounded-xl border transition-all text-xs select-none',
                            isChecked
                              ? 'bg-purple-100 dark:bg-purple-950/60 border-purple-500 font-black text-purple-900 dark:text-purple-200'
                              : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          )}
                        >
                          <label className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={!canManage}
                              checked={isChecked}
                              onChange={() => handleToggleMember(guest.id, guest.name, '臨時隊友', true)}
                              className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-400 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <span className="truncate font-bold">{guest.name}</span>
                          </label>

                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleDeleteGuest(guest.id)}
                              className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                              title="刪除此 Guest"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 快速新增 Guest 輸入框 */}
                {canManage && (
                  <div className="pt-2 border-t border-slate-300/60 dark:border-slate-700 flex items-center gap-1">
                    <Input
                      placeholder="輸入臨時隊友稱呼..."
                      value={quickGuestName}
                      onChange={(e) => setQuickGuestName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleQuickAddGuest();
                        }
                      }}
                      className="h-7 text-xs flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="parchment"
                      onClick={handleQuickAddGuest}
                      disabled={!quickGuestName.trim()}
                      className="h-7 px-2 text-xs font-black shrink-0 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>新增</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 5. 備註說明 */}
          <div>
            <label className="text-xs font-black text-stone-800 dark:text-slate-200 mb-1 block">
              備註說明 (選填)
            </label>
            <Input
              type="text"
              disabled={!canManage}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例如：由隊長拍賣上架、預計週日結算、買家自出等..."
              className="text-xs h-9"
            />
          </div>
        </DialogBody>

        <DialogFooter className="p-4 sm:px-6 border-t border-kerning-stroke/30 dark:border-slate-700 bg-black/5 dark:bg-black/20 flex items-center justify-between">
          <div>
            {!canManage && lootToEdit && (
              <span className="text-xs text-rose-500 dark:text-rose-400 font-bold flex items-center gap-1">
                🔒 僅保管人或管理員可儲存修改
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="parchment" size="sm" onClick={onClose}>
              {canManage ? '取消' : '關閉'}
            </Button>
            {canManage && (
              <Button variant="gold" size="sm" onClick={handleSave} className="font-black">
                {lootToEdit ? '儲存變更' : '確定登記戰利品'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
