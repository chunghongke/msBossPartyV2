import { Player, Character } from '@/types/player';
import { StoreData, Team, WeeklyRecord, Guest } from '@/types/party';
import { GroupConfig } from '@/types/group';
import { StateCreator } from 'zustand';

export interface PlayerSlice {
  players: Player[];
  setPlayers: (players: Player[]) => void;
  savePlayersToCloud: (players: Player[]) => Promise<void>;
  addPlayer: (newPlayer: Player) => Promise<void>;
  updatePlayer: (updatedPlayer: Player) => Promise<void>;
  deletePlayer: (playerName: string) => Promise<void>;
  addCharacter: (playerName: string, newChar: Character) => Promise<void>;
  updateCharacter: (playerName: string, updatedChar: Character) => Promise<void>;
  renameCharacter: (charId: string, newName: string) => Promise<void>;
  deleteCharacter: (playerName: string, charId: string) => Promise<void>;
}

export interface SaveTeamOptions {
  oldBossId?: string;
  charId?: string;
  entryIndex?: number;
  newPlayers?: Player[];
  deletedRecordKeys?: string[];
}

export interface StoreSlice {
  store: StoreData;
  isLoading: boolean;
  activeGroup: GroupConfig | null;
  setActiveGroup: (group: GroupConfig | null) => void;
  setStore: (store: StoreData) => void;
  setIsLoading: (isLoading: boolean) => void;
  saveStoreToCloud: (store: StoreData) => Promise<void>;
  toggleAllCharacterBosses: (character: Character) => Promise<void>;
  toggleBossStatus: (
    recordKey: string,
    onRequireShardModal?: (recordKey: string, boss: any, team: any, pendingComplete?: boolean) => void
  ) => Promise<void>;
  updateWeeklyRecord: (recordKey: string, partialRecord: Partial<WeeklyRecord>) => Promise<void>;
  saveTeamAndRecords: (
    team: Team,
    updatedRecords: Record<string, WeeklyRecord>,
    bossId?: string,
    options?: SaveTeamOptions
  ) => Promise<void>;
  addGuest: (guestName: string) => Promise<Guest>;
  deleteGuest: (guestId: string) => Promise<void>;
}

export interface DerivedSlice {
  getAllCharacters: () => (Character & { playerName: string })[];
  getCharName: (charId: string) => string;
}

export type AppState = PlayerSlice & StoreSlice & DerivedSlice;

export type AppSlice<T> = StateCreator<AppState, [], [], T>;
