import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import MapView from './MapView';
import AdminView from './AdminView';
import About from './About';
import LaunchCountdown from './LaunchCountdown';
import InstallPrompt from './components/InstallPrompt';

function App() {
  // --- Pre-Release Under Construction Logic ---
  const RELEASE_DATE = new Date('2026-10-01T10:00:00Z'); // 12:00 Berlin time

  // Secret bypass check: e.g. geophysalis.com/?dev=admin
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('dev') === 'admin') {
      localStorage.setItem('geophysalis_dev_bypass', 'true');
      // Clean up the URL so the secret parameter isn't visible in the address bar anymore
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const [isLaunched, setIsLaunched] = useState(
    sessionStorage.getItem('launchTestDone') === 'true'
  );

  const handleLaunchComplete = () => {
    sessionStorage.setItem('launchTestDone', 'true');
    setIsLaunched(true);
  };

  // Check if we should block access
  const hasBypass = localStorage.getItem('geophysalis_dev_bypass') === 'true';
  const isPreRelease = new Date() < RELEASE_DATE && !hasBypass;

  if (isPreRelease) {
    return (
      <>
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 font-mono text-center relative overflow-hidden">
          {/* Ambient Background Glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[100vw] h-[100vw] sm:w-[40vw] sm:h-[40vw] bg-purple-600/20 rounded-full blur-[120px] animate-pulse"></div>
          </div>

          <div className="z-10 bg-black/60 backdrop-blur-xl p-8 sm:p-12 rounded-3xl border border-gray-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-md w-full">
            <div className="mb-8 relative">
              <div className="absolute inset-0 bg-yellow-400 blur-2xl opacity-20 animate-pulse rounded-full"></div>
              <img 
                src="/favicon.png" 
                alt="Physalis" 
                className="w-32 h-32 mx-auto drop-shadow-[0_0_15px_rgba(250,204,21,0.6)] animate-bounce" 
                style={{ animationDuration: '2s' }} 
              />
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-4 tracking-wider uppercase">
              Under<br/><span className="text-yellow-400">Construction</span>
            </h1>
            
            <p className="text-gray-400 mb-8 leading-relaxed text-sm sm:text-base">
              Die Geophysalis wächst noch! 🌱<br/>
              Wir bereiten gerade alles für den großen Launch vor.
            </p>
            
            <div className="inline-block bg-gray-900/80 px-6 py-4 rounded-2xl border border-gray-700 shadow-inner">
              <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mb-1">Offizieller Start</p>
              <p className="text-xl font-black text-white tracking-wide">01.10.2026 <span className="text-purple-400 opacity-80">— 12:00</span></p>
            </div>
          </div>
        </div>
        <InstallPrompt />
      </>
    );
  }

  if (!isLaunched) {
    return (
      <>
        <LaunchCountdown onComplete={handleLaunchComplete} />
        <InstallPrompt />
      </>
    );
  }

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
