import React, { useState, useEffect } from 'react';
import {
  Compass,
  Target,
  Footprints,
  ChevronRight,
  Eye,
  EyeOff,
  Radio,
  ScrollText,
  Minimize2,
  Maximize2,
  X,
} from 'lucide-react';
import { LatLng, Quest } from '../types/explorer';
import { calculateBearing, calculateDistanceMeters, formatDistance } from '../utils/geo';

interface RadarCompassProps {
  currentLocation: LatLng | null;
  activeQuests: Quest[];
  selectedQuestId: string | null;
  onSelectQuest: (questId: string) => void;
  onOpenQuests: () => void;
}

const STORAGE_KEYS = {
  SHOW_RADAR: 'terra_ui_show_radar',
  SHOW_QUEST: 'terra_ui_show_quest_info',
};

export function RadarCompass({
  currentLocation,
  activeQuests,
  selectedQuestId,
  onSelectQuest,
  onOpenQuests,
}: RadarCompassProps) {
  const [showRadar, setShowRadar] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SHOW_RADAR);
    return saved !== null ? saved === 'true' : true;
  });

  const [showQuestInfo, setShowQuestInfo] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SHOW_QUEST);
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHOW_RADAR, String(showRadar));
  }, [showRadar]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHOW_QUEST, String(showQuestInfo));
  }, [showQuestInfo]);

  if (!currentLocation || activeQuests.length === 0) return null;

  // Selected quest or fallback to closest quest
  const questsWithDist = activeQuests.map((q) => {
    const dist = calculateDistanceMeters(currentLocation, q.targetLocation);
    const bearing = calculateBearing(currentLocation, q.targetLocation);
    return { ...q, dist, bearing };
  });

  questsWithDist.sort((a, b) => a.dist - b.dist);

  const currentTracked =
    questsWithDist.find((q) => q.id === selectedQuestId) || questsWithDist[0];

  const isVeryClose = currentTracked.dist <= currentTracked.radiusMeters * 1.5;

  return (
    <div className="absolute bottom-5 left-4 z-20 flex flex-col gap-2 pointer-events-auto">
      {/* Show/Hide Controls Bar */}
      <div className="flex items-center gap-1.5 self-start">
        {/* Toggle Mini Radar Button */}
        <button
          onClick={() => setShowRadar(!showRadar)}
          title={showRadar ? 'Hide Tactical Mini Radar' : 'Show Tactical Mini Radar'}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold border backdrop-blur-md shadow-lg transition-all cursor-pointer font-space ${
            showRadar
              ? 'bg-slate-900/90 text-cyan-300 border-cyan-500/40 hover:bg-slate-800'
              : 'bg-slate-900/70 text-slate-400 border-slate-700/60 hover:text-cyan-300'
          }`}
        >
          <Radio className="w-3.5 h-3.5 text-cyan-400" />
          <span>{showRadar ? 'Radar' : '+ Radar'}</span>
          {showRadar ? (
            <EyeOff className="w-3 h-3 text-slate-400 ml-0.5" />
          ) : (
            <Eye className="w-3 h-3 text-cyan-400 ml-0.5" />
          )}
        </button>

        {/* Toggle Quest Info Button */}
        <button
          onClick={() => setShowQuestInfo(!showQuestInfo)}
          title={showQuestInfo ? 'Hide Quest Info Card' : 'Show Quest Info Card'}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold border backdrop-blur-md shadow-lg transition-all cursor-pointer font-space ${
            showQuestInfo
              ? 'bg-slate-900/90 text-amber-300 border-amber-500/40 hover:bg-slate-800'
              : 'bg-slate-900/70 text-slate-400 border-slate-700/60 hover:text-amber-300'
          }`}
        >
          <ScrollText className="w-3.5 h-3.5 text-amber-400" />
          <span>{showQuestInfo ? 'Quest Info' : '+ Quest Info'}</span>
          {showQuestInfo ? (
            <EyeOff className="w-3 h-3 text-slate-400 ml-0.5" />
          ) : (
            <Eye className="w-3 h-3 text-amber-400 ml-0.5" />
          )}
        </button>
      </div>

      {/* Main Widgets Container (Radar + Quest Card) */}
      <div className="flex items-end gap-3">
        {/* Tactical Radar Disc */}
        {showRadar && (
          <div className="relative group">
            {/* Quick Hide Button on Radar */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowRadar(false);
              }}
              title="Hide Mini Radar"
              className="absolute -top-1.5 -right-1.5 z-30 w-5 h-5 rounded-full bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md"
            >
              <X className="w-3 h-3" />
            </button>

            <div
              onClick={onOpenQuests}
              className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-950/90 backdrop-blur-md border-2 border-cyan-500/50 shadow-2xl flex items-center justify-center cursor-pointer hover:border-cyan-400 transition-all overflow-hidden"
            >
              {/* Radar concentric rings */}
              <div className="absolute inset-2 rounded-full border border-cyan-500/20" />
              <div className="absolute inset-5 rounded-full border border-cyan-500/30" />
              <div className="absolute inset-8 rounded-full border border-cyan-500/40" />

              {/* Crosshairs */}
              <div className="absolute inset-x-0 top-1/2 h-px bg-cyan-500/30" />
              <div className="absolute inset-y-0 left-1/2 w-px bg-cyan-500/30" />

              {/* Radar sweep effect */}
              <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg_at_50%_50%,rgba(6,182,212,0.35)_0deg,transparent_60deg)] animate-radar pointer-events-none" />

              {/* Center player blip */}
              <div className="relative z-10 w-3 h-3 bg-cyan-400 rounded-full border-2 border-slate-900 shadow-md shadow-cyan-400" />

              {/* Target quest blip on radar */}
              {questsWithDist.map((q) => {
                const maxDist = 800;
                const radarRadius = 38; // px
                const normalizedDist = Math.min(1, q.dist / maxDist);
                const r = normalizedDist * radarRadius;
                const rad = ((q.bearing - 90) * Math.PI) / 180;
                const x = r * Math.cos(rad);
                const y = r * Math.sin(rad);

                const isTargeted = q.id === currentTracked.id;

                return (
                  <div
                    key={q.id}
                    style={{
                      transform: `translate(${x}px, ${y}px)`,
                    }}
                    className={`absolute w-3 h-3 rounded-full flex items-center justify-center transition-transform duration-300 ${
                      isTargeted
                        ? 'bg-amber-400 border-2 border-slate-900 shadow-md shadow-amber-400 ring-2 ring-amber-400/50 animate-ping'
                        : 'bg-emerald-400/80 border border-slate-900'
                    }`}
                  />
                );
              })}

              {/* Cardinal North Indicator */}
              <div className="absolute top-1 font-mono text-[9px] font-bold text-cyan-400/80">
                N
              </div>
            </div>
          </div>
        )}

        {/* Tracked Quest Info Window */}
        {showQuestInfo && (
          <div
            className={`relative bg-slate-900/90 backdrop-blur-md border rounded-2xl p-3 shadow-xl max-w-xs transition-all group ${
              isVeryClose
                ? 'border-emerald-500 shadow-emerald-500/20 ring-1 ring-emerald-500'
                : 'border-slate-700/80 hover:border-amber-400/60'
            }`}
          >
            {/* Header with Title & Hide Button */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <Target
                  className={`w-3.5 h-3.5 ${
                    isVeryClose ? 'text-emerald-400 animate-pulse' : 'text-amber-400'
                  }`}
                />
                <span className="font-bold text-[11px] uppercase tracking-wider text-amber-300 font-cinzel">
                  {isVeryClose ? 'Waypoint in Range!' : 'Active Quest'}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold font-space px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
                  {formatDistance(currentTracked.dist)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowQuestInfo(false);
                  }}
                  title="Hide Quest Info Window"
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Clickable body to cycle quests */}
            <div
              onClick={() => {
                const currentIdx = questsWithDist.findIndex((q) => q.id === currentTracked.id);
                const nextIdx = (currentIdx + 1) % questsWithDist.length;
                onSelectQuest(questsWithDist[nextIdx].id);
              }}
              className="cursor-pointer"
            >
              <h4 className="text-sm font-semibold text-white mt-1 line-clamp-1 group-hover:text-amber-300 transition-colors">
                {currentTracked.title}
              </h4>

              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                {currentTracked.description}
              </p>

              <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                <span>Reward: +{currentTracked.xpReward} XP</span>
                <span className="flex items-center text-cyan-400 group-hover:translate-x-0.5 transition-transform">
                  Cycle next ({questsWithDist.length}) <ChevronRight className="w-3 h-3 inline" />
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
