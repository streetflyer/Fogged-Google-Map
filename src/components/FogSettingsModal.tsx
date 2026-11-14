import React from 'react';
import { X, Sliders, Moon, Sparkles, Compass, Radio } from 'lucide-react';
import { FogSettings, FogStyle } from '../types/explorer';

interface FogSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: FogSettings;
  onUpdateSettings: (newSettings: FogSettings) => void;
}

export function FogSettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}: FogSettingsModalProps) {
  if (!isOpen) return null;

  const styles: { id: FogStyle; label: string; desc: string; color: string }[] = [
    {
      id: 'obsidian',
      label: 'Obsidian Blackout',
      desc: 'Classic RTS & RPG dark impenetrable fog of war.',
      color: 'bg-slate-950 border-slate-700',
    },
    {
      id: 'midnight',
      label: 'Midnight Deep',
      desc: 'Deep oceanic navy with celestial cartography feel.',
      color: 'bg-indigo-950 border-indigo-700',
    },
    {
      id: 'parchment',
      label: 'Ancient Parchment',
      desc: 'Vintage sepia toned exploration atmosphere.',
      color: 'bg-amber-950 border-amber-700',
    },
    {
      id: 'vapor',
      label: 'Cyberpunk Vapor',
      desc: 'Neon violet atmosphere with glowing frontiers.',
      color: 'bg-purple-950 border-purple-700',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm pointer-events-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center">
              <Sliders className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-cinzel">
                Fog of War Settings
              </h3>
              <p className="text-xs text-slate-400">
                Customize map shrouding and visual effects
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

        {/* Style selector */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 font-cinzel">
            Atmospheric Theme
          </label>
          <div className="grid grid-cols-2 gap-2">
            {styles.map((s) => {
              const isSelected = settings.style === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => onUpdateSettings({ ...settings, style: s.id })}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-amber-400 bg-slate-800/90 shadow-md ring-1 ring-amber-400'
                      : 'border-slate-800 bg-slate-950/70 hover:bg-slate-800/40 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full border ${s.color}`} />
                    <span className="text-xs font-bold text-white">
                      {s.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                    {s.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fog Opacity slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Fog Opacity / Shroud</span>
            <span className="font-bold text-amber-400 font-space">
              {Math.round(settings.density * 100)}%
              {Math.round(settings.density * 100) >= 100 ? ' (Total Darkness)' : ''}
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="1.0"
            step="0.05"
            value={settings.density}
            onChange={(e) =>
              onUpdateSettings({ ...settings, density: Number(e.target.value) })
            }
            className="w-full accent-amber-400 cursor-pointer"
          />
          <p className="text-[10px] text-slate-500">
            Set to 100% for pitch-black impenetrable blackout on unexplored terrain.
          </p>
        </div>

        {/* Reveal Sight Radius */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">
              Personal Sight Clearance Radius
            </span>
            <span className="font-bold text-cyan-400 font-space">
              {settings.revealRadiusMeters} meters
            </span>
          </div>
          <input
            type="range"
            min="5"
            max="80"
            step="1"
            value={settings.revealRadiusMeters}
            onChange={(e) =>
              onUpdateSettings({
                ...settings,
                revealRadiusMeters: Number(e.target.value),
              })
            }
            className="w-full accent-cyan-400 cursor-pointer"
          />
          <p className="text-[10px] text-slate-500">
            Physical exploration radius cleared as you walk (default: 10m).
          </p>
        </div>

        {/* Visual & Gameplay toggles */}
        <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
          <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
            <div>
              <span className="text-slate-200 font-semibold block">
                Virtual Walking Controls (D-pad & Map Click)
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Disabled by default for real outdoor walking. Enable to test virtual movement on desktop.
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.enableVirtualControls}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  enableVirtualControls: e.target.checked,
                })
              }
              className="accent-amber-400 w-4 h-4 cursor-pointer ml-3 shrink-0"
            />
          </label>

          <label className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
            <span className="text-slate-300 font-medium">Frontier Glowing Border</span>
            <input
              type="checkbox"
              checked={settings.showFrontierGlow}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  showFrontierGlow: e.target.checked,
                })
              }
              className="accent-amber-400 w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
            <span className="text-slate-300 font-medium">Show Walking Trail Path</span>
            <input
              type="checkbox"
              checked={settings.showTrail}
              onChange={(e) =>
                onUpdateSettings({ ...settings, showTrail: e.target.checked })
              }
              className="accent-amber-400 w-4 h-4 cursor-pointer"
            />
          </label>
        </div>

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
