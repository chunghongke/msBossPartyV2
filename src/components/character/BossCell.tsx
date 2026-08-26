import { useRef, MouseEvent } from 'react';
import { Boss, Difficulty } from '@/types/boss';
import { getBossCleanName } from '@/data/bosses';
import { WeeklyRecord, Team } from '@/types/party';
import { useStore } from '@/contexts/StoreContext';
import { cn } from '@/utils/cn';
import { Users, Clock, Sparkles, MoreVertical } from 'lucide-react';

interface BossCellProps {
  boss: Boss;
  entryIndex: number;
  charId: string;
  record?: WeeklyRecord;
  team?: Team | null;
  guestList?: Array<{ id: string; name: string }>;
  canManage?: boolean;
  onToggleStatus: (
    recordKey: string,
    onRequireShardModal?: (recordKey: string, boss: Boss, team: Team | null, pendingComplete?: boolean) => void
  ) => void;
  onOpenPartyModal: (charId: string, bossId: string, entryIndex: number) => void;
  onOpenShardModal?: (recordKey: string, boss: Boss, team: Team | null) => void;
  onShowScheduleInfo?: (team: Team) => void;
}

const BOSS_EN_NAMES: Record<string, string> = {
  lotus: 'Lotus',
  damien: 'Damien',
  lucid: 'Lucid',
  will: 'Will',
  guardian_angel_slime: 'Slime',
  verus_hilla: 'Hilla',
  dunkel: 'Dunkel',
  gloom: 'Gloom',
  seren: 'Seren',
  kalos: 'Kalos',
  kaling: 'Kaling',
  first_adversary: 'Adversary',
  radiant_star: 'Radiant',
  limbo: 'Limbo',
  baldrix: 'Baldrix',
  youpiter: 'Youpiter',
  maricia: 'Maricia',
};

