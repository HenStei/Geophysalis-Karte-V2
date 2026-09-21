const fs = require('fs'); 
let content = fs.readFileSync('src/MapView.jsx', 'utf8'); 

const replacements = [ 
  { key: 'canUseDark', text: 'Nachts (22-4 Uhr) geklebt. Schaltet Dark Mode frei.', dateKey: 'nightOwl' }, 
  { key: 'canUseVintage', text: '5 Sticker geklebt. Schaltet Explorer-Karte frei.', dateKey: 'localHero' }, 
  { key: 'canUseSunrise', text: 'Morgens (5-8 Uhr) geklebt. Schaltet Sunrise-Karte frei.', dateKey: 'earlyBird' }, 
  { key: 'canUseSpooky', text: 'Halloween Event. Schaltet Spooky-Karte frei.', dateKey: 'halloween' }, 
  { key: 'canUseSnow', text: 'Weihnachts Event. Schaltet Snow-Karte frei.', dateKey: 'winter' }, 
  { key: 'canUseAurora', text: 'Extrem weit im Norden oder Süden geklebt. Schaltet Aurora-Karte frei.', dateKey: 'polar' }, 
  { key: 'canUseCyberpunk', text: 'In einer Weltmetropole geklebt. Schaltet Cyberpunk-Karte frei.', dateKey: 'urban' }, 
  { key: '(devMode || hasWorldTraveler)', text: 'In mind. 3 Ländern geklebt. (WIP)', dateKey: 'worldTraveler' }, 
  { key: 'hasMarathon', text: 'An 3 aufeinanderfolgenden Tagen geklebt. Du brennst!', dateKey: 'marathon' }, 
  { key: 'hasPioneer', text: 'Du warst einer der Ersten! Danke für deine Unterstützung.', dateKey: 'pioneer' }, 
  { key: 'hasRetroGamer', text: '10 Sticker geklebt! Willkommen in den 80ern. Schaltet 8-Bit Karte frei.', dateKey: 'retroGamer' } 
]; 

replacements.forEach(r => { 
  const find = r.key + ` ? '` + r.text + `'`; 
  const replace = r.key + ` ? <>` + r.text + `<br/>{getUnlockDate('` + r.dateKey + `') && <span className=\"text-[9px] text-gray-400 mt-0.5 block\">Freigeschaltet am {getUnlockDate('` + r.dateKey + `')}</span>}</>`; 
  content = content.replace(find, replace); 
}); 

fs.writeFileSync('src/MapView.jsx', content);
