const fs = require('fs');
let lines = fs.readFileSync('src/MapView.jsx', 'utf8').split('\n');

const shareCardJSX = `
      {/* Hidden Share Card for html2canvas */}
      <div 
        ref={shareCardRef}
        className="fixed top-[-9999px] left-[-9999px] w-[1080px] h-[1080px] bg-gradient-to-br from-indigo-950 via-slate-900 to-black text-white flex flex-col items-center justify-center p-16 overflow-hidden z-[-1]"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        <div className="absolute top-12 left-12 w-24 h-24 text-8xl opacity-20">🌍</div>
        <div className="absolute bottom-12 right-12 w-24 h-24 text-8xl opacity-20">📍</div>

        <h1 className="text-[72px] font-black mb-16 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 z-10 relative drop-shadow-md">GEOPHYSALIS EXPLORER</h1>
        
        <div className="relative z-10 mb-12">
          <img 
            src={session?.user?.user_metadata?.avatar_url || \`https://ui-avatars.com/api/?name=\${session?.user?.email}&background=random\`} 
            crossOrigin="anonymous" 
            className="w-64 h-64 rounded-full border-[12px] border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] object-cover" 
          />
          {hasPioneer && <span className="absolute -bottom-6 -right-6 bg-yellow-400 text-slate-900 text-3xl font-black px-6 py-2 rounded-full shadow-2xl border-4 border-slate-900">No.{myPioneerRank}</span>}
        </div>
        
        <h2 className="text-6xl font-bold mb-20 z-10 relative drop-shadow-xl">{profile?.nickname || 'Neuankömmling'}</h2>

        <div className="flex gap-12 bg-white/5 p-12 rounded-[40px] w-full max-w-4xl justify-around mb-20 border border-white/10 z-10 relative shadow-2xl backdrop-blur-sm">
           <div className="text-center flex-1">
              <p className="text-[80px] font-black text-yellow-400 mb-2 drop-shadow-lg leading-none">{myPins.length}</p>
              <p className="text-3xl uppercase tracking-widest text-gray-300 font-bold opacity-80">Sticker</p>
           </div>
           <div className="w-[2px] bg-white/10"></div>
           <div className="text-center flex-1">
              <p className="text-[80px] font-black text-cyan-400 mb-2 drop-shadow-lg leading-none">{uniqueCountries.size}</p>
              <p className="text-3xl uppercase tracking-widest text-gray-300 font-bold opacity-80">Länder</p>
           </div>
           <div className="w-[2px] bg-white/10"></div>
           <div className="text-center flex-1">
              <p className="text-[80px] font-black text-emerald-400 mb-2 drop-shadow-lg leading-none">{totalDistanceKm > 999 ? (totalDistanceKm/1000).toFixed(1)+'k' : totalDistanceKm}</p>
              <p className="text-3xl uppercase tracking-widest text-gray-300 font-bold opacity-80">Kilometer</p>
           </div>
        </div>

        <div className="flex gap-8 items-center justify-center z-10 relative">
           {[
             hasPioneer && { icon: '🌟', bg: 'bg-yellow-500' },
             hasGlobetrotter && { icon: '🌍', bg: 'bg-indigo-500' },
             hasWorldTraveler && { icon: '🗺️', bg: 'bg-emerald-500' },
             hasTier50 && { icon: '🥇', bg: 'bg-yellow-400' },
             hasBorderCrosser && { icon: '🛂', bg: 'bg-orange-600' },
             hasMarathon && { icon: '🔥', bg: 'bg-orange-500' },
             hasRetroGamer && { icon: '👾', bg: 'bg-green-500' }
           ].filter(Boolean).slice(0, 5).map((b, i) => (
             <div key={i} className={\`w-24 h-24 rounded-3xl flex items-center justify-center text-5xl shadow-2xl \${b.bg} border-4 border-white/20\`}>
                {b.icon}
             </div>
           ))}
        </div>

        <div className="absolute bottom-12 flex items-center justify-center z-10 text-gray-500 font-bold text-3xl tracking-widest uppercase">
           DEINE KARTE. DEIN ABENTEUER.
        </div>
      </div>
`;

// Insert just before the final </div>
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes('  );')) {
    // lines[i-1] is the final </div>
    lines.splice(i - 1, 0, ...shareCardJSX.split('\n'));
    break;
  }
}

fs.writeFileSync('src/MapView.jsx', lines.join('\n'));
console.log("Appended hidden share card successfully.");
