const fs = require('fs');
let content = fs.readFileSync('src/MapView.jsx', 'utf8');

const oldTopAvatar = `<div className={\`avatar-wrapper \${activeFrame !== 'none' ? 'frame-' + activeFrame : ''} shrink-0 cursor-pointer ring-2 ring-gray-200 hover:ring-blue-500 transition-all hover:scale-105 shadow-md rounded-xl\`}>
          <div className="w-10 h-10 sm:w-12 sm:h-12 overflow-hidden rounded-xl">
            <img src={avatarSrc} alt="Profil" className="w-full h-full object-cover" />
          </div>
        </div>`;

const newTopAvatar = `<div className={\`relative shrink-0 cursor-pointer transition-all hover:scale-105 shadow-md rounded-xl \${activeFrame === 'none' ? 'ring-2 ring-gray-200 hover:ring-blue-500' : ''}\`} onClick={() => setShowProfile(!showProfile)}>
          {activeFrame === 'fire' && <div className="absolute -inset-1.5 bg-gradient-to-tr from-red-600 via-orange-500 to-yellow-400 rounded-2xl animate-pulse blur-[2px] shadow-[0_0_15px_rgba(255,69,0,0.8)]" style={{ zIndex: -1 }}></div>}
          {activeFrame === 'wind' && <div className="absolute -inset-2 border-[3px] border-dashed border-cyan-400 rounded-[20px] animate-[spin_3s_linear_infinite] opacity-80 shadow-[0_0_10px_#00ffff]" style={{ zIndex: -1 }}></div>}
          {activeFrame === 'wind' && <div className="absolute -inset-3.5 border-[2px] border-dotted border-white rounded-[24px] animate-[spin_4s_linear_infinite_reverse] opacity-60" style={{ zIndex: -1 }}></div>}
          <div className="w-10 h-10 sm:w-12 sm:h-12 overflow-hidden rounded-xl bg-white relative z-10">
            <img src={avatarSrc} alt="Profil" className="w-full h-full object-cover" />
          </div>
        </div>`;

if(content.includes(oldTopAvatar)) {
  content = content.replace(oldTopAvatar, newTopAvatar);
} else {
  console.log("Could not find top avatar block");
}


const oldModalAvatar = `<div className={\`avatar-wrapper \${activeFrame !== 'none' ? 'frame-' + activeFrame : ''} shrink-0 ring-4 ring-gray-100 shadow-inner rounded-2xl\`}>
                  <div className="w-20 h-20 overflow-hidden rounded-2xl">
                    <img src={avatarSrc} alt="Profil" className="w-full h-full object-cover" />
                  </div>
                </div>`;

const newModalAvatar = `<div className="relative shrink-0 shadow-inner rounded-2xl">
                  {activeFrame === 'fire' && <div className="absolute -inset-2 bg-gradient-to-tr from-red-600 via-orange-500 to-yellow-400 rounded-[20px] animate-pulse blur-[3px] shadow-[0_0_20px_rgba(255,69,0,0.8)]" style={{ zIndex: -1 }}></div>}
                  {activeFrame === 'wind' && <div className="absolute -inset-3 border-[4px] border-dashed border-cyan-400 rounded-[24px] animate-[spin_3s_linear_infinite] opacity-80 shadow-[0_0_15px_#00ffff]" style={{ zIndex: -1 }}></div>}
                  {activeFrame === 'wind' && <div className="absolute -inset-5 border-[3px] border-dotted border-white rounded-[32px] animate-[spin_4s_linear_infinite_reverse] opacity-60" style={{ zIndex: -1 }}></div>}
                  <div className="w-20 h-20 overflow-hidden rounded-2xl bg-white relative z-10 ring-4 ring-gray-100">
                    <img src={avatarSrc} alt="Profil" className="w-full h-full object-cover" />
                  </div>
                </div>`;

if(content.includes(oldModalAvatar)) {
  content = content.replace(oldModalAvatar, newModalAvatar);
} else {
  console.log("Could not find modal avatar block");
}

fs.writeFileSync('src/MapView.jsx', content);
