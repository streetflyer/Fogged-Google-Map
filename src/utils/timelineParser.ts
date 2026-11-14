import { LatLng } from '../types/explorer';
import { calculateDistanceMeters } from './geo';

export interface TimelinePoint {
  lat: number;
  lng: number;
  timestamp?: number;
  name?: string;
}

export interface TimelineSegment {
  name?: string;
  points: TimelinePoint[];
  distanceMeters: number;
  startTime?: string;
  endTime?: string;
}

export interface TimelineImportResult {
  totalPoints: number;
  segments: TimelineSegment[];
  totalDistanceMeters: number;
  startTime?: string;
  endTime?: string;
  placesVisited: string[];
}

/**
 * Universal Google Maps Timeline parser:
 * Parses Google Takeout Records.json, Semantic Location History, GeoJSON, KML, and GPX.
 */
export function parseGoogleTimeline(fileContent: string, fileName = ''): TimelineImportResult {
  const trimmed = fileContent.trim();
  const lowerName = fileName.toLowerCase();

  // 1. Try KML format
  if (trimmed.startsWith('<?xml') && (trimmed.includes('<kml') || lowerName.endsWith('.kml'))) {
    return parseKmlTimeline(trimmed);
  }

  // 2. Try GPX format
  if (trimmed.startsWith('<?xml') && (trimmed.includes('<gpx') || lowerName.endsWith('.gpx'))) {
    return parseGpxTimeline(trimmed);
  }

  // 3. Try JSON formats
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const data = JSON.parse(trimmed);
      return parseJsonTimeline(data);
    } catch (e) {
      console.warn('JSON parse error in timeline parser:', e);
    }
  }

  // Fallback: try regex extraction of lat/lng coordinate pairs
  return parseCoordinatePairsFallback(trimmed);
}

/**
 * Parses Google Takeout / Semantic Location History / GeoJSON
 */
