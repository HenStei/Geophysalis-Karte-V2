import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMapEvents, useMap, Rectangle, Polyline, Tooltip } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import imageCompression from 'browser-image-compression';
import { X, Upload, MapPin, Check, Info, LocateFixed, Layers, Share2, Dices, Compass, Navigation2, User, LogIn, Mail, Sparkles, Shield, CheckCircle, Trash2, Lock, Moon, Award, Globe, Footprints, Trophy , Share, Loader2 } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import confetti from 'canvas-confetti';
import exifr from 'exifr';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { ErrorBoundary } from './ErrorBoundary';
import { supabase } from './supabase';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import AchievementPopup from './components/AchievementPopup';

// Fix für Leaflet-Marker-Icons als Fallback
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41], popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Module-level icon cache – lives outside React, never re-created on re-render
// Key: `${url}_${isTarget}_${isNew}` → guarantees Leaflet always gets the same object reference
const _iconCache = new Map();
const getStickerIcon = (url, isTarget = false, isNewPin = false) => {
  const key = `${url}_${isTarget ? 1 : 0}_${isNewPin ? 1 : 0}`;
  if (_iconCache.has(key)) return _iconCache.get(key);
  const icon = L.divIcon({
    className: `custom-sticker-icon ${isTarget ? 'is-target' : ''} ${isNewPin ? 'is-new' : ''}`,
    html: `<div style="background-image: url('${url}');"></div>`,
    iconSize: isTarget ? [60, 60] : [46, 46],
    iconAnchor: isTarget ? [30, 30] : [23, 23],
    popupAnchor: [0, -20]
  });
  _iconCache.set(key, icon);
  return icon;
};

const draftIcon = L.divIcon({
  className: 'bg-transparent border-none',
  html: `<div class="relative flex items-center justify-center w-12 h-12">
          <div class="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-50"></div>
          <div class="relative bg-blue-600 text-white rounded-full p-2 shadow-lg border-2 border-white">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          </div>
         </div>`,
  iconSize: [48, 48],
  iconAnchor: [24, 48]
});

// PinMarker manages its own copied state internally.
// This way React.memo can ACTUALLY prevent re-renders: the only props are
// pin (stable object), isTarget (bool), isNewPin (bool) – all stable between renders.
// No inline callbacks, no external copiedId state leaking in.
const PinMarker = React.memo(function PinMarker({ pin, isTarget, isNewPin }) {
  const [copied, setCopied] = React.useState(false);
  const icon = getStickerIcon(pin.image_url, isTarget, isNewPin);

  const handleCopy = React.useCallback(() => {
    const url = `${window.location.origin}/?pin=${pin.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [pin.id]);

  return (
    <Marker position={[pin.lat, pin.lng]} icon={icon}>
      <Popup>
        <div className="flex flex-col bg-white">
          <img src={pin.image_url} alt="Sticker" className="w-full h-48 object-cover rounded-t-xl" />
          <div className="p-4">
            {pin.location_name && <p className="font-bold text-gray-900 text-sm mb-1">{pin.location_name}</p>}
            {pin.message && <p className="text-gray-600 text-sm italic mb-2">"{pin.message}"</p>}
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-1">
              Gefunden am {new Date(pin.created_at).toLocaleDateString()}
            </p>
            <button
              onClick={handleCopy}
              className="mt-3 w-full bg-blue-50 text-blue-600 font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-100 transition active:scale-95"
            >
              {copied ? <Check size={16} /> : <Share2 size={16} />}
              {copied ? 'Link kopiert!' : 'Sticker teilen'}
            </button>
          </div>
        </div>
      </Popup>
    </Marker>
  );
});

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
    dragstart() {
      onMapClick(null);
    },
  });
  return null;
}

// Custom Heatmap Layer Component
function HeatmapLayer({ pins, isVisible }) {
  const map = useMap();
  const heatLayerRef = useRef(null);

  useEffect(() => {
    if (!isVisible) {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
      return;
    }

    if (!heatLayerRef.current && pins.length > 0) {
      const heatPoints = pins.map(p => [p.lat, p.lng, 3]);
      heatLayerRef.current = L.heatLayer(heatPoints, {
        radius: 40, 
        blur: 25,   
        maxZoom: 10,
        gradient: { 
          0.1: 'blue', 0.3: 'cyan', 0.5: 'lime', 0.7: 'yellow', 1.0: 'red' 
        }
      }).addTo(map);
    } else if (heatLayerRef.current) {
      heatLayerRef.current.setLatLngs(pins.map(p => [p.lat, p.lng, 3]));
    }

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [map, pins, isVisible]);

  return null;
}

// Minimap Syncer
function MinimapBounds({ parentMap }) {
  const minimap = useMap();
  const [bounds, setBounds] = useState(parentMap.getBounds());
  
  useEffect(() => {
    if (!parentMap) return;
    
    const update = () => {
      setBounds(parentMap.getBounds());
      // Zentriere Minimap und setze Zoom (ca. 6 Level weiter raus als Hauptkarte, mindestens Level 0)
      minimap.setView(parentMap.getCenter(), Math.max(0, parentMap.getZoom() - 6));
    };
    
    parentMap.on('move', update);
    parentMap.on('zoom', update);
    update();
    
    return () => {
      parentMap.off('move', update);
      parentMap.off('zoom', update);
    };
  }, [minimap, parentMap]);
  
  return <Rectangle bounds={bounds} pathOptions={{ color: '#2563eb', weight: 2, fillOpacity: 0.2 }} />;
}

// Helper: Compute Quadratic Bézier arc points & tangent bearing between two [lat, lng] coordinates
function getFlightCurvePointAndBearing(p1, p2, t) {
  const lat1 = p1[0], lng1 = p1[1];
  const lat2 = p2[0], lng2 = p2[1];
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  // Perpendicular offset for a graceful flight arc (scaled by distance)
  const midLat = (lat1 + lat2) / 2 + dLng * 0.16;
  const midLng = (lng1 + lng2) / 2 - dLat * 0.16;

  const u = 1 - t;
  const lat = u * u * lat1 + 2 * u * t * midLat + t * t * lat2;
  const lng = u * u * lng1 + 2 * u * t * midLng + t * t * lng2;

  // Derivative dP/dt for exact heading/bearing
  const dLatDt = 2 * u * (midLat - lat1) + 2 * t * (lat2 - midLat);
  const dLngDt = (2 * u * (midLng - lng1) + 2 * t * (lng2 - midLng)) * Math.max(0.25, Math.cos((lat * Math.PI) / 180));
  // Bearing where 0 deg = North (+lat), 90 deg = East (+lng)
  const bearing = ((Math.atan2(dLngDt, dLatDt) * 180) / Math.PI + 360) % 360;
  return { pos: [lat, lng], bearing };
}

function getFlightArcSamples(p1, p2, steps = 26) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    pts.push(getFlightCurvePointAndBearing(p1, p2, i / steps).pos);
  }
  return pts;
}

// Expedition Route Layer: Dashed flight curves, #1..#N badges & Follow-Cam Nano-Banana Airplane
const PLANE_ICON_STATIC = L.divIcon({
  className: 'bg-transparent border-none',
  html: `<div style="width:68px;height:68px;display:flex;align-items:center;justify-content:center;pointer-events:none;">
           <img
             id="expedition-plane-sprite"
             src="/badges/expedition_plane.png"
             style="width:58px;height:58px;object-fit:contain;transform:rotate(0deg) scale(1);filter:drop-shadow(0 6px 6px rgba(0,0,0,0.35));will-change:transform,filter;"
           />
         </div>`,
  iconSize: [68, 68],
  iconAnchor: [34, 34]
});

function ExpeditionRouteLayer({ routePins, showRouteLine, activeStepIdx, planeFlight }) {
  const map = useMap();
  const planeMarkerRef = useRef(null);
  const showPlane = routePins && routePins.length >= 2 && (activeStepIdx !== null || Boolean(planeFlight));
  const initialPos = routePins && routePins.length > 0 ? [routePins[0].lat, routePins[0].lng] : [50, 10];

  // Helper to update the airplane DOM sprite & Marker position directly at 60fps without React re-renders
  const applyPlaneTransform = (pos, bearing, altitudeScale, inFlight) => {
    if (planeMarkerRef.current) {
      planeMarkerRef.current.setLatLng(pos);
    }
    const imgEl = document.getElementById('expedition-plane-sprite');
    if (imgEl) {
      imgEl.style.transform = `rotate(${bearing.toFixed(1)}deg) scale(${altitudeScale.toFixed(3)})`;
      imgEl.style.filter = inFlight
        ? 'drop-shadow(0 16px 12px rgba(0,0,0,0.45))'
        : 'drop-shadow(0 5px 5px rgba(0,0,0,0.32))';
    }
  };

  // Follow-Cam Flight Animation: Camera stays locked directly above the airplane at a constant zoom level!
  useEffect(() => {
    if (!planeFlight || !routePins || routePins.length < 2 || !map) return;
    const fromPin = routePins[planeFlight.fromIdx];
    const toPin = routePins[planeFlight.toIdx];
    if (!fromPin || !toPin) return;

    const p1 = [fromPin.lat, fromPin.lng];
    const p2 = [toPin.lat, toPin.lng];

    // Calculate distance in km to pick a single comfortable cruising zoom level (avoids multi-zoom tile lag!)
    const distMeters = map.distance(p1, p2);
    const distKm = distMeters / 1000;
    const cruiseZoom =
      distKm < 20 ? 11 :
      distKm < 90 ? 9 :
      distKm < 350 ? 8 :
      distKm < 1200 ? 6 : 5;

    // Duration scales gently with distance (2.6s to 3.4s) with smooth cosine acceleration
    const durationMs = Math.min(3400, Math.max(2500, 2300 + Math.sqrt(distKm) * 22));
    const startTime = performance.now();
    let rafId;

    // Lock camera onto the departure pin at cruiseZoom before takeoff
    map.stop();
    map.setView(p1, cruiseZoom, { animate: false });

    const tick = (now) => {
      const rawT = Math.min(1, (now - startTime) / durationMs);
      // Smooth cosine ease-in-out so takeoff is gentle and never shoots away
      const easeT = 0.5 - 0.5 * Math.cos(Math.PI * rawT);
      const { pos, bearing } = getFlightCurvePointAndBearing(p1, p2, easeT);
      const altitudeScale = 1 + 0.32 * Math.sin(Math.PI * easeT);

      applyPlaneTransform(pos, bearing, altitudeScale, rawT < 1);
      // Keep camera locked directly above the airplane looking straight down!
      map.panTo(pos, { animate: false });

      if (rawT < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [planeFlight?.id]);

  // Position airplane when parked at a stop (before or without active flight)
  useEffect(() => {
    if (!routePins || routePins.length < 2 || activeStepIdx === null || planeFlight) return;
    const idx = Math.min(activeStepIdx, routePins.length - 1);
    const nextIdx = Math.min(idx + 1, routePins.length - 1);
    const p1 = [routePins[idx].lat, routePins[idx].lng];
    const p2 = [routePins[nextIdx].lat, routePins[nextIdx].lng];
    const { bearing } = idx !== nextIdx ? getFlightCurvePointAndBearing(p1, p2, 0) : { bearing: 0 };
    applyPlaneTransform(p1, bearing, 1, false);
  }, [routePins, activeStepIdx]);

  if (!routePins || routePins.length < 2) return null;

  const segments = [];
  if (showRouteLine) {
    for (let i = 0; i < routePins.length - 1; i++) {
      const a = routePins[i];
      const b = routePins[i + 1];
      const pts = getFlightArcSamples([a.lat, a.lng], [b.lat, b.lng], 26);
      const R = 6371;
      const dLat = ((b.lat - a.lat) * Math.PI) / 180;
      const dLng = ((b.lng - a.lng) * Math.PI) / 180;
      const hav =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
      const distKm = Math.round(R * 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav)));
      const isCompletedLeg = activeStepIdx === null || i < activeStepIdx;
      segments.push({
        id: `${a.id}_${b.id}_${i}`,
        idx: i,
        pts,
        distKm,
        fromName: a.location_name ? a.location_name.split(',')[0] : `Stopp #${i + 1}`,
        toName: b.location_name ? b.location_name.split(',')[0] : `Stopp #${i + 2}`,
        isCompletedLeg
      });
    }
  }

  return (
    <>
      {showRouteLine && segments.map(seg => (
        <Polyline
          key={seg.id}
          positions={seg.pts}
          pathOptions={{
            color: seg.isCompletedLeg ? '#dc2626' : '#94a3b8',
            weight: seg.isCompletedLeg ? 3.5 : 2.5,
            className: seg.isCompletedLeg ? 'expedition-route-line' : 'expedition-route-preview'
          }}
        >
          <Tooltip sticky direction="top">
            <div className="text-xs font-bold text-gray-800 px-1 py-0.5">
              ✈️ Etappe #{seg.idx + 1} ➔ #{seg.idx + 2}: {seg.fromName} ➔ {seg.toName} ({seg.distKm} km)
            </div>
          </Tooltip>
        </Polyline>
      ))}

      {/* Chronological Stop Badges (#1 .. #N) */}
      {showRouteLine && routePins.map((pin, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === routePins.length - 1;
        const isCurrent = activeStepIdx === idx;
        const badgeLabel = isFirst ? '🏁 #1' : isLast ? `📍 #${idx + 1}` : `#${idx + 1}`;
        const bgClass = isCurrent
          ? 'background:#dc2626;color:white;border:2px solid #fef08a;transform:scale(1.18);'
          : isFirst
            ? 'background:#16a34a;color:white;border:1.5px solid white;'
            : isLast
              ? 'background:#2563eb;color:white;border:1.5px solid white;'
              : 'background:#0f172a;color:#f8fafc;border:1.5px solid rgba(255,255,255,0.85);';
        return (
          <Marker
            key={`route_badge_${pin.id}_${idx}`}
            position={[pin.lat, pin.lng]}
            interactive={false}
            zIndexOffset={1400}
            icon={L.divIcon({
              className: 'bg-transparent border-none',
              html: `<div style="display:inline-flex;align-items:center;justify-content:center;padding:1px 6px;border-radius:999px;font-size:10px;font-weight:900;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.35);${bgClass}">${badgeLabel}</div>`,
              iconSize: [44, 20],
              iconAnchor: [22, 36]
            })}
          />
        );
      })}

      {/* Persistent Follow-Cam Airplane Marker (updated via ref at 60fps) */}
      {showPlane && (
        <Marker
          ref={planeMarkerRef}
          position={initialPos}
          interactive={false}
          zIndexOffset={2500}
          icon={PLANE_ICON_STATIC}
        />
      )}
    </>
  );
}

