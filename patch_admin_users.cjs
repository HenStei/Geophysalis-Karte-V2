const fs = require('fs');
let code = fs.readFileSync('src/AdminView.jsx', 'utf8');

// 1. Add Users to imports
code = code.replace(/import \{ ArrowLeft, CheckCircle, Trash2, MapPin, Clock, Check, Globe, Lock \} from 'lucide-react';/, 
  `import { ArrowLeft, CheckCircle, Trash2, MapPin, Clock, Check, Globe, Lock, Users } from 'lucide-react';`);

// 2. Add State for Users
code = code.replace(/const \[loadingCodes, setLoadingCodes\] = useState\(false\);/, 
  `const [loadingCodes, setLoadingCodes] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsersList(data);
    setLoadingUsers(false);
  };`);

// 3. Add to useEffect
code = code.replace(/if \(activeTab === 'codes'\) \{[\s\S]*?fetchInviteCodes\(\);[\s\S]*?\}/, 
  `if (activeTab === 'codes') {
      fetchInviteCodes();
    }
    if (activeTab === 'users') {
      fetchUsers();
    }`);

// 4. Change the "Nutzer gesamt" tab to be clickable
const oldUserTab = `<div className="bg-white p-5 rounded-3xl border-2 border-transparent shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nutzer gesamt</p>
                <h3 className="text-3xl font-black text-gray-900">{totalUsers}</h3>
              </div>
              <div className="bg-purple-100 p-2.5 rounded-2xl"><CheckCircle className="text-purple-600" size={20} /></div>
            </div>
          </div>`;

const newUserTab = `<div onClick={() => setActiveTab('users')} className={\`cursor-pointer bg-white p-5 rounded-3xl border-2 transition-all shadow-sm \${activeTab === 'users' ? 'border-orange-500 ring-4 ring-orange-50' : 'border-transparent hover:border-gray-200'}\`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nutzer gesamt</p>
                <h3 className="text-3xl font-black text-gray-900">{totalUsers}</h3>
              </div>
              <div className="bg-orange-100 p-2.5 rounded-2xl"><Users className="text-orange-600" size={20} /></div>
            </div>
          </div>`;

code = code.replace(oldUserTab, newUserTab);

// 5. Add UI logic for users tab
const oldConditional = `{/* Conditional Tab Rendering */}
        {activeTab === 'codes' ? (`;

const newConditional = `{/* Conditional Tab Rendering */}
        {activeTab === 'users' ? (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                Nutzerverwaltung
                <span className="bg-orange-100 text-orange-700 py-0.5 px-2.5 rounded-full text-sm">{usersList.length}</span>
              </h2>
            </div>
            
            {loadingUsers ? (
              <p className="text-gray-500">Lade Nutzer...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {usersList.map(user => {
                  const userPins = pins.filter(p => p.user_id === user.id);
                  const lastActive = userPins.length > 0 ? new Date(Math.max(...userPins.map(p => new Date(p.created_at)))).toLocaleDateString() : 'Nie';
                  
                  return (
                    <div key={user.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 flex flex-col hover:shadow-lg transition">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl shrink-0">
                          {user.is_approved ? '👤' : '🔒'}
                        </div>
                        <div className="overflow-hidden">
                          <h3 className="font-black text-gray-900 truncate" title={user.nickname || 'Kein Name'}>{user.nickname || 'Kein Name'}</h3>
                          <p className="text-[10px] text-gray-400 font-mono truncate">{user.id}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="bg-gray-50 p-2 rounded-xl text-center">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Sticker</p>
                          <p className="font-black text-gray-800">{userPins.length}</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded-xl text-center">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Letzter</p>
                          <p className="font-black text-gray-800 text-xs mt-1">{lastActive}</p>
                        </div>
                      </div>

                      <div className="mt-auto pt-4 border-t border-gray-50">
                        {user.is_approved ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold bg-green-50 text-green-600 border border-green-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Freigeschaltet
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold bg-yellow-50 text-yellow-600 border border-yellow-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span> Geschlossen
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {usersList.length === 0 && <p className="col-span-full text-center text-gray-500 py-8 font-medium">Keine Nutzer gefunden.</p>}
              </div>
            )}
          </div>
        ) : activeTab === 'codes' ? (`;

code = code.replace(oldConditional, newConditional);

fs.writeFileSync('src/AdminView.jsx', code);
