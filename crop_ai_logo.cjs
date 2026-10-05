const { Jimp } = require('jimp');

async function processPhysalis() {
  try {
    const img = await Jimp.read('C:/Users/Henry/.gemini/antigravity/brain/c4fd34c8-d912-4edb-a38e-04c29e4c06ed/app_logo_ai_remake_1790801005725.jpg');
    
    // Crop the bottom portion containing the beautifully AI-generated Physalis
    // The text is mostly at the top arc. The physalis is roughly in the lower half.
    // We'll crop carefully.
    img.crop({ x: 90, y: 410, w: 840, h: 560 });
    
    // Replace white background with pure black
    img.scan(0, 0, img.bitmap.width, img.bitmap.height, function(x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      
      // If it's mostly white (part of the background)
      if (r > 240 && g > 240 && b > 240) {
        this.bitmap.data[idx + 0] = 0;
        this.bitmap.data[idx + 1] = 0;
        this.bitmap.data[idx + 2] = 0;
        this.bitmap.data[idx + 3] = 255;
      }
    });

    // Create the final 1024x1024 black canvas
    const bg = new Jimp({ width: 1024, height: 1024, color: '#000000' });
    
    // Center it
    const x = Math.floor((1024 - img.bitmap.width) / 2);
    const y = Math.floor((1024 - img.bitmap.height) / 2);
    bg.composite(img, x, y);
    
    await bg.write('public/favicon-pwa.jpg');
    await bg.write('public/favicon.png');
    console.log("Success: Cropped AI image saved!");
  } catch (err) {
    console.error(err);
  }
}

processPhysalis();
