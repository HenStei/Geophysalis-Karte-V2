const fs = require('fs');
let content = fs.readFileSync('src/MapView.jsx', 'utf8');

// Replace the emoji with the world traveler image
content = content.replace(
  '<div className="w-full h-full bg-emerald-100 flex items-center justify-center text-3xl">✈️</div>',
  '<img src="/badges/world_traveler.jpg" alt="Weltenbummler" className="w-full h-full object-cover" />'
);

// Replace Dark Mode TileLayer
const oldDark = `{mapStyle === 'dark' && (
          <TileLayer 
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            className="map-dark"
          />
        )}`;
const newDark = `{mapStyle === 'dark' && (
          <TileLayer 
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
            attribution='&copy; CARTO'
          />
        )}`;
if (content.includes(oldDark)) {
  content = content.replace(oldDark, newDark);
} else {
  // Try regex if whitespace differs
  content = content.replace(
    /\{mapStyle === 'dark' && \([\s\S]*?className="map-dark"[\s\S]*?\/\)\}/,
    newDark
  );
}

// Replace Vintage Mode TileLayer
const oldVintage = `{mapStyle === 'vintage' && (
          <TileLayer 
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            className="map-vintage"
          />
        )}`;
const newVintage = `{mapStyle === 'vintage' && (
          <TileLayer 
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" 
            attribution='&copy; OpenTopoMap'
          />
        )}`;
if (content.includes(oldVintage)) {
  content = content.replace(oldVintage, newVintage);
} else {
  content = content.replace(
    /\{mapStyle === 'vintage' && \([\s\S]*?className="map-vintage"[\s\S]*?\/\)\}/,
    newVintage
  );
}

fs.writeFileSync('src/MapView.jsx', content);
