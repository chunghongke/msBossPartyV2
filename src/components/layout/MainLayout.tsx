import { useState, useMemo, useEffect, useRef } from 'react';
import { useGroup } from '@/contexts/GroupContext';
import { useStore } from '@/store';
import { useAuth } from '@/contexts/AuthContext';
import { useAlert } from '@/contexts/AlertContext';
import { fetchNexonCharacterInfo, getNexonApiKey } from '@/services/nexon';
import { sortCharactersByLocalOrder, saveLocalCharacterOrder } from '@/utils/localOrder';
import { useWeeklyReset } from '@/hooks/useWeeklyReset';
import { useCalculator } from '@/hooks/useCalculator';
import { Header } from './Header';
import { SetupWizard } from '@/components/group/SetupWizard';
import { PageLoadingScreen } from '@/components/ui/PageLoadingScreen';
import { PlayerNavBar } from '@/components/player/PlayerNavBar';
import { CharacterCard } from '@/components/character/CharacterCard';
import { CompactCharacterRow } from '@/components/character/CompactCharacterRow';
import { GuestSection } from '@/components/guest/GuestSection';
import { Button } from '@/components/ui/Button';
import { Character, Player } from '@/types/player';
import { Boss } from '@/types/boss';
import { UserPlus, PlusCircle, ArrowUp } from 'lucide-react';

interface MainLayoutProps {
  isGlobalLoading?: boolean;
  onOpenLoginModal: () => void;
  onOpenGroupModal: () => void;
  onOpenNotifModal: () => void;
  onOpenNexonKeyModal?: () => void;
  onOpenAddPlayerModal: () => void;
  onOpenAddCharacterModal: (playerName: string) => void;
  onOpenPartyModal: (charId: string, bossId: string, entryIndex: number) => void;
  onOpenShardModal: (recordKey: string, boss: Boss, team: any) => void;
  onOpenEditBosses: (character: Character, playerName: string) => void;
  onOpenResetConfig: (character: Character, playerName: string) => void;
  onOpenRenameModal: (character: Character, playerName: string) => void;
  onDeleteCharacter: (charId: string, playerName: string) => void;
  onShowScheduleInfo: (team: any) => void;
}

