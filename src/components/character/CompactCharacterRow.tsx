import { useMemo, useRef, MouseEvent } from 'react';
import { Character } from '@/types/player';
import { Boss, Difficulty } from '@/types/boss';
import { StoreData, Team, WeeklyRecord } from '@/types/party';
import { getBoss, getBossGroupKey, getBossCleanName, BOSSES } from '@/data/bosses';
import { useCalculator } from '@/hooks/useCalculator';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { Edit2, Ticket, Sparkles, UserX, Users, Clock } from 'lucide-react';

interface CompactCharacterRowProps {
  character: Character;
  playerName: string;
  store: StoreData;
  onToggleStatus: (recordKey: string) => void;
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
    tagClass: 'bg-red-600 text-white border-red-400',
    ringClass: 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]',
  },
  hard: {
    label: '困',
    tagClass: 'bg-rose-500 text-white border-rose-300',
    ringClass: 'border-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.4)]',
  },
  normal: {
    label: '普',
    tagClass: 'bg-sky-500 text-white border-sky-300',
    ringClass: 'border-sky-400 shadow-[0_0_6px_rgba(14,165,233,0.4)]',
  },
  easy: {
    label: '簡',
    tagClass: 'bg-emerald-500 text-white border-emerald-300',
    ringClass: 'border-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.4)]',
  },
};

