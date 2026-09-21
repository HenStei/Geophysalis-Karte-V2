const fs = require('fs');
let c = fs.readFileSync('src/MapView.jsx', 'utf8');

// Replace escaped unicode sequences with actual emoji characters
const replacements = {
  '\\u{1F98A}': '🦊',
  '\\u{1F47B}': '👻',
  '\\u{1F987}': '🦇',
  '\\u{1F98C}': '🦌',
  '\\u26C4': '⛄',
  '\\u{1F47E}': '👾',
  '\\u{1F3C9}': '🥉',
  '\\u{1F948}': '🥈',
  '\\u{1F947}': '🥇',
  '\\u{1F1EA}\\u{1F1FA}': '🇪🇺',
  '\\u{1F31F}': '🌟',
  '\\u{1F4CD}': '📍',
  '\\u{1F386}': '🎆',
  '\\u2705': '✅',
  '\\u{1F464}': '👤',
  '\\u{1F3C6}': '🏆',
  '\\u2699\\uFE0F': '⚙️',
  '\\u00e4': 'ä',
  '\\u00f6': 'ö',
  '\\u00fc': 'ü',
  '\\u00df': 'ß',
  '\\u00c4': 'Ä',
  '\\u00d6': 'Ö',
  '\\u00dc': 'Ü',
  '\\u2013': '–',
  '\\u2014': '—',
  '\\u2019': "'",
};

for (const [esc, char] of Object.entries(replacements)) {
  c = c.split(esc).join(char);
}

fs.writeFileSync('src/MapView.jsx', c);
console.log('Done.');
