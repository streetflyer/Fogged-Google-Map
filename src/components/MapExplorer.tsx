import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import confetti from 'canvas-confetti';
import {
  Compass,
  Footprints,
  MapPin,
  Navigation,
  Sparkles,
  Trophy,
  Target,
  Crosshair,
  RotateCcw,
  CheckCircle,
} from 'lucide-react';

import {
  ExploredPoint,
  ExplorerProfile,
  FogSettings,
  LatLng,
  Quest,
  AchievementBadge,
} from '../types/explorer';
import {
  calculateBearing,
  calculateDistanceMeters,
  computeDestinationPoint,
  formatDistance,
  decodePolyline,
} from '../utils/geo';
import {
  loadExploredPoints,
  saveExploredPoints,
  loadProfile,
  saveProfile,
  loadQuests,
  saveQuests,
  loadBadges,
  saveBadges,
  loadSettings,
  saveSettings,
  loadLastLocation,
  saveLastLocation,
} from '../utils/storage';
import { generateAiNeighborhoodQuests } from '../services/geminiQuests';
import { FogOverlay } from './FogOverlay';
import { HudHeader } from './HudHeader';
import { RadarCompass } from './RadarCompass';
import { SimulationControls } from './SimulationControls';
import { QuestModal } from './QuestModal';
import { QuestCreator } from './QuestCreator';
import { StatsDrawer } from './StatsDrawer';
import { FogSettingsModal } from './FogSettingsModal';
import { MobileGuideModal } from './MobileGuideModal';
import { OfflineTimelineModal } from './OfflineTimelineModal';

const DEFAULT_CENTER: LatLng = { lat: 37.7749, lng: -122.4194 }; // San Francisco fallback

interface MapExplorerProps {
  apiKey: string;
}

export function MapExplorer({ apiKey }: MapExplorerProps) {
  return (
    <APIProvider apiKey={apiKey} libraries={['places', 'marker', 'routes']}>
      <MapExplorerContent />
    </APIProvider>
  );
}

