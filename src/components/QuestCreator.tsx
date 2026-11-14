import React, { useState } from 'react';
import {
  X,
  Sparkles,
  MapPin,
  Target,
  Award,
  Zap,
  Eye,
  Compass,
  Check,
} from 'lucide-react';
import { LatLng, Quest, QuestCategory } from '../types/explorer';
import { computeDestinationPoint } from '../utils/geo';

interface QuestCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: LatLng | null;
  onAddQuest: (quest: Quest) => void;
  onStartPickOnMap: () => void;
  pickedLocation: LatLng | null;
}

export function QuestCreator({
  isOpen,
  onClose,
  currentLocation,
  onAddQuest,
  onStartPickOnMap,
  pickedLocation,
}: QuestCreatorProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<QuestCategory>('scout');
  const [radiusMeters, setRadiusMeters] = useState(45);
  const [xpReward, setXpReward] = useState(150);
  const [targetName, setTargetName] = useState('');
  const [useCurrentLoc, setUseCurrentLoc] = useState(false);

  if (!isOpen) return null;

  const targetCoords = pickedLocation || (useCurrentLoc && currentLocation ? currentLocation : null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // If no target picked, generate one slightly ahead of current location
    const fallbackTarget = currentLocation
      ? computeDestinationPoint(currentLocation, 300, Math.random() * 360)
      : { lat: 37.7749, lng: -122.4194 };

    const newQuest: Quest = {
      id: `custom_quest_${Date.now()}`,
      title: title.trim(),
      description:
        description.trim() ||
        'A custom neighborhood expedition crafted by an intrepid explorer.',
      category,
      targetLocation: targetCoords || fallbackTarget,
      targetName: targetName.trim() || 'Custom Waypoint',
      radiusMeters,
      xpReward,
      badgeIcon:
        category === 'fitness'
          ? 'Zap'
          : category === 'mystery'
          ? 'Compass'
          : category === 'landmark'
          ? 'MapPin'
          : 'Eye',
      completed: false,
      isAiGenerated: false,
    };

    onAddQuest(newQuest);
    setTitle('');
    setDescription('');
    setTargetName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm pointer-events-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-cinzel">
                Quest Maker
              </h3>
              <p className="text-xs text-slate-400">
                Design a neighborhood exploration challenge
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

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          {/* Title */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Quest Title <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. The Hidden Alley Murals / Maple Tree Sprint"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'scout', label: 'Scout', icon: Eye },
                { id: 'landmark', label: 'Landmark', icon: MapPin },
                { id: 'fitness', label: 'Fitness', icon: Zap },
                { id: 'mystery', label: 'Mystery', icon: Compass },
              ].map((c) => {
                const Icon = c.icon;
                const isSelected = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id as QuestCategory)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Description & Clue
            </label>
            <textarea
              rows={2}
              placeholder="Describe the objective or provide a hint to encourage exploration..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors resize-none"
            />
          </div>

          {/* Target Location Picker */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
            <label className="block text-slate-300 font-semibold">
              Target Destination Waypoint
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onStartPickOnMap();
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 font-semibold transition-all cursor-pointer"
              >
                <Target className="w-4 h-4" />
                <span>{pickedLocation ? 'Change Map Pin' : 'Pick on Map'}</span>
              </button>

              {currentLocation && (
                <button
                  type="button"
                  onClick={() => {
                    setUseCurrentLoc(true);
                  }}
                  className={`px-3 py-2 rounded-xl border font-semibold transition-all cursor-pointer ${
                    useCurrentLoc && !pickedLocation
                      ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  Use Current Location
                </button>
              )}
            </div>

            {targetCoords ? (
              <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 font-space">
                <Check className="w-3.5 h-3.5" />
                <span>
                  Coordinates selected: {targetCoords.lat.toFixed(5)},{' '}
                  {targetCoords.lng.toFixed(5)}
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">
                Pick a spot on the map or click 'Use Current Location'.
              </p>
            )}

            <div>
              <input
                type="text"
                placeholder="Waypoint name (e.g. 'Old Fountain' or 'Sector 4 Bench')"
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 placeholder-slate-500 text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Proximity Radius & XP Reward */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">
                Trigger Radius: <span className="text-white font-bold">{radiusMeters} m</span>
              </label>
              <input
                type="range"
                min="25"
                max="100"
                step="5"
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                XP Reward: <span className="text-amber-400 font-bold">+{xpReward} XP</span>
              </label>
              <input
                type="range"
                min="50"
                max="350"
                step="25"
                value={xpReward}
                onChange={(e) => setXpReward(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer font-space"
            >
              Publish Quest
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
