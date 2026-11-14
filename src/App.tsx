/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MapExplorer } from './components/MapExplorer';
import { KeyRound, MapPin, Sparkles } from 'lucide-react';

export default function App() {
  // In AI Studio, the Google Maps GHP API key is automatically provisioned via the enablement flow
  const envKey =
    (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
    (typeof process !== 'undefined' ? (process.env as any)?.GOOGLE_MAPS_API_KEY : '') ||
    '';

  const [customKey, setCustomKey] = useState<string>('');
  const apiKey = envKey || customKey;

  // If somehow no key was injected into the build environment yet, provide a quick key input or demo fallback
  if (!apiKey || apiKey === 'MY_GOOGLE_MAPS_API_KEY') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-8 shadow-2xl text-center relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-cyan-500 p-0.5 mx-auto mb-4 shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <MapPin className="w-8 h-8 text-amber-400 animate-pulse" />
            </div>
          </div>

          <h1 className="text-2xl font-bold font-cinzel text-white mb-2">
            TerraIncognita
          </h1>
          <p className="text-xs text-slate-300 font-outfit mb-6">
            Gamified Fog of War Exploration & Neighborhood Quests.
          </p>

          <div className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 font-cinzel">
                Google Maps API Key
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Paste Google Maps API Key or Demo Key..."
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value.trim())}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors font-mono"
                />
              </div>
            </div>

            <button
              onClick={() => {
                if (customKey) {
                  // user entered key
                }
              }}
              disabled={!customKey}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider font-space shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
            >
              Enter Explorer Realm
            </button>
          </div>

          <p className="text-[11px] text-slate-500 mt-5">
            Google Maps Platform integration enabled. Enter your key or test key above to begin cartography.
          </p>
        </div>
      </div>
    );
  }

  return <MapExplorer apiKey={apiKey} />;
}
