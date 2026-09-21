const fs = require('fs');
let c = fs.readFileSync('src/MapView.jsx', 'utf8');

// 1. Add myPioneerRank right after hasPioneer line
const OLD = `  const hasPioneerGlobal = globalAchievements.some(g => g.achievement_id.startsWith('pioneer_') && g.user_id === session?.user?.id);
  const hasPioneer = devMode || hasPioneerGlobal;`;
const NEW = `  const hasPioneerGlobal = globalAchievements.some(g => g.achievement_id.startsWith('pioneer_') && g.user_id === session?.user?.id);
  const hasPioneer = devMode || hasPioneerGlobal;
  const myPioneerEntry = globalAchievements.find(g => g.achievement_id.startsWith('pioneer_') && g.user_id === session?.user?.id);
  const myPioneerRank = myPioneerEntry ? myPioneerEntry.achievement_id.split('_')[1] : null;`;

if (c.includes(OLD)) {
  c = c.replace(OLD, NEW);
  console.log('✅ Pioneer rank calculation added');
} else {
  console.log('❌ Could not find hasPioneer block');
}

// 2. Update the UI text to show rank
const OLD_UI = `{hasPioneer ? 'Pionier der ersten Stunde 🌟' : 'Pionier der ersten Stunde (Limit: 15)'}`;
const NEW_UI = `{hasPioneer ? \`Pionier der ersten Stunde (No. \${myPioneerRank}/15) 🌟\` : 'Pionier der ersten Stunde (Limit: 15)'}`;

if (c.includes(OLD_UI)) {
  c = c.replace(OLD_UI, NEW_UI);
  console.log('✅ Pioneer UI title updated');
} else {
  console.log('❌ Could not find Pioneer UI title');
}

fs.writeFileSync('src/MapView.jsx', c);
