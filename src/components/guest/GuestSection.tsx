import { useState, FormEvent } from 'react';
import { Guest, StoreData } from '@/types/party';
import { BOSSES, getBossCleanName } from '@/data/bosses';
import { Difficulty } from '@/types/boss';
import { Button } from '@/components/ui/Button';
import { useAlert } from '@/contexts/AlertContext';
import { useStore } from '@/store';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/utils/cn';
import { Users, UserPlus, Trash2, Clock, CheckCircle2 } from 'lucide-react';

interface GuestSectionProps {
  guests: Guest[];
  store: StoreData;
  onAddGuest: (name: string) => Promise<any>;
  onDeleteGuest: (guestId: string) => Promise<any>;
}

interface GuestBossItem {
  recordKey: string;
  bossName: string;
  cleanZhName: string;
  difficulty?: Difficulty;
  bossImage?: string;
  entryIndex: number;
  isCompleted: boolean;
  scheduleText: string | null;
  teammateNames: string;
}

export function GuestSection({ guests = [], store, onAddGuest, onDeleteGuest }: GuestSectionProps) {
  const { showConfirm } = useAlert();
  const { isAdmin } = useAuth();
  const { getCharName, toggleBossStatus } = useStore();
  const [nameInput, setNameInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    const clean = nameInput.trim();
    if (!clean) return;
    setIsAdding(true);
    try {
      await onAddGuest(clean);
      setNameInput('');
    } finally {
      setIsAdding(false);
    }
  };

  // 取得特定臨時隊友的所有參與 BOSS 清單 (比照 V1 邏輯，依據 teamId 去重)
  const getGuestParticipatedBosses = (guestId: string): GuestBossItem[] => {
    const list: GuestBossItem[] = [];
    const seenTeamIds = new Set<string>();
    const weeklyRecords = store.weeklyRecords || {};
    const teams = store.teams || {};

    Object.keys(weeklyRecords).forEach((recordKey) => {
      const rec = weeklyRecords[recordKey];
      if (!rec || !rec.teamId) return;
      if (seenTeamIds.has(rec.teamId)) return;

      const team = teams[rec.teamId];
      if (!team) return;

      const members = team.memberTargets || (team.memberCharIds || []).map((id) => ({ charId: id, entryIndex: rec.entryIndex }));
      if (members.some((m) => m.charId === guestId)) {
        const boss = BOSSES.find((b) => b.id === rec.bossId);
        if (boss) {
          seenTeamIds.add(rec.teamId);

          const teammateNames = members
            .filter((m) => m.charId !== guestId)
            .map((m) => {
              const name = getCharName(m.charId);
              return m.entryIndex === 2 ? `${name}(2刷)` : name;
            })
            .join('、');

          let scheduleText: string | null = null;
          if (team.schedule) {
            const s = team.schedule.tempOverride || team.schedule.recurring;
            if (s && s.timeStr) {
              const days = ['日', '一', '二', '三', '四', '五', '六'];
              scheduleText = `週${days[s.dayOfWeek]} ${s.timeStr}`;
            }
          }

          list.push({
            recordKey,
            bossName: boss.name,
            cleanZhName: getBossCleanName(boss.name),
            difficulty: boss.difficulty,
            bossImage: boss.image,
            entryIndex: rec.entryIndex,
            isCompleted: Boolean(rec.isCompleted),
            scheduleText,
            teammateNames: teammateNames || '單人',
          });
        }
      }
    });

    return list;
  };

  const getDifficultyBadge = (diff?: Difficulty) => {
    switch (diff) {
      case 'extreme':
        return (
          <span className="px-1 py-0.2 rounded bg-[#380E13] text-[#FF5722] font-fredoka font-black text-[8px] uppercase border border-[#FF3358]">
            Extreme
          </span>
        );
      case 'hard':
        return (
          <span className="px-1 py-0.2 rounded bg-[#2D2117] text-[#FFE3B3] font-fredoka font-black text-[8px] uppercase border border-[#C5A070]">
            Hard
          </span>
        );
      case 'normal':
        return (
          <span className="px-1 py-0.2 rounded bg-[#1D3D5E] text-white font-fredoka font-black text-[8px] uppercase border border-white/60">
            Normal
          </span>
        );
      case 'easy':
        return (
          <span className="px-1 py-0.2 rounded bg-[#35393E] text-white font-fredoka font-black text-[8px] uppercase border border-white/40">
            Easy
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div id="guest-section" className="space-y-3">
      {/* 頂部管理工具列 */}
      <div className="parchment-card rounded-2xl border-2.5 border-kerning-stroke p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Users className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="font-black text-sm sm:text-base text-[#3E2F20] dark:text-slate-100 flex items-center gap-1.5">
              <span>👤 臨時隊友名冊 (Guest)</span>
              <span className="text-xs font-bold text-slate-400 font-fredoka">
                (共 {guests.length} 位)
              </span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-slate-400 font-bold">
              非固定常駐成員，可加入各 BOSS 隊伍協助平分結晶收益。
            </p>
          </div>
        </div>

        {isAdmin && (
          <form onSubmit={handleAdd} className="flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="臨時隊友暱稱"
              className="px-3 py-1 text-xs rounded-xl border-1.5 border-[#D4B982] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 shadow-inner w-36 sm:w-44 font-bold"
              maxLength={15}
            />
            <Button type="submit" size="sm" variant="gold" isLoading={isAdding} className="shrink-0 h-7 px-2.5 text-xs font-bold">
              <UserPlus className="w-3.5 h-3.5 mr-1" />
              <span>新增隊友</span>
            </Button>
          </form>
        )}
      </div>

      {/* 臨時隊友列表 (比照 V1 逐一條列式 Character Card 布局) */}
      <div className="space-y-2.5">
        {guests.length > 0 ? (
          guests.map((g) => {
            const participatedBosses = getGuestParticipatedBosses(g.id);
            const participatedCount = participatedBosses.length;

            return (
              <div
                key={g.id}
                className="parchment-card rounded-2xl border-2 border-kerning-stroke p-3 shadow-xs bg-[#FDF8EE] dark:bg-slate-900/90 space-y-2"
              >
                {/* 隊友標題列 */}
                <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[#D4B982]/40 dark:border-slate-700/60">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs sm:text-sm text-[#3E2F20] dark:text-slate-100 flex items-center gap-1.5">
                      <span>👤 {g.name}</span>
                    </span>

                    {isAdmin && (
                      <button
                        type="button"
                        aria-label={`刪除臨時隊友 ${g.name}`}
                        onClick={async () => {
                          const ok = await showConfirm({
                            title: '刪除臨時隊友',
                            message: `確定要刪除臨時隊友「${g.name}」嗎？這將會同步將他從所有參與的隊伍中移除。`,
                            isDanger: true,
                            confirmText: '確定刪除',
                          });
                          if (ok) onDeleteGuest(g.id);
                        }}
                        className="w-5 h-5 rounded text-stone-400 hover:text-red-500 hover:bg-red-500/10 flex items-center justify-center transition-colors cursor-pointer"
                        title="刪除此臨時隊友"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-black text-[10px] border border-indigo-300 dark:border-indigo-700 font-fredoka">
                    已參與 {participatedCount} 隊
                  </span>
                </div>

                {/* 參與的 BOSS 網格 (比照 V1 Compact Grid 佈局) */}
                {participatedCount === 0 ? (
                  <div className="py-3 text-center text-xs text-stone-400 dark:text-slate-500 font-bold">
                    尚未參與任何 BOSS 隊伍（在各角色 BOSS 卡片點擊右鍵或設定組隊即可加入）
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                    {participatedBosses.map((item) => (
                      <div
                        key={item.recordKey}
                        onClick={isAdmin ? () => toggleBossStatus(item.recordKey) : undefined}
                        className={cn(
                          'group flex items-center gap-1.5 p-1.5 rounded-xl border-1.5 transition-all select-none overflow-hidden',
                          isAdmin ? 'cursor-pointer' : 'cursor-default',
                          item.isCompleted
                            ? 'bg-[#EAE2D2]/60 dark:bg-slate-900/60 border-slate-300 dark:border-slate-700 opacity-75 grayscale'
                            : 'bg-white dark:bg-slate-800 border-amber-400/80 dark:border-amber-400/80 shadow-2xs',
                          isAdmin && !item.isCompleted && 'hover:border-amber-500 active:translate-y-[1px]'
                        )}
                        title={
                          isAdmin
                            ? `隊伍成員: ${item.teammateNames} (點擊可切換完成狀態)`
                            : `隊伍成員: ${item.teammateNames} (唯讀)`
                        }
                      >
                        {/* BOSS 微型立繪頭像 */}
                        <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-700 flex items-center justify-center">
                          {item.bossImage ? (
                            <img
                              src={item.bossImage}
                              alt={item.bossName}
                              className={cn('w-full h-full object-cover object-center', item.isCompleted && 'grayscale brightness-75')}
                            />
                          ) : (
                            <span className="text-xs">⚔️</span>
                          )}
                        </div>

                        {/* BOSS 名稱、難度與隊友資訊 */}
                        <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
                          <div className="flex items-center gap-1 leading-tight truncate">
                            {getDifficultyBadge(item.difficulty)}
                            <span className={cn('font-black text-[11px] truncate', item.isCompleted ? 'text-stone-400 dark:text-slate-500 line-through/60' : 'text-[#3E2F20] dark:text-slate-100')}>
                              {item.cleanZhName}
                            </span>
                            {item.entryIndex === 2 && (
                              <span className="px-0.5 bg-purple-700 text-white text-[7px] font-black leading-none rounded">
                                2刷
                              </span>
                            )}
                            {item.isCompleted && (
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0 ml-auto" />
                            )}
                          </div>

                          {/* 隊友名稱 */}
                          <div className="text-[9px] text-stone-500 dark:text-slate-400 font-bold truncate flex items-center gap-0.5">
                            <Users className="w-2 h-2 shrink-0 text-amber-600 dark:text-amber-400" />
                            <span className="truncate">{item.teammateNames}</span>
                          </div>

                          {/* 出團時間 (若有) */}
                          {item.scheduleText && (
                            <div className="text-[8.5px] text-amber-700 dark:text-amber-300 font-bold truncate flex items-center gap-0.5">
                              <Clock className="w-2 h-2 shrink-0" />
                              <span className="truncate">{item.scheduleText}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center text-xs text-stone-500 dark:text-slate-400 font-bold bg-black/5 dark:bg-black/20 rounded-2xl border-2 border-dashed border-[#D4B982]/60 dark:border-slate-700">
            <Users className="w-8 h-8 mx-auto text-stone-400 mb-2 opacity-60" />
            <p>目前名冊中尚未建立臨時隊友</p>
            <p className="text-[11px] text-stone-400 mt-1">可在上方輸入暱稱並點擊「新增隊友」</p>
          </div>
        )}
      </div>
    </div>
  );
}
