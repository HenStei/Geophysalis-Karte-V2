const fs = require('fs');
let code = fs.readFileSync('src/AdminView.jsx', 'utf8');

const oldCode = `<td className="p-4 text-sm font-bold text-gray-700">
                            {c.is_used ? (
                              <span className="flex items-center gap-1.5"><span className="text-purple-500">👤</span> {usersList.find(u => u.id === c.used_by)?.nickname || 'Unbekannt'}</span>
                            ) : '-'}
                          </td>`;

const newCode = `<td className="p-4 text-sm font-bold text-gray-700">
                            {c.is_used ? (
                              <div className="flex flex-col">
                                <span className="flex items-center gap-1.5"><span className="text-purple-500">👤</span> {usersList.find(u => u.id === c.used_by)?.nickname || 'Unbekannt'}</span>
                                {c.used_at && (
                                  <span className="text-[10px] text-gray-400 font-normal mt-1">
                                    am {new Date(c.used_at).toLocaleDateString()} um {new Date(c.used_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </span>
                                )}
                              </div>
                            ) : '-'}
                          </td>`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('src/AdminView.jsx', code);