export function MainLayout({
  isGlobalLoading: propIsGlobalLoading,
  onOpenLoginModal,
  onOpenGroupModal,
  onOpenNotifModal,
  onOpenNexonKeyModal,
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
  const { players, store, isLoading: isStoreLoading, toggleBossStatus, addGuest, deleteGuest, saveStoreToCloud, savePlayersToCloud } = useStore();
  const { countdown } = useWeeklyReset(store, players, saveStoreToCloud, isStoreLoading);
  const { calculateCrystal, formatCrystal } = useCalculator(store);

  const { showAlert } = useAlert();
  const [isSyncingPlayer, setIsSyncingPlayer] = useState<string | null>(null);

  // 一鍵連線 Nexon 官方伺服器，批次同步該玩家所有角色的最新立繪
  const handleSyncAllCharImages = async (player: Player) => {
    const chars = player.characters || [];
    if (chars.length === 0) return;

    const key = getNexonApiKey();
    if (!key) {
      if (onOpenNexonKeyModal) {
        onOpenNexonKeyModal();
      } else {
        showAlert({ title: '尚未設定金鑰', message: '請先在右上角設定 Nexon API Key 以啟用立繪同步功能！', type: 'info' });
      }
      return;
    }

    setIsSyncingPlayer(player.name);
    let updatedCount = 0;
    const failedNames: string[] = [];

    try {
      const updatedChars = [...chars];

      for (let i = 0; i < updatedChars.length; i++) {
        const char = updatedChars[i];
        try {
          if (i > 0) { await new Promise((r) => setTimeout(r, 600)); }
          const info = await fetchNexonCharacterInfo(char.name, key, char.ocid);
          if (info && info.characterImage) {
            updatedChars[i] = {
              ...char,
              characterImage: info.characterImage,
              ocid: info.ocid || char.ocid,
            };
            updatedCount++;
          } else {
            failedNames.push(char.name);
          }
        } catch {
          failedNames.push(char.name);
        }
      }

      if (updatedCount > 0) {
        const nextPlayers = players.map((p) => {
          if (p.name === player.name) {
            return {
              ...p,
              characters: updatedChars,
            };
          }
          return p;
        });
        await savePlayersToCloud(nextPlayers);

        if (failedNames.length === 0) {
          showAlert({
            title: '立繪同步成功',
            message: `🎉 已成功為「${player.name}」旗下的 ${updatedCount} 隻角色同步官方最新高清立繪！`,
            type: 'success',
          });
        } else {
          showAlert({
            title: '立繪部分同步成功',
            message: `✨ 已為 ${updatedCount} 隻角色更新立繪。\n（${failedNames.join(', ')} 未在 Nexon 官方找到資料或名稱有誤）`,
            type: 'info',
          });
        }
      } else {
        showAlert({
          title: '未找到角色資料',
          message: '未能從 Nexon 官方獲取立繪，請確認角色名稱是否為有效的新楓之谷角色，或檢查 API Key 是否有效。',
          type: 'warning',
        });
      }
    } catch (err: any) {
      showAlert({
        title: '同步失敗',
        message: err?.message || '連線 Nexon 伺服器失敗，請稍後再試。',
        type: 'error',
      });
    } finally {
      setIsSyncingPlayer(null);
    }
  };

  const isGlobalLoading = typeof propIsGlobalLoading === 'boolean' 
    ? propIsGlobalLoading 
    : (isGroupLoading || (Boolean(activeGroup) && isStoreLoading));

  const hasAutoPromptedAuth = useRef(false);

  // 僅在全域資料完全載入完成 (isGlobalLoading === false) 且為未登入訪客時，才在背景彈出登入引導
  useEffect(() => {
    // 若還在雲端資料載入階段或無小隊，絕對不觸發任何彈窗
    if (isGlobalLoading || !activeGroup) {
      return;
    }

    const hasStoredAuth = Boolean(
      localStorage.getItem('boss_party_auth_player_name') ||
      localStorage.getItem('boss_auth_player') ||
      localStorage.getItem('preferred_primary_user')
    );

    // 若瀏覽器已辨識到登入者，直接放行，絕對不主動彈出彈窗
    if (hasStoredAuth || currentPlayer) {
      hasAutoPromptedAuth.current = false;
      return;
    }

    if (!hasAutoPromptedAuth.current) {
      hasAutoPromptedAuth.current = true;
      onOpenLoginModal();
    }
  }, [isGlobalLoading, activeGroup, currentPlayer, onOpenLoginModal]);

  const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null);
  const [orderVersion, setOrderVersion] = useState(0);

  const handleReorderCharacters = (playerName: string, reorderedChars: Character[]) => {
    saveLocalCharacterOrder(playerName, reorderedChars.map((c) => c.id));
    setOrderVersion((v) => v + 1);
  };

  const handleReorderPlayers = (_reorderedPlayers: Player[]) => {
    setOrderVersion((v) => v + 1);
  };
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>(() => {
    try {
      return (localStorage.getItem('boss_party_view_mode') as 'compact' | 'detailed') || 'compact';
    } catch {
      return 'compact';
    }
  });

  const handleSetViewMode = (mode: 'compact' | 'detailed') => {
    setViewMode(mode);
    try {
      localStorage.setItem('boss_party_view_mode', mode);
    } catch {}
  };

  // 當登入者變更 (例如剛登入成功或身分切換) 時，立即將主視覺與導覽列切換為該登入者
  useEffect(() => {
    if (currentPlayer?.name) {
      setSelectedPlayerName(currentPlayer.name);
    }
  }, [currentPlayer?.name]);

  // 決定當前選中的玩家 (預設為登入者或第一位玩家)
  const effectiveSelectedPlayerName = useMemo(() => {
    if (selectedPlayerName === '__guests__') {
      return '__guests__';
    }
    if (selectedPlayerName && players.some((p) => p.name === selectedPlayerName)) {
      return selectedPlayerName;
    }
    if (currentPlayer && players.some((p) => p.name === currentPlayer.name)) {
      return currentPlayer.name;
    }
    return players[0]?.name || null;
  }, [selectedPlayerName, players, currentPlayer]);

  const handleSelectPlayer = (name: string) => {
    setSelectedPlayerName(name);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToCharacter = (charId: string) => {
    const el = document.getElementById('char-card-' + charId);
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

  // 1. 若全域正在載入中 (群組初始化或 Firebase RTDB 同步)，顯示全螢幕楓葉 Loading 動畫
  if (isGlobalLoading) {
    return <PageLoadingScreen groupName={activeGroup?.name} />;
  }

  // 2. 若尚未選擇群組，顯示 Setup Wizard
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
        onOpenNexonKeyModal={onOpenNexonKeyModal}
        countdownText={countdown.text}
      />

      {/* 玩家導覽列 (Sticky top-16 整合版面切換與結晶總計) */}
      {(() => {
        const activePlayer = effectiveSelectedPlayerName
          ? players.find((p) => p.name === effectiveSelectedPlayerName) || players[0]
          : players[0];

        const activeCharacters = activePlayer ? sortCharactersByLocalOrder(activePlayer.name, activePlayer.characters || []) : [];

        const activePlayerCrystalStats = activeCharacters.reduce(
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
          <PlayerNavBar
            key={`navbar-${effectiveSelectedPlayerName}-${orderVersion}`}
            players={players}
            selectedPlayerName={effectiveSelectedPlayerName}
            guestCount={(store.guests || []).length}
            viewMode={viewMode}
            onSetViewMode={handleSetViewMode}
            crystalEarned={activePlayerCrystalStats.earned}
            crystalExpected={activePlayerCrystalStats.expected}
            formatCrystal={formatCrystal}
            onSyncAllCharImages={handleSyncAllCharImages}
            isSyncingPlayer={isSyncingPlayer}
            onSelectPlayer={handleSelectPlayer}
            onOpenAddPlayerModal={onOpenAddPlayerModal}
            onOpenAddCharacterModal={onOpenAddCharacterModal}
            onScrollToCharacter={scrollToCharacter}
            onReorderCharacters={handleReorderCharacters}
            onReorderPlayers={handleReorderPlayers}
          />
        );
      })()}

      {/* 主要內容區 */}
      <main className="flex-1 max-w-[1880px] w-full mx-auto p-2 sm:p-3.5">
        {isStoreLoading ? (
          <div className="py-24 text-center parchment-card max-w-sm mx-auto rounded-3xl border-3 border-kerning-stroke p-8 shadow-2xl space-y-4">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-amber-400 border-t-orange-600 animate-spin" />
              <span className="text-3xl animate-bounce">🍁</span>
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-base text-[#3E2F20] dark:text-slate-100">
                正在連線小隊冒險者資料庫...
              </h3>
              <p className="text-xs text-stone-500 dark:text-slate-400 font-bold">
                即將為您同步每週 BOSS 討伐進度與隊伍排程
              </p>
            </div>
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
        ) : effectiveSelectedPlayerName === '__guests__' ? (
          /* 獨立臨時隊友名冊管理專區 */
          <div className="space-y-4">
            <GuestSection
              guests={store.guests || []}
              store={store}
              onAddGuest={addGuest}
              onDeleteGuest={deleteGuest}
            />
          </div>
        ) : (
          <div className="space-y-8">
            {/* 逐一渲染當前玩家區塊 */}
            {displayPlayers.map((player) => {
              // 依據本地自訂排序 (由上至下) 並響應 orderVersion 狀態更新
              const characters = sortCharactersByLocalOrder(player.name, player.characters || []);

              return (
                <div key={player.name} className="space-y-2">
                  {/* 角色卡片列表 (支援 緊湊條列 / 詳細大圖 切換，已精簡上方重複標題) */}
                  <div className={viewMode === 'compact' ? 'space-y-2.5' : 'space-y-4'}>
                    {characters.length > 0 ? (
                      characters.map((char) =>
                        viewMode === 'compact' ? (
                          <CompactCharacterRow
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
                        ) : (
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
                        )
                      )
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
