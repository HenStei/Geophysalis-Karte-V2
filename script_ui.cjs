const fs = require('fs');
let content = fs.readFileSync('src/MapView.jsx', 'utf8');

// Insert Avatar
const avatarTarget = `{(devMode || hasUrbanLegend) && <button onClick={() => setEditAvatar('alien')} className={\`w-10 h-10 rounded-lg flex items-center justify-center transition overflow-hidden \${editAvatar === 'alien' ? 'ring-2 ring-purple-500' : 'border border-gray-200 hover:opacity-80 ring-2 ring-transparent'}\`}><img src="/badges/avatar_retro.jpg" className="w-full h-full object-cover" /></button>}`;
const avatarReplacement = avatarTarget + `
                        {(devMode || hasMay4) && <button onClick={() => setEditAvatar('may4')} className={\`w-10 h-10 rounded-lg flex items-center justify-center transition overflow-hidden \${editAvatar === 'may4' ? 'ring-2 ring-purple-500' : 'border border-gray-200 hover:opacity-80 ring-2 ring-transparent'}\`}><img src="/badges/avatar_may4.jpg" className="w-full h-full object-cover" /></button>}`;
content = content.replace(avatarTarget, avatarReplacement);


// Insert Badges into Trophäenschrank
const badgesBlock = `

                <div className={\`flex items-center gap-4 p-3 rounded-2xl transition shadow-sm \${(devMode || hasPi) ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}\`}>
                  <div className={\`w-14 h-14 rounded-xl overflow-hidden shrink-0 \${(devMode || hasPi) ? 'ring-2 ring-yellow-400 shadow-md' : 'border-2 border-gray-300'}\`}>
                    <img src="/badges/badge_pi.jpg" alt="PI" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {(devMode || hasPi) ? 'PI (3,14) ✅' : '??? (Mathematiker)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {(devMode || hasPi) ? <>Auf dem 3,14 Längen- oder Breitengrad geklebt.<br/>{getUnlockDate('pi') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('pi')}</span>}</> : 'Nur für wahre Geeks und Nerds...'}
                    </p>
                  </div>
                </div>

                <div className={\`flex items-center gap-4 p-3 rounded-2xl transition shadow-sm \${(devMode || hasMay4) ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}\`}>
                  <div className={\`w-14 h-14 rounded-xl overflow-hidden shrink-0 \${(devMode || hasMay4) ? 'ring-2 ring-green-400 shadow-md' : 'border-2 border-gray-300'}\`}>
                    <img src="/badges/badge_may4.jpg" alt="May the 4th" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {(devMode || hasMay4) ? 'May the 4th be with you ✅' : '??? (Sci-Fi Fan)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {(devMode || hasMay4) ? <>Am 4. Mai geklebt. Schaltet einen galaktischen Meister frei!<br/>{getUnlockDate('may4') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('may4')}</span>}</> : 'Spüre die Macht an einem ganz bestimmten Tag im Mai...'}
                    </p>
                  </div>
                </div>

                <div className={\`flex items-center gap-4 p-3 rounded-2xl transition shadow-sm \${(devMode || hasLove) ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}\`}>
                  <div className={\`w-14 h-14 rounded-xl overflow-hidden shrink-0 \${(devMode || hasLove) ? 'ring-2 ring-red-400 shadow-md' : 'border-2 border-gray-300'}\`}>
                    <img src="/badges/badge_love.jpg" alt="True Love" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {(devMode || hasLove) ? 'True Love ✅' : '??? (Romantiker)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {(devMode || hasLove) ? <>Am Valentinstag (14. Feb) geklebt.<br/>{getUnlockDate('love') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('love')}</span>}</> : 'Die Liebe liegt in der Luft... und auf der Karte.'}
                    </p>
                  </div>
                </div>

                <div className={\`flex items-center gap-4 p-3 rounded-2xl transition shadow-sm \${(devMode || hasSilvester) ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}\`}>
                  <div className={\`w-14 h-14 rounded-xl overflow-hidden shrink-0 \${(devMode || hasSilvester) ? 'ring-2 ring-blue-400 shadow-md' : 'border-2 border-gray-300'}\`}>
                    <img src="/badges/badge_silvester.jpg" alt="Silvester" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {(devMode || hasSilvester) ? 'Frohes Neues! ✅' : '??? (Feuerwerk)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {(devMode || hasSilvester) ? <>An Silvester oder Neujahr geklebt.<br/>{getUnlockDate('silvester') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('silvester')}</span>}</> : 'Lass es knallen zum Jahreswechsel!'}
                    </p>
                  </div>
                </div>

                <div className={\`flex items-center gap-4 p-3 rounded-2xl transition shadow-sm \${(devMode || hasNz) ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}\`}>
                  <div className={\`w-14 h-14 rounded-xl overflow-hidden shrink-0 \${(devMode || hasNz) ? 'ring-2 ring-yellow-500 shadow-md' : 'border-2 border-gray-300'}\`}>
                    <img src="/badges/badge_nz.jpg" alt="Neuseeland" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {(devMode || hasNz) ? 'One Geophysalis to rule them all ✅' : '??? (Neuseeland)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {(devMode || hasNz) ? <>In Neuseeland (Mittelerde) geklebt.<br/>{getUnlockDate('nz') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('nz')}</span>}</> : 'Wirf den Ring ins Feuer...'}
                    </p>
                  </div>
                </div>

                <div className={\`flex items-center gap-4 p-3 rounded-2xl transition shadow-sm \${(devMode || hasUshuaia) ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}\`}>
                  <div className={\`w-14 h-14 rounded-xl overflow-hidden shrink-0 \${(devMode || hasUshuaia) ? 'ring-2 ring-teal-400 shadow-md' : 'border-2 border-gray-300'}\`}>
                    <img src="/badges/badge_ushuaia.jpg" alt="Auge des Sturms" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {(devMode || hasUshuaia) ? 'Im Auge des Sturms ✅' : '??? (Feuerland)'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {(devMode || hasUshuaia) ? <>Am Südzipfel von Argentinien (Ushuaia) geklebt.<br/>{getUnlockDate('ushuaia') && <span className="text-[9px] text-gray-400 mt-0.5 block">Freigeschaltet am {getUnlockDate('ushuaia')}</span>}</> : 'Das Ende der Welt im tiefen Süden...'}
                    </p>
                  </div>
                </div>
`;

const insertTarget = `<div className={\`flex items-center gap-4 p-3 rounded-2xl transition shadow-sm \${devMode || hasWorldTraveler ? 'bg-white' : 'opacity-40 grayscale bg-gray-100'}\`}>`;
content = content.replace(insertTarget, badgesBlock + insertTarget);

fs.writeFileSync('src/MapView.jsx', content);
