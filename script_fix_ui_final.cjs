const fs = require('fs');
let c = fs.readFileSync('src/MapView.jsx', 'utf8');

const oldPioneerBlock = `<div className={\`flex items-center gap-4 p-3 rounded-full transition shadow-sm \${hasPioneer ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}\`}>
                  <div className={\`w-14 h-14 rounded-full overflow-hidden shrink-0 \${hasPioneer ? 'ring-2 ring-yellow-400 shadow-md' : 'border-2 border-gray-300'}\`}>
                    <img src="/badges/badge_pioneer.jpg" alt="Pionier" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {hasPioneer ? 'Pionier der ersten Stunde 🌟' : 'Pionier der ersten Stunde (Limit: 15)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {hasPioneer ? <>Du gehörst zu den ersten 15 Nutzern weltweit! Danke für deine Unterstützung.<br/>{getUnlockDate('pioneer') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('pioneer')}</span>}</> : 'Streng limitiert auf die exakt ersten 15 Nutzer weltweit.'}
                    </p>
                  </div>
                </div>`;

const newPioneerBlock = `<div className={\`flex items-center gap-4 p-3 rounded-full transition shadow-sm \${hasPioneer ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}\`}>
                  <div className={\`w-14 h-14 rounded-full overflow-hidden shrink-0 \${hasPioneer ? 'ring-2 ring-yellow-400 shadow-md' : 'border-2 border-gray-300'}\`}>
                    <img src="/badges/badge_pioneer.jpg" alt="Pionier" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {hasPioneer ? \`Pionier der ersten Stunde (No. \${myPioneerRank || '?'}/15) 🌟\` : 'Pionier der ersten Stunde (Limit: 15)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {hasPioneer ? <>Du gehörst zu den ersten 15 Nutzern weltweit! Danke für deine Unterstützung.<br/>{getUnlockDate('pioneer') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('pioneer')}</span>}</> : 'Streng limitiert auf die exakt ersten 15 Nutzer weltweit.'}
                    </p>
                  </div>
                </div>`;

c = c.replace(oldPioneerBlock, newPioneerBlock);

const popupTarget = `{/* Leaderboard Modal */}`;
const popupBlock = `
      {/* Animated Achievement Popup */}
      {unlockedAchievements.length > 0 && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-[bounce_1s_ease-in-out]">
            <div className="text-6xl mb-4 drop-shadow-lg">{unlockedAchievements[0].icon}</div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Meilenstein erreicht!</h2>
            <h3 className="text-lg font-bold text-purple-600 mb-4">{unlockedAchievements[0].title}</h3>
            <p className="text-gray-600 font-medium mb-8 leading-relaxed">{unlockedAchievements[0].text}</p>
            <button 
              onClick={() => setUnlockedAchievements(prev => prev.slice(1))}
              className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 transition transform hover:scale-105"
            >
              Genial!
            </button>
          </div>
        </div>
      )}

      `;
c = c.replace(popupTarget, popupBlock + popupTarget);

fs.writeFileSync('src/MapView.jsx', c);
