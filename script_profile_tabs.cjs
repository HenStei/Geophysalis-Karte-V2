const fs = require('fs');
let c = fs.readFileSync('src/MapView.jsx', 'utf8');

// 1. Add profileTab state
if (!c.includes("const [profileTab, setProfileTab]")) {
  c = c.replace(
    "const [unlockedAchievements, setUnlockedAchievements] = useState([]);",
    "const [unlockedAchievements, setUnlockedAchievements] = useState([]);\n  const [profileTab, setProfileTab] = useState('profil');"
  );
}

// 2. Compute total distance between pins (Haversine)
const statsCode = `
  // Stats: Total distance between all pins (Haversine sum)
  const totalDistanceKm = useMemo(() => {
    if (myPins.length < 2) return 0;
    let total = 0;
    const sorted = [...myPins].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    for (let i = 1; i < sorted.length; i++) {
      const R = 6371;
      const dLat = (sorted[i].lat - sorted[i-1].lat) * Math.PI / 180;
      const dLng = (sorted[i].lng - sorted[i-1].lng) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(sorted[i-1].lat * Math.PI/180) * Math.cos(sorted[i].lat * Math.PI/180) * Math.sin(dLng/2)**2;
      total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }
    return Math.round(total);
  }, [myPins]);
`;

if (!c.includes('totalDistanceKm')) {
  c = c.replace('  // Helper: Prüft ob Sticker in den letzten 7 Tagen gesetzt wurde', statsCode + '\n  // Helper: Prüft ob Sticker in den letzten 7 Tagen gesetzt wurde');
}

// 3. Replace the entire profile modal content (lines 1475-1973)
const OLD_MODAL = `      {/* Profile Modal */}
      {session && isAuthModalOpen && (
        <div className="absolute inset-0 z-[3000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 sm:p-8 shadow-2xl relative text-center max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition">
              <X size={24} />
            </button>`;

const NEW_MODAL = `      {/* Profile Modal */}
      {session && isAuthModalOpen && (
        <div className="absolute inset-0 z-[3000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => { if(e.target === e.currentTarget) setIsAuthModalOpen(false); }}>
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl relative flex flex-col max-h-[92vh]">
            <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition z-10">
              <X size={24} />
            </button>`;

c = c.replace(OLD_MODAL, NEW_MODAL);

// 4. Replace the avatar + stats header section
const OLD_HEADER = `            
            <div className="mb-6 mt-2">
              <img src={session.user.user_metadata?.avatar_url || \`https://ui-avatars.com/api/?name=\${session.user.email}&background=random\`} alt="Avatar" className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-blue-50 shadow-md" />
              
              {isEditingNickname ? (
                <div className="flex flex-col gap-2">
                  <input 
                    type="text" 
                    value={tempNickname} 
                    onChange={e => setTempNickname(e.target.value)} 
                    placeholder="Wähle einen Nicknamen..."
                    className="w-full px-4 py-2 border-2 border-blue-100 rounded-full focus:outline-none focus:border-blue-500 font-bold text-center"
                    maxLength={20}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setIsEditingNickname(false)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-2 rounded-full text-sm">Abbrechen</button>
                    <button 
                      onClick={async () => {
                        if (tempNickname.trim().length < 3) return alert("Nickname zu kurz!");
                        const { error } = await supabase.from('profiles').update({ nickname: tempNickname.trim() }).eq('id', session.user.id);
                        if (!error) {
                          setProfile({ ...profile, nickname: tempNickname.trim() });
                          setIsEditingNickname(false);
                        } else {
                          alert("Dieser Name ist wahrscheinlich schon vergeben!");
                        }
                      }} 
                      className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-full text-sm"
                    >
                      Speichern
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-2xl font-black text-gray-900 flex items-center justify-center gap-2">
                    {profile?.nickname || 'Kein Nickname'}
                  </h2>
                  <button onClick={() => { setTempNickname(profile?.nickname || ''); setIsEditingNickname(true); }} className="text-blue-500 text-sm font-bold mt-1 hover:underline">
                    Nickname ändern
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2 break-all">{session.user.email}</p>
            </div>

            {/* Stats */}
            <div className="bg-blue-50 rounded-full p-4 mb-4">
              <p className="text-sm text-blue-800 font-bold mb-1">Deine Statistik</p>
              <p className="text-3xl font-black text-blue-600">
                {myPins.length}
                <span className="text-base font-normal text-blue-800 ml-1">Sticker weltweit</span>
              </p>
            </div>`;

