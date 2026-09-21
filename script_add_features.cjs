const fs = require('fs');
let c = fs.readFileSync('src/MapView.jsx', 'utf8');

// 1. Add confetti import if not present
if (!c.includes("import confetti from 'canvas-confetti'")) {
  c = c.replace(
    "import React, { useState, useEffect, useMemo, useRef } from 'react';",
    "import React, { useState, useEffect, useMemo, useRef } from 'react';\nimport confetti from 'canvas-confetti';"
  );
}

// 2. Add showOnboarding state and localStorage check
if (!c.includes('const [showOnboarding, setShowOnboarding] = useState(false)')) {
  c = c.replace(
    "const [profileTab, setProfileTab] = useState('profil');",
    "const [profileTab, setProfileTab] = useState('profil');\n  const [showOnboarding, setShowOnboarding] = useState(false);\n  \n  useEffect(() => {\n    if (!localStorage.getItem('geophysalis_onboarded')) {\n      setShowOnboarding(true);\n    }\n  }, []);"
  );
}

// 3. Add Globetrotter (6 Continents) & Grenzgänger Logic
const newAchievementsLogic = `
  // -- NEUE ACHIEVEMENTS --
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
`;

if (!c.includes('hasGlobetrotter = continentsVisited')) {
  c = c.replace(
    "const hasWorldTraveler = uniqueCountries.size >= 3;",
    "const hasWorldTraveler = uniqueCountries.size >= 3;" + newAchievementsLogic
  );
}

// 4. Update Profile Modal UI with "Profil Teilen" and new Achievements
const oldAbenteuer = `
                      { has: devMode || hasTier5, icon: '🥉', bg: 'bg-yellow-700', title: 'Bronze Sammler (5 Pins) ✅', titleL: '??? (Sammler)', desc: 'Aller Anfang ist gemacht.', descL: 'Klebe 5 Sticker.', date: getUnlockDate('tier5') },`;
const newAbenteuer = `
                      { has: devMode || hasBorderCrosser, icon: '🛂', bg: 'bg-orange-800', title: 'Grenzgänger ✅', titleL: '??? (Grenzenlos)', desc: 'Zwei Sticker <10km voneinander, aber in versch. Ländern.', descL: 'Überwinde die Grenzen dieser Welt...', date: null },
                      { has: devMode || hasGlobetrotter, icon: '🌍', bg: 'bg-indigo-600', title: 'Globetrotter ✅', titleL: '??? (Weltenbummler)', desc: 'Sticker auf allen 6 Kontinenten.', descL: 'Bereise die gesamte Welt...', date: null },
                      { has: devMode || hasTier100, icon: '💎', bg: 'bg-cyan-300', title: 'Platin Sammler (100 Pins) ✅', titleL: '??? (Sammler)', desc: 'Du bist eine Legende!', descL: 'Klebe 100 Sticker.', date: null },
                      { has: devMode || hasTier5, icon: '🥉', bg: 'bg-yellow-700', title: 'Bronze Sammler (5 Pins) ✅', titleL: '??? (Sammler)', desc: 'Aller Anfang ist gemacht.', descL: 'Klebe 5 Sticker.', date: getUnlockDate('tier5') },`;
if (!c.includes('hasBorderCrosser')) {
  c = c.replace(oldAbenteuer, newAbenteuer);
}

const oldEinstellungen = `
              {/* TAB: EINSTELLUNGEN */}
              {profileTab === 'einstellungen' && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-gray-400 text-center break-all">{session.user.email}</p>`;
const newEinstellungen = `
              {/* TAB: EINSTELLUNGEN */}
              {profileTab === 'einstellungen' && (
                <div className="flex flex-col gap-3">
                  <button onClick={() => {
                    const text = \`Ich habe \${myPins.length} Sticker in \${uniqueCountries.size} Ländern auf Geophysalis geklebt! 🌍📍 Versuch es auch und schalte Erfolge frei!\`;
                    if (navigator.share) {
                      navigator.share({ title: 'Geophysalis', text: text, url: window.location.href }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(text + " " + window.location.href);
                      alert('In die Zwischenablage kopiert!');
                    }
                  }} className="w-full bg-blue-50 text-blue-600 border-2 border-blue-100 font-bold py-3 rounded-2xl hover:bg-blue-100 transition flex items-center justify-center gap-2">
                    <Share size={18} /> Profil Teilen
                  </button>
                  <p className="text-xs text-gray-400 text-center break-all">{session.user.email}</p>`;
if (!c.includes('Profil Teilen')) {
  c = c.replace(oldEinstellungen, newEinstellungen);
}

// Ensure Share is imported
if (!c.includes('Share,')) {
  c = c.replace('import { Map, Loader2, ImagePlus, Check, Sparkles, Navigation, Search, Moon, Sun, User, LogOut, ChevronUp, ChevronDown, Lock, Unlock, X, Camera, MapPin, Search as SearchIcon, Compass, Globe, Info } from \'lucide-react\';',
                'import { Map, Loader2, ImagePlus, Check, Sparkles, Navigation, Search, Moon, Sun, User, LogOut, ChevronUp, ChevronDown, Lock, Unlock, X, Camera, MapPin, Search as SearchIcon, Compass, Globe, Info, Share } from \'lucide-react\';');
}

// 5. Confetti in Achievement Popup
const oldConfettiBlock = `
      {/* Animated Achievement Popup */}
      {unlockedAchievements.length > 0 && (`;
const newConfettiBlock = `
      {/* Animated Achievement Popup */}
      {(() => {
         // Fire confetti on render
         useEffect(() => {
           if (unlockedAchievements.length > 0) {
             confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#a855f7', '#3b82f6', '#eab308'], zIndex: 10000 });
           }
         }, [unlockedAchievements]);
         return null;
      })()}
      {unlockedAchievements.length > 0 && (`;
if (!c.includes('confetti({ particleCount: 150')) {
  c = c.replace(oldConfettiBlock, newConfettiBlock);
}

// 6. Onboarding Modal UI
const onboardingUI = `

      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-[fade-in_0.5s_ease-out]">
            <div className="text-6xl mb-4">🌍</div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Willkommen bei Geophysalis!</h2>
            <div className="space-y-4 my-6 text-left">
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 font-black text-blue-600">1</div>
                <p className="text-sm font-medium text-gray-600 mt-1">Klicke irgendwo auf die Karte, um einen Sticker zu setzen.</p>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 font-black text-blue-600">2</div>
                <p className="text-sm font-medium text-gray-600 mt-1">Lade optional ein Foto deines Abenteuers hoch.</p>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 font-black text-blue-600">3</div>
                <p className="text-sm font-medium text-gray-600 mt-1">Sammle epische Abzeichen für deine Reisen!</p>
              </div>
            </div>
            <button 
              onClick={() => { localStorage.setItem('geophysalis_onboarded', 'true'); setShowOnboarding(false); }}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition transform hover:scale-105"
            >
              Los geht's!
            </button>
          </div>
        </div>
      )}
`;
if (!c.includes('Willkommen bei Geophysalis')) {
  c = c.replace('{/* Animated Achievement Popup */}', onboardingUI + '\n      {/* Animated Achievement Popup */}');
}

fs.writeFileSync('src/MapView.jsx', c);
console.log("Modifications complete.");
