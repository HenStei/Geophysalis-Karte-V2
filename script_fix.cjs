const fs = require('fs');
let lines = fs.readFileSync('src/MapView.jsx', 'utf8').split('\n');
let out = [];
let skip = false;
for(let i=0; i<lines.length; i++) {
  if (lines[i].includes("mapStyle === 'dark'") || lines[i].includes("mapStyle === 'vintage'")) {
    skip = true;
    if (lines[i].includes('dark')) {
      out.push("        {mapStyle === 'dark' && (<TileLayer url=\"https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png\" attribution='&copy; CARTO' />)}");
    } else {
      out.push("        {mapStyle === 'vintage' && (<TileLayer url=\"https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png\" attribution='&copy; OpenTopoMap' />)}");
    }
  } else if (skip && lines[i].includes(')}')) {
    skip = false;
  } else if (!skip) {
    out.push(lines[i]);
  }
}
fs.writeFileSync('src/MapView.jsx', out.join('\n'));