function parseJsonTimeline(data: any): TimelineImportResult {
  const segments: TimelineSegment[] = [];
  const placesVisited: string[] = [];
  let totalDistanceMeters = 0;

  // Case A: Google Takeout "Records.json" or array with "locations"
  if (data.locations && Array.isArray(data.locations)) {
    const rawPoints: TimelinePoint[] = [];
    for (const item of data.locations) {
      const lat = item.latitudeE7 ? item.latitudeE7 / 1e7 : item.latitude || item.lat;
      const lng = item.longitudeE7 ? item.longitudeE7 / 1e7 : item.longitude || item.lng;
      if (isValidCoord(lat, lng)) {
        let ts: number | undefined;
        if (item.timestamp) ts = new Date(item.timestamp).getTime();
        else if (item.timestampMs) ts = Number(item.timestampMs);
        rawPoints.push({ lat, lng, timestamp: ts });
      }
    }

    if (rawPoints.length > 0) {
      // Chunk into logical segments if points are > 30 minutes apart or > 5km jump
      const chunked = chunkPointsIntoSegments(rawPoints, 'Google Location History');
      segments.push(...chunked);
    }
  }

  // Case B: Google Semantic Location History ("timelineObjects")
  else if (data.timelineObjects && Array.isArray(data.timelineObjects)) {
    for (const obj of data.timelineObjects) {
      if (obj.activitySegment) {
        const seg = obj.activitySegment;
        const pts: TimelinePoint[] = [];

        // Check simplifiedRawPath
        if (seg.simplifiedRawPath?.points && Array.isArray(seg.simplifiedRawPath.points)) {
          for (const p of seg.simplifiedRawPath.points) {
            const lat = p.latE7 ? p.latE7 / 1e7 : p.lat;
            const lng = p.lngE7 ? p.lngE7 / 1e7 : p.lng;
            if (isValidCoord(lat, lng)) {
              pts.push({ lat, lng });
            }
          }
        }

        // Check waypointPath
        if (pts.length === 0 && seg.waypointPath?.waypoints) {
          for (const w of seg.waypointPath.waypoints) {
            const lat = w.latE7 ? w.latE7 / 1e7 : w.lat;
            const lng = w.lngE7 ? w.lngE7 / 1e7 : w.lng;
            if (isValidCoord(lat, lng)) {
              pts.push({ lat, lng });
            }
          }
        }

        // Fallback to start and end location
        if (pts.length === 0) {
          const sLat = seg.startLocation?.latitudeE7 ? seg.startLocation.latitudeE7 / 1e7 : seg.startLocation?.lat;
          const sLng = seg.startLocation?.longitudeE7 ? seg.startLocation.longitudeE7 / 1e7 : seg.startLocation?.lng;
          const eLat = seg.endLocation?.latitudeE7 ? seg.endLocation.latitudeE7 / 1e7 : seg.endLocation?.lat;
          const eLng = seg.endLocation?.longitudeE7 ? seg.endLocation.longitudeE7 / 1e7 : seg.endLocation?.lng;
          if (isValidCoord(sLat, sLng)) pts.push({ lat: sLat, lng: sLng });
          if (isValidCoord(eLat, eLng)) pts.push({ lat: eLat, lng: eLng });
        }

        if (pts.length > 0) {
          const dist = calculateSegmentDistance(pts);
          totalDistanceMeters += dist;
          segments.push({
            name: seg.activityType || 'Travel Activity',
            points: pts,
            distanceMeters: dist,
            startTime: seg.duration?.startTimestamp,
            endTime: seg.duration?.endTimestamp,
          });
        }
      }

      if (obj.placeVisit) {
        const pv = obj.placeVisit;
        const loc = pv.location;
        if (loc) {
          const lat = loc.latitudeE7 ? loc.latitudeE7 / 1e7 : loc.lat;
          const lng = loc.longitudeE7 ? loc.longitudeE7 / 1e7 : loc.lng;
          const name = loc.name || loc.address || 'Visited Place';
          placesVisited.push(name);
          if (isValidCoord(lat, lng)) {
            segments.push({
              name,
              points: [{ lat, lng, name }],
              distanceMeters: 0,
              startTime: pv.duration?.startTimestamp,
              endTime: pv.duration?.endTimestamp,
            });
          }
        }
      }
    }
  }

  // Case C: GeoJSON FeatureCollection
  else if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
    for (const feat of data.features) {
      const geom = feat.geometry;
      if (!geom) continue;

      if (geom.type === 'LineString' && Array.isArray(geom.coordinates)) {
        const pts: TimelinePoint[] = [];
        for (const c of geom.coordinates) {
          if (Array.isArray(c) && c.length >= 2) {
            const lng = c[0];
            const lat = c[1];
            if (isValidCoord(lat, lng)) pts.push({ lat, lng });
          }
        }
        if (pts.length > 0) {
          const dist = calculateSegmentDistance(pts);
          totalDistanceMeters += dist;
          segments.push({
            name: feat.properties?.name || 'GeoJSON Route',
            points: pts,
            distanceMeters: dist,
          });
        }
      } else if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
        const lng = geom.coordinates[0];
        const lat = geom.coordinates[1];
        if (isValidCoord(lat, lng)) {
          const name = feat.properties?.name || 'GeoJSON Point';
          placesVisited.push(name);
          segments.push({
            name,
            points: [{ lat, lng, name }],
            distanceMeters: 0,
          });
        }
      }
    }
  }

  // Case D: Bare array of coordinates
  else if (Array.isArray(data)) {
    const rawPoints: TimelinePoint[] = [];
    for (const item of data) {
      const lat = item.lat ?? item.latitude ?? (item.latitudeE7 ? item.latitudeE7 / 1e7 : undefined);
      const lng = item.lng ?? item.longitude ?? (item.longitudeE7 ? item.longitudeE7 / 1e7 : undefined);
      if (isValidCoord(lat, lng)) {
        rawPoints.push({ lat, lng });
      }
    }
    if (rawPoints.length > 0) {
      segments.push(...chunkPointsIntoSegments(rawPoints, 'Imported Route'));
    }
  }

  let totalPoints = 0;
  for (const s of segments) {
    totalPoints += s.points.length;
    if (s.distanceMeters > 0 && totalDistanceMeters === 0) {
      totalDistanceMeters += s.distanceMeters;
    }
  }

  // Deduplicate places visited
  const uniquePlaces = Array.from(new Set(placesVisited)).slice(0, 15);

  return {
    totalPoints,
    segments,
    totalDistanceMeters: Math.round(totalDistanceMeters),
    placesVisited: uniquePlaces,
  };
}

