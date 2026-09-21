const fs = require('fs');
let c = fs.readFileSync('src/MapView.jsx', 'utf8');

c = c.replace(
  'const [globalAchievements, setGlobalAchievements] = useState([]);',
  'const [globalAchievements, setGlobalAchievements] = useState([]);\n  const [globalsLoaded, setGlobalsLoaded] = useState(false);'
);

c = c.replace(
  'if (data) setGlobalAchievements(data);',
  'if (data) setGlobalAchievements(data);\n      setGlobalsLoaded(true);'
);

c = c.replace(
  'if (!session?.user?.id || myPins.length === 0 || globalAchievements.length === 0) return;',
  'if (!session?.user?.id || myPins.length === 0 || !globalsLoaded) return;'
);

c = c.replace(
  "{hasPioneer ? 'Pionier der ersten Stunde 🌟' : '??? (Gründungsmitglied)'}",
  "{hasPioneer ? 'Pionier der ersten Stunde 🌟' : 'Pionier der ersten Stunde (Limit: 15)'}"
);

fs.writeFileSync('src/MapView.jsx', c);
