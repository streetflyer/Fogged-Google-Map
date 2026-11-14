import { useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { ExploredPoint, FogSettings, LatLng } from '../types/explorer';
import { metersToPixels } from '../utils/geo';

interface FogOverlayProps {
  exploredPoints: ExploredPoint[];
  currentLocation: LatLng | null;
  fogSettings: FogSettings;
  currentSightRadiusMeters: number;
}

export function FogOverlay({
  exploredPoints,
  currentLocation,
  fogSettings,
  currentSightRadiusMeters,
}: FogOverlayProps) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<google.maps.OverlayView | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const pulsePhaseRef = useRef<number>(0);

  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps) return;

    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '2'; // Above tiles, below UI controls
    canvasRef.current = canvas;

    const mapDiv = map.getDiv();
    mapDiv.appendChild(canvas);

    // Create an OverlayView to get access to projection
    class CustomFogOverlay extends google.maps.OverlayView {
      onAdd() {}
      draw() {
        // Trigger repaint whenever map bounds/zoom change
        renderFog();
      }
      onRemove() {}
    }

    const overlay = new CustomFogOverlay();
    overlay.setMap(map);
    overlayRef.current = overlay;

    const renderFog = () => {
      if (!canvas || !map) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const projection = overlay.getProjection();
      if (!projection) return;

      const rect = mapDiv.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width;
      const height = rect.height;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Clear previous frame
      ctx.clearRect(0, 0, width, height);

      // 2. Base Fog styling
      let fogColor = `rgba(9, 13, 22, ${fogSettings.density})`;
      if (fogSettings.density >= 0.99) {
        fogColor = fogSettings.style === 'obsidian' ? '#000000' : `rgba(7, 10, 18, 1.0)`;
      } else if (fogSettings.style === 'midnight') {
        fogColor = `rgba(12, 19, 36, ${fogSettings.density})`;
      } else if (fogSettings.style === 'parchment') {
        fogColor = `rgba(28, 22, 16, ${fogSettings.density})`;
      } else if (fogSettings.style === 'vapor') {
        fogColor = `rgba(18, 11, 28, ${fogSettings.density})`;
      }

      ctx.fillStyle = fogColor;
      ctx.fillRect(0, 0, width, height);

      // 3. Cut out revealed areas with destination-out composite mode
      ctx.globalCompositeOperation = 'destination-out';

      const zoom = map.getZoom() || 16;
      const bounds = map.getBounds();

      // Punch holes for all permanently explored points
      for (let i = 0; i < exploredPoints.length; i++) {
        const pt = exploredPoints[i];
        // Viewport culling for performance
        if (bounds) {
          const latSpan = bounds.toSpan().lat();
          const lngSpan = bounds.toSpan().lng();
          const bufferLat = Math.max(0.01, latSpan * 0.15);
          const bufferLng = Math.max(0.01, lngSpan * 0.15);
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();
          if (
            pt.lat > ne.lat() + bufferLat ||
            pt.lat < sw.lat() - bufferLat ||
            pt.lng > ne.lng() + bufferLng ||
            pt.lng < sw.lng() - bufferLng
          ) {
            continue;
          }
        }

        const pointPos = projection.fromLatLngToContainerPixel(
          new google.maps.LatLng(pt.lat, pt.lng)
        );
        if (!pointPos) continue;

        const radiusPx = metersToPixels(pt.radius, pt.lat, zoom);
        if (radiusPx <= 0) continue;

        const gradient = ctx.createRadialGradient(
          pointPos.x,
          pointPos.y,
          Math.max(2, radiusPx * 0.45),
          pointPos.x,
          pointPos.y,
          radiusPx
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
        gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.95)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(pointPos.x, pointPos.y, radiusPx, 0, Math.PI * 2);
        ctx.fill();
      }

      // Punch dynamic hole for current location sight
      if (currentLocation) {
        const currentPos = projection.fromLatLngToContainerPixel(
          new google.maps.LatLng(currentLocation.lat, currentLocation.lng)
        );
        if (currentPos) {
          const currentRadiusPx = metersToPixels(
            currentSightRadiusMeters,
            currentLocation.lat,
            zoom
          );
          const currentGrad = ctx.createRadialGradient(
            currentPos.x,
            currentPos.y,
            Math.max(2, currentRadiusPx * 0.5),
            currentPos.x,
            currentPos.y,
            currentRadiusPx
          );
          currentGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
          currentGrad.addColorStop(0.8, 'rgba(0, 0, 0, 0.92)');
          currentGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

          ctx.fillStyle = currentGrad;
          ctx.beginPath();
          ctx.arc(currentPos.x, currentPos.y, currentRadiusPx, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 4. Revert to source-over for aesthetic cartographic borders / radar effects
      ctx.globalCompositeOperation = 'source-over';

      if (currentLocation && fogSettings.showFrontierGlow) {
        const currentPos = projection.fromLatLngToContainerPixel(
          new google.maps.LatLng(currentLocation.lat, currentLocation.lng)
        );
        if (currentPos) {
          const currentRadiusPx = metersToPixels(
            currentSightRadiusMeters,
            currentLocation.lat,
            zoom
          );

          // Subtle glowing frontier edge ring
          ctx.beginPath();
          ctx.arc(currentPos.x, currentPos.y, currentRadiusPx, 0, Math.PI * 2);
          ctx.lineWidth = 2.5;
          ctx.strokeStyle =
            fogSettings.style === 'vapor'
              ? 'rgba(236, 72, 153, 0.45)'
              : fogSettings.style === 'parchment'
              ? 'rgba(217, 119, 6, 0.5)'
              : 'rgba(56, 189, 248, 0.5)';
          ctx.stroke();

          // Animated pulse ring
          pulsePhaseRef.current = (pulsePhaseRef.current + 0.02) % 1;
          const pulseRadius =
            currentRadiusPx * (0.85 + pulsePhaseRef.current * 0.35);
          const pulseAlpha = (1 - pulsePhaseRef.current) * 0.35;

          ctx.beginPath();
          ctx.arc(currentPos.x, currentPos.y, pulseRadius, 0, Math.PI * 2);
          ctx.lineWidth = 1.5;
          ctx.strokeStyle =
            fogSettings.style === 'vapor'
              ? `rgba(168, 85, 247, ${pulseAlpha})`
              : `rgba(14, 165, 233, ${pulseAlpha})`;
          ctx.stroke();
        }
      }

      // Draw explored trail if enabled
      if (fogSettings.showTrail && exploredPoints.length > 1) {
        ctx.beginPath();
        let started = false;
        const trailSlice = exploredPoints.slice(-50); // last 50 points
        for (let i = 0; i < trailSlice.length; i++) {
          const p = projection.fromLatLngToContainerPixel(
            new google.maps.LatLng(trailSlice[i].lat, trailSlice[i].lng)
          );
          if (p) {
            if (!started) {
              ctx.moveTo(p.x, p.y);
              started = true;
            } else {
              ctx.lineTo(p.x, p.y);
            }
          }
        }
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.restore();
    };

    // Animation loop for continuous pulse effect
    let isActive = true;
    const loop = () => {
      if (!isActive) return;
      renderFog();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    loop();

    const listeners = [
      map.addListener('center_changed', renderFog),
      map.addListener('zoom_changed', renderFog),
      map.addListener('bounds_changed', renderFog),
      map.addListener('idle', renderFog),
      map.addListener('drag', renderFog),
    ];

    const resizeObserver = new ResizeObserver(() => renderFog());
    resizeObserver.observe(mapDiv);

    return () => {
      isActive = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
      listeners.forEach((l) => google.maps.event.removeListener(l));
      overlay.setMap(null);
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    };
  }, [
    map,
    exploredPoints,
    currentLocation,
    fogSettings,
    currentSightRadiusMeters,
  ]);

  return null;
}
