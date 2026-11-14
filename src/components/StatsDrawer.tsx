import React from 'react';
import {
  X,
  Trophy,
  Footprints,
  Eye,
  Award,
  Globe,
  Compass,
  MapPin,
  Sparkles,
  Flame,
  CheckCircle,
} from 'lucide-react';
import { AchievementBadge, ExplorerProfile } from '../types/explorer';
import { formatArea, formatDistance } from '../utils/geo';

interface StatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profile: ExplorerProfile;
  badges: AchievementBadge[];
  onResetFog: () => void;
}

export function StatsDrawer({
  isOpen,
  onClose,
  profile,
  badges,
  onResetFog,
}: StatsDrawerProps) {
  if (!isOpen) return null;

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  const getBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case 'Footprints':
        return Footprints;
      case 'Compass':
        return Compass;
      case 'MapPin':
        return MapPin;
      case 'Award':
        return Award;
      case 'Globe':
        return Globe;
      case 'Sparkles':
        return Sparkles;
      default:
        return Trophy;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm pointer-events-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-cinzel">
                Explorer Dossier & Badges
              </h3>
              <p className="text-xs text-slate-400">
                Your cartographic legacy and outdoor milestones
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-4 shrink-0 border-b border-slate-800">
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Level
            </span>
            <span className="text-lg font-black text-amber-400 font-space">
              {profile.level}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {profile.xp} XP total
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Distance
            </span>
            <span className="text-base font-bold text-emerald-400 font-space">
              {formatDistance(profile.totalDistanceMeters)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Physical Walk
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Area Cleared
            </span>
            <span className="text-base font-bold text-cyan-400 font-space">
              {formatArea(profile.totalAreaExploredSqM)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Fog Lifted
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Quests Done
            </span>
            <span className="text-base font-bold text-amber-300 font-space">
              {profile.questsCompleted}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Victories
            </span>
          </div>
        </div>

        {/* Badges Section */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-cinzel">
              Guild Medals & Badges ({unlockedCount}/{badges.length})
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {badges.map((badge) => {
              const Icon = getBadgeIcon(badge.icon);
              const progressPercent = Math.min(
                100,
                Math.round((badge.progress / badge.maxProgress) * 100)
              );

              return (
                <div
                  key={badge.id}
                  className={`p-3 rounded-2xl border transition-all ${
                    badge.unlocked
                      ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        badge.unlocked
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md'
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-white truncate">
                          {badge.title}
                        </span>
                        {badge.unlocked && (
                          <CheckCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {badge.description}
                      </p>

                      {!badge.unlocked && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-amber-400 h-full rounded-full"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 font-space">
                            {progressPercent}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer actions: Reset Fog option */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <button
            onClick={() => {
              if (
                window.confirm(
                  'Are you sure you want to reset your explored fog of war? This will resproud the fog around your area.'
                )
              ) {
                onResetFog();
                onClose();
              }
            }}
            className="text-rose-400 hover:text-rose-300 underline cursor-pointer"
          >
            Reset Explored Fog
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
