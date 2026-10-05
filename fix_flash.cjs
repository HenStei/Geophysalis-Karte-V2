const fs = require('fs');
let content = fs.readFileSync('src/MapView.jsx', 'utf8');

// Patch Auth Modal container
content = content.replace(
  '<div className="absolute inset-0 z-[3000] flex items-center justify-center p-4">',
  '<div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black">'
);

// Patch Invite Modal container
content = content.replace(
  '<div id="invite-modal" className="fixed inset-0 z-[9999] flex items-center justify-center p-4">',
  '<div id="invite-modal" className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black">'
);

// Also change "absolute inset-0" to "fixed inset-0" in the auth modal just in case to match the invite modal

fs.writeFileSync('src/MapView.jsx', content);
console.log('Fixed flashing map issue');
