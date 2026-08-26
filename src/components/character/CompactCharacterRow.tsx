import { useMemo, useRef, MouseEvent } from 'react';
import { Character } from '@/types/player';
import { Boss, Difficulty } from '@/types/boss';
import { StoreData, Team, WeeklyRecord } from '@/types/party';
import { getBoss, getBossGroupKey, getBossCleanName, BOSSES } from '@/data/bosses';
import { useCalculator } from '@/hooks/useCalculator';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { cn } from '@/utils/cn';
import { Edit2, Ticket, Sparkles, UserX, Users, Clock } from 'lucide-react';

interface CompactCharacterRowProps {
  character: Character;
  playerName: string;
  store: StoreData;
  onToggleStatus: (
    recordKey: string,
    onRequireShardModal?: (recordKey: string, boss: Boss, team: Team | null, pendingComplete?: boolean) => void
  ) => void;
  onOpenPartyModal: (charId: string, bossId: string, entryIndex: number) => void;
  onOpenShardModal: (recordKey: string, boss: Boss, team: Team | null) => void;
  onOpenEditBosses: (character: Character, playerName: string) => void;
  onOpenResetConfig: (character: Character, playerName: string) => void;
  onOpenRenameModal: (character: Character, playerName: string) => void;
  onDeleteCharacter: (charId: string, playerName: string) => void;
  onShowScheduleInfo?: (team: Team) => void;
}

const DIFFICULTY_BADGES: Record<Difficulty, { label: string; tagClass: string; ringClass: string }> = {
  extreme: {
    label: '極',
    tagClass: 'bg-[#380E13] text-[#FF5722] border-[#FF3358] shadow-[0_0_6px_rgba(255,51,88,0.7)]',
    ringClass: 'border-[#FF3358] shadow-[0_0_6px_rgba(255,51,88,0.6)]',
  },
  hard: {
    label: '困',
    tagClass: 'bg-[#2D2117] text-[#FFE3B3] border-[#C5A070] shadow-[0_0_5px_rgba(245,158,11,0.5)]',
    ringClass: 'border-[#C5A070] shadow-[0_0_5px_rgba(245,158,11,0.4)]',
  },
  normal: {
    label: '普',
    tagClass: 'bg-[#1D3D5E] text-white border-white shadow-[0_0_5px_rgba(56,189,248,0.6)]',
    ringClass: 'border-sky-400 shadow-[0_0_5px_rgba(56,189,248,0.4)]',
  },
  easy: {
    label: '簡',
    tagClass: 'bg-[#35393E] text-white border-white shadow-[0_0_4px_rgba(255,255,255,0.5)]',
    ringClass: 'border-white/80 shadow-[0_0_4px_rgba(255,255,255,0.3)]',
  },
};

