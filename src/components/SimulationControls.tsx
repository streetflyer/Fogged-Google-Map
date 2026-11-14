import React from 'react';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Footprints,
  Compass,
  Zap,
} from 'lucide-react';

interface SimulationControlsProps {
  onStep: (direction: 'N' | 'S' | 'E' | 'W') => void;
  speedMultiplier: number;
  onSetSpeed: (speed: number) => void;
  isSimulating: boolean;
  isMoving: boolean;
  onStopMovement: () => void;
}

export function SimulationControls({
  onStep,
  speedMultiplier,
  onSetSpeed,
  isSimulating,
  isMoving,
  onStopMovement,
}: SimulationControlsProps) {
  if (!isSimulating) return null;

  return (
    <div className="absolute bottom-5 right-4 z-20 flex flex-col items-end gap-2.5 pointer-events-auto">
      {/* Helpful banner */}
      <div className="bg-slate-950/85 backdrop-blur-md border border-indigo-500/40 rounded-xl px-3 py-1.5 shadow-xl text-xs text-indigo-200 flex items-center gap-2">
        <Footprints className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <span>
          {isMoving ? (
            <span className="text-emerald-400 font-semibold animate-pulse">
              Walking to target...
            </span>
          ) : (
            'Click map to walk or use D-pad'
          )}
        </span>
        {isMoving && (
          <button
            onClick={onStopMovement}
            className="ml-1 px-2 py-0.5 text-[10px] bg-rose-600/80 hover:bg-rose-600 text-white rounded font-bold cursor-pointer"
          >
            Stop
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Speed multiplier selector */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-1.5 shadow-xl flex flex-col gap-1 text-[11px] font-space">
          <button
            onClick={() => onSetSpeed(1)}
            className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
              speedMultiplier === 1
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Walk (5 km/h)"
          >
            1x Walk
          </button>
          <button
            onClick={() => onSetSpeed(2)}
            className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
              speedMultiplier === 2
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Jog (12 km/h)"
          >
            2x Jog
          </button>
          <button
            onClick={() => onSetSpeed(4)}
            className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
              speedMultiplier === 4
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Sprint/Bike (25 km/h)"
          >
            4x Bike
          </button>
        </div>

        {/* Tactical D-Pad */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-2 shadow-2xl flex flex-col items-center gap-1">
          {/* North */}
          <button
            onClick={() => onStep('N')}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white border border-slate-700 hover:border-indigo-400 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-sm"
            title="Step North (W / Up Arrow)"
          >
            <ArrowUp className="w-5 h-5" />
          </button>

          {/* West, Center Compass, East */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onStep('W')}
              className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white border border-slate-700 hover:border-indigo-400 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-sm"
              title="Step West (A / Left Arrow)"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-indigo-400">
              <Compass className="w-5 h-5" />
            </div>

            <button
              onClick={() => onStep('E')}
              className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white border border-slate-700 hover:border-indigo-400 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-sm"
              title="Step East (D / Right Arrow)"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* South */}
          <button
            onClick={() => onStep('S')}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white border border-slate-700 hover:border-indigo-400 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-sm"
            title="Step South (S / Down Arrow)"
          >
            <ArrowDown className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
