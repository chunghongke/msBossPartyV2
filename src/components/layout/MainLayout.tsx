import { useState, useMemo } from 'react';
import { useGroup } from '@/contexts/GroupContext';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWeeklyReset } from '@/hooks/useWeeklyReset';
import { useCalculator } from '@/hooks/useCalculator';
import { Header } from './Header';
import { SetupWizard } from '@/components/group/SetupWizard';
import { PlayerNavBar } from '@/components/player/PlayerNavBar';
import { CharacterCard } from '@/components/character/CharacterCard';
import { GuestSection } from '@/components/guest/GuestSection';
import { Button } from '@/components/ui/Button';
import { Character, Player } from '@/types/player';
import { Boss } from '@/types/boss';
import { UserPlus, PlusCircle, ArrowUp } from 'lucide-react';

interface MainLayoutProps {
  onOpenLoginModal: () => void;
  onOpenGroupModal: () => void;
  onOpenNotifModal: () => void;
  onOpenAddPlayerModal: () => void;
  onOpenAddCharacterModal: (playerName: string) => void;
  onOpenPartyModal: (charId: string, bossId: string, entryIndex: number) => void;
  onOpenShardModal: (recordKey: string, boss: Boss, team: any) => void;
  onOpenEditBosses: (character: Character) => void;
  onOpenResetConfig: (character: Character) => void;
  onOpenRenameModal: (character: Character) => void;
  onDeleteCharacter: (charId: string) => void;
  onShowScheduleInfo: (team: any) => void;
}