/**
 * Parses KML format
 */
function parseKmlTimeline(xmlStr: string): TimelineImportResult {
  const segments: TimelineSegment[] = [];
  const coordRegex = /<coordinates>([\s\S]*?)<\/coordinates>/gi;
  let match: RegExpExecArray | null;

  while ((match = coordRegex.exec(xmlStr)) !== null) {
    const coordBlock = match[1].trim();
    const tuples = coordBlock.split(/\s+/);
    const pts: TimelinePoint[] = [];

    for (const tuple of tuples) {
      const parts = tuple.split(',');
      if (parts.length >= 2) {
        const lng = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);
        if (isValidCoord(lat, lng)) {
          pts.push({ lat, lng });
        }
      }
    }

    if (pts.length > 0) {
      const dist = calculateSegmentDistance(pts);
      segments.push({
        name: 'KML Track',
        points: pts,
        distanceMeters: dist,
      });
    }
  }

  let totalPoints = 0;
  let totalDistance = 0;
  for (const s of segments) {
    totalPoints += s.points.length;
    totalDistance += s.distanceMeters;
  }

  return {
    totalPoints,
    segments,
    totalDistanceMeters: Math.round(totalDistance),
    placesVisited: [],
  };
}

/**
 * Parses GPX format
 */
function parseGpxTimeline(gpxStr: string): TimelineImportResult {
  const segments: TimelineSegment[] = [];
  const trkptRegex = /<trkpt\s+[^>]*lat=["']([-0-9.]+)["']\s+[^>]*lon=["']([-0-9.]+)["']/gi;
  let match: RegExpExecArray | null;
  const pts: TimelinePoint[] = [];

  while ((match = trkptRegex.exec(gpxStr)) !== null) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (isValidCoord(lat, lng)) {
      pts.push({ lat, lng });
    }
  }

  if (pts.length > 0) {
    segments.push(...chunkPointsIntoSegments(pts, 'GPX Track'));
  }

  let totalPoints = 0;
  let totalDistance = 0;
  for (const s of segments) {
    totalPoints += s.points.length;
    totalDistance += s.distanceMeters;
  }

  return {
    totalPoints,
    segments,
    totalDistanceMeters: Math.round(totalDistance),
    placesVisited: [],
  };
}

/**
 * Fallback coordinate extraction
 */
function parseCoordinatePairsFallback(text: string): TimelineImportResult {
  const coordRegex = /([-+]?\d{1,2}\.\d+)[,\s]+([-+]?\d{1,3}\.\d+)/g;
  let match: RegExpExecArray | null;
  const pts: TimelinePoint[] = [];

  while ((match = coordRegex.exec(text)) !== null) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (isValidCoord(lat, lng)) {
      pts.push({ lat, lng });
    }
  }

  const segments = pts.length > 0 ? chunkPointsIntoSegments(pts, 'Extracted Coordinates') : [];
  let totalDist = 0;
  for (const s of segments) totalDist += s.distanceMeters;

  return {
    totalPoints: pts.length,
    segments,
    totalDistanceMeters: Math.round(totalDist),
    placesVisited: [],
  };
}

function isValidCoord(lat: any, lng: any): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

function calculateSegmentDistance(pts: TimelinePoint[]): number {
  let dist = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    dist += calculateDistanceMeters(pts[i], pts[i + 1]);
  }
  return dist;
}

