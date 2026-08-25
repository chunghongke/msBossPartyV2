import { useState, useEffect, FormEvent } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { MemberTarget, Team, RaidSchedule } from '@/types/party';
import { getBoss } from '@/data/bosses';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Users, Clock, Zap, AlertCircle, Plus } from 'lucide-react';

interface PartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  charId: string;
  bossId: string;
  entryIndex: number;
}

export function PartyModal({ isOpen, onClose, charId, bossId, entryIndex }: PartyModalProps) {
  const { store, getAllCharacters, getCharName, addGuest, saveTeamAndRecords } = useStore();

  const boss = getBoss(bossId);
  const recordKey = `rec_${charId}_${bossId}_${entryIndex}`;
  const currentRec = store.weeklyRecords[recordKey];
  const currentTeamId = currentRec?.teamId || `single_${charId}_${bossId}_${entryIndex}`;
  const currentTeam = store.teams[currentTeamId];

  const [memberTargets, setMemberTargets] = useState<MemberTarget[]>([]);
  const [recurringDay, setRecurringDay] = useState<number>(0);
  const [recurringTime, setRecurringTime] = useState<string>('21:00');
  const [hasRecurring, setHasRecurring] = useState<boolean>(false);

  const [tempDay, setTempDay] = useState<number>(0);
  const [tempTime, setTempTime] = useState<string>('21:00');
  const [hasTemp, setHasTemp] = useState<boolean>(false);

  const [quickGuestName, setQuickGuestName] = useState<string>('');
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
        setRecurringTime(currentTeam.schedule.recurring.timeStr);
      } else {
        setHasRecurring(false);
      }

      if (currentTeam?.schedule?.tempOverride) {
        setHasTemp(true);
        setTempDay(currentTeam.schedule.tempOverride.dayOfWeek);
        setTempTime(currentTeam.schedule.tempOverride.timeStr);
      } else {
        setHasTemp(false);
      }

      setErrorMsg('');
    }
  }, [isOpen, charId, bossId, entryIndex, currentTeam, boss]);

  if (!boss) return null;

  const maxPartySize = boss.maxPartySize || 6;
  const allChars = getAllCharacters();

  const existingOtherTeams = Object.values(store.teams || {}).filter((t) => {
    if (t.id === currentTeamId) return false;
    return t.memberTargets.some((m) => {
      const rec = Object.values(store.weeklyRecords).find(
        (r) => r.charId === m.charId && r.teamId === t.id && r.bossId === bossId
      );
      return Boolean(rec);
    });
  });

  const handleToggleMember = (targetCharId: string, targetEntry: number) => {
    const exists = memberTargets.some((m) => m.charId === targetCharId && m.entryIndex === targetEntry);
    if (exists) {
      if (targetCharId === charId && targetEntry === entryIndex && memberTargets.length === 1) {
        return;
      }
      setMemberTargets(memberTargets.filter((m) => !(m.charId === targetCharId && m.entryIndex === targetEntry)));
    } else {
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
    const updated = [...targetTeam.memberTargets, { charId, entryIndex }];
    setMemberTargets(updated);
  };

  const handleAddQuickGuest = async (e: FormEvent) => {
    e.preventDefault();
    const clean = quickGuestName.trim();
    if (!clean) return;
    if (memberTargets.length >= maxPartySize) {
      setErrorMsg(`隊伍已滿 (${maxPartySize} 人)！`);
      return;
    }

    try {
      const g = await addGuest(clean);
      if (g) {
        setMemberTargets([...memberTargets, { charId: g.id, entryIndex: 1 }]);
      }
      setQuickGuestName('');
    } catch (err: any) {
      setErrorMsg(err?.message || '新增臨時隊友失敗！');
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
        ? { dayOfWeek: Number(recurringDay), timeStr: recurringTime }
        : null;

      const tmpSched: RaidSchedule | null = hasTemp
        ? { dayOfWeek: Number(tempDay), timeStr: tempTime }
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

  const daysOfWeek = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent maxWidthClass="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            <Users className="w-5 h-5" />
            <span>組隊與排程設定：{boss.name}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave}>
          <DialogBody className="space-y-4 max-h-[72vh]">
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div>
                <div className="text-xs font-bold text-[#3E2F20] dark:text-slate-100">
                  隊伍人數上限：{maxPartySize} 人
                </div>
                <div className="text-[11px] text-slate-500">
                  目前已選取 {memberTargets.length} 位隊員
                </div>
              </div>
              <div className="flex -space-x-1.5 overflow-hidden">
                {memberTargets.map((m) => (
                  <span
                    key={`${m.charId}_${m.entryIndex}`}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 border-2 border-kerning-stroke text-[10px] font-black text-slate-900 shadow-sm"
                    title={getCharName(m.charId)}
                  >
                    {getCharName(m.charId).slice(0, 1)}
                  </span>
                ))}
              </div>
            </div>

            {existingOtherTeams.length > 0 && (
              <div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>快捷加入同伴已建立的現成隊伍：</span>
                </div>
                <div className="space-y-1.5">
                  {existingOtherTeams.map((team) => (
                    <div
                      key={team.id}
                      className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="truncate">
                        <span className="font-bold">隊員：</span>
                        <span className="text-slate-600 dark:text-slate-300">
                          {team.memberTargets.map((m) => getCharName(m.charId)).join('、')}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">
                          ({team.memberTargets.length}/{maxPartySize}人)
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="gold"
                        onClick={() => handleQuickJoin(team)}
                        className="h-6 px-2 text-[11px] shrink-0"
                      >
                        加入此隊
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                勾選隊員名冊 (包含公會角色與臨時隊友)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-black/5 dark:bg-black/25 rounded-xl border border-slate-300 dark:border-slate-700">
                {allChars.map((char) => {
                  const isChecked = memberTargets.some((m) => m.charId === char.id && m.entryIndex === 1);
                  return (
                    <button
                      key={char.id}
                      type="button"
                      onClick={() => handleToggleMember(char.id, 1)}
                      className={`p-2 rounded-lg text-left text-xs border transition-all flex items-center justify-between ${
                        isChecked
                          ? 'bg-amber-500/20 border-amber-500 font-black text-amber-900 dark:text-amber-300'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="truncate">{char.name}</span>
                      <span className="text-[10px] opacity-60">({char.playerName})</span>
                    </button>
                  );
                })}

                {store.guests.map((g) => {
                  const isChecked = memberTargets.some((m) => m.charId === g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => handleToggleMember(g.id, 1)}
                      className={`p-2 rounded-lg text-left text-xs border transition-all flex items-center justify-between ${
                        isChecked
                          ? 'bg-indigo-500/20 border-indigo-500 font-black text-indigo-900 dark:text-indigo-300'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="truncate">{g.name} (G)</span>
                      <span className="text-[10px] text-indigo-500">臨時</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={quickGuestName}
                onChange={(e) => setQuickGuestName(e.target.value)}
                placeholder="快速新增臨時隊友 (Guest)"
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <Button type="button" size="sm" variant="parchment" onClick={handleAddQuickGuest} className="text-xs shrink-0">
                <Plus className="w-3.5 h-3.5" />
                <span>加入隊伍</span>
              </Button>
            </div>

            <div className="p-3 bg-black/5 dark:bg-black/25 rounded-xl border border-slate-300 dark:border-slate-700 space-y-3">
              <div className="font-black text-xs text-[#3E2F20] dark:text-slate-100 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>出團時間與推播排程</span>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5 font-bold cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={hasRecurring}
                    onChange={(e) => setHasRecurring(e.target.checked)}
                    className="rounded border-slate-400 text-amber-500"
                  />
                  <span>常態每週固定：</span>
                </label>

                {hasRecurring && (
                  <div className="flex items-center gap-2">
                    <select
                      value={recurringDay}
                      onChange={(e) => setRecurringDay(Number(e.target.value))}
                      className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      {daysOfWeek.map((d, idx) => (
                        <option key={d} value={idx}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <input
                      type="time"
                      value={recurringTime}
                      onChange={(e) => setRecurringTime(e.target.value)}
                      className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5 font-bold cursor-pointer shrink-0 text-amber-600 dark:text-amber-400">
                  <input
                    type="checkbox"
                    checked={hasTemp}
                    onChange={(e) => setHasTemp(e.target.checked)}
                    className="rounded border-slate-400 text-amber-500"
                  />
                  <span>本週臨時改期 (週四自動清除)：</span>
                </label>

                {hasTemp && (
                  <div className="flex items-center gap-2">
                    <select
                      value={tempDay}
                      onChange={(e) => setTempDay(Number(e.target.value))}
                      className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      {daysOfWeek.map((d, idx) => (
                        <option key={d} value={idx}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <input
                      type="time"
                      value={tempTime}
                      onChange={(e) => setTempTime(e.target.value)}
                      className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>
                )}
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
            <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
              <span>儲存隊伍與排程</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