// 單列 12 格專用的微型 BOSS 格子 (Ultra-compact Boss Cell)
function SingleRowBossPill({
  boss,
  entryIndex,
  charId,
  record,
  team,
  guestList = [],
  onToggleStatus,
  onOpenPartyModal,
  onOpenShardModal,
  onShowScheduleInfo,
}: {
  boss: Boss;
  entryIndex: number;
  charId: string;
  record?: WeeklyRecord;
  team?: Team | null;
  guestList?: Array<{ id: string; name: string }>;
  onToggleStatus: (
    recordKey: string,
    onRequireShardModal?: (recordKey: string, boss: Boss, team: Team | null, pendingComplete?: boolean) => void
  ) => void;
  onOpenPartyModal: (charId: string, bossId: string, entryIndex: number) => void;
  onOpenShardModal?: (recordKey: string, boss: Boss, team: Team | null) => void;
  onShowScheduleInfo?: (team: Team) => void;
}) {
  const { getCharName } = useStore();
  const recordKey = `rec_${charId}_${boss.id}_${entryIndex}`;
  const isCompleted = Boolean(record?.isCompleted);

  // 解析成員
  const rawMembers = team ? team.memberTargets || (team.memberCharIds || []).map((id) => ({ charId: id, entryIndex })) : [];
  const validMembers = rawMembers.filter((m: any) => {
    if (!m.charId.startsWith('guest_')) return true;
    return guestList.some((g) => g.id === m.charId);
  });
  const teamSize = validMembers.length > 0 ? validMembers.length : 1;
  const isMultiParty = teamSize > 1;

  const otherTeammates = validMembers.filter(
    (m: any) => !(m.charId === charId && m.entryIndex === entryIndex)
  );

  const teamText = isMultiParty
    ? (otherTeammates.map((m: any) => getCharName(m.charId)).join('、') || `${teamSize}人`)
    : '單人';

  const scheduleText = (() => {
    if (!team?.schedule) return null;
    const s = team.schedule.tempOverride || team.schedule.recurring;
    if (!s) return null;
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    const timeVal = s.timeStr || (s as any).time || '';
    if (!timeVal) return null;
    return `週${days[s.dayOfWeek]} ${timeVal}`;
  })();

  const cleanZhName = getBossCleanName(boss.name);
  const diffConf = DIFFICULTY_BADGES[boss.difficulty] || DIFFICULTY_BADGES.normal;

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  const handleTouchStart = () => {
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      onOpenPartyModal(charId, boss.id, entryIndex);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleClick = () => {
    if (isLongPress.current) {
      isLongPress.current = false;
      return;
    }
    onToggleStatus(recordKey, onOpenShardModal);
  };

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    onOpenPartyModal(charId, boss.id, entryIndex);
  };

  return (
    <div
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={cn(
        'group relative flex items-center gap-1.5 p-1 sm:p-1.5 rounded-xl border-1.5 transition-all duration-150 select-none cursor-pointer overflow-hidden min-h-[46px] min-w-0',
        isCompleted
          ? 'bg-[#EAE2D2]/50 dark:bg-slate-900/40 border-slate-300/40 dark:border-slate-800/40 opacity-30 grayscale contrast-75 brightness-75 shadow-none hover:opacity-60'
          : 'bg-white dark:bg-slate-800 border-amber-400/80 dark:border-amber-400/80 shadow-[0_2px_6px_rgba(245,158,11,0.15)] dark:shadow-[0_2px_6px_rgba(0,0,0,0.35)] hover:border-amber-400 hover:shadow-[0_3px_10px_rgba(245,158,11,0.25)] active:translate-y-[1px]'
      )}
      title={`${boss.name}${entryIndex === 2 ? '(2刷)' : ''} - 隊伍: ${validMembers.map((m: any) => getCharName(m.charId)).join('、')}${scheduleText ? ` - 出團時間: ${scheduleText}` : ''} (點擊切換擊破狀態，右鍵開組隊)`}
    >
      {/* BOSS 圓形/方形微型頭像 */}
      <div className={cn(
        'w-7 h-7 rounded-lg overflow-hidden bg-slate-900 shrink-0 relative flex items-center justify-center border',
        diffConf.ringClass
      )}>
        <img
          src={boss.image}
          alt={boss.name}
          loading="lazy"
          className={cn(
            'w-full h-full object-cover object-center',
            isCompleted && 'grayscale brightness-60'
          )}
          onError={(e: any) => {
            e.target.style.display = 'none';
          }}
        />
        {entryIndex === 2 && (
          <span className="absolute bottom-0 right-0 px-0.5 bg-purple-700 text-white text-[7px] font-black leading-none rounded-tl">
            2刷
          </span>
        )}
      </div>

      {/* 中間：BOSS 名稱、難度標籤與隊伍簡稱 */}
      <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.2">
        <div className="flex items-center gap-0.5 leading-tight truncate">
          <span className={cn('px-0.5 rounded text-[8px] font-black uppercase tracking-tight shrink-0', diffConf.tagClass)}>
            {diffConf.label}
          </span>
          <span className="font-black text-[11px] text-[#3E2F20] dark:text-slate-100 truncate">
            {cleanZhName}
          </span>
        </div>

        {/* 隊友名稱標籤 (單人 / 隊友名字) */}
        <div className="flex items-center gap-0.5 text-[9px] text-stone-500 dark:text-slate-400 font-bold truncate">
          {isMultiParty ? (
            <span className="text-amber-700 dark:text-amber-300 font-black truncate flex items-center gap-0.5">
              <Users className="w-2 h-2 shrink-0" />
              <span className="truncate">{teamText}</span>
            </span>
          ) : (
            <span className="text-slate-400 text-[8.5px]">單人</span>
          )}
        </div>
      </div>

      {/* 右側小膠囊：出團時間 / 艾里溫碎片 */}
      <div className="flex items-center gap-0.5 shrink-0">
        {boss.erionVestiges > 0 && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              if (isMultiParty && onOpenShardModal) {
                onOpenShardModal(recordKey, boss, team || null);
              }
            }}
            className={cn(
              'px-1 py-0.2 rounded font-black text-[8px] flex items-center gap-0.5 transition-all',
              isMultiParty
                ? (record?.shardShares === null || record?.shardShares === undefined) &&
                  (record?.shardQuantity === null || record?.shardQuantity === undefined)
                  ? 'bg-amber-500/20 border border-amber-400 text-amber-800 dark:text-amber-300 animate-pulse cursor-pointer'
                  : 'bg-[#FFF8E7] dark:bg-slate-800 border border-[#D4B982] dark:border-slate-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100 cursor-pointer shadow-2xs'
                : 'bg-black/5 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-stone-600 dark:text-slate-400 opacity-75 cursor-default'
            )}
            title={
              isMultiParty
                ? (record?.shardShares === null || record?.shardShares === undefined) &&
                  (record?.shardQuantity === null || record?.shardQuantity === undefined)
                  ? '⚠️ 尚未設定艾里溫碎片分配，點擊立即設定'
                  : '點擊設定艾里溫碎片分配'
                : '單人隊伍自動全拿碎片'
            }
          >
            <Sparkles className="w-2 h-2 text-amber-500" />
            <span>
              {!isMultiParty
                ? `${boss.maxPartySize}/${boss.maxPartySize}份`
                : record?.shardMode === 'quantity'
                ? record.shardQuantity !== null && record.shardQuantity !== undefined
                  ? `${record.shardQuantity}顆`
                  : `?/${boss.erionVestiges}顆`
                : record?.shardShares !== null && record?.shardShares !== undefined
                ? `${record.shardShares}/${boss.maxPartySize}份`
                : `?/${boss.maxPartySize}份`}
            </span>
          </span>
        )}

        {scheduleText && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              if (team && onShowScheduleInfo) onShowScheduleInfo(team);
              else onOpenPartyModal(charId, boss.id, entryIndex);
            }}
            className="px-1 py-0.2 rounded bg-purple-500/15 border border-purple-400/40 text-purple-700 dark:text-purple-300 font-mono font-bold text-[8px] hover:bg-purple-500/25 flex items-center gap-0.5 shrink-0"
            title={`出團時間: ${scheduleText}`}
          >
            <Clock className="w-2 h-2" />
          </span>
        )}
      </div>
    </div>
  );
}

