import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useMemo, FormEvent } from 'react';
import { useStore } from '@/store';
import { MemberTarget, Team, RaidSchedule } from '@/types/party';
import { getBoss, getBossGroupKey, getBossCleanName, BOSSES } from '@/data/bosses';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { Users, Clock, Zap, AlertCircle, Plus, Trash2, UserCheck, ChevronDown, ChevronRight, Sparkles, Swords, Layers } from 'lucide-react';

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

const DIFFICULTY_CONFIG: Record<string, { label: string; activeStyle: string; inactiveStyle: string }> = {
  easy: {
    label: '簡',
    activeStyle: 'bg-gradient-to-b from-[#64748B] to-[#334155] text-white border-2 border-white shadow-[0_0_14px_rgba(255,255,255,0.95),0_0_6px_rgba(255,255,255,0.8)] scale-105 ring-2 ring-white/80 font-black z-10',
    inactiveStyle: 'bg-[#181C21] text-[#64748B] border-2 border-[#2E3744] hover:border-slate-400 hover:text-slate-200',
  },
  normal: {
    label: '普',
    activeStyle: 'bg-gradient-to-b from-[#2563EB] to-[#1D4ED8] text-white border-2 border-white shadow-[0_0_14px_rgba(56,189,248,0.95)] scale-105 ring-2 ring-sky-300 font-black z-10',
    inactiveStyle: 'bg-[#121E2E] text-[#60A5FA]/60 border-2 border-[#1E3A5F] hover:border-sky-400 hover:text-white',
  },
  hard: {
    label: '困',
    activeStyle: 'bg-gradient-to-b from-[#D97706] to-[#92400E] text-[#FFFBEB] border-2 border-[#FEF08A] shadow-[0_0_14px_rgba(245,158,11,0.95)] scale-105 ring-2 ring-amber-300 font-black z-10',
    inactiveStyle: 'bg-[#22160C] text-[#FBBF24]/60 border-2 border-[#5C3D21] hover:border-amber-400 hover:text-[#FFFBEB]',
  },
  extreme: {
    label: '極',
    activeStyle: 'bg-gradient-to-b from-[#E11D48] to-[#9F1239] text-[#FFF1F2] border-2 border-[#FFE4E6] shadow-[0_0_16px_rgba(244,63,94,1)] scale-105 ring-2 ring-rose-400 font-black z-10',
    inactiveStyle: 'bg-[#220B10] text-[#FB7185]/60 border-2 border-[#5E0D21] hover:border-rose-400 hover:text-[#FFF1F2]',
  },
};

