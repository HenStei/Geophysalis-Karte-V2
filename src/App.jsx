import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import MapView from './MapView';
import AdminView from './AdminView';
import About from './About';
import LaunchCountdown from './LaunchCountdown';
import InstallPrompt from './components/InstallPrompt';

function App() {
  // --- Pre-Release Under Construction Logic ---
  // Officially 01.10.2026 12:00 Berlin time
  const RELEASE_DATE = new Date('2026-10-01T10:00:00Z');

  // Secret bypass check: e.g. geophysalis.com/?dev=admin
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('dev') === 'admin') {
      localStorage.setItem('geophysalis_dev_bypass', 'true');
      window.history.replaceState({}, document.title, window.location.pathname);
      setIsLaunched(true);
    }
    // TEST MODE: if ?test=launch is used, clear the launch storage so they can see the animation again
    if (params.get('test') === 'launch') {
      localStorage.removeItem('launchTestDone');
      window.location.href = '/'; // reload cleanly
    }
  }, []);

  const hasBypass = localStorage.getItem('geophysalis_dev_bypass') === 'true';

  const [isLaunched, setIsLaunched] = useState(
    hasBypass || localStorage.getItem('launchTestDone') === 'true'
  );

  const handleLaunchComplete = () => {
    localStorage.setItem('launchTestDone', 'true');
    setIsLaunched(true);
  };

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeRemainingMs = RELEASE_DATE.getTime() - now.getTime();
  const timeRemainingSeconds = Math.max(0, Math.floor(timeRemainingMs / 1000));

  if (!isLaunched) {
    // Phase 1: More than 30 minutes left (1800 seconds) -> Show Loop BG
    if (timeRemainingSeconds > 1800 && !hasBypass) {
      const hours = Math.floor(timeRemainingSeconds / 3600);
      const minutes = Math.floor((timeRemainingSeconds % 3600) / 60);
      const seconds = timeRemainingSeconds % 60;
      
      return (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center font-mono z-[100000]">
          {/* Looping Veo Video Background */}
          <video src="/loop_bg.mp4" autoPlay loop playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-60" />
          
          <div className="relative z-10 flex flex-col items-center">
             <img src="/old-physalis.png" className="w-32 h-32 mb-8 animate-bounce mix-blend-screen" style={{ animationDuration: '3s' }} alt="Logo" />
             <h1 className="text-4xl text-yellow-400 font-black tracking-widest uppercase drop-shadow-[0_0_15px_rgba(250,204,21,0.8)] text-center px-4">
               Geophysalis Karte V2
             </h1>
             <p className="text-xl text-gray-400 mt-4 tracking-[0.3em] uppercase mb-12 animate-pulse">
               Under Construction
             </p>
             
             {/* Live Timer */}
             <div className="flex gap-4 sm:gap-6 text-white text-5xl sm:text-7xl font-black drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">
               <div className="flex flex-col items-center w-24">
                 <span>{hours.toString().padStart(2, '0')}</span>
                 <span className="text-sm text-gray-400 mt-2 font-normal">Stunden</span>
               </div>
               <span className="opacity-50">:</span>
               <div className="flex flex-col items-center w-24">
                 <span>{minutes.toString().padStart(2, '0')}</span>
                 <span className="text-sm text-gray-400 mt-2 font-normal">Minuten</span>
               </div>
               <span className="opacity-50">:</span>
               <div className="flex flex-col items-center w-24">
                 <span>{seconds.toString().padStart(2, '0')}</span>
                 <span className="text-sm text-gray-400 mt-2 font-normal">Sekunden</span>
               </div>
             </div>
          </div>
          <InstallPrompt />
        </div>
      );
    }

    // Phase 2: Less than 30 minutes left -> Show Dramatic Bouncing Countdown
    return (
      <>
        <LaunchCountdown timeRemainingSeconds={timeRemainingSeconds} onComplete={handleLaunchComplete} />
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
