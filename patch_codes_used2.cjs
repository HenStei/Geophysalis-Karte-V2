const fs = require('fs');
let code = fs.readFileSync('src/AdminView.jsx', 'utf8');

// 1. Replace header
code = code.replace(
/<th className="p-4 font-bold">Code<\/th>[\s\S]*?<th className="p-4 font-bold">Status<\/th>[\s\S]*?<th className="p-4 font-bold">Erstellt<\/th>[\s\S]*?<th className="p-4 font-bold text-right">Aktion<\/th>/,
`<th className="p-4 font-bold">Code</th>
                        <th className="p-4 font-bold">Status</th>
                        <th className="p-4 font-bold">Erstellt</th>
                        <th className="p-4 font-bold">Eingelöst von</th>
                        <th className="p-4 font-bold text-right">Aktion</th>`
);

// 2. Replace body
code = code.replace(
/<tr key=\{c\.code\} className="border-b border-gray-50 hover:bg-gray-50\/50 transition">[\s\S]*?<td className="p-4 font-mono font-bold text-gray-900">\{c\.code\}<\/td>[\s\S]*?<td className="p-4">[\s\S]*?\{c\.is_used \? \([\s\S]*?<span className="bg-gray-100 text-gray-500 text-xs font-bold px-2\.5 py-1 rounded-full">Eingelöst<\/span>[\s\S]*?\) : \([\s\S]*?<span className="bg-green-100 text-green-700 text-xs font-bold px-2\.5 py-1 rounded-full">Aktiv<\/span>[\s\S]*?\)\}[\s\S]*?<\/td>[\s\S]*?<td className="p-4 text-sm text-gray-500">\{new Date\(c\.created_at\)\.toLocaleDateString\(\)\}<\/td>[\s\S]*?<td className="p-4 text-right">[\s\S]*?<button onClick=\{\(\) => deleteCode\(c\.code\)\} className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-lg transition" title="Löschen">[\s\S]*?<Trash2 size=\{16\} \/>[\s\S]*?<\/button>[\s\S]*?<\/td>[\s\S]*?<\/tr>/,
`<tr key={c.code} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                          <td className="p-4 font-mono font-bold text-gray-900">{c.code}</td>
                          <td className="p-4">
                            {c.is_used ? (
                              <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2.5 py-1 rounded-full">Eingelöst</span>
                            ) : (
                              <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full animate-pulse shadow-sm">Aktiv</span>
                            )}
                          </td>
                          <td className="p-4 text-sm text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
                          <td className="p-4 text-sm font-bold text-gray-700">
                            {c.is_used ? (
                              <span className="flex items-center gap-1.5"><span className="text-purple-500">👤</span> {usersList.find(u => u.id === c.used_by)?.nickname || 'Unbekannt'}</span>
                            ) : '-'}
                          </td>
                          <td className="p-4 text-right">
                            <button onClick={() => deleteCode(c.code)} className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-lg transition" title="Löschen">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>`
);

fs.writeFileSync('src/AdminView.jsx', code);
