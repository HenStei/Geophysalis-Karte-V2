const { Jimp } = require('jimp');

async function processLogo() {
  try {
    const img = await Jimp.read('C:/Users/Henry/.gemini/antigravity/brain/c4fd34c8-d912-4edb-a38e-04c29e4c06ed/.user_uploaded/media_1790801234069.png');
    
    // The image has a border around it. We should crop it out first.
    // Let's crop a bit from the edges.
    img.crop({ x: 20, y: 20, w: img.bitmap.width - 40, h: img.bitmap.height - 40 });
    
    // Sample the background color from the top-left corner
    const bgR = img.bitmap.data[0];
    const bgG = img.bitmap.data[1];
    const bgB = img.bitmap.data[2];
    
    // Replace beige background with pure black
    img.scan(0, 0, img.bitmap.width, img.bitmap.height, function(x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      
      // If it's close to the background color (tolerance)
      if (Math.abs(r - bgR) < 30 && Math.abs(g - bgG) < 30 && Math.abs(b - bgB) < 30) {
        this.bitmap.data[idx + 0] = 0;
        this.bitmap.data[idx + 1] = 0;
        this.bitmap.data[idx + 2] = 0;
        this.bitmap.data[idx + 3] = 255; // Alpha
      }
    });

    // Make it even more pixel art!
    img.pixelate(8);
    
    // Resize to fit in the app logo canvas (1024x1024)
    img.resize({ w: 900 });
    
    // Create final black canvas
    const bg = new Jimp({ width: 1024, height: 1024, color: '#000000' });
    const cx = Math.floor((1024 - img.bitmap.width) / 2);
    const cy = Math.floor((1024 - img.bitmap.height) / 2);
    bg.composite(img, cx, cy);
    
    await bg.write('public/favicon-pwa.jpg');
    await bg.write('public/favicon.png');
    console.log("Success: Processed user image mathematically!");
  } catch (err) {
    console.error(err);
  }
}

processLogo();
