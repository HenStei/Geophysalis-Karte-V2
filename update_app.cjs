const fs = require('fs');

// --- 1. PATCH App.jsx ---
const appFile = 'src/App.jsx';
let appContent = `import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MapView from './MapView';
import AdminView from './AdminView';
import About from './About';
import InstallPrompt from './components/InstallPrompt';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<MapView />} />
        <Route path="/admin" element={<AdminView />} />
        <Route path="/about" element={<About />} />
      </Routes>
      <InstallPrompt />
    </>
  );
}

export default App;
`;
fs.writeFileSync(appFile, appContent);

// --- 2. PATCH MapView.jsx ---
const mapFile = 'src/MapView.jsx';
let mapContent = fs.readFileSync(mapFile, 'utf8');

// A. Move Onboarding to ONLY show if session && is_approved
mapContent = mapContent.replace(
  "{showOnboarding && <OnboardingModal onClose={() => { localStorage.setItem('geophysalis_onboarded', 'true'); setShowOnboarding(false); }} />}",
  "{showOnboarding && session && profile?.is_approved && !showEarthZoom && <OnboardingModal onClose={() => { localStorage.setItem('geophysalis_onboarded', 'true'); setShowOnboarding(false); }} />}"
);

// B. Add EarthZoom logic state
if (!mapContent.includes('const [showEarthZoom, setShowEarthZoom] = useState')) {
  mapContent = mapContent.replace(
    "const [showOnboarding, setShowOnboarding] = useState(!localStorage.getItem('geophysalis_onboarded'));",
    `const [showOnboarding, setShowOnboarding] = useState(!localStorage.getItem('geophysalis_onboarded'));\n  const [showEarthZoom, setShowEarthZoom] = useState(!localStorage.getItem('geophysalis_earth_zoom_done'));`
  );
}

// C. Render EarthZoom video
if (!mapContent.includes('id="earth-zoom-video"')) {
  mapContent = mapContent.replace(
    "{/* Animated Achievement Popup */}",
    `{/* Earth Zoom Intro */}\n      {session && profile?.is_approved && showEarthZoom && (
        <div className="fixed inset-0 z-[6000] bg-black">
          <video id="earth-zoom-video" autoPlay playsInline muted className="w-full h-full object-cover" onEnded={() => {
            localStorage.setItem('geophysalis_earth_zoom_done', 'true');
            setShowEarthZoom(false);
          }}>
            <source src="/temp1.mp4" type="video/mp4" />
          </video>
          <button onClick={() => { localStorage.setItem('geophysalis_earth_zoom_done', 'true'); setShowEarthZoom(false); }} className="absolute bottom-10 right-10 text-white/50 text-sm hover:text-white font-mono">Überspringen >></button>
        </div>
      )}\n\n      {/* Animated Achievement Popup */}`
  );
}

// D. Restyle Auth Gate
mapContent = mapContent.replace(
  '<div className="bg-white/90 backdrop-blur-xl rounded-3xl w-full max-w-sm p-8 shadow-2xl relative z-10 border border-white/20">',
  '<div className="bg-black/60 backdrop-blur-xl rounded-3xl w-full max-w-sm p-8 shadow-2xl relative z-10 border border-white/10">'
);
mapContent = mapContent.replace(
  '<h2 className="text-2xl font-black text-gray-900 mb-2">Login</h2>',
  '<h2 className="text-2xl font-black text-white mb-2 drop-shadow-md">Login</h2>'
);
mapContent = mapContent.replace(
  '<p className="text-sm text-gray-600 mb-4">',
  '<p className="text-sm text-gray-300 mb-4 drop-shadow-sm">'
);
mapContent = mapContent.replace(
  '<div className="text-left bg-gray-50 p-3 rounded-xl border border-gray-200">',
  '<div className="text-left bg-black/50 p-3 rounded-xl border border-white/10">'
);
mapContent = mapContent.replace(
  '<span className="text-[10px] text-gray-600 leading-tight">',
  '<span className="text-[10px] text-gray-300 leading-tight">'
);
mapContent = mapContent.replace(
  'className={`w-full flex items-center justify-center gap-3 bg-white border-2 font-bold py-3 rounded-full transition mb-3 ${agreedToTerms ? \'border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-gray-300\' : \'border-gray-100 text-gray-400 cursor-not-allowed opacity-50\'}`}',
  'className={`w-full flex items-center justify-center gap-3 bg-white/10 backdrop-blur border font-bold py-3 rounded-full transition mb-3 ${agreedToTerms ? \'border-white/30 text-white hover:bg-white/20\' : \'border-white/10 text-gray-400 cursor-not-allowed opacity-50\'}`}'
);

// E. Restyle Invite Modal
mapContent = mapContent.replace(
  '<div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden z-10">',
  '<div className="bg-black/70 backdrop-blur-2xl rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden z-10 border border-white/10">'
);
mapContent = mapContent.replace(
  '<div className="w-16 h-16 bg-gradient-to-tr from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">',
  '<div className="w-16 h-16 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner border border-white/10">'
);
mapContent = mapContent.replace(
  '<h2 className="text-2xl font-black text-gray-900 mb-2">Geschlossene Beta</h2>',
  '<h2 className="text-2xl font-black text-white mb-2 drop-shadow">Geschlossene Beta</h2>'
);
mapContent = mapContent.replace(
  'className="w-full bg-gray-50 border-2 border-gray-200 text-center text-lg font-mono font-bold rounded-2xl p-4 focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition"',
  'className="w-full bg-black/50 border border-white/20 text-white placeholder-gray-500 text-center text-lg font-mono font-bold rounded-2xl p-4 focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none transition"'
);
mapContent = mapContent.replace(
  'className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl hover:bg-gray-800 transition shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"',
  'className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black py-4 rounded-2xl hover:opacity-90 transition shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 border border-white/20"'
);


fs.writeFileSync(mapFile, mapContent);
console.log("APP REFACTORED SUCCESSFULLY");
