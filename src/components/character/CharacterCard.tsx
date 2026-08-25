import { useMemo } from 'react';
import { Character } from '@/types/player';
import { Boss } from '@/types/boss';
import { StoreData, Team } from '@/types/party';
import { getBoss, getBossGroupKey, BOSSES } from '@/data/bosses';
import { useCalculator } from '@/hooks/useCalculator';
import { useAuth } from '@/contexts/AuthContext';
import { BossCell } from './BossCell';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { Edit2, Ticket, Sparkles, UserX } from 'lucide-react';

interface CharacterCardProps {
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

export function CharacterCard({
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
}: CharacterCardProps) {
  const { currentPlayer, canManageChar } = useAuth();
  const { calculateCrystal, calculateShard, getProgress, formatCrystal, formatShardNumber } = useCalculator(store);

  const isSelf = currentPlayer?.name === playerName;
  const isOwnerOrAdmin = canManageChar(playerName);

  const crystalStats = calculateCrystal(character);
  const shardStats = calculateShard(character);
  const progressStats = getProgress(character);

  // 100% 固定原本 BOSS 順序（永不跳動重排，保留完美空間記憶與消除畫面撕裂感）
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
      id={`char-card-${character.id}`}
      className={cn(
        'parchment-card rounded-3xl border-3.5 border-kerning-stroke p-4 sm:p-5 shadow-xl transition-all duration-150 bg-[#FDF6E9] dark:bg-[#1E293B]',
        isSelf && 'ring-3 ring-amber-400 dark:ring-amber-500/80 shadow-gold'
      )}
    >
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 items-stretch">
        {/* ========================================================
            左側：角色資訊與大立繪卡片 (Left Column: Profile & Stats)
            ======================================================== */}
        <div className="w-full lg:w-[270px] xl:w-[290px] shrink-0 flex flex-col justify-between p-4 bg-[#F6ECD5] dark:bg-slate-900/80 rounded-2xl border-2.5 border-kerning-stroke shadow-sm space-y-3.5">
          {/* 頂部：角色名稱、身分標籤與操作工具列 */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-black text-base sm:text-lg text-[#3E2F20] dark:text-slate-100 truncate leading-tight">
                  {character.name}
                </h3>
                {isSelf && (
                  <span className="px-1.5 py-0.2 rounded-md bg-yellow-400 text-slate-900 font-bold text-[10px] border border-amber-600 shadow-sm shrink-0">
                    我的角色
                  </span>
                )}
              </div>
              <div className="text-xs text-stone-500 dark:text-slate-400 font-bold mt-0.5">
                冒險者：{playerName}
              </div>
            </div>

            {isOwnerOrAdmin && (
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="parchment"
                  onClick={() => onOpenEditBosses(character, playerName)}
                  className="w-7 h-7"
                  title="編輯 BOSS 清單"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>

                <Button
                  size="icon"
                  variant="parchment"
                  onClick={() => onOpenResetConfig(character, playerName)}
                  className="w-7 h-7"
                  title="設定每週重置券"
                >
                  <Ticket className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                </Button>

                <Button
                  size="icon"
                  variant="parchment"
                  onClick={() => onOpenRenameModal(character, playerName)}
                  className="w-7 h-7"
                  title="重新命名角色"
                >
                  <span className="text-xs">🏷️</span>
                </Button>

                <Button
                  size="icon"
                  variant="danger"
                  onClick={() => onDeleteCharacter(character.id, playerName)}
                  className="w-7 h-7"
                  title="刪除角色"
                >
                  <UserX className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* 中間：官方高清大立繪展示相框 */}
          <div className="w-full h-36 sm:h-40 rounded-2xl bg-gradient-to-b from-[#FFFDF9] to-[#EAE0CA] dark:from-slate-800 dark:to-slate-900/90 border-2 border-[#D4B982] dark:border-slate-700 shadow-inner flex items-center justify-center p-2 overflow-hidden relative group select-none">
            {character.characterImage ? (
              <img
                src={character.characterImage}
                alt={character.name}
                className="max-h-full max-w-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.25)] hover:scale-105 transition-transform duration-200"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="text-center space-y-1">
                <span className="text-5xl drop-shadow">🗡️</span>
                <div className="text-[11px] font-bold text-stone-500 dark:text-slate-400">
                  尚無立繪
                </div>
              </div>
            )}
          </div>

          {/* 下方 3 個立體收益與進度膠囊 (Capsules) */}
          <div className="space-y-2 pt-1">
            {/* 1. 金幣收益膠囊 */}
            <div className="flex items-center gap-2.5 px-3 py-2 bg-[#FFF8E7] dark:bg-slate-800 rounded-xl border-2 border-[#D4B982] dark:border-slate-700 shadow-sm">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500 border-1.5 border-amber-700 flex items-center justify-center text-sm shadow-xs shrink-0 font-bold">
                🪙
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black text-stone-500 dark:text-slate-400 leading-none mb-0.5">
                  結晶楓幣 (已收 / 預估)
                </div>
                <div className="font-fredoka font-black text-sm text-[#5C3E14] dark:text-amber-300 truncate">
                  {formatCrystal(crystalStats.earned)} / {formatCrystal(crystalStats.expected)}
                </div>
              </div>
            </div>

            {/* 2. 艾里溫碎片膠囊 */}
            <div className="flex items-center gap-2.5 px-3 py-2 bg-[#F7EFFF] dark:bg-purple-950/40 rounded-xl border-2 border-purple-300 dark:border-purple-800 shadow-sm">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 via-purple-500 to-indigo-600 border-1.5 border-purple-900 flex items-center justify-center text-white shadow-xs shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black text-purple-700 dark:text-purple-300 leading-none mb-0.5">
                  艾里溫碎片
                </div>
                <div className="font-fredoka font-black text-sm text-purple-900 dark:text-purple-200 truncate">
                  {formatShardNumber(shardStats.earned)} / {formatShardNumber(shardStats.expected)} 碎片
                </div>
              </div>
            </div>

            {/* 3. 綠色樹葉擊破進度膠囊 */}
            <div className="flex items-center gap-2.5 px-3 py-2 bg-[#EEF8EE] dark:bg-emerald-950/40 rounded-xl border-2 border-emerald-400/70 dark:border-emerald-800 shadow-sm">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 border-1.5 border-emerald-800 flex items-center justify-center text-sm shadow-xs shrink-0">
                🍃
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-[10px] font-black text-emerald-800 dark:text-emerald-300 mb-1">
                  <span>每週討伐進度</span>
                  <span className="font-fredoka text-xs">{progressStats.completed} / {progressStats.total}</span>
                </div>
                {/* 綠色進度條 */}
                <div className="w-full h-3 bg-black/10 dark:bg-black/40 rounded-full overflow-hidden border border-emerald-600/40 p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full transition-all duration-300 shadow-sm"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            右側：滿版 BOSS 卡片網格 (4 欄 3 列，對齊 12 隻 BOSS)
            ======================================================== */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          {hasBosses ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-3 sm:gap-3.5">
              {orderedBossEntries.map(({ boss, entryIndex }) => {
                const recKey = `rec_${character.id}_${boss.id}_${entryIndex}`;
                const rec = store.weeklyRecords[recKey];
                const team = rec?.teamId ? store.teams[rec.teamId] : null;

                return (
                  <BossCell
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
            <div className="py-12 px-6 text-center bg-black/5 dark:bg-black/20 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center">
              <span className="text-3xl mb-2">⚔️</span>
              <p className="text-sm font-bold text-stone-600 dark:text-slate-300 mb-3">
                尚未設定 {character.name} 的每週 BOSS 討伐清單
              </p>
              {isOwnerOrAdmin && (
                <Button size="md" variant="gold" onClick={() => onOpenEditBosses(character, playerName)}>
                  <Edit2 className="w-4 h-4" />
                  <span>點擊勾選討伐 BOSS (最多 12 隻)</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