export function BossCell({
  boss,
  entryIndex,
  charId,
  record,
  team,
  guestList = [],
  canManage = true,
  onToggleStatus,
  onOpenPartyModal,
  onOpenShardModal,
  onShowScheduleInfo,
}: BossCellProps) {
  const { getCharName } = useStore();
  const recordKey = `rec_${charId}_${boss.id}_${entryIndex}`;
  const isCompleted = Boolean(record?.isCompleted);

  // 解析隊伍成員與有效人數
  const rawMembers = team ? team.memberTargets || (team.memberCharIds || []).map((id) => ({ charId: id, entryIndex })) : [];
  const validMembers = rawMembers.filter((m: any) => {
    if (!m.charId.startsWith('guest_')) return true;
    return guestList.some((g) => g.id === m.charId);
  });
  const teamSize = validMembers.length > 0 ? validMembers.length : (rawMembers.length > 0 ? rawMembers.length : 1);
  const isMultiParty = teamSize > 1;

  // 排除當前角色自己，取得其他隊友名冊 (完整呈現)
  const otherTeammates = validMembers.filter(
    (m: any) => !(m.charId === charId && m.entryIndex === entryIndex)
  );

  const teammatesDisplayText = otherTeammates
    .map((m: any) => {
      const name = getCharName(m.charId);
      return m.entryIndex === 2 ? `${name}(2刷)` : name;
    })
    .join('、');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggered = useRef(false);

  const handleTouchStart = () => {
    if (!canManage) return;
    isLongPressTriggered.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressTriggered.current = true;
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
    if (isLongPressTriggered.current) {
      isLongPressTriggered.current = false;
      return;
    }
    if (!canManage) {
      alert('⚠️ 唯讀模式：您只能修改自己角色的 BOSS 攻略狀態！');
      return;
    }
    onToggleStatus(recordKey, onOpenShardModal);
  };

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    if (!canManage) return;
    onOpenPartyModal(charId, boss.id, entryIndex);
  };

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
  const enName = BOSS_EN_NAMES[boss.groupKey] || cleanZhName;
  const maxPartySize = boss.maxPartySize || 1;
  const totalShards = boss.erionVestiges || 0;
  const isQuantityMode = record?.shardMode === 'quantity';

  // 難度火漆印章樣式
    const getDifficultyBadge = (diff: Difficulty) => {
    switch (diff) {
      case 'extreme':
        return (
          <span className="px-2 py-0.5 rounded-md bg-[#380E13] text-[#FF5722] font-fredoka font-black text-[10px] uppercase tracking-wider border-1.5 border-[#FF3358] shadow-[0_0_8px_rgba(255,51,88,0.8)]">
            Extreme
          </span>
        );
      case 'hard':
        return (
          <span className="px-2 py-0.5 rounded-md bg-[#2D2117] text-[#FFE3B3] font-fredoka font-black text-[10px] uppercase tracking-wider border-1.5 border-[#C5A070] shadow-[0_0_6px_rgba(245,158,11,0.6)]">
            Hard
          </span>
        );
      case 'normal':
        return (
          <span className="px-2 py-0.5 rounded-md bg-[#1D3D5E] text-white font-fredoka font-black text-[10px] uppercase tracking-wider border-1.5 border-white shadow-[0_0_8px_rgba(56,189,248,0.8)]">
            Normal
          </span>
        );
      case 'easy':
        return (
          <span className="px-2 py-0.5 rounded-md bg-[#35393E] text-white font-fredoka font-black text-[10px] uppercase tracking-wider border-1.5 border-white shadow-[0_0_6px_rgba(255,255,255,0.6)]">
            Easy
          </span>
        );
    }
  };

  // 艾里溫碎片標籤文字與是否未設定判斷
  const isShardUnset =
    isMultiParty &&
    (record?.shardShares === null || record?.shardShares === undefined) &&
    (record?.shardQuantity === null || record?.shardQuantity === undefined);

  const shardTagText = (() => {
    if (!boss.erionVestiges) return '';
    if (!isMultiParty) {
      return isQuantityMode ? `${totalShards}顆 (全拿)` : `${maxPartySize}/${maxPartySize}份 (全拿)`;
    }
    if (isQuantityMode) {
      const hasChosen = record?.shardQuantity !== null && record?.shardQuantity !== undefined;
      return hasChosen ? `${record.shardQuantity}顆` : `?/${totalShards}顆`;
    }
    const hasChosen = record?.shardShares !== null && record?.shardShares !== undefined;
    return hasChosen ? `${record.shardShares}/${maxPartySize}份` : `?/${maxPartySize}份`;
  })();

  return (
    <div
      id={`boss-cell-${charId}-${boss.id}-${entryIndex}`}
      
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      className={cn(
        'group relative flex flex-col justify-between rounded-2xl border-2.5 select-none overflow-hidden transition-all duration-200',
        canManage ? 'cursor-pointer' : 'cursor-default',
        isCompleted
          ? 'bg-[#E5DFD5]/50 dark:bg-slate-900/40 border-slate-300/40 dark:border-slate-800/40 opacity-30 grayscale contrast-75 brightness-75 shadow-none hover:opacity-65'
          : canManage
          ? 'bg-[#FFFDF9] dark:bg-slate-800 border-amber-500 dark:border-amber-400 shadow-[0_4px_16px_rgba(245,158,11,0.28)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.6)] ring-1.5 ring-amber-400/40 hover:border-amber-300 hover:shadow-[0_6px_22px_rgba(245,158,11,0.4)] active:translate-y-[1px]'
          : 'bg-[#FFFDF9] dark:bg-slate-800 border-slate-300 dark:border-slate-700 shadow-xs'
      )}
    >
      {/* 上半部：BOSS 圖片滿版區 (Full-cover Image Area) */}
      <div className="relative h-24 sm:h-28 w-full overflow-hidden bg-gradient-to-b from-slate-800 to-slate-950 flex items-center justify-center">
        {/* 背景立繪圖片 */}
        <img
          src={boss.image}
          alt={boss.name}
          loading="lazy"
          className={cn(
            'w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300',
            isCompleted ? 'grayscale contrast-90 brightness-50' : 'brightness-105 contrast-105 saturate-110'
          )}
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />

        {/* 漸層陰影遮罩：確保頂部與底部文字清晰 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/55 pointer-events-none" />

        {/* 頂部左側：BOSS 名稱 (英文/中文) */}
        <div className="absolute top-2 left-2.5 z-10 flex items-baseline gap-1 pointer-events-none">
          <span className="font-fredoka font-black text-sm sm:text-base text-white tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            {enName}
          </span>
          <span className="text-[11px] font-bold text-amber-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
            {cleanZhName}
          </span>
        </div>

        {/* 頂部右側：難度標籤與 2 刷印章 */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 pointer-events-none">
          {entryIndex === 2 && (
            <span className="px-1.5 py-0.5 rounded-md bg-purple-700 text-white font-black text-[10px] border border-purple-400 shadow-sm">
              🎟️ 2刷
            </span>
          )}
          {getDifficultyBadge(boss.difficulty)}
        </div>

        {/* 圖片底部左側：方案 A - 多人團隊友名稱半透明懸浮帶 (Teammates Floating Overlay) */}
        {isMultiParty && teammatesDisplayText && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (canManage) onOpenPartyModal(charId, boss.id, entryIndex);
            }}
            className="absolute bottom-1.5 left-2 z-10 max-w-[85%] px-2 py-0.5 rounded-lg bg-black/80 backdrop-blur-xs border border-amber-400/50 text-white text-[11px] font-bold shadow-md flex items-center gap-1.5 truncate hover:bg-black/95 hover:border-amber-300 transition-all cursor-pointer"
            title={`隊伍成員：${validMembers.map((m: any) => getCharName(m.charId) + (m.entryIndex === 2 ? '(2刷)' : '')).join('、')} (點擊開啟組隊設定)`}
          >
            <Users className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="truncate font-black text-amber-200">{teammatesDisplayText}</span>
          </div>
        )}

        
      </div>

      {/* 下半部：底部資訊列 (Bottom Info Strip) */}
      <div className="px-2.5 py-1.5 bg-[#F6ECD5] dark:bg-slate-900/90 border-t-2 border-kerning-stroke flex items-center justify-between gap-1 text-xs">
        {/* 左側：隊友身分/人數緞帶徽章 + 艾里溫碎片 */}
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (canManage) onOpenPartyModal(charId, boss.id, entryIndex);
            }}
            className={cn(
              'px-2 py-0.5 rounded-md font-black text-[11px] flex items-center gap-1 shadow-xs border transition-all',
              isMultiParty
                ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-slate-900 border-amber-600 hover:brightness-105'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-slate-400'
            )}
            title="點擊設定組隊成員"
          >
            <Users className="w-3 h-3" />
            <span>{isMultiParty ? `${teamSize} 人團` : '單人'}</span>
          </button>

          {boss.erionVestiges > 0 && onOpenShardModal && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isMultiParty) {
                  onOpenShardModal(recordKey, boss, team || null);
                }
              }}
              className={cn(
                'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-black border transition-all',
                isMultiParty
                  ? isShardUnset
                    ? 'bg-amber-500/20 hover:bg-amber-500/35 text-amber-900 dark:text-amber-200 border-amber-500/60 animate-pulse cursor-pointer'
                    : 'bg-[#FFF8E7] dark:bg-slate-800 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border-[#D4B982] dark:border-slate-700 cursor-pointer shadow-2xs'
                  : 'bg-black/5 dark:bg-slate-800 text-stone-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 cursor-default'
              )}
              title={
                isMultiParty
                  ? isShardUnset
                    ? '⚠️ 尚未設定艾里溫碎片分配，點擊立即設定'
                    : '點擊設定隊員艾里溫碎片分配'
                  : '單人隊伍自動全拿碎片'
              }
            >
              <Sparkles className={cn('w-2.5 h-2.5', isShardUnset ? 'text-amber-600' : 'text-amber-500')} />
              <span>{shardTagText}</span>
            </button>
          )}
        </div>

        {/* 右側：出團時間排程膠囊 + 齒輪選單 */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              // 若已有排程資訊則開啟排程詳情，若尚未設定時間則直接開啟組隊視窗進行設定
              if (scheduleText && team?.schedule && onShowScheduleInfo) {
                onShowScheduleInfo(team);
              } else {
                onOpenPartyModal(charId, boss.id, entryIndex);
              }
            }}
            className={cn(
              'px-2 py-0.5 rounded-md font-mono font-bold text-[11px] flex items-center gap-1 border transition-all',
              scheduleText
                ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border-purple-400/50 shadow-xs hover:bg-purple-50 dark:hover:bg-slate-700'
                : 'bg-black/5 dark:bg-slate-800 text-slate-500 hover:text-slate-800 border-transparent hover:border-slate-300 text-[10px]'
            )}
          >
            <Clock className="w-3 h-3 text-purple-500" />
            <span>{scheduleText || '設定時間'}</span>
          </button>

          {canManage && (
            <button
              type="button"
              aria-label="組隊與排程設定"
              onClick={(e) => {
                e.stopPropagation();
                onOpenPartyModal(charId, boss.id, entryIndex);
              }}
              className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-black/10 transition-colors"
              title="開啟隊伍設定"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          )}
            className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-black/10 transition-colors"
            title="開啟隊伍設定"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
