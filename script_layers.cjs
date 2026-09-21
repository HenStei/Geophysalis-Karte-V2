const fs = require('fs');
let content = fs.readFileSync('src/MapView.jsx', 'utf8');

// Replace Vintage
const vintageOld = `{mapStyle === 'vintage' && (
          <TileLayer 
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" 
            attribution='&copy; OpenTopoMap'
          />
        )}`;
const vintageNew = `{mapStyle === 'vintage' && (
          <TileLayer 
            url="https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}" 
            attribution='Tiles &copy; Esri &mdash; National Geographic'
            maxZoom={16}
          />
        )}`;
content = content.replace(vintageOld, vintageNew);

// Replace 8bit
const eightBitOld = `{mapStyle === '8bit' && (
          <TileLayer 
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            className="map-8bit"
            maxNativeZoom={9}
            maxZoom={18}
          />
        )}`;
const eightBitNew = `{mapStyle === '8bit' && (
          <TileLayer 
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" 
            attribution='&copy; OpenTopoMap'
            className="map-8bit"
            maxNativeZoom={9}
            maxZoom={18}
          />
        )}`;
content = content.replace(eightBitOld, eightBitNew);


// Replace achievement names
content = content.replace('May the 4th be with you ✅', 'May the force be with you ✅');
content = content.replace('May the 4th be with you', 'May the force be with you'); // just in case
content = content.replace('Frohes Neues! ✅', 'Irgendwas mit Silvester? ✅');


fs.writeFileSync('src/MapView.jsx', content);
