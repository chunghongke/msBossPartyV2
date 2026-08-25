export interface Character {
  id: string;
  name: string;
  ocid?: string;
  characterImage?: string;
  bossIds: string[];
  resetBossIds?: string[];
  playerName?: string;
}

export interface Player {
  name: string;
  avatarEmoji: string;
  passwordHash?: string;
  isAdmin?: boolean;
  characters: Character[];
}
