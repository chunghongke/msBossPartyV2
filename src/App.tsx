import { GroupProvider } from './contexts/GroupContext';
import { AuthProvider } from './contexts/AuthContext';
import { StoreProvider, useStore } from './contexts/StoreContext';
import { NotifProvider } from './contexts/NotifContext';
import { AlertProvider, useAlert } from './contexts/AlertContext';
import { MainLayout } from './components/layout/MainLayout';
import { useModalState } from './components/modals/ModalRoot';

function AppContent() {
  const { players, store, savePlayersToCloud } = useStore();
  const { controller, modals } = useModalState();
  const { showConfirm } = useAlert();

  const handleDeleteCharacter = async (charId: string) => {
    const ok = await showConfirm({
      title: '刪除角色確認',
      message: '確定要刪除此角色嗎？這將會清除該角色的所有 BOSS 設定與隊伍關係。',
      isDanger: true,
      confirmText: '確定刪除',
    });

    if (ok) {
      const updated = players.map((p) => ({
        ...p,
        characters: (p.characters || []).filter((c) => c.id !== charId),
      }));
      await savePlayersToCloud(updated);
    }
  };

  return (
    <AuthProvider players={players}>
      <NotifProvider store={store}>
        <MainLayout
          onOpenLoginModal={controller.openLoginModal}
          onOpenGroupModal={controller.openGroupModal}
          onOpenNotifModal={controller.openNotifModal}
          onOpenAddPlayerModal={controller.openAddPlayerModal}
          onOpenAddCharacterModal={controller.openAddCharacterModal}
          onOpenPartyModal={controller.openPartyModal}
          onOpenShardModal={controller.openShardModal}
          onOpenEditBosses={(char) => controller.openEditBosses(char, char.playerName || '')}
          onOpenResetConfig={(char) => controller.openResetConfig(char, char.playerName || '')}
          onOpenRenameModal={controller.openRenameModal}
          onDeleteCharacter={handleDeleteCharacter}
          onShowScheduleInfo={controller.openScheduleInfo}
        />
        {modals}
      </NotifProvider>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <AlertProvider>
      <GroupProvider>
        <StoreProvider>
          <AppContent />
        </StoreProvider>
      </GroupProvider>
    </AlertProvider>
  );
}