// 緊湊型 BOSS 小格子 (Compact Boss Cell)
function CompactBossPill({
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
  onToggleStatus: (recordKey: string) => void;
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
    ? (otherTeammates.map((m: any) => getCharName(m.charId)).join('、') || `${teamSize}人團`)
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
    onToggleStatus(recordKey);
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
        'group relative flex items-center gap-2 p-1.5 rounded-xl border-2 transition-all duration-150 select-none cursor-pointer overflow-hidden min-h-[54px]',
        isCompleted
          ? 'bg-[#EAE2D2]/60 dark:bg-slate-900/40 border-slate-300/40 dark:border-slate-800/40 opacity-30 grayscale contrast-75 brightness-75 shadow-none hover:opacity-60'
          : 'bg-white dark:bg-slate-800 border-amber-400/80 dark:border-amber-400/80 shadow-[0_2px_8px_rgba(245,158,11,0.18)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.4)] hover:border-amber-400 hover:shadow-[0_4px_12px_rgba(245,158,11,0.3)] active:translate-y-[1px]'
      )}
      title={`${boss.name}${entryIndex === 2 ? '(2刷)' : ''} - 隊伍: ${validMembers.map((m: any) => getCharName(m.charId)).join('、')} (點擊切換擊破狀態，右鍵開組隊)`}
    >
      {/* BOSS 圓形頭像相框 */}
      <div className={cn(
        'w-9 h-9 rounded-lg overflow-hidden bg-slate-900 shrink-0 relative flex items-center justify-center border-1.5',
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
          <span className="absolute bottom-0 right-0 px-0.5 bg-purple-700 text-white text-[8px] font-black leading-none rounded-tl">
            2刷
          </span>
        )}
      </div>

      {/* 中間：BOSS 名稱、難度標籤與隊伍成員 */}
      <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
        <div className="flex items-center gap-1 leading-tight truncate">
          <span className={cn('px-1 py-0.2 rounded text-[9px] font-black uppercase tracking-tight border shrink-0', diffConf.tagClass)}>
            {diffConf.label}
          </span>
          <span className="font-black text-xs text-[#3E2F20] dark:text-slate-100 truncate">
            {cleanZhName}
          </span>
        </div>

        {/* 隊友名稱標籤 */}
        <div className="flex items-center gap-1 text-[10px] text-stone-500 dark:text-slate-400 font-bold truncate">
          {isMultiParty ? (
            <span className="text-amber-700 dark:text-amber-300 font-black truncate flex items-center gap-0.5">
              <Users className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{teamText}</span>
            </span>
          ) : (
            <span className="text-slate-400 text-[9px]">單人</span>
          )}
        </div>
      </div>

      {/* 右側：出團時間 / 艾里溫碎片小徽章 */}
      {(scheduleText || (boss.erionVestiges > 0 && isMultiParty)) && (
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          {scheduleText && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                if (team && onShowScheduleInfo) onShowScheduleInfo(team);
                else onOpenPartyModal(charId, boss.id, entryIndex);
              }}
              className="px-1.5 py-0.2 rounded bg-purple-500/15 border border-purple-400/40 text-purple-700 dark:text-purple-300 font-mono font-bold text-[9px] hover:bg-purple-500/25 flex items-center gap-0.5"
              title="點擊檢視出團時間"
            >
              <Clock className="w-2.5 h-2.5" />
              <span>{scheduleText}</span>
            </span>
          )}

          {boss.erionVestiges > 0 && isMultiParty && onOpenShardModal && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onOpenShardModal(recordKey, boss, team || null);
              }}
              className="px-1 py-0.2 rounded bg-purple-500/10 border border-purple-300/40 text-purple-600 dark:text-purple-300 font-black text-[9px] flex items-center gap-0.5 hover:bg-purple-500/20"
              title="點擊分配艾里溫碎片"
            >
              <Sparkles className="w-2 h-2 text-purple-500" />
              <span>{record?.shardQuantity !== null && record?.shardQuantity !== undefined ? `${record.shardQuantity}個` : `${record?.shardShares || 1}/${boss.maxPartySize}份`}</span>
            </span>
          )}
        </div>
      )}
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
  const { calculateCrystal, calculateShard, getProgress, formatCrystal, formatShardNumber } = useCalculator(store);

  const isSelf = currentPlayer?.name === playerName;
  const isOwnerOrAdmin = canManageChar(playerName);

  const crystalStats = calculateCrystal(character);
  const shardStats = calculateShard(character);
  const progressStats = getProgress(character);

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
        'parchment-card rounded-2xl border-2.5 border-kerning-stroke p-3 shadow-md transition-all bg-[#FDF6E9] dark:bg-[#1E293B] space-y-2.5',
        isSelf && 'ring-2.5 ring-amber-400 dark:ring-amber-500/80 shadow-gold'
      )}
    >
      {/* 角色橫向標題列 (包含小圓頭像、名稱、收益統計膠囊、進度條、編輯工具) */}
      <div className="flex items-center justify-between gap-3 flex-wrap pb-2 border-b-2 border-kerning-stroke/30">
        {/* 左側：角色頭像 (Hover 預覽大立繪) ＋ 角色名 ＋ 操作按鈕 */}
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          <div className="relative group/avatar shrink-0">
            <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-amber-400 overflow-hidden flex items-center justify-center shadow-xs cursor-pointer">
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
                <span className="text-sm">🗡️</span>
              )}
            </div>

            {/* Hover 浮出 180px 高清立繪預覽 */}
            {character.characterImage && (
              <div className="hidden group-hover/avatar:block absolute left-0 top-10 z-50 p-2 bg-white dark:bg-slate-900 border-2 border-amber-400 rounded-2xl shadow-2xl pointer-events-none w-44 h-44 animate-in zoom-in-75 duration-150">
                <img
                  src={character.characterImage}
                  alt={character.name}
                  className="w-full h-full object-contain filter drop-shadow-md"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="font-black text-sm sm:text-base text-[#3E2F20] dark:text-slate-100 truncate">
              {character.name}
            </h4>
            {isSelf && (
              <span className="px-1.5 py-0.2 rounded bg-yellow-400 text-slate-900 font-bold text-[9px] border border-amber-600 shadow-xs">
                我的角色
              </span>
            )}
          </div>

          {isOwnerOrAdmin && (
            <div className="flex items-center gap-0.5 ml-1">
              <button
                type="button"
                onClick={() => onOpenEditBosses(character, playerName)}
                className="w-6 h-6 rounded-md hover:bg-black/10 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
                title="編輯 BOSS 清單"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => onOpenResetConfig(character, playerName)}
                className="w-6 h-6 rounded-md hover:bg-black/10 flex items-center justify-center text-purple-600 hover:text-purple-800 transition-colors"
                title="設定每週重置券"
              >
                <Ticket className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => onOpenRenameModal(character, playerName)}
                className="w-6 h-6 rounded-md hover:bg-black/10 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
                title="重新命名角色"
              >
                <span className="text-[11px]">🏷️</span>
              </button>
              <button
                type="button"
                onClick={() => onDeleteCharacter(character.id, playerName)}
                className="w-6 h-6 rounded-md hover:bg-red-500/10 flex items-center justify-center text-red-500 hover:text-red-700 transition-colors"
                title="刪除角色"
              >
                <UserX className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* 右側：收益與進度條膠囊 */}
        <div className="flex items-center gap-2 flex-wrap text-xs select-none">
          <div className="flex items-center gap-1 px-2.5 py-0.5 bg-[#FFF8E7] dark:bg-slate-800 rounded-lg border border-[#D4B982] dark:border-slate-700 shadow-2xs">
            <span>🪙</span>
            <span className="text-[11px] font-fredoka font-black text-[#5C3E14] dark:text-amber-300">
              {formatCrystal(crystalStats.earned)} / {formatCrystal(crystalStats.expected)}
            </span>
          </div>

          {shardStats.expected > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-[#F7EFFF] dark:bg-purple-950/40 rounded-lg border border-purple-300 dark:border-purple-800 shadow-2xs">
              <Sparkles className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400" />
              <span className="text-[11px] font-fredoka font-black text-purple-900 dark:text-purple-200">
                {formatShardNumber(shardStats.earned)} / {formatShardNumber(shardStats.expected)} 碎片
              </span>
            </div>
          )}

          {/* 綠色進度徽章 */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-[#EEF8EE] dark:bg-emerald-950/40 rounded-lg border border-emerald-400/60 dark:border-emerald-800 text-[11px] font-black text-emerald-800 dark:text-emerald-300">
            <span>🍃</span>
            <span className="font-fredoka text-xs">{progressStats.completed} / {progressStats.total}</span>
            <div className="w-12 h-2 bg-black/10 dark:bg-black/40 rounded-full overflow-hidden ml-1 p-0.2">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 緊湊型 BOSS 網格 (一排可容納 4~6 隻，2排全部排完，整列高度僅 130px) */}
      {hasBosses ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {orderedBossEntries.map(({ boss, entryIndex }) => {
            const recKey = `rec_${character.id}_${boss.id}_${entryIndex}`;
            const rec = store.weeklyRecords[recKey];
            const team = rec?.teamId ? store.teams[rec.teamId] : null;

            return (
              <CompactBossPill
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
      ) : (
        <div className="py-3 text-center text-xs text-slate-400">
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
