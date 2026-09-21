const fs = require('fs');
const lines = fs.readFileSync('src/MapView.jsx', 'utf8').split('\n');

// Find the end of the profile modal (line with ")}" after "Abmelden")
let profileEnd = -1;
for (let i = 1490; i < lines.length; i++) {
  if (lines[i].includes('Animated Achievement Popup')) {
    profileEnd = i - 1;
    break;
  }
}

const newModal = `      {/* Profile Modal */}
      {session && isAuthModalOpen && (
        <div className="absolute inset-0 z-[3000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setIsAuthModalOpen(false); }}>
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl relative flex flex-col" style={{maxHeight:'92vh'}}>
            <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition z-10">
              <X size={24} />
            </button>

            {/* Fixed Header */}
            <div className="p-5 pb-3 text-center shrink-0">
              <div className="relative inline-block mb-2">
                <img src={session.user.user_metadata?.avatar_url || \`https://ui-avatars.com/api/?name=\${session.user.email}&background=random\`} alt="Avatar" className="w-[72px] h-[72px] rounded-full border-4 border-white shadow-lg" />
                {hasPioneer && <span className="absolute -bottom-1 -right-1 bg-yellow-400 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow">No.{myPioneerRank}</span>}
              </div>

              {isEditingNickname ? (
                <div className="flex flex-col gap-2 mb-2">
                  <input type="text" value={tempNickname} onChange={e => setTempNickname(e.target.value)} placeholder="Nickname..." className="w-full px-4 py-2 border-2 border-blue-100 rounded-full focus:outline-none focus:border-blue-500 font-bold text-center text-sm" maxLength={20} />
                  <div className="flex gap-2">
                    <button onClick={() => setIsEditingNickname(false)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-2 rounded-full text-xs">Abbrechen</button>
                    <button onClick={async () => { if (tempNickname.trim().length < 3) return alert('Nickname zu kurz!'); const { error } = await supabase.from('profiles').update({ nickname: tempNickname.trim() }).eq('id', session.user.id); if (!error) { setProfile({ ...profile, nickname: tempNickname.trim() }); setIsEditingNickname(false); } else alert('Name schon vergeben!'); }} className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-full text-xs">Speichern</button>
                  </div>
                </div>
              ) : (
                <div className="mb-2">
                  <h2 className="text-lg font-black text-gray-900">{profile?.nickname || 'Kein Nickname'}</h2>
                  <button onClick={() => { setTempNickname(profile?.nickname || ''); setIsEditingNickname(true); }} className="text-blue-500 text-xs font-bold hover:underline">Nickname \\u00e4ndern</button>
                </div>
              )}

              {/* Stats Bar */}
              <div className="flex items-stretch justify-center mb-3 bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                <div className="flex-1 text-center py-3">
                  <p className="text-xl font-black text-gray-900">{myPins.length}</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Sticker</p>
                </div>
                <div className="w-px bg-gray-200"/>
                <div className="flex-1 text-center py-3">
                  <p className="text-xl font-black text-gray-900">{totalDistanceKm > 999 ? \`\${(totalDistanceKm/1000).toFixed(1)}k\` : totalDistanceKm}</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">km Reise</p>
                </div>
                <div className="w-px bg-gray-200"/>
                <div className="flex-1 text-center py-3">
                  <p className="text-xl font-black text-gray-900">{uniqueCountries.size}</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">L\\u00e4nder</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex bg-gray-100 rounded-2xl p-1">
                {[['profil','\\u{1F464} Profil'],['abzeichen','\\u{1F3C6} Abzeichen'],['\u2699\uFE0F','\\u2699\\uFE0F Einst.']].map(([tab, label]) => (
                  <button key={tab} onClick={() => setProfileTab(tab)} className={\`flex-1 py-2 rounded-xl text-xs font-bold transition \${profileTab === tab ? 'bg-white shadow text-gray-900' : 'text-gray-400 hover:text-gray-700'}\`}>{label}</button>
                ))}
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto custom-scrollbar flex-1 p-5 pt-3 flex flex-col gap-4">

              {/* TAB: PROFIL */}
              {profileTab === 'profil' && (
                <div className="bg-gray-50 rounded-2xl p-4 text-left">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Avatar & Rahmen</h3>
                  {FEATURE_AVATARS ? (
                    <div className="flex gap-4 items-start">
                      <div className={\`avatar-frame frame-\${editFrame} relative w-16 h-16 text-3xl shadow bg-white rounded-full shrink-0\`}>
                        <div className="w-full h-full overflow-hidden rounded-full flex items-center justify-center">
                          {editAvatar === 'default' ? '\\u{1F98A}' : editAvatar === 'ghost' ? '\\u{1F47B}' : editAvatar === 'bat' ? '\\u{1F987}' : editAvatar === 'reindeer' ? '\\u{1F98C}' : editAvatar === 'snowman' ? '\\u26C4' : editAvatar === 'fire' ? <img src="/badges/avatar_fire.jpg" className="w-full h-full object-cover" /> : editAvatar === 'cyberpunk' ? <img src="/badges/avatar_cyberpunk.jpg" className="w-full h-full object-cover" /> : editAvatar === 'retro' ? <img src="/badges/avatar_retro.jpg" className="w-full h-full object-cover" /> : editAvatar === 'pioneer' ? <img src="/badges/avatar_pioneer.jpg" className="w-full h-full object-cover" /> : editAvatar === 'admin' ? <img src="/badges/avatar_admin.jpg" className="w-full h-full object-cover" /> : editAvatar === 'polar' ? <img src="/badges/avatar_polar.jpg" className="w-full h-full object-cover" /> : '\\u{1F98A}'}
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Avatar</p>
                          <div className="flex flex-wrap gap-1.5">
                            <button onClick={() => setEditAvatar('default')} className={\`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition \${editAvatar === 'default' ? 'bg-purple-100 ring-2 ring-purple-500' : 'bg-white border border-gray-200'}\`}>\\u{1F98A}</button>
                            {hasHalloween && <button onClick={() => setEditAvatar('ghost')} className={\`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition \${editAvatar === 'ghost' ? 'bg-purple-100 ring-2 ring-purple-500' : 'bg-white border border-gray-200'}\`}>\\u{1F47B}</button>}
                            {hasHalloween && <button onClick={() => setEditAvatar('bat')} className={\`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition \${editAvatar === 'bat' ? 'bg-purple-100 ring-2 ring-purple-500' : 'bg-white border border-gray-200'}\`}>\\u{1F987}</button>}
                            {hasWinter && <button onClick={() => setEditAvatar('reindeer')} className={\`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition \${editAvatar === 'reindeer' ? 'bg-purple-100 ring-2 ring-purple-500' : 'bg-white border border-gray-200'}\`}>\\u{1F98C}</button>}
                            {hasWinter && <button onClick={() => setEditAvatar('snowman')} className={\`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition \${editAvatar === 'snowman' ? 'bg-purple-100 ring-2 ring-purple-500' : 'bg-white border border-gray-200'}\`}>\\u26C4</button>}
                            {hasPolarExplorer && <button onClick={() => setEditAvatar('polar')} className={\`w-9 h-9 rounded-lg overflow-hidden transition \${editAvatar === 'polar' ? 'ring-2 ring-purple-500' : 'border border-gray-200'}\`}><img src="/badges/avatar_polar.jpg" className="w-full h-full object-cover" /></button>}
                            {hasUrbanLegend && <button onClick={() => setEditAvatar('cyberpunk')} className={\`w-9 h-9 rounded-lg overflow-hidden transition \${editAvatar === 'cyberpunk' ? 'ring-2 ring-purple-500' : 'border border-gray-200'}\`}><img src="/badges/avatar_cyberpunk.jpg" className="w-full h-full object-cover" /></button>}
                            {hasRetroGamer && <button onClick={() => setEditAvatar('retro')} className={\`w-9 h-9 rounded-lg overflow-hidden transition \${editAvatar === 'retro' ? 'ring-2 ring-purple-500' : 'border border-gray-200'}\`}><img src="/badges/avatar_retro.jpg" className="w-full h-full object-cover" /></button>}
                            {hasMarathon && <button onClick={() => setEditAvatar('fire')} className={\`w-9 h-9 rounded-lg overflow-hidden transition \${editAvatar === 'fire' ? 'ring-2 ring-purple-500' : 'border border-gray-200'}\`}><img src="/badges/avatar_fire.jpg" className="w-full h-full object-cover" /></button>}
                            {hasPioneer && <button onClick={() => setEditAvatar('pioneer')} className={\`w-9 h-9 rounded-lg overflow-hidden transition \${editAvatar === 'pioneer' ? 'ring-2 ring-purple-500' : 'border border-gray-200'}\`}><img src="/badges/avatar_pioneer.jpg" className="w-full h-full object-cover" /></button>}
                            {isAdmin && <button onClick={() => setEditAvatar('admin')} className={\`w-9 h-9 rounded-lg overflow-hidden ring-2 ring-yellow-400 transition \${editAvatar === 'admin' ? 'ring-purple-500' : ''}\`}><img src="/badges/avatar_admin.jpg" className="w-full h-full object-cover" /></button>}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Rahmen</p>
                          <div className="flex flex-wrap gap-1.5">
                            <button onClick={() => setEditFrame('none')} className={\`px-2 py-1 rounded-md text-xs font-bold transition \${editFrame === 'none' ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-600'}\`}>Keiner</button>
                            {(devMode || hasUrbanLegend) && <button onClick={() => setEditFrame('neon')} className={\`px-2 py-1 rounded-md text-xs font-bold transition \${editFrame === 'neon' ? 'bg-purple-600 text-white' : 'bg-white border border-purple-200 text-purple-600'}\`}>Neon</button>}
                            {(devMode || hasPolarExplorer || hasWinter) && <button onClick={() => setEditFrame('frost')} className={\`px-2 py-1 rounded-md text-xs font-bold transition \${editFrame === 'frost' ? 'bg-cyan-500 text-white' : 'bg-white border border-cyan-200 text-cyan-600'}\`}>Frost</button>}
                            {(devMode || hasMarathon) && <button onClick={() => setEditFrame('fire')} className={\`px-2 py-1 rounded-md text-xs font-bold transition \${editFrame === 'fire' ? 'bg-orange-500 text-white' : 'bg-white border border-orange-200 text-orange-600'}\`}>Feuer</button>}
                          </div>
                        </div>
                        <button onClick={() => handleUpdateAvatarAndFrame(editAvatar, editFrame)} className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2 rounded-xl transition">Speichern</button>
                      </div>
                    </div>
                  ) : <p className="text-sm text-gray-400 text-center">Avatar-Auswahl kommt bald!</p>}
                </div>
              )}

              {/* TAB: ABZEICHEN */}
              {profileTab === 'abzeichen' && (
                <div className="flex flex-col gap-4">
                  {devMode && <div className="text-center text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase">DevMode: Alles frei</div>}

                  <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Sammler Fortschritt</p>
                      <span className="text-xs font-bold text-gray-700">{myPins.length}/50</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2.5 mb-1">
                      <div className="bg-gradient-to-r from-yellow-500 to-orange-400 h-2.5 rounded-full transition-all duration-500" style={{width: \`\${Math.min(100, (myPins.length / 50) * 100)}%\`}} />
                    </div>
                    <p className="text-[10px] text-gray-400">{myPins.length < 5 ? \`Noch \${5 - myPins.length} bis Bronze\` : myPins.length < 10 ? \`Noch \${10 - myPins.length} bis Silber\` : myPins.length < 50 ? \`Noch \${50 - myPins.length} bis Gold\` : 'Gold Sammler erreicht!'}</p>
                  </div>

                  {[
                    { label: 'Exklusiv & Limitiert', color: 'ring-blue-400', items: [
                      { has: devMode || hasEuCenter, icon: '\u{1F1EA}\u{1F1FA}', bg: 'bg-blue-800', title: 'Mitte der EU', titleL: '??? (Limit: 1 Weltweit)', desc: 'Du warst der Erste in der Mitte der EU!', descL: euOwner ? 'Bereits von jemand anderem ergattert!' : 'Klebe als allererster Nutzer in die Mitte der EU.', date: getUnlockDate('eu_center') },
                      { has: devMode || hasGipfeli, img: '/badges/badge_gipfeli.jpg', title: 'Gipfeli Alpinist', titleL: '??? (Alpinist)', desc: \`Gipfeli erkraxelt!\${myGipfeliPeakName ? ' \u{1F4CD} ' + myGipfeliPeakName : ''}\`, descL: 'Klebe als Erster auf den Gipfel eines Bundeslandes.', date: getUnlockDate('gipfeli') },
                      { has: hasPioneer, img: '/badges/badge_pioneer.jpg', title: \`Pionier der ersten Stunde (No. \${myPioneerRank}/15) \u{1F31F}\`, titleL: 'Pionier der ersten Stunde (Limit: 15)', desc: 'Du geh\u00f6rst zu den ersten 15 Nutzern weltweit!', descL: 'Streng limitiert auf die exakt ersten 15 Nutzer.', date: getUnlockDate('pioneer') },
                    ]},
                    { label: 'Karten-Freischaltungen', color: 'ring-indigo-400', items: [
                      { has: canUseDark, img: '/badges/night_owl.jpg', title: 'Nachteule \u2705', titleL: '??? (Nachteule)', desc: 'Nachts (22\u20134 Uhr) geklebt. Dark Mode frei.', descL: 'Ein Geheimnis, das im Schutz der Dunkelheit ruht...', date: getUnlockDate('nightOwl') },
                      { has: canUseVintage, img: '/badges/local_hero.jpg', title: 'Lokalmatador \u2705', titleL: '??? (Lokalmatador)', desc: '5 Sticker geklebt. Explorer-Karte frei.', descL: 'Nur wer Ausdauer beweist, wird die alte Welt sehen...', date: getUnlockDate('localHero') },
                      { has: canUseSunrise, img: '/badges/early_bird.jpg', title: 'Fr\u00fchaufsteher \u2705', titleL: '??? (Fr\u00fchaufsteher)', desc: 'Morgens (5\u20138 Uhr) geklebt. Sunrise-Karte frei.', descL: 'Der fr\u00fche Vogel f\u00e4ngt den Wurm...', date: getUnlockDate('earlyBird') },
                      { has: canUseSpooky, img: '/badges/halloween.jpg', title: 'S\u00fc\u00dfes oder Saures \u2705', titleL: '??? (Zeitlich begrenzt)', desc: 'Halloween Event. Spooky-Karte frei.', descL: 'Nur einmal im Jahr aus den Schatten...', date: getUnlockDate('halloween') },
                      { has: canUseSnow, img: '/badges/winter.jpg', title: 'Winterwunder \u2705', titleL: '??? (Zeitlich begrenzt)', desc: 'Weihnachts Event. Snow-Karte frei.', descL: 'Wenn die Tage k\u00fcrzer werden...', date: getUnlockDate('winter') },
                      { has: canUseAurora, img: '/badges/polar.jpg', title: 'Polarforscher \u2705', titleL: '??? (Polarforscher)', desc: 'Im hohen Norden/S\u00fcden. Aurora-Karte frei.', descL: 'Nur wer der extremen K\u00e4lte trotzt...', date: getUnlockDate('polar') },
                      { has: canUseCyberpunk, img: '/badges/urban.jpg', title: 'Urban Legend \u2705', titleL: '??? (Gro\u00dfstadt)', desc: 'In einer Weltmetropole. Cyberpunk frei.', descL: 'Dort wo das Neonlicht niemals schl\u00e4ft...', date: getUnlockDate('urban') },
                      { has: devMode || hasRetroGamer, img: '/badges/retro.jpg', title: 'Pixel Pioneer \u{1F47E}', titleL: '??? (Retro Gamer)', desc: '10 Sticker geklebt. 8-Bit Karte frei!', descL: 'Klebe 10 Sticker, um in die Vergangenheit zu reisen...', date: null },
                    ]},
                    { label: 'Spezial & Zeitlich', color: 'ring-yellow-400', items: [
                      { has: devMode || hasPi, img: '/badges/badge_pi.jpg', title: 'PI (3,14) \u2705', titleL: '??? (Mathematiker)', desc: 'Auf dem 3,14 Breiten- oder L\u00e4ngengrad.', descL: 'Nur f\u00fcr wahre Geeks und Nerds...', date: getUnlockDate('pi') },
                      { has: devMode || hasMay4, img: '/badges/badge_may4.jpg', title: 'May the force be with you \u2705', titleL: '??? (Sci-Fi Fan)', desc: 'Am 4. Mai geklebt.', descL: 'Sp\u00fcre die Macht an einem ganz bestimmten Tag...', date: getUnlockDate('may4') },
                      { has: devMode || hasLove, img: '/badges/badge_love.jpg', title: 'True Love \u2705', titleL: '??? (Romantiker)', desc: 'Am Valentinstag (14. Feb) geklebt.', descL: 'Die Liebe liegt in der Luft...', date: getUnlockDate('love') },
                      { has: devMode || hasSilvester, img: '/badges/badge_silvester.jpg', title: 'Silvester \u{1F386}', titleL: '??? (Feuerwerk)', desc: 'An Silvester oder Neujahr geklebt.', descL: 'Lass es knallen zum Jahreswechsel!', date: getUnlockDate('silvester') },
                    ]},
                    { label: 'Abenteuer & Reisen', color: 'ring-emerald-400', items: [
                      { has: devMode || hasTier5, icon: '\u{1F3C9}', bg: 'bg-yellow-700', title: 'Bronze Sammler (5 Pins) \u2705', titleL: '??? (Sammler)', desc: 'Aller Anfang ist gemacht.', descL: 'Klebe 5 Sticker.', date: getUnlockDate('tier5') },
                      { has: devMode || hasTier10, icon: '\u{1F948}', bg: 'bg-gray-300', title: 'Silber Sammler (10 Pins) \u2705', titleL: '??? (Sammler)', desc: 'Eine stolze Sammlung.', descL: 'Klebe 10 Sticker.', date: getUnlockDate('tier10') },
                      { has: devMode || hasTier50, icon: '\u{1F947}', bg: 'bg-yellow-400', title: 'Gold Sammler (50 Pins) \u2705', titleL: '??? (Sammler)', desc: 'Eine beachtliche Leistung!', descL: 'Klebe 50 Sticker.', date: getUnlockDate('tier50') },
                      { has: devMode || hasWorldTraveler, img: '/badges/world_traveler.jpg', title: 'Weltenbummler \u2705', titleL: '??? (Weltenbummler)', desc: 'In mind. 3 L\u00e4ndern geklebt.', descL: 'Die Welt ist gro\u00df, bereise sie...', date: getUnlockDate('worldTraveler') },
                      { has: hasMarathon, img: '/badges/streak.jpg', title: 'Feuer & Flamme \u2705', titleL: '??? (Marathon)', desc: 'An 3 aufeinanderfolgenden Tagen geklebt.', descL: 'Konstanz ist der Schl\u00fcssel...', date: getUnlockDate('marathon') },
                      { has: devMode || hasYinYang, img: '/badges/badge_yinyang.jpg', title: 'Yin & Yang \u2705', titleL: '??? (Balance)', desc: 'Nord- und S\u00fcdhalbkugel vereint.', descL: 'Finde das Gleichgewicht...', date: getUnlockDate('yinyang') },
                      { has: devMode || hasVivaldi, img: '/badges/badge_vivaldi.jpg', title: 'Die 4 Jahreszeiten \u2705', titleL: '??? (Vivaldi)', desc: 'In allen 4 Jahreszeiten geklebt.', descL: 'Erlebe den Kreislauf der Natur...', date: getUnlockDate('vivaldi') },
                      { has: devMode || hasNz, img: '/badges/badge_nz.jpg', title: 'One Geophysalis to rule them all \u2705', titleL: '??? (Neuseeland)', desc: 'In Neuseeland (Mittelerde) geklebt.', descL: 'Wirf den Ring ins Feuer...', date: getUnlockDate('nz') },
                      { has: devMode || hasUshuaia, img: '/badges/badge_ushuaia.jpg', title: 'Im Auge des Sturms \u2705', titleL: '??? (Feuerland)', desc: 'Am S\u00fcdzipfel von Argentinien geklebt.', descL: 'Das Ende der Welt im tiefen S\u00fcden...', date: getUnlockDate('ushuaia') },
                    ]},
                  ].map(section => (
                    <div key={section.label}>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{section.label}</p>
                      <div className="flex flex-col gap-2">
                        {section.items.map((b, i) => (
                          <div key={i} className={\`flex items-center gap-3 p-3 rounded-xl transition \${b.has ? 'bg-white border border-gray-100 shadow-sm' : 'opacity-40 grayscale bg-gray-50'}\`}>
                            <div className={\`w-12 h-12 rounded-xl overflow-hidden shrink-0 flex items-center justify-center text-2xl \${b.has ? section.color + ' ring-2 shadow' : 'border-2 border-gray-300'} \${b.bg || ''}\`}>
                              {b.img ? <img src={b.img} className="w-full h-full object-cover" /> : b.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-black text-gray-800 leading-tight truncate">{b.has ? b.title : b.titleL}</p>
                              <p className="text-xs text-gray-500 line-clamp-2">{b.has ? b.desc : b.descL}</p>
                              {b.has && b.date && <span className="text-[9px] text-gray-400">Freigeschaltet am {b.date}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB: EINSTELLUNGEN */}
              {profileTab === 'einstellungen' && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-gray-400 text-center break-all">{session.user.email}</p>
                  <label className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl cursor-pointer hover:bg-gray-100 transition">
                    <span className="font-bold text-gray-700 text-sm">Nur meine Sticker zeigen</span>
                    <div className={\`w-12 h-6 rounded-full transition relative \${showOnlyMyPins ? 'bg-blue-600' : 'bg-gray-300'}\`}>
                      <div className={\`w-4 h-4 bg-white rounded-full absolute top-1 transition-all \${showOnlyMyPins ? 'left-7' : 'left-1'}\`}></div>
                    </div>
                    <input type="checkbox" className="hidden" checked={showOnlyMyPins} onChange={e => { setShowOnlyMyPins(e.target.checked); if (e.target.checked) setIsAuthModalOpen(false); }} />
                  </label>
                  <button onClick={() => { supabase.auth.signOut(); setIsAuthModalOpen(false); }} className="w-full bg-white border-2 border-red-100 text-red-500 font-bold py-3 rounded-2xl hover:bg-red-50 transition">
                    Abmelden
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}\r\n`;

// Replace lines 1491 to profileEnd
lines.splice(1490, profileEnd - 1490, ...newModal.split('\n'));
fs.writeFileSync('src/MapView.jsx', lines.join('\n'));
