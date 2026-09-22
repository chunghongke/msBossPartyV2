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
import { Sparkles, Users, Coins, Calendar, Trash2, Plus, Banknote } from 'lucide-react';

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
  const { store, addLoot, updateLoot, getAllCharacters, players } = useStore();
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
  const [members, setMembers] = useState<LootMemberPayout[]>([]);
  const [note, setNote] = useState('');

  // 輔助加入成員選擇器
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  const allCharacters = useMemo(() => getAllCharacters(), [getAllCharacters]);

  // ── 初始化或填入要編輯的戰利品 ──
  useEffect(() => {
    if (!isOpen) return;

    if (lootToEdit) {
      setItemName(lootToEdit.itemName);
      setCategory(lootToEdit.category);
      setSelectedCategoryTab(lootToEdit.category);
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
      setMembers(lootToEdit.members || []);
      setNote(lootToEdit.note || '');
    } else {
      // 新增模式
      setItemName('');
      setCategory('ring_related');
      setSelectedCategoryTab('all');
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
        setMembers(
          initialMembers.map((m) => ({
            charId: m.charId,
            charName: m.charName,
            playerName: m.playerName,
            isGuest: m.isGuest,
            isPaid: false,
          }))
        );
      } else {
        // 自動從現有隊伍尋找該 Boss Group 的成員
        const matchingTeam = Object.values(store.teams || {}).find((t) =>
          t.memberTargets?.some((mt) => {
            return Object.values(store.weeklyRecords || {}).some(
              (rec) => rec.charId === mt.charId && rec.teamId === t.id && getBossGroupKey(rec.bossId) === defaultGroup
            );
          })
        );

        if (matchingTeam && matchingTeam.memberTargets) {
          setTeamId(matchingTeam.id);
          const resolved = matchingTeam.memberTargets.map((mt) => {
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
        } else {
          setMembers([]);
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
    // 若當前無固定初始名單，自動搜尋該 Boss 群組所屬的隊伍與成員
    if (!initialMembers || initialMembers.length === 0) {
      const matchingTeam = Object.values(store.teams || {}).find((t) =>
        t.memberTargets?.some((mt) => {
          return Object.values(store.weeklyRecords || {}).some(
            (rec) => rec.charId === mt.charId && rec.teamId === t.id && getBossGroupKey(rec.bossId) === newGroupKey
          );
        })
      );

      if (matchingTeam && matchingTeam.memberTargets) {
        setTeamId(matchingTeam.id);
        const resolved = matchingTeam.memberTargets.map((mt) => {
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
      }
    }
  };

  // ── 點擊預設物品 ──
  const handleSelectPreset = (presetName: string) => {
    const preset = LOOT_PRESETS.find((p) => p.name === presetName);
    setItemName(presetName);
    if (preset) {
      setCategory(preset.category);
    } else {
      setCategory(inferCategoryByName(presetName));
    }
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

  // ── 移除成員 ──
  const handleRemoveMember = (charId: string) => {
    setMembers((prev) => prev.filter((m) => m.charId !== charId));
  };

  // ── 新增成員 ──
  const handleAddMemberFromList = (charId: string, charName: string, playerName: string, isGuest: boolean = false) => {
    if (members.some((m) => m.charId === charId)) return;
    setMembers((prev) => [
      ...prev,
      {
        charId,
        charName,
        playerName,
        isGuest,
        isPaid: false,
      },
    ]);
    setIsAddingMember(false);
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
      <DialogContent maxWidthClass="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
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
            />

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

          {/* 4. 參與分配的隊友名冊 */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-stone-800 dark:text-slate-200 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                <span>參與分配的隊友名單 ({members.length} 人)</span>
                <span className="text-rose-500">*</span>
              </label>

              {canManage && (
                <Button
                  size="sm"
                  variant="parchment"
                  onClick={() => setIsAddingMember(true)}
                  className="text-xs h-7 gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>手動加入成員</span>
                </Button>
              )}
            </div>

            {/* 成員清單 */}
            {members.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {members.map((member) => {
                  const isCurrent = currentPlayer?.name === member.playerName;
                  return (
                    <div
                      key={member.charId}
                      className={cn(
                        'p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all',
                        isCurrent
                          ? 'bg-amber-500/10 border-amber-500/40 dark:bg-amber-950/30'
                          : 'bg-white/70 dark:bg-slate-800/70 border-stone-300 dark:border-slate-700'
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-xs text-stone-900 dark:text-slate-100 truncate">
                            {member.charName}
                          </span>
                          {member.isGuest ? (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 text-[9px] font-black">
                              臨時隊友
                            </span>
                          ) : (
                            <span className="text-[10px] text-stone-500 dark:text-slate-400 truncate">
                              ({member.playerName})
                            </span>
                          )}
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 text-[9px] font-black">
                              你
                            </span>
                          )}
                        </div>

                        {/* 已售出時顯示個人金額與交付狀態 */}
                        {isSold && (
                          <div className="mt-1 flex items-center gap-2 text-[11px]">
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">
                              應分：{formatLootPriceShort(splitCalc.splitAmountPerMember, saleCurrency)}
                            </span>
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
                                  'px-1.5 py-0.2 rounded text-[10px] font-black transition-all cursor-pointer',
                                  member.isPaid
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-stone-200 dark:bg-slate-700 text-stone-600 dark:text-slate-300'
                                )}
                              >
                                {member.isPaid ? '✓ 已交付' : '未交付'}
                              </button>
                            ) : (
                              <div
                                className={cn(
                                  'px-1.5 py-0.2 rounded text-[10px] font-black cursor-default opacity-90',
                                  member.isPaid
                                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-stone-200/70 dark:bg-slate-700/60 text-stone-500 dark:text-slate-400'
                                )}
                                title="僅保管人或管理員可更新交付狀態"
                              >
                                {member.isPaid ? '✓ 已交付' : '未交付'}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.charId)}
                          className="p-1 text-stone-400 hover:text-rose-500 transition-colors shrink-0"
                          title="從本次分配中移除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-rose-500 bg-rose-500/10 border border-dashed border-rose-400 rounded-xl">
                尚未加入任何隊友！請點擊上方按鈕加入成員。
              </div>
            )}

            {/* 加入成員選擇面板 */}
            {isAddingMember && (
              <div className="p-3 bg-black/5 dark:bg-slate-800 rounded-xl border border-kerning-stroke/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-stone-800 dark:text-slate-200">
                    選擇要加入的公會同伴或臨時隊友
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingMember(false)}
                    className="text-xs text-stone-400 hover:text-stone-700"
                  >
                    取消
                  </button>
                </div>

                <Input
                  type="text"
                  placeholder="搜尋玩家或角色名稱..."
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  className="text-xs h-8"
                />

                <div className="max-h-36 overflow-y-auto space-y-1">
                  {allCharacters
                    .filter((c) => {
                      const q = memberSearchQuery.trim().toLowerCase();
                      return (
                        !members.some((m) => m.charId === c.id) &&
                        (!q || c.name.toLowerCase().includes(q) || c.playerName.toLowerCase().includes(q))
                      );
                    })
                    .slice(0, 15)
                    .map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleAddMemberFromList(c.id, c.name, c.playerName, false)}
                        className="w-full text-left p-1.5 rounded-lg text-xs hover:bg-black/10 dark:hover:bg-slate-700 flex items-center justify-between"
                      >
                        <span className="font-bold text-stone-900 dark:text-slate-100">{c.name}</span>
                        <span className="text-[10px] text-stone-500">({c.playerName})</span>
                      </button>
                    ))}

                  {/* 臨時隊友 */}
                  {(store.guests || [])
                    .filter((g) => {
                      const q = memberSearchQuery.trim().toLowerCase();
                      return (
                        !members.some((m) => m.charId === g.id) &&
                        (!q || g.name.toLowerCase().includes(q))
                      );
                    })
                    .map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handleAddMemberFromList(g.id, g.name, '臨時隊友', true)}
                        className="w-full text-left p-1.5 rounded-lg text-xs hover:bg-black/10 dark:hover:bg-slate-700 flex items-center justify-between text-indigo-700 dark:text-indigo-300"
                      >
                        <span className="font-bold">{g.name}</span>
                        <span className="text-[10px]">(臨時隊友)</span>
                      </button>
                    ))}
                </div>
              </div>
            )}
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