// Schneeflocken Effekt (Winter Wonderland)
const Snowflakes = () => {
  // Generiere 40 Schneeflocken mit zufälligen Werten
  const flakes = Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}vw`,
    animationDuration: `${Math.random() * 5 + 5}s`,
    animationDelay: `${Math.random() * 5}s`,
    opacity: Math.random() * 0.6 + 0.2,
    fontSize: `${Math.random() * 15 + 10}px`
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-[2000] overflow-hidden">
      {flakes.map(f => (
        <div key={f.id} className="snowflake" style={{
          left: f.left,
          animationDuration: f.animationDuration,
          animationDelay: f.animationDelay,
          opacity: f.opacity,
          fontSize: f.fontSize
        }}>
          ❄
        </div>
      ))}
    </div>
  );
};

// Zufällige Winter-Requisiten auf der Karte
const WinterAssets = () => {
  const map = useMap();
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    if (!map) return;
    const generateAssets = () => {
      if (map.getZoom() < 8) {
        setAssets([]);
        return;
      }
      const bounds = map.getBounds();
      const newAssets = Array.from({ length: 5 }).map((_, i) => {
        const lat = bounds.getSouth() + Math.random() * (bounds.getNorth() - bounds.getSouth());
        const lng = bounds.getWest() + Math.random() * (bounds.getEast() - bounds.getWest());
        const isReindeer = Math.random() > 0.5;
        return {
          id: i,
          pos: [lat, lng],
          icon: L.divIcon({
            html: `<div style="font-size: 32px; filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.3));">${isReindeer ? '🦌' : '🎁'}</div>`,
            className: 'bg-transparent border-none'
          })
        };
      });
      setAssets(newAssets);
    };

    map.on('moveend', generateAssets);
    generateAssets();
    return () => map.off('moveend', generateAssets);
  }, [map]);

  return assets.map(a => <Marker key={a.id} position={a.pos} icon={a.icon} interactive={false} />);
};

// Interaktives Halloween Geisterjäger-Minigame (Spooky Kompass & Verstecke ab Zoom 13+)
const HalloweenAssets = ({ pins, onCatch, onCompassUpdate }) => {
  const map = useMap();
  const [targetCluster, setTargetCluster] = useState(null);
  const [currentZoom, setCurrentZoom] = useState(map ? map.getZoom() : 5);

  // Spawn 1 hidden ghost (plus 2 spider traps) near a random real pin (or peak)
  const spawnNewTarget = (excludeLat = null, excludeLng = null) => {
    const pool = (pins && pins.length > 0) ? pins : PEAKS;
    let candidates = pool;
    if (excludeLat !== null && pool.length > 1) {
      const filtered = pool.filter(p => Math.hypot(p.lat - excludeLat, p.lng - excludeLng) > 0.02);
      if (filtered.length > 0) candidates = filtered;
    }
    const anchor = candidates[Math.floor(Math.random() * candidates.length)];
    // Offset by ~150m to 650m around the pin so you have to search the neighborhood!
    const angle = Math.random() * Math.PI * 2;
    const distDeg = 0.0015 + Math.random() * 0.0045;
    const ghostLat = anchor.lat + Math.sin(angle) * distDeg;
    const ghostLng = anchor.lng + (Math.cos(angle) * distDeg) / Math.max(0.2, Math.cos(anchor.lat * Math.PI / 180));

    const isGolden = Math.random() < 0.14; // 14% chance for rare Golden Pumpkin (+3)
    const spookyTypes = [
      { emoji: '👻', label: 'Schattengeist gefangen!', points: 1, glow: 'rgba(168,85,247,0.75)' },
      { emoji: '🦇', label: 'Nachtfledermaus erwischt!', points: 1, glow: 'rgba(239,68,68,0.75)' },
      { emoji: '🎃', label: 'Kürbisgeist geschnappt!', points: 1, glow: 'rgba(249,115,22,0.8)' }
    ];
    const mainType = isGolden
      ? { emoji: '🎃', label: ' Goldener Kürbisgeist! (+3)', points: 3, glow: 'rgba(250,204,21,0.95)', isGolden: true }
      : spookyTypes[Math.floor(Math.random() * spookyTypes.length)];

    const mainEntity = {
      id: `ghost_main_${Date.now()}`,
      pos: [ghostLat, ghostLng],
      isTrap: false,
      ...mainType,
      icon: L.divIcon({
        html: `<div class="spooky-entity-stealth" style="font-size: ${isGolden ? '23px' : '19px'}; filter: drop-shadow(0px 0px ${isGolden ? '10px' : '6px'} ${mainType.glow});" title="Schnapp mich!"><span>${mainType.emoji}</span></div>`,
        className: 'bg-transparent border-none',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      })
    };

    // Spawn 2 sneaky Spider Traps nearby (within 250m-500m of the ghost)
    const traps = [0, 1].map(idx => {
      const tAngle = Math.random() * Math.PI * 2;
      const tDist = 0.0018 + Math.random() * 0.0035;
      return {
        id: `trap_${Date.now()}_${idx}`,
        pos: [
          ghostLat + Math.sin(tAngle) * tDist,
          ghostLng + (Math.cos(tAngle) * tDist) / Math.max(0.2, Math.cos(ghostLat * Math.PI / 180))
        ],
        emoji: '🕷️',
        label: 'Saures! Giftspinne erwischt (-1)',
        points: -1,
        isTrap: true,
        icon: L.divIcon({
          html: `<div class="spooky-entity-stealth" style="font-size: 18px; animation-delay: -${idx + 1.2}s; filter: drop-shadow(0px 0px 5px rgba(220,38,38,0.7));" title="Vorsicht..."><span>🕷️</span></div>`,
          className: 'bg-transparent border-none',
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        })
      };
    });

    setTargetCluster({
      ghostPos: [ghostLat, ghostLng],
      hintLocation: anchor.location_name || anchor.name || 'Geheimer Ort',
      entities: [mainEntity, ...traps]
    });
  };

  useEffect(() => {
    spawnNewTarget();
  }, [pins?.length > 0]);

  // Calculate live bearing & distance from map center to the hidden ghost
  useEffect(() => {
    if (!map || !targetCluster) return;

    const updateCompass = () => {
      const z = map.getZoom();
      setCurrentZoom(z);
      const center = map.getCenter();
      const [gLat, gLng] = targetCluster.ghostPos;

      // Distance in meters
      const distMeters = map.distance([center.lat, center.lng], [gLat, gLng]);

      // Bearing in degrees (0 = North, 90 = East, 180 = South, 270 = West)
      const lat1 = center.lat * Math.PI / 180;
      const lat2 = gLat * Math.PI / 180;
      const dLon = (gLng - center.lng) * Math.PI / 180;
      const y = Math.sin(dLon) * Math.cos(lat2);
      const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
      const brng = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

      onCompassUpdate({
        bearing: Math.round(brng),
        distanceMeters: Math.round(distMeters),
        zoom: z,
        isVisible: z >= 13,
        hintLocation: targetCluster.hintLocation
      });
    };

    map.on('move', updateCompass);
    map.on('zoomend', updateCompass);
    updateCompass();
    return () => {
      map.off('move', updateCompass);
      map.off('zoomend', updateCompass);
    };
  }, [map, targetCluster]);

  if (!targetCluster || currentZoom < 13) {
    // Below zoom 13, the ghost is completely invisible! You must use the Spooky Compass and zoom in!
    return null;
  }

  return targetCluster.entities.map(entity => (
    <Marker
      key={entity.id}
      position={entity.pos}
      icon={entity.icon}
      interactive={true}
      zIndexOffset={1600}
      eventHandlers={{
        click: (e) => {
          if (e && e.originalEvent) e.originalEvent.stopPropagation();
          onCatch(entity, e?.originalEvent);
          // Immediately teleport ghost cluster to a brand new location!
          spawnNewTarget(targetCluster.ghostPos[0], targetCluster.ghostPos[1]);
        }
      }}
    />
  ));
};

const PEAKS = [
  { id: 'zugspitze', lat: 47.421, lng: 10.985, alt: 2962, name: 'Zugspitze (Bayern)', img: '/badges/peak_zugspitze.jpg' },
  { id: 'feldberg', lat: 47.873, lng: 8.004, alt: 1493, name: 'Feldberg (BaWü)', img: '/badges/peak_feldberg.jpg' },
  { id: 'fichtelberg', lat: 50.429, lng: 12.954, alt: 1215, name: 'Fichtelberg (Sachsen)', img: '/badges/peak_fichtelberg.jpg' },
  { id: 'brocken', lat: 51.799, lng: 10.615, alt: 1141, name: 'Brocken (Sachsen-Anhalt)', img: '/badges/peak_brocken.jpg' },
  { id: 'beerberg', lat: 50.658, lng: 9.746, alt: 983, name: 'Großer Beerberg (Thüringen)', img: '/badges/peak_beerberg.jpg' },
  { id: 'wurmberg', lat: 51.756, lng: 10.617, alt: 971, name: 'Wurmberg (Niedersachsen)', img: '/badges/peak_wurmberg.jpg' },
  { id: 'wasserkuppe', lat: 50.498, lng: 9.937, alt: 950, name: 'Wasserkuppe (Hessen)', img: '/badges/peak_wasserkuppe.jpg' },
  { id: 'langenberg', lat: 51.275, lng: 8.525, alt: 843, name: 'Langenberg (NRW)', img: '/badges/peak_langenberg.jpg' },
  { id: 'erbeskopf', lat: 49.730, lng: 7.089, alt: 816, name: 'Erbeskopf (RLP)', img: '/badges/peak_erbeskopf.jpg' },
  { id: 'dollberg', lat: 49.629, lng: 7.017, alt: 695, name: 'Dollberg (Saarland)', img: '/badges/peak_dollberg.jpg' },
  { id: 'kutschenberg', lat: 51.423, lng: 13.722, alt: 201, name: 'Kutschenberg (Brandenburg)', img: '/badges/peak_kutschenberg.jpg' },
  { id: 'helpterberge', lat: 53.483, lng: 13.606, alt: 179, name: 'Helpter Berge (MV)', img: '/badges/peak_helpterberge.jpg' },
  { id: 'bungsberg', lat: 54.212, lng: 10.723, alt: 168, name: 'Bungsberg (SH)', img: '/badges/peak_bungsberg.jpg' },
  { id: 'hasselbrack', lat: 53.431, lng: 9.865, alt: 116, name: 'Hasselbrack (Hamburg)', img: '/badges/peak_hasselbrack.jpg' },
  { id: 'mueggelberge', lat: 52.416, lng: 13.639, alt: 115, name: 'Müggelberge (Berlin)', img: '/badges/peak_mueggelberge.jpg' },
  { id: 'friedehorstpark', lat: 53.169, lng: 8.675, alt: 32, name: 'Friedehorstpark (Bremen)', img: '/badges/peak_friedehorstpark.jpg' }
];

const sessionLocks = new Set();

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const ONBOARDING_STEPS = [
  { icon: '🌍', title: 'Willkommen bei Geophysalis!', desc: 'Das globale Sticker-Abenteuer. Klebe deinen Sticker überall auf der Welt und verewige dich auf unserer Weltkarte.' },
  { icon: '📍', title: 'Sticker setzen', desc: 'Tippe auf den blauen „Sticker setzen"-Knopf, wähle einen Standort und lade ein Foto deines geklebten Stickers hoch!' },
  { icon: '🏆', title: 'Achievements sammeln', desc: 'Schalte mit jedem Sticker epische 8-Bit-Abzeichen frei! Wirst du der erste Weltenbummler?' },
  { icon: '✨', title: 'Bereit zum Erkunden!', desc: 'Die ersten 15 Nutzer erhalten das exklusive Pionier-Abzeichen 🌟. Also worauf wartest du noch?' },
];

function OnboardingModal({ onClose }) {
  const [step, setStep] = useState(0);
  const current = ONBOARDING_STEPS[step];
  const isLast = step === ONBOARDING_STEPS.length - 1;
  return (
    <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
        <div className="text-6xl mb-4">{current.icon}</div>
        <h2 className="text-2xl font-black text-gray-900 mb-3">{current.title}</h2>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">{current.desc}</p>
        <div className="flex justify-center gap-2 mb-6">
          {ONBOARDING_STEPS.map((_, i) => (
            <div key={i} className={`h-2 rounded-full transition-all ${i === step ? 'w-6 bg-blue-600' : 'w-2 bg-gray-200'}`} />
          ))}
        </div>
        <button
          onClick={() => { if (isLast) { onClose(); } else { setStep(s => s + 1); } }}
          className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition transform hover:scale-105"
        >
          {isLast ? 'Los geht\'s! 🚀' : 'Weiter →'}
        </button>
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} className="mt-2 text-xs text-gray-400 hover:text-gray-600 transition">
            ← Zurück
          </button>
        )}
      </div>
    </div>
  );
}

const COUNTRY_MAP = {
  'deutschland': 'germany',
  'österreich': 'austria',
  'schweiz': 'switzerland',
  'italien': 'italy',
  'tschechien': 'czechia',
  'spanien': 'spain',
  'frankreich': 'france',
  'niederlande': 'netherlands',
  'belgien': 'belgium',
  'polen': 'poland',
  'dänemark': 'denmark',
  'schweden': 'sweden',
  'norwegen': 'norway',
  'finnland': 'finland',
  'griechenland': 'greece',
  'türkei': 'turkey',
  'kroatien': 'croatia',
  'portugal': 'portugal',
  'vereinigte staaten': 'united states',
  'großbritannien': 'united kingdom',
  'england': 'united kingdom',
  'ägypten': 'egypt',
  'marokko': 'morocco'
};

function VisitedCountriesMap({ visitedCountries }) {
  return (
    <ComposableMap
      projection="geoEquirectangular"
      width={800}
      height={400}
      projectionConfig={{ scale: 140, center: [0, 10] }}
      style={{ width: '100%', height: 'auto', maxHeight: '180px' }}
    >
      <Geographies geography={GEO_URL}>
        {({ geographies }) =>
          geographies.map(geo => {
            const geoName = geo.properties?.name;
            if (geoName === "Antarctica") return null;
            
            const isVisited = [...visitedCountries].some(c => {
              if (!c || !geoName) return false;
              const cName = c.toLowerCase();
              const gName = geoName.toLowerCase();
              const mapped = COUNTRY_MAP[cName] || cName;
              return gName.includes(mapped) || mapped.includes(gName);
            });
            return (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill={isVisited ? '#f97316' : '#e5e7eb'}
                stroke="#ffffff"
                strokeWidth={0.5}
                style={{
                  default: { outline: 'none' },
                  hover: { outline: 'none', fill: isVisited ? '#ea580c' : '#d1d5db' },
                  pressed: { outline: 'none' }
                }}
              />
            );
          })
        }
      </Geographies>
    </ComposableMap>
  );
}

export default function MapView() {
  const [map, setMap] = useState(null);
  const [pins, setPins] = useState([]);
  
  // Auth & Session
  const [session, setSession] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [profile, setProfile] = useState(null);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [showEarthZoom, setShowEarthZoom] = useState(localStorage.getItem('geophysalis_earth_zoom_done') !== 'true');

  // Pre-Release Lockout
  const RELEASE_DATE = new Date('2026-10-01T10:00:00Z'); // 12:00 Berlin time
  const isPreRelease = new Date() < RELEASE_DATE;

  useEffect(() => {
    if (session && profile) {
      if (isPreRelease && !profile.is_admin) {
        alert('Die Website startet offiziell erst am 01.10.2026 um 12:00 Uhr! Bis dahin ist der Login nur für Administratoren freigeschaltet. Bitte habe noch etwas Geduld.');
        supabase.auth.signOut();
        setSession(null);
        setProfile(null);
      }
    }
  }, [session, profile, isPreRelease]);
  const [tempNickname, setTempNickname] = useState("");
  const [showOnlyMyPins, setShowOnlyMyPins] = useState(false);

  // Admin
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [unapprovedPins, setUnapprovedPins] = useState([]);

  // Leaderboard
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState('alltime'); // weekly, monthly, alltime
  const [allProfiles, setAllProfiles] = useState({});
  const [selectedPlayerCard, setSelectedPlayerCard] = useState(null);
  const [playerMapFilter, setPlayerMapFilter] = useState(null);

  // Avatar State
  const [editAvatar, setEditAvatar] = useState('default');
  const [activeFrame, setActiveFrame] = useState('none');
  const [editFrame, setEditFrame] = useState('none');
  const [globalAchievements, setGlobalAchievements] = useState([]);
  const [globalsLoaded, setGlobalsLoaded] = useState(false);
  const claimedInSessionRef = useRef(new Set());
  const isClaimingRef = useRef(false);
  const shareCardRef = useRef(null);
  const [isSharing, setIsSharing] = useState(false);

  const handleShareCard = async () => {
    if (!shareCardRef.current) return;
    setIsSharing(true);
    try {
      const blob = await htmlToImage.toBlob(shareCardRef.current, { 
        pixelRatio: 2,
        backgroundColor: '#0f172a'
      });
      if (!blob) throw new Error("Blob failed");
      
      // Wrapper to keep the structure the same
      (async (blob) => {
        if (!blob) throw new Error("Blob failed");
        
        const file = new File([blob], 'geophysalis_profil.png', { type: 'image/png' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Geophysalis Profil',
            text: 'Schau dir mein Geophysalis Profil an! 🌍📍',
            files: [file]
          }).catch(console.error);
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'geophysalis_profil.png';
          a.click();
          URL.revokeObjectURL(url);
          alert('Dein Profil-Bild wurde heruntergeladen! Teile es auf Social Media.');
        }
      })(blob);
    } catch (e) {
      console.error(e);
      alert('Fehler beim Erstellen des Bildes: ' + e.message);
    } finally {
      setIsSharing(false);
    }
  };

  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [profileTab, setProfileTab] = useState('profil');
  const [badgeFilter, setBadgeFilter] = useState('all');
  const [openAccordion, setOpenAccordion] = useState('Exklusiv & Limitiert');
  const GHOST_GOAL = 20;
  const [ghostHuntActive, setGhostHuntActive] = useState(true);
  const [spookyCollapsed, setSpookyCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
  const [ghostsCaught, setGhostsCaught] = useState(() => parseInt(localStorage.getItem('geophysalis_ghosts_caught_2026') || '0', 10));
  const [spookyPopups, setSpookyPopups] = useState([]);
  const [spookyToast, setSpookyToast] = useState(null);
  const [spookyCompass, setSpookyCompass] = useState({ bearing: 0, distanceMeters: 0, zoom: 5, isVisible: false, hintLocation: '' });
  const hasGhostHunter = devMode || ghostsCaught >= GHOST_GOAL;

  const handleCatchGhost = (asset, domEvent) => {
    const x = domEvent?.clientX || window.innerWidth / 2;
    const y = domEvent?.clientY || window.innerHeight / 2;
    const popId = Date.now() + Math.random();
    const delta = asset.points || 1;
    const signStr = delta > 0 ? `+${delta}` : `${delta}`;
    setSpookyPopups(prev => [...prev, { id: popId, x, y, emoji: asset.emoji, signStr, label: asset.label, isTrap: asset.isTrap }]);
    setTimeout(() => {
      setSpookyPopups(prev => prev.filter(p => p.id !== popId));
    }, 1300);

    if (!asset.isTrap) {
      confetti({
        particleCount: delta >= 3 ? 55 : 24,
        spread: 60,
        origin: { x: x / window.innerWidth, y: y / window.innerHeight },
        colors: ['#f97316', '#a855f7', '#fde047', '#22c55e']
      });
    }

    setGhostsCaught(prev => {
      const next = Math.max(0, prev + delta);
      localStorage.setItem('geophysalis_ghosts_caught_2026', next.toString());
      if (prev < GHOST_GOAL && next >= GHOST_GOAL) {
        confetti({ particleCount: 140, spread: 95, origin: { y: 0.6 }, colors: ['#f97316', '#a855f7', '#fde047'] });
        setUnlockedAchievements(u => [...u, {
          title: 'Meister-Geisterjäger 👻🎃',
          text: `Unglaublich! Du hast mit dem Spooky-Kompass ${GHOST_GOAL} versteckte Geister aufgespürt! Das Geisterjäger-Abzeichen, der Kürbis-Avatar 🎃 und der Spooky-Rahmen gehören dir!`,
          img: '/badges/badge_ghosthunter.jpg',
          icon: '🎃'
        }]);
      }
      return next;
    });
  };
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  useEffect(() => {
    if (!localStorage.getItem('geophysalis_onboarded')) {
      setShowOnboarding(true);
    }
  }, []);

  // Feature Toggles
  const FEATURE_AVATARS = true;

  useEffect(() => {
    if (profile) {
      setEditAvatar(profile.avatar || 'default');
      setEditFrame(profile.frame_style || 'none');
    }
  }, [profile]);

  // Achievements Logic
  const myPins = session ? pins.filter(p => p.user_id === session.user.id) : [];

  const getUnlockDate = (badgeName) => {
    if (!myPins || myPins.length === 0) return null;
    const sorted = [...myPins].sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
    
    let matching = [];
    if (badgeName === 'firstStep') return new Date(sorted[0].created_at).toLocaleDateString('de-DE');
    if (badgeName === 'localHero') return sorted.length >= 5 ? new Date(sorted[4].created_at).toLocaleDateString('de-DE') : null;
    if (badgeName === 'retroGamer') return sorted.length >= 10 ? new Date(sorted[9].created_at).toLocaleDateString('de-DE') : null;
    if (badgeName === 'pioneer') matching = sorted.filter(p => new Date(p.created_at) < new Date('2026-11-01'));
    if (badgeName === 'polar') matching = sorted.filter(p => Math.abs(p.lat) >= 60);
    if (badgeName === 'urban') matching = sorted.filter(p => p.location_name && /berlin|new york|london|tokyo|paris|sydney|los angeles/i.test(p.location_name));
    if (badgeName === 'nightOwl') matching = sorted.filter(p => { const h = new Date(p.created_at).getHours(); return h >= 22 || h <= 4; });
    if (badgeName === 'earlyBird') matching = sorted.filter(p => { const h = new Date(p.created_at).getHours(); return h >= 5 && h <= 8; });
    if (badgeName === 'halloween') matching = sorted.filter(p => { const m = new Date(p.created_at).getMonth(); const d = new Date(p.created_at).getDate(); return (m === 9 && d >= 25) || (m === 10 && d <= 5); });
    if (badgeName === 'winter') matching = sorted.filter(p => new Date(p.created_at).getMonth() === 11);
    if (badgeName === 'pi') matching = sorted.filter(p => (Math.abs(p.lat) >= 3.14 && Math.abs(p.lat) < 3.15) || (Math.abs(p.lng) >= 3.14 && Math.abs(p.lng) < 3.15));
    if (badgeName === 'may4') matching = sorted.filter(p => { const d = new Date(p.created_at); return d.getMonth() === 4 && d.getDate() === 4; });
    if (badgeName === 'love') matching = sorted.filter(p => { const d = new Date(p.created_at); return d.getMonth() === 1 && d.getDate() === 14; });
    if (badgeName === 'silvester') matching = sorted.filter(p => { const d = new Date(p.created_at); const m = d.getMonth(); const day = d.getDate(); return (m === 11 && day === 31) || (m === 0 && day === 1); });
    if (badgeName === 'nz') matching = sorted.filter(p => p.lat >= -47.5 && p.lat <= -34 && p.lng >= 165 && p.lng <= 179);
    if (badgeName === 'ushuaia') matching = sorted.filter(p => p.lat >= -56 && p.lat <= -53 && p.lng >= -69 && p.lng <= -66);
    
    if (matching.length > 0) return new Date(matching[0].created_at).toLocaleDateString('de-DE');
    return null;
  };

  const isAdmin = profile?.is_admin === true;

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();
  const isHalloweenActive = (currentMonth === 9 && currentDay >= 25) || (currentMonth === 10 && currentDay <= 5);
  const isWinterActive = currentMonth === 11;
  
  const hasFirstStep = myPins.length >= 1;
  const hasLocalHero = myPins.length >= 5;
  const hasRetroGamer = myPins.length >= 10;
  const hasPioneerGlobal = globalAchievements.some(g => g.achievement_id.startsWith('pioneer_') && g.user_id === session?.user?.id);
  const hasPioneer = devMode || hasPioneerGlobal;
  const myPioneerEntry = globalAchievements.find(g => g.achievement_id.startsWith('pioneer_') && g.user_id === session?.user?.id);
  const myPioneerRank = myPioneerEntry ? myPioneerEntry.achievement_id.split('_')[1] : null;
  
  const hasPolarExplorer = myPins.some(p => Math.abs(p.lat) >= 60);
  const hasUrbanLegend = myPins.some(p => {
    if (!p.location_name) return false;
    return /berlin|new york|london|tokyo|paris|sydney|los angeles/i.test(p.location_name);
  });
  
  // Streak Berechnung
  const hasMarathon = (() => {
    const dates = myPins.map(p => new Date(p.created_at).toISOString().split('T')[0]);
    const uniqueDates = [...new Set(dates)].sort();
    let maxStreak = 1;
    let currentStreak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i-1]);
      const currDate = new Date(uniqueDates[i]);
      const diffTime = Math.abs(currDate - prevDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      if (diffDays === 1) {
        currentStreak++;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
      } else {
        currentStreak = 1;
      }
    }
    return maxStreak >= 3;
  })();

  
  
  const fetchGlobals = async () => {
    try {
      const { data } = await supabase.from('global_achievements').select('*');
      if (data) setGlobalAchievements(data);
      setGlobalsLoaded(true);
    } catch(e) {}
  };

  useEffect(() => {
    fetchGlobals();
    fetchAllProfiles();
  }, []);

  const isNearCoords = (lat1, lon1, lat2, lon2, maxKm) => {
    const R = 6371; 
    const dLat = (lat1 - lat2) * Math.PI / 180;
    const dLng = (lon1 - lon2) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat2 * Math.PI / 180) * Math.cos(lat1 * Math.PI / 180) * Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c) < maxKm;
  };

  useEffect(() => {
    if (!session?.user?.id || myPins.length === 0 || !globalsLoaded) return;
    
    // Only run this check once every time myPins changes to avoid infinite loops
    const checkClaims = async () => {
      let newUnlocks = [];
      let claimsMade = false;
      
      // 1. Mitte der EU (49.843, 9.902)
      if (!globalAchievements.some(g => g.achievement_id === 'eu_center')) {
         const euPin = myPins.find(p => isNearCoords(p.lat, p.lng, 49.843, 9.902, 1.0));
         if (euPin) {
            const { error } = await supabase.from('global_achievements').insert({ achievement_id: 'eu_center', user_id: session.user.id });
            if (!error) { 
              newUnlocks.push({ title: "Mitte der EU", text: "Wahnsinn! Du hast die geografische Mitte der EU als Allererster gefunden! (Globales Limit: 1)", img: '/badges/badge_eu.png' });
              claimsMade = true; 
            }
         }
      }

      // 2. Gipfeli Peaks (Die 16 höchsten Punkte der Bundesländer)
      const peaks = PEAKS;

      for (let peak of peaks) {
         if (!globalAchievements.some(g => g.achievement_id === `gipfeli_${peak.id}`)) {
            const peakPin = myPins.find(p => isNearCoords(p.lat, p.lng, peak.lat, peak.lng, 0.3));
            if (peakPin) {
               const { error } = await supabase.from('global_achievements').insert({ achievement_id: `gipfeli_${peak.id}`, user_id: session.user.id });
               if (!error) {
                 newUnlocks.push({ title: `Gipfeli: ${peak.name}`, text: `Glückwunsch! Du hast den höchsten Punkt (${peak.name}, ${peak.alt}m) als Allererster weltweit gesichert!`, img: peak.img, icon: '🏔️' });
                 claimsMade = true;
               }
            }
         }
      }
      
      // 3. Pionier der ersten Stunde (Max 15)
      if (!globalAchievements.some(g => g.achievement_id.startsWith('pioneer_') && g.user_id === session.user.id)) {
        const pioneers = globalAchievements.filter(g => g.achievement_id.startsWith('pioneer_'));
        if (pioneers.length < 15 && myPins.length > 0) {
           for (let i = 1; i <= 15; i++) {
              if (!pioneers.some(p => p.achievement_id === `pioneer_${i}`)) {
                 const { error } = await supabase.from('global_achievements').insert({ achievement_id: `pioneer_${i}`, user_id: session.user.id });
                 if (!error) {
                   newUnlocks.push({ title: "Pionier der ersten Stunde", text: `Willkommen im exklusiven Club! Du bist Pionier Nr. ${i} von 15 weltweit!`, icon: '🌟' });
                   claimsMade = true;
                   break;
                 }
              }
           }
        }
      }

      if (claimsMade) fetchGlobals();
      if (newUnlocks.length > 0) {
        setUnlockedAchievements(prev => [...prev, ...newUnlocks]);
      }
    };

    checkClaims();
  }, [myPins, session]); // do not depend on globalAchievements directly to prevent infinite loop

  const hasEuCenter = globalAchievements.some(g => g.achievement_id === 'eu_center' && g.user_id === session?.user?.id);
  const euOwner = globalAchievements.find(g => g.achievement_id === 'eu_center')?.user_id;


  const myGipfeliObjs = globalAchievements.filter(g => g.achievement_id.startsWith('gipfeli_') && g.user_id === session?.user?.id);
  const myGipfeliObj = myGipfeliObjs[0] || null;
  const myGipfeliPeakId = myGipfeliObj ? myGipfeliObj.achievement_id.split('_')[1] : null;
  const myGipfeliPeakName = myGipfeliObjs.map(g => PEAKS.find(p => p.id === g.achievement_id.split('_')[1])?.name).filter(Boolean).join(', ') || null;


const isNearPeak = (lat, lng) => {
    const peaks = [
      { name: 'Zugspitze', lat: 47.421, lng: 10.985 },
      { name: 'Feldberg', lat: 47.873, lng: 8.004 },
      { name: 'Brocken', lat: 51.799, lng: 10.615 },
      { name: 'Dufourspitze', lat: 45.936, lng: 7.866 },
      { name: 'Matterhorn', lat: 45.976, lng: 7.658 },
      { name: 'Großglockner', lat: 47.074, lng: 12.693 }
    ];
    const R = 6371; 
    for (let peak of peaks) {
      const dLat = (lat - peak.lat) * Math.PI / 180;
      const dLng = (lng - peak.lng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(peak.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      if (R * c < 0.3) return true; // Within 300m
    }
    return false;
  };

  const hasYinYang = myPins.some(p => p.lat > 0) && myPins.some(p => p.lat < 0);
  const hasGipfeli = myGipfeliObjs.length > 0;
  const hasVivaldi = (() => {
    let seasons = new Set();
    myPins.forEach(p => {
      const m = new Date(p.created_at).getMonth();
      if (m >= 2 && m <= 4) seasons.add('spring');
      else if (m >= 5 && m <= 7) seasons.add('summer');
      else if (m >= 8 && m <= 10) seasons.add('autumn');
      else seasons.add('winter');
    });
    return seasons.size === 4;
  })();

  const hasTier5 = myPins.length >= 5;
  const hasTier10 = myPins.length >= 10;
  const hasTier50 = myPins.length >= 50;
  const hasTier100 = myPins.length >= 100;
  const has6Kontinente = false; // TODO when quota resets

const hasNightOwl = myPins.some(p => {
    const hours = new Date(p.created_at).getHours();
    return hours >= 22 || hours <= 4;
  });

  const hasEarlyBird = myPins.some(p => {
    const hours = new Date(p.created_at).getHours();
    return hours >= 5 && hours <= 8;
  });

  const hasHalloween = myPins.some(p => {
    const d = new Date(p.created_at);
    const m = d.getMonth(); // 0 = Jan, 9 = Okt, 10 = Nov
    const day = d.getDate();
    return (m === 9 && day >= 25) || (m === 10 && day <= 5);
  });

  const hasWinter = myPins.some(p => new Date(p.created_at).getMonth() === 11); // Dez
  
  const hasPi = myPins.some(p => (Math.abs(p.lat) >= 3.14 && Math.abs(p.lat) < 3.15) || (Math.abs(p.lng) >= 3.14 && Math.abs(p.lng) < 3.15));
  const hasMay4 = myPins.some(p => { const d = new Date(p.created_at); return d.getMonth() === 4 && d.getDate() === 4; });
  const hasLove = myPins.some(p => { const d = new Date(p.created_at); return d.getMonth() === 1 && d.getDate() === 14; });
  const hasSilvester = myPins.some(p => { const d = new Date(p.created_at); const m = d.getMonth(); const day = d.getDate(); return (m === 11 && day === 31) || (m === 0 && day === 1); });
  const hasNz = myPins.some(p => p.lat >= -47.5 && p.lat <= -34 && p.lng >= 165 && p.lng <= 179);
  const hasUshuaia = myPins.some(p => p.lat >= -56 && p.lat <= -53 && p.lng >= -69 && p.lng <= -66);
  
  const uniqueCountries = new Set(
    myPins.map(p => {
      if (!p.location_name) return null;
      const parts = p.location_name.split(',');
      return parts[parts.length - 1].trim();
    }).filter(Boolean)
  );
  const hasWorldTraveler = uniqueCountries.size >= 3;
  
  // --- New Automated Badges ---
  const hasTimeIsRelativ = (() => {
    if (myPins.length < 2) return false;
    const sorted = [...myPins].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    for (let i = 0; i < sorted.length - 1; i++) {
      const diffHrs = (new Date(sorted[i+1].created_at) - new Date(sorted[i].created_at)) / (1000 * 60 * 60);
      if (diffHrs <= 24 && Math.abs(sorted[i].lng - sorted[i+1].lng) >= 15) return true;
    }
    return false;
  })();

  const EU_COUNTRIES = ['germany', 'deutschland', 'austria', 'österreich', 'france', 'frankreich', 'italy', 'italien', 'spain', 'spanien', 'poland', 'polen', 'sweden', 'schweden', 'netherlands', 'niederlande', 'belgium', 'belgien', 'czechia', 'tschechien', 'denmark', 'dänemark', 'finland', 'finnland', 'greece', 'griechenland', 'portugal', 'romania', 'rumänien', 'hungary', 'ungarn', 'slovakia', 'slowakei', 'ireland', 'irland', 'croatia', 'kroatien', 'bulgaria', 'bulgarien', 'lithuania', 'litauen', 'slovenia', 'slowenien', 'latvia', 'lettland', 'estonia', 'estland', 'cyprus', 'zypern', 'luxembourg', 'luxemburg', 'malta'];
  const hasEU = uniqueCountries.size >= 5 && [...uniqueCountries].some(c => EU_COUNTRIES.includes(c.toLowerCase())); 

  const hasDGG2027 = myPins.some(p => {
    const d = new Date(p.created_at);
    return d.getFullYear() === 2027 && p.lat > 50.7 && p.lat < 50.9 && p.lng > 5.9 && p.lng < 6.2;
  });

  const hasGAP2027 = myPins.some(p => {
    const d = new Date(p.created_at);
    return d.getFullYear() === 2027 && p.lat > 50.8 && p.lat < 51.0 && p.lng > 13.2 && p.lng < 13.5;
  });

  const [resolvedElevations, setResolvedElevations] = useState({});

  useEffect(() => {
    const missing = myPins.filter(p => (p.altitude === null || p.altitude === undefined) && resolvedElevations[p.id] === undefined);
    if (missing.length === 0) return;
    const lats = missing.map(p => p.lat).join(',');
    const lngs = missing.map(p => p.lng).join(',');
    fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`)
      .then(r => r.json())
      .then(data => {
        if (data && Array.isArray(data.elevation)) {
          const next = {};
          missing.forEach((p, idx) => {
            const elev = data.elevation[idx];
            if (typeof elev === 'number') {
              next[p.id] = Math.round(elev);
              supabase.from('pins').update({ altitude: Math.round(elev) }).eq('id', p.id).then(() => {});
            }
          });
          setResolvedElevations(prev => ({ ...prev, ...next }));
        }
      })
      .catch(() => {});
  }, [myPins]);

  const getPinAltitude = (p) => {
    if (typeof p.altitude === 'number') return p.altitude;
    if (typeof resolvedElevations[p.id] === 'number') return resolvedElevations[p.id];
    const matchedPeak = PEAKS.find(pk => pk.alt && isNearCoords(p.lat, p.lng, pk.lat, pk.lng, 0.5));
    if (matchedPeak) return matchedPeak.alt;
    return 0;
  };

  const hasGipfeliOver1000 = myGipfeliObjs.some(g => {
    const pk = PEAKS.find(p => p.id === g.achievement_id.split('_')[1]);
    return pk && pk.alt >= 1000;
  });
  const hasGipfeliOver2000 = myGipfeliObjs.some(g => {
    const pk = PEAKS.find(p => p.id === g.achievement_id.split('_')[1]);
    return pk && pk.alt >= 2000;
  });

  const hasBerggams = hasGipfeliOver2000 || myPins.some(p => getPinAltitude(p) >= 2000);
  const hasSteinbock = myPins.some(p => getPinAltitude(p) >= 3000);
  const hasLuft = myPins.some(p => getPinAltitude(p) >= 7000);

  // --- Manual Badges (from special_badge column) ---
  const manualBadges = new Set(myPins.map(p => p.special_badge).filter(Boolean));
  const hasAtlantis = manualBadges.has('atlantis');
  const hasUnterTage = manualBadges.has('unter_tage');
  const hasLostPlace = manualBadges.has('lost_place');
  const hasAurora = manualBadges.has('aurora');
  const hasSonnenfinsternis = manualBadges.has('sonnenfinsternis');
  const hasCoop = manualBadges.has('coop');
  const hasOG = manualBadges.has('og');
  const hasWuestenfuchs = manualBadges.has('wuestenfuchs');
  const hasDreilaendereck = manualBadges.has('dreilaendereck');
  const hasMariana = manualBadges.has('mariana');
  const hasAlpinist = hasGipfeliOver1000 || myPins.some(p => getPinAltitude(p) >= 1000);
  const hasSafari = manualBadges.has('safari');
  const hasPenguin = manualBadges.has('penguin');
  const hasBermuda = manualBadges.has('bermuda');
  const hasArea51 = manualBadges.has('area51');
  // Globetrotter (6 Kontinente)
  const getContinent = (lat, lng) => {
    if (lat < -60) return 'Antarktika';
    if (lat > 15 && lng < -30) return 'Nordamerika';
    if (lat <= 15 && lng < -30) return 'Südamerika';
    if (lat > 35 && lng >= -30 && lng < 40) return 'Europa';
    if (lat <= 35 && lat > -35 && lng >= -20 && lng < 50) return 'Afrika';
    if (lat > -10 && lng >= 40 && lng < 180) return 'Asien';
    if (lat <= -10 && lng >= 100) return 'Ozeanien';
    return 'Asien';
  };
  const continentsVisited = new Set(myPins.map(p => getContinent(p.lat, p.lng)));
  const hasGlobetrotter = continentsVisited.size >= 6;

  // Grenzgänger (2 Pins in <10km, aber versch. Länder)
  const hasBorderCrosser = useMemo(() => {
    if (myPins.length < 2 || uniqueCountries.size < 2) return false;
    const getCountry = (p) => {
      if (!p.location_name) return null;
      const parts = p.location_name.split(',');
      return parts[parts.length - 1].trim();
    };
    for (let i = 0; i < myPins.length; i++) {
      for (let j = i + 1; j < myPins.length; j++) {
        const c1 = getCountry(myPins[i]);
        const c2 = getCountry(myPins[j]);
        if (c1 && c2 && c1 !== c2) {
          const R = 6371;
          const dLat = (myPins[j].lat - myPins[i].lat) * Math.PI / 180;
          const dLng = (myPins[j].lng - myPins[i].lng) * Math.PI / 180;
          const a = Math.sin(dLat/2)**2 + Math.cos(myPins[i].lat * Math.PI/180) * Math.cos(myPins[j].lat * Math.PI/180) * Math.sin(dLng/2)**2;
          const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          if (dist < 10) return true;
        }
      }
    }
    return false;
  }, [myPins, uniqueCountries]);


  const canUseDark = devMode || hasNightOwl;
  const canUseVintage = devMode || hasLocalHero;
  const canUseSunrise = devMode || hasEarlyBird;
  const canUseSpooky = devMode || hasHalloween || isHalloweenActive || hasGhostHunter;
  const canUseSnow = devMode || hasWinter;
  const canUseAurora = devMode || hasPolarExplorer;
  const canUseCyberpunk = devMode || hasUrbanLegend;
  const canUse8Bit = devMode || hasRetroGamer;


  // Stats: Total distance between all pins (Haversine sum)
  const totalDistanceKm = useMemo(() => {
    if (myPins.length < 2) return 0;
    let total = 0;
    const sorted = [...myPins].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    for (let i = 1; i < sorted.length; i++) {
      const R = 6371;
      const dLat = (sorted[i].lat - sorted[i-1].lat) * Math.PI / 180;
      const dLng = (sorted[i].lng - sorted[i-1].lng) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(sorted[i-1].lat * Math.PI/180) * Math.cos(sorted[i].lat * Math.PI/180) * Math.sin(dLng/2)**2;
      total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }
    return Math.round(total);
  }, [myPins]);

  // Helper: Prüft ob Sticker in den letzten 7 Tagen gesetzt wurde
  const isNew = (dateString) => {
    const pinDate = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil(Math.abs(now - pinDate) / (1000 * 60 * 60 * 24)); 
    return diffDays <= 7;
  };

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    let currentProfile = data;
    if (!currentProfile) {
      const { data: newProfile } = await supabase.from('profiles').insert({ id: userId }).select().single();
      currentProfile = newProfile;
    }
    if (currentProfile) {
      setProfile(currentProfile);
      if (!currentProfile.is_approved) setShowInviteModal(true);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setShowOnlyMyPins(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  
  const submitInviteCode = async () => {
    setInviteError('');
    if (!inviteCodeInput.trim()) return setInviteError('Bitte Code eingeben');
    
    // Check if code exists and is unused
    const { data: codeData, error: codeError } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', inviteCodeInput.trim())
      .eq('is_used', false)
      .single();
      
    if (codeError || !codeData) {
      return setInviteError('Code ungültig oder bereits verbraucht.');
    }
    
    // Mark code as used
      const { error: updateError } = await supabase.from('invite_codes').update({ is_used: true, used_by: session.user.id, used_at: new Date() }).eq('code', codeData.code);
      
      if (updateError) {
        console.error("Code Update Error:", updateError);
        return setInviteError('Datenbank-Fehler: RLS blockiert das Einlösen (Code konnte nicht als verbraucht markiert werden).');
      }

      // Approve user
      await supabase.from('profiles').update({ is_approved: true }).eq('id', session.user.id);
    
    setProfile(prev => ({ ...prev, is_approved: true }));
    setShowInviteModal(false);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };

  const [draftPin, setDraftPin] = useState(null); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [targetPinId, setTargetPinId] = useState(null);

  // Radar & Roulette States
  const [radarActive, setRadarActive] = useState(false);
  const [radarState, setRadarState] = useState(''); 
  const [nearestData, setNearestData] = useState(null);

  const handleRoulette = () => {
    if (pins.length === 0 || !map) return;
    const randomPin = pins[Math.floor(Math.random() * pins.length)];
    // "Teleport" statt Kameraflug, damit der Browser nicht hunderte Kacheln über dem Ozean laden muss
    map.setView([randomPin.lat, randomPin.lng], 16, { animate: false });
    if (isHalloweenActive) {
      const spookyLines = [
        '🎃 Süßes oder Saures! Geister-Teleport nach:',
        '👻 Buh! Ein Spuk hat dich verschlagen nach:',
        '🦇 Auf Fledermausschwingen gelandet in:',
        '🍬 Hexen-Roulette! Du bist gelandet in:'
      ];
      const line = spookyLines[Math.floor(Math.random() * spookyLines.length)];
      setSpookyToast(`${line} ${randomPin.location_name || 'Unbekannter Ort'}`);
      setTimeout(() => setSpookyToast(null), 4000);
    }
  };

  const handleRadar = () => {
    if (!map || pins.length === 0) return;
    setRadarActive(true);
    setRadarState('searching');
    
    if (!("geolocation" in navigator)) {
      setRadarState('error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        
        let closest = null;
        let minDistance = Infinity;
        
        pins.forEach(pin => {
          const dist = map.distance([userLat, userLng], [pin.lat, pin.lng]);
          if (dist < minDistance) {
            minDistance = dist;
            closest = pin;
          }
        });
        
        setNearestData({ pin: closest, distance: minDistance });
        setRadarState('found');
      },
      (err) => {
        // Code 1: Nutzer hat abgelehnt oder Browser blockiert generell
        if (err.code === 1) {
          setRadarState('denied');
        } else {
          setRadarState('error');
        }
      },
      // Timeout auf 15 Sekunden erhöht, da GPS auf Handys etwas dauern kann
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const markerRef = useRef(null);

  // Parse URL Parameters for Deep Linking on first mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pinParam = params.get('pin');
    if (pinParam) {
      setTargetPinId(pinParam.toString()); // Sicherstellen, dass es ein String ist (für UUIDs oder BigInt)
    }
  }, []);

  // Fly to target pin once map and pins are loaded
  useEffect(() => {
    if (targetPinId && map && pins.length > 0) {
      const targetPin = pins.find(p => p.id.toString() === targetPinId);
      if (targetPin) {
        // Leichte Verzögerung für weicheren Start der Kamera-Fahrt
        setTimeout(() => {
          map.flyTo([targetPin.lat, targetPin.lng], 16, { animate: true, duration: 2 });
        }, 600);
      }
    }
  }, [targetPinId, map, pins]);

  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");

  const [selectedImage, setSelectedImage] = useState(null);
  const [compressedFile, setCompressedFile] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [message, setMessage] = useState("");
  const [locationName, setLocationName] = useState("");
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [exifNotice, setExifNotice] = useState("");
  const [draftAltitude, setDraftAltitude] = useState(null);
  const [uploadStep, setUploadStep] = useState(null); // null | 'analyzing' | 'compressing' | 'uploading'
  
  const [userLocation, setUserLocation] = useState([50.1109, 8.6821]); 
  const [liveUserPos, setLiveUserPos] = useState(null);
  const watchIdRef = useRef(null);

  // Layer State
  const [mapStyle, setMapStyle] = useState('street'); 
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  useEffect(() => {
    fetchPins();
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
      });
    }

    const realtimeSubscription = supabase
      .channel('public:pins')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pins' }, (payload) => {
        fetchPins(); 
      })
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeSubscription);
    };
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => setLiveUserPos([pos.coords.latitude, pos.coords.longitude]),
        () => {},
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
    }
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const fetchPins = async () => {
    const { data, error } = await supabase.from('pins').select('*').eq('approved', true);
    if (data) setPins(data);
  };

  const handleUpdateAvatarAndFrame = async (newAvatar, newFrame) => {
    if (!session) return;
    try {
      const { error } = await supabase.from('profiles').update({ avatar: newAvatar, frame_style: newFrame }).eq('id', session.user.id);
      if (!error) {
        setProfile(prev => ({ ...prev, avatar: newAvatar, frame_style: newFrame }));
        alert("Avatar und Rahmen gespeichert! 🎨");
      } else {
        alert("Fehler beim Speichern. Hast du den SQL Befehl ausgeführt?");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAllProfiles = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('id, nickname, avatar, frame_style');
      if (data) {
        const profileMap = {};
        data.forEach(p => {
          profileMap[p.id] = {
            nickname: p.nickname,
            avatar: p.avatar || 'default',
            frame_style: p.frame_style || 'none'
          };
        });
        setAllProfiles(profileMap);
      }
    } catch (e) {
      console.error("Fehler beim Laden aller Profile", e);
    }
  };

  const fetchUnapprovedPins = async () => {
    const { data, error } = await supabase.from('pins').select('*').eq('approved', false).order('created_at', { ascending: false });
    if (data) setUnapprovedPins(data);
  };

  const handleApprovePin = async (id) => {
    const { error } = await supabase.from('pins').update({ approved: true }).eq('id', id);
    if (!error) {
      setUnapprovedPins(prev => prev.filter(p => p.id !== id));
      fetchPins();
    } else {
      alert("Fehler beim Freigeben!");
    }
  };

  const handleRejectPin = async (id, imageUrl) => {
    if (!window.confirm("Sticker wirklich löschen?")) return;
    
    const { error } = await supabase.from('pins').delete().eq('id', id);
    if (!error) {
      setUnapprovedPins(prev => prev.filter(p => p.id !== id));
      
      // Optional: Bild aus Storage löschen (Vorausgesetzt das format ist exakt der Dateiname)
      const fileName = imageUrl.split('/').pop();
      if (fileName) {
        await supabase.storage.from('stickers').remove([fileName]);
      }
    }
  };

  const fetchLocationName = async (lat, lng) => {
    setIsFetchingLocation(true);
    try {
      fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`)
        .then(r => r.json())
        .then(d => {
          if (d && Array.isArray(d.elevation) && typeof d.elevation[0] === 'number') {
            setDraftAltitude(prev => prev !== null ? prev : Math.round(d.elevation[0]));
          }
        })
        .catch(() => {});
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const data = await res.json();
      if (data && data.address) {
        const city = data.address.city || data.address.town || data.address.village || data.address.county || "Unbekannter Ort";
        const country = data.address.country || "";
        setLocationName(`${city}, ${country}`);
      } else {
        setLocationName("Unbekannter Ort");
      }
    } catch (e) {
      setLocationName("");
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const handleStartNewPin = () => {
    if (!session) {
      setIsAuthModalOpen(true);
      return;
    }
    if (map) {
      const center = map.getCenter();
      setDraftPin([center.lat, center.lng]);
      setManualLat(center.lat.toFixed(6));
      setManualLng(center.lng.toFixed(6));
      fetchLocationName(center.lat, center.lng);
    }
  };

  const dragHandlers = useMemo(() => ({
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const latlng = marker.getLatLng();
        setDraftPin([latlng.lat, latlng.lng]);
        setManualLat(latlng.lat.toFixed(6));
        setManualLng(latlng.lng.toFixed(6));
        fetchLocationName(latlng.lat, latlng.lng);
      }
    }
  }), []);

  const handleConfirmPosition = () => {
    setIsModalOpen(true);
    setExifNotice("");
  };

  const handleLiveGPS = () => {
    if (!session) {
      setIsAuthModalOpen(true);
      return;
    }
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setDraftPin([lat, lng]);
        setManualLat(lat.toFixed(6));
        setManualLng(lng.toFixed(6));
        fetchLocationName(lat, lng);
        setExifNotice("Standort erfolgreich vom Handy-GPS abgerufen!");
        if (map) map.flyTo([lat, lng], 15);
      }, () => {
        alert("GPS konnte nicht abgerufen werden. Bitte erlaube den Standort in deinem Browser.");
      });
    }
  };

  const handleImageSelection = async (e) => {
    if (!session) {
      setIsAuthModalOpen(true);
      return;
    }
    const file = e.target.files[0];
    if (!file) return;

    setSelectedImage(URL.createObjectURL(file));
    setIsCompressing(true);
    setExifNotice("");
    setUploadStep('analyzing');

    // EXIF Parsing
    try {
      const exifData = await exifr.parse(file);
      if (exifData) {
        let noticeStr = "";
        if (exifData.latitude && exifData.longitude) {
          setDraftPin([exifData.latitude, exifData.longitude]);
          setManualLat(exifData.latitude.toFixed(6));
          setManualLng(exifData.longitude.toFixed(6));
          fetchLocationName(exifData.latitude, exifData.longitude);
          if (map) map.flyTo([exifData.latitude, exifData.longitude], 15);
          noticeStr += "📍 Standort aus Foto übernommen. ";
        }
        if (exifData.GPSAltitude) {
          let alt = exifData.GPSAltitude;
          if (exifData.GPSAltitudeRef && Array.from(exifData.GPSAltitudeRef)[0] === 1) {
            alt = -alt;
          }
          setDraftAltitude(Math.round(alt));
          noticeStr += `⛰️ Höhe: ${Math.round(alt)}m.`;
        }
        if (noticeStr) setExifNotice(noticeStr);
      }
    } catch (err) {
      console.log("Keine EXIF Daten gefunden", err);
    }

    setUploadStep('compressing');
    const options = { maxSizeMB: 0.3, maxWidthOrHeight: 1200, useWebWorker: false };
    try {
      const compressed = await imageCompression(file, options);
      setCompressedFile(compressed);
    } catch (error) {
      console.error('Komprimierung fehlgeschlagen, verwende Originaldatei:', error);
      // Fallback: use original file directly
      setCompressedFile(file);
    } finally {
      setIsCompressing(false);
      setUploadStep(null);
    }
  };

  const handleUpload = async () => {
    if (!compressedFile || !draftPin) return;
    setIsUploading(true);
    setUploadStep('uploading');
    
    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const { error: uploadError } = await supabase.storage.from('stickers').upload(fileName, compressedFile, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('stickers').getPublicUrl(fileName);

      const insertData = {
        lat: draftPin[0],
        lng: draftPin[1],
        image_url: publicUrl,
        message: message || null,
        location_name: locationName || null,
        user_id: session ? session.user.id : null
      };
      
      if (draftAltitude !== null) {
        insertData.altitude = draftAltitude;
      }

      const { error: dbError } = await supabase.from('pins').insert(insertData);
      if (dbError) throw dbError;

      alert("Danke! Dein Sticker wurde hochgeladen und wird bald vom Admin freigegeben.");
      
      setIsModalOpen(false);
      setSelectedImage(null);
      setCompressedFile(null);
      setDraftPin(null);
      setDraftAltitude(null);
      setMessage("");
      setLocationName("");
      setExifNotice("");
    } catch (error) {
      console.error(error);
      alert("Es gab einen Fehler beim Upload.");
    } finally {
      setIsUploading(false);
      setUploadStep(null);
    }
  };

  // Wir blockieren nur den Nord-/Südpol (vertikal), erlauben aber endloses seitliches Scrollen,
  // damit man über den Pazifik fliegen kann und keine grauen Fehler-Kacheln entstehen.
  const worldBounds = [
    [-90, -2000],
    [90, 2000]
  ];

  // Computed Pins based on toggle or selected player filter
  const displayPins = playerMapFilter
    ? pins.filter(p => p.user_id === playerMapFilter.userId)
    : (showOnlyMyPins && session ? pins.filter(p => p.user_id === session.user.id) : pins);

  // Expedition Route & Zeitreise State (active when viewing own map or a player's map)
  const isExpeditionMode = Boolean((showOnlyMyPins && session) || playerMapFilter);
  const routePins = useMemo(() => {
    if (!isExpeditionMode) return [];
    return [...displayPins].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }, [displayPins, isExpeditionMode]);

  const [showRouteLine, setShowRouteLine] = useState(true);
  const [routeStepIdx, setRouteStepIdx] = useState(null);
  const [isPlayingRoute, setIsPlayingRoute] = useState(false);
  const [planeFlight, setPlaneFlight] = useState(null);

  // Reset Zeitreise when exiting expedition mode or changing target player
  useEffect(() => {
    setIsPlayingRoute(false);
    setRouteStepIdx(null);
    setPlaneFlight(null);
  }, [showOnlyMyPins, playerMapFilter?.userId]);

  const stepToRoutePin = (targetIdx, fromOverride = null) => {
    if (!routePins || routePins.length === 0) return;
    const clamped = Math.max(0, Math.min(routePins.length - 1, targetIdx));
    const prevIdx =
      fromOverride !== null
        ? fromOverride
        : routeStepIdx !== null
          ? routeStepIdx
          : Math.max(0, clamped - 1);

    const destPin = routePins[clamped];
    setRouteStepIdx(clamped);
    setTargetPinId(destPin.id.toString());

    if (prevIdx !== clamped && routePins[prevIdx]) {
      // ExpeditionRouteLayer locks camera onto the airplane & pans along the curve at a steady zoom!
      setPlaneFlight({ fromIdx: prevIdx, toIdx: clamped, id: Date.now() + Math.random() });
    } else {
      setPlaneFlight(null);
      if (map) {
        map.setView([destPin.lat, destPin.lng], 9, { animate: true });
      }
    }
  };

  // Auto-Play Zeitreise Timer
  useEffect(() => {
    if (!isPlayingRoute || routePins.length < 2) return;
    const timer = setTimeout(() => {
      const current = routeStepIdx === null ? 0 : routeStepIdx;
      if (current >= routePins.length - 1) {
        setIsPlayingRoute(false);
      } else {
        stepToRoutePin(current + 1, current);
      }
    }, 3900);
    return () => clearTimeout(timer);
  }, [isPlayingRoute, routeStepIdx, routePins]);

  // Compute cumulative distance up to current routeStepIdx
  const currentStepStats = useMemo(() => {
    if (routeStepIdx === null || !routePins[routeStepIdx]) return null;
    let km = 0;
    for (let i = 1; i <= routeStepIdx; i++) {
      const a = routePins[i - 1];
      const b = routePins[i];
      const R = 6371;
      const dLat = ((b.lat - a.lat) * Math.PI) / 180;
      const dLng = ((b.lng - a.lng) * Math.PI) / 180;
      const hav =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
      km += R * 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
    }
    const pin = routePins[routeStepIdx];
    return {
      pin,
      stepNum: routeStepIdx + 1,
      totalSteps: routePins.length,
      cumKm: Math.round(km),
      shortLoc: pin.location_name ? pin.location_name.split(',')[0] : 'Sticker-Spot',
      dateStr: new Date(pin.created_at).toLocaleDateString('de-DE')
    };
  }, [routeStepIdx, routePins]);

  const nextMilestone = useMemo(() => {
    if (!session) return null;
    const cnt = myPins.length;
    if (cnt < 5) return { label: `Noch ${5 - cnt} Pins bis Bronze Sammler 🥉`, progress: cnt / 5 };
    if (cnt < 10) return { label: `Noch ${10 - cnt} Pins bis Silber Sammler 🥈`, progress: cnt / 10 };
    if (cnt < 50) return { label: `Noch ${50 - cnt} Pins bis Gold Sammler 🥇`, progress: cnt / 50 };
    return { label: 'Du rockst es! Erkunde die Welt weiter 🌍', progress: null };
  }, [session, myPins]);

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden overscroll-none">
      
      {/* Top Left Header & Counter (Optimized for Mobile) */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-[1000] pointer-events-none flex flex-col gap-1.5 sm:gap-3 max-w-[calc(100vw-24px)]">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <div className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 sm:px-6 sm:py-3 rounded-full sm:rounded-3xl shadow-lg border border-gray-100 flex items-center gap-2 sm:gap-3 pointer-events-auto transition-all">
            <h1 className="text-sm sm:text-2xl font-black text-gray-900 tracking-tight">Geophysalis</h1>
            <div className="h-3 w-px bg-gray-200 sm:hidden" />
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${showOnlyMyPins ? 'bg-blue-400' : 'bg-green-400'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 ${showOnlyMyPins ? 'bg-blue-600' : 'bg-green-500'}`}></span>
              </span>
              <p className="text-[10px] sm:text-xs font-bold text-gray-700 tracking-wide uppercase">
                {displayPins.length} <span className="hidden sm:inline">{showOnlyMyPins ? 'Eigene Sticker' : 'Sticker weltweit'}</span><span className="sm:hidden">{showOnlyMyPins ? 'Meine' : 'Pins'}</span>
              </p>
            </div>
          </div>

          {session && showOnlyMyPins && !playerMapFilter && (
            <button
              onClick={() => setShowOnlyMyPins(false)}
              className="bg-blue-600 text-white px-2.5 sm:px-3 py-1.5 rounded-full shadow-lg text-[10px] sm:text-xs font-black flex items-center gap-1 pointer-events-auto hover:bg-blue-700 active:scale-95 transition"
            >
              <span>📍 Meine Karte</span>
              <X size={12} />
            </button>
          )}

          {playerMapFilter && (
            <button
              onClick={() => setPlayerMapFilter(null)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-2.5 sm:px-3.5 py-1.5 rounded-full shadow-lg text-[10px] sm:text-xs font-black flex items-center gap-1.5 pointer-events-auto hover:opacity-95 active:scale-95 transition"
            >
              <span>👤 {playerMapFilter.nickname}s Karte ({displayPins.length})</span>
              <X size={13} />
            </button>
          )}

          {/* Mobile Compact Admin Pills (only visible to admins on mobile) */}
          {profile?.is_admin && !draftPin && (
            <div className="flex sm:hidden items-center gap-1 pointer-events-auto">
              <button
                onClick={() => { fetchUnapprovedPins(); setIsAdminModalOpen(true); }}
                className="bg-red-500/95 backdrop-blur-md text-white px-2.5 py-1.5 rounded-full shadow-lg text-[10px] font-black flex items-center gap-1"
              >
                <Shield size={12} />
              </button>
              <button
                onClick={() => setDevMode(!devMode)}
                className={`px-2.5 py-1.5 rounded-full shadow-lg text-[10px] font-black transition ${devMode ? 'bg-purple-600 text-white' : 'bg-white/95 text-gray-600'}`}
              >
                Dev
              </button>
              <Link
                to="/admin"
                className="bg-white/95 text-gray-700 px-2.5 py-1.5 rounded-full shadow-lg text-[10px] font-black"
              >
                Panel
              </Link>
            </div>
          )}
        </div>

        {/* Expedition & Zeitreise Cockpit Bar (only visible when viewing Own Map or Player Map with >= 2 pins) */}
        {isExpeditionMode && routePins.length >= 2 && (
          <div className="bg-white/95 backdrop-blur-md px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl sm:rounded-full shadow-xl border border-red-200/80 flex flex-wrap items-center gap-1.5 sm:gap-2 pointer-events-auto self-start max-w-full">
            <img src="/badges/expedition_plane.png" alt="Flugzeug" className="w-5 h-5 sm:w-6 sm:h-6 object-contain shrink-0" />

            {/* Prev Stop Button */}
            <button
              onClick={() => {
                setIsPlayingRoute(false);
                const cur = routeStepIdx === null ? routePins.length - 1 : routeStepIdx;
                stepToRoutePin(cur > 0 ? cur - 1 : 0, cur);
              }}
              title="Vorheriger Sticker"
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xs flex items-center justify-center active:scale-90 transition"
            >
              ◀
            </button>

            {/* Play / Pause Zeitreise Button */}
            <button
              onClick={() => {
                if (isPlayingRoute) {
                  setIsPlayingRoute(false);
                } else {
                  setShowRouteLine(true);
                  const startIdx = routeStepIdx === null || routeStepIdx >= routePins.length - 1 ? 0 : routeStepIdx;
                  stepToRoutePin(startIdx, startIdx);
                  setIsPlayingRoute(true);
                }
              }}
              className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-black flex items-center gap-1 shadow-sm transition active:scale-95 ${
                isPlayingRoute
                  ? 'bg-amber-500 text-white animate-pulse'
                  : 'bg-gradient-to-r from-red-600 to-orange-500 text-white hover:opacity-95'
              }`}
            >
              <span>{isPlayingRoute ? '⏸ Stopp' : '▶️ Zeitreise'}</span>
            </button>

            {/* Next Stop Button */}
            <button
              onClick={() => {
                setIsPlayingRoute(false);
                setShowRouteLine(true);
                if (routeStepIdx === null) {
                  stepToRoutePin(1, 0);
                } else {
                  const next = routeStepIdx < routePins.length - 1 ? routeStepIdx + 1 : 0;
                  stepToRoutePin(next, routeStepIdx);
                }
              }}
              title="Weiterfliegen zum nächsten Sticker"
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-black text-xs flex items-center justify-center active:scale-90 transition"
            >
              ▶
            </button>

            {/* Toggle Dashed Route Line */}
            <button
              onClick={() => setShowRouteLine(!showRouteLine)}
              title="Gestrichelte Flugroute ein-/ausblenden"
              className={`px-2 py-1 rounded-full text-[10px] font-bold border transition ${
                showRouteLine
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-gray-100 text-gray-400 border-gray-200'
              }`}
            >
              〰️ Route
            </button>

            {/* Live Stage Info Pill when stepping/playing */}
            {currentStepStats && (
              <div className="flex items-center gap-1.5 bg-slate-900 text-white px-2.5 py-1 rounded-full text-[10px] font-bold max-w-[210px] sm:max-w-[280px] truncate">
                <span className="text-amber-300 font-black shrink-0">
                  #{currentStepStats.stepNum}/{currentStepStats.totalSteps}
                </span>
                <span className="truncate">{currentStepStats.shortLoc}</span>
                <span className="text-cyan-300 font-mono shrink-0">· {currentStepStats.cumKm}km</span>
              </div>
            )}
          </div>
        )}
        
        {/* Event Banners */}
        {isHalloweenActive && (() => {
          const distKm = spookyCompass.distanceMeters / 1000;
          const emf = distKm < 2 ? { short: '🔥', label: '🔥 EXTREM NAH!', color: 'text-red-300', ring: 'border-red-400 bg-red-500/30', bars: 4 }
                    : distKm < 20 ? { short: '🕯️', label: '🕯️ Heiß (In der Nähe)', color: 'text-orange-300', ring: 'border-orange-400 bg-orange-500/25', bars: 3 }
                    : distKm < 150 ? { short: '🔮', label: '🔮 Warm (Signal spürbar)', color: 'text-amber-200', ring: 'border-amber-400/60 bg-amber-500/20', bars: 2 }
                    : { short: '❄️', label: '❄️ Kalt (Weit entfernt)', color: 'text-cyan-200', ring: 'border-cyan-400/40 bg-cyan-500/15', bars: 1 };
          const distLabel = spookyCompass.distanceMeters > 1000
            ? `${distKm.toFixed(distKm > 20 ? 0 : 1)} km`
            : `${spookyCompass.distanceMeters} m`;

          if (spookyCollapsed) {
            return (
              <div className="flex items-center gap-1.5 pointer-events-auto self-start">
                <button
                  onClick={() => setSpookyCollapsed(false)}
                  className="bg-gradient-to-r from-slate-950/95 via-purple-950/95 to-orange-950/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-xl border border-orange-400/60 flex items-center gap-2 text-white active:scale-95 transition"
                >
                  <span className="text-xs">🎃</span>
                  <span className="text-[10px] font-black text-orange-200">👻 {ghostsCaught}/{GHOST_GOAL}</span>
                  {ghostHuntActive && (
                    <>
                      <span className="text-white/30">|</span>
                      <span
                        className="inline-block text-xs transition-transform duration-200"
                        style={{ transform: `rotate(${spookyCompass.bearing}deg)` }}
                      >
                        🔺
                      </span>
                      <span className="text-[10px] font-mono font-bold text-orange-100">{distLabel}</span>
                      <span className="text-[10px]">{emf.short}</span>
                    </>
                  )}
                  <span className="text-[9px] text-orange-300/80 ml-0.5">▾</span>
                </button>
                <button
                  onClick={() => setMapStyle(mapStyle === 'neon' ? 'street' : 'neon')}
                  className={`px-2.5 py-1.5 rounded-full text-[10px] font-black shadow-lg border backdrop-blur-md transition ${mapStyle === 'neon' ? 'bg-purple-700/95 text-white border-purple-400' : 'bg-slate-900/90 text-orange-200 border-orange-400/40'}`}
                >
                  {mapStyle === 'neon' ? '☀️' : '🌙'}
                </button>
              </div>
            );
          }

          return (
          <div className="bg-gradient-to-br from-slate-950/95 via-purple-950/95 to-orange-950/95 backdrop-blur-md p-2.5 sm:px-4 sm:py-3 rounded-2xl sm:rounded-3xl shadow-2xl border border-orange-400/60 pointer-events-auto flex flex-col gap-2 w-[265px] sm:w-[310px] transition-all">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg animate-bounce">🎃</span>
                <span className="text-[10px] sm:text-xs font-black text-orange-200 uppercase tracking-wider">Spooky Kompass</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full bg-orange-500/30 text-orange-100 border border-orange-400/40">
                  👻 {ghostsCaught}/{GHOST_GOAL}
                </span>
                <button
                  onClick={() => setSpookyCollapsed(true)}
                  className="text-orange-200/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold transition"
                  title="Minimieren"
                >
                  ▴
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-black/50 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-orange-500 via-amber-400 to-purple-400 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (ghostsCaught / GHOST_GOAL) * 100)}%` }}
              />
            </div>

            {/* Live Spooky Compass & EMF Detector */}
            {ghostHuntActive && (
              <div className="flex items-center gap-3 bg-black/40 p-2 rounded-2xl border border-purple-500/30">
                <div className={`emf-compass-dial relative w-11 h-11 rounded-full border-2 ${emf.ring} flex items-center justify-center shrink-0 shadow-inner`}>
                  <span className="absolute top-0.5 text-[7px] font-black text-orange-200/70">N</span>
                  <span className="absolute bottom-0.5 text-[7px] font-bold text-gray-400/60">S</span>
                  <span className="absolute right-1 text-[7px] font-bold text-gray-400/60">O</span>
                  <span className="absolute left-1 text-[7px] font-bold text-gray-400/60">W</span>
                  <div
                    className="w-full h-full flex items-center justify-center transition-transform duration-200"
                    style={{ transform: `rotate(${spookyCompass.bearing}deg)` }}
                  >
                    <div className="flex flex-col items-center -mt-1">
                      <span className="text-sm leading-none drop-shadow-[0_0_6px_rgba(249,115,22,1)]">🔺</span>
                      <div className="w-0.5 h-2.5 bg-gradient-to-b from-orange-400 to-transparent rounded-full -mt-0.5" />
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black ${emf.color} truncate`}>{emf.label}</span>
                    <span className="text-[10px] font-mono font-bold text-white/90 bg-white/10 px-1.5 py-0.5 rounded">{distLabel}</span>
                  </div>
                  <p className="text-[9px] text-orange-100/80 mt-0.5 leading-snug">
                    {!spookyCompass.isVisible
                      ? `🔒 Geist unsichtbar! Folge dem Pfeil & zoome rein (Zoom ${spookyCompass.zoom}/13)`
                      : '👀 Zoom aktiv! Suche den versteckten Geist (Vorsicht vor 🕷️!)'}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[9px] text-purple-200/75 truncate">
                {ghostsCaught >= GHOST_GOAL ? '🏆 Meister-Geisterjäger!' : 'Tipp: Geister spuken nahe Stickern!'}
              </span>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => setGhostHuntActive(!ghostHuntActive)}
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full border transition ${ghostHuntActive ? 'bg-orange-500 text-white border-orange-300' : 'bg-white/10 text-gray-300 border-white/20'}`}
                >
                  {ghostHuntActive ? 'Radar AN' : 'Pause'}
                </button>
                <button
                  onClick={() => setMapStyle(mapStyle === 'neon' ? 'street' : 'neon')}
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full border transition ${mapStyle === 'neon' ? 'bg-purple-600 text-white border-purple-300' : 'bg-white/10 text-orange-200 border-orange-400/30 hover:bg-white/20'}`}
                >
                  {mapStyle === 'neon' ? '☀️ Normal' : '🌙 Spooky'}
                </button>
              </div>
            </div>
          </div>
          );
        })()}
        {isWinterActive && (
          <div className="bg-blue-500/90 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-lg border border-blue-400 pointer-events-auto flex items-center gap-2 animate-bounce">
            <span>❄️</span>
            <span className="text-[10px] sm:text-xs font-black text-white uppercase tracking-wider">Winterwunder aktiv!</span>
          </div>
        )}
      </div>

      {/* Layer Menu & Auth Button (Top Right on Desktop, Popover above Dock on Mobile) */}
      <div className="absolute bottom-24 right-3 sm:bottom-auto sm:top-4 sm:right-4 z-[1000] pointer-events-auto flex flex-col items-end gap-2">
        <div className="hidden sm:flex gap-2">
          
          <button 
            onClick={() => {
              fetchAllProfiles();
              setIsLeaderboardOpen(true);
            }}
            className="bg-yellow-50 backdrop-blur-md p-3 sm:px-4 sm:py-3 rounded-full sm:rounded-full shadow-xl border border-yellow-200 text-yellow-700 hover:bg-yellow-100 transition flex items-center justify-center font-bold text-sm"
          >
            <Trophy size={20} className="sm:mr-1" />
            <span className="hidden sm:inline">Rangliste</span>
          </button>

          {profile?.is_admin && (
            <button 
              onClick={() => {
                fetchUnapprovedPins();
                setIsAdminModalOpen(true);
              }}
              className="bg-red-50 backdrop-blur-md p-3 sm:px-4 sm:py-3 rounded-full sm:rounded-full shadow-xl border border-red-200 text-red-600 hover:bg-red-100 transition flex items-center justify-center font-bold text-sm animate-pulse"
            >
              <Shield size={20} className="sm:mr-1" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}

          {session ? (
            <button onClick={() => setIsAuthModalOpen(true)} className="bg-white/95 backdrop-blur-md p-3 sm:px-4 sm:py-3 rounded-full sm:rounded-full shadow-xl border border-gray-100 text-gray-700 hover:bg-gray-50 transition flex items-center justify-center font-bold text-sm">
              <User size={20} className="sm:mr-1 text-blue-600" />
              <span className="hidden sm:inline">Profil</span>
            </button>
          ) : (
            <button onClick={() => setIsAuthModalOpen(true)} className="bg-white/95 backdrop-blur-md p-3 sm:px-4 sm:py-3 rounded-full sm:rounded-full shadow-xl border border-gray-100 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition flex items-center justify-center font-bold text-sm">
              <LogIn size={20} className="sm:mr-1" />
              <span className="hidden sm:inline">Login</span>
            </button>
          )}

          <Link 
            to="/about"
            className="bg-white/95 backdrop-blur-md p-3 sm:px-4 sm:py-3 rounded-full sm:rounded-full shadow-xl border border-gray-100 text-gray-700 hover:bg-gray-50 transition flex items-center justify-center font-bold text-sm"
          >
            <Info size={20} className="sm:mr-1" />
            <span className="hidden sm:inline">Story</span>
          </Link>
          
          <button 
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="bg-white/95 backdrop-blur-md p-3 sm:p-3.5 rounded-full sm:rounded-full shadow-xl border border-gray-100 text-gray-700 hover:bg-gray-50 transition"
          >
            <Layers size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        {showLayerMenu && (
          <div className="bg-white/95 backdrop-blur-md p-4 rounded-3xl shadow-2xl border border-gray-100 flex flex-col gap-4 w-56 animate-in slide-in-from-top-4 origin-top-right">
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Karten-Stil</p>
              <div className="flex flex-col gap-1">
                <button onClick={() => { setMapStyle('street'); if (window.innerWidth < 640) setShowLayerMenu(false); }} className={`text-left px-3 py-2 rounded-full text-sm font-bold transition ${mapStyle === 'street' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-600'}`}>Standard</button>
                <button onClick={() => { setMapStyle('satellite'); if (window.innerWidth < 640) setShowLayerMenu(false); }} className={`text-left px-3 py-2 rounded-full text-sm font-bold transition ${mapStyle === 'satellite' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-600'}`}>Satellit</button>
                
                <button 
                  onClick={() => canUseDark ? (setMapStyle('dark'), window.innerWidth < 640 && setShowLayerMenu(false)) : alert("Du benötigst das Abzeichen 'Der erste Schritt'!")} 
                  className={`text-left px-3 py-2 rounded-full text-sm font-bold transition flex justify-between items-center ${mapStyle === 'dark' ? 'bg-blue-100 text-blue-700' : canUseDark ? 'hover:bg-gray-100 text-gray-600' : 'text-gray-400'}`}
                >
                  Dark Mode {!canUseDark && <Lock size={14} className="text-gray-400" />}
                </button>
                
                <button 
                  onClick={() => canUseVintage ? (setMapStyle('vintage'), window.innerWidth < 640 && setShowLayerMenu(false)) : alert("Du benötigst das Abzeichen 'Entdecker' (5 Sticker)!")} 
                  className={`text-left px-3 py-2 rounded-full text-sm font-bold transition flex justify-between items-center ${mapStyle === 'vintage' ? 'bg-blue-100 text-blue-700' : canUseVintage ? 'hover:bg-gray-100 text-gray-600' : 'text-gray-400'}`}
                >
                  Explorer (Vintage) {!canUseVintage && <Lock size={14} className="text-gray-400" />}
                </button>

                <button 
                  onClick={() => canUseSunrise ? (setMapStyle('sunrise'), window.innerWidth < 640 && setShowLayerMenu(false)) : alert("Du benötigst das Abzeichen 'Frühaufsteher' (5-8 Uhr)!")} 
                  className={`text-left px-3 py-2 rounded-full text-sm font-bold transition flex justify-between items-center ${mapStyle === 'sunrise' ? 'bg-orange-100 text-orange-700' : canUseSunrise ? 'hover:bg-gray-100 text-gray-600' : 'text-gray-400'}`}
                >
                  Sunrise (Morgen) {!canUseSunrise && <Lock size={14} className="text-gray-400" />}
                </button>

                <button 
                  onClick={() => canUseSpooky ? (setMapStyle('neon'), window.innerWidth < 640 && setShowLayerMenu(false)) : alert("Du benötigst das Abzeichen 'Süßes oder Saures' (Halloween-Event)!")} 
                  className={`text-left px-3 py-2 rounded-full text-sm font-bold transition flex justify-between items-center ${mapStyle === 'neon' ? 'bg-purple-100 text-purple-700' : canUseSpooky ? 'hover:bg-gray-100 text-gray-600' : 'text-gray-400'}`}
                >
                  Spooky (Halloween) {!canUseSpooky && <Lock size={14} className="text-gray-400" />}
                </button>

                <button 
                  onClick={() => canUseSnow ? (setMapStyle('snow'), window.innerWidth < 640 && setShowLayerMenu(false)) : alert("Du benötigst das Abzeichen 'Winterwunder' (Dezember-Event)!")} 
                  className={`text-left px-3 py-2 rounded-full text-sm font-bold transition flex justify-between items-center ${mapStyle === 'snow' ? 'bg-blue-100 text-blue-700' : canUseSnow ? 'hover:bg-gray-100 text-gray-600' : 'text-gray-400'}`}
                >
                  Winter (Schnee) {!canUseSnow && <Lock size={14} className="text-gray-400" />}
                </button>

                <button 
                  onClick={() => canUseAurora ? (setMapStyle('aurora'), window.innerWidth < 640 && setShowLayerMenu(false)) : alert("Du benötigst das Abzeichen 'Polarforscher'!")} 
                  className={`text-left px-3 py-2 rounded-full text-sm font-bold transition flex justify-between items-center ${mapStyle === 'aurora' ? 'bg-teal-100 text-teal-700' : canUseAurora ? 'hover:bg-gray-100 text-gray-600' : 'text-gray-400'}`}
                >
                  Polarlichter {!canUseAurora && <Lock size={14} className="text-gray-400" />}
                </button>

                <button 
                  onClick={() => canUseCyberpunk ? (setMapStyle('cyberpunk'), window.innerWidth < 640 && setShowLayerMenu(false)) : alert("Du benötigst das Abzeichen 'Urban Legend'!")} 
                  className={`text-left px-3 py-2 rounded-full text-sm font-bold transition flex justify-between items-center ${mapStyle === 'cyberpunk' ? 'bg-pink-100 text-pink-700' : canUseCyberpunk ? 'hover:bg-gray-100 text-gray-600' : 'text-gray-400'}`}
                >
                  Cyberpunk (Neon) {!canUseCyberpunk && <Lock size={14} className="text-gray-400" />}
                </button>

                <button 
                  onClick={() => canUse8Bit ? (setMapStyle('8bit'), window.innerWidth < 640 && setShowLayerMenu(false)) : alert("Du benötigst das Abzeichen 'Pixel Pioneer' (10 Sticker)!")} 
                  className={`text-left px-3 py-2 rounded-full text-sm font-bold transition flex justify-between items-center ${mapStyle === '8bit' ? 'bg-green-100 text-green-800' : canUse8Bit ? 'hover:bg-gray-100 text-gray-600' : 'text-gray-400'}`}
                >
                  8-Bit Retro 👾 {!canUse8Bit && <Lock size={14} className="text-gray-400" />}
                </button>
              </div>
            </div>
            <div className="h-px bg-gray-200 w-full"></div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ansicht</p>
              <label className="flex items-center justify-between cursor-pointer px-3 py-2 hover:bg-gray-100 rounded-full transition">
                <span className="text-sm font-bold text-gray-600">Heatmap zeigen</span>
                <input type="checkbox" className="hidden" checked={showHeatmap} onChange={(e) => setShowHeatmap(e.target.checked)} />
                <div className={`w-8 h-4 rounded-full transition relative ${showHeatmap ? 'bg-blue-500' : 'bg-gray-300'}`}>
                  <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all ${showHeatmap ? 'left-4' : 'left-0.5'}`}></div>
                </div>
              </label>
            </div>
          </div>
        )}
        
        {profile?.is_admin && !draftPin && (
          <div className="hidden sm:flex gap-2 self-end pointer-events-auto">
            <button 
              onClick={() => setDevMode(!devMode)}
              className={`mt-1 sm:mt-2 px-4 py-2 sm:px-5 sm:py-3 rounded-full sm:rounded-full shadow-xl border border-gray-100 text-xs sm:text-sm font-bold transition ${devMode ? 'bg-purple-600 text-white' : 'bg-white/95 backdrop-blur-md text-gray-400 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              DevMode {devMode ? 'ON' : 'OFF'}
            </button>
            <Link to="/admin" className="mt-1 sm:mt-2 bg-white/95 backdrop-blur-md px-4 py-2 sm:px-5 sm:py-3 rounded-full sm:rounded-full shadow-xl border border-gray-100 text-xs sm:text-sm font-bold text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition">
              Admin
            </Link>
          </div>
        )}
      </div>
      
      {mapStyle === 'snow' && (
        <>
          <Snowflakes />
          <div className="frost-overlay"></div>
        </>
      )}
      {mapStyle === 'aurora' && <div className="aurora-overlay"></div>}
      {mapStyle === 'neon' && <div className="spooky-vignette"></div>}
      {spookyPopups.map(p => (
        <div key={p.id} className="spooky-pop-effect flex flex-col items-center" style={{ left: p.x, top: p.y }}>
          <span className={`text-3xl font-black ${p.isTrap ? 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.95)]' : 'text-amber-300 drop-shadow-[0_0_10px_rgba(249,115,22,0.9)]'}`}>{p.emoji} {p.signStr}</span>
          <span className="text-[10px] font-black bg-purple-950/90 text-orange-300 px-2 py-0.5 rounded-full border border-orange-400/50 shadow-lg whitespace-nowrap">{p.label}</span>
        </div>
      ))}
      {spookyToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[3000] bg-gradient-to-r from-purple-950/95 via-slate-900/95 to-orange-950/95 text-orange-200 px-4 py-2.5 rounded-2xl shadow-2xl border border-orange-400/60 text-xs sm:text-sm font-bold flex items-center gap-2 animate-bounce pointer-events-none">
          <span>🎃</span>
          <span>{spookyToast}</span>
        </div>
      )}

      <MapContainer 
        center={userLocation} 
        zoom={5} 
        minZoom={2}
        maxBounds={worldBounds}
        maxBoundsViscosity={1.0}
        zoomControl={false} 
        worldCopyJump={true}
        ref={setMap} 
        className={`w-full h-full z-0 ${mapStyle === 'dark' ? 'bg-[#1a1a1a]' : 'bg-[#e5e5e5]'}`}
      >
        <ZoomControl position="bottomleft" />
        <MapClickHandler
          onMapClick={() => {
            if (showLayerMenu) setShowLayerMenu(false);
            if (radarActive) setRadarActive(false);
            if (isAuthModalOpen) setIsAuthModalOpen(false);
            if (isLeaderboardOpen) setIsLeaderboardOpen(false);
            if (isAdminModalOpen) setIsAdminModalOpen(false);
          }}
        />
        
        {/* Map Layers */}
        {mapStyle === 'street' && (
          <TileLayer 
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            keepBuffer={6}
            updateWhenIdle={false}
          />
        )}
        {mapStyle === 'satellite' && (
          <TileLayer 
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
            attribution='Tiles &copy; Esri'
            keepBuffer={6}
            updateWhenIdle={false}
          />
        )}
        {mapStyle === 'dark' && (
          <TileLayer 
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}" 
            attribution='Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
          />
        )}
        {mapStyle === 'vintage' && (
          <TileLayer 
            url="https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}" 
            attribution='Tiles &copy; Esri &mdash; National Geographic'
            maxZoom={16}
          />
        )}
        {mapStyle === 'sunrise' && (
          <TileLayer 
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            className="map-sunrise"
          />
        )}
        {mapStyle === 'neon' && (
          <TileLayer 
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            className="map-spooky"
          />
        )}
        {mapStyle === 'snow' && (
          <TileLayer 
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            className="map-frozen"
          />
        )}
        {mapStyle === 'aurora' && (
          <TileLayer 
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            className="map-aurora"
          />
        )}
        {mapStyle === 'cyberpunk' && (
          <TileLayer 
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            className="map-cyberpunk"
          />
        )}
        {mapStyle === '8bit' && (
          <TileLayer 
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" 
            attribution='&copy; OpenTopoMap'
            className="map-8bit"
            maxNativeZoom={9}
            maxZoom={18}
          />
        )}
        
        {mapStyle === 'snow' && <WinterAssets />}
        {(mapStyle === 'neon' || (isHalloweenActive && ghostHuntActive)) && <HalloweenAssets pins={pins} onCatch={handleCatchGhost} onCompassUpdate={setSpookyCompass} />}

        {/* Expedition Flight Route & Animated Airplane */}
        {isExpeditionMode && routePins.length >= 2 && (
          <ExpeditionRouteLayer
            routePins={routePins}
            showRouteLine={showRouteLine}
            activeStepIdx={routeStepIdx}
            planeFlight={planeFlight}
          />
        )}

        {/* Heatmap Layer */}
        {showHeatmap && <HeatmapLayer points={displayPins} />}

        {/* Marker Layer (Hidden when Heatmap is active) */}
        {!showHeatmap && (
          <MarkerClusterGroup chunkedLoading maxClusterRadius={50} showCoverageOnHover={false} spiderfyOnMaxZoom={true} disableClusteringAtZoom={15} zoomToBoundsOnClick={true}>
            {displayPins.map(pin => (
              <PinMarker
                key={pin.id}
                pin={pin}
                isTarget={!!(targetPinId && pin.id.toString() === targetPinId)}
                isNewPin={isNew(pin.created_at)}
              />
            ))}
          </MarkerClusterGroup>
        )}

        {/* Heatmap Layer */}
        <HeatmapLayer pins={pins} isVisible={showHeatmap} />

        {draftPin && !isModalOpen && (
          <Marker position={draftPin} draggable={true} ref={markerRef} eventHandlers={dragHandlers} icon={draftIcon}>
            <Popup>
              <div className="text-center font-bold text-gray-800 p-1">Zieh mich an die genaue Stelle!</div>
            </Popup>
          </Marker>
        )}

        {liveUserPos && (
          <Marker
            position={liveUserPos}
            interactive={false}
            icon={L.divIcon({
              className: 'bg-transparent border-none',
              html: `<div style="position:relative;width:24px;height:24px"><div style="position:absolute;inset:0;background:#3b82f6;border-radius:50%;opacity:0.3;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite"></div><div style="position:absolute;inset:4px;background:#2563eb;border-radius:50%;border:2px solid white;box-shadow:0 0 6px rgba(37,99,235,0.6)"></div></div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })}
          />
        )}
      </MapContainer>

      {/* Radar & Roulette Floating Action Buttons */}
      {!draftPin && !isModalOpen && pins.length > 0 && (
        <div className="absolute bottom-24 right-3 sm:bottom-[150px] sm:right-8 z-[999] flex flex-col gap-2.5 sm:gap-3 pointer-events-none">
          <button 
            onClick={handleRoulette} 
            title={isHalloweenActive ? "🎃 Süßes oder Saures! (Zufälliger Sticker)" : "Zufälliger Sticker"}
            className="bg-white/95 backdrop-blur-md p-2.5 sm:p-3.5 rounded-full shadow-lg border border-gray-100 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition pointer-events-auto flex items-center justify-center hover:scale-110 active:scale-95"
          >
            <Dices size={20} className="sm:w-6 sm:h-6" />
          </button>
          <button 
            onClick={handleRadar} 
            title="Radar (Nächster Sticker)"
            className="bg-white/95 backdrop-blur-md p-2.5 sm:p-3.5 rounded-full shadow-lg border border-gray-100 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition pointer-events-auto flex items-center justify-center hover:scale-110 active:scale-95"
          >
            <Compass size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>
      )}


      {!draftPin ? (
        <>
          {/* DESKTOP Bottom Right CTA & Milestone (sm and up) */}
          <div className="hidden sm:flex absolute bottom-8 right-8 z-[1000] flex-col items-center gap-1.5 pointer-events-auto">
            {session && nextMilestone && (
              <div className="bg-white/95 backdrop-blur-md px-4 py-1.5 rounded-full shadow-md border border-gray-100 text-center w-full max-w-[220px]">
                <p className="text-[10px] font-bold text-gray-600 leading-tight">{nextMilestone.label}</p>
                {nextMilestone.progress !== null && (
                  <div className="w-full bg-gray-100 rounded-full h-1 mt-1">
                    <div
                      className="bg-gradient-to-r from-yellow-400 to-orange-500 h-1 rounded-full transition-all"
                      style={{ width: `${Math.min(100, nextMilestone.progress * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            )}
            <button onClick={handleStartNewPin} className="bg-blue-600 text-white px-6 py-4 w-full rounded-full shadow-xl hover:bg-blue-700 hover:scale-105 hover:-translate-y-1 transition-all font-bold text-lg flex items-center justify-center gap-2">
              <MapPin size={24} /> Sticker setzen
            </button>
          </div>

          {/* MOBILE Floating Glassmorphism App Dock (< 640px) */}
          <div className="sm:hidden fixed bottom-3 left-3 right-3 z-[3500] pointer-events-auto">
            <div className="relative bg-white/95 backdrop-blur-xl px-1.5 py-1.5 rounded-[28px] shadow-[0_8px_30px_rgba(0,0,0,0.16)] border border-gray-200/90 grid grid-cols-5 items-center overflow-hidden">
              {/* 1. Rangliste */}
              <button
                onClick={() => {
                  setShowLayerMenu(false);
                  setIsAuthModalOpen(false);
                  if (!isLeaderboardOpen) fetchAllProfiles();
                  setIsLeaderboardOpen(!isLeaderboardOpen);
                }}
                className={`flex flex-col items-center justify-center py-1.5 rounded-2xl active:scale-95 transition ${isLeaderboardOpen ? 'text-amber-600 bg-amber-50' : 'text-gray-600'}`}
              >
                <Trophy size={18} className="text-amber-500" />
                <span className="text-[9px] font-bold mt-0.5 leading-none">Ränge</span>
              </button>

              {/* 2. Karten-Layer */}
              <button
                onClick={() => {
                  setIsAuthModalOpen(false);
                  setIsLeaderboardOpen(false);
                  setShowLayerMenu(!showLayerMenu);
                }}
                className={`flex flex-col items-center justify-center py-1.5 rounded-2xl active:scale-95 transition ${showLayerMenu ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}
              >
                <Layers size={18} />
                <span className="text-[9px] font-bold mt-0.5 leading-none">Karten</span>
              </button>

              {/* 3. Center Hero CTA: Sticker setzen */}
              <button
                onClick={() => {
                  setShowLayerMenu(false);
                  setIsAuthModalOpen(false);
                  setIsLeaderboardOpen(false);
                  handleStartNewPin();
                }}
                className="mx-auto w-full max-w-[64px] py-1.5 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white rounded-2xl shadow-md shadow-blue-500/30 flex flex-col items-center justify-center active:scale-95 transition"
              >
                <MapPin size={18} strokeWidth={2.5} />
                <span className="text-[9px] font-black tracking-tight mt-0.5 leading-none">Klebe!</span>
              </button>

              {/* 4. Profil / Login */}
              <button
                onClick={() => {
                  setShowLayerMenu(false);
                  setIsLeaderboardOpen(false);
                  setIsAuthModalOpen(!isAuthModalOpen);
                }}
                className={`flex flex-col items-center justify-center py-1.5 rounded-2xl active:scale-95 transition ${isAuthModalOpen ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}
              >
                {session ? (
                  <>
                    <User size={18} className="text-blue-600" />
                    <span className="text-[9px] font-bold mt-0.5 leading-none">Profil</span>
                  </>
                ) : (
                  <>
                    <LogIn size={18} className="text-gray-600" />
                    <span className="text-[9px] font-bold mt-0.5 leading-none">Login</span>
                  </>
                )}
              </button>

              {/* 5. Story / Info */}
              <Link
                to="/about"
                onClick={() => {
                  setShowLayerMenu(false);
                  setIsAuthModalOpen(false);
                  setIsLeaderboardOpen(false);
                }}
                className="flex flex-col items-center justify-center py-1.5 rounded-2xl text-gray-600 active:scale-95 transition"
              >
                <Info size={18} />
                <span className="text-[9px] font-bold mt-0.5 leading-none">Story</span>
              </Link>

              {/* Subtle Integrated Milestone Progress Bar along bottom edge of dock */}
              {session && nextMilestone && nextMilestone.progress !== null && (
                <div className="absolute bottom-0 left-5 right-5 h-[2.5px] bg-gray-100 rounded-full overflow-hidden pointer-events-none">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, nextMilestone.progress * 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </>
      ) : !isModalOpen && (
        <div className="absolute bottom-4 left-3 right-3 sm:bottom-6 sm:left-4 sm:right-4 z-[1000] bg-white/95 backdrop-blur-md p-3.5 sm:p-4 rounded-3xl shadow-2xl border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 pointer-events-auto animate-in slide-in-from-bottom-10">
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center justify-center sm:justify-start gap-1.5"><MapPin size={16} className="text-blue-600"/> Pin platzieren</h3>
            <p className="text-xs sm:text-sm text-gray-600">Verschiebe den Pin auf der Karte an die exakte Stelle.</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={() => setDraftPin(null)} className="flex-1 sm:flex-none px-4 py-2.5 sm:py-3 bg-gray-100 text-gray-700 text-xs sm:text-sm font-bold rounded-full hover:bg-gray-200">Abbrechen</button>
            <button onClick={handleConfirmPosition} className="flex-1 sm:flex-none px-5 py-2.5 sm:py-3 bg-blue-600 text-white text-xs sm:text-sm font-bold rounded-full hover:bg-blue-700 flex items-center justify-center gap-1.5 shadow-md">
              <Check size={18}/> Bestätigen
            </button>
          </div>
        </div>
      )}

      {/* Floating Minimap (Desktop Only) */}
      {!draftPin && !isModalOpen && map && (
        <div className="absolute bottom-8 left-20 z-[1000] hidden lg:block w-44 h-44 rounded-full border-4 border-white shadow-2xl overflow-hidden pointer-events-none transition-all">
          <MapContainer 
            center={userLocation} 
            zoom={0} 
            zoomControl={false} 
            dragging={false} 
            scrollWheelZoom={false}
            doubleClickZoom={false}
            attributionControl={false}
            worldCopyJump={true}
            className="w-full h-full bg-[#e5e5e5]"
          >
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}" />
            <MinimapBounds parentMap={map} />
          </MapContainer>
        </div>
      )}

      {/* Radar Overlay */}
      {radarActive && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[2000] w-[92%] sm:w-[400px] bg-white/95 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-blue-100 animate-in slide-in-from-bottom-10 pointer-events-auto">
          <button onClick={() => setRadarActive(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition bg-gray-100 rounded-full p-1"><X size={18}/></button>
          
          {radarState === 'searching' && (
            <div className="flex flex-col items-center gap-4 py-4">
               <Compass size={40} className="text-blue-500 animate-spin" />
               <div className="text-center">
                 <p className="font-bold text-gray-900 text-lg">Radar aktiv...</p>
                 <p className="text-sm text-gray-500">Peile deinen Standort an.</p>
               </div>
            </div>
          )}
          
          {radarState === 'error' && (
            <div className="text-center py-4">
               <div className="mx-auto bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mb-3">
                 <MapPin size={24} className="text-red-500" />
               </div>
               <p className="font-bold text-gray-900 text-lg mb-1">Standort nicht gefunden</p>
               <p className="text-sm text-gray-500">Das GPS Signal ist zu schwach oder hat einen Timeout.</p>
            </div>
          )}

          {radarState === 'denied' && (
            <div className="text-center py-4">
               <div className="mx-auto bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mb-3">
                 <MapPin size={24} className="text-red-500" />
               </div>
               <p className="font-bold text-gray-900 text-lg mb-1">Standort blockiert</p>
               <p className="text-sm text-gray-500">Du musst oben im Browser (Schloss-Symbol) den Zugriff auf den Standort erlauben, damit das Radar funktioniert.</p>
            </div>
          )}
          
          {radarState === 'found' && nearestData && (
            <div className="flex flex-col items-center text-center">
               <div className="bg-blue-100 p-3 rounded-full mb-3">
                 <Navigation2 size={32} className="text-blue-600" />
               </div>
               <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-1">Nächster Sticker in</p>
               <p className="text-4xl font-black text-gray-900 mb-1 tracking-tight">
                 {nearestData.distance > 1000 ? `${(nearestData.distance / 1000).toFixed(1)} km` : `${Math.round(nearestData.distance)} m`}
               </p>
               <p className="text-sm text-gray-600 font-medium mb-6">📍 {nearestData.pin.location_name}</p>
               
               <button 
                 onClick={() => {
                   setRadarActive(false);
                   setTargetPinId(nearestData.pin.id.toString());
                   map.flyTo([nearestData.pin.lat, nearestData.pin.lng], 16, { animate: true, duration: 2.5 });
                 }}
                 className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-full hover:bg-blue-700 transition shadow-md flex items-center justify-center gap-2"
               >
                 Hinfliegen <Navigation2 size={18} />
               </button>
            </div>
          )}
        </div>
      )}

      {isModalOpen && draftPin && (
        <div
          className="absolute inset-0 z-[3600] bg-black/50 backdrop-blur-[1px] sm:backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 transition-all"
          onClick={() => setIsModalOpen(false)}
        >
          {/* Modal card – flex column so button is always pinned to bottom */}
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md relative shadow-2xl flex flex-col"
            style={{ maxHeight: '88dvh' }}
            onClick={e => e.stopPropagation()}
          >
            
            {/* Scrollable content area */}
            <div className="overflow-y-auto flex-1 p-6 pb-2">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 bg-gray-100 p-2 rounded-full transition">
                <X size={20} />
              </button>
              
              <h2 className="text-2xl font-extrabold mb-1 text-gray-900">Sticker eintragen</h2>
              
              <div className="mb-4 bg-gray-50 p-3 rounded-full border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  {isFetchingLocation ? (
                    <p className="text-xs text-blue-600">Standort wird ermittelt...</p>
                  ) : (
                    <p className="text-sm text-gray-700 font-bold flex items-center gap-1">
                      <MapPin size={14} className="text-blue-600"/> {locationName || "Manuelle Position"}
                    </p>
                  )}
                  <button onClick={handleLiveGPS} className="text-xs bg-white border border-gray-200 px-2 py-1 rounded text-blue-600 font-bold flex items-center gap-1 hover:bg-gray-100 transition">
                    <LocateFixed size={12}/> Live GPS
                  </button>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={manualLat} 
                    onChange={(e) => { setManualLat(e.target.value); setLocationName(""); }} 
                    onBlur={() => {
                      const val = parseFloat(manualLat.replace(',', '.'));
                      if(!isNaN(val)) { setDraftPin([val, draftPin[1]]); setManualLat(val.toFixed(6)); fetchLocationName(val, draftPin[1]); if (map) map.flyTo([val, draftPin[1]], 15); }
                    }}
                    className="w-1/2 text-xs border border-gray-300 p-2 rounded-lg bg-white focus:outline-blue-500" placeholder="Breitengrad" 
                  />
                  <input 
                    type="text" 
                    value={manualLng} 
                    onChange={(e) => { setManualLng(e.target.value); setLocationName(""); }} 
                    onBlur={() => {
                      const val = parseFloat(manualLng.replace(',', '.'));
                      if(!isNaN(val)) { setDraftPin([draftPin[0], val]); setManualLng(val.toFixed(6)); fetchLocationName(draftPin[0], val); if (map) map.flyTo([draftPin[0], val], 15); }
                    }}
                    className="w-1/2 text-xs border border-gray-300 p-2 rounded-lg bg-white focus:outline-blue-500" placeholder="Längengrad" 
                  />
                </div>
              </div>

              {exifNotice && (
                <div className="mb-4 bg-green-50 border border-green-200 text-green-800 text-xs p-3 rounded-full flex items-start gap-2">
                  <Info size={16} className="mt-0.5 shrink-0" />
                  <p>{exifNotice}</p>
                </div>
              )}

              <div className="space-y-4">
                {!selectedImage ? (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-2xl cursor-pointer hover:bg-blue-50 transition">
                    <div className="flex flex-col items-center justify-center">
                      <div className="bg-white p-3 rounded-full shadow-sm mb-2">
                        <Upload className="text-blue-600" size={24} />
                      </div>
                      <p className="text-sm text-gray-600 font-medium">Foto auswählen</p>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageSelection} />
                  </label>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-inner">
                    <img src={selectedImage} alt="Vorschau" className="w-full h-32 object-cover" />
                    <label className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition cursor-pointer">
                      <span className="text-white text-xs font-bold bg-black/50 px-3 py-1 rounded-full">Foto ändern</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageSelection} />
                    </label>
                  </div>
                )}

                <input 
                  type="text" 
                  placeholder="Kurze Nachricht oder Name (optional)" 
                  maxLength={60}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Sticky bottom: progress bar + button – ALWAYS visible */}
            <div className="p-4 pt-3 border-t border-gray-100 bg-white rounded-b-3xl flex-shrink-0">
              {uploadStep && (
                <div className="w-full mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    {['analyzing','compressing','uploading'].map((step, i) => {
                      const stepIdx = ['analyzing','compressing','uploading'].indexOf(uploadStep);
                      const labels = ['🔍 Analysieren', '🗜️ Komprimieren', '☁️ Hochladen'];
                      const done = i < stepIdx;
                      const active = i === stepIdx;
                      return (
                        <div key={step} className={`flex-1 text-center text-[10px] font-bold transition-all ${done ? 'text-green-600' : active ? 'text-blue-600' : 'text-gray-300'}`}>{done ? '✅' : labels[i]}</div>
                      );
                    })}
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: uploadStep === 'analyzing' ? '15%' : uploadStep === 'compressing' ? '55%' : '90%' }} />
                  </div>
                </div>
              )}
              <button 
                disabled={!compressedFile || isCompressing || isUploading}
                onClick={handleUpload}
                className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-full disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition shadow-md text-base"
              >
                {isUploading ? 'Wird hochgeladen...' : isCompressing ? 'Wird vorbereitet...' : 'Sticker hochladen ✓'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Auth Modal */}
      {!session && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black">
          <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0">
            <source src="/landingpage.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-0"></div>
          <div className="bg-black/60 backdrop-blur-xl rounded-3xl w-full max-w-sm p-8 shadow-2xl relative z-10 border border-white/10">
            
            <div className="text-center mb-6">
              <Sparkles size={40} className="text-blue-500 mx-auto mb-3" />
              <h2 className="text-2xl font-black text-white mb-2 drop-shadow-md">Login</h2>
              <p className="text-sm text-gray-300 mb-4 drop-shadow-sm">Melde dich an, um in Zukunft Abzeichen zu sammeln und Styles freizuschalten.</p>
              
              <div className="text-left bg-black/50 p-3 rounded-xl border border-white/10">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 shrink-0" />
                  <span className="text-[10px] text-gray-300 leading-tight">
                    <strong>Nutzungsbedingungen & Haftungsausschluss:</strong> Ich bestätige, dass ich mich vor dem Anbringen von Stickern über die lokalen Gesetze informiere. Ich hafte vollumfänglich und allein für mein Handeln. Der Seitenbetreiber übernimmt keinerlei Haftung für Schäden, Ordnungswidrigkeiten oder Straftaten. Das Verkleben ohne Zustimmung des Eigentümers ist illegal.<br/><br/><strong>Datenschutz:</strong> Dies ist ein privates Hobby-Projekt. Deine E-Mail (Login), Fotos & GPS-Standorte werden gespeichert und sind für andere Eingeladene auf der Karte sichtbar. Es findet keine kommerzielle Auswertung statt.
                  </span>
                </label>
              </div>
            </div>
            
            <button 
              onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
              disabled={!agreedToTerms}
              className={`w-full flex items-center justify-center gap-3 bg-white/10 backdrop-blur border font-bold py-3 rounded-full transition mb-3 ${agreedToTerms ? 'border-white/30 text-white hover:bg-white/20' : 'border-white/10 text-gray-400 cursor-not-allowed opacity-50'}`}
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className={`w-5 h-5 ${!agreedToTerms && 'grayscale opacity-50'}`} />
              Weiter mit Google
            </button>
          </div>
        </div>
      )}

            {/* Invite Modal */}
      {session && showInviteModal && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 bg-black">
          <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0">
            <source src="/landingpage.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-0"></div>
          <div className="bg-black/60 backdrop-blur-xl rounded-3xl w-full max-w-sm p-8 shadow-2xl relative z-10 border border-white/10 text-center">
            
            <Shield size={40} className="text-yellow-500 mx-auto mb-3" />
            <h2 className="text-2xl font-black text-white mb-2 drop-shadow-md">Closed Beta</h2>
            <p className="text-sm text-gray-300 mb-6 drop-shadow-sm">Bitte gib deinen Einladungscode ein, um freigeschaltet zu werden.<br/><span className="text-xs text-yellow-500 font-bold mt-2 block">Einladungscode kannst du beim Admin anfragen.</span></p>
            
            <input 
              type="text" 
              placeholder="Code eingeben"
              value={inviteCodeInput}
              onChange={e => setInviteCodeInput(e.target.value.toUpperCase())}
              className="w-full text-center tracking-widest text-lg font-bold bg-white/10 border border-white/20 text-white placeholder-gray-400 py-3 rounded-full mb-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition"
            />
            {inviteError && <p className="text-xs text-red-400 font-bold mb-4">{inviteError}</p>}
            {!inviteError && <div className="h-4 mb-4"></div>}
            
            <button 
              onClick={submitInviteCode}
              className="w-full bg-yellow-500 text-black font-black py-3 rounded-full hover:bg-yellow-400 transition mb-4"
            >
              Code einlösen
            </button>
            <button onClick={() => supabase.auth.signOut()} className="text-xs text-gray-400 hover:text-white transition underline">Abmelden</button>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {session && isAuthModalOpen && (
        <div
          className="absolute inset-0 z-[3000] bg-black/35 sm:bg-black/60 backdrop-blur-[1px] sm:backdrop-blur-sm flex items-center justify-center p-3 pb-20 sm:p-4"
          onClick={() => setIsAuthModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-sm shadow-2xl relative flex flex-col max-h-[78dvh] sm:max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-3.5 right-3.5 text-gray-400 hover:text-gray-900 bg-gray-100/80 hover:bg-gray-200/80 rounded-full p-1.5 transition z-10">
              <X size={20} />
            </button>

            {/* Compact Sticky Header (leaves maximum room for scrolling tabs on mobile) */}
            <div className="p-4 pb-2.5 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3 pr-9 mb-2.5">
                <div className="relative shrink-0">
                  <img
                    src={session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${session.user.email}&background=random`}
                    alt="Avatar"
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-white shadow-md object-cover"
                  />
                  {hasPioneer && (
                    <span className="absolute -bottom-1 -right-1 bg-yellow-400 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow">
                      No.{myPioneerRank}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1 text-left">
                  {isEditingNickname ? (
                    <div className="flex flex-col gap-1.5">
                      <input
                        type="text"
                        value={tempNickname}
                        onChange={e => setTempNickname(e.target.value)}
                        placeholder="Nickname..."
                        className="w-full px-3 py-1 border-2 border-blue-100 rounded-full focus:outline-none focus:border-blue-500 font-bold text-xs"
                        maxLength={20}
                      />
                      <div className="flex gap-1.5">
                        <button onClick={() => setIsEditingNickname(false)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-1 rounded-full text-[10px]">Abbrechen</button>
                        <button
                          onClick={async () => {
                            if (tempNickname.trim().length < 3) return alert('Nickname zu kurz!');
                            const { error } = await supabase.from('profiles').update({ nickname: tempNickname.trim() }).eq('id', session.user.id);
                            if (!error) {
                              setProfile({ ...profile, nickname: tempNickname.trim() });
                              setIsEditingNickname(false);
                            } else alert('Name schon vergeben!');
                          }}
                          className="flex-1 bg-blue-600 text-white font-bold py-1 rounded-full text-[10px]"
                        >
                          Speichern
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-base sm:text-lg font-black text-gray-900 truncate leading-tight">
                        {profile?.nickname || 'Kein Nickname'}
                      </h2>
                      <button
                        onClick={() => { setTempNickname(profile?.nickname || ''); setIsEditingNickname(true); }}
                        className="text-blue-500 text-[11px] font-bold hover:underline"
                      >
                        Nickname ändern
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Clean Full-Width Compact Stats Strip */}
              <div className="grid grid-cols-3 bg-gray-50 py-1.5 px-2 rounded-2xl border border-gray-100 mb-2.5">
                <div className="text-center">
                  <p className="text-xs sm:text-sm font-black text-gray-900 leading-none">{myPins.length}</p>
                  <p className="text-[8px] text-gray-400 font-bold uppercase mt-0.5">Sticker</p>
                </div>
                <div className="text-center border-x border-gray-200/80">
                  <p className="text-xs sm:text-sm font-black text-gray-900 leading-none">{totalDistanceKm > 999 ? `${(totalDistanceKm / 1000).toFixed(1)}k` : totalDistanceKm}</p>
                  <p className="text-[8px] text-gray-400 font-bold uppercase mt-0.5">km Reise</p>
                </div>
                <div className="text-center">
                  <p className="text-xs sm:text-sm font-black text-gray-900 leading-none">{uniqueCountries.size}</p>
                  <p className="text-[8px] text-gray-400 font-bold uppercase mt-0.5">Länder</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex bg-gray-100 rounded-2xl p-1">
                {[['profil', '👤 Profil'], ['abzeichen', '🏆 Abzeichen'], ['einstellungen', '⚙️ Einst.']].map(([tab, label]) => (
                  <button
                    key={tab}
                    onClick={() => setProfileTab(tab)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${profileTab === tab ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Content (block flow with space-y-3.5 prevents flexbox from clipping banners/cards!) */}
            <div className="overflow-y-auto overscroll-contain touch-pan-y custom-scrollbar flex-1 min-h-0 p-4 space-y-3.5">

              {/* TAB: PROFIL (Weltkarte + Eigene Karte Toggle + Avatar & Rahmen) */}
              {profileTab === 'profil' && (
                <>
                  {/* Eigene Weltkarte & Pin-Filter Card */}
                  <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100 text-left">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div>
                        <p className="text-[10px] font-black text-gray-700 uppercase tracking-wider">
                          🌍 Deine Weltkarte ({uniqueCountries.size} {uniqueCountries.size === 1 ? 'Land' : 'Länder'})
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {myPins.length} eigene Sticker geklebt
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const next = !showOnlyMyPins;
                          setShowOnlyMyPins(next);
                          if (next) setIsAuthModalOpen(false);
                        }}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-black transition flex items-center gap-1 shrink-0 shadow-sm ${
                          showOnlyMyPins
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'
                        }`}
                      >
                        <MapPin size={12} />
                        <span>{showOnlyMyPins ? 'Alle Pins zeigen' : 'Meine Pins auf Karte'}</span>
                      </button>
                    </div>

                    <div className="bg-white rounded-xl overflow-hidden border border-gray-100 pointer-events-none">
                      <ErrorBoundary>
                        <VisitedCountriesMap visitedCountries={uniqueCountries} />
                      </ErrorBoundary>
                    </div>

                    {uniqueCountries.size > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {[...uniqueCountries].filter(Boolean).map(country => (
                          <span key={country} className="text-[9px] bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-full">
                            {country}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Avatar & Rahmen Card */}
                  <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100 text-left">
                    <h3 className="text-[10px] font-black text-gray-700 uppercase tracking-wider mb-2.5">🎨 Avatar &amp; Rahmen</h3>
                    {FEATURE_AVATARS ? (
                      <div className="flex gap-3.5 items-start">
                        <div className={`avatar-frame frame-${editFrame} relative w-14 h-14 text-2xl shadow bg-white rounded-full shrink-0`}>
                          <div className="w-full h-full overflow-hidden rounded-full flex items-center justify-center">
                            {editAvatar === 'default' ? '🦊' : editAvatar === 'pumpkin' ? '🎃' : editAvatar === 'ghost' ? '👻' : editAvatar === 'bat' ? '🦇' : editAvatar === 'reindeer' ? '🦌' : editAvatar === 'snowman' ? '⛄' : editAvatar === 'fire' ? <img src="/badges/avatar_fire.jpg" className="w-full h-full object-cover" /> : editAvatar === 'cyberpunk' ? <img src="/badges/avatar_cyberpunk.jpg" className="w-full h-full object-cover" /> : editAvatar === 'retro' ? <img src="/badges/avatar_retro.jpg" className="w-full h-full object-cover" /> : editAvatar === 'pioneer' ? <img src="/badges/avatar_pioneer.jpg" className="w-full h-full object-cover" /> : editAvatar === 'admin' ? <img src="/badges/avatar_admin.jpg" className="w-full h-full object-cover" /> : editAvatar === 'polar' ? <img src="/badges/avatar_polar.jpg" className="w-full h-full object-cover" /> : '🦊'}
                          </div>
                        </div>
                        <div className="flex-1 space-y-2">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Avatar</p>
                            <div className="flex flex-wrap gap-1.5">
                              <button onClick={() => setEditAvatar('default')} className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition ${editAvatar === 'default' ? 'bg-purple-100 ring-2 ring-purple-500' : 'bg-white border border-gray-200'}`}>🦊</button>
                              {(hasHalloween || hasGhostHunter) && <button onClick={() => setEditAvatar('ghost')} className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition ${editAvatar === 'ghost' ? 'bg-purple-100 ring-2 ring-purple-500' : 'bg-white border border-gray-200'}`}>👻</button>}
                              {(hasHalloween || hasGhostHunter) && <button onClick={() => setEditAvatar('bat')} className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition ${editAvatar === 'bat' ? 'bg-purple-100 ring-2 ring-purple-500' : 'bg-white border border-gray-200'}`}>🦇</button>}
                              {hasGhostHunter && <button onClick={() => setEditAvatar('pumpkin')} title="Geisterjäger Belohnung" className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition ${editAvatar === 'pumpkin' ? 'bg-orange-100 ring-2 ring-orange-500' : 'bg-white border border-orange-200'}`}>🎃</button>}
                              {hasWinter && <button onClick={() => setEditAvatar('reindeer')} className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition ${editAvatar === 'reindeer' ? 'bg-purple-100 ring-2 ring-purple-500' : 'bg-white border border-gray-200'}`}>🦌</button>}
                              {hasWinter && <button onClick={() => setEditAvatar('snowman')} className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition ${editAvatar === 'snowman' ? 'bg-purple-100 ring-2 ring-purple-500' : 'bg-white border border-gray-200'}`}>⛄</button>}
                              {hasPolarExplorer && <button onClick={() => setEditAvatar('polar')} className={`w-8 h-8 rounded-lg overflow-hidden transition ${editAvatar === 'polar' ? 'ring-2 ring-purple-500' : 'border border-gray-200'}`}><img src="/badges/avatar_polar.jpg" className="w-full h-full object-cover" /></button>}
                              {hasUrbanLegend && <button onClick={() => setEditAvatar('cyberpunk')} className={`w-8 h-8 rounded-lg overflow-hidden transition ${editAvatar === 'cyberpunk' ? 'ring-2 ring-purple-500' : 'border border-gray-200'}`}><img src="/badges/avatar_cyberpunk.jpg" className="w-full h-full object-cover" /></button>}
                              {hasRetroGamer && <button onClick={() => setEditAvatar('retro')} className={`w-8 h-8 rounded-lg overflow-hidden transition ${editAvatar === 'retro' ? 'ring-2 ring-purple-500' : 'border border-gray-200'}`}><img src="/badges/avatar_retro.jpg" className="w-full h-full object-cover" /></button>}
                              {hasMarathon && <button onClick={() => setEditAvatar('fire')} className={`w-8 h-8 rounded-lg overflow-hidden transition ${editAvatar === 'fire' ? 'ring-2 ring-purple-500' : 'border border-gray-200'}`}><img src="/badges/avatar_fire.jpg" className="w-full h-full object-cover" /></button>}
                              {hasPioneer && <button onClick={() => setEditAvatar('pioneer')} className={`w-8 h-8 rounded-lg overflow-hidden transition ${editAvatar === 'pioneer' ? 'ring-2 ring-purple-500' : 'border border-gray-200'}`}><img src="/badges/avatar_pioneer.jpg" className="w-full h-full object-cover" /></button>}
                              {isAdmin && <button onClick={() => setEditAvatar('admin')} className={`w-8 h-8 rounded-lg overflow-hidden ring-2 ring-yellow-400 transition ${editAvatar === 'admin' ? 'ring-purple-500' : ''}`}><img src="/badges/avatar_admin.jpg" className="w-full h-full object-cover" /></button>}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Rahmen</p>
                            <div className="flex flex-wrap gap-1.5">
                              <button onClick={() => setEditFrame('none')} className={`px-2 py-1 rounded-md text-xs font-bold transition ${editFrame === 'none' ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>Keiner</button>
                              {(devMode || hasUrbanLegend) && <button onClick={() => setEditFrame('neon')} className={`px-2 py-1 rounded-md text-xs font-bold transition ${editFrame === 'neon' ? 'bg-purple-600 text-white' : 'bg-white border border-purple-200 text-purple-600'}`}>Neon</button>}
                              {(devMode || hasPolarExplorer || hasWinter) && <button onClick={() => setEditFrame('frost')} className={`px-2 py-1 rounded-md text-xs font-bold transition ${editFrame === 'frost' ? 'bg-cyan-500 text-white' : 'bg-white border border-cyan-200 text-cyan-600'}`}>Frost</button>}
                              {(devMode || hasMarathon) && <button onClick={() => setEditFrame('fire')} className={`px-2 py-1 rounded-md text-xs font-bold transition ${editFrame === 'fire' ? 'bg-orange-500 text-white' : 'bg-white border border-orange-200 text-orange-600'}`}>Feuer</button>}
                              {(devMode || hasHalloween || hasGhostHunter) && <button onClick={() => setEditFrame('spooky')} className={`px-2 py-1 rounded-md text-xs font-bold transition ${editFrame === 'spooky' ? 'bg-orange-600 text-white' : 'bg-white border border-orange-300 text-orange-600'}`}>🎃 Spooky</button>}
                            </div>
                          </div>
                          <button onClick={() => handleUpdateAvatarAndFrame(editAvatar, editFrame)} className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2 rounded-xl transition">Speichern</button>
                        </div>
                      </div>
                    ) : <p className="text-sm text-gray-400 text-center">Avatar-Auswahl kommt bald!</p>}
                  </div>
                </>
              )}

              {/* TAB: ABZEICHEN */}
              {profileTab === 'abzeichen' && (
                <div className="flex flex-col gap-3">
                  {devMode && <div className="text-center text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase">DevMode: Alles frei</div>}

                  <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Sammler Fortschritt</p>
                      <span className="text-xs font-bold text-gray-700">{myPins.length}/50</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2 mb-1">
                      <div className="bg-gradient-to-r from-yellow-500 to-orange-400 h-2 rounded-full transition-all duration-500" style={{width: `${Math.min(100, (myPins.length / 50) * 100)}%`}} />
                    </div>
                    <p className="text-[10px] text-gray-400">{myPins.length < 5 ? `Noch ${5 - myPins.length} bis Bronze` : myPins.length < 10 ? `Noch ${10 - myPins.length} bis Silber` : myPins.length < 50 ? `Noch ${50 - myPins.length} bis Gold` : 'Gold Sammler erreicht!'}</p>
                  </div>

                  {/* Schnellfilter-Pills für Mobile Übersicht */}
                  <div className="flex items-center gap-1.5">
                    {[
                      ['all', 'Alle Kategorien'],
                      ['unlocked', 'Freigeschaltet ✨'],
                      ['locked', 'Offen 🔒']
                    ].map(([val, lbl]) => (
                      <button
                        key={val}
                        onClick={() => setBadgeFilter(val)}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-[10px] font-bold border transition ${
                          badgeFilter === val
                            ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>

                  {[
                    { label: 'Exklusiv & Limitiert', color: 'ring-blue-400', items: [
                      { has: devMode || hasEuCenter, img: '/badges/badge_eu.png', bg: 'bg-blue-800', title: 'Mitte der EU', titleL: '??? (Limit: 1 Weltweit)', desc: 'Du warst der Erste in der Mitte der EU!', descL: euOwner ? 'Bereits von jemand anderem ergattert!' : 'Klebe als allererster Nutzer in die Mitte der EU.', date: getUnlockDate('eu_center') },
                      { has: hasPioneer, img: '/badges/badge_pioneer.jpg', title: `Pionier der ersten Stunde (No. ${myPioneerRank}/15) 🚀`, titleL: 'Pionier der ersten Stunde (Limit: 15)', desc: 'Du gehörst zu den ersten 15 Nutzern weltweit!', descL: 'Streng limitiert auf die exakt ersten 15 Nutzer.', date: getUnlockDate('pioneer') },
                    ]},
                    { label: '🏔️ Gipfeli – 16 Bundesländer', color: 'ring-amber-400', items: PEAKS.map(peak => {
                      const claim = globalAchievements.find(g => g.achievement_id === `gipfeli_${peak.id}`);
                      const isMine = devMode || (claim && claim.user_id === session?.user?.id);
                      const ownerName = claim ? (allProfiles[claim.user_id]?.nickname || 'einem Entdecker') : null;
                      const unlockDate = claim?.claimed_at ? new Date(claim.claimed_at).toLocaleDateString('de-DE') : null;
                      return {
                        has: isMine,
                        img: peak.img,
                        title: `${peak.name} (${peak.alt}m) 🏆`,
                        titleL: `${peak.name} (${peak.alt}m)`,
                        desc: `Weltweit einzigartig! Du hast diesen Bundesland-Gipfel als Allererster erobert.`,
                        descL: claim ? `🔒 Bereits erobert von ${ownerName}${unlockDate ? ' am ' + unlockDate : ''}` : '🟢 Noch frei! Klebe als Erster auf diesen Gipfel.',
                        date: isMine ? unlockDate : null
                      };
                    })},
                    { label: 'Karten-Freischaltungen', color: 'ring-indigo-400', items: [
                      { has: canUseDark, img: '/badges/night_owl.jpg', title: 'Nachteule 🦉', titleL: '??? (Nachteule)', desc: 'Nachts (22–4 Uhr) geklebt. Dark Mode frei.', descL: 'Ein Geheimnis, das im Schutz der Dunkelheit ruht...', date: getUnlockDate('nightOwl') },
                      { has: canUseVintage, img: '/badges/local_hero.jpg', title: 'Lokalmatador 🗺️', titleL: '??? (Lokalmatador)', desc: '5 Sticker geklebt. Explorer-Karte frei.', descL: 'Nur wer Ausdauer beweist, wird die alte Welt sehen...', date: getUnlockDate('localHero') },
                      { has: canUseSunrise, img: '/badges/early_bird.jpg', title: 'Frühaufsteher 🌅', titleL: '??? (Frühaufsteher)', desc: 'Morgens (5–8 Uhr) geklebt. Sunrise-Karte frei.', descL: 'Der frühe Vogel fängt den Wurm...', date: getUnlockDate('earlyBird') },
                      { has: canUseSpooky, img: '/badges/halloween.jpg', title: 'Süßes oder Saures 🎃', titleL: '??? (Zeitlich begrenzt)', desc: 'Halloween Event. Spooky-Karte frei.', descL: 'Nur einmal im Jahr aus den Schatten...', date: getUnlockDate('halloween') },
                      { has: canUseSnow, img: '/badges/winter.jpg', title: 'Winterwunder ⛄', titleL: '??? (Zeitlich begrenzt)', desc: 'Weihnachts Event. Snow-Karte frei.', descL: 'Wenn die Tage kürzer werden...', date: getUnlockDate('winter') },
                      { has: canUseAurora, img: '/badges/polar.jpg', title: 'Polarforscher ❄️', titleL: '??? (Polarforscher)', desc: 'Im hohen Norden/Süden. Aurora-Karte frei.', descL: 'Nur wer der extremen Kälte trotzt...', date: getUnlockDate('polar') },
                      { has: canUseCyberpunk, img: '/badges/urban.jpg', title: 'Urban Legend 🏙️', titleL: '??? (Großstadt)', desc: 'In einer Weltmetropole. Cyberpunk frei.', descL: 'Dort wo das Neonlicht niemals schläft...', date: getUnlockDate('urban') },
                      { has: devMode || hasRetroGamer, img: '/badges/retro.jpg', title: 'Pixel Pioneer 👾', titleL: '??? (Retro Gamer)', desc: '10 Sticker geklebt. 8-Bit Karte frei!', descL: 'Klebe 10 Sticker, um in die Vergangenheit zu reisen...', date: null },
                    ]},
                    { label: 'Spezial & Zeitlich', color: 'ring-yellow-400', items: [
                      { has: hasGhostHunter, img: '/badges/badge_ghosthunter.jpg', title: `Geisterjäger (${ghostsCaught} gefangen) 👻`, titleL: `??? (Halloween Geisterjagd ${ghostsCaught}/${GHOST_GOAL})`, desc: `${GHOST_GOAL} versteckte Spukgestalten mit dem Spooky-Kompass aufgespürt! Kürbis-Avatar & Spooky-Rahmen frei.`, descL: `Spüre während des Halloween-Events mit dem Spooky-Kompass ${GHOST_GOAL} versteckte Geister nahe Stickern auf (ab Zoom 13+)!`, date: null },
                      { has: devMode || hasPi, img: '/badges/badge_pi.jpg', title: 'PI (3,14) 🥧', titleL: '??? (Mathematiker)', desc: 'Auf dem 3,14 Breiten- oder Längengrad.', descL: 'Nur für wahre Geeks und Nerds...', date: getUnlockDate('pi') },
                      { has: devMode || hasMay4, img: '/badges/badge_may4.jpg', title: 'May the force be with you 🛸', titleL: '??? (Sci-Fi Fan)', desc: 'Am 4. Mai geklebt.', descL: 'Spüre die Macht an einem ganz bestimmten Tag...', date: getUnlockDate('may4') },
                      { has: devMode || hasLove, img: '/badges/badge_love.jpg', title: 'True Love 💌', titleL: '??? (Romantiker)', desc: 'Am Valentinstag (14. Feb) geklebt.', descL: 'Die Liebe liegt in der Luft...', date: getUnlockDate('love') },
                      { has: devMode || hasSilvester, img: '/badges/badge_silvester.jpg', title: 'Silvester 🎆', titleL: '??? (Feuerwerk)', desc: 'An Silvester oder Neujahr geklebt.', descL: 'Lass es knallen zum Jahreswechsel!', date: getUnlockDate('silvester') },
                    ]},
                    { label: 'Abenteuer & Reisen', color: 'ring-emerald-400', items: [
                      { has: devMode || hasBorderCrosser, img: '/badges/badge_border.jpg', title: 'Grenzgänger 🛂', titleL: '??? (Grenzenlos)', desc: 'Zwei Sticker <10km voneinander, aber in versch. Ländern.', descL: 'Überwinde die Grenzen dieser Welt...', date: null },
                      { has: devMode || hasGlobetrotter, img: '/badges/badge_globetrotter.jpg', title: 'Globetrotter 🌍', titleL: '??? (Weltenbummler)', desc: 'Sticker auf allen 6 Kontinenten.', descL: 'Bereise die gesamte Welt...', date: null },
                      { has: devMode || hasTier100, img: '/badges/badge_platinum.jpg', title: 'Platin Sammler (100 Pins) ✅', titleL: '??? (Sammler)', desc: 'Du bist eine Legende!', descL: 'Klebe 100 Sticker.', date: null },
                      { has: devMode || hasTier5, img: '/badges/badge_bronze.jpg', title: 'Bronze Sammler (5 Pins) ✅', titleL: '??? (Sammler)', desc: 'Aller Anfang ist gemacht.', descL: 'Klebe 5 Sticker.', date: getUnlockDate('tier5') },
                      { has: devMode || hasTier10, img: '/badges/badge_silver.jpg', title: 'Silber Sammler (10 Pins) ✅', titleL: '??? (Sammler)', desc: 'Eine stolze Sammlung.', descL: 'Klebe 10 Sticker.', date: getUnlockDate('tier10') },
                      { has: devMode || hasTier50, img: '/badges/badge_gold.jpg', title: 'Gold Sammler (50 Pins) ✅', titleL: '??? (Sammler)', desc: 'Eine beachtliche Leistung!', descL: 'Klebe 50 Sticker.', date: getUnlockDate('tier50') },
                      { has: devMode || hasWorldTraveler, img: '/badges/world_traveler.jpg', title: 'Weltenbummler ✅', titleL: '??? (Weltenbummler)', desc: 'In mind. 3 Ländern geklebt.', descL: 'Die Welt ist groß, bereise sie...', date: getUnlockDate('worldTraveler') },
                      { has: hasMarathon, img: '/badges/streak.jpg', title: 'Feuer & Flamme ✅', titleL: '??? (Marathon)', desc: 'An 3 aufeinanderfolgenden Tagen geklebt.', descL: 'Konstanz ist der Schlüssel...', date: getUnlockDate('marathon') },
                      { has: devMode || hasYinYang, img: '/badges/badge_yinyang.jpg', title: 'Yin & Yang ✅', titleL: '??? (Balance)', desc: 'Nord- und Südhalbkugel vereint.', descL: 'Finde das Gleichgewicht...', date: getUnlockDate('yinyang') },
                      { has: devMode || hasVivaldi, img: '/badges/badge_vivaldi.jpg', title: 'Die 4 Jahreszeiten ✅', titleL: '??? (Vivaldi)', desc: 'In allen 4 Jahreszeiten geklebt.', descL: 'Erlebe den Kreislauf der Natur...', date: getUnlockDate('vivaldi') },
                      { has: devMode || hasNz, img: '/badges/badge_nz.jpg', title: 'One Geophysalis to rule them all ✅', titleL: '??? (Neuseeland)', desc: 'In Neuseeland (Mittelerde) geklebt.', descL: 'Wirf den Ring ins Feuer...', date: getUnlockDate('nz') },
                      { has: devMode || hasUshuaia, img: '/badges/badge_ushuaia.jpg', title: 'Im Auge des Sturms ✅', titleL: '??? (Feuerland)', desc: 'Am Südzipfel von Argentinien geklebt.', descL: 'Das Ende der Welt im tiefen Süden...', date: getUnlockDate('ushuaia') },
                    ]},
                    { label: 'Legendäre Entdeckungen', color: 'ring-orange-400', items: [
                      { has: devMode || hasTimeIsRelativ, img: '/badges/badge_time.jpg', title: 'Time is relativ', titleL: '??? (Einstein)', desc: 'Zwei Sticker innerhalb 24h in versch. Zeitzonen (>15° Längengrad-Diff).', descL: 'Beweise, dass Zeit relativ ist. Manche reisen schneller als die Sonne...', date: null },
                      { has: devMode || hasEU, img: '/badges/badge_eu.png', bg: 'bg-blue-800', title: 'EU Explorer', titleL: '??? (Europa)', desc: 'Mindestens 5 Länder besucht und eins davon in der EU.', descL: 'Bereise unseren Kontinent...', date: null },
                      { has: devMode || hasUnterTage, img: '/badges/badge_unter_tage.jpg', title: 'Unter Tage ⛏️', titleL: '??? (Unter Tage)', desc: 'Tief in einer Höhle oder im Bergwerk.', descL: 'Beweisfoto aus der absoluten Dunkelheit...', date: null },
                      { has: devMode || hasAtlantis, img: '/badges/badge_atlantis.jpg', title: 'Atlantis 🌊', titleL: '??? (Atlantis)', desc: 'Ein Sticker komplett unter Wasser.', descL: 'Beweisfoto tief unter der Wasseroberfläche...', date: null },
                      { has: devMode || hasAurora, img: '/badges/badge_aurora.jpg', title: 'Aurora Borealis 🌌', titleL: '??? (Aurora Borealis)', desc: 'Geklebt unter echten Polarlichtern.', descL: 'Beweisfoto mit dem Tanz der Nordlichter...', date: null },
                      { has: devMode || hasLostPlace, img: '/badges/badge_lost_place.jpg', title: 'Lost Place 🏚️', titleL: '??? (Lost Place)', desc: 'Geklebt an einem verlassenen Ort.', descL: 'Beweisfoto von einem vergessenen Ort...', date: null },
                      { has: devMode || hasSonnenfinsternis, img: '/badges/badge_eclipse.jpg', title: 'Sonnenfinsternis 🌑', titleL: '??? (Sonnenfinsternis)', desc: 'Geklebt während einer Sonnenfinsternis.', descL: 'Beweisfoto während die Sonne verschwindet...', date: null },
                      { has: devMode || hasCoop, img: '/badges/badge_coop.jpg', title: 'Coop', titleL: '??? (Coop)', desc: 'Zusammen mit einem anderen Nutzer geklebt.', descL: 'Beweisfoto: Geteilte Freude ist doppelte Freude...', date: null },
                      { has: devMode || hasOG, img: '/badges/badge_og.jpg', title: 'OG Geophysalis', titleL: '??? (OG)', desc: 'Einen originalen, alten Sticker geklebt.', descL: 'Beweisfoto: Ein Relikt aus vergangenen Zeiten...', date: null },
                        { has: devMode || hasWuestenfuchs, img: '/badges/badge_wuestenfuchs.jpg', title: 'Wüstenfuchs 🐪', titleL: '??? (Wüste)', desc: 'Beweisfoto mitten in einer großen Wüste.', descL: 'Beweisfoto von Sand und unendlicher Hitze...', date: null },
                        { has: devMode || hasDreilaendereck, img: '/badges/badge_dreilaendereck.jpg', title: 'Drei-Länder-Eck 📍', titleL: '??? (Grenzen)', desc: 'Genau dort geklebt, wo 3 Länder aufeinandertreffen.', descL: 'Beweisfoto exakt an der Grenze von drei Nationen...', date: null },
                      { has: devMode || hasDGG2027, icon: '⚒️', bg: 'bg-red-800', title: 'DGG 2027', titleL: '??? (DGG 2027)', desc: 'Während der DGG 2027 in Aachen geklebt.', descL: 'Sei 2027 am richtigen Ort...', date: null },
                      { has: devMode || hasGAP2027, icon: '⚒️', bg: 'bg-purple-800', title: 'GAP 2027', titleL: '??? (GAP 2027)', desc: 'Während des GAP 2027 in Freiberg geklebt.', descL: 'Sei 2027 am richtigen Ort...', date: null },
                    ]},
                    { label: 'Höhen & Tiefen', color: 'ring-blue-300', items: [
                      { has: devMode || hasMariana, icon: '🐙', title: 'Marianengraben', titleL: '??? (Tiefsee)', desc: 'Am tiefsten Punkt der Erde.', descL: 'Reise zum tiefsten Punkt der Ozeane...', date: null },
                      { has: devMode || hasSteinbock, img: '/badges/badge_steinbock.jpg', title: 'Steinbock 🧗', titleL: '??? (Steinbock)', desc: 'Sticker auf über 3000m Höhe.', descL: 'Erklimme Höhen über 3000m...', date: null },
                      { has: devMode || hasBerggams, img: '/badges/badge_berggams.jpg', title: 'Berggams 🐐', titleL: '??? (Berggams)', desc: 'Sticker auf über 2000m Höhe.', descL: 'Erklimme Höhen über 2000m...', date: null },
                      { has: devMode || hasAlpinist, img: '/badges/badge_gipfeli.jpg', title: 'Alpinist 🏔️', titleL: '??? (Alpinist)', desc: 'Sticker auf über 1000m Höhe.', descL: 'Erklimme Höhen über 1000m...', date: null },
                      { has: devMode || hasLuft, img: '/badges/badge_luft.jpg', title: 'Luft Luft Luft 🎈', titleL: '??? (Himmel)', desc: 'Sticker auf über 7000m Höhe.', descL: 'Greife nach den Sternen (>7000m)...', date: null },
                    ]}
                  ].map(section => {
                    const filteredItems = badgeFilter === 'unlocked'
                      ? section.items.filter(b => b.has)
                      : badgeFilter === 'locked'
                        ? section.items.filter(b => !b.has)
                        : section.items;
                    if (badgeFilter !== 'all' && filteredItems.length === 0) return null;
                    const isOpen = badgeFilter !== 'all' || openAccordion === section.label;
                    const unlockedCount = section.items.filter(b => b.has).length;
                    return (
                    <div key={section.label} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                      <button 
                        onClick={() => setOpenAccordion(openAccordion === section.label ? null : section.label)}
                        className="w-full flex items-center justify-between p-3.5 bg-gray-50 hover:bg-gray-100 transition"
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black text-gray-700 uppercase tracking-wider text-left">{section.label}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${unlockedCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-600'}`}>{unlockedCount}/{section.items.length}</span>
                        </div>
                        <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
                      </button>
                      {isOpen && (
                        <div className="p-2.5 flex flex-col gap-2">
                          {filteredItems.map((b, i) => (
                            <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl transition ${b.has ? 'bg-white border border-gray-100 shadow-sm' : 'opacity-45 grayscale bg-gray-50'}`}>
                              <div className={`w-11 h-11 rounded-xl overflow-hidden shrink-0 flex items-center justify-center text-xl ${b.has ? section.color + ' ring-2 shadow' : 'border-2 border-gray-300'} ${b.bg || ''}`}>
                                {b.img ? <img src={b.img} className="w-full h-full object-cover" /> : b.icon}
                              </div>
                              <div className="min-w-0 flex-1 text-left">
                                <p className="text-xs sm:text-sm font-black text-gray-800 leading-tight truncate">{b.has ? b.title : b.titleL}</p>
                                <p className="text-[11px] text-gray-500 line-clamp-2">{b.has ? b.desc : b.descL}</p>
                                {b.has && b.date && <span className="text-[9px] text-gray-400">Freigeschaltet am {b.date}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )})}
                </div>
              )}

              {/* TAB: EINSTELLUNGEN */}
              {profileTab === 'einstellungen' && (
                <div className="flex flex-col gap-3">
<button 
                    onClick={handleShareCard} 
                    disabled={isSharing}
                    className={`w-full border-2 font-bold py-3 rounded-2xl transition flex items-center justify-center gap-2 ${isSharing ? 'bg-gray-100 text-gray-400 border-gray-200 opacity-70' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'}`}
                  >
                    {isSharing ? <Loader2 size={18} className="animate-spin" /> : <Share size={18} />}
                    {isSharing ? 'Bild wird generiert...' : 'Profil-Karte erstellen & teilen'}
                  </button>
                  <p className="text-xs text-gray-400 text-center break-all">{session.user.email}</p>
                  <label className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl cursor-pointer hover:bg-gray-100 transition">
                    <span className="font-bold text-gray-700 text-sm">Nur meine Sticker zeigen</span>
                    <div className={`w-12 h-6 rounded-full transition relative ${showOnlyMyPins ? 'bg-blue-600' : 'bg-gray-300'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${showOnlyMyPins ? 'left-7' : 'left-1'}`}></div>
                    </div>
                    <input type="checkbox" className="hidden" checked={showOnlyMyPins} onChange={e => { setShowOnlyMyPins(e.target.checked); if (e.target.checked) setIsAuthModalOpen(false); }} />
                  </label>
                  <button onClick={() => { supabase.auth.signOut(); setIsAuthModalOpen(false); }} className="w-full bg-white border-2 border-red-100 text-red-500 font-bold py-3 rounded-2xl hover:bg-red-50 transition">
                      Abmelden
                    </button>
                    
                    <div className="mt-4 pt-4 border-t border-red-100">
                      <p className="text-xs text-gray-500 mb-2 font-bold uppercase tracking-wider">Gefahrenzone</p>
                      <button onClick={async () => { 
                        if(window.confirm('Willst du deinen Account wirklich unwiderruflich löschen? Deine Sticker bleiben anonymisiert erhalten.')) {
                          // Lösche das Profil aus der DB.
                          await supabase.from('profiles').delete().eq('id', session.user.id);
                          await supabase.auth.signOut();
                          setIsAuthModalOpen(false);
                          window.location.reload();
                        }
                      }} className="w-full text-xs bg-red-50 text-red-600 font-bold py-2 rounded-xl hover:bg-red-100 transition">
                        Account löschen
                      </button>
                    </div>

                    <div className="pt-2 text-center sm:hidden">
                      <button
                        onClick={() => alert("Lizenz & Urheberrecht:\n\nAlle Inhalte, Bilder (inklusive Avatare und Abzeichen), Quellcodes, Texte und Designs dieser Anwendung sind geistiges Eigentum des Seiteninhabers (Admin).\nJegliche Vervielfältigung, Verbreitung oder Nutzung ohne ausdrückliche schriftliche Erlaubnis ist strengstens untersagt.\n\nEs gelten die gesetzlichen Bestimmungen des Urheberrechts.")}
                        className="text-[10px] text-gray-400 underline hover:text-gray-600"
                      >
                        &copy; {new Date().getFullYear()} Geophysalis · Lizenz &amp; Impressum
                      </button>
                    </div>
                  </div>
                )}

            </div>
          </div>
        </div>
      )}

      
      

      {/* Onboarding Modal */}
      {showOnboarding && session && profile?.is_approved && !showEarthZoom && <OnboardingModal onClose={() => { localStorage.setItem('geophysalis_onboarded', 'true'); setShowOnboarding(false); }} />}

      {/* Earth Zoom Intro */}
      {session && profile?.is_approved && showEarthZoom && (
        <div className="fixed inset-0 z-[6000] bg-black">
          <video id="earth-zoom-video" autoPlay playsInline muted className="w-full h-full object-cover" 
            onEnded={() => {
              localStorage.setItem('geophysalis_earth_zoom_done', 'true');
              setShowEarthZoom(false);
            }}
            onError={() => {
              localStorage.setItem('geophysalis_earth_zoom_done', 'true');
              setShowEarthZoom(false);
            }}
          >
            <source src="/launch_intro.mp4" type="video/mp4" />
          </video>
          <button onClick={() => { localStorage.setItem('geophysalis_earth_zoom_done', 'true'); setShowEarthZoom(false); }} className="absolute bottom-10 right-10 text-white/50 text-sm hover:text-white font-mono">Überspringen &gt;&gt;</button>
        </div>
      )}

      {/* Animated Achievement Popup */}
      <AchievementPopup
        unlockedAchievements={unlockedAchievements}
        onDismiss={() => setUnlockedAchievements(prev => prev.slice(1))}
      />

      {/* Leaderboard Modal + Clickable Player Visitenkarte */}
      {isLeaderboardOpen && (() => {
        // Compute Leaderboard Data inline
        const now = new Date();
        const filteredPins = pins.filter(p => {
          if (leaderboardTab === 'alltime') return true;
          const pinDate = new Date(p.created_at);
          const diffDays = (now - pinDate) / (1000 * 60 * 60 * 24);
          if (leaderboardTab === 'weekly') return diffDays <= 7;
          if (leaderboardTab === 'monthly') return diffDays <= 30;
          return true;
        });

        const counts = {};
        filteredPins.forEach(p => {
          if (p.user_id) counts[p.user_id] = (counts[p.user_id] || 0) + 1;
        });
        
        const sortedUsers = Object.entries(counts)
          .map(([userId, count]) => {
            const prof = allProfiles[userId] || {};
            return {
              userId,
              count,
              nickname: prof.nickname || 'Anonym',
              avatar: prof.avatar || 'default',
              frame_style: prof.frame_style || 'none'
            };
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 10); // Top 10

        const renderUserAvatar = (avatar) => {
          if (avatar === 'pumpkin') return '🎃';
          if (avatar === 'ghost') return '👻';
          if (avatar === 'bat') return '🦇';
          if (avatar === 'reindeer') return '🦌';
          if (avatar === 'snowman') return '⛄';
          if (avatar === 'fire') return <img src="/badges/avatar_fire.jpg" className="w-full h-full object-cover" />;
          if (avatar === 'cyberpunk') return <img src="/badges/avatar_cyberpunk.jpg" className="w-full h-full object-cover" />;
          if (avatar === 'retro') return <img src="/badges/avatar_retro.jpg" className="w-full h-full object-cover" />;
          if (avatar === 'pioneer') return <img src="/badges/avatar_pioneer.jpg" className="w-full h-full object-cover" />;
          if (avatar === 'admin') return <img src="/badges/avatar_admin.jpg" className="w-full h-full object-cover" />;
          if (avatar === 'polar') return <img src="/badges/avatar_polar.jpg" className="w-full h-full object-cover" />;
          return '🦊';
        };

        // Compute detailed Player Card ("Visitenkarte") when a user is clicked
        let cardData = null;
        if (selectedPlayerCard) {
          const targetId = selectedPlayerCard.userId;
          const prof = allProfiles[targetId] || {};
          const uPins = pins
            .filter(p => p.user_id === targetId)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          const uCountries = new Set(
            uPins
              .map(p => {
                if (!p.location_name) return null;
                const parts = p.location_name.split(',');
                return parts[parts.length - 1].trim();
              })
              .filter(Boolean)
          );
          let uDistKm = 0;
          if (uPins.length >= 2) {
            const chron = [...uPins].reverse();
            for (let idx = 1; idx < chron.length; idx++) {
              const R = 6371;
              const dLat = (chron[idx].lat - chron[idx - 1].lat) * Math.PI / 180;
              const dLng = (chron[idx].lng - chron[idx - 1].lng) * Math.PI / 180;
              const a =
                Math.sin(dLat / 2) ** 2 +
                Math.cos(chron[idx - 1].lat * Math.PI / 180) *
                  Math.cos(chron[idx].lat * Math.PI / 180) *
                  Math.sin(dLng / 2) ** 2;
              uDistKm += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            }
          }
          uDistKm = Math.round(uDistKm);

          const pEntry = globalAchievements.find(
            g => g.achievement_id.startsWith('pioneer_') && g.user_id === targetId
          );
          const pRank = pEntry ? pEntry.achievement_id.split('_')[1] : null;
          const uEuCenter = globalAchievements.some(
            g => g.achievement_id === 'eu_center' && g.user_id === targetId
          );
          const uPeaks = globalAchievements
            .filter(g => g.achievement_id.startsWith('gipfeli_') && g.user_id === targetId)
            .map(g => PEAKS.find(pk => pk.id === g.achievement_id.split('_')[1]))
            .filter(Boolean);

          // Streak check for this player
          const uDates = [...new Set(uPins.map(p => new Date(p.created_at).toISOString().split('T')[0]))].sort();
          let maxStrk = uDates.length > 0 ? 1 : 0;
          let curStrk = 1;
          for (let idx = 1; idx < uDates.length; idx++) {
            const diffD = Math.ceil(
              Math.abs(new Date(uDates[idx]) - new Date(uDates[idx - 1])) / (1000 * 60 * 60 * 24)
            );
            if (diffD === 1) {
              curStrk++;
              if (curStrk > maxStrk) maxStrk = curStrk;
            } else curStrk = 1;
          }

          const uManual = new Set(uPins.map(p => p.special_badge).filter(Boolean));
          const uMaxAlt = uPins.reduce((mx, p) => Math.max(mx, getPinAltitude(p)), 0);

          const badges = [];
          if (uEuCenter) badges.push({ title: 'Mitte der EU', img: '/badges/badge_eu.png', bg: 'bg-blue-800', rare: true });
          if (pRank) badges.push({ title: `Pionier No.${pRank}`, img: '/badges/badge_pioneer.jpg', rare: true });
          uPeaks.forEach(pk => {
            badges.push({ title: `🏔️ ${pk.name.split(' ')[0]}`, img: pk.img, rare: true });
          });
          if (uPins.length >= 100) badges.push({ title: 'Platin Sammler', img: '/badges/badge_platinum.jpg', rare: true });
          else if (uPins.length >= 50) badges.push({ title: 'Gold Sammler', img: '/badges/badge_gold.jpg' });
          else if (uPins.length >= 10) badges.push({ title: 'Silber Sammler', img: '/badges/badge_silver.jpg' });
          else if (uPins.length >= 5) badges.push({ title: 'Bronze Sammler', img: '/badges/badge_bronze.jpg' });

          if (uCountries.size >= 3) badges.push({ title: 'Weltenbummler', img: '/badges/world_traveler.jpg' });
          if (maxStrk >= 3) badges.push({ title: 'Feuer & Flamme', img: '/badges/streak.jpg' });
          if (uMaxAlt >= 3000) badges.push({ title: 'Steinbock (>3000m)', img: '/badges/badge_steinbock.jpg' });
          else if (uMaxAlt >= 2000 || uPeaks.some(p => p.alt >= 2000)) badges.push({ title: 'Berggams (>2000m)', img: '/badges/badge_berggams.jpg' });
          else if (uMaxAlt >= 1000 || uPeaks.some(p => p.alt >= 1000)) badges.push({ title: 'Alpinist (>1000m)', img: '/badges/badge_gipfeli.jpg' });

          if (uPins.some(p => Math.abs(p.lat) >= 60)) badges.push({ title: 'Polarforscher', img: '/badges/polar.jpg' });
          if (uPins.some(p => p.location_name && /berlin|new york|london|tokyo|paris|sydney|los angeles/i.test(p.location_name))) {
            badges.push({ title: 'Urban Legend', img: '/badges/urban.jpg' });
          }
          if (uPins.some(p => { const h = new Date(p.created_at).getHours(); return h >= 22 || h <= 4; })) {
            badges.push({ title: 'Nachteule', img: '/badges/night_owl.jpg' });
          }
          if (uPins.some(p => { const h = new Date(p.created_at).getHours(); return h >= 5 && h <= 8; })) {
            badges.push({ title: 'Frühaufsteher', img: '/badges/early_bird.jpg' });
          }
          if (uPins.length >= 10) badges.push({ title: 'Pixel Pioneer', img: '/badges/retro.jpg' });
          if (uManual.has('unter_tage')) badges.push({ title: 'Unter Tage', img: '/badges/badge_unter_tage.jpg', rare: true });
          if (uManual.has('atlantis')) badges.push({ title: 'Atlantis', img: '/badges/badge_atlantis.jpg', rare: true });
          if (uManual.has('lost_place')) badges.push({ title: 'Lost Place', img: '/badges/badge_lost_place.jpg', rare: true });
          if (uManual.has('wuestenfuchs')) badges.push({ title: 'Wüstenfuchs', img: '/badges/badge_wuestenfuchs.jpg', rare: true });
          if (uManual.has('dreilaendereck')) badges.push({ title: 'Drei-Länder-Eck', img: '/badges/badge_dreilaendereck.jpg', rare: true });
          if (uManual.has('og')) badges.push({ title: 'OG Geophysalis', img: '/badges/badge_og.jpg', rare: true });
          if (uManual.has('coop')) badges.push({ title: 'Coop', img: '/badges/badge_coop.jpg' });

          cardData = {
            userId: targetId,
            rank: selectedPlayerCard.rank,
            nickname: prof.nickname || 'Anonym',
            avatar: prof.avatar || 'default',
            frame: prof.frame_style || 'none',
            pioneerRank: pRank,
            pins: uPins,
            countries: uCountries,
            distanceKm: uDistKm,
            badges
          };
        }

        return (
          <div
            className="absolute inset-0 z-[3000] bg-black/35 sm:bg-black/80 backdrop-blur-[1px] sm:backdrop-blur-sm flex items-center justify-center p-3 pb-20 sm:p-4"
            onClick={() => { setSelectedPlayerCard(null); setIsLeaderboardOpen(false); }}
          >
            <div
              className="bg-white rounded-3xl w-full max-w-lg max-h-[76dvh] sm:max-h-[90vh] p-4 sm:p-7 shadow-2xl relative flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {!cardData ? (
                <>
                  <button
                    onClick={() => { setSelectedPlayerCard(null); setIsLeaderboardOpen(false); }}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 bg-gray-100/80 hover:bg-gray-200/80 rounded-full p-1.5 transition"
                  >
                    <X size={22} />
                  </button>
                  <div className="mb-4 shrink-0">
                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2.5">
                      <Trophy className="text-yellow-500" size={28} /> Rangliste
                    </h2>
                    <p className="text-[11px] sm:text-xs text-gray-400 font-medium mt-0.5">
                      Tippe auf einen Entdecker, um seine Visitenkarte &amp; Sticker zu sehen
                    </p>
                  </div>

                  <div className="flex bg-gray-100 rounded-full p-1 mb-4 shrink-0">
                    <button onClick={() => setLeaderboardTab('weekly')} className={`flex-1 text-xs sm:text-sm font-bold py-2 rounded-full transition ${leaderboardTab === 'weekly' ? 'bg-white shadow-sm text-yellow-600' : 'text-gray-500'}`}>Wöchentlich</button>
                    <button onClick={() => setLeaderboardTab('monthly')} className={`flex-1 text-xs sm:text-sm font-bold py-2 rounded-full transition ${leaderboardTab === 'monthly' ? 'bg-white shadow-sm text-yellow-600' : 'text-gray-500'}`}>Monatlich</button>
                    <button onClick={() => setLeaderboardTab('alltime')} className={`flex-1 text-xs sm:text-sm font-bold py-2 rounded-full transition ${leaderboardTab === 'alltime' ? 'bg-white shadow-sm text-yellow-600' : 'text-gray-500'}`}>All-Time</button>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y custom-scrollbar py-1 pr-1 space-y-2.5">
                    {sortedUsers.length === 0 ? (
                      <p className="text-center text-gray-400 font-medium py-10">Noch keine Einträge in diesem Zeitraum.</p>
                    ) : (
                      sortedUsers.map((u, i) => {
                        const avatar = u.avatar || 'default';
                        const frame = u.frame_style || 'none';
                        const uGipfeliCount = globalAchievements.filter(
                          g => g.achievement_id.startsWith('gipfeli_') && g.user_id === u.userId
                        ).length;

                        return (
                          <button
                            key={u.userId}
                            onClick={() => setSelectedPlayerCard({ userId: u.userId, rank: i + 1 })}
                            className={`w-full text-left flex items-center justify-between p-2.5 sm:p-3 rounded-2xl sm:rounded-full border transition hover:scale-[1.01] hover:shadow-md active:scale-[0.98] cursor-pointer group ${
                              i === 0
                                ? 'bg-yellow-50/90 border-yellow-200 hover:border-yellow-400'
                                : i === 1
                                  ? 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                  : i === 2
                                    ? 'bg-orange-50/90 border-orange-200 hover:border-orange-300'
                                    : 'bg-white border-gray-100 shadow-sm hover:border-blue-200'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                              <span className="text-lg sm:text-xl w-6 text-center shrink-0">
                                {i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-xs sm:text-sm font-black text-gray-400">{i + 1}.</span>}
                              </span>

                              {FEATURE_AVATARS && (
                                <div className={`avatar-frame frame-${frame} w-10 h-10 text-xl shadow-sm bg-white shrink-0 rounded-full`}>
                                  <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                                    {renderUserAvatar(avatar)}
                                  </div>
                                </div>
                              )}

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className={`font-black text-sm sm:text-base truncate ${i === 0 ? 'text-yellow-700' : i === 1 ? 'text-gray-700' : i === 2 ? 'text-orange-800' : 'text-gray-800'}`}>
                                    {u.nickname}
                                  </span>
                                  {uGipfeliCount > 0 && (
                                    <span className="text-[9px] bg-amber-100 text-amber-800 font-black px-1.5 py-0.5 rounded-full shrink-0" title="Eroberte Bundesland-Gipfel">
                                      🏔️ {uGipfeliCount}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-gray-400 font-semibold group-hover:text-blue-600 transition">
                                  Visitenkarte ansehen →
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 pl-2">
                              <div className={`font-black text-sm sm:text-base ${i === 0 ? 'text-yellow-600' : 'text-gray-600'}`}>
                                {u.count} <span className="text-[10px] uppercase font-bold text-gray-400 hidden sm:inline">Sticker</span>
                              </div>
                              <span className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition text-sm font-bold">›</span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                /* SPIELER-VISITENKARTE VIEW (Mobile & Desktop optimized) */
                <div className="flex flex-col h-full min-h-0">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100 shrink-0">
                    <button
                      onClick={() => setSelectedPlayerCard(null)}
                      className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition active:scale-95"
                    >
                      <span>←</span>
                      <span>Rangliste</span>
                    </button>
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-400">
                      Entdecker-Visitenkarte
                    </span>
                    <button
                      onClick={() => { setSelectedPlayerCard(null); setIsLeaderboardOpen(false); }}
                      className="text-gray-400 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-full p-1.5 transition"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Scrollable Visitenkarte Body (block flow with space-y-3.5 prevents flexbox from clipping Hero Banner!) */}
                  <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y custom-scrollbar py-3.5 pr-1 space-y-3.5">
                    {/* Hero Banner Card */}
                    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-lg relative">
                      <div className="flex items-center gap-3.5 sm:gap-4">
                        <div className={`avatar-frame frame-${cardData.frame} w-14 h-14 sm:w-16 sm:h-16 text-2xl sm:text-3xl shadow-xl bg-white text-gray-900 shrink-0 rounded-full`}>
                          <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                            {renderUserAvatar(cardData.avatar)}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-black uppercase tracking-wider bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 px-2 py-0.5 rounded-full">
                              {cardData.rank === 1 ? '👑 Platz #1' : cardData.rank === 2 ? '🥈 Platz #2' : cardData.rank === 3 ? '🥉 Platz #3' : `Platz #${cardData.rank}`}
                            </span>
                            {cardData.pioneerRank && (
                              <span className="text-[10px] font-black bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">
                                🚀 Pionier No.{cardData.pioneerRank}
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg sm:text-xl font-black text-white truncate mt-1">
                            {cardData.nickname}
                          </h3>
                        </div>
                      </div>

                      {/* 3 Stats Tiles */}
                      <div className="grid grid-cols-3 gap-2 mt-4 bg-white/10 backdrop-blur-md rounded-2xl p-2.5 border border-white/10">
                        <div className="text-center">
                          <p className="text-base sm:text-lg font-black text-yellow-300 leading-none">{cardData.pins.length}</p>
                          <p className="text-[9px] text-slate-300 font-bold uppercase tracking-wider mt-1">Sticker</p>
                        </div>
                        <div className="text-center border-x border-white/10">
                          <p className="text-base sm:text-lg font-black text-cyan-300 leading-none">
                            {cardData.distanceKm > 999 ? `${(cardData.distanceKm / 1000).toFixed(1)}k` : cardData.distanceKm}
                          </p>
                          <p className="text-[9px] text-slate-300 font-bold uppercase tracking-wider mt-1">km Reise</p>
                        </div>
                        <div className="text-center">
                          <p className="text-base sm:text-lg font-black text-emerald-300 leading-none">{cardData.countries.size}</p>
                          <p className="text-[9px] text-slate-300 font-bold uppercase tracking-wider mt-1">Länder</p>
                        </div>
                      </div>
                    </div>

                    {/* Earned Trophies & Rare Badges */}
                    <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100">
                      <div className="flex items-center justify-between mb-2.5">
                        <p className="text-[10px] sm:text-xs font-black text-gray-700 uppercase tracking-wider">
                          🏆 Errungene Trophäen ({cardData.badges.length})
                        </p>
                      </div>
                      {cardData.badges.length === 0 ? (
                        <p className="text-xs text-gray-400 italic py-2">Noch keine Abzeichen freigeschaltet.</p>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {cardData.badges.slice(0, 12).map((b, idx) => (
                            <div
                              key={idx}
                              className={`flex flex-col items-center text-center p-2 rounded-xl bg-white border ${
                                b.rare ? 'border-amber-300 shadow-sm ring-1 ring-amber-200' : 'border-gray-100'
                              }`}
                            >
                              <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden mb-1 flex items-center justify-center ${b.bg || 'bg-gray-100'}`}>
                                {b.img ? <img src={b.img} alt={b.title} className="w-full h-full object-cover" /> : <span>🏅</span>}
                              </div>
                              <span className="text-[9px] sm:text-[10px] font-bold text-gray-700 leading-tight line-clamp-2">
                                {b.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Player's Explored World Map */}
                    {cardData.countries.size > 0 && (
                      <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100">
                        <p className="text-[10px] sm:text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                          🌍 Bereiste Länder ({cardData.countries.size})
                        </p>
                        <div className="bg-white rounded-xl overflow-hidden border border-gray-100 pointer-events-none">
                          <ErrorBoundary>
                            <VisitedCountriesMap visitedCountries={cardData.countries} />
                          </ErrorBoundary>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {[...cardData.countries].map(country => (
                            <span key={country} className="text-[9px] bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-full">
                              {country}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recent Sticker Spots Preview (Clickable to fly straight to that pin!) */}
                    {cardData.pins.length > 0 && (
                      <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100">
                        <p className="text-[10px] sm:text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                          📸 Letzte Sticker-Spots (Antippen zum Hinfliegen)
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {cardData.pins.slice(0, 3).map(pin => (
                            <button
                              key={pin.id}
                              onClick={() => {
                                setSelectedPlayerCard(null);
                                setIsLeaderboardOpen(false);
                                setTargetPinId(pin.id.toString());
                                if (map) map.flyTo([pin.lat, pin.lng], 15, { animate: true, duration: 2.0 });
                              }}
                              className="group relative h-20 sm:h-24 rounded-xl overflow-hidden border border-gray-200 shadow-sm text-left active:scale-95 transition"
                            >
                              <img src={pin.image_url} alt="Pin" className="w-full h-full object-cover group-hover:scale-110 transition duration-300" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-1.5">
                                <span className="text-[9px] font-bold text-white truncate">
                                  📍 {pin.location_name ? pin.location_name.split(',')[0] : 'Spot'}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sticky Bottom CTA: Show all pins of this user on the map */}
                  <div className="pt-3 border-t border-gray-100 shrink-0">
                    <button
                      onClick={() => {
                        setPlayerMapFilter({ userId: cardData.userId, nickname: cardData.nickname });
                        setShowOnlyMyPins(false);
                        setSelectedPlayerCard(null);
                        setIsLeaderboardOpen(false);
                        if (map && cardData.pins.length > 0) {
                          if (cardData.pins.length === 1) {
                            map.flyTo([cardData.pins[0].lat, cardData.pins[0].lng], 13, { animate: true, duration: 2.0 });
                          } else {
                            const bounds = L.latLngBounds(cardData.pins.map(p => [p.lat, p.lng]));
                            map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 12, duration: 2.0 });
                          }
                        }
                      }}
                      className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black py-3 rounded-2xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-98 transition"
                    >
                      <MapPin size={17} />
                      <span>Alle {cardData.pins.length} Sticker von {cardData.nickname} auf Karte zeigen</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Admin Modal */}
      {isAdminModalOpen && (
        <div
          className="absolute inset-0 z-[3000] bg-black/35 sm:bg-black/80 backdrop-blur-[1px] sm:backdrop-blur-sm flex items-center justify-center p-3 pb-20 sm:p-4"
          onClick={() => setIsAdminModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-4xl h-[74dvh] sm:h-[80vh] p-5 sm:p-8 shadow-2xl relative flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setIsAdminModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition">
              <X size={28} />
            </button>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-3 mb-6 border-b pb-4">
              <Shield className="text-red-600" size={32} /> Admin Kontrollzentrum
            </h2>
            
            <div className="flex-1 overflow-y-auto pr-2">
              {unapprovedPins.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <CheckCircle size={64} className="mb-4 text-green-400" />
                  <p className="text-xl font-bold">Alles erledigt!</p>
                  <p className="text-sm">Keine neuen Sticker zum Freischalten.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {unapprovedPins.map(pin => (
                    <div key={pin.id} className="bg-gray-50 rounded-full overflow-hidden border border-gray-200 flex flex-col">
                      <img src={pin.image_url} alt="Sticker" className="w-full h-48 object-cover bg-gray-200" />
                      <div className="p-4 flex-1 flex flex-col">
                        <p className="text-sm font-bold text-gray-800 mb-1 flex items-center gap-1">
                          <MapPin size={14} className="text-blue-500" /> {pin.location_name || 'Unbekannt'}
                        </p>
                        <p className="text-xs text-gray-500 italic mb-4 flex-1">"{pin.message || 'Keine Nachricht'}"</p>
                        
                        <div className="flex gap-2 mt-auto">
                          <button onClick={() => handleApprovePin(pin.id)} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-full flex justify-center items-center gap-1 transition">
                            <Check size={16} /> Freigeben
                          </button>
                          <button onClick={() => handleRejectPin(pin.id, pin.image_url)} className="bg-red-100 hover:bg-red-200 text-red-600 font-bold p-2 rounded-full transition">
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer (Lizenz & Impressum – Desktop only, mobile has it in Settings) */}
      <div className="hidden sm:flex absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-6 py-2 rounded-full shadow-lg border border-gray-200 z-[1000] items-center gap-4 text-xs text-gray-500 whitespace-nowrap">
        <span>&copy; {new Date().getFullYear()} Geophysalis. Alle Rechte vorbehalten.</span>
        <button onClick={() => alert("Lizenz & Urheberrecht:\n\nAlle Inhalte, Bilder (inklusive Avatare und Abzeichen), Quellcodes, Texte und Designs dieser Anwendung sind geistiges Eigentum des Seiteninhabers (Admin).\nJegliche Vervielfältigung, Verbreitung oder Nutzung ohne ausdrückliche schriftliche Erlaubnis ist strengstens untersagt.\n\nEs gelten die gesetzlichen Bestimmungen des Urheberrechts.")} className="font-bold underline hover:text-gray-900 transition">
          Lizenz & Impressum
        </button>
      </div>

            {/* Hidden Share Card Wrapper */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div 
          ref={shareCardRef}
          style={{ 
            width: '1080px', height: '1080px', 
            backgroundColor: '#0f172a', color: 'white', display: 'flex', flexDirection: 'column', 
            alignItems: 'center', justifyContent: 'center', padding: '64px', fontFamily: 'system-ui, sans-serif' 
          }}
        >
          <h1 style={{ fontSize: '72px', fontWeight: '900', marginBottom: '48px', color: '#60a5fa' }}>GEOPHYSALIS EXPLORER</h1>
          
          <div style={{ marginBottom: '48px', position: 'relative' }}>
            <img 
              src={session?.user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${session?.user?.email}&background=random`} 
              crossOrigin="anonymous" 
              style={{ width: '256px', height: '256px', borderRadius: '50%', border: '12px solid rgba(255,255,255,0.2)' }}
            />
            {hasPioneer && <span style={{ position: 'absolute', bottom: '-10px', right: '-10px', backgroundColor: '#facc15', color: '#0f172a', fontSize: '30px', fontWeight: '900', padding: '8px 24px', borderRadius: '99px', border: '4px solid #0f172a' }}>No.{myPioneerRank}</span>}
          </div>
          
          <h2 style={{ fontSize: '60px', fontWeight: 'bold', marginBottom: '80px' }}>{profile?.nickname || 'Neuankömmling'}</h2>

          <div style={{ display: 'flex', gap: '48px', backgroundColor: 'rgba(255,255,255,0.05)', padding: '48px', borderRadius: '40px', width: '100%', maxWidth: '900px', justifyContent: 'space-around', marginBottom: '80px', border: '2px solid rgba(255,255,255,0.1)' }}>
             <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '80px', fontWeight: '900', color: '#facc15', margin: '0 0 10px 0' }}>{myPins.length}</p>
                <p style={{ fontSize: '30px', textTransform: 'uppercase', color: '#cbd5e1', fontWeight: 'bold', margin: 0 }}>Sticker</p>
             </div>
             <div style={{ width: '2px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
             <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '80px', fontWeight: '900', color: '#22d3ee', margin: '0 0 10px 0' }}>{uniqueCountries.size}</p>
                <p style={{ fontSize: '30px', textTransform: 'uppercase', color: '#cbd5e1', fontWeight: 'bold', margin: 0 }}>Länder</p>
             </div>
             <div style={{ width: '2px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
             <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '80px', fontWeight: '900', color: '#34d399', margin: '0 0 10px 0' }}>{totalDistanceKm > 999 ? (totalDistanceKm/1000).toFixed(1)+'k' : totalDistanceKm}</p>
                <p style={{ fontSize: '30px', textTransform: 'uppercase', color: '#cbd5e1', fontWeight: 'bold', margin: 0 }}>Kilometer</p>
             </div>
          </div>

          <div style={{ display: 'flex', gap: '32px', alignItems: 'center', justifyContent: 'center' }}>
             {[
               hasPioneer && { img: '/badges/badge_pioneer.jpg' },
               hasGlobetrotter && { img: '/badges/badge_globetrotter.jpg' },
               hasBorderCrosser && { img: '/badges/badge_border.jpg' },
               hasWorldTraveler && { img: '/badges/world_traveler.jpg' },
               hasTier100 ? { img: '/badges/badge_platinum.jpg' } : hasTier50 ? { img: '/badges/badge_gold.jpg' } : hasTier10 ? { img: '/badges/badge_silver.jpg' } : hasTier5 ? { img: '/badges/badge_bronze.jpg' } : null,
               hasMarathon && { img: '/badges/streak.jpg' },
               hasRetroGamer && { img: '/badges/retro.jpg' }
             ].filter(Boolean).slice(0, 5).map((b, i) => (
               <div key={i} style={{ width: '120px', height: '120px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '60px', backgroundColor: b.bg || '#334155', border: '4px solid rgba(255,255,255,0.2)', overflow: 'hidden' }}>
                  {b.img ? <img src={b.img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : b.icon}
               </div>
             ))}
          </div>

          <div style={{ position: 'absolute', bottom: '40px', color: '#64748b', fontWeight: 'bold', fontSize: '30px', letterSpacing: '4px' }}>
             DEINE KARTE. DEIN ABENTEUER.
          </div>
        </div>
      </div>
    </div>
  );
}