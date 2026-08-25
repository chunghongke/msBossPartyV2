import React from 'react';
import { GroupProvider } from './contexts/GroupContext';
import { AuthProvider } from './contexts/AuthContext';
import { StoreProvider, useStore } from './contexts/StoreContext';
import { NotifProvider } from './contexts/NotifContext';
import { AlertProvider } from './contexts/AlertContext';
import { MainLayout } from './components/layout/MainLayout';
import { useModalState } from './components/modals/ModalRoot';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

function AppContent() {
  const { controller, modals } = useModalState();

  return (
    <>
      <MainLayout
        onOpenLoginModal={controller.openLoginModal}
        onOpenGroupModal={controller.openGroupModal}
        onOpenNotifModal={controller.openNotifModal}
        onOpenNexonKeyModal={controller.openNexonKeyModal}
        onOpenAddPlayerModal={controller.openAddPlayerModal}
        onOpenAddCharacterModal={controller.openAddCharacterModal}
        onOpenPartyModal={controller.openPartyModal}
        onOpenShardModal={controller.openShardModal}
        onOpenEditBosses={(char) => controller.openEditBosses(char, char.playerName || '')}
        onOpenResetConfig={(char) => controller.openResetConfig(char, char.playerName || '')}
        onOpenRenameModal={controller.openRenameModal}
        onDeleteCharacter={() => {}}
        onShowScheduleInfo={controller.openScheduleInfo}
      />
      {modals}
    </>
  );
}

function StoreDependentProviders({ children }: { children: React.ReactNode }) {
  const { players, store } = useStore();
  return (
    <AuthProvider players={players}>
      <NotifProvider store={store}>
        {children}
      </NotifProvider>
    </AuthProvider>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <GroupProvider>
        <StoreProvider>
          <StoreDependentProviders>
            <AlertProvider>
              <AppContent />
            </AlertProvider>
          </StoreDependentProviders>
        </StoreProvider>
      </GroupProvider>
    </ErrorBoundary>
  );
}

export default App;
