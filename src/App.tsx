import { GroupProvider, useGroup } from './contexts/GroupContext';
import { AuthProvider } from './contexts/AuthContext';
import { FirebaseSyncProvider, useAppStore } from './store';
import { NotifProvider } from './contexts/NotifContext';
import { AlertProvider } from './contexts/AlertContext';
import { MainLayout } from './components/layout/MainLayout';
import { useModalState } from './components/modals/ModalRoot';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

function AppContent() {
  const { activeGroup, isLoading: isGroupLoading } = useGroup();
  const isStoreLoading = useAppStore((s) => s.isLoading);
  const { controller, modals } = useModalState();

  const isGlobalLoading = isGroupLoading || (Boolean(activeGroup) && isStoreLoading);

  return (
    <>
      <MainLayout
        isGlobalLoading={isGlobalLoading}
        onOpenLoginModal={controller.openLoginModal}
        onOpenGroupModal={controller.openGroupModal}
        onOpenNotifModal={controller.openNotifModal}
        onOpenNexonKeyModal={controller.openNexonKeyModal}
        onOpenAddPlayerModal={controller.openAddPlayerModal}
        onOpenDeletePlayerModal={controller.openDeletePlayerModal}
        onOpenAddCharacterModal={controller.openAddCharacterModal}
        onOpenPartyModal={controller.openPartyModal}
        onOpenShardModal={controller.openShardModal}
        onOpenEditBosses={(char, pName) => controller.openEditBosses(char, pName || char.playerName || '')}
        onOpenResetConfig={(char, pName) => controller.openResetConfig(char, pName || char.playerName || '')}
        onOpenRenameModal={(char) => controller.openRenameModal(char)}
        onDeleteCharacter={(charId, pName) => controller.openDeleteCharModal(charId, pName)}
        onShowScheduleInfo={controller.openScheduleInfo}
      />
      {!isGlobalLoading && modals}
    </>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <GroupProvider>
        <FirebaseSyncProvider>
          <AuthProvider>
            <NotifProvider>
              <AlertProvider>
                <AppContent />
              </AlertProvider>
            </NotifProvider>
          </AuthProvider>
        </FirebaseSyncProvider>
      </GroupProvider>
    </ErrorBoundary>
  );
}

export default App;