export function MainLayout({
  onOpenLoginModal,
  onOpenGroupModal,
  onOpenNotifModal,
  onOpenAddPlayerModal,
  onOpenAddCharacterModal,
  onOpenPartyModal,
  onOpenShardModal,
  onOpenEditBosses,
  onOpenResetConfig,
  onOpenRenameModal,
  onDeleteCharacter,
  onShowScheduleInfo,
}: MainLayoutProps) {
  const { activeGroup, isLoading: isGroupLoading } = useGroup();
  const { currentPlayer } = useAuth();
  const { players, store, isLoading: isStoreLoading, toggleBossStatus, addGuest, deleteGuest, saveStoreToCloud } = useStore();
  const { countdown } = useWeeklyReset(store, players, saveStoreToCloud, isStoreLoading);
  const { calculateCrystal, formatCrystal } = useCalculator(store);

  const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null);

  // 決定當前選中的玩家 (預設為登入者或第一位玩家)
  const effectiveSelectedPlayerName = useMemo(() => {
    if (selectedPlayerName && players.some((p) => p.name === selectedPlayerName)) {
      return selectedPlayerName;
    }
    if (currentPlayer && players.some((p) => p.name === currentPlayer.name)) {
      return currentPlayer.name;
    }
    return players[0]?.name || null;
  }, [selectedPlayerName, players, currentPlayer]);

  const scrollToGuests = () => {
    const el = document.getElementById('guest-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToCharacter = (charId: string) => {
    const el = document.getElementById(`char-card-${charId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-4', 'ring-amber-400');
      setTimeout(() => {
        el.classList.remove('ring-4', 'ring-amber-400');
      }, 1500);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 若尚未選擇群組，顯示 Setup Wizard
  if (!activeGroup && !isGroupLoading) {
    return <SetupWizard />;
  }

  // 渲染當前選取的玩家
  const displayPlayers: Player[] = effectiveSelectedPlayerName
    ? players.filter((p) => p.name === effectiveSelectedPlayerName)
    : players.slice(0, 1);

  return (
    <div className="min-h-screen bg-[#F5ECD7] dark:bg-[#0D1322] text-[#3E2F20] dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* 頂部 Header (Sticky top-0) */}
      <Header
        onOpenLoginModal={onOpenLoginModal}
        onOpenGroupModal={onOpenGroupModal}
        onOpenNotifModal={onOpenNotifModal}
        countdownText={countdown.text}
      />

      {/* 玩家導覽列 (Sticky top-16，取消全部玩家，登入者排第一，下方圓形頭像) */}
      <PlayerNavBar
        players={players}
        selectedPlayerName={effectiveSelectedPlayerName}
        onSelectPlayer={setSelectedPlayerName}
        onOpenAddPlayerModal={onOpenAddPlayerModal}
        onOpenAddCharacterModal={onOpenAddCharacterModal}
        onScrollToGuests={scrollToGuests}
        onScrollToCharacter={scrollToCharacter}
      />

      {/* 主要內容區 */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 sm:p-6">
        {isStoreLoading ? (
          <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="font-bold text-sm">正在連線讀取備忘錄資料庫...</p>
          </div>
        ) : players.length === 0 ? (
          <div className="py-20 text-center parchment-card max-w-md mx-auto rounded-3xl border-3 border-kerning-stroke p-8 shadow-xl">
            <div className="text-4xl mb-3">🍁</div>
            <h2 className="text-xl font-black text-[#3E2F20] dark:text-slate-100 mb-2">
              小隊目前空空如也
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              點擊下方按鈕新增小隊的第一位玩家冒險者吧！
            </p>
            <Button size="md" variant="primary" onClick={onOpenAddPlayerModal} className="w-full">
              <UserPlus className="w-4 h-4" />
              <span>新增第一位玩家</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 逐一渲染當前玩家區塊 */}
            {displayPlayers.map((player) => {
              const characters = player.characters || [];

              // 計算該玩家名下所有角色的結晶楓幣總和
              const playerCrystalStats = characters.reduce(
                (acc, char) => {
                  const stats = calculateCrystal(char);
                  return {
                    earned: acc.earned + stats.earned,
                    expected: acc.expected + stats.expected,
                  };
                },
                { earned: 0, expected: 0 }
              );

              return (
                <div key={player.name} className="space-y-3">
                  {/* 玩家區塊標題欄 (包含頭像、名稱、總角色數、全部角色結晶總額) */}
                  <div className="flex items-center justify-between gap-3 px-2 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2 text-left select-none">
                        <span className="w-8 h-8 rounded-xl bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center text-base shadow-sm">
                          {player.avatarEmoji || '👤'}
                        </span>
                        <div>
                          <div className="font-black text-lg text-[#3E2F20] dark:text-slate-100 flex items-center gap-1.5">
                            <span>{player.name}</span>
                            <span className="text-xs font-bold text-slate-400">
                              ({characters.length} 角色)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 全部角色的結晶楓幣總和膠囊 */}
                      {characters.length > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-[#FFF8E7] dark:bg-slate-800 rounded-xl border-2 border-[#D4B982] dark:border-slate-700 shadow-sm text-xs select-none">
                          <span className="text-sm">🪙</span>
                          <span className="font-bold text-stone-500 dark:text-slate-400">結晶楓幣總計：</span>
                          <span className="font-fredoka font-black text-amber-700 dark:text-amber-300 text-sm">
                            {formatCrystal(playerCrystalStats.earned)} / {formatCrystal(playerCrystalStats.expected)}
                          </span>
                        </div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="gold"
                      onClick={() => onOpenAddCharacterModal(player.name)}
                      className="h-7 px-2.5 text-xs"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>新增角色</span>
                    </Button>
                  </div>

                  {/* 角色卡片列表 */}
                  <div className="space-y-4">
                    {characters.length > 0 ? (
                      characters.map((char) => (
                        <CharacterCard
                          key={char.id}
                          character={char}
                          playerName={player.name}
                          store={store}
                          onToggleStatus={toggleBossStatus}
                          onOpenPartyModal={onOpenPartyModal}
                          onOpenShardModal={onOpenShardModal}
                          onOpenEditBosses={onOpenEditBosses}
                          onOpenResetConfig={onOpenResetConfig}
                          onOpenRenameModal={onOpenRenameModal}
                          onDeleteCharacter={onDeleteCharacter}
                          onShowScheduleInfo={onShowScheduleInfo}
                        />
                      ))
                    ) : (
                      <div className="py-6 text-center bg-black/5 dark:bg-black/20 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                          {player.name} 尚未建立任何角色
                        </p>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => onOpenAddCharacterModal(player.name)}
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>為 {player.name} 新增角色</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* 臨時隊友管理專區 */}
            <GuestSection
              guests={store.guests || []}
              store={store}
              onAddGuest={addGuest}
              onDeleteGuest={deleteGuest}
            />
          </div>
        )}
      </main>

      {/* 浮動回到頂部按鈕 */}
      <button
        type="button"
        aria-label="回到頂部"
        onClick={scrollToTop}
        className="fixed bottom-6 right-6 w-11 h-11 rounded-2xl bg-gradient-to-b from-amber-400 to-orange-500 text-white border-2.5 border-kerning-stroke shadow-maple-btn flex items-center justify-center hover:brightness-110 active:translate-y-[2px] transition-all z-30"
      >
        <ArrowUp className="w-5 h-5 stroke-[2.5]" />
      </button>
    </div>
  );
}
