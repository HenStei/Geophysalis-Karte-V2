const fs = require('fs');
let code = fs.readFileSync('src/AdminView.jsx', 'utf8');

// 1. Add globalAchievements state
code = code.replace(/const \[usersList, setUsersList\] = useState\(\[\]\);/, 
`const [usersList, setUsersList] = useState([]);
  const [globalAchievements, setGlobalAchievements] = useState([]);`);

// 2. Fetch users and global achievements globally on load
const oldUseEffectAuth = `  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) { fetchAllPins(); fetchStats(); }
    });

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) { fetchAllPins(); fetchStats(); }
    });

    return () => authSub?.unsubscribe();
  }, []);`;

const newUseEffectAuth = `  const fetchGlobalAchievements = async () => {
    const { data } = await supabase.from('global_achievements').select('*');
    if (data) setGlobalAchievements(data);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) { fetchAllPins(); fetchStats(); fetchUsers(); fetchGlobalAchievements(); }
    });

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) { fetchAllPins(); fetchStats(); fetchUsers(); fetchGlobalAchievements(); }
    });

    return () => authSub?.unsubscribe();
  }, []);`;

code = code.replace(oldUseEffectAuth, newUseEffectAuth);

// 3. Update activeTab effect to not fetchUsers again since it's done globally now
code = code.replace(/if \(activeTab === 'users'\) \{\s*fetchUsers\(\);\s*\}/, `// users fetched globally now`);

// 4. Update fetchStats to only count approved profiles
code = code.replace(/const \{ count \} = await supabase\s*\.from\('profiles'\)\s*\.select\('\*', \{ count: 'exact', head: true \}\);/,
`const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_approved', true);`);

// 5. Update displayPins mapping to show nickname and already granted badges!
// First, find where we render each pin: `<div key={pin.id} className="bg-white rounded-3xl shadow-sm hover:shadow-xl`
// I'll replace the render block of the pin.
const pinRenderOld = `              <div className="p-5 flex flex-col flex-grow">
                <div className="mb-4">
                  {pin.location_name && (
                    <p className="text-sm font-black text-gray-800 flex items-start gap-1.5 mb-2 leading-tight">
                      <MapPin size={16} className="text-blue-600 shrink-0 mt-0.5" /> 
                      {pin.location_name}
                    </p>
                  )}
                  {pin.message && (
                    <p className="text-sm text-gray-600 italic bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
                      "{pin.message}"
                    </p>
                  )}
                  <p className="text-xs text-gray-400 font-bold uppercase mt-4">
                    {new Date(pin.created_at).toLocaleDateString()} um {new Date(pin.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>`;

const pinRenderNew = `              <div className="p-5 flex flex-col flex-grow">
                <div className="mb-4">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-black text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">
                      👤 {usersList.find(u => u.id === pin.user_id)?.nickname || 'Unbekannt'}
                    </p>
                  </div>
                  {pin.location_name && (
                    <p className="text-sm font-black text-gray-800 flex items-start gap-1.5 mb-2 leading-tight">
                      <MapPin size={16} className="text-blue-600 shrink-0 mt-0.5" /> 
                      {pin.location_name}
                    </p>
                  )}
                  {pin.message && (
                    <p className="text-sm text-gray-600 italic bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
                      "{pin.message}"
                    </p>
                  )}
                  <p className="text-xs text-gray-400 font-bold uppercase mt-4">
                    {new Date(pin.created_at).toLocaleDateString()} um {new Date(pin.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>`;

code = code.replace(pinRenderOld, pinRenderNew);

// 6. Update badge selection to indicate if user already has it
const selectOld = `<select
                      className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-xl p-2.5 focus:ring-blue-500 focus:border-blue-500 font-bold outline-none"
                      value={selectedBadges[pin.id] || ''}
                      onChange={(e) => setSelectedBadges({...selectedBadges, [pin.id]: e.target.value})}
                    >
                      {SPECIAL_BADGES.map(b => (
                        <option key={b.id} value={b.id}>{b.label}</option>
                      ))}
                    </select>`;

const selectNew = `<select
                      className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-xl p-2.5 focus:ring-blue-500 focus:border-blue-500 font-bold outline-none"
                      value={selectedBadges[pin.id] || ''}
                      onChange={(e) => setSelectedBadges({...selectedBadges, [pin.id]: e.target.value})}
                    >
                      {SPECIAL_BADGES.map(b => {
                        const hasBadge = b.id && globalAchievements.some(g => g.achievement_id === b.id && g.user_id === pin.user_id);
                        return (
                          <option key={b.id} value={b.id} disabled={hasBadge}>
                            {b.label} {hasBadge ? '(Bereits freigeschaltet ✓)' : ''}
                          </option>
                        );
                      })}
                    </select>`;

code = code.replace(selectOld, selectNew);

// 7. Update Users Tab: Estimate Creation Date from Auth or from their first Pin (since profiles doesn't have created_at)
const userRenderOld = `                        <div className="bg-gray-50 p-2 rounded-xl text-center">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Sticker</p>
                          <p className="font-black text-gray-800">{userPins.length}</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded-xl text-center">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Letzter</p>
                          <p className="font-black text-gray-800 text-xs mt-1">{lastActive}</p>
                        </div>`;

const userRenderNew = `                        <div className="bg-gray-50 p-2 rounded-xl text-center">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Sticker</p>
                          <p className="font-black text-gray-800">{userPins.length}</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded-xl text-center">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Dabei seit</p>
                          <p className="font-black text-gray-800 text-xs mt-1">{userPins.length > 0 ? new Date(Math.min(...userPins.map(p => new Date(p.created_at)))).toLocaleDateString() : 'Unbekannt'}</p>
                        </div>`;

code = code.replace(userRenderOld, userRenderNew);

fs.writeFileSync('src/AdminView.jsx', code);
