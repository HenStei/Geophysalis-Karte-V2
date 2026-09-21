const fs = require('fs');
let c = fs.readFileSync('src/MapView.jsx', 'utf8');

const handleShareCard = `
  const handleShareCard = async () => {
    if (!shareCardRef.current) return;
    setIsSharing(true);
    try {
      const canvas = await html2canvas(shareCardRef.current, { 
        useCORS: true, 
        backgroundColor: '#0f172a',
        scale: 2
      });
      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error("Blob failed");
        
        const file = new File([blob], 'geophysalis_profil.png', { type: 'image/png' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Geophysalis Profil',
            text: 'Schau dir mein Geophysalis Profil an! 🌍📍',
            files: [file]
          }).catch(console.error);
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'geophysalis_profil.png';
          a.click();
          URL.revokeObjectURL(url);
          alert('Dein Profil-Bild wurde heruntergeladen! Teile es auf Social Media.');
        }
      }, 'image/png', 1.0);
    } catch (e) {
      console.error(e);
      alert('Fehler beim Erstellen des Bildes.');
    } finally {
      setIsSharing(false);
    }
  };
`;

if (!c.includes('const handleShareCard = async ()')) {
  c = c.replace(
    "const [isSharing, setIsSharing] = useState(false);",
    "const [isSharing, setIsSharing] = useState(false);\n" + handleShareCard
  );
  fs.writeFileSync('src/MapView.jsx', c);
  console.log("Injected handleShareCard.");
} else {
  console.log("handleShareCard already exists.");
}
