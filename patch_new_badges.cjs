const fs = require('fs');

fs.copyFileSync(
  "C:\\Users\\Henry\\.gemini\\antigravity\\brain\\c4fd34c8-d912-4edb-a38e-04c29e4c06ed\\badge_wuestenfuchs_1791232771904.jpg",
  "public/badges/badge_wuestenfuchs.jpg"
);

fs.copyFileSync(
  "C:\\Users\\Henry\\.gemini\\antigravity\\brain\\c4fd34c8-d912-4edb-a38e-04c29e4c06ed\\badge_dreilaendereck_clean_1791232800724.jpg",
  "public/badges/badge_dreilaendereck.jpg"
);

// Patch AdminView.jsx
let adminCode = fs.readFileSync('src/AdminView.jsx', 'utf8');
const adminBadgesOld = `{ id: 'og', label: 'OG (Alte Geophysalis)' }
    ];`;
const adminBadgesNew = `{ id: 'og', label: 'OG (Alte Geophysalis)' },
      { id: 'wuestenfuchs', label: 'Wüstenfuchs (Wüste)' },
      { id: 'dreilaendereck', label: 'Drei-Länder-Eck' }
    ];`;
adminCode = adminCode.replace(adminBadgesOld, adminBadgesNew);
fs.writeFileSync('src/AdminView.jsx', adminCode);

// Patch script_globals.cjs / MapView.jsx
let mapCode = fs.readFileSync('src/MapView.jsx', 'utf8');

// Add hasWuestenfuchs, hasDreilaendereck 
const hasBadgesRegex = /const hasOG = globalAchievements\.some\(a => a\.achievement_id === 'og'\);/;
const hasBadgesNew = `const hasOG = globalAchievements.some(a => a.achievement_id === 'og');
  const hasWuestenfuchs = globalAchievements.some(a => a.achievement_id === 'wuestenfuchs');
  const hasDreilaendereck = globalAchievements.some(a => a.achievement_id === 'dreilaendereck');`;
mapCode = mapCode.replace(hasBadgesRegex, hasBadgesNew);

// Add to the visual list
const itemsRegex = /\{ has: devMode \|\| hasOG, img: '\/badges\/badge_og\.jpg', title: 'OG Geophysalis', titleL: '\?\?\? \(OG\)', desc: 'Einen originalen, alten Sticker geklebt\.', descL: 'Beweisfoto: Ein Relikt aus vergangenen Zeiten\.\.\.', date: null \},/;
const itemsNew = `{ has: devMode || hasOG, img: '/badges/badge_og.jpg', title: 'OG Geophysalis', titleL: '??? (OG)', desc: 'Einen originalen, alten Sticker geklebt.', descL: 'Beweisfoto: Ein Relikt aus vergangenen Zeiten...', date: null },
                        { has: devMode || hasWuestenfuchs, img: '/badges/badge_wuestenfuchs.jpg', title: 'Wüstenfuchs 🐪', titleL: '??? (Wüste)', desc: 'Beweisfoto mitten in einer großen Wüste.', descL: 'Beweisfoto von Sand und unendlicher Hitze...', date: null },
                        { has: devMode || hasDreilaendereck, img: '/badges/badge_dreilaendereck.jpg', title: 'Drei-Länder-Eck 📍', titleL: '??? (Grenzen)', desc: 'Genau dort geklebt, wo 3 Länder aufeinandertreffen.', descL: 'Beweisfoto exakt an der Grenze von drei Nationen...', date: null },`;
mapCode = mapCode.replace(itemsRegex, itemsNew);

fs.writeFileSync('src/MapView.jsx', mapCode);
