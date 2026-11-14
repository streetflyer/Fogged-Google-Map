import React, { useState, useRef } from 'react';
import {
  X,
  Wifi,
  WifiOff,
  Upload,
  FileText,
  MapPin,
  Footprints,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { LatLng } from '../types/explorer';
import { formatDistance, formatArea } from '../utils/geo';
import {
  parseGoogleTimeline,
  generateSampleGoogleTimeline,
  TimelineImportResult,
} from '../utils/timelineParser';

interface OfflineTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  isOfflineModeActive: boolean;
  onToggleOfflineMode: () => void;
  currentLocation: LatLng;
  cachedPointsCount: number;
  onAddTimelineToExplored: (
    segments: { from: LatLng; to: LatLng }[],
    radiusMeters: number,
    totalDistance: number
  ) => void;
}

export function OfflineTimelineModal({
  isOpen,
  onClose,
  isOnline,
  isOfflineModeActive,
  onToggleOfflineMode,
  currentLocation,
  cachedPointsCount,
  onAddTimelineToExplored,
}: OfflineTimelineModalProps) {
  const [timelineData, setTimelineData] = useState<TimelineImportResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [clearanceRadius, setClearanceRadius] = useState<number>(10); // default 10m
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const result = parseGoogleTimeline(text, file.name);

        if (result.totalPoints === 0) {
          setErrorMsg(
            'Could not find any location coordinates in this file. Please verify it is a valid Google Maps Timeline / Location History JSON or KML file.'
          );
          setTimelineData(null);
        } else {
          setTimelineData(result);
          setSuccessMsg(
            `Successfully parsed ${result.totalPoints.toLocaleString()} timeline points across ${
              result.segments.length
            } routes!`
          );
        }
      } catch (err) {
        setErrorMsg('Failed to read file. Please ensure it is a valid JSON, KML, or GPX export.');
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setErrorMsg('Error reading file from disk.');
      setIsLoading(false);
    };

    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    setErrorMsg('');
    setSuccessMsg('');
    setFileName('Sample_Google_Timeline.json');
    const sample = generateSampleGoogleTimeline(currentLocation);
    setTimelineData(sample);
    setSuccessMsg(
      `Loaded demo Google Maps Timeline with ${sample.totalPoints} neighborhood waypoints (${formatDistance(
        sample.totalDistanceMeters
      )})!`
    );
  };

  const handleApplyToExploredArea = () => {
    if (!timelineData || timelineData.segments.length === 0) return;

    const pairs: { from: LatLng; to: LatLng }[] = [];
    let aggregatedDistance = 0;

    for (const seg of timelineData.segments) {
      aggregatedDistance += seg.distanceMeters;
      const pts = seg.points;
      if (pts.length === 1) {
        pairs.push({ from: pts[0], to: pts[0] });
      } else {
        for (let i = 0; i < pts.length - 1; i++) {
          pairs.push({
            from: { lat: pts[i].lat, lng: pts[i].lng },
            to: { lat: pts[i + 1].lat, lng: pts[i + 1].lng },
          });
        }
      }
    }

    onAddTimelineToExplored(pairs, clearanceRadius, aggregatedDistance);
    setSuccessMsg(
      `🎉 Explored area updated! Swept ${pairs.length} path corridors into permanent fog clearance!`
    );
    setTimeout(() => {
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md pointer-events-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              {isOfflineModeActive || !isOnline ? (
                <WifiOff className="w-5 h-5 text-amber-400" />
              ) : (
                <Wifi className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white font-cinzel">
                  Offline Mode & Google Timeline
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-space ${
                    isOfflineModeActive || !isOnline
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {isOfflineModeActive || !isOnline ? 'Offline Active' : 'Online'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Explore without cellular internet or import your historical Google Maps Timeline
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

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-3 text-xs text-slate-300">
          {/* Offline Mode Status Banner */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-200">Offline Field Exploration:</span>
                <span className="text-slate-400">
                  {cachedPointsCount.toLocaleString()} Fog Coordinates Cached
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                GPS hardware in your phone works completely offline without internet or cellular data. All explored fog and quest milestones are stored securely on your device.
              </p>
            </div>

            <button
              onClick={onToggleOfflineMode}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs font-space transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                isOfflineModeActive
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
              }`}
            >
              {isOfflineModeActive ? 'Disable Offline Mode' : 'Force Offline Mode'}
            </button>
          </div>

          {/* Google Maps Timeline Import Section */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-bold font-cinzel text-sm">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span>Import Google Maps Timeline (Location History)</span>
              </div>

              <button
                onClick={() => setShowGuide(!showGuide)}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>How to export</span>
                {showGuide ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            </div>

            {/* Expandable How-To Guide */}
            {showGuide && (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 space-y-1.5 animate-fadeIn">
                <p className="font-semibold text-white">How to export your Google Maps Timeline:</p>
                <ol className="list-decimal pl-4 space-y-1 text-slate-400">
                  <li>
                    Open <strong>Google Maps</strong> on your phone or web browser.
                  </li>
                  <li>
                    Tap your Profile Icon &gt; <strong>Your Timeline</strong>.
                  </li>
                  <li>
                    Tap the 3 dots menu in the top corner &gt; <strong>Settings & Privacy</strong> &gt; <strong>Export Timeline Data</strong> (or download via <a href="https://takeout.google.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">Google Takeout</a> &gt; <em>Location History</em>).
                  </li>
                  <li>
                    Upload the resulting JSON, KML, or GPX file below to uncover your real-world footprint!
                  </li>
                </ol>
              </div>
            )}

            {/* Drag & Drop File Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-amber-400/80 rounded-2xl p-5 text-center cursor-pointer transition-all bg-slate-900/40 hover:bg-slate-900/80 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.geojson,.kml,.gpx,.xml"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload className="w-8 h-8 text-slate-400 group-hover:text-amber-400 mx-auto mb-2 transition-colors" />
              <div className="font-medium text-slate-200">
                Click to browse or drop your Google Maps Timeline file
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Supports Google Takeout <code className="text-cyan-300">Records.json</code>, Semantic Timeline monthly JSONs, GeoJSON, KML, or GPX
              </p>

              {fileName && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[11px]">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{fileName}</span>
                </div>
              )}
            </div>

            {/* Quick Demo Button */}
            <div className="flex items-center justify-between text-[11px] pt-1">
              <span className="text-slate-400">Don't have your file right now?</span>
              <button
                onClick={handleLoadSample}
                className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
              >
                Load Sample Neighborhood Timeline
              </button>
            </div>
          </div>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Parsed Timeline Preview & Action Panel */}
          {timelineData && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-amber-500/40 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-xs uppercase tracking-wider font-bold text-amber-400 font-cinzel">
                  Timeline Analysis Summary
                </span>
                <span className="text-[11px] text-cyan-400 font-space font-bold">
                  {timelineData.segments.length} Traveled Routes
                </span>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase">Total Points</span>
                  <div className="text-sm font-bold text-white font-space">
                    {timelineData.totalPoints.toLocaleString()}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase">Traveled Distance</span>
                  <div className="text-sm font-bold text-emerald-400 font-space">
                    {formatDistance(timelineData.totalDistanceMeters)}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-400 uppercase">Places Visited</span>
                  <div className="text-sm font-bold text-cyan-400 font-space truncate">
                    {timelineData.placesVisited.length > 0
                      ? `${timelineData.placesVisited.length} Locations`
                      : 'Neighborhood Paths'}
                  </div>
                </div>
              </div>

              {/* Visited Places Tags */}
              {timelineData.placesVisited.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase text-slate-400 font-medium">
                    Notable Places Visited:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {timelineData.placesVisited.map((p, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] border border-slate-700"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Clearance Radius Configuration */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-white">
                    Corridor Clearance Radius: {clearanceRadius} meters
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Fog of War ribbon width cleared along your imported path
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {[10, 15, 20, 30].map((r) => (
                    <button
                      key={r}
                      onClick={() => setClearanceRadius(r)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-space font-bold transition-all cursor-pointer ${
                        clearanceRadius === r
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {r}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Button to Apply Timeline to Explored Area */}
              <button
                onClick={handleApplyToExploredArea}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 cursor-pointer font-space"
              >
                <Footprints className="w-4 h-4" />
                <span>Add Imported Timeline to Explored Area</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            {cachedPointsCount.toLocaleString()} total explored points currently saved
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
