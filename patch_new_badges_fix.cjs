const fs = require('fs');

// Patch AdminView.jsx
let adminCode = fs.readFileSync('src/AdminView.jsx', 'utf8');
const adminRegex = /\{ id: 'og', label: 'OG \(Alte Geophysalis\)' \}[\s\S]*?\];/;
const adminNew = `{ id: 'og', label: 'OG (Alte Geophysalis)' },
      { id: 'wuestenfuchs', label: 'Wüstenfuchs (Wüste)' },
      { id: 'dreilaendereck', label: 'Drei-Länder-Eck' }
    ];`;
adminCode = adminCode.replace(adminRegex, adminNew);
fs.writeFileSync('src/AdminView.jsx', adminCode);

// Patch MapView.jsx for variables
let mapCode = fs.readFileSync('src/MapView.jsx', 'utf8');
const mapVarRegex = /const hasOG = globalAchievements\.some\(a => a\.achievement_id === 'og'\);/;
const mapVarNew = `const hasOG = globalAchievements.some(a => a.achievement_id === 'og');
  const hasWuestenfuchs = globalAchievements.some(a => a.achievement_id === 'wuestenfuchs');
  const hasDreilaendereck = globalAchievements.some(a => a.achievement_id === 'dreilaendereck');`;
mapCode = mapCode.replace(mapVarRegex, mapVarNew);
fs.writeFileSync('src/MapView.jsx', mapCode);
