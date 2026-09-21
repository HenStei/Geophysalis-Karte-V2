const fs = require('fs');
let c = fs.readFileSync('src/MapView.jsx', 'utf8');

const oldStr = `<div className={\`flex items-center gap-4 p-3 rounded-full transition shadow-sm \${hasRetroGamer ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}\`}>`;
const newStr = `
                <div className={\`flex items-center gap-4 p-3 rounded-full transition shadow-sm \${hasPioneer ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}\`}>
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
                </div>

                ` + oldStr;

c = c.replace(oldStr, newStr);
fs.writeFileSync('src/MapView.jsx', c);
