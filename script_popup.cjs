const fs = require('fs');
let c = fs.readFileSync('src/MapView.jsx', 'utf8');

// 1. Add unlockedAchievements state
c = c.replace(
  "const [globalAchievements, setGlobalAchievements] = useState([]);",
  "const [globalAchievements, setGlobalAchievements] = useState([]);\n  const [unlockedAchievements, setUnlockedAchievements] = useState([]);"
);

// 2. Replace the checkClaims logic with the new array collection logic
const oldCheckClaims = `    const checkClaims = async () => {
      let claimsMade = false;
      
      // 1. Mitte der EU (49.843, 9.902)
      if (!globalAchievements.some(g => g.achievement_id === 'eu_center')) {
         const euPin = myPins.find(p => isNearCoords(p.lat, p.lng, 49.843, 9.902, 1.0));
         if (euPin) {
            const { error } = await supabase.from('global_achievements').insert({ achievement_id: 'eu_center', user_id: session.user.id });
            if (!error) { 
              alert("🇪🇺 Wahnsinn! Du hast die geografische Mitte der EU als Allererster gefunden!"); 
              claimsMade = true; 
            }
         }
      }

      // 2. Gipfeli Peaks (Die 16 höchsten Punkte der Bundesländer)
      const peaks = [
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
      ];

      for (let peak of peaks) {
         if (!globalAchievements.some(g => g.achievement_id === \`gipfeli_\${peak.id}\`)) {
            const peakPin = myPins.find(p => isNearCoords(p.lat, p.lng, peak.lat, peak.lng, 3.0));
            if (peakPin) {
               const { error } = await supabase.from('global_achievements').insert({ achievement_id: \`gipfeli_\${peak.id}\`, user_id: session.user.id });
               if (!error) {
                 alert(\`🥐 Glückwunsch! Du hast das Gipfeli am \${peak.name} als Allererster gesichert!\`);
                 claimsMade = true;
               }
            }
         }
      }

      
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

      if (claimsMade) fetchGlobals();
    };`;

const newCheckClaims = `    const checkClaims = async () => {
      let newUnlocks = [];
      let claimsMade = false;
      
      // 1. Mitte der EU (49.843, 9.902)
      if (!globalAchievements.some(g => g.achievement_id === 'eu_center')) {
         const euPin = myPins.find(p => isNearCoords(p.lat, p.lng, 49.843, 9.902, 1.0));
         if (euPin) {
            const { error } = await supabase.from('global_achievements').insert({ achievement_id: 'eu_center', user_id: session.user.id });
            if (!error) { 
              newUnlocks.push({ title: "Mitte der EU", text: "Wahnsinn! Du hast die geografische Mitte der EU als Allererster gefunden! (Globales Limit: 1)", icon: '🇪🇺' });
              claimsMade = true; 
            }
         }
      }

      // 2. Gipfeli Peaks (Die 16 höchsten Punkte der Bundesländer)
      const peaks = [
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
      ];

      for (let peak of peaks) {
         if (!globalAchievements.some(g => g.achievement_id === \`gipfeli_\${peak.id}\`)) {
            const peakPin = myPins.find(p => isNearCoords(p.lat, p.lng, peak.lat, peak.lng, 3.0));
            if (peakPin) {
               const { error } = await supabase.from('global_achievements').insert({ achievement_id: \`gipfeli_\${peak.id}\`, user_id: session.user.id });
               if (!error) {
                 newUnlocks.push({ title: "Gipfeli Alpinist", text: \`Glückwunsch! Du hast das Gipfeli am \${peak.name} als Allererster gesichert!\`, icon: '🥐' });
                 claimsMade = true;
               }
            }
         }
      }
      
      // 3. Pionier der ersten Stunde (Max 15)
      if (!globalAchievements.some(g => g.achievement_id.startsWith('pioneer_') && g.user_id === session.user.id)) {
        const pioneers = globalAchievements.filter(g => g.achievement_id.startsWith('pioneer_'));
        if (pioneers.length < 15 && myPins.length > 0) {
           for (let i = 1; i <= 15; i++) {
              if (!pioneers.some(p => p.achievement_id === \`pioneer_\${i}\`)) {
                 const { error } = await supabase.from('global_achievements').insert({ achievement_id: \`pioneer_\${i}\`, user_id: session.user.id });
                 if (!error) {
                   newUnlocks.push({ title: "Pionier der ersten Stunde", text: \`Willkommen im exklusiven Club! Du bist Pionier Nr. \${i} von 15 weltweit!\`, icon: '🌟' });
                   claimsMade = true;
                   break;
                 }
              }
           }
        }
      }

      if (claimsMade) fetchGlobals();
      if (newUnlocks.length > 0) {
        setUnlockedAchievements(prev => [...prev, ...newUnlocks]);
      }
    };`;

c = c.replace(oldCheckClaims, newCheckClaims);


// 3. Inject Modal UI at the end of the return statement
const uiTarget = `{/* Map Container */}`;
const uiBlock = `
      {/* Animated Achievement Popup */}
      {unlockedAchievements.length > 0 && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-[bounce_1s_ease-in-out]">
            <div className="text-6xl mb-4 drop-shadow-lg">{unlockedAchievements[0].icon}</div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Meilenstein erreicht!</h2>
            <h3 className="text-lg font-bold text-purple-600 mb-4">{unlockedAchievements[0].title}</h3>
            <p className="text-gray-600 font-medium mb-8 leading-relaxed">{unlockedAchievements[0].text}</p>
            <button 
              onClick={() => setUnlockedAchievements(prev => prev.slice(1))}
              className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 transition transform hover:scale-105"
            >
              Genial!
            </button>
          </div>
        </div>
      )}

      `;

c = c.replace(uiTarget, uiBlock + uiTarget);

fs.writeFileSync('src/MapView.jsx', c);
