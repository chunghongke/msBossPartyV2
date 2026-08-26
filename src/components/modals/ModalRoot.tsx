import { useState } from 'react';
import { Character } from '@/types/player';
import { Boss } from '@/types/boss';
import { Team } from '@/types/party';
import { GroupModal } from './GroupModal';
import { AuthModal } from './AuthModal';
import { AddPlayerModal } from './AddPlayerModal';
import { AddCharacterModal } from './AddCharacterModal';
import { RenameCharModal } from './RenameCharModal';
import { EditCharBossesModal } from './EditCharBossesModal';
import { ResetConfigModal } from './ResetConfigModal';
import { PartyModal } from './PartyModal';
import { ShardShareModal } from './ShardShareModal';
import { ScheduleInfoModal } from './ScheduleInfoModal';
import { NotificationModal } from './NotificationModal';
import { NexonKeyModal } from './NexonKeyModal';

export interface ModalController {
  openGroupModal: () => void;
  openLoginModal: () => void;
  openNotifModal: () => void;
  openNexonKeyModal: () => void;
  openAddPlayerModal: () => void;
  openAddCharacterModal: (playerName: string) => void;
  openRenameModal: (character: Character) => void;
  openEditBosses: (character: Character, playerName: string) => void;
  openResetConfig: (character: Character, playerName: string) => void;
  openShardModal: (recordKey: string, boss: Boss, team: Team | null, pendingComplete?: boolean) => void;
  openScheduleInfo: (team: Team) => void;
}

export function useModalState() {
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isNexonKeyOpen, setIsNexonKeyOpen] = useState(false);
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);

  const [addCharPlayerName, setAddCharPlayerName] = useState<string | null>(null);
  const [renameChar, setRenameChar] = useState<Character | null>(null);
  const [editBossChar, setEditBossChar] = useState<{ char: Character; playerName: string } | null>(null);
  const [resetConfigChar, setResetConfigChar] = useState<{ char: Character; playerName: string } | null>(null);
  const [partyTarget, setPartyTarget] = useState<{ charId: string; bossId: string; entryIndex: number } | null>(null);
  const [shardTarget, setShardTarget] = useState<{ recordKey: string; boss: Boss; team: Team | null; pendingComplete?: boolean } | null>(null);
  const [scheduleInfoTeam, setScheduleInfoTeam] = useState<Team | null>(null);

  const controller: ModalController = {
    openGroupModal: () => setIsGroupOpen(true),
    openLoginModal: () => setIsAuthOpen(true),
    openNotifModal: () => setIsNotifOpen(true),
    openNexonKeyModal: () => setIsNexonKeyOpen(true),
    openAddPlayerModal: () => setIsAddPlayerOpen(true),
    openAddCharacterModal: (playerName) => setAddCharPlayerName(playerName),
    openRenameModal: (character) => setRenameChar(character),
    openEditBosses: (character, playerName) => setEditBossChar({ char: character, playerName }),
    openResetConfig: (character, playerName) => setResetConfigChar({ char: character, playerName }),
    openPartyModal: (charId, bossId, entryIndex) => setPartyTarget({ charId, bossId, entryIndex }),
    openShardModal: (recordKey, boss, team, pendingComplete) => setShardTarget({ recordKey, boss, team, pendingComplete }),
    openScheduleInfo: (team) => setScheduleInfoTeam(team),
  };

  const modals = (
    <>
      <GroupModal
        isOpen={isGroupOpen}
        onClose={() => setIsGroupOpen(false)}
        onOpenCreateNew={() => setIsGroupOpen(false)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onOpenAddPlayerModal={() => {
          setIsAuthOpen(false);
          setIsAddPlayerOpen(true);
        }}
      />

      <NotificationModal
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
      />

      <NexonKeyModal
        isOpen={isNexonKeyOpen}
        onClose={() => setIsNexonKeyOpen(false)}
      />

      <AddPlayerModal
        isOpen={isAddPlayerOpen}
        onClose={() => setIsAddPlayerOpen(false)}
      />

      <AddCharacterModal
        isOpen={addCharPlayerName !== null}
        onClose={() => setAddCharPlayerName(null)}
        playerName={addCharPlayerName || ''}
        onOpenNexonKeyModal={() => setIsNexonKeyOpen(true)}
      />

      <RenameCharModal
        isOpen={renameChar !== null}
        onClose={() => setRenameChar(null)}
        character={renameChar}
      />

      <EditCharBossesModal
        isOpen={editBossChar !== null}
        onClose={() => setEditBossChar(null)}
        character={editBossChar?.char || null}
        playerName={editBossChar?.playerName || ''}
        onOpenNexonKeyModal={() => setIsNexonKeyOpen(true)}
      />

      <ResetConfigModal
        isOpen={resetConfigChar !== null}
        onClose={() => setResetConfigChar(null)}
        character={resetConfigChar?.char || null}
        playerName={resetConfigChar?.playerName || ''}
      />

      {partyTarget && (
        <PartyModal
          isOpen={partyTarget !== null}
          onClose={() => setPartyTarget(null)}
          charId={partyTarget.charId}
          bossId={partyTarget.bossId}
          entryIndex={partyTarget.entryIndex}
        />
      )}

      {shardTarget && (
        <ShardShareModal
          isOpen={shardTarget !== null}
          onClose={() => setShardTarget(null)}
          recordKey={shardTarget.recordKey}
          boss={shardTarget.boss}
          team={shardTarget.team}
          pendingComplete={shardTarget.pendingComplete}
        />
      )}

      {scheduleInfoTeam && (
        <ScheduleInfoModal
          isOpen={scheduleInfoTeam !== null}
          onClose={() => setScheduleInfoTeam(null)}
          team={scheduleInfoTeam}
        />
      )}
    </>
  );

  return { controller, modals };
}
