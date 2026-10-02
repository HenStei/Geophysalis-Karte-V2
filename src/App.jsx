import React from 'react';
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
