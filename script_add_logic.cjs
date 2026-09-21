const fs = require('fs');
let content = fs.readFileSync('src/MapView.jsx', 'utf8');

// Inject the peak helper function and boolean logic
const searchTarget = `const hasNightOwl = myPins.some(p => {`;
const insertLogic = `
  const isNearPeak = (lat, lng) => {
    const peaks = [
      { name: 'Zugspitze', lat: 47.421, lng: 10.985 },
      { name: 'Feldberg', lat: 47.873, lng: 8.004 },
      { name: 'Brocken', lat: 51.799, lng: 10.615 },
      { name: 'Dufourspitze', lat: 45.936, lng: 7.866 },
      { name: 'Matterhorn', lat: 45.976, lng: 7.658 },
      { name: 'Großglockner', lat: 47.074, lng: 12.693 }
    ];
    const R = 6371; 
    for (let peak of peaks) {
      const dLat = (lat - peak.lat) * Math.PI / 180;
      const dLng = (lng - peak.lng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(peak.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      if (R * c < 3.0) return true; // Within 3km
    }
    return false;
  };

  const hasYinYang = myPins.some(p => p.lat > 0) && myPins.some(p => p.lat < 0);
  const hasGipfeli = myPins.some(p => isNearPeak(p.lat, p.lng));
  const hasVivaldi = (() => {
    let seasons = new Set();
    myPins.forEach(p => {
      const m = new Date(p.created_at).getMonth();
      if (m >= 2 && m <= 4) seasons.add('spring');
      else if (m >= 5 && m <= 7) seasons.add('summer');
      else if (m >= 8 && m <= 10) seasons.add('autumn');
      else seasons.add('winter');
    });
    return seasons.size === 4;
  })();

  const hasTier5 = myPins.length >= 5;
  const hasTier10 = myPins.length >= 10;
  const hasTier50 = myPins.length >= 50;
  const hasTier100 = myPins.length >= 100;
  const has6Kontinente = false; // TODO when quota resets

`;
content = content.replace(searchTarget, insertLogic + searchTarget);

// Also need to inject these into `getUnlockDate`
const searchDate = `if (badgeName === 'pioneer') matching = sorted;`;
const insertDate = `
    if (badgeName === 'yinyang') {
      const north = sorted.find(p => p.lat > 0);
      const south = sorted.find(p => p.lat < 0);
      if (north && south) matching = [new Date(north.created_at) > new Date(south.created_at) ? north : south];
    }
    if (badgeName === 'gipfeli') matching = sorted.filter(p => isNearPeak(p.lat, p.lng));
    if (badgeName === 'vivaldi') {
      let seasons = new Set();
      let lastPin = null;
      for (let p of sorted) {
        const m = new Date(p.created_at).getMonth();
        if (m >= 2 && m <= 4) seasons.add('spring');
        else if (m >= 5 && m <= 7) seasons.add('summer');
        else if (m >= 8 && m <= 10) seasons.add('autumn');
        else seasons.add('winter');
        if (seasons.size === 4) { lastPin = p; break; }
      }
      if (lastPin) matching = [lastPin];
    }
    if (badgeName === 'tier5') matching = sorted.length >= 5 ? [sorted[4]] : [];
    if (badgeName === 'tier10') matching = sorted.length >= 10 ? [sorted[9]] : [];
    if (badgeName === 'tier50') matching = sorted.length >= 50 ? [sorted[49]] : [];
    if (badgeName === 'tier100') matching = sorted.length >= 100 ? [sorted[99]] : [];
`;
content = content.replace(searchDate, insertDate + searchDate);