const NEW_HEADER = `            
            {/* Header with avatar and name - always visible */}
            <div className="p-6 pb-0 text-center">
              <div className="relative inline-block mb-3">
                <img src={session.user.user_metadata?.avatar_url || \`https://ui-avatars.com/api/?name=\${session.user.email}&background=random\`} alt="Avatar" className="w-20 h-20 rounded-full mx-auto border-4 border-white shadow-lg" />
                {hasPioneer && <span className="absolute -bottom-1 -right-1 bg-yellow-400 text-white text-xs font-black px-1.5 py-0.5 rounded-full shadow">No.{myPioneerRank}</span>}
              </div>

              {isEditingNickname ? (
                <div className="flex flex-col gap-2 mb-2">
                  <input type="text" value={tempNickname} onChange={e => setTempNickname(e.target.value)} placeholder="Wähle einen Nicknamen..." className="w-full px-4 py-2 border-2 border-blue-100 rounded-full focus:outline-none focus:border-blue-500 font-bold text-center" maxLength={20} />
                  <div className="flex gap-2">
                    <button onClick={() => setIsEditingNickname(false)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-2 rounded-full text-sm">Abbrechen</button>
                    <button onClick={async () => { if (tempNickname.trim().length < 3) return alert("Nickname zu kurz!"); const { error } = await supabase.from('profiles').update({ nickname: tempNickname.trim() }).eq('id', session.user.id); if (!error) { setProfile({ ...profile, nickname: tempNickname.trim() }); setIsEditingNickname(false); } else { alert("Dieser Name ist wahrscheinlich schon vergeben!"); } }} className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-full text-sm">Speichern</button>
                  </div>
                </div>
              ) : (
                <div className="mb-1">
                  <h2 className="text-xl font-black text-gray-900">{profile?.nickname || 'Kein Nickname'}</h2>
                  <button onClick={() => { setTempNickname(profile?.nickname || ''); setIsEditingNickname(true); }} className="text-blue-500 text-xs font-bold hover:underline">Nickname ändern</button>
                </div>
              )}

              {/* Quick Stats Bar */}
              <div className="flex items-center justify-center gap-4 mt-3 mb-4 bg-gray-50 rounded-2xl p-3">
                <div className="text-center">
                  <p className="text-xl font-black text-gray-900">{myPins.length}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Sticker</p>
                </div>
                <div className="h-8 w-px bg-gray-200"/>
                <div className="text-center">
                  <p className="text-xl font-black text-gray-900">{totalDistanceKm > 999 ? (totalDistanceKm/1000).toFixed(1)+'k' : totalDistanceKm}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">km Reise</p>
                </div>
                <div className="h-8 w-px bg-gray-200"/>
                <div className="text-center">
                  <p className="text-xl font-black text-gray-900">{uniqueCountries.size}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Länder</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex bg-gray-100 rounded-2xl p-1 mb-0">
                {[['profil','👤 Profil'],['abzeichen','🏆 Abzeichen'],['einstellungen','⚙️']].map(([tab, label]) => (
                  <button key={tab} onClick={() => setProfileTab(tab)} className={\`flex-1 py-2 rounded-xl text-xs font-bold transition \${profileTab === tab ? 'bg-white shadow text-gray-900' : 'text-gray-400 hover:text-gray-600'}\`}>{label}</button>
                ))}
              </div>
            </div>

            {/* Scrollable Tab Content */}
            <div className="overflow-y-auto custom-scrollbar flex-1 p-6 pt-4">`;

