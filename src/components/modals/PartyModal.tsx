import { useState, useEffect, useMemo, FormEvent } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { MemberTarget, Team, RaidSchedule } from '@/types/party';
import { getBoss } from '@/data/bosses';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Users, Clock, Zap, AlertCircle, Plus, Trash2, UserCheck, ChevronDown, ChevronRight } from 'lucide-react';

interface PartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  charId: string;
  bossId: string;
  entryIndex: number;
}

const DAY_OPTIONS = [
  { value: 4, label: '每週四 (重置日)' },
  { value: 5, label: '每週五' },
  { value: 6, label: '每週六' },
  { value: 0, label: '每週日' },
  { value: 1, label: '每週一' },
  { value: 2, label: '每週二' },
  { value: 3, label: '每週三' },
];

const TEMP_DAY_OPTIONS = [
  { value: 4, label: '本週四' },
  { value: 5, label: '本週五' },
  { value: 6, label: '本週六' },
  { value: 0, label: '本週日' },
  { value: 1, label: '本週一' },
  { value: 2, label: '本週二' },
  { value: 3, label: '本週三' },
];

export function PartyModal({ isOpen, onClose, charId, bossId, entryIndex }: PartyModalProps) {
  const { players, store, getAllCharacters, getCharName, addGuest, deleteGuest, saveTeamAndRecords } = useStore();

  const boss = getBoss(bossId);
  const recordKey = `rec_${charId}_${bossId}_${entryIndex}`;
  const currentRec = store.weeklyRecords[recordKey];
  const currentTeamId = currentRec?.teamId || `single_${charId}_${bossId}_${entryIndex}`;
  const currentTeam = store.teams[currentTeamId];

  const [memberTargets, setMemberTargets] = useState<MemberTarget[]>([]);
  const [recurringDay, setRecurringDay] = useState<number>(4);
  const [recurringHour, setRecurringHour] = useState<string>('21');
  const [recurringMin, setRecurringMin] = useState<string>('00');
  const [hasRecurring, setHasRecurring] = useState<boolean>(false);

  const [tempDay, setTempDay] = useState<number>(4);
  const [tempHour, setTempHour] = useState<string>('21');
  const [tempMin, setTempMin] = useState<string>('00');
  const [hasTemp, setHasTemp] = useState<boolean>(false);

  const [quickGuestName, setQuickGuestName] = useState<string>('');
  const [expandedPlayerNames, setExpandedPlayerNames] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && boss) {
      if (currentTeam && currentTeam.memberTargets) {
        setMemberTargets([...currentTeam.memberTargets]);
      } else {
        setMemberTargets([{ charId, entryIndex }]);
      }

      if (currentTeam?.schedule?.recurring) {
        setHasRecurring(true);
        setRecurringDay(currentTeam.schedule.recurring.dayOfWeek);
        const recurringTimeStr = currentTeam?.schedule?.recurring?.timeStr || (currentTeam?.schedule?.recurring as any)?.time || '21:00';
    const [h, m] = (typeof recurringTimeStr === 'string' ? recurringTimeStr : '21:00').split(':');
        setRecurringHour(h || '21');
        setRecurringMin(m || '00');
      } else {
        setHasRecurring(false);
      }

      if (currentTeam?.schedule?.tempOverride) {
        setHasTemp(true);
        setTempDay(currentTeam.schedule.tempOverride.dayOfWeek);
        const tempTimeStr = currentTeam?.schedule?.tempOverride?.timeStr || (currentTeam?.schedule?.tempOverride as any)?.time || '21:00';
    const [th, tm] = (typeof tempTimeStr === 'string' ? tempTimeStr : '21:00').split(':');
        setTempHour(th || '21');
        setTempMin(tm || '00');
      } else {
        setHasTemp(false);
      }

      setErrorMsg('');
      setExpandedPlayerNames(new Set());
    }
  }, [isOpen, charId, bossId, entryIndex, currentTeam, boss]);

  if (!boss) return null;

  const maxPartySize = boss.maxPartySize || 6;
  const allChars = getAllCharacters();
  const currentChar = allChars.find((c) => c.id === charId);
  const currentOwnerPlayerName = currentChar?.playerName;

  // 篩選出該 BOSS 已排定的所有角色選項（包含首次刷與重置刷）
  // 排除當前玩家名下的其他角色（因為同一玩家無法自己跟自己組隊）
  const scheduledCharOptions: { char: any; entry: number }[] = [];
  allChars.forEach((c) => {
    const isSamePlayer = Boolean(currentOwnerPlayerName && c.playerName === currentOwnerPlayerName);
    const isCurrentChar = c.id === charId;

    // 排除同玩家名下的其他角色（自己跟自己無法組隊）
    if (isSamePlayer && !isCurrentChar) {
      return;
    }

    const hasNormal = c.bossIds && c.bossIds.includes(bossId);
    const hasReset = c.resetBossIds && c.resetBossIds.includes(bossId);

    if (isCurrentChar) {
      // 當前角色只列出目前正在設定的輪次
      scheduledCharOptions.push({ char: c, entry: entryIndex });
    } else {
      if (hasNormal) scheduledCharOptions.push({ char: c, entry: 1 });
      if (hasReset) scheduledCharOptions.push({ char: c, entry: 2 });
    }
  });

  // 收集同 BOSS 其他已存在的隊伍（大於1人且有空位）供快速加入，排除單人隊伍 (single team)
  const existingOtherTeams = Object.values(store.teams || {}).filter((t) => {
    if (t.id === currentTeamId) return false;
    if (t.id.startsWith('single_')) return false;
    if (!t.memberTargets || t.memberTargets.length <= 1) return false;

    const isSameBossTeam = t.memberTargets.some((m) => {
      const rec = store.weeklyRecords[`rec_${m.charId}_${bossId}_${m.entryIndex}`];
      return Boolean(rec && rec.teamId === t.id);
    });
    return isSameBossTeam;
  });

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

  // 依玩家名稱分群正式角色名冊
  const groupedCharOptions = useMemo(() => {
    const groupMap = new Map<string, { playerName: string; avatarEmoji?: string; options: { char: any; entry: number }[] }>();

    scheduledCharOptions.forEach((opt) => {
      const pName = opt.char.playerName || '其他冒險者';
      if (!groupMap.has(pName)) {
        const pObj = players?.find((p) => p.name === pName);
        groupMap.set(pName, {
          playerName: pName,
          avatarEmoji: pObj?.avatarEmoji || '👤',
          options: [],
        });
      }
      groupMap.get(pName)!.options.push(opt);
    });

    return Array.from(groupMap.values());
  }, [scheduledCharOptions, players]);

  const handleToggleMember = (targetCharId: string, targetEntry: number) => {
    const exists = memberTargets.some((m) => m.charId === targetCharId && m.entryIndex === targetEntry);
    if (exists) {
      // 當前角色為隊長，不可取消勾選
      if (targetCharId === charId && targetEntry === entryIndex) {
        return;
      }
      setMemberTargets(memberTargets.filter((m) => !(m.charId === targetCharId && m.entryIndex === targetEntry)));
      setErrorMsg('');
    } else {
      // 檢查是否已用另一種身分加入
      const hasOtherEntry = memberTargets.some((m) => m.charId === targetCharId);
      if (hasOtherEntry && !targetCharId.startsWith('guest_')) {
        setErrorMsg('同一角色不能同時以「首次刷」與「重置刷」出現在同一隊伍中！');
        return;
      }

      if (memberTargets.length >= maxPartySize) {
        setErrorMsg(`此 BOSS 最多僅支援 ${maxPartySize} 人隊伍！`);
        return;
      }
      setErrorMsg('');
      setMemberTargets([...memberTargets, { charId: targetCharId, entryIndex: targetEntry }]);
    }
  };

  const handleQuickJoin = (targetTeam: Team) => {
    if (targetTeam.memberTargets.length >= maxPartySize) {
      setErrorMsg('該隊伍人數已滿！');
      return;
    }
    const filtered = targetTeam.memberTargets.filter((m) => m.charId !== charId);
    setMemberTargets([...filtered, { charId, entryIndex }]);
    setErrorMsg('');
  };

  const handleAddQuickGuest = async (e: FormEvent) => {
    e.preventDefault();
    const clean = quickGuestName.trim();
    if (!clean) return;
    if (memberTargets.length >= maxPartySize) {
      setErrorMsg(`隊伍人數已滿 (${maxPartySize} 人)！`);
      return;
    }

    try {
      const g = await addGuest(clean);
      if (g) {
        setMemberTargets([...memberTargets, { charId: g.id, entryIndex: 1 }]);
      }
      setQuickGuestName('');
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg(err?.message || '新增臨時隊友失敗！');
    }
  };

  const handleDeleteGuest = async (guestId: string) => {
    if (!confirm('確定要刪除此 Guest 隊友嗎？(所有已存在該 Guest 的隊伍將同步移除)')) return;
    try {
      await deleteGuest(guestId);
      setMemberTargets(memberTargets.filter((m) => m.charId !== guestId));
    } catch (err: any) {
      setErrorMsg(err?.message || '刪除失敗！');
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const newTeamId =
        memberTargets.length === 1
          ? `single_${memberTargets[0].charId}_${bossId}_${memberTargets[0].entryIndex}`
          : `party_${bossId}_${Date.now()}`;

      const recSched: RaidSchedule | null = hasRecurring
        ? { dayOfWeek: Number(recurringDay), timeStr: `${recurringHour}:${recurringMin}` }
        : null;

      const tmpSched: RaidSchedule | null = hasTemp
        ? { dayOfWeek: Number(tempDay), timeStr: `${tempHour}:${tempMin}` }
        : null;

      const nextTeam: Team = {
        id: newTeamId,
        memberTargets,
        schedule: recSched || tmpSched ? { recurring: recSched, tempOverride: tmpSched } : null,
      };

      const updatedRecords: Record<string, any> = {};
      memberTargets.forEach((t) => {
        const key = `rec_${t.charId}_${bossId}_${t.entryIndex}`;
        const existing = store.weeklyRecords[key] || {
          charId: t.charId,
          bossId,
          entryIndex: t.entryIndex,
          isCompleted: false,
        };
        updatedRecords[key] = {
          ...existing,
          teamId: newTeamId,
        };
      });

      await saveTeamAndRecords(nextTeam, updatedRecords);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || '儲存失敗！');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 生成小時 (00-23) 與分鐘 (00, 15, 30, 45) 選項
  const hourOptions = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minOptions = ['00', '10', '15', '20', '30', '40', '45', '50'];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent maxWidthClass="max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            <Users className="w-5 h-5 text-amber-500" />
            <span>組隊與排程設定：{boss.name}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave}>
          <DialogBody className="space-y-4 max-h-[76vh]">
            {/* 上方：隊伍人數狀態膠囊 */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-400/10 border-2 border-amber-400/30 flex-wrap gap-2">
              <div>
                <div className="text-xs font-black text-[#3E2F20] dark:text-slate-100 flex items-center gap-2">
                  <span>隊伍人數上限：{maxPartySize} 人</span>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    (目前已選取 {memberTargets.length} 位隊員)
                  </span>
                </div>
                <div className="text-[11px] text-stone-500 dark:text-slate-400 mt-0.5">
                  點選下方角色或 Guest 加入/移出隊伍，可跨玩家自由編組
                </div>
              </div>

              {/* 隊伍成員頭像槽位 */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {Array.from({ length: maxPartySize }).map((_, i) => {
                  const m = memberTargets[i];
                  if (m) {
                    const isLeader = m.charId === charId && m.entryIndex === entryIndex;
                    const name = getCharName(m.charId);
                    return (
                      <div
                        key={i}
                        className={
                          'px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 border-2 shadow-xs transition-all ' +
                          (isLeader
                            ? 'bg-amber-400 border-amber-600 text-slate-900 ring-2 ring-amber-300'
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200')
                        }
                        title={name + (m.entryIndex === 2 ? ' (重置刷)' : '')}
                      >
                        <UserCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span className="max-w-[80px] truncate">{name}</span>
                        {m.entryIndex === 2 && <span className="text-[10px] text-purple-600 font-bold">2刷</span>}
                        {isLeader && <span className="text-[10px] text-amber-900 font-bold">👑</span>}
                      </div>
                    );
                  }
                  return (
                    <div
                      key={i}
                      className="px-2.5 py-1 rounded-xl text-xs font-bold border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 select-none"
                    >
                      空位
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ========================================================
                V1 經典三欄橫式排版 (3-Column Horizontal Layout)
                Column 1: ⚡ 快捷加入現成隊伍
                Column 2: 👥 小隊正式角色名冊
                Column 3: 👤 Guest 臨時隊友
                ======================================================== */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-start">
              {/* 第 1 欄：⚡ 快捷加入同伴現成隊伍 */}
              <div className="flex flex-col bg-black/5 dark:bg-black/25 rounded-2xl border-2 border-slate-300 dark:border-slate-700 p-3 space-y-2">
                <div className="font-black text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5 pb-1 border-b border-slate-300/60 dark:border-slate-700">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>快捷加入現成隊伍</span>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {existingOtherTeams.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 italic">
                      目前尚無其他同伴建立的隊伍
                    </div>
                  ) : (
                    existingOtherTeams.map((team) => {
                      const isFull = team.memberTargets.length >= maxPartySize;
                      const memberNames = team.memberTargets
                        .map((m) => {
                          const n = getCharName(m.charId);
                          return m.entryIndex === 2 ? `${n}(2刷)` : n;
                        })
                        .join('、');

                      return (
                        <div
                          key={team.id}
                          className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 space-y-1.5 shadow-xs"
                        >
                          <div className="text-xs text-slate-700 dark:text-slate-300">
                            <span className="font-bold">隊員：</span>
                            <span className="font-medium text-slate-800 dark:text-slate-100">{memberNames}</span>
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] font-bold text-slate-400">
                              {team.memberTargets.length} / {maxPartySize} 人
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="gold"
                              disabled={isFull}
                              onClick={() => handleQuickJoin(team)}
                              className="h-6 px-2 text-[11px] font-bold"
                            >
                              {isFull ? '已滿員' : '加入此隊'}
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 第 2 欄：👥 正式角色名冊（依玩家名稱分群手風琴折疊） */}
              <div className="flex flex-col bg-black/5 dark:bg-black/25 rounded-2xl border-2 border-slate-300 dark:border-slate-700 p-3 space-y-2">
                <div className="font-black text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between pb-1 border-b border-slate-300/60 dark:border-slate-700">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-500" />
                    <span>小隊正式角色</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">
                    共 {groupedCharOptions.length} 位玩家 ({scheduledCharOptions.length} 隻角色)
                  </span>
                </div>

                <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                  {groupedCharOptions.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 italic">
                      尚無其他玩家排定挑戰此 BOSS
                    </div>
                  ) : (
                    groupedCharOptions.map((group) => {
                      const isExpanded = expandedPlayerNames.has(group.playerName);
                      const selectedCountInGroup = group.options.filter((opt) =>
                        memberTargets.some((m) => m.charId === opt.char.id && m.entryIndex === opt.entry)
                      ).length;

                      return (
                        <div
                          key={group.playerName}
                          className="rounded-xl border border-slate-300/90 dark:border-slate-700/90 overflow-hidden bg-white/70 dark:bg-slate-800/70 shadow-xs"
                        >
                          {/* 玩家手風琴標題列 (點擊展開/收合) */}
                          <div
                            onClick={() => togglePlayerAccordion(group.playerName)}
                            className="p-2 flex items-center justify-between cursor-pointer select-none bg-slate-100/90 dark:bg-slate-800 hover:bg-amber-100/70 dark:hover:bg-slate-700 transition-colors"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="w-5 h-5 rounded-md bg-black/10 flex items-center justify-center text-xs shrink-0">
                                {group.avatarEmoji || '👤'}
                              </span>
                              <span className="font-black text-xs text-[#3E2F20] dark:text-slate-100 truncate">
                                {group.playerName}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold">
                                ({group.options.length}隻)
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {selectedCountInGroup > 0 && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-900 font-black text-[9.5px] border border-amber-500 shadow-xs">
                                  已選 {selectedCountInGroup}
                                </span>
                              )}
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                              )}
                            </div>
                          </div>

                          {/* 手風琴內部角色列表 */}
                          {isExpanded && (
                            <div className="p-1.5 space-y-1 bg-black/5 dark:bg-black/20 border-t border-slate-200 dark:border-slate-700 animate-in fade-in-50 duration-100">
                              {group.options.map(({ char: c, entry }) => {
                                const isChecked = memberTargets.some(
                                  (m) => m.charId === c.id && m.entryIndex === entry
                                );
                                const isSelf = c.id === charId && entry === entryIndex;

                                return (
                                  <label
                                    key={`${c.id}_${entry}`}
                                    onClick={() => handleToggleMember(c.id, entry)}
                                    className={
                                      'p-1.5 rounded-lg text-xs border transition-all flex items-center justify-between cursor-pointer select-none ' +
                                      (isChecked
                                        ? 'bg-amber-400/20 border-amber-500 font-black text-amber-950 dark:text-amber-200 shadow-xs'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-400')
                                    }
                                  >
                                    <div className="flex items-center gap-1.5 truncate">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        readOnly
                                        className="rounded border-slate-400 text-amber-500 pointer-events-none w-3.5 h-3.5"
                                      />
                                      <span className="truncate font-bold">{c.name}</span>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      {entry === 2 && (
                                        <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 text-[9.5px] font-black">
                                          2刷
                                        </span>
                                      )}
                                      {isSelf && (
                                        <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-900 text-[9.5px] font-black">
                                          隊長
                                        </span>
                                      )}
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 第 3 欄：👤 Guest 臨時隊友區 */}
              <div className="flex flex-col bg-black/5 dark:bg-black/25 rounded-2xl border-2 border-slate-300 dark:border-slate-700 p-3 space-y-2">
                <div className="font-black text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between pb-1 border-b border-slate-300/60 dark:border-slate-700">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">👤</span>
                    <span>Guest 臨時隊友</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">
                    共 {store.guests?.length || 0} 位
                  </span>
                </div>

                {/* 快速新增 Guest */}
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={quickGuestName}
                    onChange={(e) => setQuickGuestName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddQuickGuest(e as any);
                      }
                    }}
                    placeholder="輸入 Guest 名字"
                    className="flex-1 px-2.5 py-1 text-xs rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 font-bold"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="parchment"
                    onClick={handleAddQuickGuest}
                    className="text-xs px-2.5 shrink-0 h-7"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>新增</span>
                  </Button>
                </div>

                {/* Guest 勾選與刪除列表 */}
                <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1">
                  {!store.guests || store.guests.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 italic">
                      目前尚無 Guest 隊友，可在上方輸入名字新增
                    </div>
                  ) : (
                    store.guests.map((g) => {
                      const isChecked = memberTargets.some((m) => m.charId === g.id);

                      return (
                        <div
                          key={g.id}
                          className={
                            'p-2 rounded-xl text-xs border-2 transition-all flex items-center justify-between ' +
                            (isChecked
                              ? 'bg-sky-500/15 border-sky-500 font-black text-sky-950 dark:text-sky-200 shadow-xs'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400')
                          }
                        >
                          <label
                            onClick={() => handleToggleMember(g.id, 1)}
                            className="flex items-center gap-2 truncate cursor-pointer flex-1 select-none"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              readOnly
                              className="rounded border-slate-400 text-sky-500 pointer-events-none"
                            />
                            <span className="truncate font-bold">{g.name}</span>
                            <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold">(Guest)</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => handleDeleteGuest(g.id)}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                            title="刪除此 Guest"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* ========================================================
                ⏰ 隊伍出團時間排程設定 (Cloud Shared Schedule)
                ======================================================== */}
            <div className="p-3.5 bg-black/5 dark:bg-black/25 rounded-2xl border-2 border-slate-300 dark:border-slate-700 space-y-3">
              <div className="font-black text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>⏰ 隊伍出團時間排程（選填，雲端即時共享）</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* 常態固定時間 */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 font-bold cursor-pointer select-none text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={hasRecurring}
                      onChange={(e) => setHasRecurring(e.target.checked)}
                      className="rounded border-slate-400 text-amber-500"
                    />
                    <span>📅 常態每週固定時間：</span>
                  </label>

                  {hasRecurring ? (
                    <div className="flex items-center gap-2 pt-0.5">
                      <select
                        value={recurringDay}
                        onChange={(e) => setRecurringDay(Number(e.target.value))}
                        className="flex-1 px-2.5 py-1.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                      >
                        {DAY_OPTIONS.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1">
                        <select
                          value={recurringHour}
                          onChange={(e) => setRecurringHour(e.target.value)}
                          className="px-2 py-1.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-center"
                        >
                          {hourOptions.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                        <span className="font-black text-slate-400">:</span>
                        <select
                          value={recurringMin}
                          onChange={(e) => setRecurringMin(e.target.value)}
                          className="px-2 py-1.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-center"
                        >
                          {minOptions.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic pl-5">未設定常態時間</div>
                  )}
                </div>

                {/* 本週臨時改期 */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 font-bold cursor-pointer select-none text-amber-600 dark:text-amber-400">
                    <input
                      type="checkbox"
                      checked={hasTemp}
                      onChange={(e) => setHasTemp(e.target.checked)}
                      className="rounded border-slate-400 text-amber-500"
                    />
                    <span>⚡ 僅修改本週時間（下週自動恢復）：</span>
                  </label>

                  {hasTemp ? (
                    <div className="flex items-center gap-2 pt-0.5">
                      <select
                        value={tempDay}
                        onChange={(e) => setTempDay(Number(e.target.value))}
                        className="flex-1 px-2.5 py-1.5 rounded-xl border-2 border-amber-400 dark:border-amber-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                      >
                        {TEMP_DAY_OPTIONS.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1">
                        <select
                          value={tempHour}
                          onChange={(e) => setTempHour(e.target.value)}
                          className="px-2 py-1.5 rounded-xl border-2 border-amber-400 dark:border-amber-600 bg-white dark:bg-slate-800 font-mono font-bold text-center"
                        >
                          {hourOptions.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                        <span className="font-black text-amber-500">:</span>
                        <select
                          value={tempMin}
                          onChange={(e) => setTempMin(e.target.value)}
                          className="px-2 py-1.5 rounded-xl border-2 border-amber-400 dark:border-amber-600 bg-white dark:bg-slate-800 font-mono font-bold text-center"
                        >
                          {minOptions.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic pl-5">未設定本週臨時改期</div>
                  )}
                </div>
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
              <span>儲存隊伍與排程</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