function chunkPointsIntoSegments(pts: TimelinePoint[], baseName: string): TimelineSegment[] {
  const segments: TimelineSegment[] = [];
  let currentGroup: TimelinePoint[] = [];

  for (let i = 0; i < pts.length; i++) {
    const pt = pts[i];
    if (currentGroup.length === 0) {
      currentGroup.push(pt);
      continue;
    }

    const prev = currentGroup[currentGroup.length - 1];
    const dist = calculateDistanceMeters(prev, pt);

    // If jump > 8km or timestamp jump > 45min, start new segment
    const timeJumpMs = pt.timestamp && prev.timestamp ? Math.abs(pt.timestamp - prev.timestamp) : 0;
    if (dist > 8000 || (timeJumpMs > 45 * 60 * 1000 && dist > 500)) {
      if (currentGroup.length > 0) {
        segments.push({
          name: `${baseName} Part ${segments.length + 1}`,
          points: currentGroup,
          distanceMeters: calculateSegmentDistance(currentGroup),
        });
      }
      currentGroup = [pt];
    } else {
      currentGroup.push(pt);
    }
  }

  if (currentGroup.length > 0) {
    segments.push({
      name: `${baseName} ${segments.length > 0 ? `Part ${segments.length + 1}` : ''}`.trim(),
      points: currentGroup,
      distanceMeters: calculateSegmentDistance(currentGroup),
    });
  }

  return segments;
}

/**
 * Generate a realistic sample Google Maps Timeline dataset centered around the user's current location
 * for one-click testing and demonstration.
 */
export function generateSampleGoogleTimeline(center: LatLng): TimelineImportResult {
  const segments: TimelineSegment[] = [];
  const baseLat = center.lat;
  const baseLng = center.lng;

  // Segment 1: Morning Neighborhood Stroll (12 waypoints, looping through nearby streets)
  const strollPts: TimelinePoint[] = [
    { lat: baseLat, lng: baseLng, name: 'Home Origin' },
    { lat: baseLat + 0.0018, lng: baseLng + 0.0012, name: 'Corner Bakery' },
    { lat: baseLat + 0.0032, lng: baseLng + 0.0028, name: 'Oak Street' },
    { lat: baseLat + 0.0045, lng: baseLng + 0.0015, name: 'Community Park' },
    { lat: baseLat + 0.0051, lng: baseLng - 0.0008, name: 'Library Corner' },
    { lat: baseLat + 0.0035, lng: baseLng - 0.0022, name: 'Market Ave' },
    { lat: baseLat + 0.0019, lng: baseLng - 0.0018, name: 'Pine Street' },
    { lat: baseLat, lng: baseLng, name: 'Home Return' },
  ];

  // Segment 2: Afternoon Local Exploration (South-East loop)
  const explorePts: TimelinePoint[] = [
    { lat: baseLat, lng: baseLng },
    { lat: baseLat - 0.0015, lng: baseLng + 0.0022, name: 'Transit Plaza' },
    { lat: baseLat - 0.0034, lng: baseLng + 0.0041, name: 'Artisan Cafe' },
    { lat: baseLat - 0.0048, lng: baseLng + 0.0025, name: 'Riverside Walk' },
    { lat: baseLat - 0.0039, lng: baseLng - 0.0010, name: 'Greenway Trail' },
    { lat: baseLat - 0.0018, lng: baseLng - 0.0008, name: 'Church Square' },
    { lat: baseLat, lng: baseLng },
  ];

  const dist1 = calculateSegmentDistance(strollPts);
  const dist2 = calculateSegmentDistance(explorePts);

  segments.push({
    name: 'Morning Neighborhood Stroll (Google Timeline)',
    points: strollPts,
    distanceMeters: dist1,
    startTime: '2024-11-08T08:30:00Z',
    endTime: '2024-11-08T09:45:00Z',
  });

  segments.push({
    name: 'Afternoon Exploration Trail (Google Timeline)',
    points: explorePts,
    distanceMeters: dist2,
    startTime: '2024-11-09T14:15:00Z',
    endTime: '2024-11-09T15:50:00Z',
  });

  return {
    totalPoints: strollPts.length + explorePts.length,
    segments,
    totalDistanceMeters: Math.round(dist1 + dist2),
    placesVisited: ['Home', 'Corner Bakery', 'Community Park', 'Artisan Cafe', 'Riverside Walk'],
  };
}
