const fs = require('fs');
let c = fs.readFileSync('src/MapView.jsx', 'utf8');

c = c.replace(/rounded-2xl/g, 'rounded-full');
c = c.replace(/rounded-xl/g, 'rounded-full');
c = c.replace(/rounded-\[20px\]/g, 'rounded-full');
c = c.replace(/rounded-\[24px\]/g, 'rounded-full');
c = c.replace(/rounded-\[32px\]/g, 'rounded-full');

const searchLB = `<div className={\`avatar-frame frame-\${frame} w-10 h-10 text-xl shadow-sm bg-white shrink-0 overflow-hidden\`}>
                              {avatarContent}
                            </div>`;

const replaceLB = `<div className="relative shrink-0 shadow-sm rounded-full ring-2 ring-gray-100">
                              {frame === 'fire' && <div className="absolute -inset-1 bg-gradient-to-tr from-red-600 via-orange-500 to-yellow-400 rounded-full animate-pulse blur-[2px] shadow-[0_0_10px_rgba(255,69,0,0.8)]" style={{ zIndex: -1 }}></div>}
                              {frame === 'wind' && <div className="absolute -inset-1.5 border-[2px] border-dashed border-cyan-400 rounded-full animate-[spin_3s_linear_infinite] opacity-80 shadow-[0_0_8px_#00ffff]" style={{ zIndex: -1 }}></div>}
                              {frame === 'wind' && <div className="absolute -inset-2.5 border-[2px] border-dotted border-white rounded-full animate-[spin_4s_linear_infinite_reverse] opacity-60" style={{ zIndex: -1 }}></div>}
                              {frame === 'neon' && <div className="absolute -inset-1 bg-purple-500 rounded-full blur-[3px]" style={{ zIndex: -1 }}></div>}
                              {frame === 'frost' && <div className="absolute -inset-1 bg-cyan-400 rounded-full blur-[3px]" style={{ zIndex: -1 }}></div>}
                              <div className="w-10 h-10 overflow-hidden rounded-full bg-white relative z-10 flex items-center justify-center text-xl">
                                {avatarContent}
                              </div>
                            </div>`;

c = c.replace(searchLB, replaceLB);

fs.writeFileSync('src/MapView.jsx', c);
