const fs = require('fs');
let c = fs.readFileSync('src/MapView.jsx', 'utf8');

const peaksArray = `const PEAKS = [
  { id: 'zugspitze', lat: 47.421, lng: 10.985, name: 'Zugspitze (Bayern)' },
  { id: 'feldberg', lat: 47.873, lng: 8.004, name: 'Feldberg (BaWü)' },
  { id: 'brocken', lat: 51.799, lng: 10.615, name: 'Brocken (Sachsen-Anhalt)' },
  { id: 'fichtelberg', lat: 50.429, lng: 12.954, name: 'Fichtelberg (Sachsen)' },
  { id: 'wasserkuppe', lat: 50.498, lng: 9.937, name: 'Wasserkuppe (Hessen)' },
  { id: 'beerberg', lat: 50.658, lng: 9.746, name: 'Großer Beerberg (Thüringen)' },
  { id: 'wurmberg', lat: 51.756, lng: 10.617, name: 'Wurmberg (Niedersachsen)' },
  { id: 'langenberg', lat: 51.275, lng: 8.525, name: 'Langenberg (NRW)' },
  { id: 'erbeskopf', lat: 49.730, lng: 7.089, name: 'Erbeskopf (RLP)' },
  { id: 'dollberg', lat: 49.629, lng: 7.017, name: 'Dollberg (Saarland)' },
  { id: 'mueggelberge', lat: 52.416, lng: 13.639, name: 'Müggelberge (Berlin)' },
  { id: 'kutschenberg', lat: 51.423, lng: 13.722, name: 'Kutschenberg (Brandenburg)' },
  { id: 'friedehorstpark', lat: 53.169, lng: 8.675, name: 'Friedehorstpark (Bremen)' },
  { id: 'hasselbrack', lat: 53.431, lng: 9.865, name: 'Hasselbrack (Hamburg)' },
  { id: 'helpterberge', lat: 53.483, lng: 13.606, name: 'Helpter Berge (MV)' },
  { id: 'bungsberg', lat: 54.212, lng: 10.723, name: 'Bungsberg (SH)' }
];`;

c = c.replace('export default function MapView() {', peaksArray + '\n\nexport default function MapView() {');

// We have to be careful replacing the peaks array inside the useEffect.
// It's defined as `const peaks = [`
c = c.replace(/const peaks = \[\s*\{ id: 'zugspitze'[\s\S]*?name: 'Bungsberg \(SH\)' \}\s*\];/, 'const peaks = PEAKS;');

// Now extract the user's specific Pioneer and Gipfeli data:
const uiExtracts = `
  // Data extraction for UI
  const myPioneerObj = globalAchievements.find(g => g.achievement_id.startsWith('pioneer_') && g.user_id === session?.user?.id);
  const myPioneerRank = myPioneerObj ? myPioneerObj.achievement_id.split('_')[1] : null;

  const myGipfeliObj = globalAchievements.find(g => g.achievement_id.startsWith('gipfeli_') && g.user_id === session?.user?.id);
  const myGipfeliPeakId = myGipfeliObj ? myGipfeliObj.achievement_id.split('_')[1] : null;
  const myGipfeliPeakName = myGipfeliPeakId ? PEAKS.find(p => p.id === myGipfeliPeakId)?.name : null;
`;

c = c.replace(
  "const euOwner = globalAchievements.find(g => g.achievement_id === 'eu_center')?.user_id;",
  "const euOwner = globalAchievements.find(g => g.achievement_id === 'eu_center')?.user_id;\n" + uiExtracts
);

// Pioneer UI Update
const oldPioneerTitle = `{(devMode || hasPioneer) ? 'Pionier der ersten Stunde 🌟' : 'Pionier der ersten Stunde (Limit: 15)'}`;
const newPioneerTitle = `{(devMode || hasPioneer) ? \`Pionier der ersten Stunde (No. \${myPioneerRank || '?'}/15) 🌟\` : 'Pionier der ersten Stunde (Limit: 15)'}`;
c = c.replace(oldPioneerTitle, newPioneerTitle);

// Gipfeli UI Update
const oldGipfeliDesc = `{(devMode || hasGipfeli) ? <>Du hast das Abzeichen für den höchsten Berg deines Bundeslands!<br/>{getUnlockDate('gipfeli') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('gipfeli')}</span>}</> : 'Klebe als erster auf den höchsten Punkt deines Bundeslands (Limit 1x).'}`;
const newGipfeliDesc = `{(devMode || hasGipfeli) ? <>Du hast das Abzeichen für den höchsten Berg ergattert! {myGipfeliPeakName && <strong className="text-purple-700 block mt-1">📍 {myGipfeliPeakName}</strong>}<br/>{getUnlockDate('gipfeli') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('gipfeli')}</span>}</> : 'Klebe als erster auf den höchsten Punkt deines Bundeslands (Limit 1x).'}`;
c = c.replace(oldGipfeliDesc, newGipfeliDesc);


fs.writeFileSync('src/MapView.jsx', c);