export function PartyModal({ isOpen, onClose, charId, bossId, entryIndex }: PartyModalProps) {
  const { players, store, getAllCharacters, getCharName, addGuest, deleteGuest, saveTeamAndRecords } = useStore();
  const { canManageChar } = useAuth();

  // 💡 當前選取的 BOSS 難度 (支援在彈窗內直接切換同群組其他難度)
  const [selectedBossId, setSelectedBossId] = useState<string>(bossId);

  const activeBoss = getBoss(selectedBossId) || getBoss(bossId);
  const recordKey = `rec_${charId}_${selectedBossId}_${entryIndex}`;
  const currentRec = store.weeklyRecords[recordKey];
  const currentTeamId = currentRec?.teamId || `single_${charId}_${selectedBossId}_${entryIndex}`;

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

  // 取得同 BOSS 群組的所有難度選項
  const bossGroupKey = getBossGroupKey(bossId);
  const difficultyOptions = useMemo(() => {
    return BOSSES.filter((b) => getBossGroupKey(b.id) === bossGroupKey);
  }, [bossGroupKey]);

  useEffect(() => {
    if (isOpen && activeBoss) {
      setSelectedBossId(bossId);

      const targetRec = store.weeklyRecords[`rec_${charId}_${bossId}_${entryIndex}`];
      const targetTeamId = targetRec?.teamId || `single_${charId}_${bossId}_${entryIndex}`;
      const targetTeam = store.teams[targetTeamId];

      if (targetTeam && targetTeam.memberTargets) {
        setMemberTargets([...targetTeam.memberTargets]);
      } else {
        setMemberTargets([{ charId, entryIndex }]);
      }

      if (targetTeam?.schedule?.recurring) {
        setHasRecurring(true);
        setRecurringDay(targetTeam.schedule.recurring.dayOfWeek);
        const recurringTimeStr = targetTeam?.schedule?.recurring?.timeStr || (targetTeam?.schedule?.recurring as any)?.time || '21:00';
        const [h, m] = (typeof recurringTimeStr === 'string' ? recurringTimeStr : '21:00').split(':');
        setRecurringHour(h || '21');
        setRecurringMin(m || '00');
      } else {
        setHasRecurring(false);
      }

      if (targetTeam?.schedule?.tempOverride) {
        setHasTemp(true);
        setTempDay(targetTeam.schedule.tempOverride.dayOfWeek);
        const tempTimeStr = targetTeam?.schedule?.tempOverride?.timeStr || (targetTeam?.schedule?.tempOverride as any)?.time || '21:00';
        const [th, tm] = (typeof tempTimeStr === 'string' ? tempTimeStr : '21:00').split(':');
        setTempHour(th || '21');
        setTempMin(tm || '00');
      } else {
        setHasTemp(false);
      }

      setErrorMsg('');
      setExpandedPlayerNames(new Set());
    }
  }, [isOpen, charId, bossId, entryIndex]);

  if (!activeBoss) return null;

  const maxPartySize = activeBoss.maxPartySize || 6;
  const allChars = getAllCharacters();
  const currentChar = allChars.find((c) => c.id === charId);
  const currentOwnerPlayerName = currentChar?.playerName;

  // 切換難度處理函式
  const handleSwitchDifficulty = (newBossId: string) => {
    if (newBossId === selectedBossId) return;
    setSelectedBossId(newBossId);

    // 切換難度時，若原本為同難度隊伍則退出，回到僅剩隊長 1 人
    setMemberTargets([{ charId, entryIndex }]);
    setErrorMsg('');
  };

  // 篩選出其他同伴玩家排定此 BOSS 的角色（排除當前玩家名下所有角色，當前編輯角色已獨立置頂常駐）
  const otherScheduledCharOptions: { char: any; entry: number }[] = [];
  allChars.forEach((c) => {
    const isSamePlayer = Boolean(currentOwnerPlayerName && c.playerName === currentOwnerPlayerName);
    if (isSamePlayer) return;

    const hasNormal = c.bossIds && c.bossIds.includes(selectedBossId);
    const hasReset = c.resetBossIds && c.resetBossIds.includes(selectedBossId);

    const checkAndPush = (entry: number) => {
      const isSelectedInCurrent = memberTargets.some((m) => m.charId === c.id && m.entryIndex === entry);
      const recKey = `rec_${c.id}_${selectedBossId}_${entry}`;
      const rec = store.weeklyRecords[recKey];
      const otherTeamId = rec?.teamId;
      const otherTeam = otherTeamId ? store.teams[otherTeamId] : null;
      const isCoveredByOtherMultiTeam = Boolean(
        otherTeam &&
        otherTeamId !== currentTeamId &&
        !otherTeamId.startsWith('single_') &&
        (otherTeam.memberTargets?.length || 0) > 1
      );

      if (isCoveredByOtherMultiTeam && !isSelectedInCurrent) {
        return;
      }

      otherScheduledCharOptions.push({ char: c, entry });
    };

    if (hasNormal) checkAndPush(1);
    if (hasReset) checkAndPush(2);
  });

  // 收集同 BOSS 其他已存在的隊伍（大於1人且有空位）供快速加入
  const existingOtherTeams = Object.values(store.teams || {}).filter((t) => {
    if (t.id === currentTeamId) return false;
    if (t.id.startsWith('single_')) return false;
    if (!t.memberTargets || t.memberTargets.length <= 1) return false;

    // 💡 關鍵排他：若該隊伍已包含當前玩家名下的「任何角色」(同一帳號同一團只能派出 1 隻角色出戰)，不顯示於快速加入
    const containsCurrentPlayerChar = t.memberTargets.some((m) => {
      if (m.charId.startsWith('guest_')) return false;
      const c = allChars.find((x) => x.id === m.charId);
      return Boolean(c && currentOwnerPlayerName && c.playerName === currentOwnerPlayerName);
    });
    if (containsCurrentPlayerChar) return false;

    const isSameBossTeam = t.memberTargets.some((m) => {
      const rec = store.weeklyRecords[`rec_${m.charId}_${selectedBossId}_${m.entryIndex}`];
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

  // 依玩家名稱分群其他同伴的正式角色名冊
  const groupedCharOptions = useMemo(() => {
    const groupMap = new Map<string, { playerName: string; avatarEmoji?: string; options: { char: any; entry: number }[] }>();

    otherScheduledCharOptions.forEach((opt) => {
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
  }, [otherScheduledCharOptions, players]);

  const handleToggleMember = (targetCharId: string, targetEntry: number) => {
    // 當前角色為隊長，不可取消勾選
    if (targetCharId === charId && targetEntry === entryIndex) {
      return;
    }

    setMemberTargets((prev) => {
      const exists = prev.some((m) => m.charId === targetCharId && m.entryIndex === targetEntry);
      if (exists) {
        setErrorMsg('');
        return prev.filter((m) => !(m.charId === targetCharId && m.entryIndex === targetEntry));
      } else {
        const hasOtherEntry = prev.some((m) => m.charId === targetCharId);
        if (hasOtherEntry && !targetCharId.startsWith('guest_')) {
          setErrorMsg('同一角色不能同時以「首次刷」與「重置刷」出現在同一隊伍中！');
          return prev;
        }

        // 關鍵檢查：同一位玩家在同一個隊伍中只能被勾選 1 隻角色
        if (!targetCharId.startsWith('guest_')) {
          const targetChar = allChars.find((c) => c.id === targetCharId);
          const targetPlayerName = targetChar?.playerName;
          if (targetPlayerName) {
            const existingCharFromSamePlayer = prev.find((m) => {
              if (m.charId.startsWith('guest_')) return false;
              const c = allChars.find((x) => x.id === m.charId);
              return c && c.playerName === targetPlayerName;
            });

            if (existingCharFromSamePlayer) {
              const existingCharName = getCharName(existingCharFromSamePlayer.charId);
              setErrorMsg(
                `【${targetPlayerName}】已有角色【${existingCharName}】在隊伍中！同一玩家同一團只能派出 1 隻角色出戰。`
              );
              return prev;
            }
          }
        }

        if (prev.length >= maxPartySize) {
          setErrorMsg(`此 BOSS 最多僅支援 ${maxPartySize} 人隊伍！`);
          return prev;
        }

        setErrorMsg('');
        return [...prev, { charId: targetCharId, entryIndex: targetEntry }];
      }
    });
  };

  const handleQuickJoin = (targetTeam: Team) => {
    if (targetTeam.memberTargets.length >= maxPartySize) {
      setErrorMsg('該隊伍人數已滿！');
      return;
    }

    // 防禦卡控：同一個玩家在同一隊伍中只能派出 1 隻角色出戰
    const hasSamePlayerChar = targetTeam.memberTargets.some((m) => {
      if (m.charId.startsWith('guest_')) return false;
      if (m.charId === charId) return false;
      const c = allChars.find((x) => x.id === m.charId);
      return Boolean(c && currentOwnerPlayerName && c.playerName === currentOwnerPlayerName);
    });

    if (hasSamePlayerChar) {
      setErrorMsg(`【${currentOwnerPlayerName}】已有角色在該隊伍中！同一玩家同一團只能派出 1 隻角色出戰。`);
      return;
    }

    const filtered = targetTeam.memberTargets.filter((m) => m.charId !== charId);
    setMemberTargets([{ charId, entryIndex }, ...filtered]);
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
        setMemberTargets((prev) => [...prev, { charId: g.id, entryIndex: 1 }]);
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
      setMemberTargets((prev) => prev.filter((m) => m.charId !== guestId));
    } catch (err: any) {
      setErrorMsg(err?.message || '刪除失敗！');
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (currentOwnerPlayerName && !canManageChar(currentOwnerPlayerName)) {
      setErrorMsg('⚠️ 唯讀模式：只有該角色擁有者或管理員可以儲存組隊設定！');
      return;
    }

    // 嚴格卡控：同一個玩家在同一隊伍中只能被勾選 1 隻角色出戰
    const playerToCharsMap = new Map<string, string[]>();
    memberTargets.forEach((m) => {
      if (m.charId.startsWith('guest_')) return;
      const c = allChars.find((x) => x.id === m.charId);
      if (c?.playerName) {
        const list = playerToCharsMap.get(c.playerName) || [];
        list.push(c.name);
        playerToCharsMap.set(c.playerName, list);
      }
    });

    for (const [pName, charNames] of playerToCharsMap.entries()) {
      if (charNames.length > 1) {
        setErrorMsg(
          `玩家【${pName}】同時被勾選了 ${charNames.length} 隻角色（${charNames.join('、')}）！同一玩家同一團只能派出 1 隻角色出戰。`
        );
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const isDifficultyChanged = selectedBossId !== bossId;

      // 建立隊伍 ID
      const newTeamId =
        memberTargets.length === 1
          ? `single_${memberTargets[0].charId}_${selectedBossId}_${memberTargets[0].entryIndex}`
          : `party_${selectedBossId}_${Date.now()}`;

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
        const key = `rec_${t.charId}_${selectedBossId}_${t.entryIndex}`;
        const existing = store.weeklyRecords[key] || {
          charId: t.charId,
          bossId: selectedBossId,
          entryIndex: t.entryIndex,
          isCompleted: false,
        };
        updatedRecords[key] = {
          ...existing,
          teamId: newTeamId,
        };
      });

      if (isDifficultyChanged) {
        // 1. 構建更新後的角色 bossIds 清單
        const nextPlayers = players.map((p) => {
          const hasChar = (p.characters || []).some((c) => c.id === charId);
          if (!hasChar) return p;

          const updatedChars = (p.characters || []).map((c) => {
            if (c.id !== charId) return c;

            if (entryIndex === 2) {
              const resetBossIds = [...(c.resetBossIds || [])];
              const idx = resetBossIds.indexOf(bossId);
              if (idx !== -1) {
                resetBossIds[idx] = selectedBossId;
              } else {
                resetBossIds.push(selectedBossId);
              }
              return { ...c, resetBossIds };
            } else {
              const bossIds = [...(c.bossIds || [])];
              const idx = bossIds.indexOf(bossId);
              if (idx !== -1) {
                bossIds[idx] = selectedBossId;
              } else {
                bossIds.push(selectedBossId);
              }
              return { ...c, bossIds };
            }
          });

          return { ...p, characters: updatedChars };
        });

        // 2. 透過 atomic saveTeamAndRecords 一次完成雲端存檔與隊伍重組
        await saveTeamAndRecords(nextTeam, updatedRecords, selectedBossId, {
          oldBossId: bossId,
          charId,
          entryIndex,
          newPlayers: nextPlayers,
          deletedRecordKeys: [`rec_${charId}_${bossId}_${entryIndex}`],
        });
      } else {
        // 一般同難度儲存
        await saveTeamAndRecords(nextTeam, updatedRecords, bossId);
      }

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

  const cleanBossTitle = getBossCleanName(activeBoss.name);
  const isDifficultyChanged = selectedBossId !== bossId;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent maxWidthClass="max-w-5xl">
        <DialogHeader className="pr-10">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <DialogTitle className="flex items-center gap-2">
              <Swords className="w-5 h-5 text-amber-500" />
              <span>組隊與排程設定：{cleanBossTitle}</span>
              {entryIndex === 2 && (
                <span className="px-2 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-black border border-purple-400">
                  每週重置券 (2刷)
                </span>
              )}
            </DialogTitle>

            {/* 💡 難度切換按鈕群：套用與編輯 BOSS 清單完全一致的精緻炫彩圖標 (不顯示重複名稱，且保留右側打 X 間距) */}
            {difficultyOptions.length > 1 && (
              <div className="flex items-center gap-1.5 p-1 bg-black/15 dark:bg-black/40 rounded-2xl border border-kerning-stroke/50 shadow-inner">
                <span className="text-xs font-black text-stone-600 dark:text-slate-300 px-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>難度：</span>
                </span>
                <div className="flex items-center gap-1.5">
                  {difficultyOptions.map((d) => {
                    const isSelected = d.id === selectedBossId;
                    const conf = DIFFICULTY_CONFIG[d.difficulty] || DIFFICULTY_CONFIG.normal;

                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleSwitchDifficulty(d.id)}
                        className={cn(
                          'h-7 w-7 rounded-xl text-xs font-black flex items-center justify-center transition-all cursor-pointer select-none active:scale-95',
                          isSelected ? conf.activeStyle : conf.inactiveStyle
                        )}
                        title={`切換為【${d.name}】`}
                      >
                        {conf.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSave}>
          <DialogBody className="space-y-4 max-h-[76vh]">
            {/* 上方：隊伍人數狀態與難度變更提示膠囊 */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-400/10 border-2 border-amber-400/30 flex-wrap gap-2">
              <div>
                <div className="text-xs font-black text-[#3E2F20] dark:text-slate-100 flex items-center gap-2">
                  <span>當前難度：<strong className="text-amber-700 dark:text-amber-300 font-black">{activeBoss.name}</strong></span>
                  <span className="text-xs font-bold text-stone-500 dark:text-slate-400">
                    (人數上限：{maxPartySize} 人 • 目前已選 {memberTargets.length} 位)
                  </span>
                  {activeBoss.erionVestiges > 0 && (
                    <span className="px-2 py-0.2 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[10.5px] font-black border border-purple-400/60 flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>{activeBoss.erionVestiges} 碎片</span>
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-stone-500 dark:text-slate-400 mt-0.5">
                  {isDifficultyChanged
                    ? `💡 已切換難度！點擊下方「儲存設定」將自動為「${currentChar?.name || ''}」更新 BOSS 清單並儲存新隊伍。`
                    : '點選下方角色或 Guest 加入/移出隊伍，可跨玩家自由編組'}
                </div>
              </div>

              {/* 已選隊員名單微型預覽 */}
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
                            ? 'bg-amber-400 border-amber-600 text-slate-950 ring-2 ring-amber-300'
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
                三欄排版 (3-Column Layout)
                Column 1: ⚡ 快捷加入現成隊伍
                Column 2: 👥 小隊正式角色名冊 (置頂隊長 + 其他玩家手風琴)
                Column 3: 👤 Guest 臨時隊友
                ======================================================== */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-start">
              {/* 第 1 欄：⚡ 快捷加入同伴現成隊伍 */}
              <div className="flex flex-col bg-black/5 dark:bg-black/25 rounded-2xl border-2 border-slate-300 dark:border-slate-700 p-3 space-y-2">
                <div className="font-black text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5 pb-1 border-b border-slate-300/60 dark:border-slate-700">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>快捷加入現成【{activeBoss.name}】隊伍</span>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {existingOtherTeams.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 italic">
                      目前尚無其他同伴建立的【{activeBoss.name}】隊伍
                    </div>
                  ) : (
                    existingOtherTeams.map((team) => {
                      const isFull = team.memberTargets.length >= maxPartySize;
                      return (
                        <div
                          key={team.id}
                          className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 shadow-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-blue-500" />
                              <span>{team.memberTargets.length} / {maxPartySize} 人團</span>
                            </span>

                            <Button
                              type="button"
                              size="sm"
                              variant="gold"
                              disabled={isFull}
                              onClick={() => handleQuickJoin(team)}
                              className="h-6 px-2 text-xs font-black"
                            >
                              {isFull ? '已滿員' : '加入此隊'}
                            </Button>
                          </div>

                          <div className="text-[11px] text-stone-600 dark:text-slate-300 flex items-center gap-1 flex-wrap font-bold">
                            <span>成員：</span>
                            {team.memberTargets.map((m, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200"
                              >
                                {getCharName(m.charId)}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 第 2 欄：👥 小隊正式角色名冊 */}
              <div className="flex flex-col bg-black/5 dark:bg-black/25 rounded-2xl border-2 border-slate-300 dark:border-slate-700 p-3 space-y-2">
                <div className="font-black text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between pb-1 border-b border-slate-300/60 dark:border-slate-700">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-500" />
                    <span>小隊正式角色名冊</span>
                  </div>
                  <span className="text-[10px] text-stone-400 font-normal">依玩家分群</span>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {/* 置頂：當前編輯角色 (固定隊長) */}
                  {currentChar && (
                    <div className="p-2 rounded-xl bg-amber-400/20 border-2 border-amber-500/60 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">👑</span>
                        <span className="font-black text-xs text-slate-900 dark:text-amber-200 truncate max-w-[120px]">
                          {currentChar.name}
                        </span>
                        {entryIndex === 2 && (
                          <span className="px-1.5 py-0.2 rounded bg-purple-200 text-purple-800 text-[10px] font-bold">
                            2刷
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-black text-amber-700 dark:text-amber-300">
                        固定隊長
                      </span>
                    </div>
                  )}

                  {/* 其他玩家手風琴清單 */}
                  {groupedCharOptions.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 italic">
                      尚無其他同伴排定【{activeBoss.name}】
                    </div>
                  ) : (
                    groupedCharOptions.map((g) => {
                      const isExpanded = expandedPlayerNames.has(g.playerName);
                      const selectedInGroupCount = g.options.filter((opt) =>
                        memberTargets.some((m) => m.charId === opt.char.id && m.entryIndex === opt.entry)
                      ).length;

                      return (
                        <div
                          key={g.playerName}
                          className="rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 overflow-hidden shadow-2xs"
                        >
                          <button
                            type="button"
                            onClick={() => togglePlayerAccordion(g.playerName)}
                            className="w-full px-2.5 py-2 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-left"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span>{g.avatarEmoji}</span>
                              <span className="font-black text-xs text-[#3E2F20] dark:text-slate-100 truncate">
                                {g.playerName}
                              </span>
                              <span className="text-[10px] text-stone-400 font-bold">
                                ({g.options.length})
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {selectedInGroupCount > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black">
                                  已選 {selectedInGroupCount}
                                </span>
                              )}
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                              )}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="p-1.5 pt-0 space-y-1 border-t border-slate-200 dark:border-slate-700">
                              {g.options.map((opt) => {
                                const isChecked = memberTargets.some(
                                  (m) => m.charId === opt.char.id && m.entryIndex === opt.entry
                                );
                                return (
                                  <label
                                    key={`${opt.char.id}_${opt.entry}`}
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
                                        checked={isChecked}
                                        onChange={() => handleToggleMember(opt.char.id, opt.entry)}
                                        className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                                      />
                                      <span className="truncate max-w-[110px]">{opt.char.name}</span>
                                      {opt.entry === 2 && (
                                        <span className="px-1 py-0.2 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-[9.5px] font-bold">
                                          2刷
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

              {/* 第 3 欄：👤 Guest 臨時隊友 */}
              <div className="flex flex-col bg-black/5 dark:bg-black/25 rounded-2xl border-2 border-slate-300 dark:border-slate-700 p-3 space-y-2">
                <div className="font-black text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between pb-1 border-b border-slate-300/60 dark:border-slate-700">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-500" />
                    <span>臨時隊友 (Guest)</span>
                  </div>
                  <span className="text-[10px] text-stone-400 font-normal">快速建立/勾選</span>
                </div>

                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {(store.guests || []).length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 italic">
                      目前尚無 Guest 隊友
                    </div>
                  ) : (
                    (store.guests || []).map((guest) => {
                      const isChecked = memberTargets.some((m) => m.charId === guest.id);
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
                              checked={isChecked}
                              onChange={() => handleToggleMember(guest.id, 1)}
                              className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-400 cursor-pointer"
                            />
                            <span className="truncate font-bold">{guest.name}</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => handleDeleteGuest(guest.id)}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                            title="刪除此 Guest"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 快速新增 Guest 輸入框 */}
                <div className="pt-2 border-t border-slate-300/60 dark:border-slate-700 flex items-center gap-1">
                  <Input
                    placeholder="輸入臨時隊友稱呼..."
                    value={quickGuestName}
                    onChange={(e) => setQuickGuestName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddQuickGuest(e);
                      }
                    }}
                    className="h-7 text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="parchment"
                    onClick={handleAddQuickGuest}
                    className="h-7 px-2 text-xs font-black shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>新增</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* 下方：每週出團時間排程 (Raid Schedule) */}
            <div className="p-3 rounded-2xl bg-black/5 dark:bg-black/25 border-2 border-slate-300 dark:border-slate-700 space-y-3">
              <div className="font-black text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>隊伍出團時間排程 (可選)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 固定週期排程 */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasRecurring}
                      onChange={(e) => setHasRecurring(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                      設定【每週固定】出團時間
                    </span>
                  </label>

                  {hasRecurring && (
                    <div className="flex items-center gap-2 pt-1 pl-6 flex-wrap">
                      <select
                        value={recurringDay}
                        onChange={(e) => setRecurringDay(Number(e.target.value))}
                        className="h-7 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-[#FFFDF9] dark:bg-slate-900 px-2 font-bold"
                      >
                        {DAY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1 text-xs font-bold">
                        <select
                          value={recurringHour}
                          onChange={(e) => setRecurringHour(e.target.value)}
                          className="h-7 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-[#FFFDF9] dark:bg-slate-900 px-1 font-fredoka font-black"
                        >
                          {hourOptions.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                        <span>:</span>
                        <select
                          value={recurringMin}
                          onChange={(e) => setRecurringMin(e.target.value)}
                          className="h-7 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-[#FFFDF9] dark:bg-slate-900 px-1 font-fredoka font-black"
                        >
                          {minOptions.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* 本週臨時排程 */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasTemp}
                      onChange={(e) => setHasTemp(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1">
                      <span>設定【本週臨時覆蓋】時間</span>
                      <span className="text-[10px] text-amber-600 font-normal">(週四重置時自動清除)</span>
                    </span>
                  </label>

                  {hasTemp && (
                    <div className="flex items-center gap-2 pt-1 pl-6 flex-wrap">
                      <select
                        value={tempDay}
                        onChange={(e) => setTempDay(Number(e.target.value))}
                        className="h-7 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-[#FFFDF9] dark:bg-slate-900 px-2 font-bold"
                      >
                        {TEMP_DAY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1 text-xs font-bold">
                        <select
                          value={tempHour}
                          onChange={(e) => setTempHour(e.target.value)}
                          className="h-7 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-[#FFFDF9] dark:bg-slate-900 px-1 font-fredoka font-black"
                        >
                          {hourOptions.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                        <span>:</span>
                        <select
                          value={tempMin}
                          onChange={(e) => setTempMin(e.target.value)}
                          className="h-7 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-[#FFFDF9] dark:bg-slate-900 px-1 font-fredoka font-black"
                        >
                          {minOptions.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/40 text-red-600 dark:text-red-300 text-xs font-black flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </DialogBody>

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
            <div className="text-[11px] text-stone-500 dark:text-slate-400 font-bold">
              {isDifficultyChanged && (
                <span className="text-amber-700 dark:text-amber-300 font-black">
                  ⚠️ 儲存時將自動更新角色 BOSS 清單為【{activeBoss.name}】
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="parchment" size="sm" onClick={onClose}>
                取消
              </Button>
              <Button
                type="submit"
                variant="gold"
                size="sm"
                isLoading={isSubmitting}
                className="font-black text-xs"
              >
                儲存設定
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
