import React, { useState } from 'react';
import {
  X,
  Smartphone,
  QrCode,
  Share2,
  PlusSquare,
  Check,
  Copy,
  ExternalLink,
  Navigation,
  Sparkles,
} from 'lucide-react';

interface MobileGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileGuideModal({ isOpen, onClose }: MobileGuideModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'qr' | 'ios' | 'android'>('qr');

  if (!isOpen) return null;

  // Use the hosted Cloud Run URL or current window origin
  const appUrl =
    (import.meta as any).env?.APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '') ||
    'https://ais-pre-7lnd6cleffiga3waeua7sc-690309949278.asia-northeast1.run.app';

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    appUrl
  )}&color=fbbf24&bgcolor=090d16&margin=10`;

  const handleCopy = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md pointer-events-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-cinzel">
                Deploy & Use on Your Phone
              </h3>
              <p className="text-xs text-slate-400">
                Take TerraIncognita with you on your physical neighborhood walks
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

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 my-3 shrink-0">
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'qr'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Scan QR Code</span>
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'ios'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            iPhone (iOS)
          </button>
          <button
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'android'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Android
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs text-slate-300">
          {activeTab === 'qr' && (
            <div className="text-center py-2 space-y-3">
              <div className="inline-block p-3 rounded-2xl bg-slate-950 border-2 border-amber-500/40 shadow-xl">
                <img
                  src={qrCodeUrl}
                  alt="Scan to open on phone"
                  className="w-48 h-48 mx-auto rounded-xl"
                />
              </div>
              <p className="text-xs text-slate-300 font-medium max-w-xs mx-auto">
                Scan with your phone's camera to immediately open and explore outdoors!
              </p>

              {/* Copy URL bar */}
              <div className="flex items-center gap-2 max-w-md mx-auto bg-slate-950 border border-slate-800 rounded-xl p-2 text-left">
                <input
                  type="text"
                  readOnly
                  value={appUrl}
                  className="bg-transparent border-none text-[11px] text-slate-300 flex-1 px-2 focus:outline-none select-all truncate font-mono"
                />
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 text-xs transition-all cursor-pointer shrink-0 font-space"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-slate-950" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'ios' && (
            <div className="space-y-3 p-1">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold font-cinzel">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-xs">
                    1
                  </span>
                  <span>Open in Safari</span>
                </div>
                <p className="text-slate-400 pl-7 text-[11px]">
                  Open your camera, scan the QR code (or paste the link) into <strong>Safari</strong> on your iPhone.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold font-cinzel">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-xs">
                    2
                  </span>
                  <span>Tap Share & Add to Home Screen</span>
                </div>
                <p className="text-slate-400 pl-7 text-[11px]">
                  Tap the <Share2 className="w-3.5 h-3.5 inline mx-1 text-cyan-400" /> <strong>Share</strong> button at the bottom of Safari, scroll down, and tap <strong>Add to Home Screen</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold font-cinzel">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-xs">
                    3
                  </span>
                  <span>Allow GPS & Precise Location</span>
                </div>
                <p className="text-slate-400 pl-7 text-[11px]">
                  When asked for location permission, tap <strong>Allow While Using App</strong>. Make sure <strong>Precise: On</strong> is enabled (iOS Settings &gt; Privacy &gt; Location Services &gt; Safari). Now walk outdoors and your cursor and cleared fog will smoothly follow your footsteps in real time!
                </p>
              </div>
            </div>
          )}

          {activeTab === 'android' && (
            <div className="space-y-3 p-1">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold font-cinzel">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-xs">
                    1
                  </span>
                  <span>Open in Google Chrome</span>
                </div>
                <p className="text-slate-400 pl-7 text-[11px]">
                  Scan the QR code or open the app link in <strong>Google Chrome</strong> on Android.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold font-cinzel">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-xs">
                    2
                  </span>
                  <span>Install Web App</span>
                </div>
                <p className="text-slate-400 pl-7 text-[11px]">
                  Tap the <strong>3 vertical dots</strong> in Chrome's top right corner and tap <strong>Install app</strong> (or <em>Add to Home screen</em>).
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold font-cinzel">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-xs">
                    3
                  </span>
                  <span>Enable High-Accuracy GPS</span>
                </div>
                <p className="text-slate-400 pl-7 text-[11px]">
                  Tap <strong>Allow</strong> for precise device location. As you physically step out into your neighborhood, the real-world map uncovers!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between shrink-0">
          <a
            href={appUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium"
          >
            <span>Open in new tab</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
