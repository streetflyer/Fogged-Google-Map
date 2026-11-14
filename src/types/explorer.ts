export interface LatLng {
  lat: number;
  lng: number;
}

export interface ExploredPoint {
  id: string;
  lat: number;
  lng: number;
  radius: number; // in meters (default ~65m)
  timestamp: number;
}

export type QuestCategory = 'scout' | 'landmark' | 'fitness' | 'mystery';

export interface Quest {
  id: string;
  title: string;
  description: string;
  category: QuestCategory;
  targetLocation: LatLng;
  targetName?: string;
  radiusMeters: number; // radius within which quest completes (e.g. 45m)
  xpReward: number;
  badgeIcon: string;
  completed: boolean;
  completedAt?: number;
  isAiGenerated?: boolean;
  hint?: string;
  targetDistanceMeters?: number; // for fitness quests
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: number;
  progress: number;
  maxProgress: number;
  rewardXp: number;
}

export interface ExplorerProfile {
  level: number;
  xp: number;
  xpToNextLevel: number;
  totalDistanceMeters: number;
  totalAreaExploredSqM: number;
  questsCompleted: number;
  expeditionsCount: number;
  streakDays: number;
  lastActiveDate: string;
}

export type FogStyle = 'obsidian' | 'midnight' | 'parchment' | 'vapor';

export interface FogSettings {
  style: FogStyle;
  density: number; // 0.6 to 1.0 (default 1.0)
  revealRadiusMeters: number; // default 10m
  showFrontierGlow: boolean;
  showTrail: boolean;
  radarPings: boolean;
  enableVirtualControls: boolean; // default false (D-pad & click-to-move)
}
