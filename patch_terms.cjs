const fs = require('fs');
let code = fs.readFileSync('src/MapView.jsx', 'utf8');

const oldText = `<strong>Nutzungsbedingungen & Haftungsausschluss:</strong> Ich bestätige, dass ich mich vor dem Anbringen von Stickern über die lokalen Gesetze informiere. Ich hafte vollumfänglich und allein für mein Handeln. Der Seitenbetreiber übernimmt keinerlei Haftung für Schäden, Ordnungswidrigkeiten oder Straftaten (insb. Sachbeschädigung). Das Verkleben ohne Zustimmung des Eigentümers ist illegal.`;

const newText = `<strong>Nutzungsbedingungen & Haftungsausschluss:</strong> Ich bestätige, dass ich mich vor dem Anbringen von Stickern über die lokalen Gesetze informiere. Ich hafte vollumfänglich und allein für mein Handeln. Der Seitenbetreiber übernimmt keinerlei Haftung für Schäden, Ordnungswidrigkeiten oder Straftaten. Das Verkleben ohne Zustimmung des Eigentümers ist illegal.<br/><br/><strong>Datenschutz:</strong> Dies ist ein privates Hobby-Projekt. Deine E-Mail (Login), Fotos & GPS-Standorte werden gespeichert und sind für andere Eingeladene auf der Karte sichtbar. Es findet keine kommerzielle Auswertung statt.`;

code = code.replace(oldText, newText);
fs.writeFileSync('src/MapView.jsx', code);
