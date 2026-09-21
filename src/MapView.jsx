import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMapEvents, useMap, Rectangle } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import imageCompression from 'browser-image-compression';
import { X, Upload, MapPin, Check, Info, LocateFixed, Layers, Share2, Dices, Compass, Navigation2, User, LogIn, Mail, Sparkles, Shield, CheckCircle, Trash2, Lock, Moon, Award, Globe, Footprints, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { supabase } from './supabase';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

// Fix für Leaflet-Marker-Icons als Fallback
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41], popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Icons generieren
const getStickerIcon = (url, isTarget = false, isNewPin = false) => {
  return L.divIcon({
    className: `custom-sticker-icon ${isTarget ? 'is-target' : ''} ${isNewPin ? 'is-new' : ''}`,
    html: `<div style="background-image: url('${url}');"></div>`,
    iconSize: isTarget ? [60, 60] : [46, 46],
    iconAnchor: isTarget ? [30, 30] : [23, 23],
    popupAnchor: [0, -20]
  });
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

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
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

// Zufällige Halloween-Requisiten auf der Karte
const HalloweenAssets = () => {
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
        const isGhost = Math.random() > 0.5;
        return {
          id: i,
          pos: [lat, lng],
          icon: L.divIcon({
            html: `<div style="font-size: 32px; filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.4)); animation: ${isGhost ? 'float 3s ease-in-out infinite' : 'fly 2s linear infinite'};">${isGhost ? '👻' : '🦇'}</div>`,
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

export default function MapView() {
  const [map, setMap] = useState(null);
  const [pins, setPins] = useState([]);
  
  // Auth & Session
  const [session, setSession] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
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

  // Avatar State
  const [editAvatar, setEditAvatar] = useState('default');
  const [activeFrame, setActiveFrame] = useState('none');
  const [editFrame, setEditFrame] = useState('none');
  const [globalAchievements, setGlobalAchievements] = useState([]);

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
    } catch(e) {}
  };

  useEffect(() => {
    fetchGlobals();
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
    if (!session?.user?.id || myPins.length === 0 || globalAchievements.length === 0) return;
    
    // Only run this check once every time myPins changes to avoid infinite loops
    const checkClaims = async () => {
      let claimsMade = false;
      
      // 1. Mitte der EU (49.843, 9.902)
      if (!globalAchievements.some(g => g.achievement_id === 'eu_center')) {
         const euPin = myPins.find(p => isNearCoords(p.lat, p.lng, 49.843, 9.902, 1.0));
         if (euPin) {
            const { error } = await supabase.from('global_achievements').insert({ achievement_id: 'eu_center', user_id: session.user.id });
            if (!error) { 
              alert("🇪🇺 Wahnsinn! Du hast die geografische Mitte der EU als Allererster gefunden!"); 
              claimsMade = true; 
            }
         }
      }

      // 2. Gipfeli Peaks (Die 16 höchsten Punkte der Bundesländer)
      const peaks = [
        { id: 'zugspitze', lat: 47.421, lng: 10.985, name: 'Zugspitze (Bayern)' },
        { id: 'feldberg', lat: 47.873, lng: 8.004, name: 'Feldberg (BaWü)' },
        { id: 'brocken', lat: 51.799, lng: 10.615, name: 'Brocken (Sachsen-Anhalt)' },
        { id: 'fichtelberg', lat: 50.429, lng: 12.954, name: 'Fichtelberg (Sachsen)' },
        { id: 'wasserkuppe', lat: 50.498, lng: 9.937, name: 'Wasserkuppe (Hessen)' },
        { id: 'beerberg', lat: 50.658, lng: 9.746, name: 'Großer Beerberg (Thüringen)' },
        { id: 'wurmberg', lat: 51.756, lng: 10.617, name: 'Wurmberg (Niedersachsen)' },
        { id: 'langenberg', lat: 51.275, lng: 8.525, name: 'Langenberg (NRW)' },
        { id: 'erbeskopf', lat: 49.730, lng: 7.089, name: 'Erbeskopf (RLP)' },
        { id: 'dollberg', lat: 49.629, lng: 7.017, name: 'Dollberg (Saarland)' },
        { id: 'mueggelberge', lat: 52.416, lng: 13.639, name: 'Müggelberge (Berlin)' },
        { id: 'kutschenberg', lat: 51.423, lng: 13.722, name: 'Kutschenberg (Brandenburg)' },
        { id: 'friedehorstpark', lat: 53.169, lng: 8.675, name: 'Friedehorstpark (Bremen)' },
        { id: 'hasselbrack', lat: 53.431, lng: 9.865, name: 'Hasselbrack (Hamburg)' },
        { id: 'helpterberge', lat: 53.483, lng: 13.606, name: 'Helpter Berge (MV)' },
        { id: 'bungsberg', lat: 54.212, lng: 10.723, name: 'Bungsberg (SH)' }
      ];

      for (let peak of peaks) {
         if (!globalAchievements.some(g => g.achievement_id === `gipfeli_${peak.id}`)) {
            const peakPin = myPins.find(p => isNearCoords(p.lat, p.lng, peak.lat, peak.lng, 3.0));
            if (peakPin) {
               const { error } = await supabase.from('global_achievements').insert({ achievement_id: `gipfeli_${peak.id}`, user_id: session.user.id });
               if (!error) {
                 alert(`🥐 Glückwunsch! Du hast das Gipfeli am ${peak.name} als Allererster gesichert!`);
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
                   alert(`🌟 Willkommen im exklusiven Club! Du bist Pionier Nr. ${i} von 15!`);
                   claimsMade = true;
                   break;
                 }
              }
           }
        }
      }

      if (claimsMade) fetchGlobals();
    };

    checkClaims();
  }, [myPins, session]); // do not depend on globalAchievements directly to prevent infinite loop

  const hasEuCenter = globalAchievements.some(g => g.achievement_id === 'eu_center' && g.user_id === session?.user?.id);
  const euOwner = globalAchievements.find(g => g.achievement_id === 'eu_center')?.user_id;

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
      if (R * c < 3.0) return true; // Within 3km
    }
    return false;
  };

  const hasYinYang = myPins.some(p => p.lat > 0) && myPins.some(p => p.lat < 0);
  const hasGipfeli = myPins.some(p => isNearPeak(p.lat, p.lng));
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

  const canUseDark = devMode || hasNightOwl;
  const canUseVintage = devMode || hasLocalHero;
  const canUseSunrise = devMode || hasEarlyBird;
  const canUseSpooky = devMode || hasHalloween;
  const canUseSnow = devMode || hasWinter;
  const canUseAurora = devMode || hasPolarExplorer;
  const canUseCyberpunk = devMode || hasUrbanLegend;
  const canUse8Bit = devMode || hasRetroGamer;

  // Helper: Prüft ob Sticker in den letzten 7 Tagen gesetzt wurde
  const isNew = (dateString) => {
    const pinDate = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil(Math.abs(now - pinDate) / (1000 * 60 * 60 * 24)); 
    return diffDays <= 7;
  };

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      setProfile(data);
    } else {
      const { data: newProfile } = await supabase.from('profiles').insert({ id: userId }).select().single();
      if (newProfile) setProfile(newProfile);
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
  
  const [userLocation, setUserLocation] = useState([50.1109, 8.6821]); 

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
    const file = e.target.files[0];
    if (!file) return;

    setSelectedImage(URL.createObjectURL(file));
    setIsCompressing(true);
    setExifNotice("");

    const options = { maxSizeMB: 0.3, maxWidthOrHeight: 1200, useWebWorker: true };
    try {
      const compressed = await imageCompression(file, options);
      setCompressedFile(compressed);
    } catch (error) {
      console.error(error);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleUpload = async () => {
    if (!compressedFile || !draftPin) return;
    setIsUploading(true);
    
    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const { error: uploadError } = await supabase.storage.from('stickers').upload(fileName, compressedFile, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('stickers').getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('pins').insert({
        lat: draftPin[0],
        lng: draftPin[1],
        image_url: publicUrl,
        message: message || null,
        location_name: locationName || null,
        user_id: session ? session.user.id : null
      });
      if (dbError) throw dbError;

      alert("Danke! Dein Sticker wurde hochgeladen und wird bald vom Admin freigegeben.");
      
      setIsModalOpen(false);
      setSelectedImage(null);
      setCompressedFile(null);
      setDraftPin(null);
      setMessage("");
      setLocationName("");
      setExifNotice("");
    } catch (error) {
      console.error(error);
      alert("Es gab einen Fehler beim Upload.");
    } finally {
      setIsUploading(false);
    }
  };

  // Wir blockieren nur den Nord-/Südpol (vertikal), erlauben aber endloses seitliches Scrollen,
  // damit man über den Pazifik fliegen kann und keine grauen Fehler-Kacheln entstehen.
  const worldBounds = [
    [-90, -2000],
    [90, 2000]
  ];

  // Computed Pins based on toggle
  const displayPins = showOnlyMyPins && session ? pins.filter(p => p.user_id === session.user.id) : pins;

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden overscroll-none">
      
      {/* Top Left Header & Counter (Optimized for Mobile) */}
      <div className="absolute top-4 left-4 z-[1000] pointer-events-none flex flex-col gap-2 sm:gap-3">
        <div className="bg-white/95 backdrop-blur-md px-4 py-2 sm:px-6 sm:py-3 rounded-full sm:rounded-3xl shadow-xl border border-gray-100 flex items-center gap-2 sm:gap-3 pointer-events-auto transition-all">
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight hidden sm:block">Geophysalis</h1>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            <p className="text-[10px] sm:text-xs font-bold text-gray-700 tracking-wide uppercase mt-0.5">
              {displayPins.length} <span className="hidden sm:inline">Sticker weltweit</span><span className="sm:hidden">Sticker</span>
            </p>
          </div>
        </div>
        
        {/* Event Banners */}
        {isHalloweenActive && (
          <div className="bg-orange-500/90 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-lg border border-orange-400 pointer-events-auto flex items-center gap-2 animate-bounce">
            <span>🎃</span>
            <span className="text-[10px] sm:text-xs font-black text-white uppercase tracking-wider">Halloween Event aktiv!</span>
          </div>
        )}
        {isWinterActive && (
          <div className="bg-blue-500/90 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-lg border border-blue-400 pointer-events-auto flex items-center gap-2 animate-bounce">
            <span>❄️</span>
            <span className="text-[10px] sm:text-xs font-black text-white uppercase tracking-wider">Winterwunder aktiv!</span>
          </div>
        )}
      </div>

      {/* Layer Menu & Auth Button (Top Right) */}
      <div className="absolute top-4 right-4 z-[1000] pointer-events-auto flex flex-col items-end gap-2">
        <div className="flex gap-2">
          
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
          <div className="bg-white/95 backdrop-blur-md p-4 rounded-full sm:rounded-3xl shadow-2xl border border-gray-100 flex flex-col gap-4 w-56 animate-in slide-in-from-top-4 origin-top-right">
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Karten-Stil</p>
              <div className="flex flex-col gap-1">
                <button onClick={() => setMapStyle('street')} className={`text-left px-3 py-2 rounded-full text-sm font-bold transition ${mapStyle === 'street' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-600'}`}>Standard</button>
                <button onClick={() => setMapStyle('satellite')} className={`text-left px-3 py-2 rounded-full text-sm font-bold transition ${mapStyle === 'satellite' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-600'}`}>Satellit</button>
                
                <button 
                  onClick={() => canUseDark ? setMapStyle('dark') : alert("Du benötigst das Abzeichen 'Der erste Schritt'!")} 
                  className={`text-left px-3 py-2 rounded-full text-sm font-bold transition flex justify-between items-center ${mapStyle === 'dark' ? 'bg-blue-100 text-blue-700' : canUseDark ? 'hover:bg-gray-100 text-gray-600' : 'text-gray-400'}`}
                >
                  Dark Mode {!canUseDark && <Lock size={14} className="text-gray-400" />}
                </button>
                
                <button 
                  onClick={() => canUseVintage ? setMapStyle('vintage') : alert("Du benötigst das Abzeichen 'Entdecker' (5 Sticker)!")} 
                  className={`text-left px-3 py-2 rounded-full text-sm font-bold transition flex justify-between items-center ${mapStyle === 'vintage' ? 'bg-blue-100 text-blue-700' : canUseVintage ? 'hover:bg-gray-100 text-gray-600' : 'text-gray-400'}`}
                >
                  Explorer (Vintage) {!canUseVintage && <Lock size={14} className="text-gray-400" />}
                </button>

                <button 
                  onClick={() => canUseSunrise ? setMapStyle('sunrise') : alert("Du benötigst das Abzeichen 'Frühaufsteher' (5-8 Uhr)!")} 
                  className={`text-left px-3 py-2 rounded-full text-sm font-bold transition flex justify-between items-center ${mapStyle === 'sunrise' ? 'bg-orange-100 text-orange-700' : canUseSunrise ? 'hover:bg-gray-100 text-gray-600' : 'text-gray-400'}`}
                >
                  Sunrise (Morgen) {!canUseSunrise && <Lock size={14} className="text-gray-400" />}
                </button>

                <button 
                  onClick={() => canUseSpooky ? setMapStyle('neon') : alert("Du benötigst das Abzeichen 'Süßes oder Saures' (Halloween-Event)!")} 
                  className={`text-left px-3 py-2 rounded-full text-sm font-bold transition flex justify-between items-center ${mapStyle === 'neon' ? 'bg-purple-100 text-purple-700' : canUseSpooky ? 'hover:bg-gray-100 text-gray-600' : 'text-gray-400'}`}
                >
                  Spooky (Halloween) {!canUseSpooky && <Lock size={14} className="text-gray-400" />}
                </button>

                <button 
                  onClick={() => canUseSnow ? setMapStyle('snow') : alert("Du benötigst das Abzeichen 'Winterwunder' (Dezember-Event)!")} 
                  className={`text-left px-3 py-2 rounded-full text-sm font-bold transition flex justify-between items-center ${mapStyle === 'snow' ? 'bg-blue-100 text-blue-700' : canUseSnow ? 'hover:bg-gray-100 text-gray-600' : 'text-gray-400'}`}
                >
                  Winter (Schnee) {!canUseSnow && <Lock size={14} className="text-gray-400" />}
                </button>

                <button 
                  onClick={() => canUseAurora ? setMapStyle('aurora') : alert("Du benötigst das Abzeichen 'Polarforscher'!")} 
                  className={`text-left px-3 py-2 rounded-full text-sm font-bold transition flex justify-between items-center ${mapStyle === 'aurora' ? 'bg-teal-100 text-teal-700' : canUseAurora ? 'hover:bg-gray-100 text-gray-600' : 'text-gray-400'}`}
                >
                  Polarlichter {!canUseAurora && <Lock size={14} className="text-gray-400" />}
                </button>

                <button 
                  onClick={() => canUseCyberpunk ? setMapStyle('cyberpunk') : alert("Du benötigst das Abzeichen 'Urban Legend'!")} 
                  className={`text-left px-3 py-2 rounded-full text-sm font-bold transition flex justify-between items-center ${mapStyle === 'cyberpunk' ? 'bg-pink-100 text-pink-700' : canUseCyberpunk ? 'hover:bg-gray-100 text-gray-600' : 'text-gray-400'}`}
                >
                  Cyberpunk (Neon) {!canUseCyberpunk && <Lock size={14} className="text-gray-400" />}
                </button>

                <button 
                  onClick={() => canUse8Bit ? setMapStyle('8bit') : alert("Du benötigst das Abzeichen 'Pixel Pioneer' (10 Sticker)!")} 
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
          <div className="flex gap-2 self-end pointer-events-auto">
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
        
        {/* Map Layers */}
        {mapStyle === 'street' && (
          <TileLayer 
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
        )}
        {mapStyle === 'satellite' && (
          <TileLayer 
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
            attribution='Tiles &copy; Esri'
          />
        )}
        {mapStyle === 'dark' && (
          <TileLayer 
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
            attribution='&copy; CARTO'
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
        {mapStyle === 'neon' && <HalloweenAssets />}

        {/* Heatmap Layer */}
        {showHeatmap && <HeatmapLayer points={displayPins} />}

        {/* Marker Layer (Hidden when Heatmap is active) */}
        {!showHeatmap && (
          <MarkerClusterGroup chunkedLoading maxClusterRadius={50} showCoverageOnHover={false} spiderfyOnMaxZoom={true} disableClusteringAtZoom={15}>
            {displayPins.map(pin => (
              <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={getStickerIcon(pin.image_url, targetPinId && pin.id.toString() === targetPinId, isNew(pin.created_at))}>
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
                        onClick={() => {
                          const url = `${window.location.origin}/?pin=${pin.id}`;
                          navigator.clipboard.writeText(url);
                          setCopiedId(pin.id);
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        className="mt-3 w-full bg-blue-50 text-blue-600 font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-100 transition active:scale-95"
                      >
                        {copiedId === pin.id ? <Check size={16} /> : <Share2 size={16} />}
                        {copiedId === pin.id ? 'Link kopiert!' : 'Sticker teilen'}
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
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
      </MapContainer>

      {/* Radar & Roulette Buttons */}
      {!draftPin && !isModalOpen && pins.length > 0 && (
        <div className="absolute bottom-24 right-4 sm:bottom-28 sm:right-8 z-[1000] flex flex-col gap-3 pointer-events-none">
          <button 
            onClick={handleRoulette} 
            title="Zufälliger Sticker"
            className="bg-white/95 backdrop-blur-md p-3 sm:p-3.5 rounded-full sm:rounded-full shadow-xl border border-gray-100 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition pointer-events-auto flex items-center justify-center hover:scale-110 active:scale-95"
          >
            <Dices size={24} />
          </button>
          <button 
            onClick={handleRadar} 
            title="Radar (Nächster Sticker)"
            className="bg-white/95 backdrop-blur-md p-3 sm:p-3.5 rounded-full sm:rounded-full shadow-xl border border-gray-100 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition pointer-events-auto flex items-center justify-center hover:scale-110 active:scale-95"
          >
            <Compass size={24} />
          </button>
        </div>
      )}

      {!draftPin ? (
        <button onClick={handleStartNewPin} className="absolute bottom-6 right-4 sm:bottom-8 sm:right-8 z-[1000] bg-blue-600 text-white px-5 py-3 sm:px-6 sm:py-4 rounded-full sm:rounded-full shadow-xl hover:bg-blue-700 hover:scale-105 hover:-translate-y-1 transition-all font-bold text-base sm:text-lg pointer-events-auto flex items-center gap-2">
          <MapPin size={22} className="sm:w-6 sm:h-6" /> Sticker setzen
        </button>
      ) : !isModalOpen && (
        <div className="absolute bottom-6 left-4 right-4 z-[1000] bg-white/95 backdrop-blur-md p-4 rounded-3xl shadow-2xl border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-4 pointer-events-auto animate-in slide-in-from-bottom-10">
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 flex items-center gap-2"><MapPin size={18} className="text-blue-600"/> Pin platzieren</h3>
            <p className="text-sm text-gray-600">Verschiebe den Pin auf der Karte an die exakte Stelle.</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={() => setDraftPin(null)} className="flex-1 sm:flex-none px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-full hover:bg-gray-200">Abbrechen</button>
            <button onClick={handleConfirmPosition} className="flex-1 sm:flex-none px-6 py-3 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 flex items-center justify-center gap-2 shadow-md">
              <Check size={20}/> Bestätigen
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
        <div className="absolute inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-all overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 relative shadow-2xl my-auto">
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
                  onChange={(e) => {
                    setManualLat(e.target.value);
                    setLocationName(""); 
                  }} 
                  onBlur={() => {
                    const val = parseFloat(manualLat.replace(',', '.'));
                    if(!isNaN(val)) {
                      setDraftPin([val, draftPin[1]]);
                      setManualLat(val.toFixed(6));
                      fetchLocationName(val, draftPin[1]);
                      if (map) map.flyTo([val, draftPin[1]], 15);
                    }
                  }}
                  className="w-1/2 text-xs border border-gray-300 p-2 rounded-lg bg-white focus:outline-blue-500" placeholder="Breitengrad" 
                />
                <input 
                  type="text" 
                  value={manualLng} 
                  onChange={(e) => {
                    setManualLng(e.target.value);
                    setLocationName(""); 
                  }} 
                  onBlur={() => {
                    const val = parseFloat(manualLng.replace(',', '.'));
                    if(!isNaN(val)) {
                      setDraftPin([draftPin[0], val]);
                      setManualLng(val.toFixed(6));
                      fetchLocationName(draftPin[0], val);
                      if (map) map.flyTo([draftPin[0], val], 15);
                    }
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
                <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-full cursor-pointer hover:bg-blue-50 transition">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className="bg-white p-3 rounded-full shadow-sm mb-2">
                      <Upload className="text-blue-600" size={24} />
                    </div>
                    <p className="text-sm text-gray-600 font-medium">Foto auswählen</p>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageSelection} />
                </label>
              ) : (
                <div className="relative rounded-full overflow-hidden border border-gray-200 shadow-inner">
                  <img src={selectedImage} alt="Vorschau" className="w-full h-36 object-cover" />
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

              <div className="flex flex-col gap-2 pt-2">
                {isCompressing && <p className="text-sm text-blue-600 text-center font-medium animate-pulse">Bild wird vorbereitet...</p>}
                <button 
                  disabled={!compressedFile || isCompressing || isUploading}
                  onClick={handleUpload}
                  className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-full disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition shadow-md"
                >
                  {isUploading ? 'Wird hochgeladen...' : 'Sticker hochladen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Auth Modal */}
      {!session && isAuthModalOpen && (
        <div className="absolute inset-0 z-[3000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl relative">
            <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition">
              <X size={24} />
            </button>
            <div className="text-center mb-6">
              <Sparkles size={40} className="text-blue-500 mx-auto mb-3" />
              <h2 className="text-2xl font-black text-gray-900 mb-2">Login</h2>
              <p className="text-sm text-gray-600">Melde dich an, um in Zukunft Abzeichen zu sammeln und Styles freizuschalten.</p>
            </div>
            
            <button 
              onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-800 font-bold py-3 rounded-full hover:bg-gray-50 hover:border-gray-300 transition mb-3"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
              Weiter mit Google
            </button>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {session && isAuthModalOpen && (
        <div className="absolute inset-0 z-[3000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 sm:p-8 shadow-2xl relative text-center max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition">
              <X size={24} />
            </button>
            
            <div className="mb-6 mt-2">
              <img src={session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${session.user.email}&background=random`} alt="Avatar" className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-blue-50 shadow-md" />
              
              {isEditingNickname ? (
                <div className="flex flex-col gap-2">
                  <input 
                    type="text" 
                    value={tempNickname} 
                    onChange={e => setTempNickname(e.target.value)} 
                    placeholder="Wähle einen Nicknamen..."
                    className="w-full px-4 py-2 border-2 border-blue-100 rounded-full focus:outline-none focus:border-blue-500 font-bold text-center"
                    maxLength={20}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setIsEditingNickname(false)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-2 rounded-full text-sm">Abbrechen</button>
                    <button 
                      onClick={async () => {
                        if (tempNickname.trim().length < 3) return alert("Nickname zu kurz!");
                        const { error } = await supabase.from('profiles').update({ nickname: tempNickname.trim() }).eq('id', session.user.id);
                        if (!error) {
                          setProfile({ ...profile, nickname: tempNickname.trim() });
                          setIsEditingNickname(false);
                        } else {
                          alert("Dieser Name ist wahrscheinlich schon vergeben!");
                        }
                      }} 
                      className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-full text-sm"
                    >
                      Speichern
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-2xl font-black text-gray-900 flex items-center justify-center gap-2">
                    {profile?.nickname || 'Kein Nickname'}
                  </h2>
                  <button onClick={() => { setTempNickname(profile?.nickname || ''); setIsEditingNickname(true); }} className="text-blue-500 text-sm font-bold mt-1 hover:underline">
                    Nickname ändern
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2 break-all">{session.user.email}</p>
            </div>

            {/* Stats */}
            <div className="bg-blue-50 rounded-full p-4 mb-4">
              <p className="text-sm text-blue-800 font-bold mb-1">Deine Statistik</p>
              <p className="text-3xl font-black text-blue-600">
                {myPins.length}
                <span className="text-base font-normal text-blue-800 ml-1">Sticker weltweit</span>
              </p>
            </div>

            {/* Avatar & Rahmen Sektion (Vorübergehend deaktiviert) */}
            {FEATURE_AVATARS && (
              <div className="bg-gray-50 rounded-full p-5 mb-4 border border-gray-100 text-left">
                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <User className="text-purple-500" size={16} /> Mein Avatar
                </h3>
                
                <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                  <div className="flex-shrink-0 flex flex-col items-center">
                    <div className={`avatar-frame frame-${editFrame} relative w-20 h-20 text-4xl shadow-md bg-white rounded-full`}>
                      <div className="w-full h-full overflow-hidden rounded-full flex items-center justify-center">
                        {editAvatar === 'default' ? '🦊' : 
                         editAvatar === 'ghost' ? '👻' : 
                         editAvatar === 'bat' ? '🦇' : 
                         editAvatar === 'reindeer' ? '🦌' : 
                         editAvatar === 'snowman' ? '⛄' : 
                         editAvatar === 'fire' ? <img src="/badges/avatar_fire.jpg" className="w-full h-full object-cover" /> : 
                         editAvatar === 'cyberpunk' ? <img src="/badges/avatar_cyberpunk.jpg" className="w-full h-full object-cover" /> : 
                         editAvatar === 'retro' ? <img src="/badges/avatar_retro.jpg" className="w-full h-full object-cover" /> : 
                         editAvatar === 'pioneer' ? <img src="/badges/avatar_pioneer.jpg" className="w-full h-full object-cover" /> : 
                         editAvatar === 'admin' ? <img src="/badges/avatar_admin.jpg" className="w-full h-full object-cover" /> : 
                         editAvatar === 'polar' ? <img src="/badges/avatar_polar.jpg" className="w-full h-full object-cover" /> : '🦊'}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 w-full space-y-3">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Avatar wählen</p>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setEditAvatar('default')} className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition overflow-hidden ${editAvatar === 'default' ? 'bg-purple-100 ring-2 ring-purple-500' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}>🦊</button>
                        {hasHalloween && <button onClick={() => setEditAvatar('ghost')} className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition overflow-hidden ${editAvatar === 'ghost' ? 'bg-purple-100 ring-2 ring-purple-500' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}>👻</button>}
                        {hasHalloween && <button onClick={() => setEditAvatar('bat')} className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition overflow-hidden ${editAvatar === 'bat' ? 'bg-purple-100 ring-2 ring-purple-500' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}>🦇</button>}
                        {hasWinter && <button onClick={() => setEditAvatar('reindeer')} className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition overflow-hidden ${editAvatar === 'reindeer' ? 'bg-purple-100 ring-2 ring-purple-500' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}>🦌</button>}
                        {hasWinter && <button onClick={() => setEditAvatar('snowman')} className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition overflow-hidden ${editAvatar === 'snowman' ? 'bg-purple-100 ring-2 ring-purple-500' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}>⛄</button>}
                        {hasPolarExplorer && <button onClick={() => setEditAvatar('polar')} className={`w-10 h-10 rounded-lg flex items-center justify-center transition overflow-hidden ${editAvatar === 'polar' ? 'ring-2 ring-purple-500' : 'border border-gray-200 hover:opacity-80'}`}><img src="/badges/avatar_polar.jpg" className="w-full h-full object-cover" /></button>}
                        {hasUrbanLegend && <button onClick={() => setEditAvatar('cyberpunk')} className={`w-10 h-10 rounded-lg flex items-center justify-center transition overflow-hidden ${editAvatar === 'cyberpunk' ? 'ring-2 ring-purple-500' : 'border border-gray-200 hover:opacity-80'}`}><img src="/badges/avatar_cyberpunk.jpg" className="w-full h-full object-cover" /></button>}
                        {hasRetroGamer && <button onClick={() => setEditAvatar('retro')} className={`w-10 h-10 rounded-lg flex items-center justify-center transition overflow-hidden ${editAvatar === 'retro' ? 'ring-2 ring-purple-500' : 'border border-gray-200 hover:opacity-80'}`}><img src="/badges/avatar_retro.jpg" className="w-full h-full object-cover" /></button>}
                        {hasMarathon && <button onClick={() => setEditAvatar('fire')} className={`w-10 h-10 rounded-lg flex items-center justify-center transition overflow-hidden ${editAvatar === 'fire' ? 'ring-2 ring-purple-500' : 'border border-gray-200 hover:opacity-80'}`}><img src="/badges/avatar_fire.jpg" className="w-full h-full object-cover" /></button>}
                        {hasPioneer && <button onClick={() => setEditAvatar('pioneer')} className={`w-10 h-10 rounded-lg flex items-center justify-center transition overflow-hidden ${editAvatar === 'pioneer' ? 'ring-2 ring-purple-500' : 'border border-gray-200 hover:opacity-80'}`}><img src="/badges/avatar_pioneer.jpg" className="w-full h-full object-cover" /></button>}
                        {isAdmin && <button onClick={() => setEditAvatar('admin')} className={`w-10 h-10 rounded-lg flex items-center justify-center transition overflow-hidden ${editAvatar === 'admin' ? 'ring-2 ring-purple-500' : 'border border-gray-200 hover:opacity-80 ring-2 ring-yellow-400'}`}><img src="/badges/avatar_admin.jpg" className="w-full h-full object-cover" /></button>}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Rahmen wählen</p>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setEditFrame('none')} className={`px-2 py-1 rounded-md text-xs font-bold transition ${editFrame === 'none' ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>Keiner</button>
                        {(devMode || hasUrbanLegend) && <button onClick={() => setEditFrame('neon')} className={`px-2 py-1 rounded-md text-xs font-bold transition ${editFrame === 'neon' ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30' : 'bg-white border border-purple-200 text-purple-600 hover:bg-purple-50'}`}>Neon</button>}
                        {(devMode || hasPolarExplorer || hasWinter) && <button onClick={() => setEditFrame('frost')} className={`px-2 py-1 rounded-md text-xs font-bold transition ${editFrame === 'frost' ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30' : 'bg-white border border-cyan-200 text-cyan-600 hover:bg-cyan-50'}`}>Frost</button>}
                        {(devMode || hasMarathon) && <button onClick={() => setEditFrame('fire')} className={`px-2 py-1 rounded-md text-xs font-bold transition ${editFrame === 'fire' ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30' : 'bg-white border border-orange-200 text-orange-600 hover:bg-orange-50'}`}>Feuer</button>}
                      </div>
                    </div>

                    <button 
                      onClick={() => handleUpdateAvatarAndFrame(editAvatar, editFrame)}
                      className="mt-1 w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2 rounded-lg transition"
                    >
                      Speichern
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Badges / Achievements */}

                <div className={`flex items-center gap-4 p-3 rounded-2xl transition shadow-sm mb-3 ${(devMode || hasEuCenter) ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}`}>
                  <div className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-blue-800 flex items-center justify-center text-3xl ${(devMode || hasEuCenter) ? 'ring-2 ring-blue-500 shadow-md' : 'border-2 border-gray-300'}`}>
                    🇪🇺
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {(devMode || hasEuCenter) ? 'Mitte der EU ✅' : '??? (Limit: 1 Weltweit)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {(devMode || hasEuCenter) ? <>Du warst der Erste in der Mitte der EU!<br/>{getUnlockDate('eu_center') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('eu_center')}</span>}</> : 
                      euOwner ? <span className="text-red-500 font-bold">Dieses Abzeichen wurde bereits von einem anderen User ergattert!</span> : 'Klebe als allererster Nutzer in der Mitte der EU.'}
                    </p>
                  </div>
                </div>

            <div className="bg-gray-50 rounded-full p-4 mb-6 text-left">
              <p className="text-sm text-gray-800 font-bold mb-3 flex items-center justify-between">
                Trophäen-Schrank
                {devMode && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase">DevMode: Alles frei</span>}
              </p>
              
              <div className="flex flex-col gap-3">
                <div className={`flex items-center gap-4 p-3 rounded-full transition shadow-sm ${canUseDark ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}`}>
                  <div className={`w-14 h-14 rounded-full overflow-hidden shrink-0 ${canUseDark ? 'ring-2 ring-indigo-400 shadow-md' : 'border-2 border-gray-300'}`}>
                    <img src="/badges/night_owl.jpg" alt="Nachteule" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {canUseDark ? 'Nachteule ✅' : '??? (Nachteule)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {canUseDark ? <>Nachts (22-4 Uhr) geklebt. Schaltet Dark Mode frei.<br/>{getUnlockDate('nightOwl') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('nightOwl')}</span>}</> : 'Ein Geheimnis, das im Schutz der Dunkelheit ruht...'}
                    </p>
                  </div>
                </div>
                
                <div className={`flex items-center gap-4 p-3 rounded-full transition shadow-sm ${canUseVintage ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}`}>
                  <div className={`w-14 h-14 rounded-full overflow-hidden shrink-0 ${canUseVintage ? 'ring-2 ring-amber-400 shadow-md' : 'border-2 border-gray-300'}`}>
                    <img src="/badges/local_hero.jpg" alt="Lokalmatador" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {canUseVintage ? 'Lokalmatador ✅' : '??? (Lokalmatador)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {canUseVintage ? <>5 Sticker geklebt. Schaltet Explorer-Karte frei.<br/>{getUnlockDate('localHero') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('localHero')}</span>}</> : 'Nur wer Ausdauer beweist, wird die alte Welt sehen...'}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center gap-4 p-3 rounded-full transition shadow-sm ${canUseSunrise ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}`}>
                  <div className={`w-14 h-14 rounded-full overflow-hidden shrink-0 ${canUseSunrise ? 'ring-2 ring-orange-400 shadow-md' : 'border-2 border-gray-300'}`}>
                    <img src="/badges/early_bird.jpg" alt="Frühaufsteher" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {canUseSunrise ? 'Frühaufsteher ✅' : '??? (Frühaufsteher)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {canUseSunrise ? <>Morgens (5-8 Uhr) geklebt. Schaltet Sunrise-Karte frei.<br/>{getUnlockDate('earlyBird') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('earlyBird')}</span>}</> : 'Der frühe Vogel fängt den Wurm...'}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center gap-4 p-3 rounded-full transition shadow-sm ${canUseSpooky ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}`}>
                  <div className={`w-14 h-14 rounded-full overflow-hidden shrink-0 ${canUseSpooky ? 'ring-2 ring-purple-400 shadow-md' : 'border-2 border-gray-300'}`}>
                    <img src="/badges/halloween.jpg" alt="Süßes oder Saures" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {canUseSpooky ? 'Süßes oder Saures ✅' : '??? (Zeitlich begrenzt)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {canUseSpooky ? <>Halloween Event. Schaltet Spooky-Karte frei.<br/>{getUnlockDate('halloween') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('halloween')}</span>}</> : 'Ein Ereignis, das nur einmal im Jahr aus den Schatten tritt...'}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center gap-4 p-3 rounded-full transition shadow-sm ${canUseSnow ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}`}>
                  <div className={`w-14 h-14 rounded-full overflow-hidden shrink-0 ${canUseSnow ? 'ring-2 ring-blue-400 shadow-md' : 'border-2 border-gray-300'}`}>
                    <img src="/badges/winter.jpg" alt="Winterwunder" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {canUseSnow ? 'Winterwunder ✅' : '??? (Zeitlich begrenzt)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {canUseSnow ? <>Weihnachts Event. Schaltet Snow-Karte frei.<br/>{getUnlockDate('winter') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('winter')}</span>}</> : 'Wenn die Tage kürzer werden und die Welt erfrischt...'}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center gap-4 p-3 rounded-full transition shadow-sm ${canUseAurora ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}`}>
                  <div className={`w-14 h-14 rounded-full overflow-hidden shrink-0 ${canUseAurora ? 'ring-2 ring-teal-400 shadow-md' : 'border-2 border-gray-300'}`}>
                    <img src="/badges/polar.jpg" alt="Polarforscher" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {canUseAurora ? 'Polarforscher ✅' : '??? (Polarforscher)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {canUseAurora ? <>Extrem weit im Norden oder Süden geklebt. Schaltet Aurora-Karte frei.<br/>{getUnlockDate('polar') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('polar')}</span>}</> : 'Nur wer der extremen Kälte trotzt...'}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center gap-4 p-3 rounded-full transition shadow-sm ${canUseCyberpunk ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}`}>
                  <div className={`w-14 h-14 rounded-full overflow-hidden shrink-0 ${canUseCyberpunk ? 'ring-2 ring-pink-400 shadow-md' : 'border-2 border-gray-300'}`}>
                    <img src="/badges/urban.jpg" alt="Urban Legend" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {canUseCyberpunk ? 'Urban Legend ✅' : '??? (Großstadt)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {canUseCyberpunk ? <>In einer Weltmetropole geklebt. Schaltet Cyberpunk-Karte frei.<br/>{getUnlockDate('urban') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('urban')}</span>}</> : 'Dort wo das Neonlicht niemals schläft...'}
                    </p>
                  </div>
                </div>

                

                <div className={`flex items-center gap-4 p-3 rounded-full transition shadow-sm ${(devMode || hasPi) ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}`}>
                  <div className={`w-14 h-14 rounded-full overflow-hidden shrink-0 ${(devMode || hasPi) ? 'ring-2 ring-yellow-400 shadow-md' : 'border-2 border-gray-300'}`}>
                    <img src="/badges/badge_pi.jpg" alt="PI" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {(devMode || hasPi) ? 'PI (3,14) ✅' : '??? (Mathematiker)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {(devMode || hasPi) ? <>Auf dem 3,14 Längen- oder Breitengrad geklebt.<br/>{getUnlockDate('pi') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('pi')}</span>}</> : 'Nur für wahre Geeks und Nerds...'}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center gap-4 p-3 rounded-full transition shadow-sm ${(devMode || hasMay4) ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}`}>
                  <div className={`w-14 h-14 rounded-full overflow-hidden shrink-0 ${(devMode || hasMay4) ? 'ring-2 ring-green-400 shadow-md' : 'border-2 border-gray-300'}`}>
                    <img src="/badges/badge_may4.jpg" alt="May the 4th" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {(devMode || hasMay4) ? 'May the force be with you ✅' : '??? (Sci-Fi Fan)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {(devMode || hasMay4) ? <>Am 4. Mai geklebt. Schaltet einen galaktischen Meister frei!<br/>{getUnlockDate('may4') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('may4')}</span>}</> : 'Spüre die Macht an einem ganz bestimmten Tag im Mai...'}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center gap-4 p-3 rounded-full transition shadow-sm ${(devMode || hasLove) ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}`}>
                  <div className={`w-14 h-14 rounded-full overflow-hidden shrink-0 ${(devMode || hasLove) ? 'ring-2 ring-red-400 shadow-md' : 'border-2 border-gray-300'}`}>
                    <img src="/badges/badge_love.jpg" alt="True Love" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {(devMode || hasLove) ? 'True Love ✅' : '??? (Romantiker)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {(devMode || hasLove) ? <>Am Valentinstag (14. Feb) geklebt.<br/>{getUnlockDate('love') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('love')}</span>}</> : 'Die Liebe liegt in der Luft... und auf der Karte.'}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center gap-4 p-3 rounded-full transition shadow-sm ${(devMode || hasSilvester) ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}`}>
                  <div className={`w-14 h-14 rounded-full overflow-hidden shrink-0 ${(devMode || hasSilvester) ? 'ring-2 ring-blue-400 shadow-md' : 'border-2 border-gray-300'}`}>
                    <img src="/badges/badge_silvester.jpg" alt="Silvester" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {(devMode || hasSilvester) ? 'Irgendwas mit Silvester? ✅' : '??? (Feuerwerk)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {(devMode || hasSilvester) ? <>An Silvester oder Neujahr geklebt.<br/>{getUnlockDate('silvester') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('silvester')}</span>}</> : 'Lass es knallen zum Jahreswechsel!'}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center gap-4 p-3 rounded-full transition shadow-sm ${(devMode || hasNz) ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}`}>
                  <div className={`w-14 h-14 rounded-full overflow-hidden shrink-0 ${(devMode || hasNz) ? 'ring-2 ring-yellow-500 shadow-md' : 'border-2 border-gray-300'}`}>
                    <img src="/badges/badge_nz.jpg" alt="Neuseeland" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {(devMode || hasNz) ? 'One Geophysalis to rule them all ✅' : '??? (Neuseeland)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {(devMode || hasNz) ? <>In Neuseeland (Mittelerde) geklebt.<br/>{getUnlockDate('nz') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('nz')}</span>}</> : 'Wirf den Ring ins Feuer...'}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center gap-4 p-3 rounded-full transition shadow-sm ${(devMode || hasUshuaia) ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}`}>
                  <div className={`w-14 h-14 rounded-full overflow-hidden shrink-0 ${(devMode || hasUshuaia) ? 'ring-2 ring-teal-400 shadow-md' : 'border-2 border-gray-300'}`}>
                    <img src="/badges/badge_ushuaia.jpg" alt="Auge des Sturms" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {(devMode || hasUshuaia) ? 'Im Auge des Sturms ✅' : '??? (Feuerland)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {(devMode || hasUshuaia) ? <>Am Südzipfel von Argentinien (Ushuaia) geklebt.<br/>{getUnlockDate('ushuaia') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('ushuaia')}</span>}</> : 'Das Ende der Welt im tiefen Süden...'}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center gap-4 p-3 rounded-full transition shadow-sm ${(devMode || hasYinYang) ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}`}>
                  <div className={`w-14 h-14 rounded-full overflow-hidden shrink-0 ${(devMode || hasYinYang) ? 'ring-2 ring-gray-800 shadow-md' : 'border-2 border-gray-300'}`}>
                    <img src="/badges/badge_yinyang.jpg" alt="Yin & Yang" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {(devMode || hasYinYang) ? 'Yin & Yang ✅' : '??? (Balance)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {(devMode || hasYinYang) ? <>Perfekte geografische Balance: Nord- und Südhalbkugel vereint.<br/>{getUnlockDate('yinyang') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('yinyang')}</span>}</> : 'Finde das Gleichgewicht zwischen Norden und Süden...'}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center gap-4 p-3 rounded-full transition shadow-sm ${(devMode || hasGipfeli) ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}`}>
                  <div className={`w-14 h-14 rounded-full overflow-hidden shrink-0 ${(devMode || hasGipfeli) ? 'ring-2 ring-orange-400 shadow-md' : 'border-2 border-gray-300'}`}>
                    <img src="/badges/badge_gipfeli.jpg" alt="Gipfeli" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {(devMode || hasGipfeli) ? 'Gipfeli ✅' : '??? (Alpinist)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {(devMode || hasGipfeli) ? <>Am Gipfel geklebt! Zeit für ein Croissant.<br/>{getUnlockDate('gipfeli') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('gipfeli')}</span>}</> : 'Erklimme einen der höchsten Gipfel...'}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center gap-4 p-3 rounded-full transition shadow-sm ${(devMode || hasVivaldi) ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}`}>
                  <div className={`w-14 h-14 rounded-full overflow-hidden shrink-0 ${(devMode || hasVivaldi) ? 'ring-2 ring-pink-400 shadow-md' : 'border-2 border-gray-300'}`}>
                    <img src="/badges/badge_vivaldi.jpg" alt="4 Jahreszeiten" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {(devMode || hasVivaldi) ? 'Die 4 Jahreszeiten ✅' : '??? (Vivaldi)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {(devMode || hasVivaldi) ? <>In Frühling, Sommer, Herbst und Winter geklebt.<br/>{getUnlockDate('vivaldi') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('vivaldi')}</span>}</> : 'Erlebe den Kreislauf der Natur...'}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center gap-4 p-3 rounded-full transition shadow-sm ${(devMode || hasTier5) ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}`}>
                  <div className={`w-14 h-14 rounded-full overflow-hidden shrink-0 bg-yellow-700 flex items-center justify-center text-3xl ${(devMode || hasTier5) ? 'ring-2 ring-yellow-800 shadow-md' : 'border-2 border-gray-300'}`}>
                    🥉
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {(devMode || hasTier5) ? 'Bronze Sammler (5 Pins) ✅' : '??? (Sammler)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {(devMode || hasTier5) ? <>Aller Anfang ist gemacht.<br/>{getUnlockDate('tier5') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('tier5')}</span>}</> : 'Klebe 5 Sticker, um Bronze zu erhalten.'}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center gap-4 p-3 rounded-full transition shadow-sm ${(devMode || hasTier10) ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}`}>
                  <div className={`w-14 h-14 rounded-full overflow-hidden shrink-0 bg-gray-300 flex items-center justify-center text-3xl ${(devMode || hasTier10) ? 'ring-2 ring-gray-400 shadow-md' : 'border-2 border-gray-300'}`}>
                    🥈
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {(devMode || hasTier10) ? 'Silber Sammler (10 Pins) ✅' : '??? (Sammler)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {(devMode || hasTier10) ? <>Eine stolze Sammlung.<br/>{getUnlockDate('tier10') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('tier10')}</span>}</> : 'Klebe 10 Sticker, um Silber zu erhalten.'}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center gap-4 p-3 rounded-full transition shadow-sm ${(devMode || hasTier50) ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}`}>
                  <div className={`w-14 h-14 rounded-full overflow-hidden shrink-0 bg-yellow-400 flex items-center justify-center text-3xl ${(devMode || hasTier50) ? 'ring-2 ring-yellow-500 shadow-md' : 'border-2 border-gray-300'}`}>
                    🥇
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {(devMode || hasTier50) ? 'Gold Sammler (50 Pins) ✅' : '??? (Sammler)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {(devMode || hasTier50) ? <>Eine beachtliche Leistung!<br/>{getUnlockDate('tier50') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('tier50')}</span>}</> : 'Klebe 50 Sticker, um Gold zu erhalten.'}
                    </p>
                  </div>
                </div>
<div className={`flex items-center gap-4 p-3 rounded-full transition shadow-sm ${devMode || hasWorldTraveler ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}`}>
                  <div className={`w-14 h-14 rounded-full overflow-hidden shrink-0 ${devMode || hasWorldTraveler ? 'ring-2 ring-emerald-400 shadow-md' : 'border-2 border-gray-300'}`}>
                    <img src="/badges/world_traveler.jpg" alt="Weltenbummler" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {(devMode || hasWorldTraveler) ? 'Weltenbummler ✅' : '??? (Weltenbummler)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {(devMode || hasWorldTraveler) ? <>In mind. 3 Ländern geklebt. (WIP)<br/>{getUnlockDate('worldTraveler') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('worldTraveler')}</span>}</> : 'Die Welt ist groß, bereise sie...'}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center gap-4 p-3 rounded-full transition shadow-sm ${hasMarathon ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}`}>
                  <div className={`w-14 h-14 rounded-full overflow-hidden shrink-0 ${hasMarathon ? 'ring-2 ring-orange-500 shadow-md' : 'border-2 border-gray-300'}`}>
                    <img src="/badges/streak.jpg" alt="Feuer & Flamme" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {hasMarathon ? 'Feuer & Flamme ✅' : '??? (Marathon)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {hasMarathon ? <>An 3 aufeinanderfolgenden Tagen geklebt. Du brennst!<br/>{getUnlockDate('marathon') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('marathon')}</span>}</> : 'Konstanz ist der Schlüssel zum wahren Feuer...'}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center gap-4 p-3 rounded-full transition shadow-sm ${hasPioneer ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}`}>
                  <div className={`w-14 h-14 rounded-full overflow-hidden shrink-0 ${hasPioneer ? 'ring-2 ring-yellow-400 shadow-md' : 'border-2 border-gray-300'}`}>
                    <img src="/badges/badge_pioneer.jpg" alt="Pionier" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {hasPioneer ? 'Pionier der ersten Stunde 🌟' : '??? (Gründungsmitglied)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {hasPioneer ? <>Du gehörst zu den ersten 15 Nutzern weltweit! Danke für deine Unterstützung.<br/>{getUnlockDate('pioneer') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('pioneer')}</span>}</> : 'Streng limitiert auf die exakt ersten 15 Nutzer weltweit.'}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center gap-4 p-3 rounded-full transition shadow-sm ${hasRetroGamer ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}`}>
                  <div className={`w-14 h-14 rounded-full overflow-hidden shrink-0 ${hasRetroGamer ? 'ring-2 ring-green-500 shadow-md' : 'border-2 border-gray-300'}`}>
                    <img src="/badges/retro.jpg" alt="Pixel Pioneer" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {hasRetroGamer ? 'Pixel Pioneer 👾' : '??? (Retro Gamer)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {hasRetroGamer ? '10 Sticker geklebt. 8-Bit Karte freigeschaltet!' : 'Klebe 10 Sticker, um in die Vergangenheit zu reisen...'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Toggle My Pins */}
            <label className="flex items-center justify-between bg-gray-50 p-4 rounded-full cursor-pointer hover:bg-gray-100 transition mb-6">
              <span className="font-bold text-gray-700 text-sm">Nur meine Sticker zeigen</span>
              <div className={`w-12 h-6 rounded-full transition relative ${showOnlyMyPins ? 'bg-blue-600' : 'bg-gray-300'}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${showOnlyMyPins ? 'left-7' : 'left-1'}`}></div>
              </div>
              <input type="checkbox" className="hidden" checked={showOnlyMyPins} onChange={e => {
                setShowOnlyMyPins(e.target.checked);
                if (e.target.checked) setIsAuthModalOpen(false);
              }} />
            </label>
            
            <button 
              onClick={() => {
                supabase.auth.signOut();
                setIsAuthModalOpen(false);
              }}
              className="w-full bg-white border-2 border-red-100 text-red-500 font-bold py-3 rounded-full hover:bg-red-50 transition"
            >
              Abmelden
            </button>
          </div>
        </div>
      )}

      {/* Leaderboard Modal */}
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

        return (
          <div className="absolute inset-0 z-[4000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] p-6 sm:p-8 shadow-2xl relative flex flex-col">
              <button onClick={() => setIsLeaderboardOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition">
                <X size={28} />
              </button>
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3 mb-6">
                <Trophy className="text-yellow-500" size={32} /> Rangliste
              </h2>

              <div className="flex bg-gray-100 rounded-full p-1 mb-6">
                <button onClick={() => setLeaderboardTab('weekly')} className={`flex-1 text-sm font-bold py-2 rounded-lg transition ${leaderboardTab === 'weekly' ? 'bg-white shadow-sm text-yellow-600' : 'text-gray-500'}`}>Wöchentlich</button>
                <button onClick={() => setLeaderboardTab('monthly')} className={`flex-1 text-sm font-bold py-2 rounded-lg transition ${leaderboardTab === 'monthly' ? 'bg-white shadow-sm text-yellow-600' : 'text-gray-500'}`}>Monatlich</button>
                <button onClick={() => setLeaderboardTab('alltime')} className={`flex-1 text-sm font-bold py-2 rounded-lg transition ${leaderboardTab === 'alltime' ? 'bg-white shadow-sm text-yellow-600' : 'text-gray-500'}`}>All-Time</button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
                {sortedUsers.length === 0 ? (
                  <p className="text-center text-gray-400 font-medium py-10">Noch keine Einträge in diesem Zeitraum.</p>
                ) : (
                  sortedUsers.map((u, i) => {
                    const avatar = u.avatar || 'default';
                    const frame = u.frame_style || 'none';
                    
                    let avatarContent;
                    if (avatar === 'ghost') avatarContent = '👻';
                    else if (avatar === 'bat') avatarContent = '🦇';
                    else if (avatar === 'reindeer') avatarContent = '🦌';
                    else if (avatar === 'snowman') avatarContent = '⛄';
                    else if (avatar === 'fire') avatarContent = <img src="/badges/avatar_fire.jpg" className="w-full h-full object-cover" />;
                    else if (avatar === 'cyberpunk') avatarContent = <img src="/badges/avatar_cyberpunk.jpg" className="w-full h-full object-cover" />;
                    else if (avatar === 'retro') avatarContent = <img src="/badges/avatar_retro.jpg" className="w-full h-full object-cover" />;
                    else if (avatar === 'pioneer') avatarContent = <img src="/badges/avatar_pioneer.jpg" className="w-full h-full object-cover" />;
                    else if (avatar === 'admin') avatarContent = <img src="/badges/avatar_admin.jpg" className="w-full h-full object-cover" />;
                    else if (avatar === 'polar') avatarContent = <img src="/badges/avatar_polar.jpg" className="w-full h-full object-cover" />;
                    else avatarContent = '🦊';

                    return (
                      <div key={u.userId} className={`flex items-center justify-between p-3 rounded-full border ${i === 0 ? 'bg-yellow-50 border-yellow-200' : i === 1 ? 'bg-gray-50 border-gray-200' : i === 2 ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-xl w-6 text-center">
                            {i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-sm font-black text-gray-400">{i + 1}.</span>}
                          </span>
                          
                          {FEATURE_AVATARS && (
                            <div className={`avatar-frame frame-${frame} w-10 h-10 text-xl shadow-sm bg-white shrink-0 overflow-hidden`}>
                              {avatarContent}
                            </div>
                          )}

                          <span className={`font-black ${i === 0 ? 'text-yellow-700' : i === 1 ? 'text-gray-700' : i === 2 ? 'text-orange-800' : 'text-gray-700'}`}>
                            {u.nickname}
                          </span>
                        </div>
                        <div className={`font-black text-sm ${i === 0 ? 'text-yellow-600' : 'text-gray-500'}`}>
                          {u.count} <span className="text-[10px] uppercase font-bold text-gray-400 hidden sm:inline">Sticker</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Admin Modal */}
      {isAdminModalOpen && (
        <div className="absolute inset-0 z-[4000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl h-[80vh] p-6 sm:p-8 shadow-2xl relative flex flex-col">
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

      {/* Footer (Lizenz & Impressum) */}
      <div className="absolute bottom-24 sm:bottom-2 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-6 py-2 rounded-full shadow-lg border border-gray-200 z-[1000] flex items-center gap-4 text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">
        <span>&copy; {new Date().getFullYear()} Geophysalis. Alle Rechte vorbehalten.</span>
        <button onClick={() => alert("Lizenz & Urheberrecht:\n\nAlle Inhalte, Bilder (inklusive Avatare und Abzeichen), Quellcodes, Texte und Designs dieser Anwendung sind geistiges Eigentum des Seiteninhabers (Admin).\nJegliche Vervielfältigung, Verbreitung oder Nutzung ohne ausdrückliche schriftliche Erlaubnis ist strengstens untersagt.\n\nEs gelten die gesetzlichen Bestimmungen des Urheberrechts.")} className="font-bold underline hover:text-gray-900 transition">
          Lizenz & Impressum
        </button>
      </div>
    </div>
  );
}
