const fs = require('fs');
let c = fs.readFileSync('src/MapView.jsx', 'utf8');

// 1. Add html2canvas import
if (!c.includes("import html2canvas from 'html2canvas'")) {
  c = c.replace(
    "import confetti from 'canvas-confetti';",
    "import confetti from 'canvas-confetti';\nimport html2canvas from 'html2canvas';"
  );
}

// 2. Add ref and state
if (!c.includes('const shareCardRef = useRef(null)')) {
  c = c.replace(
    "const isClaimingRef = useRef(false);",
    "const isClaimingRef = useRef(false);\n  const shareCardRef = useRef(null);\n  const [isSharing, setIsSharing] = useState(false);"
  );
}

// 3. Add handleShareCard function
const handleShareCard = `
  const handleShareCard = async () => {
    if (!shareCardRef.current) return;
    setIsSharing(true);
    try {
      const canvas = await html2canvas(shareCardRef.current, { 
        useCORS: true, 
        backgroundColor: '#0f172a',
        scale: 2
      });
      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error("Blob failed");
        
        const file = new File([blob], 'geophysalis_profil.png', { type: 'image/png' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Geophysalis Profil',
            text: 'Schau dir mein Geophysalis Profil an! 🌍📍',
            files: [file]
          }).catch(console.error);
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'geophysalis_profil.png';
          a.click();
          URL.revokeObjectURL(url);
          alert('Dein Profil-Bild wurde heruntergeladen! Teile es auf Social Media.');
        }
      }, 'image/png', 1.0);
    } catch (e) {
      console.error(e);
      alert('Fehler beim Erstellen des Bildes.');
    } finally {
      setIsSharing(false);
    }
  };
`;

if (!c.includes('const handleShareCard = async ()')) {
  c = c.replace(
    "// Data extraction for UI",
    handleShareCard + "\n  // Data extraction for UI"
  );
}

// 4. Replace the old Share button with the new one
const oldShareBtnRegex = /<button onClick=\{\(\) => \{\s*const text = [^}]+\}\s*\}\s*className="w-full bg-blue-50 text-blue-600 border-2 border-blue-100 font-bold py-3 rounded-2xl hover:bg-blue-100 transition flex items-center justify-center gap-2">\s*<Share size=\{18\} \/> Profil Teilen\s*<\/button>/g;

const newShareBtn = `<button 
                    onClick={handleShareCard} 
                    disabled={isSharing}
                    className={\`w-full border-2 font-bold py-3 rounded-2xl transition flex items-center justify-center gap-2 \${isSharing ? 'bg-gray-100 text-gray-400 border-gray-200 opacity-70' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'}\`}
                  >
                    {isSharing ? <Loader2 size={18} className="animate-spin" /> : <Share size={18} />}
                    {isSharing ? 'Bild wird generiert...' : 'Profil-Karte erstellen & teilen'}
                  </button>`;

if (c.match(oldShareBtnRegex)) {
  c = c.replace(oldShareBtnRegex, newShareBtn);
} else {
  console.log("WARNING: Could not find old share button. Maybe regex didn't match.");
  // Fallback direct replace
  const fallbackStr = `                  <button onClick={() => {
                    const text = \`Ich habe \${myPins.length} Sticker in \${uniqueCountries.size} Ländern auf Geophysalis geklebt! 🌍📍 Versuch es auch und schalte Erfolge frei!\`;
                    if (navigator.share) {
                      navigator.share({ title: 'Geophysalis', text: text, url: window.location.href }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(text + " " + window.location.href);
                      alert('In die Zwischenablage kopiert!');
                    }
                  }} className="w-full bg-blue-50 text-blue-600 border-2 border-blue-100 font-bold py-3 rounded-2xl hover:bg-blue-100 transition flex items-center justify-center gap-2">
                    <Share size={18} /> Profil Teilen
                  </button>`;
  if (c.includes(fallbackStr)) {
    c = c.replace(fallbackStr, newShareBtn);
  }
}

// 5. Append the Hidden Share Card HTML
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
    </div>
  );
}
`;

if (!c.includes('Hidden Share Card for html2canvas')) {
  c = c.replace(/ {4}<\/div>\s+<\/div>\s+<div className="absolute bottom-24/g, shareCardJSX.replace('    </div>\n  );\n}\n', '') + '\n      <div className="absolute bottom-24');
  // Just safer replacement: replace the ending
  const ending = `      </div>\n    </div>\n  );\n}`;
  c = c.replace(ending, shareCardJSX.substring(0, shareCardJSX.length - 15) + ending);
}

fs.writeFileSync('src/MapView.jsx', c);
console.log('Share profile feature added!');
