const fs = require('fs');
let c = fs.readFileSync('src/MapView.jsx', 'utf8');

// 1. Replace the import
c = c.replace("import html2canvas from 'html2canvas';", "import * as htmlToImage from 'html-to-image';");

// 2. Replace the render logic inside handleShareCard
const oldLogic = `      const canvas = await html2canvas(shareCardRef.current, { 
        useCORS: true, 
        backgroundColor: '#0f172a',
        scale: 2
      });
      canvas.toBlob(async (blob) => {`;

const newLogic = `      const blob = await htmlToImage.toBlob(shareCardRef.current, { 
        pixelRatio: 2,
        backgroundColor: '#0f172a'
      });
      if (!blob) throw new Error("Blob failed");
      
      // Wrapper to keep the structure the same
      (async (blob) => {`;

c = c.replace(oldLogic, newLogic);

// 3. Fix the closing brace for the wrapper
const oldClosing = `      }, 'image/png', 1.0);
    } catch (e) {`;

const newClosing = `      })(blob);
    } catch (e) {`;

c = c.replace(oldClosing, newClosing);

// 4. Update Medals in the UI
c = c.replace("icon: '🥉', bg: 'bg-yellow-700'", "img: '/badges/badge_bronze.jpg'");
c = c.replace("icon: '🥈', bg: 'bg-gray-300'", "img: '/badges/badge_silver.jpg'");
c = c.replace("icon: '🥇', bg: 'bg-yellow-400'", "img: '/badges/badge_gold.jpg'");
c = c.replace("icon: '💎', bg: 'bg-cyan-300'", "img: '/badges/badge_platinum.jpg'");

// 5. Update Medals in the Share Card array
c = c.replace("hasTier50 && { icon: '🥇', bg: '#facc15' }", "hasTier100 ? { img: '/badges/badge_platinum.jpg' } : hasTier50 ? { img: '/badges/badge_gold.jpg' } : hasTier10 ? { img: '/badges/badge_silver.jpg' } : hasTier5 ? { img: '/badges/badge_bronze.jpg' } : null");

fs.writeFileSync('src/MapView.jsx', c);
console.log("Replaced html2canvas with html-to-image and added medal images.");
