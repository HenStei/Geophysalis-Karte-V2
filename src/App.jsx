import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MapView from './MapView';
import AdminView from './AdminView';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MapView />} />
      <Route path="/admin" element={<AdminView />} />
    </Routes>
  );
}

export default App;
