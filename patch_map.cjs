const fs = require('fs');
let code = fs.readFileSync('src/MapView.jsx', 'utf8');

// 1. Fix fetchProfile
code = code.replace(/const fetchProfile = async \(userId\) => \{[\s\S]*?if \(!newProfile\.is_approved\) setShowInviteModal\(true\);\s*\}\s*\}\s*\};/m, 
`const fetchProfile = async (userId) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    let currentProfile = data;
    if (!currentProfile) {
      const { data: newProfile } = await supabase.from('profiles').insert({ id: userId }).select().single();
      currentProfile = newProfile;
    }
    if (currentProfile) {
      setProfile(currentProfile);
      if (!currentProfile.is_approved) setShowInviteModal(true);
    }
  };`);

// 2. Add Delete Account button in settings tab
code = code.replace(/<button onClick=\{\(\) => \{ supabase\.auth\.signOut\(\); setIsAuthModalOpen\(false\); \}\} className="w-full bg-white border-2 border-red-100 text-red-500 font-bold py-3 rounded-2xl hover:bg-red-50 transition">\s*Abmelden\s*<\/button>\s*<\/div>\s*\)}/m, 
`<button onClick={() => { supabase.auth.signOut(); setIsAuthModalOpen(false); }} className="w-full bg-white border-2 border-red-100 text-red-500 font-bold py-3 rounded-2xl hover:bg-red-50 transition">
                      Abmelden
                    </button>
                    
                    <div className="mt-4 pt-4 border-t border-red-100">
                      <p className="text-xs text-gray-500 mb-2 font-bold uppercase tracking-wider">Gefahrenzone</p>
                      <button onClick={async () => { 
                        if(window.confirm('Willst du deinen Account wirklich unwiderruflich löschen? Deine Sticker bleiben anonymisiert erhalten.')) {
                          // Lösche das Profil aus der DB.
                          await supabase.from('profiles').delete().eq('id', session.user.id);
                          await supabase.auth.signOut();
                          setIsAuthModalOpen(false);
                          window.location.reload();
                        }
                      }} className="w-full text-xs bg-red-50 text-red-600 font-bold py-2 rounded-xl hover:bg-red-100 transition">
                        Account löschen
                      </button>
                    </div>
                  </div>
                )}`);

fs.writeFileSync('src/MapView.jsx', code);
