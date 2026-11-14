import {
  ExploredPoint,
  ExplorerProfile,
  FogSettings,
  Quest,
  AchievementBadge,
  LatLng,
} from '../types/explorer';
import { computeDestinationPoint } from './geo';

const KEYS = {
  POINTS: 'terra_explored_points_v1',
  PROFILE: 'terra_explorer_profile_v1',
  QUESTS: 'terra_quests_v1',
  BADGES: 'terra_badges_v1',
  SETTINGS: 'terra_fog_settings_v1',
  LAST_LOCATION: 'terra_last_location_v1',
};

export const DEFAULT_PROFILE: ExplorerProfile = {
  level: 1,
  xp: 0,
  xpToNextLevel: 150,
  totalDistanceMeters: 0,
  totalAreaExploredSqM: 0,
  questsCompleted: 0,
  expeditionsCount: 1,
  streakDays: 1,
  lastActiveDate: new Date().toISOString().split('T')[0],
};

export const DEFAULT_SETTINGS: FogSettings = {
  style: 'obsidian',
  density: 1.0,
  revealRadiusMeters: 10,
  showFrontierGlow: true,
  showTrail: true,
  radarPings: true,
  enableVirtualControls: false,
};

export const DEFAULT_BADGES: AchievementBadge[] = [
  {
    id: 'first_step',
    title: 'First Footsteps',
    description: 'Begin your journey and clear your first patch of fog.',
    icon: 'Footprints',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
    rewardXp: 50,
  },
  {
    id: 'fog_scout',
    title: 'Fog Breaker',
    description: 'Uncover at least 5,000 m² of uncharted neighborhood.',
    icon: 'Compass',
    unlocked: false,
    progress: 0,
    maxProgress: 5000,
    rewardXp: 120,
  },
  {
    id: 'distance_walker',
    title: 'Urban Trekker',
    description: 'Accumulate 1,000 meters of physical outdoor walking.',
    icon: 'MapPin',
    unlocked: false,
    progress: 0,
    maxProgress: 1000,
    rewardXp: 200,
  },
  {
    id: 'quest_master',
    title: 'Quest Initiate',
    description: 'Complete 3 neighborhood exploration quests.',
    icon: 'Award',
    unlocked: false,
    progress: 0,
    maxProgress: 3,
    rewardXp: 250,
  },
  {
    id: 'cartographer',
    title: 'Grand Cartographer',
    description: 'Uncover 20,000 m² of real-world fog of war.',
    icon: 'Globe',
    unlocked: false,
    progress: 0,
    maxProgress: 20000,
    rewardXp: 500,
  },
  {
    id: 'quest_creator',
    title: 'Guild Master',
    description: 'Craft your first custom neighborhood quest for fellow explorers.',
    icon: 'Sparkles',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
    rewardXp: 150,
  },
];

export function generateInitialQuests(center: LatLng): Quest[] {
  // Generate 3 organic exploration quests placed at 200m - 500m around the user's initial location
  const p1 = computeDestinationPoint(center, 220, 35);
  const p2 = computeDestinationPoint(center, 380, 160);
  const p3 = computeDestinationPoint(center, 520, 280);

  return [
    {
      id: 'quest_beacon_north',
      title: 'Whispering Beacon of the North',
      description: 'A faint electromagnetic signal emanates from the shrouded street corner north-east. Clear the fog and investigate.',
      category: 'mystery',
      targetLocation: p1,
      targetName: 'North-East Waypoint',
      radiusMeters: 45,
      xpReward: 120,
      badgeIcon: 'Compass',
      completed: false,
      hint: 'Head roughly northeast following the tactical radar ping.',
    },
    {
      id: 'quest_stride_south',
      title: 'The Southern Perimeter Sweep',
      description: 'The southern grid sector is completely blacked out. Walk toward the rendezvous marker to claim the territory.',
      category: 'scout',
      targetLocation: p2,
      targetName: 'South Sector Overlook',
      radiusMeters: 50,
      xpReward: 150,
      badgeIcon: 'Eye',
      completed: false,
      hint: 'Stroll southward past your current block.',
    },
    {
      id: 'quest_endurance_loop',
      title: 'Western Pioneer Expedition',
      description: 'Venture into the deep fog towards the western horizon. Reach the waypoint to expand the neighborhood perimeter.',
      category: 'fitness',
      targetLocation: p3,
      targetName: 'West Pioneer Post',
      radiusMeters: 55,
      xpReward: 180,
      badgeIcon: 'Zap',
      completed: false,
      hint: 'A healthy 500m walk westward through uncharted territory.',
    },
  ];
}

export function loadExploredPoints(): ExploredPoint[] {
  try {
    const raw = localStorage.getItem(KEYS.POINTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveExploredPoints(points: ExploredPoint[]): void {
  try {
    localStorage.setItem(KEYS.POINTS, JSON.stringify(points));
  } catch (e) {
    console.warn('Storage quota limit reached for explored points', e);
  }
}

export function loadProfile(): ExplorerProfile {
  try {
    const raw = localStorage.getItem(KEYS.PROFILE);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: ExplorerProfile): void {
  try {
    localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save profile', e);
  }
}

export function loadQuests(centerFallback?: LatLng): Quest[] {
  try {
    const raw = localStorage.getItem(KEYS.QUESTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }

  if (centerFallback) {
    const initial = generateInitialQuests(centerFallback);
    saveQuests(initial);
    return initial;
  }
  return [];
}

export function saveQuests(quests: Quest[]): void {
  try {
    localStorage.setItem(KEYS.QUESTS, JSON.stringify(quests));
  } catch (e) {
    console.error('Failed to save quests', e);
  }
}

export function loadBadges(): AchievementBadge[] {
  try {
    const raw = localStorage.getItem(KEYS.BADGES);
    if (raw) {
      const saved = JSON.parse(raw) as AchievementBadge[];
      // Merge with default badges to ensure any newly added badges appear
      return DEFAULT_BADGES.map((b) => {
        const found = saved.find((s) => s.id === b.id);
        return found || b;
      });
    }
  } catch {
    // fallback
  }
  return DEFAULT_BADGES;
}

export function saveBadges(badges: AchievementBadge[]): void {
  try {
    localStorage.setItem(KEYS.BADGES, JSON.stringify(badges));
  } catch (e) {
    console.error('Failed to save badges', e);
  }
}

export function loadSettings(): FogSettings {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      density: parsed.density === 0.85 || parsed.density === undefined ? 1.0 : parsed.density,
      revealRadiusMeters: parsed.revealRadiusMeters === 75 || !parsed.revealRadiusMeters ? 10 : parsed.revealRadiusMeters,
      enableVirtualControls: parsed.enableVirtualControls ?? false,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: FogSettings): void {
  try {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

export function loadLastLocation(): LatLng | null {
  try {
    const raw = localStorage.getItem(KEYS.LAST_LOCATION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLastLocation(loc: LatLng): void {
  try {
    localStorage.setItem(KEYS.LAST_LOCATION, JSON.stringify(loc));
  } catch (e) {
    // ignore
  }
}
