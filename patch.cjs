const fs = require('fs');
let code = fs.readFileSync('src/MapView.jsx', 'utf8');
code = code.replace('{/* Profile Modal */}', `      {/* Invite Modal */}
      {session && showInviteModal && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 bg-black">
          <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0">
            <source src="/landingpage.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-0"></div>
          <div className="bg-black/60 backdrop-blur-xl rounded-3xl w-full max-w-sm p-8 shadow-2xl relative z-10 border border-white/10 text-center">
            
            <Shield size={40} className="text-yellow-500 mx-auto mb-3" />
            <h2 className="text-2xl font-black text-white mb-2 drop-shadow-md">Closed Beta</h2>
            <p className="text-sm text-gray-300 mb-6 drop-shadow-sm">Bitte gib deinen Einladungscode ein, um freigeschaltet zu werden.</p>
            
            <input 
              type="text" 
              placeholder="Code eingeben"
              value={inviteCodeInput}
              onChange={e => setInviteCodeInput(e.target.value.toUpperCase())}
              className="w-full text-center tracking-widest text-lg font-bold bg-white/10 border border-white/20 text-white placeholder-gray-400 py-3 rounded-full mb-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition"
            />
            {inviteError && <p className="text-xs text-red-400 font-bold mb-4">{inviteError}</p>}
            {!inviteError && <div className="h-4 mb-4"></div>}
            
            <button 
              onClick={submitInviteCode}
              className="w-full bg-yellow-500 text-black font-black py-3 rounded-full hover:bg-yellow-400 transition mb-4"
            >
              Code einlösen
            </button>
            <button onClick={() => supabase.auth.signOut()} className="text-xs text-gray-400 hover:text-white transition underline">Abmelden</button>
          </div>
        </div>
      )}

      {/* Profile Modal */}`);
fs.writeFileSync('src/MapView.jsx', code);
