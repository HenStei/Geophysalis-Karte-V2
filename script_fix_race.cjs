const fs = require('fs');
let c = fs.readFileSync('src/MapView.jsx', 'utf8');

// We need to inject `const claimedInSessionRef = useRef(new Set());` near the top of the component
if (!c.includes('const claimedInSessionRef = useRef(new Set());')) {
  c = c.replace(
    'const [globalsLoaded, setGlobalsLoaded] = useState(false);',
    'const [globalsLoaded, setGlobalsLoaded] = useState(false);\n  const claimedInSessionRef = useRef(new Set());\n  const isClaimingRef = useRef(false);'
  );
}

const oldUseEffect = `  useEffect(() => {
    if (!session?.user?.id || myPins.length === 0 || !globalsLoaded) return;
    
    // Only run this check once every time myPins changes to avoid infinite loops
    const checkClaims = async () => {
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
      const peaks = PEAKS;

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
    };

    checkClaims();
  }, [myPins, session, globalsLoaded]);`;

const newUseEffect = `  useEffect(() => {
    if (!session?.user?.id || myPins.length === 0 || !globalsLoaded) return;
    if (isClaimingRef.current) return;
    
    // Only run this check once every time myPins changes to avoid infinite loops
    const checkClaims = async () => {
      isClaimingRef.current = true;
      try {
        let newUnlocks = [];
        let claimsMade = false;
        
        // 1. Mitte der EU (49.843, 9.902)
        if (!claimedInSessionRef.current.has('eu_center') && !globalAchievements.some(g => g.achievement_id === 'eu_center')) {
           const euPin = myPins.find(p => isNearCoords(p.lat, p.lng, 49.843, 9.902, 1.0));
           if (euPin) {
              const { error } = await supabase.from('global_achievements').insert({ achievement_id: 'eu_center', user_id: session.user.id });
              if (!error) { 
                claimedInSessionRef.current.add('eu_center');
                newUnlocks.push({ title: "Mitte der EU", text: "Wahnsinn! Du hast die geografische Mitte der EU als Allererster gefunden! (Globales Limit: 1)", icon: '🇪🇺' });
                claimsMade = true; 
              }
           }
        }

        // 2. Gipfeli Peaks (Die 16 höchsten Punkte der Bundesländer)
        const peaks = PEAKS;

        for (let peak of peaks) {
           if (!claimedInSessionRef.current.has(\`gipfeli_\${peak.id}\`) && !globalAchievements.some(g => g.achievement_id === \`gipfeli_\${peak.id}\`)) {
              const peakPin = myPins.find(p => isNearCoords(p.lat, p.lng, peak.lat, peak.lng, 3.0));
              if (peakPin) {
                 const { error } = await supabase.from('global_achievements').insert({ achievement_id: \`gipfeli_\${peak.id}\`, user_id: session.user.id });
                 if (!error) {
                   claimedInSessionRef.current.add(\`gipfeli_\${peak.id}\`);
                   newUnlocks.push({ title: "Gipfeli Alpinist", text: \`Glückwunsch! Du hast das Gipfeli am \${peak.name} als Allererster gesichert!\`, icon: '🥐' });
                   claimsMade = true;
                 }
              }
           }
        }
        
        // 3. Pionier der ersten Stunde (Max 15)
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
        }

        if (claimsMade) fetchGlobals();
        if (newUnlocks.length > 0) {
          setUnlockedAchievements(prev => [...prev, ...newUnlocks]);
        }
      } finally {
        isClaimingRef.current = false;
      }
    };

    checkClaims();
  }, [myPins, session, globalsLoaded]);`;

c = c.replace(oldUseEffect, newUseEffect);
fs.writeFileSync('src/MapView.jsx', c);