export function CompactCharacterRow({
  character,
  playerName,
  store,
  onToggleStatus,
  onOpenPartyModal,
  onOpenShardModal,
  onOpenEditBosses,
  onOpenResetConfig,
  onOpenRenameModal,
  onDeleteCharacter,
  onShowScheduleInfo,
}: CompactCharacterRowProps) {
  const { currentPlayer, canManageChar } = useAuth();
  const { calculateCrystal, calculateShard, getProgress, formatCrystal, formatShardNumber, getRemovedCompletedBosses } = useCalculator(store);

  const isSelf = currentPlayer?.name === playerName;
  const isOwnerOrAdmin = canManageChar(playerName);

  const crystalStats = calculateCrystal(character);
  const shardStats = calculateShard(character);
  const progressStats = getProgress(character);
  const removedCompletedList = getRemovedCompletedBosses(character);

  const orderedBossEntries = useMemo(() => {
    const entries: { boss: Boss; entryIndex: 1 | 2 }[] = [];

    (character.bossIds || []).forEach((bId) => {
      const b = getBoss(bId);
      if (b) entries.push({ boss: b, entryIndex: 1 });
    });

    (character.resetBossIds || []).forEach((bId) => {
      const b = getBoss(bId);
      if (b) entries.push({ boss: b, entryIndex: 2 });
    });

    return entries.sort((a, b) => {
      const groupA = getBossGroupKey(a.boss.id);
      const groupB = getBossGroupKey(b.boss.id);

      const groupIdxA = BOSSES.findIndex((x) => x.id.startsWith(groupA));
      const groupIdxB = BOSSES.findIndex((x) => x.id.startsWith(groupB));

      if (groupIdxA !== groupIdxB) {
        return groupIdxA - groupIdxB;
      }

      const bossIdxA = BOSSES.findIndex((x) => x.id === a.boss.id);
      const bossIdxB = BOSSES.findIndex((x) => x.id === b.boss.id);
      if (bossIdxA !== bossIdxB) {
        return bossIdxA - bossIdxB;
      }

      return a.entryIndex - b.entryIndex;
    });
  }, [character.bossIds, character.resetBossIds]);

  const hasBosses = orderedBossEntries.length > 0;
  const progressPercent = progressStats.total > 0
    ? Math.min(100, Math.round((progressStats.completed / progressStats.total) * 100))
    : 0;

  return (
    <div
      id={`compact-char-row-${character.id}`}
      className={cn(
        'parchment-card rounded-2xl border-2 border-kerning-stroke px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-sm transition-all bg-[#FDF6E9] dark:bg-[#1E293B] space-y-1.5',
        isSelf && 'ring-2 ring-amber-400 dark:ring-amber-500/80 shadow-gold'
      )}
    >
      {/* 角色橫向極窄標題列 (高度僅 ~26px) */}
      <div className="flex items-center justify-between gap-2 flex-wrap select-none">
        {/* 左側：角色小圓頭像 ＋ 名稱 ＋ 操作工具 ＋ 🪙 結晶錢 ＋ ✨ 碎片數量 (V1 經典左側排版) */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="relative group/avatar shrink-0">
            <div className="w-7 h-7 rounded-full bg-slate-900 border-1.5 border-amber-400 overflow-hidden flex items-center justify-center shadow-xs cursor-pointer">
              {character.characterImage ? (
                <img
                  src={character.characterImage}
                  alt={character.name}
                  className="w-full h-full object-cover object-top"
                  onError={(e: any) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-xs">🗡️</span>
              )}
            </div>

            {/* Hover 浮出 180px 高清立繪預覽 */}
            {character.characterImage && (
              <div className="hidden group-hover/avatar:block absolute left-0 top-9 z-50 p-2 bg-white dark:bg-slate-900 border-2 border-amber-400 rounded-2xl shadow-2xl pointer-events-none w-44 h-44 animate-in zoom-in-75 duration-150">
                <img
                  src={character.characterImage}
                  alt={character.name}
                  className="w-full h-full object-contain filter drop-shadow-md"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="font-black text-xs sm:text-sm text-[#3E2F20] dark:text-slate-100 truncate">
              {character.name}
            </h4>
            {isSelf && (
              <span className="px-1 py-0.1 rounded bg-yellow-400 text-slate-900 font-bold text-[8.5px] border border-amber-600 shadow-xs">
                我的角色
              </span>
            )}
          </div>

          {isOwnerOrAdmin && (
            <div className="flex items-center gap-0.5 ml-0.5">
              <button
                type="button"
                onClick={() => onOpenEditBosses(character, playerName)}
                className="w-5 h-5 rounded hover:bg-black/10 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
                title="編輯 BOSS 清單"
              >
                <Edit2 className="w-2.5 h-2.5" />
              </button>
              <button
                type="button"
                onClick={() => onOpenResetConfig(character, playerName)}
                className="w-5 h-5 rounded hover:bg-black/10 flex items-center justify-center text-purple-600 hover:text-purple-800 transition-colors"
                title="設定每週重置券"
              >
                <Ticket className="w-2.5 h-2.5" />
              </button>
              <button
                type="button"
                onClick={() => onOpenRenameModal(character, playerName)}
                className="w-5 h-5 rounded hover:bg-black/10 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
                title="重新命名角色"
              >
                <span className="text-[10px]">🏷️</span>
              </button>
              <button
                type="button"
                onClick={() => onDeleteCharacter(character.id, playerName)}
                className="w-5 h-5 rounded hover:bg-red-500/10 flex items-center justify-center text-red-500 hover:text-red-700 transition-colors"
                title="刪除角色"
              >
                <UserX className="w-2.5 h-2.5" />
              </button>
            </div>
          )}

          {/* 🪙 結晶楓幣膠囊 (V1 經典放置在左側) */}
          <div className="flex items-center gap-1 px-2 py-0.2 bg-[#FFF8E7] dark:bg-slate-800 rounded border border-[#D4B982] dark:border-slate-700 text-[10.5px] ml-1">
            <span>🪙</span>
            <span className="font-fredoka font-black text-[#5C3E14] dark:text-amber-300">
              {formatCrystal(crystalStats.earned)} / {formatCrystal(crystalStats.expected)}
            </span>
          </div>

          {/* ✨ 艾里溫碎片膠囊 (V1 經典放置在左側) */}
          {shardStats.expected > 0 && (
            <div className="flex items-center gap-0.5 px-1.5 py-0.2 bg-[#F7EFFF] dark:bg-purple-950/40 rounded border border-purple-300 dark:border-purple-800 text-[10.5px]">
              <Sparkles className="w-2 h-2 text-purple-600 dark:text-purple-400" />
              <span className="font-fredoka font-black text-purple-900 dark:text-purple-200">
                {formatShardNumber(shardStats.earned)} / {formatShardNumber(shardStats.expected)} 碎片
              </span>
            </div>
          )}
        </div>

        {/* 右側：綠色擊破進度徽章 */}
        <div className="flex items-center gap-1 px-2 py-0.2 bg-[#EEF8EE] dark:bg-emerald-950/40 rounded border border-emerald-400/60 dark:border-emerald-800 font-black text-emerald-800 dark:text-emerald-300 text-[10.5px]">
          <span>🍃</span>
          <span className="font-fredoka text-[11px]">{progressStats.completed} / {progressStats.total}</span>
          <div className="w-10 h-1.5 bg-black/10 dark:bg-black/40 rounded-full overflow-hidden ml-0.5">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 已完成但移出清單的提示條 (V1 經典功能) */}
      {removedCompletedList.length > 0 && (
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/15 dark:bg-amber-950/40 border border-amber-500/40 rounded-xl text-xs font-bold text-amber-900 dark:text-amber-300"
          title="這些 BOSS 已經從清單移除，本週完成紀錄仍會計入次數，但不可再切換攻略狀態"
        >
          <span className="text-sm">🗑️</span>
          <span>已完成但移出清單：</span>
          <span className="font-black text-amber-950 dark:text-amber-200">
            {removedCompletedList.map((r) => r.bossName).join('、')}
          </span>
          <span className="text-[10px] opacity-75 ml-auto hidden sm:inline">(紀錄保留且計入本週進度)</span>
        </div>
      )}

      {/* 單列 12 格 BOSS 排版 (Single Row: 12 Columns Grid) */}
      {hasBosses ? (
        <div className="overflow-x-auto pb-0.5">
          <div className="grid grid-cols-6 lg:grid-cols-12 gap-1 sm:gap-1.5 min-w-[960px] lg:min-w-0">
            {orderedBossEntries.map(({ boss, entryIndex }) => {
              const recKey = `rec_${character.id}_${boss.id}_${entryIndex}`;
              const rec = store.weeklyRecords[recKey];
              const team = rec?.teamId ? store.teams[rec.teamId] : null;

              return (
                <SingleRowBossPill
                  key={recKey}
                  boss={boss}
                  entryIndex={entryIndex}
                  charId={character.id}
                  record={rec}
                  team={team}
                  guestList={store.guests || []}
                  onToggleStatus={onToggleStatus}
                  onOpenPartyModal={onOpenPartyModal}
                  onOpenShardModal={onOpenShardModal}
                  onShowScheduleInfo={onShowScheduleInfo}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="py-2 text-center text-xs text-slate-400">
          尚未設定 BOSS 清單，
          {isOwnerOrAdmin && (
            <button
              onClick={() => onOpenEditBosses(character, playerName)}
              className="text-amber-600 font-bold underline ml-1"
            >
              點此立即設定
            </button>
          )}
        </div>
      )}
    </div>
  );
}