c = c.replace(OLD_HEADER, NEW_HEADER);

// 5. Wrap existing avatar section in Tab condition
const OLD_AVATAR_SECTION_START = `            {/* Avatar & Rahmen Sektion (Vorübergehend deaktiviert) */}
            {FEATURE_AVATARS && (`;

const NEW_AVATAR_SECTION_START = `            {profileTab === 'profil' && FEATURE_AVATARS && (`;

c = c.replace(OLD_AVATAR_SECTION_START, NEW_AVATAR_SECTION_START);

// 6. Wrap badge section  in Tab condition + add categories
const OLD_BADGE_SECTION_START = `            {/* Badges / Achievements */}

                <div className={\`flex items-center gap-4 p-3 rounded-2xl transition shadow-sm mb-3 \${(devMode || hasEuCenter) ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}\`}>`;

const NEW_BADGE_SECTION_START = `            {profileTab === 'abzeichen' && <>
                {devMode && <div className="text-center text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase mb-3">DevMode: Alles frei</div>}

                {/* Tier Progress */}
                <div className="bg-gray-50 rounded-2xl p-3 mb-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Sammler Fortschritt</p>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{myPins.length >= 5 ? '🥉' : myPins.length >= 10 ? '🥈' : myPins.length >= 50 ? '🥇' : '🎖️'}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="bg-gradient-to-r from-yellow-400 to-orange-400 h-2 rounded-full transition-all" style={{width: \`\${Math.min(100, (myPins.length / 50) * 100)}%\`}} />
                    </div>
                    <span className="text-xs font-bold text-gray-500">{myPins.length}/50</span>
                  </div>
                  <p className="text-[10px] text-gray-400">{myPins.length < 5 ? \`Noch \${5 - myPins.length} bis Bronze\` : myPins.length < 10 ? \`Noch \${10 - myPins.length} bis Silber\` : myPins.length < 50 ? \`Noch \${50 - myPins.length} bis Gold\` : 'Gold Sammler erreicht! 🏆'}</p>
                </div>

                {/* Exklusive Abzeichen */}
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">🌐 Exklusiv & Limitiert</p>
                <div className="flex flex-col gap-2 mb-4">
                <div className={\`flex items-center gap-3 p-3 rounded-2xl transition shadow-sm \${(devMode || hasEuCenter) ? 'bg-white border border-gray-100' : 'opacity-40 grayscale bg-gray-50'}\`}>`;

c = c.replace(OLD_BADGE_SECTION_START, NEW_BADGE_SECTION_START);

// 7. After the EU Center badge, add a section label before the trophäen-schrank
const OLD_TROPHY_HEADER = `            <div className="bg-gray-50 rounded-full p-4 mb-6 text-left">
              <p className="text-sm text-gray-800 font-bold mb-3 flex items-center justify-between">
                Trophäen-Schrank
                {devMode && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase">DevMode: Alles frei</span>}
              </p>
              
              <div className="flex flex-col gap-3">`;

const NEW_TROPHY_HEADER = `                </div>

                {/* Karten-Freischaltungen */}
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 mt-2 flex items-center gap-1">🗺️ Karten-Freischaltungen</p>
                <div className="flex flex-col gap-2 mb-4">`;

c = c.replace(OLD_TROPHY_HEADER, NEW_TROPHY_HEADER);

// 8. Add a section break label before the special/time achievements
const OLD_PI_BADGE = `                <div className={\`flex items-center gap-4 p-3 rounded-full transition shadow-sm \${(devMode || hasPi) ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}\`}>`;
const NEW_PI_BADGE = `                </div>
                
                {/* Spezial Abzeichen */}
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 mt-2 flex items-center gap-1">⭐ Spezial & Zeitlich</p>
                <div className="flex flex-col gap-2 mb-4">
                <div className={\`flex items-center gap-3 p-3 rounded-2xl transition shadow-sm \${(devMode || hasPi) ? 'bg-white border border-gray-100' : 'opacity-40 grayscale bg-gray-50'}\`}>`;

