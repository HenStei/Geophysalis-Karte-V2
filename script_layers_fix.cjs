const fs = require('fs');
let content = fs.readFileSync('src/MapView.jsx', 'utf8');

// Replace Vintage
content = content.replace(
  /\{mapStyle === 'vintage' && \([\s\S]*?<\/[^>]*>[\s\S]*?\)\}/,
  `{mapStyle === 'vintage' && (
          <TileLayer 
            url="https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}" 
            attribution='Tiles &copy; Esri &mdash; National Geographic'
            maxZoom={16}
          />
        )}`
);

// Replace 8bit
content = content.replace(
  /\{mapStyle === '8bit' && \([\s\S]*?<\/[^>]*>[\s\S]*?\)\}/,
  `{mapStyle === '8bit' && (
          <TileLayer 
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" 
            attribution='&copy; OpenTopoMap'
            className="map-8bit"
            maxNativeZoom={9}
            maxZoom={18}
          />
        )}`
);

fs.writeFileSync('src/MapView.jsx', content);
