const fs = require('fs');
let c = fs.readFileSync('src/MapView.jsx', 'utf8');

c = c.replace(
  "from 'lucide-react';",
  ", Share, Loader2 } from 'lucide-react';"
);

// Fix the typo in my replace just to be clean
c = c.replace("} , Share, Loader2 }", ", Share, Loader2 }");

fs.writeFileSync('src/MapView.jsx', c);
console.log("Imports fixed.");
