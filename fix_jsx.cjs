const fs = require('fs');
let content = fs.readFileSync('src/MapView.jsx', 'utf8');
content = content.replace('Überspringen >>', 'Überspringen &gt;&gt;');
fs.writeFileSync('src/MapView.jsx', content);
console.log('Fixed JSX syntax error');
