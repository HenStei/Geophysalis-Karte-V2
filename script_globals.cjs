const fs = require('fs');
let c = fs.readFileSync('src/MapView.jsx', 'utf8');

// Inject state
c = c.replace(
  "const [editFrame, setEditFrame] = useState('none');",
  "const [editFrame, setEditFrame] = useState('none');\n  const [globalAchievements, setGlobalAchievements] = useState([]);"
);

// Inject fetchGlobals and logic
const targetLogic = `const isNearPeak = (lat, lng) => {`;
const insertLogic = `
  const fetchGlobals = async () => {
    try {
      const { data } = await supabase.from('global_achievements').select('*');
      if (data) setGlobalAchievements(data);
    } catch(e) {}
  };

  useEffect(() => {
    fetchGlobals();
  }, []);

  const isNearCoords = (lat1, lon1, lat2, lon2, maxKm) => {
    const R = 6371; 
    const dLat = (lat1 - lat2) * Math.PI / 180;
    const dLng = (lon1 - lon2) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat2 * Math.PI / 180) * Math.cos(lat1 * Math.PI / 180) * Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c) < maxKm;
  };

  useEffect(() => {
    if (!session?.user?.id || myPins.length === 0 || globalAchievements.length === 0) return;
    
    // Only run this check once every time myPins changes to avoid infinite loops
    const checkClaims = async () => {
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

      if (claimsMade) fetchGlobals();
    };

    checkClaims();
  }, [myPins, session]); // do not depend on globalAchievements directly to prevent infinite loop

  const hasEuCenter = globalAchievements.some(g => g.achievement_id === 'eu_center' && g.user_id === session?.user?.id);
  const euOwner = globalAchievements.find(g => g.achievement_id === 'eu_center')?.user_id;

`;

c = c.replace(targetLogic, insertLogic + targetLogic);

// Add EU Center UI block
const uiTarget = `{/* Badges / Achievements */}`;
const uiBlock = `
                <div className={\`flex items-center gap-4 p-3 rounded-2xl transition shadow-sm mb-3 \${(devMode || hasEuCenter) ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}\`}>
                  <div className={\`w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-blue-800 flex items-center justify-center text-3xl \${(devMode || hasEuCenter) ? 'ring-2 ring-blue-500 shadow-md' : 'border-2 border-gray-300'}\`}>
                    🇪🇺
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {(devMode || hasEuCenter) ? 'Mitte der EU ✅' : '??? (Limit: 1 Weltweit)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {(devMode || hasEuCenter) ? <>Du warst der Erste in der Mitte der EU!<br/>{getUnlockDate('eu_center') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('eu_center')}</span>}</> : 
                      euOwner ? <span className="text-red-500 font-bold">Dieses Abzeichen wurde bereits von einem anderen User ergattert!</span> : 'Klebe als allererster Nutzer in der Mitte der EU.'}
                    </p>
                  </div>
                </div>
`;
c = c.replace(uiTarget, uiTarget + "\n" + uiBlock);

fs.writeFileSync('src/MapView.jsx', c);
