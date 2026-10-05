const fs = require('fs');

const adminFile = 'src/AdminView.jsx';
const mapFile = 'src/MapView.jsx';

let adminContent = fs.readFileSync(adminFile, 'utf8');
let mapContent = fs.readFileSync(mapFile, 'utf8');

// --- PATCH ADMINVIEW ---
// 1. Add state for codes
if (!adminContent.includes('const [inviteCodes, setInviteCodes] = useState([]);')) {
    adminContent = adminContent.replace(
        "const [activeTab, setActiveTab] = useState('pending');",
        "const [activeTab, setActiveTab] = useState('pending');\n  const [inviteCodes, setInviteCodes] = useState([]);\n  const [loadingCodes, setLoadingCodes] = useState(false);"
    );
}

// 2. Add fetch logic for codes
if (!adminContent.includes('fetchInviteCodes')) {
    const fetchLogic = `
  const fetchInviteCodes = async () => {
    setLoadingCodes(true);
    const { data, error } = await supabase.from('invite_codes').select('*').order('created_at', { ascending: false });
    if (data) setInviteCodes(data);
    setLoadingCodes(false);
  };

  const generateCode = async () => {
    const randomCode = 'GEO-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const { error } = await supabase.from('invite_codes').insert({ code: randomCode });
    if (!error) fetchInviteCodes();
  };

  const deleteCode = async (code) => {
    const { error } = await supabase.from('invite_codes').delete().eq('code', code);
    if (!error) fetchInviteCodes();
  };

  useEffect(() => {
    if (activeTab === 'codes') {
      fetchInviteCodes();
    }
  }, [activeTab]);
`;
    adminContent = adminContent.replace(
      "const fetchStats = async () => {",
      fetchLogic + "\n  const fetchStats = async () => {"
    );
}

// 3. Add Tab Button
if (!adminContent.includes(`onClick={() => setActiveTab('codes')}`)) {
    adminContent = adminContent.replace(
        /<div onClick=\{\(\) => setActiveTab\('approved'\)\}.*?<\/div>[\s]*<\/div>/s,
        `$&
          <div onClick={() => setActiveTab('codes')} className={\`cursor-pointer bg-white p-5 rounded-3xl border-2 transition-all shadow-sm \${activeTab === 'codes' ? 'border-purple-500 ring-4 ring-purple-50' : 'border-transparent hover:border-gray-200'}\`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Codes</p>
                <h3 className="text-3xl font-black text-gray-900">{inviteCodes.length > 0 ? inviteCodes.length : '-'}</h3>
              </div>
              <div className="bg-purple-100 p-2.5 rounded-2xl"><Lock className="text-purple-600" size={20} /></div>
            </div>
          </div>`
    );
}

// 4. Add Codes Tab Content
if (!adminContent.includes(`activeTab === 'codes'`)) {
    adminContent = adminContent.replace(
        "{/* Grid Section */}",
        `{activeTab === 'codes' && (
          <div className="bg-white p-6 rounded-3xl shadow-sm mb-6 border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Einladungscodes</h2>
              <button onClick={generateCode} className="bg-purple-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-purple-700 transition flex items-center gap-2 shadow-md">
                <Sparkles size={18} /> Neuen Code generieren
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {inviteCodes.map(code => (
                <div key={code.code} className={\`p-4 rounded-2xl border-2 flex justify-between items-center \${code.is_used ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-purple-50 border-purple-200'}\`}>
                  <div>
                    <p className="font-mono font-bold text-lg text-gray-900">{code.code}</p>
                    <p className="text-xs font-bold text-gray-500 mt-1">{code.is_used ? 'Verbraucht' : 'Gültig & Unbenutzt'}</p>
                  </div>
                  <button onClick={() => deleteCode(code.code)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
              {inviteCodes.length === 0 && <p className="text-gray-500 col-span-full">Keine Codes vorhanden.</p>}
            </div>
          </div>
        )}
        
        {activeTab !== 'codes' && (
        <>
        {/* Grid Section */}`
    );
    
    adminContent = adminContent.replace(
      "</div>\n      </div>\n    </div>\n  );\n}",
      "</div>\n      </>\n      )}\n      </div>\n    </div>\n  );\n}"
    );
}

