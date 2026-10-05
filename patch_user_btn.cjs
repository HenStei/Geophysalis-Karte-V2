const fs = require('fs');
let code = fs.readFileSync('src/AdminView.jsx', 'utf8');

const oldUserTab = `<div className="bg-white p-5 rounded-3xl border-2 border-transparent shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nutzer gesamt</p>
                <h3 className="text-3xl font-black text-gray-900">{totalUsers}</h3>
              </div>
              <div className="bg-purple-100 p-2.5 rounded-2xl"><CheckCircle className="text-purple-600" size={20} /></div>
            </div>
          </div>`;

const newUserTab = `<div onClick={() => setActiveTab('users')} className={\`cursor-pointer bg-white p-5 rounded-3xl border-2 transition-all shadow-sm \${activeTab === 'users' ? 'border-orange-500 ring-4 ring-orange-50' : 'border-transparent hover:border-gray-200'}\`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nutzer gesamt</p>
                <h3 className="text-3xl font-black text-gray-900">{totalUsers}</h3>
              </div>
              <div className="bg-orange-100 p-2.5 rounded-2xl"><Users className="text-orange-600" size={20} /></div>
            </div>
          </div>`;

code = code.replace(oldUserTab, newUserTab);

// fallbacks if spacing is different:
code = code.replace(/<div className="bg-white p-5 rounded-3xl border-2 border-transparent shadow-sm">\s*<div className="flex justify-between items-start">\s*<div>\s*<p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nutzer gesamt<\/p>\s*<h3 className="text-3xl font-black text-gray-900">\{totalUsers\}<\/h3>\s*<\/div>\s*<div className="bg-purple-100 p-2.5 rounded-2xl"><CheckCircle className="text-purple-600" size=\{20\} \/><\/div>\s*<\/div>\s*<\/div>/, newUserTab);

fs.writeFileSync('src/AdminView.jsx', code);
