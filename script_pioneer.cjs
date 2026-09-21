const fs = require('fs');
let c = fs.readFileSync('src/MapView.jsx', 'utf8');

c = c.replace(
  "const hasPioneer = myPins.some(pin => new Date(pin.created_at) < new Date('2026-11-01'));",
  "const hasPioneerGlobal = globalAchievements.some(g => g.achievement_id.startsWith('pioneer_') && g.user_id === session?.user?.id);\n  const hasPioneer = devMode || hasPioneerGlobal;"
);

const pioneerLogic = `
      // 3. Pionier der ersten Stunde (Max 15)
      if (!globalAchievements.some(g => g.achievement_id.startsWith('pioneer_') && g.user_id === session.user.id)) {
        const pioneers = globalAchievements.filter(g => g.achievement_id.startsWith('pioneer_'));
        if (pioneers.length < 15 && myPins.length > 0) {
           for (let i = 1; i <= 15; i++) {
              if (!pioneers.some(p => p.achievement_id === \`pioneer_\${i}\`)) {
                 const { error } = await supabase.from('global_achievements').insert({ achievement_id: \`pioneer_\${i}\`, user_id: session.user.id });
                 if (!error) {
                   alert(\`🌟 Willkommen im exklusiven Club! Du bist Pionier Nr. \${i} von 15!\`);
                   claimsMade = true;
                   break;
                 }
              }
           }
        }
      }
`;

c = c.replace(
  "if (claimsMade) fetchGlobals();",
  pioneerLogic + "\n      if (claimsMade) fetchGlobals();"
);

// Update Trophäenschrank UI for Pioneer
const oldPioneerUI = `Du warst einer der Ersten! Danke für deine Unterstützung.<br/>{getUnlockDate('pioneer') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('pioneer')}</span>}</> : 'Dieses Abzeichen ist nur für die allerersten Nutzer reserviert...'}`;
const newPioneerUI = `Du gehörst zu den ersten 15 Nutzern weltweit! Danke für deine Unterstützung.<br/>{getUnlockDate('pioneer') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('pioneer')}</span>}</> : 'Streng limitiert auf die exakt ersten 15 Nutzer weltweit.'}`;

c = c.replace(oldPioneerUI, newPioneerUI);

fs.writeFileSync('src/MapView.jsx', c);