// UI Blocks to insert
const uiBlocks = `
                <div className={\`flex items-center gap-4 p-3 rounded-2xl transition shadow-sm \${(devMode || hasYinYang) ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}\`}>
                  <div className={\`w-14 h-14 rounded-xl overflow-hidden shrink-0 \${(devMode || hasYinYang) ? 'ring-2 ring-gray-800 shadow-md' : 'border-2 border-gray-300'}\`}>
                    <img src="/badges/badge_yinyang.jpg" alt="Yin & Yang" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {(devMode || hasYinYang) ? 'Yin & Yang ✅' : '??? (Balance)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {(devMode || hasYinYang) ? <>Perfekte geografische Balance: Nord- und Südhalbkugel vereint.<br/>{getUnlockDate('yinyang') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('yinyang')}</span>}</> : 'Finde das Gleichgewicht zwischen Norden und Süden...'}
                    </p>
                  </div>
                </div>

                <div className={\`flex items-center gap-4 p-3 rounded-2xl transition shadow-sm \${(devMode || hasGipfeli) ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}\`}>
                  <div className={\`w-14 h-14 rounded-xl overflow-hidden shrink-0 \${(devMode || hasGipfeli) ? 'ring-2 ring-orange-400 shadow-md' : 'border-2 border-gray-300'}\`}>
                    <img src="/badges/badge_gipfeli.jpg" alt="Gipfeli" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {(devMode || hasGipfeli) ? 'Gipfeli ✅' : '??? (Alpinist)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {(devMode || hasGipfeli) ? <>Am Gipfel geklebt! Zeit für ein Croissant.<br/>{getUnlockDate('gipfeli') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('gipfeli')}</span>}</> : 'Erklimme einen der höchsten Gipfel...'}
                    </p>
                  </div>
                </div>

                <div className={\`flex items-center gap-4 p-3 rounded-2xl transition shadow-sm \${(devMode || hasVivaldi) ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}\`}>
                  <div className={\`w-14 h-14 rounded-xl overflow-hidden shrink-0 \${(devMode || hasVivaldi) ? 'ring-2 ring-pink-400 shadow-md' : 'border-2 border-gray-300'}\`}>
                    <img src="/badges/badge_vivaldi.jpg" alt="4 Jahreszeiten" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {(devMode || hasVivaldi) ? 'Die 4 Jahreszeiten ✅' : '??? (Vivaldi)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {(devMode || hasVivaldi) ? <>In Frühling, Sommer, Herbst und Winter geklebt.<br/>{getUnlockDate('vivaldi') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('vivaldi')}</span>}</> : 'Erlebe den Kreislauf der Natur...'}
                    </p>
                  </div>
                </div>

                <div className={\`flex items-center gap-4 p-3 rounded-2xl transition shadow-sm \${(devMode || hasTier5) ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}\`}>
                  <div className={\`w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-yellow-700 flex items-center justify-center text-3xl \${(devMode || hasTier5) ? 'ring-2 ring-yellow-800 shadow-md' : 'border-2 border-gray-300'}\`}>
                    🥉
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {(devMode || hasTier5) ? 'Bronze Sammler (5 Pins) ✅' : '??? (Sammler)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {(devMode || hasTier5) ? <>Aller Anfang ist gemacht.<br/>{getUnlockDate('tier5') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('tier5')}</span>}</> : 'Klebe 5 Sticker, um Bronze zu erhalten.'}
                    </p>
                  </div>
                </div>

                <div className={\`flex items-center gap-4 p-3 rounded-2xl transition shadow-sm \${(devMode || hasTier10) ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}\`}>
                  <div className={\`w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-gray-300 flex items-center justify-center text-3xl \${(devMode || hasTier10) ? 'ring-2 ring-gray-400 shadow-md' : 'border-2 border-gray-300'}\`}>
                    🥈
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {(devMode || hasTier10) ? 'Silber Sammler (10 Pins) ✅' : '??? (Sammler)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {(devMode || hasTier10) ? <>Eine stolze Sammlung.<br/>{getUnlockDate('tier10') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('tier10')}</span>}</> : 'Klebe 10 Sticker, um Silber zu erhalten.'}
                    </p>
                  </div>
                </div>

                <div className={\`flex items-center gap-4 p-3 rounded-2xl transition shadow-sm \${(devMode || hasTier50) ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}\`}>
                  <div className={\`w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-yellow-400 flex items-center justify-center text-3xl \${(devMode || hasTier50) ? 'ring-2 ring-yellow-500 shadow-md' : 'border-2 border-gray-300'}\`}>
                    🥇
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {(devMode || hasTier50) ? 'Gold Sammler (50 Pins) ✅' : '??? (Sammler)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {(devMode || hasTier50) ? <>Eine beachtliche Leistung!<br/>{getUnlockDate('tier50') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('tier50')}</span>}</> : 'Klebe 50 Sticker, um Gold zu erhalten.'}
                    </p>
                  </div>
                </div>
`;

const insertTargetUI = `<div className={\`flex items-center gap-4 p-3 rounded-2xl transition shadow-sm \${devMode || hasWorldTraveler ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}\`}>`;
content = content.replace(insertTargetUI, uiBlocks + insertTargetUI);

fs.writeFileSync('src/MapView.jsx', content);
