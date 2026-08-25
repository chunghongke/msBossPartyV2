export type Difficulty = 'easy' | 'normal' | 'hard' | 'extreme';

export interface Boss {
  id: string;
  name: string;
  groupKey: string;
  maxPartySize: number;
  difficulty: Difficulty;
  allowReset: boolean;
  crystalValue: number;
  erionVestiges: number;
  image: string;
}

export interface BossGroup {
  groupKey: string;
  displayName: string;
  bosses: Boss[];
}
