import React, { useState } from 'react';
import {
  X,
  ScrollText,
  Sparkles,
  MapPin,
  CheckCircle2,
  Clock,
  Compass,
  Zap,
  Eye,
  Plus,
  Loader2,
  Target,
} from 'lucide-react';
import { LatLng, Quest, QuestCategory } from '../types/explorer';
import { calculateDistanceMeters, formatDistance } from '../utils/geo';

interface QuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  quests: Quest[];
  currentLocation: LatLng | null;
  selectedQuestId: string | null;
  onSelectQuest: (questId: string) => void;
  onOpenCreator: () => void;
  onGenerateAiQuests: () => Promise<void>;
  isGeneratingAi: boolean;
}

export function QuestModal({
  isOpen,
  onClose,
  quests,
  currentLocation,
  selectedQuestId,
  onSelectQuest,
  onOpenCreator,
  onGenerateAiQuests,
  isGeneratingAi,
}: QuestModalProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  if (!isOpen) return null;

  const filteredQuests = quests.filter((q) => {
    if (filter === 'active' && q.completed) return false;
    if (filter === 'completed' && !q.completed) return false;
    if (categoryFilter !== 'all' && q.category !== categoryFilter) return false;
    return true;
  });

  const getCategoryIcon = (category: QuestCategory) => {
    switch (category) {
      case 'fitness':
        return Zap;
      case 'mystery':
        return Compass;
      case 'landmark':
        return MapPin;
      case 'scout':
      default:
        return Eye;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm pointer-events-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <ScrollText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-cinzel">
                Expedition Quest Board
              </h3>
              <p className="text-xs text-slate-400">
                Outdoor objectives to uncover the neighborhood fog
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Row: AI Generator & Custom Maker */}
        <div className="py-3 flex flex-wrap items-center justify-between gap-2 shrink-0 border-b border-slate-800/80">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filter === 'active'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Active ({quests.filter((q) => !q.completed).length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filter === 'completed'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Completed ({quests.filter((q) => q.completed).length})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* AI Generator Button */}
            <button
              onClick={onGenerateAiQuests}
              disabled={isGeneratingAi}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-md shadow-cyan-600/20 disabled:opacity-60 transition-all cursor-pointer font-space"
            >
              {isGeneratingAi ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>AI Scout Quests</span>
                </>
              )}
            </button>

            {/* Custom Quest Maker Button */}
            <button
              onClick={() => {
                onClose();
                onOpenCreator();
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-400/40 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Quest</span>
            </button>
          </div>
        </div>

        {/* Quest List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
          {filteredQuests.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <ScrollText className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">No quests found in this category.</p>
              <p className="text-xs mt-1">
                Generate new quests with AI or craft your own with the Quest Maker!
              </p>
            </div>
          ) : (
            filteredQuests.map((quest) => {
              const CategoryIcon = getCategoryIcon(quest.category);
              const distance = currentLocation
                ? calculateDistanceMeters(currentLocation, quest.targetLocation)
                : null;
              const isSelected = quest.id === selectedQuestId;

              return (
                <div
                  key={quest.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                    quest.completed
                      ? 'bg-slate-950/60 border-slate-800/80 opacity-75'
                      : isSelected
                      ? 'bg-slate-800/90 border-amber-400 shadow-md shadow-amber-500/10 ring-1 ring-amber-400'
                      : 'bg-slate-950/90 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          quest.completed
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {quest.completed ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <CategoryIcon className="w-5 h-5" />
                        )}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4
                            className={`text-sm font-bold ${
                              quest.completed
                                ? 'text-slate-300 line-through'
                                : 'text-white'
                            }`}
                          >
                            {quest.title}
                          </h4>
                          {quest.isAiGenerated && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-space">
                              AI Lore
                            </span>
                          )}
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            {quest.category}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 mt-1">
                          {quest.description}
                        </p>

                        {quest.hint && !quest.completed && (
                          <p className="text-[11px] text-cyan-400/90 mt-1 italic flex items-center gap-1">
                            <span>Clue:</span> {quest.hint}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right side reward & status */}
                    <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                      <span className="text-xs font-bold text-amber-400 font-space bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                        +{quest.xpReward} XP
                      </span>

                      {distance !== null && !quest.completed && (
                        <span className="text-[11px] text-slate-400 font-space">
                          {formatDistance(distance)} away
                        </span>
                      )}

                      {!quest.completed && (
                        <button
                          onClick={() => {
                            onSelectQuest(quest.id);
                            onClose();
                          }}
                          className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer font-space ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 shadow-sm'
                              : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700'
                          }`}
                        >
                          <Target className="w-3 h-3" />
                          <span>{isSelected ? 'Tracking' : 'Track'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
