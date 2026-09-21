const fs = require('fs');
let content = fs.readFileSync('src/MapView.jsx', 'utf8');

// Inject activeFrame state
content = content.replace(
  "const [editAvatar, setEditAvatar] = useState('default');",
  "const [editAvatar, setEditAvatar] = useState('default');\n  const [activeFrame, setActiveFrame] = useState('none');"
);

// Inject Frame Selection UI inside the Profile Modal
const modalTarget = `{/* Avatar Auswahl */}`;
const frameUI = `
                {/* Rahmen Auswahl */}
                <div className="mb-6">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Avatar-Rahmen</p>
                  <div className="flex gap-4">
                    <button onClick={() => setActiveFrame('none')} className={\`px-3 py-1.5 rounded-lg text-sm font-bold transition \${activeFrame === 'none' ? 'bg-gray-200 text-gray-800' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}\`}>
                      Ohne
                    </button>
                    {(devMode || hasMarathon) && (
                      <button onClick={() => setActiveFrame('fire')} className={\`px-3 py-1.5 rounded-lg text-sm font-bold transition \${activeFrame === 'fire' ? 'bg-orange-100 text-orange-600 ring-2 ring-orange-500' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}\`}>
                        🔥 Feuer
                      </button>
                    )}
                    {(devMode || hasUshuaia) && (
                      <button onClick={() => setActiveFrame('wind')} className={\`px-3 py-1.5 rounded-lg text-sm font-bold transition \${activeFrame === 'wind' ? 'bg-cyan-100 text-cyan-600 ring-2 ring-cyan-500' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}\`}>
                        🌪️ Sturm
                      </button>
                    )}
                  </div>
                </div>

`;
content = content.replace(modalTarget, frameUI + modalTarget);

// Update Avatar Render (Top Right)
const topAvatarTarget = `<div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 cursor-pointer ring-2 ring-gray-200 hover:ring-blue-500 transition-all hover:scale-105 shadow-md">
          <img src={avatarSrc} alt="Profil" className="w-full h-full object-cover" />
        </div>`;
const topAvatarReplacement = `<div className={\`avatar-wrapper \${activeFrame !== 'none' ? 'frame-' + activeFrame : ''} shrink-0 cursor-pointer ring-2 ring-gray-200 hover:ring-blue-500 transition-all hover:scale-105 shadow-md rounded-xl\`}>
          <div className="w-10 h-10 sm:w-12 sm:h-12 overflow-hidden rounded-xl">
            <img src={avatarSrc} alt="Profil" className="w-full h-full object-cover" />
          </div>
        </div>`;
content = content.replace(topAvatarTarget, topAvatarReplacement);

// Update Avatar Render (Inside Profile Modal Header)
const modalAvatarTarget = `<div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 ring-4 ring-gray-100 shadow-inner">
                  <img src={avatarSrc} alt="Profil" className="w-full h-full object-cover" />
                </div>`;
const modalAvatarReplacement = `<div className={\`avatar-wrapper \${activeFrame !== 'none' ? 'frame-' + activeFrame : ''} shrink-0 ring-4 ring-gray-100 shadow-inner rounded-2xl\`}>
                  <div className="w-20 h-20 overflow-hidden rounded-2xl">
                    <img src={avatarSrc} alt="Profil" className="w-full h-full object-cover" />
                  </div>
                </div>`;
content = content.replace(modalAvatarTarget, modalAvatarReplacement);


fs.writeFileSync('src/MapView.jsx', content);
