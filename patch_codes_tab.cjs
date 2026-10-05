const fs = require('fs');
let code = fs.readFileSync('src/AdminView.jsx', 'utf8');

const parts = code.split('{/* Grid Section */}');
const before = parts[0];
let after = parts[1];

// replace the end of the file with the properly nested closing tags
after = after.replace(/          \)}\r?\n        <\/div>\r?\n      <\/div>\r?\n    <\/div>\r?\n  \);\r?\n}/, 
`          )}
        </div>
        </div>
        )}
      </div>
    </div>
  );
}`);

const newSection = `{/* Conditional Tab Rendering */}
        {activeTab === 'codes' ? (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                Einladungscodes
                <span className="bg-purple-100 text-purple-700 py-0.5 px-2.5 rounded-full text-sm">{inviteCodes.length}</span>
              </h2>
              <button 
                onClick={generateCode}
                className="bg-purple-600 text-white font-bold py-2 px-4 rounded-xl hover:bg-purple-700 transition shadow-sm"
              >
                + Code generieren
              </button>
            </div>
            
            {loadingCodes ? (
              <p className="text-gray-500">Lade Codes...</p>
            ) : (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                      <th className="p-4 font-bold">Code</th>
                      <th className="p-4 font-bold">Status</th>
                      <th className="p-4 font-bold">Erstellt</th>
                      <th className="p-4 font-bold text-right">Aktion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inviteCodes.length === 0 ? (
                      <tr><td colSpan="4" className="p-6 text-center text-gray-500 font-medium">Keine Codes vorhanden.</td></tr>
                    ) : inviteCodes.map(c => (
                      <tr key={c.code} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                        <td className="p-4 font-mono font-bold text-gray-900">{c.code}</td>
                        <td className="p-4">
                          {c.is_used ? (
                            <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2.5 py-1 rounded-full">Eingelöst</span>
                          ) : (
                            <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">Aktiv</span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
                        <td className="p-4 text-right">
                          <button onClick={() => deleteCode(c.code)} className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-lg transition" title="Löschen">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Grid Section */}`;

fs.writeFileSync('src/AdminView.jsx', before + newSection + after);
