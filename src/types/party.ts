export interface MemberTarget {
  charId: string;
  entryIndex: number; // 1: 首刷, 2: 重置刷
}

export interface RaidSchedule {
  dayOfWeek: number; // 0=日, 1=一, 2=二, 3=三, 4=四, 5=五, 6=六
  timeStr: string;   // 'HH:mm'
}

export interface TeamSchedule {
  recurring: RaidSchedule | null;
  tempOverride: RaidSchedule | null;
}

export interface Team {
  id: string;
  memberTargets: MemberTarget[];
  memberCharIds?: string[];
  schedule?: TeamSchedule | null;
}

export type ShardMode = 'shares' | 'quantity';

export interface WeeklyRecord {
  charId: string;
  bossId: string;
  entryIndex: number;
  teamId: string;
  isCompleted: boolean;
  shardMode?: ShardMode;
  shardShares?: number | null;
  lastWeekShardShares?: number | null;
  shardQuantity?: number | null;
  lastWeekShardQuantity?: number | null;
}

export interface Guest {
  id: string;
  name: string;
}

export interface StoreData {
  teams: Record<string, Team>;
  weeklyRecords: Record<string, WeeklyRecord>;
  guests: Guest[];
  lastResetWeekKey?: string;
}
