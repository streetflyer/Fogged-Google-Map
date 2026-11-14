import {
  Compass,
  ScrollText,
  Trophy,
  Sliders,
  Footprints,
  Eye,
  Navigation,
  Sparkles,
  Crosshair,
  RotateCcw,
  Smartphone,
  Loader2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { ExplorerProfile } from '../types/explorer';
import { formatArea, formatDistance } from '../utils/geo';

interface HudHeaderProps {
  profile: ExplorerProfile;
  isSimulating: boolean;
  onToggleSimulator: () => void;
  onOpenQuests: () => void;
  onOpenStats: () => void;
  onOpenSettings: () => void;
  onOpenQuestCreator: () => void;
  onLocateMe: () => void;
  onResetMap: () => void;
  onOpenMobileGuide: () => void;
  onOpenOfflineTimeline: () => void;
  isLocating: boolean;
  activeQuestsCount: number;
  hasQuotaError: boolean;
  gpsStatus?: 'active' | 'acquiring' | 'denied' | 'unavailable' | 'simulator';
  gpsAccuracy?: number | null;
  enableVirtualControls?: boolean;
  followPlayer?: boolean;
  isOnline?: boolean;
  isOfflineModeActive?: boolean;
}

export function HudHeader({
  profile,
  isSimulating,
  onToggleSimulator,
  onOpenQuests,
  onOpenStats,
  onOpenSettings,
  onOpenQuestCreator,
  onLocateMe,
  onResetMap,
  onOpenMobileGuide,
  onOpenOfflineTimeline,
  isLocating,
  activeQuestsCount,
  hasQuotaError,
  gpsStatus = 'active',
  gpsAccuracy = null,
  enableVirtualControls = false,
  followPlayer = true,
  isOnline = true,
  isOfflineModeActive = false,
}: HudHeaderProps) {
  const xpPercent = Math.min(100, Math.round((profile.xp / profile.xpToNextLevel) * 100));

  const rankTitles = [
    'Novice Wanderer',
    'Neighborhood Scout',
    'Urban Pathfinder',
    'Master Cartographer',
    'Fog Vanquisher',
    'Terra Legend',
  ];
  const rankTitle = rankTitles[Math.min(profile.level - 1, rankTitles.length - 1)];

  return (
    <header className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
      {/* Google Maps Quota Warning Banner (Mandatory Section 8 Case A requirement) */}
      {hasQuotaError && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm pointer-events-auto">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Main Glassmorphic HUD Bar */}
      <div className="p-2 sm:p-3.5 max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2">
        {/* Left: Brand & Explorer Level Bar */}
        <div className="pointer-events-auto flex items-center gap-2.5 sm:gap-3 bg-slate-900/90 backdrop-blur-md border border-slate-700/70 shadow-xl rounded-2xl px-3 sm:px-4 py-2 text-white">
          <div className="relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 shadow-md shadow-amber-500/20 text-slate-950 font-black text-base sm:text-lg font-space shrink-0 border border-amber-300/40">
            <span>{profile.level}</span>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full border-2 border-slate-900 animate-ping" />
          </div>

          <div className="flex flex-col min-w-[130px] sm:min-w-[160px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs uppercase tracking-wider font-semibold text-amber-400 font-cinzel">
                {rankTitle}
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-space">
                {profile.xp} / {profile.xpToNextLevel} XP
              </span>
            </div>
            {/* XP progress bar */}
            <div className="w-full bg-slate-800/80 rounded-full h-2 mt-1 overflow-hidden border border-slate-700/60">
              <div
                className="bg-gradient-to-r from-amber-500 via-amber-400 to-cyan-400 h-full rounded-full transition-all duration-500 ease-out shadow-sm"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Center: Live Real-World Exploration Stats */}
        <div className="pointer-events-auto flex items-center justify-around sm:justify-center gap-2 sm:gap-4 bg-slate-900/90 backdrop-blur-md border border-slate-700/70 shadow-xl rounded-2xl px-3 sm:px-4 py-2 text-white">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                Revealed Area
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-100 font-space">
                {formatArea(profile.totalAreaExploredSqM)}
              </span>
            </div>
          </div>

          <div className="w-px h-6 bg-slate-800" />

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Footprints className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                Distance Walked
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-100 font-space">
                {formatDistance(profile.totalDistanceMeters)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions & Tools */}
        <div className="pointer-events-auto flex items-center justify-end gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/70 shadow-xl rounded-2xl p-1.5">
          {/* Current Location Button */}
          <button
            onClick={onLocateMe}
            disabled={isLocating}
            title="Use Current Location (Center on Me)"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer"
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span className="hidden sm:inline">My Location</span>
          </button>

          {/* Reset Map Button */}
          <button
            onClick={onResetMap}
            title="Reset Explored Map Fog"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden lg:inline">Reset Map</span>
          </button>

          {/* Phone Deploy / QR Guide Button */}
          <button
            onClick={onOpenMobileGuide}
            title="Deploy & Open on Phone"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500/25 to-amber-600/25 hover:from-amber-500/35 hover:to-amber-600/35 text-amber-300 border border-amber-400/40 transition-all cursor-pointer font-space"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Phone App</span>
          </button>

          {/* Offline Mode & Timeline Import Button */}
          <button
            onClick={onOpenOfflineTimeline}
            title="Offline Mode & Google Maps Timeline Import"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer font-space border ${
              isOfflineModeActive || !isOnline
                ? 'bg-amber-500/25 text-amber-300 border-amber-500/40 hover:bg-amber-500/35 animate-pulse'
                : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/25'
            }`}
          >
            {isOfflineModeActive || !isOnline ? (
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Wifi className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span className="hidden sm:inline">
              {isOfflineModeActive || !isOnline ? 'Offline' : 'Timeline'}
            </span>
          </button>

          {/* Live Outdoor GPS Status Pill */}
          {!isSimulating ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs border font-space transition-all">
              {gpsStatus === 'active' ? (
                <div className="flex items-center gap-1.5 text-emerald-300 bg-emerald-500/10 border-emerald-500/30">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  <span className="font-semibold">
                    GPS {gpsAccuracy ? `±${Math.round(gpsAccuracy)}m` : 'Active'}
                  </span>
                </div>
              ) : gpsStatus === 'acquiring' ? (
                <div className="flex items-center gap-1.5 text-cyan-300">
                  <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                  <span className="hidden sm:inline">Acquiring GPS...</span>
                </div>
              ) : (
                <button
                  onClick={onLocateMe}
                  className="flex items-center gap-1 text-amber-300 hover:text-amber-200 cursor-pointer"
                  title="GPS permission needed. Tap to grant permission."
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="underline font-semibold">Enable GPS</span>
                </button>
              )}
            </div>
          ) : (
            /* Simulator Badge (only visible if Virtual Controls activated) */
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-space">
              <Navigation className="w-3.5 h-3.5 rotate-45 text-indigo-400" />
              <span>Virtual Sim</span>
            </div>
          )}

          {/* Simulator vs Real GPS Toggle (Only shown when user enables Virtual Controls in Options) */}
          {enableVirtualControls && (
            <button
              onClick={onToggleSimulator}
              title={
                isSimulating
                  ? 'Switch to Live GPS Location'
                  : 'Switch to Walk Simulator Mode'
              }
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isSimulating
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 border border-indigo-400/40'
                  : 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30'
              }`}
            >
              <Navigation className={`w-3.5 h-3.5 ${isSimulating ? 'rotate-45' : ''}`} />
              <span className="hidden sm:inline">
                {isSimulating ? 'Sim Mode' : 'Live GPS'}
              </span>
            </button>
          )}

          {/* Quest Log Button */}
          <button
            onClick={onOpenQuests}
            className="relative flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer"
          >
            <ScrollText className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Quests</span>
            {activeQuestsCount > 0 && (
              <span className="flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold bg-amber-500 text-slate-950 rounded-full font-space shadow-sm">
                {activeQuestsCount}
              </span>
            )}
          </button>

          {/* Fog Settings Button */}
          <button
            onClick={onOpenSettings}
            title="Fog of War & Map Settings"
            className="p-1.5 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </div>
    </header>
  );
}
