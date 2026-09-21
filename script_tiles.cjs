const fs = require('fs');
let content = fs.readFileSync('src/MapView.jsx', 'utf8');

const darkTarget = `{mapStyle === 'dark' && (
          <TileLayer 
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            className="map-dark"
          />
        )}`;
const darkReplacement = `{mapStyle === 'dark' && (
          <TileLayer 
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />
        )}`;
content = content.replace(darkTarget, darkReplacement);


const vintageTarget = `{mapStyle === 'vintage' && (
          <TileLayer 
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            className="map-vintage"
          />
        )}`;
const vintageReplacement = `{mapStyle === 'vintage' && (
          <TileLayer 
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" 
            attribution='&copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
            className="map-vintage"
          />
        )}`;
content = content.replace(vintageTarget, vintageReplacement);

fs.writeFileSync('src/MapView.jsx', content);
