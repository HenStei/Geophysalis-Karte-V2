const fs = require('fs');
let code = fs.readFileSync('src/AdminView.jsx', 'utf8');

// 1. Fetch users and global achievements globally on load
const newInitCall = `      if (session) { fetchAllPins(); fetchStats(); fetchUsers(); fetchGlobalAchievements(); }`;
code = code.replace(/if \(session\) \{ fetchAllPins\(\); fetchStats\(\); \}/g, newInitCall);

// Need to also inject fetchGlobalAchievements definition right before useEffect
const fetchGlobalDef = `  const fetchGlobalAchievements = async () => {
    const { data } = await supabase.from('global_achievements').select('*');
    if (data) setGlobalAchievements(data);
  };

  useEffect(() => {`;
code = code.replace(/  useEffect\(\(\) => \{/, fetchGlobalDef);

// 2. Update pin render to show name
const pinRenderPattern = /<div className="p-5 flex flex-col flex-grow">\s*<div className="mb-4">/g;
const newPinRender = `<div className="p-5 flex flex-col flex-grow">
                <div className="mb-4">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-black text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">
                      👤 {usersList.find(u => u.id === pin.user_id)?.nickname || 'Unbekannt'}
                    </p>
                  </div>`;
code = code.replace(pinRenderPattern, newPinRender);

// 3. Update select to disable if badge granted
const selectPattern = /<select[\s\S]*?className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-xl p-2\.5 focus:ring-blue-500 focus:border-blue-500 font-bold outline-none"[\s\S]*?onChange=\{\(e\) => setSelectedBadges\(\{\.\.\.selectedBadges, \[pin\.id\]: e\.target\.value\}\)\}\s*>\s*\{SPECIAL_BADGES\.map\(b => \(\s*<option key=\{b\.id\} value=\{b\.id\}>\{b\.label\}<\/option>\s*\)\)\}\s*<\/select>/g;

const newSelect = `<select
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

code = code.replace(selectPattern, newSelect);

fs.writeFileSync('src/AdminView.jsx', code);