fs.writeFileSync(adminFile, adminContent);

// --- PATCH MAPVIEW ---
// 1. Add states
if (!mapContent.includes('const [showInviteModal, setShowInviteModal] = useState(false);')) {
    mapContent = mapContent.replace(
        "const [session, setSession] = useState(null);",
        "const [session, setSession] = useState(null);\n  const [showInviteModal, setShowInviteModal] = useState(false);\n  const [inviteCodeInput, setInviteCodeInput] = useState('');\n  const [inviteError, setInviteError] = useState('');"
    );
}

// 2. Modify fetchProfile
if (!mapContent.includes('if (!data.is_approved) setShowInviteModal(true);')) {
    mapContent = mapContent.replace(
        "if (data) {\n        setProfile(data);\n      }",
        "if (data) {\n        setProfile(data);\n        if (!data.is_approved) setShowInviteModal(true);\n      }"
    );
    mapContent = mapContent.replace(
        "if (newProfile) setProfile(newProfile);",
        "if (newProfile) {\n          setProfile(newProfile);\n          if (!newProfile.is_approved) setShowInviteModal(true);\n        }"
    );
}

// 3. Add Submit Code logic
if (!mapContent.includes('const submitInviteCode = async ()')) {
    const inviteLogic = `
  const submitInviteCode = async () => {
    setInviteError('');
    if (!inviteCodeInput.trim()) return setInviteError('Bitte Code eingeben');
    
    // Check if code exists and is unused
    const { data: codeData, error: codeError } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', inviteCodeInput.trim())
      .eq('is_used', false)
      .single();
      
    if (codeError || !codeData) {
      return setInviteError('Code ungültig oder bereits verbraucht.');
    }
    
    // Mark code as used
    await supabase.from('invite_codes').update({ is_used: true, used_by: session.user.id, used_at: new Date() }).eq('code', codeData.code);
    
    // Approve user
    await supabase.from('profiles').update({ is_approved: true }).eq('id', session.user.id);
    
    setProfile(prev => ({ ...prev, is_approved: true }));
    setShowInviteModal(false);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };
`;
    mapContent = mapContent.replace(
      "const [draftPin, setDraftPin] = useState(null);",
      inviteLogic + "\n  const [draftPin, setDraftPin] = useState(null);"
    );
}

// 4. Add the JSX for the Invite Modal
if (!mapContent.includes('id="invite-modal"')) {
    const modalJSX = `
      {showInviteModal && session && (
        <div id="invite-modal" className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-tr from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                <Lock size={32} className="text-purple-600" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">Geschlossene Beta</h2>
              <p className="text-gray-500 text-sm">Diese App ist privat. Bitte gib deinen persönlichen Einladungscode ein, um deinen Account freizuschalten.</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <input 
                  type="text" 
                  placeholder="Einladungscode (z.B. GEO-XYZ)" 
                  value={inviteCodeInput}
                  onChange={e => setInviteCodeInput(e.target.value.toUpperCase())}
                  className="w-full bg-gray-50 border-2 border-gray-200 text-center text-lg font-mono font-bold rounded-2xl p-4 focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition"
                />
                {inviteError && <p className="text-red-500 text-xs font-bold text-center mt-2">{inviteError}</p>}
              </div>
              
              <button 
                onClick={submitInviteCode}
                className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl hover:bg-gray-800 transition shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
              >
                <Sparkles size={20} /> Account Freischalten
              </button>
              
              <button 
                onClick={() => { supabase.auth.signOut(); setShowInviteModal(false); }}
                className="w-full text-gray-400 text-sm font-bold py-2 hover:text-gray-600 transition"
              >
                Abbrechen & Ausloggen
              </button>
            </div>
          </div>
        </div>
      )}
`;
    mapContent = mapContent.replace(
      "{/* Modals & Overlays */}",
      "{/* Modals & Overlays */}\n" + modalJSX
    );
}

fs.writeFileSync(mapFile, mapContent);
console.log('PATCH SUCCESSFUL');
