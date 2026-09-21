const fs = require('fs');
let c = fs.readFileSync('src/MapView.jsx', 'utf8');

// 1. Simplify the Share Card for html2canvas compatibility
const oldShareCardStart = '      {/* Hidden Share Card for html2canvas */}';
const oldShareCardEnd = '           DEINE KARTE. DEIN ABENTEUER.\n        </div>\n      </div>';

// Wait, I can just replace the entire div ref=shareCardRef with a safer one.
const newShareCard = `
      {/* Hidden Share Card for html2canvas */}
      <div 
        ref={shareCardRef}
        style={{ 
          position: 'fixed', left: '-9999px', top: '-9999px', width: '1080px', height: '1080px', 
          backgroundColor: '#0f172a', color: 'white', display: 'flex', flexDirection: 'column', 
          alignItems: 'center', justifyContent: 'center', padding: '64px', fontFamily: 'system-ui, sans-serif' 
        }}
      >
        <h1 style={{ fontSize: '72px', fontWeight: '900', marginBottom: '48px', color: '#60a5fa' }}>GEOPHYSALIS EXPLORER</h1>
        
        <div style={{ marginBottom: '48px', position: 'relative' }}>
          <img 
            src={session?.user?.user_metadata?.avatar_url || \`https://ui-avatars.com/api/?name=\${session?.user?.email}&background=random\`} 
            crossOrigin="anonymous" 
            style={{ width: '256px', height: '256px', borderRadius: '50%', border: '12px solid rgba(255,255,255,0.2)' }}
          />
          {hasPioneer && <span style={{ position: 'absolute', bottom: '-10px', right: '-10px', backgroundColor: '#facc15', color: '#0f172a', fontSize: '30px', fontWeight: '900', padding: '8px 24px', borderRadius: '99px', border: '4px solid #0f172a' }}>No.{myPioneerRank}</span>}
        </div>
        
        <h2 style={{ fontSize: '60px', fontWeight: 'bold', marginBottom: '80px' }}>{profile?.nickname || 'Neuankömmling'}</h2>

        <div style={{ display: 'flex', gap: '48px', backgroundColor: 'rgba(255,255,255,0.05)', padding: '48px', borderRadius: '40px', width: '100%', maxWidth: '900px', justifyContent: 'space-around', marginBottom: '80px', border: '2px solid rgba(255,255,255,0.1)' }}>
           <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '80px', fontWeight: '900', color: '#facc15', margin: '0 0 10px 0' }}>{myPins.length}</p>
              <p style={{ fontSize: '30px', textTransform: 'uppercase', color: '#cbd5e1', fontWeight: 'bold', margin: 0 }}>Sticker</p>
           </div>
           <div style={{ width: '2px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
           <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '80px', fontWeight: '900', color: '#22d3ee', margin: '0 0 10px 0' }}>{uniqueCountries.size}</p>
              <p style={{ fontSize: '30px', textTransform: 'uppercase', color: '#cbd5e1', fontWeight: 'bold', margin: 0 }}>Länder</p>
           </div>
           <div style={{ width: '2px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
           <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '80px', fontWeight: '900', color: '#34d399', margin: '0 0 10px 0' }}>{totalDistanceKm > 999 ? (totalDistanceKm/1000).toFixed(1)+'k' : totalDistanceKm}</p>
              <p style={{ fontSize: '30px', textTransform: 'uppercase', color: '#cbd5e1', fontWeight: 'bold', margin: 0 }}>Kilometer</p>
           </div>
        </div>

        <div style={{ display: 'flex', gap: '32px', alignItems: 'center', justifyContent: 'center' }}>
           {[
             hasPioneer && { icon: '🌟', bg: '#eab308' },
             hasGlobetrotter && { img: '/badges/badge_globetrotter.jpg' },
             hasBorderCrosser && { img: '/badges/badge_border.jpg' },
             hasWorldTraveler && { img: '/badges/world_traveler.jpg' },
             hasTier50 && { icon: '🥇', bg: '#facc15' },
             hasMarathon && { img: '/badges/streak.jpg' },
             hasRetroGamer && { img: '/badges/retro.jpg' }
           ].filter(Boolean).slice(0, 5).map((b, i) => (
             <div key={i} style={{ width: '120px', height: '120px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '60px', backgroundColor: b.bg || '#334155', border: '4px solid rgba(255,255,255,0.2)', overflow: 'hidden' }}>
                {b.img ? <img src={b.img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : b.icon}
             </div>
           ))}
        </div>

        <div style={{ position: 'absolute', bottom: '40px', color: '#64748b', fontWeight: 'bold', fontSize: '30px', letterSpacing: '4px' }}>
           DEINE KARTE. DEIN ABENTEUER.
        </div>
      </div>
`;

// Extract and replace
const startIndex = c.indexOf('{/* Hidden Share Card for html2canvas */}');
const endIndex = c.lastIndexOf('</div>\n    </div>\n  );\n}');
if (startIndex !== -1 && endIndex !== -1) {
  c = c.substring(0, startIndex) + newShareCard + '\n    ' + c.substring(endIndex);
}

// 2. Update Icons to Images in the normal UI tab for the new achievements
c = c.replace(
  "icon: '🛂', bg: 'bg-orange-600'",
  "img: '/badges/badge_border.jpg'"
);
c = c.replace(
  "icon: '🌍', bg: 'bg-indigo-600'",
  "img: '/badges/badge_globetrotter.jpg'"
);

// 3. Update the error catch block to alert the actual error message for debugging
c = c.replace(
  "alert('Fehler beim Erstellen des Bildes.');",
  "alert('Fehler beim Erstellen des Bildes: ' + e.message);"
);

fs.writeFileSync('src/MapView.jsx', c);
console.log("Safemode Share Card active and Images applied.");