c = c.replace(OLD_PI_BADGE, NEW_PI_BADGE);

// 9. Add section for tier + adventure badges before World Traveler
const OLD_TIER5 = `                <div className={\`flex items-center gap-4 p-3 rounded-full transition shadow-sm \${(devMode || hasTier5) ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}\`}>`;
const NEW_TIER5 = `                </div>

                {/* Abenteuer */}
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 mt-2 flex items-center gap-1">🌍 Abenteuer & Reisen</p>
                <div className="flex flex-col gap-2 mb-4">
                <div className={\`flex items-center gap-3 p-3 rounded-2xl transition shadow-sm \${(devMode || hasTier5) ? 'bg-white border border-gray-100' : 'opacity-40 grayscale bg-gray-50'}\`}>`;

c = c.replace(OLD_TIER5, NEW_TIER5);

// 10. Close the abzeichen tab and add Einstellungen tab
const OLD_TOGGLE_SECTION = `            {/* Toggle My Pins */}
            <label className="flex items-center justify-between bg-gray-50 p-4 rounded-full cursor-pointer hover:bg-gray-100 transition mb-6">
              <span className="font-bold text-gray-700 text-sm">Nur meine Sticker zeigen</span>
              <div className={\`w-12 h-6 rounded-full transition relative \${showOnlyMyPins ? 'bg-blue-600' : 'bg-gray-300'}\`}>
                <div className={\`w-4 h-4 bg-white rounded-full absolute top-1 transition-all \${showOnlyMyPins ? 'left-7' : 'left-1'}\`}></div>
              </div>
              <input type="checkbox" className="hidden" checked={showOnlyMyPins} onChange={e => {
                setShowOnlyMyPins(e.target.checked);
                if (e.target.checked) setIsAuthModalOpen(false);
              }} />
            </label>
            
            <button 
              onClick={() => {
                supabase.auth.signOut();
                setIsAuthModalOpen(false);
              }}
              className="w-full bg-white border-2 border-red-100 text-red-500 font-bold py-3 rounded-full hover:bg-red-50 transition"
            >
              Abmelden
            </button>
          </div>
        </div>
      )}`;

const NEW_TOGGLE_SECTION = `            {profileTab === 'einstellungen' && (
              <div className="flex flex-col gap-3">
                <label className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl cursor-pointer hover:bg-gray-100 transition">
                  <span className="font-bold text-gray-700 text-sm">Nur meine Sticker zeigen</span>
                  <div className={\`w-12 h-6 rounded-full transition relative \${showOnlyMyPins ? 'bg-blue-600' : 'bg-gray-300'}\`}>
                    <div className={\`w-4 h-4 bg-white rounded-full absolute top-1 transition-all \${showOnlyMyPins ? 'left-7' : 'left-1'}\`}></div>
                  </div>
                  <input type="checkbox" className="hidden" checked={showOnlyMyPins} onChange={e => { setShowOnlyMyPins(e.target.checked); if (e.target.checked) setIsAuthModalOpen(false); }} />
                </label>

                <p className="text-xs text-gray-400 text-center">{session.user.email}</p>
                
                <button onClick={() => { supabase.auth.signOut(); setIsAuthModalOpen(false); }} className="w-full bg-white border-2 border-red-100 text-red-500 font-bold py-3 rounded-2xl hover:bg-red-50 transition">
                  Abmelden
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      )}`;

c = c.replace(OLD_TOGGLE_SECTION, NEW_TOGGLE_SECTION);

// 11. Replace all remaining "rounded-full" in badge items with "rounded-2xl border border-gray-100" for cleaner look
// and fix gap-4 to gap-3 in badge rows (already partly done above for new sections)

// Fix the closing of profil tab - after avatar section closing paren+bracket
const OLD_AVATAR_CLOSE = `            )}

            {/* Badges / Achievements */}`;
const NEW_AVATAR_CLOSE = `            )}

            {/* Badges / Achievements */}`;
// (no change needed, it's already correct)

fs.writeFileSync('src/MapView.jsx', c);