function MapExplorerContent() {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');

  // Core explorer state
  const [currentLocation, setCurrentLocation] = useState<LatLng>(() => {
    return loadLastLocation() || DEFAULT_CENTER;
  });
  const [heading, setHeading] = useState<number>(0);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Explored Fog state & synchronous ref to eliminate stale closure bugs
  const [exploredPoints, setExploredPoints] = useState<ExploredPoint[]>([]);
  const exploredPointsRef = useRef<ExploredPoint[]>([]);
  const [fogSettings, setFogSettings] = useState<FogSettings>(loadSettings);

  // Physical Outdoor GPS & Sensor Tracking
  const [gpsStatus, setGpsStatus] = useState<
    'active' | 'acquiring' | 'denied' | 'unavailable' | 'simulator'
  >('acquiring');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [followPlayer, setFollowPlayer] = useState<boolean>(true);
  const lastCoordRef = useRef<LatLng | null>(null);
  const currentLocationRef = useRef<LatLng>(currentLocation);
  currentLocationRef.current = currentLocation;

  // Player Progression
  const [profile, setProfile] = useState<ExplorerProfile>(loadProfile);
  const [badges, setBadges] = useState<AchievementBadge[]>(loadBadges);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);

  // Simulation Mode (Default INACTIVE unless explicitly activated in Options)
  const [isSimulating, setIsSimulating] = useState<boolean>(
    () => loadSettings().enableVirtualControls
  );
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [isMoving, setIsMoving] = useState(false);
  const walkIntervalRef = useRef<number | null>(null);

  // Keep isSimulating in sync whenever fogSettings.enableVirtualControls changes
  useEffect(() => {
    setIsSimulating(fogSettings.enableVirtualControls);
  }, [fogSettings.enableVirtualControls]);

  // Modals & UI State
  const [isQuestsOpen, setIsQuestsOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQuestCreatorOpen, setIsQuestCreatorOpen] = useState(false);
  const [isMobileGuideOpen, setIsMobileGuideOpen] = useState(false);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const [isOfflineModeActive, setIsOfflineModeActive] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<LatLng | null>(null);

  // Online / Offline Connectivity Detection
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Victory banner state
  const [completedQuestBanner, setCompletedQuestBanner] = useState<Quest | null>(
    null
  );

  // Google Maps Quota state (google-maps-platform skill Section 8 Case A)
  const [hasQuotaError, setHasQuotaError] = useState(false);

  // Track quota events
  useEffect(() => {
    const handleQuotaError = () => {
      setHasQuotaError(true);
    };
    window.addEventListener('gmp-quota-exceeded', handleQuotaError);
    return () => {
      window.removeEventListener('gmp-quota-exceeded', handleQuotaError);
    };
  }, []);

  // Update profile XP and badges
  const updateExplorerStats = (addedDistanceMeters: number, addedAreaSqM: number) => {
    setProfile((prev) => {
      const newDist = prev.totalDistanceMeters + addedDistanceMeters;
      const newArea = prev.totalAreaExploredSqM + addedAreaSqM;
      let newXp = prev.xp + Math.round(addedDistanceMeters * 0.2);
      if (addedAreaSqM > 0) newXp += 15;

      let newLevel = prev.level;
      let xpThreshold = prev.xpToNextLevel;

      while (newXp >= xpThreshold) {
        newLevel += 1;
        newXp = newXp - xpThreshold;
        xpThreshold = Math.round(xpThreshold * 1.45);
      }

      const updatedProfile: ExplorerProfile = {
        ...prev,
        level: newLevel,
        xp: newXp,
        xpToNextLevel: xpThreshold,
        totalDistanceMeters: newDist,
        totalAreaExploredSqM: newArea,
      };

      saveProfile(updatedProfile);
      checkAchievements(updatedProfile);
      return updatedProfile;
    });
  };

  const checkAchievements = (currProfile: ExplorerProfile) => {
    setBadges((prevBadges) => {
      let changed = false;
      const updated = prevBadges.map((badge) => {
        if (badge.unlocked) return badge;

        let progress = badge.progress;
        if (badge.id === 'first_step') {
          progress = currProfile.totalDistanceMeters > 5 ? 1 : 0;
        } else if (badge.id === 'fog_scout') {
          progress = currProfile.totalAreaExploredSqM;
        } else if (badge.id === 'distance_walker') {
          progress = currProfile.totalDistanceMeters;
        } else if (badge.id === 'quest_master') {
          progress = currProfile.questsCompleted;
        } else if (badge.id === 'cartographer') {
          progress = currProfile.totalAreaExploredSqM;
        }

        const isNowUnlocked = progress >= badge.maxProgress;
        if (isNowUnlocked && !badge.unlocked) {
          changed = true;
          return {
            ...badge,
            progress: badge.maxProgress,
            unlocked: true,
            unlockedAt: Date.now(),
          };
        }
        return { ...badge, progress };
      });

      if (changed) {
        saveBadges(updated);
      }
      return updated;
    });
  };

  /**
   * Continuous Corridor Fog Clearance:
   * Interpolates points between 'from' and 'to' so that NO gap exists along traveled paths.
   */
  const revealFogAlongPath = useCallback(
    (from: LatLng, to: LatLng, radius: number) => {
      const dist = calculateDistanceMeters(from, to);
      const stepInterval = Math.max(3, Math.min(8, radius * 0.35)); // ~3.5m interval for 10m radius
      const steps = Math.max(1, Math.ceil(dist / stepInterval));

      const pointsToAdd: ExploredPoint[] = [];
      const currentList = [...exploredPointsRef.current];

      for (let i = 0; i <= steps; i++) {
        const ratio = i / steps;
        const interpLat = from.lat + (to.lat - from.lat) * ratio;
        const interpLng = from.lng + (to.lng - from.lng) * ratio;
        const pt = { lat: interpLat, lng: interpLng };

        const isCovered = currentList.some(
          (p) => calculateDistanceMeters(p, pt) < radius * 0.45
        );

        if (!isCovered) {
          const newPt: ExploredPoint = {
            id: `fog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            lat: pt.lat,
            lng: pt.lng,
            radius,
            timestamp: Date.now(),
          };
          currentList.push(newPt);
          pointsToAdd.push(newPt);
        }
      }

      if (pointsToAdd.length > 0) {
        exploredPointsRef.current = currentList;
        setExploredPoints(currentList);
        saveExploredPoints(currentList);
        const approxAddedArea = pointsToAdd.length * Math.round(Math.PI * radius * radius * 0.4);
        updateExplorerStats(0, approxAddedArea);
      }
    },
    []
  );

  // Initialize GPS or last location on mount
  useEffect(() => {
    const savedPoints = loadExploredPoints();
    exploredPointsRef.current = savedPoints;
    setExploredPoints(savedPoints);

    if ('geolocation' in navigator) {
      setGpsStatus('acquiring');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsStatus('active');
          setGpsAccuracy(pos.coords.accuracy);
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCurrentLocation(loc);
          saveLastLocation(loc);
          lastCoordRef.current = loc;
          const loadedQuests = loadQuests(loc);
          setQuests(loadedQuests);
          revealFogAlongPath(loc, loc, fogSettings.revealRadiusMeters);
        },
        (err) => {
          console.warn('GPS initial lookup notice:', err);
          if (err.code === err.PERMISSION_DENIED) {
            setGpsStatus('denied');
          } else {
            setGpsStatus('unavailable');
          }
          const fallback = loadLastLocation() || DEFAULT_CENTER;
          setCurrentLocation(fallback);
          const loadedQuests = loadQuests(fallback);
          setQuests(loadedQuests);
          revealFogAlongPath(fallback, fallback, fogSettings.revealRadiusMeters);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    } else {
      setGpsStatus('unavailable');
      const fallback = loadLastLocation() || DEFAULT_CENTER;
      setCurrentLocation(fallback);
      const loadedQuests = loadQuests(fallback);
      setQuests(loadedQuests);
      revealFogAlongPath(fallback, fallback, fogSettings.revealRadiusMeters);
    }
  }, [revealFogAlongPath, fogSettings.revealRadiusMeters]);

  // Physical GPS Watcher for Outdoor Walking (iPhone 15 Pro & Mobile GPS)
  useEffect(() => {
    if (isSimulating) {
      setGpsStatus('simulator');
      return;
    }

    if (!('geolocation' in navigator)) {
      setGpsStatus('unavailable');
      return;
    }

    setGpsStatus('acquiring');

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsStatus('active');
        setGpsAccuracy(pos.coords.accuracy);

        const newLoc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };

        if (pos.coords.heading !== null && !isNaN(pos.coords.heading)) {
          setHeading(pos.coords.heading);
        }

        const prev = lastCoordRef.current || currentLocationRef.current;
        const dist = calculateDistanceMeters(prev, newLoc);

        // Update cursor location in real-time
        setCurrentLocation(newLoc);
        saveLastLocation(newLoc);

        // Smoothly auto-pan map camera if in follow mode
        if (followPlayer && map) {
          map.panTo(newLoc);
        }

        // When moving outdoors (at least 0.8 meters step)
        if (dist >= 0.8) {
          if (pos.coords.heading === null || isNaN(pos.coords.heading)) {
            const calculatedBrng = calculateBearing(prev, newLoc);
            setHeading(calculatedBrng);
          }
          // Reveal continuous corridor without breaks
          revealFogAlongPath(prev, newLoc, fogSettings.revealRadiusMeters);
          checkQuestsProximity(newLoc);
          updateExplorerStats(dist, 0);
          lastCoordRef.current = newLoc;
        } else if (!lastCoordRef.current) {
          revealFogAlongPath(newLoc, newLoc, fogSettings.revealRadiusMeters);
          lastCoordRef.current = newLoc;
        }
      },
      (err) => {
        console.warn('GPS watcher notice:', err);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus('denied');
        } else {
          setGpsStatus('unavailable');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0, // Direct real-time updates from iPhone GNSS hardware
        timeout: 15000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [
    isSimulating,
    followPlayer,
    map,
    revealFogAlongPath,
    fogSettings.revealRadiusMeters,
  ]);

  // Pause map auto-follow when user manually drags or pans the map
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('dragstart', () => {
      setFollowPlayer(false);
    });
    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map]);

  // Check if player reached any active quest
  const checkQuestsProximity = (userLoc: LatLng) => {
    setQuests((prevQuests) => {
      let completedAny = false;
      const updated = prevQuests.map((quest) => {
        if (quest.completed) return quest;

        const dist = calculateDistanceMeters(userLoc, quest.targetLocation);
        if (dist <= quest.radiusMeters) {
          completedAny = true;
          confetti({
            particleCount: 100,
            spread: 90,
            origin: { y: 0.5 },
          });

          setProfile((p) => {
            let nextXp = p.xp + quest.xpReward;
            let nextLevel = p.level;
            let thresh = p.xpToNextLevel;
            while (nextXp >= thresh) {
              nextLevel += 1;
              nextXp = nextXp - thresh;
              thresh = Math.round(thresh * 1.45);
            }
            const up: ExplorerProfile = {
              ...p,
              level: nextLevel,
              xp: nextXp,
              xpToNextLevel: thresh,
              questsCompleted: p.questsCompleted + 1,
            };
            saveProfile(up);
            checkAchievements(up);
            return up;
          });

          setCompletedQuestBanner(quest);
          return {
            ...quest,
            completed: true,
            completedAt: Date.now(),
          };
        }
        return quest;
      });

      if (completedAny) {
        saveQuests(updated);
      }
      return updated;
    });
  };

  /**
   * Use Current Location Button Handler
   */
  const handleLocateMe = () => {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setFollowPlayer(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setGpsStatus('active');
        setGpsAccuracy(pos.coords.accuracy);
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentLocation(loc);
        saveLastLocation(loc);
        lastCoordRef.current = loc;

        // Pan map camera to user's real physical coordinates
        if (map) {
          map.panTo(loc);
          map.setZoom(17);
        }

        // Reveal fog at current physical spot
        revealFogAlongPath(loc, loc, fogSettings.revealRadiusMeters);
        checkQuestsProximity(loc);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus('denied');
        }
        alert(
          'Could not retrieve your physical GPS location. Please check browser location permissions (Settings > Safari > Location: Allow, Precise Location: ON).'
        );
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  };

  /**
   * Reset Map Fog Handler
   */
  const handleResetFog = () => {
    exploredPointsRef.current = [];
    setExploredPoints([]);
    saveExploredPoints([]);

    // Clear and re-reveal initial spawn point
    revealFogAlongPath(
      currentLocation,
      currentLocation,
      fogSettings.revealRadiusMeters
    );

    // Reset explored area metric
    setProfile((p) => {
      const up = { ...p, totalAreaExploredSqM: 0 };
      saveProfile(up);
      return up;
    });
  };

  /**
   * D-Pad Step with Street Snapping:
   * When user presses N/S/E/W, use Routes API to snap the cursor along actual pedestrian roads/sidewalks!
   */
  const stepInDirection = async (direction: 'N' | 'S' | 'E' | 'W') => {
    const bearingMap = { N: 0, E: 90, S: 180, W: 270 };
    const stepMeters = 20 * simSpeed;
    const targetCandidate = computeDestinationPoint(
      currentLocation,
      stepMeters,
      bearingMap[direction]
    );

    setHeading(bearingMap[direction]);

    // Try street snapping via modern Routes API
    if (routesLib && (routesLib as any).Route) {
      try {
        const computeFn = (routesLib as any).Route.computeRoutes;
        const response = await computeFn({
          origin: currentLocation,
          destination: targetCandidate,
          travelMode: 'WALKING',
          fields: ['path', 'distanceMeters'],
        });

        if (response?.routes && response.routes.length > 0) {
          const route = response.routes[0];
          let pts: LatLng[] = [];
          if (route.path && Array.isArray(route.path) && route.path.length > 0) {
            pts = route.path.map((p: any) => ({
              lat: typeof p.lat === 'function' ? p.lat() : Number(p.lat),
              lng: typeof p.lng === 'function' ? p.lng() : Number(p.lng),
            }));
          } else if (route.polyline?.encodedPolyline) {
            pts = decodePolyline(route.polyline.encodedPolyline);
          }

          if (pts.length > 1) {
            // Pick next point along street path
            const snappedLoc = pts[Math.min(pts.length - 1, 1)];

            revealFogAlongPath(
              currentLocation,
              snappedLoc,
              fogSettings.revealRadiusMeters
            );
            setCurrentLocation(snappedLoc);
            saveLastLocation(snappedLoc);
            checkQuestsProximity(snappedLoc);
            updateExplorerStats(calculateDistanceMeters(currentLocation, snappedLoc), 0);
            return;
          }
        }
      } catch (e) {
        console.warn('Routes step snapping notice:', e);
      }
    }

    // Direct step with complete continuous corridor clearance
    revealFogAlongPath(
      currentLocation,
      targetCandidate,
      fogSettings.revealRadiusMeters
    );
    setCurrentLocation(targetCandidate);
    saveLastLocation(targetCandidate);
    checkQuestsProximity(targetCandidate);
    updateExplorerStats(stepMeters, 0);
  };

  /**
   * Walk To Destination Along Route:
   * Uses Routes API to walk along street geometry, or interpolates straight line,
   * revealing an UNBROKEN ribbon of cleared fog along the entire travel journey!
   */
  const walkToDestination = async (target: LatLng) => {
    if (walkIntervalRef.current) {
      clearInterval(walkIntervalRef.current);
      walkIntervalRef.current = null;
    }

    setIsMoving(true);
    const startLoc = { ...currentLocation };
    const totalDist = calculateDistanceMeters(startLoc, target);
    if (totalDist < 5) {
      setIsMoving(false);
      return;
    }

    // 1. Attempt to get pedestrian street route via modern Routes API
    let waypoints: LatLng[] = [];

    if (routesLib && (routesLib as any).Route) {
      try {
        const computeFn = (routesLib as any).Route.computeRoutes;
        const response = await computeFn({
          origin: startLoc,
          destination: target,
          travelMode: 'WALKING',
          fields: ['path', 'distanceMeters'],
        });

        if (response?.routes && response.routes.length > 0) {
          const route = response.routes[0];
          let rawPts: LatLng[] = [];

          if (route.path && Array.isArray(route.path) && route.path.length > 0) {
            rawPts = route.path.map((p: any) => ({
              lat: typeof p.lat === 'function' ? p.lat() : Number(p.lat),
              lng: typeof p.lng === 'function' ? p.lng() : Number(p.lng),
            }));
          } else if (route.polyline?.encodedPolyline) {
            rawPts = decodePolyline(route.polyline.encodedPolyline);
          }

          if (rawPts.length > 0) {
            // Interpolate dense waypoints along street segments for smooth walking
            const densePts: LatLng[] = [];
            for (let i = 0; i < rawPts.length - 1; i++) {
              densePts.push(rawPts[i]);
              const segDist = calculateDistanceMeters(rawPts[i], rawPts[i + 1]);
              const segSteps = Math.max(1, Math.ceil(segDist / (10 * simSpeed)));
              for (let s = 1; s < segSteps; s++) {
                const ratio = s / segSteps;
                densePts.push({
                  lat: rawPts[i].lat + (rawPts[i + 1].lat - rawPts[i].lat) * ratio,
                  lng: rawPts[i].lng + (rawPts[i + 1].lng - rawPts[i].lng) * ratio,
                });
              }
            }
            densePts.push(rawPts[rawPts.length - 1]);
            waypoints = densePts;
          }
        }
      } catch (err) {
        console.warn('Routes API computeRoutes notice:', err);
      }
    }

    // Fallback: If no route returned, interpolate intermediate waypoints
    if (waypoints.length === 0) {
      const stepSize = 10 * simSpeed;
      const numSteps = Math.max(1, Math.ceil(totalDist / stepSize));
      const brng = calculateBearing(startLoc, target);
      for (let i = 1; i <= numSteps; i++) {
        waypoints.push(
          computeDestinationPoint(startLoc, Math.min(totalDist, i * stepSize), brng)
        );
      }
    }

    let currentIndex = 0;
    let prevLoc = startLoc;
    const finalDestination = waypoints[waypoints.length - 1];

    walkIntervalRef.current = window.setInterval(() => {
      if (currentIndex >= waypoints.length) {
        clearInterval(walkIntervalRef.current!);
        walkIntervalRef.current = null;
        setIsMoving(false);
        setCurrentLocation(finalDestination);
        saveLastLocation(finalDestination);
        revealFogAlongPath(prevLoc, finalDestination, fogSettings.revealRadiusMeters);
        checkQuestsProximity(finalDestination);
      } else {
        const nextLoc = waypoints[currentIndex];
        const stepDist = calculateDistanceMeters(prevLoc, nextLoc);
        const brng = calculateBearing(prevLoc, nextLoc);
        setHeading(brng);

        // Continuous corridor reveal from previous location to next waypoint
        revealFogAlongPath(prevLoc, nextLoc, fogSettings.revealRadiusMeters);
        setCurrentLocation(nextLoc);
        checkQuestsProximity(nextLoc);
        updateExplorerStats(stepDist, 0);

        prevLoc = nextLoc;
        currentIndex++;
      }
    }, 100);
  };

  const stopMovement = () => {
    if (walkIntervalRef.current) {
      clearInterval(walkIntervalRef.current);
      walkIntervalRef.current = null;
    }
    setIsMoving(false);
  };

  // Keyboard navigation (W/A/S/D & Arrow keys) for simulation mode (only active if enabled in Options)
  useEffect(() => {
    if (!fogSettings.enableVirtualControls || !isSimulating) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      let dir: 'N' | 'S' | 'E' | 'W' | null = null;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') dir = 'N';
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') dir = 'S';
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') dir = 'W';
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') dir = 'E';

      if (dir) {
        e.preventDefault();
        stepInDirection(dir);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fogSettings.enableVirtualControls, isSimulating, currentLocation, simSpeed]);

  // Handle map click
  const handleMapClick = (e: any) => {
    if (!e.detail?.latLng) return;
    const clicked: LatLng = {
      lat: e.detail.latLng.lat,
      lng: e.detail.latLng.lng,
    };

    if (isPickingLocation) {
      setPickedLocation(clicked);
      setIsPickingLocation(false);
      setIsQuestCreatorOpen(true);
      return;
    }

    // ONLY allow click-to-walk if Virtual Controls are enabled in Options!
    if (fogSettings.enableVirtualControls && isSimulating) {
      walkToDestination(clicked);
    }
  };

  const handleAddCustomQuest = (newQuest: Quest) => {
    setQuests((prev) => {
      const updated = [newQuest, ...prev];
      saveQuests(updated);
      return updated;
    });
    setSelectedQuestId(newQuest.id);
    setBadges((prevBadges) => {
      const updated = prevBadges.map((b) => {
        if (b.id === 'quest_creator' && !b.unlocked) {
          return { ...b, progress: 1, unlocked: true, unlockedAt: Date.now() };
        }
        return b;
      });
      saveBadges(updated);
      return updated;
    });
  };

  const handleGenerateAiQuests = async () => {
    setIsGeneratingAi(true);
    try {
      const generated = await generateAiNeighborhoodQuests(
        currentLocation,
        quests.length
      );
      setQuests((prev) => {
        const updated = [...generated, ...prev];
        saveQuests(updated);
        return updated;
      });
      if (generated.length > 0) {
        setSelectedQuestId(generated[0].id);
      }
    } finally {
      setIsGeneratingAi(false);
    }
  };

  /**
   * Add Imported Google Maps Timeline to Explored Area:
   * Sweeps all path pairs through revealFogAlongPath, uncovering real-world history!
   */
  const handleAddTimelineToExplored = (
    segments: { from: LatLng; to: LatLng }[],
    radiusMeters: number,
    totalDistance: number
  ) => {
    for (const seg of segments) {
      revealFogAlongPath(seg.from, seg.to, radiusMeters);
    }

    const approxAddedArea = Math.round(totalDistance * radiusMeters * 1.5);
    updateExplorerStats(totalDistance, approxAddedArea);

    confetti({
      particleCount: 120,
      spread: 100,
      origin: { y: 0.6 },
    });
  };

  const activeQuests = quests.filter((q) => !q.completed);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950">
      {/* Top HUD Header */}
      <HudHeader
        profile={profile}
        isSimulating={isSimulating}
        onToggleSimulator={() => {
          stopMovement();
          setIsSimulating(!isSimulating);
        }}
        onOpenQuests={() => setIsQuestsOpen(true)}
        onOpenStats={() => setIsStatsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenQuestCreator={() => {
          setPickedLocation(null);
          setIsQuestCreatorOpen(true);
        }}
        onLocateMe={handleLocateMe}
        onResetMap={() => setIsResetConfirmOpen(true)}
        onOpenMobileGuide={() => setIsMobileGuideOpen(true)}
        onOpenOfflineTimeline={() => setIsOfflineModalOpen(true)}
        isLocating={isLocating}
        activeQuestsCount={activeQuests.length}
        hasQuotaError={hasQuotaError}
        gpsStatus={gpsStatus}
        gpsAccuracy={gpsAccuracy}
        enableVirtualControls={fogSettings.enableVirtualControls}
        followPlayer={followPlayer}
        isOnline={isOnline}
        isOfflineModeActive={isOfflineModeActive}
      />

      {/* Picking Location Banner */}
      {isPickingLocation && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-amber-500 text-slate-950 px-5 py-2.5 rounded-full font-bold shadow-2xl flex items-center gap-2 border-2 border-slate-950 animate-bounce">
          <Target className="w-5 h-5" />
          <span>Click anywhere on the map to set Quest Waypoint!</span>
          <button
            onClick={() => {
              setIsPickingLocation(false);
              setIsQuestCreatorOpen(true);
            }}
            className="ml-2 bg-slate-950 text-white text-xs px-2.5 py-1 rounded-full cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md pointer-events-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <RotateCcw className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white font-cinzel">
              Reset Explored Map?
            </h3>
            <p className="text-xs text-slate-300">
              This will restore the dark Fog of War across your neighborhood. Your current level, XP, and badges will remain untouched.
            </p>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleResetFog();
                  setIsResetConfirmOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer transition-colors font-space shadow-lg shadow-rose-600/30"
              >
                Reset Fog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quest Victory Modal */}
      {completedQuestBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md pointer-events-auto">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-400 rounded-3xl max-w-md w-full p-6 text-center shadow-2xl shadow-amber-500/20">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-400/40 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Trophy className="w-8 h-8 text-amber-400 animate-pulse" />
            </div>

            <span className="text-xs uppercase tracking-widest font-black text-amber-400 font-cinzel">
              Quest Completed!
            </span>

            <h3 className="text-xl font-black text-white mt-1">
              {completedQuestBanner.title}
            </h3>

            <p className="text-xs text-slate-300 mt-2 px-2">
              {completedQuestBanner.description}
            </p>

            <div className="my-4 py-2 px-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 inline-block font-space">
              <span className="text-sm font-black text-amber-300">
                +{completedQuestBanner.xpReward} Explorer XP Earned!
              </span>
            </div>

            <div>
              <button
                onClick={() => setCompletedQuestBanner(null)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-500/30 cursor-pointer font-space"
              >
                Claim Victory & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Locate Me & Reset Actions (Above Radar / Lower Right) */}
      <div className="absolute right-4 bottom-52 sm:bottom-48 z-20 flex flex-col gap-2 pointer-events-auto">
        <button
          onClick={handleLocateMe}
          disabled={isLocating}
          title={followPlayer ? 'Centered on My GPS' : 'Re-center & Follow My Location'}
          className={`w-11 h-11 rounded-2xl bg-slate-900/90 backdrop-blur-md border shadow-2xl flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
            followPlayer
              ? 'border-cyan-500/40 text-cyan-400 hover:text-white hover:bg-cyan-600/30'
              : 'border-amber-500/60 text-amber-300 bg-amber-500/15 animate-pulse'
          }`}
        >
          <Crosshair className={`w-5 h-5 ${isLocating ? 'animate-spin' : ''}`} />
        </button>

        <button
          onClick={() => setIsResetConfirmOpen(true)}
          title="Reset Map Fog"
          className="w-11 h-11 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-rose-500/40 text-rose-400 hover:text-white hover:bg-rose-600/30 shadow-2xl flex items-center justify-center transition-all active:scale-95 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Radar Compass Widget */}
      <RadarCompass
        currentLocation={currentLocation}
        activeQuests={activeQuests}
        selectedQuestId={selectedQuestId}
        onSelectQuest={(id) => setSelectedQuestId(id)}
        onOpenQuests={() => setIsQuestsOpen(true)}
      />

      {/* Virtual Walking Controls (D-Pad & Speed) - ONLY active if explicitly enabled in Options */}
      {fogSettings.enableVirtualControls && isSimulating && (
        <SimulationControls
          onStep={stepInDirection}
          speedMultiplier={simSpeed}
          onSetSpeed={(s) => setSimSpeed(s)}
          isSimulating={isSimulating}
          isMoving={isMoving}
          onStopMovement={stopMovement}
        />
      )}

      {/* Main Google Map Viewport */}
      <div className="w-full h-full">
        <Map
          defaultCenter={currentLocation}
          defaultZoom={17}
          minZoom={2}
          maxZoom={21}
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          gestureHandling="greedy"
          zoomControl={true}
          mapTypeControl={true}
          scaleControl={true}
          rotateControl={true}
          fullscreenControl={false}
          streetViewControl={false}
          onClick={handleMapClick}
          className="w-full h-full"
        >
          {/* Fog of War Overlay */}
          <FogOverlay
            exploredPoints={exploredPoints}
            currentLocation={currentLocation}
            fogSettings={fogSettings}
            currentSightRadiusMeters={fogSettings.revealRadiusMeters}
          />

          {/* Player Explorer Marker */}
          {currentLocation && (
            <AdvancedMarker
              position={currentLocation}
              title="Your Explorer Position"
              zIndex={30}
            >
              <div className="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
                <div className="absolute w-12 h-12 rounded-full border-2 border-cyan-400/60 bg-cyan-500/10 animate-ping pointer-events-none" />
                <div
                  style={{
                    transform: `rotate(${heading}deg)`,
                  }}
                  className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-600 border-2 border-white shadow-xl shadow-cyan-500/50 flex items-center justify-center transition-transform duration-200"
                >
                  <Navigation className="w-5 h-5 text-white fill-white -rotate-45" />
                </div>
              </div>
            </AdvancedMarker>
          )}

          {/* Quest Markers on Map */}
          {activeQuests.map((quest) => {
            const isSelected = quest.id === selectedQuestId;
            return (
              <AdvancedMarker
                key={quest.id}
                position={quest.targetLocation}
                title={quest.title}
                zIndex={isSelected ? 25 : 20}
                onClick={() => setSelectedQuestId(quest.id)}
              >
                <div className="relative flex flex-col items-center cursor-pointer group">
                  <div
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md border mb-1 whitespace-nowrap transition-transform duration-200 group-hover:scale-110 ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 border-white font-space'
                        : 'bg-slate-900/90 text-amber-300 border-slate-700'
                    }`}
                  >
                    {quest.title}
                  </div>

                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-xl border-2 transition-transform duration-200 group-hover:scale-110 ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 border-white ring-4 ring-amber-400/30 scale-105'
                        : 'bg-slate-900 text-amber-400 border-amber-500/70'
                    }`}
                  >
                    <Target className="w-5 h-5" />
                  </div>
                </div>
              </AdvancedMarker>
            );
          })}
        </Map>
      </div>

      {/* Modals & Drawers */}
      <QuestModal
        isOpen={isQuestsOpen}
        onClose={() => setIsQuestsOpen(false)}
        quests={quests}
        currentLocation={currentLocation}
        selectedQuestId={selectedQuestId}
        onSelectQuest={(id) => setSelectedQuestId(id)}
        onOpenCreator={() => setIsQuestCreatorOpen(true)}
        onGenerateAiQuests={handleGenerateAiQuests}
        isGeneratingAi={isGeneratingAi}
      />

      <QuestCreator
        isOpen={isQuestCreatorOpen}
        onClose={() => setIsQuestCreatorOpen(false)}
        currentLocation={currentLocation}
        onAddQuest={handleAddCustomQuest}
        onStartPickOnMap={() => setIsPickingLocation(true)}
        pickedLocation={pickedLocation}
      />

      <StatsDrawer
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        profile={profile}
        badges={badges}
        onResetFog={handleResetFog}
      />

      <FogSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={fogSettings}
        onUpdateSettings={(newSettings) => {
          setFogSettings(newSettings);
          saveSettings(newSettings);
        }}
      />

      <MobileGuideModal
        isOpen={isMobileGuideOpen}
        onClose={() => setIsMobileGuideOpen(false)}
      />

      <OfflineTimelineModal
        isOpen={isOfflineModalOpen}
        onClose={() => setIsOfflineModalOpen(false)}
        isOnline={isOnline}
        isOfflineModeActive={isOfflineModeActive}
        onToggleOfflineMode={() => setIsOfflineModeActive(!isOfflineModeActive)}
        currentLocation={currentLocation}
        cachedPointsCount={exploredPoints.length}
        onAddTimelineToExplored={handleAddTimelineToExplored}
      />
    </div>
  );
}
