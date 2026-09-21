const fs = require('fs');
let content = fs.readFileSync('src/MapView.jsx', 'utf8');

const target = `if (badgeName === 'winter') matching = sorted.filter(p => new Date(p.created_at).getMonth() === 11);`;
const replacement = `if (badgeName === 'winter') matching = sorted.filter(p => new Date(p.created_at).getMonth() === 11);
    if (badgeName === 'pi') matching = sorted.filter(p => (Math.abs(p.lat) >= 3.14 && Math.abs(p.lat) < 3.15) || (Math.abs(p.lng) >= 3.14 && Math.abs(p.lng) < 3.15));
    if (badgeName === 'may4') matching = sorted.filter(p => { const d = new Date(p.created_at); return d.getMonth() === 4 && d.getDate() === 4; });
    if (badgeName === 'love') matching = sorted.filter(p => { const d = new Date(p.created_at); return d.getMonth() === 1 && d.getDate() === 14; });
    if (badgeName === 'silvester') matching = sorted.filter(p => { const d = new Date(p.created_at); const m = d.getMonth(); const day = d.getDate(); return (m === 11 && day === 31) || (m === 0 && day === 1); });
    if (badgeName === 'nz') matching = sorted.filter(p => p.lat >= -47.5 && p.lat <= -34 && p.lng >= 165 && p.lng <= 179);
    if (badgeName === 'ushuaia') matching = sorted.filter(p => p.lat >= -56 && p.lat <= -53 && p.lng >= -69 && p.lng <= -66);`;

content = content.replace(target, replacement);

const target2 = `const hasWinter = myPins.some(p => new Date(p.created_at).getMonth() === 11); // Dez`;
const replacement2 = `const hasWinter = myPins.some(p => new Date(p.created_at).getMonth() === 11); // Dez
  
  const hasPi = myPins.some(p => (Math.abs(p.lat) >= 3.14 && Math.abs(p.lat) < 3.15) || (Math.abs(p.lng) >= 3.14 && Math.abs(p.lng) < 3.15));
  const hasMay4 = myPins.some(p => { const d = new Date(p.created_at); return d.getMonth() === 4 && d.getDate() === 4; });
  const hasLove = myPins.some(p => { const d = new Date(p.created_at); return d.getMonth() === 1 && d.getDate() === 14; });
  const hasSilvester = myPins.some(p => { const d = new Date(p.created_at); const m = d.getMonth(); const day = d.getDate(); return (m === 11 && day === 31) || (m === 0 && day === 1); });
  const hasNz = myPins.some(p => p.lat >= -47.5 && p.lat <= -34 && p.lng >= 165 && p.lng <= 179);
  const hasUshuaia = myPins.some(p => p.lat >= -56 && p.lat <= -53 && p.lng >= -69 && p.lng <= -66);`;

content = content.replace(target2, replacement2);

fs.writeFileSync('src/MapView.jsx', content);
