const fs = require('fs');
let c = fs.readFileSync('src/MapView.jsx', 'utf8');

if (!c.includes('const sessionLocks = new Set();')) {
  c = c.replace('export default function MapView() {', 'const sessionLocks = new Set();\n\nexport default function MapView() {');
}

const oldClaimCheck = `        // 3. Pionier der ersten Stunde (Max 15)
        if (!claimedInSessionRef.current.has('pioneer') && !globalAchievements.some(g => g.achievement_id.startsWith('pioneer_') && g.user_id === session.user.id)) {
          const pioneers = globalAchievements.filter(g => g.achievement_id.startsWith('pioneer_'));
          if (pioneers.length < 15 && myPins.length > 0) {
             for (let i = 1; i <= 15; i++) {
                if (!pioneers.some(p => p.achievement_id === \`pioneer_\${i}\`)) {
                   const { error } = await supabase.from('global_achievements').insert({ achievement_id: \`pioneer_\${i}\`, user_id: session.user.id });
                   if (!error) {
                     claimedInSessionRef.current.add('pioneer');
                     newUnlocks.push({ title: "Pionier der ersten Stunde", text: \`Willkommen im exklusiven Club! Du bist Pionier Nr. \${i} von 15 weltweit!\`, icon: '🌟' });
                     claimsMade = true;
                     break;
                   }
                }
             }
          }
        }`;

const newClaimCheck = `        // 3. Pionier der ersten Stunde (Max 15)
        if (!sessionLocks.has('pioneer') && !globalAchievements.some(g => g.achievement_id.startsWith('pioneer_') && g.user_id === session.user.id)) {
          // Extra safety check to database before inserting
          const { data: existingPioneer } = await supabase.from('global_achievements').select('id').eq('user_id', session.user.id).like('achievement_id', 'pioneer_%');
          if (existingPioneer && existingPioneer.length > 0) {
             sessionLocks.add('pioneer');
          } else {
            const pioneers = globalAchievements.filter(g => g.achievement_id.startsWith('pioneer_'));
            if (pioneers.length < 15 && myPins.length > 0) {
               for (let i = 1; i <= 15; i++) {
                  if (!pioneers.some(p => p.achievement_id === \`pioneer_\${i}\`)) {
                     const { error } = await supabase.from('global_achievements').insert({ achievement_id: \`pioneer_\${i}\`, user_id: session.user.id });
                     if (!error) {
                       sessionLocks.add('pioneer');
                       newUnlocks.push({ title: "Pionier der ersten Stunde", text: \`Willkommen im exklusiven Club! Du bist Pionier Nr. \${i} von 15 weltweit!\`, icon: '🌟' });
                       claimsMade = true;
                       break;
                     }
                  }
               }
            }
          }
        }`;

c = c.replace(oldClaimCheck, newClaimCheck);

const oldEuCheck = `if (!claimedInSessionRef.current.has('eu_center') && !globalAchievements.some(g => g.achievement_id === 'eu_center')) {`;
const newEuCheck = `if (!sessionLocks.has('eu_center') && !globalAchievements.some(g => g.achievement_id === 'eu_center')) {`;
c = c.replace(oldEuCheck, newEuCheck);

const oldEuSuccess = `claimedInSessionRef.current.add('eu_center');`;
const newEuSuccess = `sessionLocks.add('eu_center');`;
c = c.replace(oldEuSuccess, newEuSuccess);

const oldGipfeliCheck = `if (!claimedInSessionRef.current.has(\`gipfeli_\${peak.id}\`) && !globalAchievements.some(g => g.achievement_id === \`gipfeli_\${peak.id}\`)) {`;
const newGipfeliCheck = `if (!sessionLocks.has(\`gipfeli_\${peak.id}\`) && !globalAchievements.some(g => g.achievement_id === \`gipfeli_\${peak.id}\`)) {`;
c = c.replace(oldGipfeliCheck, newGipfeliCheck);

const oldGipfeliSuccess = `claimedInSessionRef.current.add(\`gipfeli_\${peak.id}\`);`;
const newGipfeliSuccess = `sessionLocks.add(\`gipfeli_\${peak.id}\`);`;
c = c.replace(oldGipfeliSuccess, newGipfeliSuccess);

fs.writeFileSync('src/MapView.jsx', c);
