const fs = require('fs');
const file = 'src/MapView.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove the condition `isAuthModalOpen &&` from the auth gate (so it shows unconditionally if !session)
content = content.replace(
  '{!session && isAuthModalOpen && (',
  '{!session && ('
);

// 2. Remove the close button from the auth gate so they can't bypass it
content = content.replace(
  /<button onClick=\{\(\) => setIsAuthModalOpen\(false\)\} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition">\s*<X size=\{24\} \/>\s*<\/button>/,
  ''
);

fs.writeFileSync(file, content);
console.log("MANDATORY GATE PATCHED");
