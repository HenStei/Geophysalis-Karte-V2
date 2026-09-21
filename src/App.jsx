import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import MapView from './MapView';
import AdminView from './AdminView';
import About from './About';
import LaunchCountdown from './LaunchCountdown';

function App() {
  // Test-Countdown logic: Check if we already did the launch test this session
  const [isLaunched, setIsLaunched] = useState(
    sessionStorage.getItem('launchTestDone') === 'true'
  );

  const handleLaunchComplete = () => {
    sessionStorage.setItem('launchTestDone', 'true');
    setIsLaunched(true);
  };

  if (!isLaunched) {
    return <LaunchCountdown onComplete={handleLaunchComplete} />;
  }

  return (
    <Routes>
      <Route path="/" element={<MapView />} />
      <Route path="/admin" element={<AdminView />} />
      <Route path="/about" element={<About />} />
    </Routes>
  );
}

export default App;
