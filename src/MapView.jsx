import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMapEvents, useMap, Rectangle } from 'react-leaflet';
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

const PEAKS = [
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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [profile, setProfile] = useState(null);
  const [isEditingNickname, setIsEditingNickname] = useState(false);

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
  const [openAccordion, setOpenAccordion] = useState('Exklusiv & Limitiert');
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
            const peakPin = myPins.find(p => isNearCoords(p.lat, p.lng, peak.lat, peak.lng, 3.0));
            if (peakPin) {
               const { error } = await supabase.from('global_achievements').insert({ achievement_id: `gipfeli_${peak.id}`, user_id: session.user.id });
               if (!error) {
                 newUnlocks.push({ title: "Gipfeli Alpinist", text: `Glückwunsch! Du hast das Gipfeli am ${peak.name} als Allererster gesichert!`, icon: '🥐' });
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


  const myGipfeliObj = globalAchievements.find(g => g.achievement_id.startsWith('gipfeli_') && g.user_id === session?.user?.id);
  const myGipfeliPeakId = myGipfeliObj ? myGipfeliObj.achievement_id.split('_')[1] : null;
  const myGipfeliPeakName = myGipfeliPeakId ? PEAKS.find(p => p.id === myGipfeliPeakId)?.name : null;


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

  const hasBerggams = myPins.some(p => p.altitude >= 2000);
  const hasSteinbock = myPins.some(p => p.altitude >= 3000);
  const hasLuft = myPins.some(p => p.altitude >= 7000);

  // --- Manual Badges (from special_badge column) ---
  const manualBadges = new Set(myPins.map(p => p.special_badge).filter(Boolean));
  const hasAtlantis = manualBadges.has('atlantis');
  const hasUnterTage = manualBadges.has('unter_tage');
  const hasLostPlace = manualBadges.has('lost_place');
  const hasAurora = manualBadges.has('aurora');
  const hasSonnenfinsternis = manualBadges.has('sonnenfinsternis');
  const hasCoop = manualBadges.has('coop');
  const hasOG = manualBadges.has('og');
  const hasMariana = manualBadges.has('mariana');
  const hasAlpinist = myPins.some(p => p.altitude >= 1000);
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
  const canUseSpooky = devMode || hasHalloween;
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
    const options = { maxSizeMB: 0.3, maxWidthOrHeight: 1200, useWebWorker: true };
    try {
      const compressed = await imageCompression(file, options);
      setCompressedFile(compressed);
    } catch (error) {
      console.error(error);
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

  // Computed Pins based on toggle
  const displayPins = showOnlyMyPins && session ? pins.filter(p => p.user_id === session.user.id) : pins;

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
          <div className="bg-white/95 backdrop-blur-md p-4 rounded-3xl shadow-2xl border border-gray-100 flex flex-col gap-4 w-56 animate-in slide-in-from-top-4 origin-top-right">
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

      {/* Radar & Roulette Buttons */}
      {!draftPin && !isModalOpen && pins.length > 0 && (
        <div className="absolute bottom-32 right-4 sm:bottom-[150px] sm:right-8 z-[1000] flex flex-col gap-3 pointer-events-none">
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
        <div className="absolute bottom-6 right-4 sm:bottom-8 sm:right-8 z-[1000] flex flex-col items-center gap-1.5 pointer-events-auto">
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
          <button onClick={handleStartNewPin} className="bg-blue-600 text-white px-5 py-3 sm:px-6 sm:py-4 w-full rounded-full sm:rounded-full shadow-xl hover:bg-blue-700 hover:scale-105 hover:-translate-y-1 transition-all font-bold text-base sm:text-lg flex items-center justify-center gap-2">
            <MapPin size={22} className="sm:w-6 sm:h-6" /> Sticker setzen
          </button>
        </div>
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
                {uploadStep && (
                  <div className="w-full mb-2">
                    <div className="flex items-center justify-between mb-1.5">
                      {['analyzing','compressing','uploading'].map((step, i) => {
                        const stepIdx = ['analyzing','compressing','uploading'].indexOf(uploadStep);
                        const labels = ['🔍 Analysieren', '🗜️ Komprimieren', '☁️ Hochladen'];
                        const done = i < stepIdx;
                        const active = i === stepIdx;
                        return (
                          <div key={step} className={`flex-1 text-center text-[10px] font-bold transition-all ${
                            done ? 'text-green-600' : active ? 'text-blue-600' : 'text-gray-300'
                          }`}>{done ? '✅' : labels[i]}</div>
                        );
                      })}
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: uploadStep === 'analyzing' ? '15%' : uploadStep === 'compressing' ? '55%' : '90%' }}
                      />
                    </div>
                  </div>
                )}
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
              <p className="text-sm text-gray-600 mb-4">Melde dich an, um in Zukunft Abzeichen zu sammeln und Styles freizuschalten.</p>
              
              <div className="text-left bg-gray-50 p-3 rounded-xl border border-gray-200">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 shrink-0" />
                  <span className="text-[10px] text-gray-600 leading-tight">
                    <strong>Nutzungsbedingungen & Haftungsausschluss:</strong> Ich bestätige, dass ich mich vor dem Anbringen von Stickern über die lokalen Gesetze informiere. Ich hafte vollumfänglich und allein für mein Handeln. Der Seitenbetreiber übernimmt keinerlei Haftung für Schäden, Ordnungswidrigkeiten oder Straftaten (insb. Sachbeschädigung). Das Verkleben ohne Zustimmung des Eigentümers ist illegal.
                  </span>
                </label>
              </div>
            </div>
            
            <button 
              onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
              disabled={!agreedToTerms}
              className={`w-full flex items-center justify-center gap-3 bg-white border-2 font-bold py-3 rounded-full transition mb-3 ${agreedToTerms ? 'border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-gray-300' : 'border-gray-100 text-gray-400 cursor-not-allowed opacity-50'}`}
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className={`w-5 h-5 ${!agreedToTerms && 'grayscale opacity-50'}`} />
              Weiter mit Google
            </button>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {session && isAuthModalOpen && (
        <div className="absolute inset-0 z-[3000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setIsAuthModalOpen(false); }}>
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl relative flex flex-col" style={{maxHeight:'92vh'}}>
            <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition z-10">
              <X size={24} />
            </button>

            {/* Fixed Header */}
            <div className="p-5 pb-3 text-center shrink-0">
              <div className="relative inline-block mb-2">
                <img src={session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${session.user.email}&background=random`} alt="Avatar" className="w-[72px] h-[72px] rounded-full border-4 border-white shadow-lg" />
                {hasPioneer && <span className="absolute -bottom-1 -right-1 bg-yellow-400 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow">No.{myPioneerRank}</span>}
              </div>

              {isEditingNickname ? (
                <div className="flex flex-col gap-2 mb-2">
                  <input type="text" value={tempNickname} onChange={e => setTempNickname(e.target.value)} placeholder="Nickname..." className="w-full px-4 py-2 border-2 border-blue-100 rounded-full focus:outline-none focus:border-blue-500 font-bold text-center text-sm" maxLength={20} />
                  <div className="flex gap-2">
                    <button onClick={() => setIsEditingNickname(false)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-2 rounded-full text-xs">Abbrechen</button>
                    <button onClick={async () => { if (tempNickname.trim().length < 3) return alert('Nickname zu kurz!'); const { error } = await supabase.from('profiles').update({ nickname: tempNickname.trim() }).eq('id', session.user.id); if (!error) { setProfile({ ...profile, nickname: tempNickname.trim() }); setIsEditingNickname(false); } else alert('Name schon vergeben!'); }} className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-full text-xs">Speichern</button>
                  </div>
                </div>
              ) : (
                <div className="mb-2">
                  <h2 className="text-lg font-black text-gray-900">{profile?.nickname || 'Kein Nickname'}</h2>
                  <button onClick={() => { setTempNickname(profile?.nickname || ''); setIsEditingNickname(true); }} className="text-blue-500 text-xs font-bold hover:underline">Nickname ändern</button>
                </div>
              )}

              {/* Stats Bar */}
              <div className="flex items-stretch justify-center mb-3 bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                <div className="flex-1 text-center py-3">
                  <p className="text-xl font-black text-gray-900">{myPins.length}</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Sticker</p>
                </div>
                <div className="w-px bg-gray-200"/>
                <div className="flex-1 text-center py-3">
                  <p className="text-xl font-black text-gray-900">{totalDistanceKm > 999 ? `${(totalDistanceKm/1000).toFixed(1)}k` : totalDistanceKm}</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">km Reise</p>
                </div>
                <div className="w-px bg-gray-200"/>
                <div className="flex-1 text-center py-3">
                  <p className="text-xl font-black text-gray-900">{uniqueCountries.size}</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Länder</p>
                </div>
              </div>


              {session && uniqueCountries.size > 0 && (
                <div className="mb-3">
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-2">🌍 Erkundet: {uniqueCountries.size} {uniqueCountries.size === 1 ? 'Land' : 'Länder'}</p>
                  <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                    <ErrorBoundary>
                      <VisitedCountriesMap visitedCountries={uniqueCountries} />
                    </ErrorBoundary>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {[...uniqueCountries].filter(Boolean).map(country => (
                      <span key={country} className="text-[9px] bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-full">{country}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="flex bg-gray-100 rounded-2xl p-1">
                {[['profil','👤 Profil'],['abzeichen','🏆 Abzeichen'],['einstellungen','⚙️ Einst.']].map(([tab, label]) => (
                  <button key={tab} onClick={() => setProfileTab(tab)} className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${profileTab === tab ? 'bg-white shadow text-gray-900' : 'text-gray-400 hover:text-gray-700'}`}>{label}</button>
                ))}
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto custom-scrollbar flex-1 p-5 pt-3 flex flex-col gap-4">

              {/* TAB: PROFIL */}
              {profileTab === 'profil' && (
                <div className="bg-gray-50 rounded-2xl p-4 text-left">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Avatar & Rahmen</h3>
                  {FEATURE_AVATARS ? (
                    <div className="flex gap-4 items-start">
                      <div className={`avatar-frame frame-${editFrame} relative w-16 h-16 text-3xl shadow bg-white rounded-full shrink-0`}>
                        <div className="w-full h-full overflow-hidden rounded-full flex items-center justify-center">
                          {editAvatar === 'default' ? '🦊' : editAvatar === 'ghost' ? '👻' : editAvatar === 'bat' ? '🦇' : editAvatar === 'reindeer' ? '🦌' : editAvatar === 'snowman' ? '⛄' : editAvatar === 'fire' ? <img src="/badges/avatar_fire.jpg" className="w-full h-full object-cover" /> : editAvatar === 'cyberpunk' ? <img src="/badges/avatar_cyberpunk.jpg" className="w-full h-full object-cover" /> : editAvatar === 'retro' ? <img src="/badges/avatar_retro.jpg" className="w-full h-full object-cover" /> : editAvatar === 'pioneer' ? <img src="/badges/avatar_pioneer.jpg" className="w-full h-full object-cover" /> : editAvatar === 'admin' ? <img src="/badges/avatar_admin.jpg" className="w-full h-full object-cover" /> : editAvatar === 'polar' ? <img src="/badges/avatar_polar.jpg" className="w-full h-full object-cover" /> : '🦊'}
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Avatar</p>
                          <div className="flex flex-wrap gap-1.5">
                            <button onClick={() => setEditAvatar('default')} className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition ${editAvatar === 'default' ? 'bg-purple-100 ring-2 ring-purple-500' : 'bg-white border border-gray-200'}`}>🦊</button>
                            {hasHalloween && <button onClick={() => setEditAvatar('ghost')} className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition ${editAvatar === 'ghost' ? 'bg-purple-100 ring-2 ring-purple-500' : 'bg-white border border-gray-200'}`}>👻</button>}
                            {hasHalloween && <button onClick={() => setEditAvatar('bat')} className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition ${editAvatar === 'bat' ? 'bg-purple-100 ring-2 ring-purple-500' : 'bg-white border border-gray-200'}`}>🦇</button>}
                            {hasWinter && <button onClick={() => setEditAvatar('reindeer')} className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition ${editAvatar === 'reindeer' ? 'bg-purple-100 ring-2 ring-purple-500' : 'bg-white border border-gray-200'}`}>🦌</button>}
                            {hasWinter && <button onClick={() => setEditAvatar('snowman')} className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition ${editAvatar === 'snowman' ? 'bg-purple-100 ring-2 ring-purple-500' : 'bg-white border border-gray-200'}`}>⛄</button>}
                            {hasPolarExplorer && <button onClick={() => setEditAvatar('polar')} className={`w-9 h-9 rounded-lg overflow-hidden transition ${editAvatar === 'polar' ? 'ring-2 ring-purple-500' : 'border border-gray-200'}`}><img src="/badges/avatar_polar.jpg" className="w-full h-full object-cover" /></button>}
                            {hasUrbanLegend && <button onClick={() => setEditAvatar('cyberpunk')} className={`w-9 h-9 rounded-lg overflow-hidden transition ${editAvatar === 'cyberpunk' ? 'ring-2 ring-purple-500' : 'border border-gray-200'}`}><img src="/badges/avatar_cyberpunk.jpg" className="w-full h-full object-cover" /></button>}
                            {hasRetroGamer && <button onClick={() => setEditAvatar('retro')} className={`w-9 h-9 rounded-lg overflow-hidden transition ${editAvatar === 'retro' ? 'ring-2 ring-purple-500' : 'border border-gray-200'}`}><img src="/badges/avatar_retro.jpg" className="w-full h-full object-cover" /></button>}
                            {hasMarathon && <button onClick={() => setEditAvatar('fire')} className={`w-9 h-9 rounded-lg overflow-hidden transition ${editAvatar === 'fire' ? 'ring-2 ring-purple-500' : 'border border-gray-200'}`}><img src="/badges/avatar_fire.jpg" className="w-full h-full object-cover" /></button>}
                            {hasPioneer && <button onClick={() => setEditAvatar('pioneer')} className={`w-9 h-9 rounded-lg overflow-hidden transition ${editAvatar === 'pioneer' ? 'ring-2 ring-purple-500' : 'border border-gray-200'}`}><img src="/badges/avatar_pioneer.jpg" className="w-full h-full object-cover" /></button>}
                            {isAdmin && <button onClick={() => setEditAvatar('admin')} className={`w-9 h-9 rounded-lg overflow-hidden ring-2 ring-yellow-400 transition ${editAvatar === 'admin' ? 'ring-purple-500' : ''}`}><img src="/badges/avatar_admin.jpg" className="w-full h-full object-cover" /></button>}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Rahmen</p>
                          <div className="flex flex-wrap gap-1.5">
                            <button onClick={() => setEditFrame('none')} className={`px-2 py-1 rounded-md text-xs font-bold transition ${editFrame === 'none' ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>Keiner</button>
                            {(devMode || hasUrbanLegend) && <button onClick={() => setEditFrame('neon')} className={`px-2 py-1 rounded-md text-xs font-bold transition ${editFrame === 'neon' ? 'bg-purple-600 text-white' : 'bg-white border border-purple-200 text-purple-600'}`}>Neon</button>}
                            {(devMode || hasPolarExplorer || hasWinter) && <button onClick={() => setEditFrame('frost')} className={`px-2 py-1 rounded-md text-xs font-bold transition ${editFrame === 'frost' ? 'bg-cyan-500 text-white' : 'bg-white border border-cyan-200 text-cyan-600'}`}>Frost</button>}
                            {(devMode || hasMarathon) && <button onClick={() => setEditFrame('fire')} className={`px-2 py-1 rounded-md text-xs font-bold transition ${editFrame === 'fire' ? 'bg-orange-500 text-white' : 'bg-white border border-orange-200 text-orange-600'}`}>Feuer</button>}
                          </div>
                        </div>
                        <button onClick={() => handleUpdateAvatarAndFrame(editAvatar, editFrame)} className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2 rounded-xl transition">Speichern</button>
                      </div>
                    </div>
                  ) : <p className="text-sm text-gray-400 text-center">Avatar-Auswahl kommt bald!</p>}
                </div>
              )}

              {/* TAB: ABZEICHEN */}
              {profileTab === 'abzeichen' && (
                <div className="flex flex-col gap-4">
                  {devMode && <div className="text-center text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase">DevMode: Alles frei</div>}

                  <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Sammler Fortschritt</p>
                      <span className="text-xs font-bold text-gray-700">{myPins.length}/50</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2.5 mb-1">
                      <div className="bg-gradient-to-r from-yellow-500 to-orange-400 h-2.5 rounded-full transition-all duration-500" style={{width: `${Math.min(100, (myPins.length / 50) * 100)}%`}} />
                    </div>
                    <p className="text-[10px] text-gray-400">{myPins.length < 5 ? `Noch ${5 - myPins.length} bis Bronze` : myPins.length < 10 ? `Noch ${10 - myPins.length} bis Silber` : myPins.length < 50 ? `Noch ${50 - myPins.length} bis Gold` : 'Gold Sammler erreicht!'}</p>
                  </div>

                  {[
                    { label: 'Exklusiv & Limitiert', color: 'ring-blue-400', items: [
                      { has: devMode || hasEuCenter, img: '/badges/badge_eu.png', bg: 'bg-blue-800', title: 'Mitte der EU', titleL: '??? (Limit: 1 Weltweit)', desc: 'Du warst der Erste in der Mitte der EU!', descL: euOwner ? 'Bereits von jemand anderem ergattert!' : 'Klebe als allererster Nutzer in die Mitte der EU.', date: getUnlockDate('eu_center') },
                      { has: devMode || hasGipfeli, img: '/badges/badge_gipfeli.jpg', title: 'Gipfeli', titleL: '??? (Gipfeli)', desc: `Gipfeli erkraxelt!${myGipfeliPeakName ? ' 🏔️ ' + myGipfeliPeakName : ''}`, descL: 'Klebe als Erster auf den Gipfel eines Bundeslandes.', date: getUnlockDate('gipfeli') },
                      { has: hasPioneer, img: '/badges/badge_pioneer.jpg', title: `Pionier der ersten Stunde (No. ${myPioneerRank}/15) 🚀`, titleL: 'Pionier der ersten Stunde (Limit: 15)', desc: 'Du gehörst zu den ersten 15 Nutzern weltweit!', descL: 'Streng limitiert auf die exakt ersten 15 Nutzer.', date: getUnlockDate('pioneer') },
                    ]},
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
                      { has: devMode || hasTimeIsRelativ, icon: '⏳', title: 'Time is relativ', titleL: '??? (Einstein)', desc: 'Zwei Sticker innerhalb 24h in versch. Zeitzonen (>15° Längengrad-Diff).', descL: 'Beweise, dass Zeit relativ ist. Manche reisen schneller als die Sonne...', date: null },
                      { has: devMode || hasEU, img: '/badges/badge_eu.png', bg: 'bg-blue-800', title: 'EU Explorer', titleL: '??? (Europa)', desc: 'Mindestens 5 Länder besucht und eins davon in der EU.', descL: 'Bereise unseren Kontinent...', date: null },
                      { has: devMode || hasUnterTage, img: '/badges/badge_unter_tage.jpg', title: 'Unter Tage ⛏️', titleL: '??? (Unter Tage)', desc: 'Tief in einer Höhle oder im Bergwerk.', descL: 'Beweisfoto aus der absoluten Dunkelheit...', date: null },
                      { has: devMode || hasAtlantis, img: '/badges/badge_atlantis.jpg', title: 'Atlantis 🌊', titleL: '??? (Atlantis)', desc: 'Ein Sticker komplett unter Wasser.', descL: 'Beweisfoto tief unter der Wasseroberfläche...', date: null },
                      { has: devMode || hasAurora, img: '/badges/badge_aurora.jpg', title: 'Aurora Borealis 🌌', titleL: '??? (Aurora Borealis)', desc: 'Geklebt unter echten Polarlichtern.', descL: 'Beweisfoto mit dem Tanz der Nordlichter...', date: null },
                      { has: devMode || hasLostPlace, icon: '🏚️', title: 'Lost Place 🏚️', titleL: '??? (Lost Place)', desc: 'Geklebt an einem verlassenen Ort.', descL: 'Beweisfoto von einem vergessenen Ort...', date: null },
                      { has: devMode || hasSonnenfinsternis, icon: '🌑', title: 'Sonnenfinsternis 🌑', titleL: '??? (Sonnenfinsternis)', desc: 'Geklebt während einer Sonnenfinsternis.', descL: 'Beweisfoto während die Sonne verschwindet...', date: null },
                      { has: devMode || hasCoop, icon: '🤝', bg: 'bg-emerald-800', title: 'Coop', titleL: '??? (Coop)', desc: 'Zusammen mit einem anderen Nutzer geklebt.', descL: 'Beweisfoto: Geteilte Freude ist doppelte Freude...', date: null },
                      { has: devMode || hasOG, icon: '📜', bg: 'bg-stone-800', title: 'OG Geophysalis', titleL: '??? (OG)', desc: 'Einen originalen, alten Sticker geklebt.', descL: 'Beweisfoto: Ein Relikt aus vergangenen Zeiten...', date: null },
                      { has: devMode || hasDGG2027, icon: '⚒️', bg: 'bg-red-800', title: 'DGG 2027', titleL: '??? (DGG 2027)', desc: 'Während der DGG 2027 in Aachen geklebt.', descL: 'Sei 2027 am richtigen Ort...', date: null },
                      { has: devMode || hasGAP2027, icon: '⚒️', bg: 'bg-purple-800', title: 'GAP 2027', titleL: '??? (GAP 2027)', desc: 'Während des GAP 2027 in Freiberg geklebt.', descL: 'Sei 2027 am richtigen Ort...', date: null },
                    ]},
                    { label: 'Höhen & Tiefen', color: 'ring-blue-300', items: [
                      { has: devMode || hasMariana, icon: '🐙', title: 'Marianengraben', titleL: '??? (Tiefsee)', desc: 'Am tiefsten Punkt der Erde.', descL: 'Reise zum tiefsten Punkt der Ozeane...', date: null },
                      { has: devMode || hasSteinbock, img: '/badges/badge_steinbock.jpg', title: 'Steinbock 🧗', titleL: '??? (Steinbock)', desc: 'Sticker auf über 3000m Höhe.', descL: 'Erklimme Höhen über 3000m...', date: null },
                      { has: devMode || hasBerggams, icon: '🐐', title: 'Berggams 🐐', titleL: '??? (Berggams)', desc: 'Sticker auf über 2000m Höhe.', descL: 'Erklimme Höhen über 2000m...', date: null },
                      { has: devMode || hasAlpinist, img: '/badges/badge_gipfeli.jpg', title: 'Alpinist 🏔️', titleL: '??? (Alpinist)', desc: 'Sticker auf über 1000m Höhe.', descL: 'Erklimme Höhen über 1000m...', date: null },
                      { has: devMode || hasLuft, icon: '🎈', title: 'Luft Luft Luft 🎈', titleL: '??? (Himmel)', desc: 'Sticker auf über 7000m Höhe.', descL: 'Greife nach den Sternen (>7000m)...', date: null },
                    ]}
                  ].map(section => {
                    const isOpen = openAccordion === section.label;
                    const unlockedCount = section.items.filter(b => b.has).length;
                    return (
                    <div key={section.label} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                      <button 
                        onClick={() => setOpenAccordion(isOpen ? null : section.label)}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition"
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black text-gray-700 uppercase tracking-wider">{section.label}</p>
                          <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold">{unlockedCount}/{section.items.length}</span>
                        </div>
                        <span className="text-gray-400">{isOpen ? '▲' : '▼'}</span>
                      </button>
                      {isOpen && (
                        <div className="p-3 flex flex-col gap-2">
                          {section.items.map((b, i) => (
                            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl transition ${b.has ? 'bg-white border border-gray-100 shadow-sm' : 'opacity-40 grayscale bg-gray-50'}`}>
                              <div className={`w-12 h-12 rounded-xl overflow-hidden shrink-0 flex items-center justify-center text-2xl ${b.has ? section.color + ' ring-2 shadow' : 'border-2 border-gray-300'} ${b.bg || ''}`}>
                                {b.img ? <img src={b.img} className="w-full h-full object-cover" /> : b.icon}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-black text-gray-800 leading-tight truncate">{b.has ? b.title : b.titleL}</p>
                                <p className="text-xs text-gray-500 line-clamp-2">{b.has ? b.desc : b.descL}</p>
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
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      
      

      {/* Onboarding Modal */}
      {showOnboarding && <OnboardingModal onClose={() => { localStorage.setItem('geophysalis_onboarded', 'true'); setShowOnboarding(false); }} />}

      {/* Animated Achievement Popup */}
      <AchievementPopup
        unlockedAchievements={unlockedAchievements}
        onDismiss={() => setUnlockedAchievements(prev => prev.slice(1))}
      />

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
      <div className="absolute bottom-1 sm:bottom-2 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-2 sm:px-6 py-0.5 sm:py-2 rounded-full shadow-lg border border-gray-200 z-[1000] flex items-center gap-1.5 sm:gap-4 text-[6px] sm:text-xs text-gray-400 sm:text-gray-500 whitespace-nowrap">
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