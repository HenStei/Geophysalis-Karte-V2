const fs = require('fs');
let content = fs.readFileSync('src/MapView.jsx', 'utf8');

const target = `<div className="w-full h-full bg-emerald-100 flex items-center justify-center text-3xl">✈️</div>`;
const replacement = `<img src="/badges/world_traveler.jpg" alt="Weltenbummler" className="w-full h-full object-cover" />`;

content = content.replace(target, replacement);

fs.writeFileSync('src/MapView.jsx', content);
