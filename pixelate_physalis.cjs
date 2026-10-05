const { Jimp } = require('jimp');

async function processPhysalis() {
  try {
    const img = await Jimp.read('C:/Users/Henry/.gemini/antigravity/brain/c4fd34c8-d912-4edb-a38e-04c29e4c06ed/.user_uploaded/media_1790800211514.png');
    
    // Crop the bottom portion containing the Physalis (x: 150, y: 440, w: 724, h: 520 approx)
    img.crop({ x: 140, y: 420, w: 740, h: 540 });
    
    // Replace white background with black
    img.scan(0, 0, img.bitmap.width, img.bitmap.height, function(x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      
      // If it's mostly white (part of the background)
      if (r > 235 && g > 235 && b > 235) {
        this.bitmap.data[idx + 0] = 0;
        this.bitmap.data[idx + 1] = 0;
        this.bitmap.data[idx + 2] = 0;
        this.bitmap.data[idx + 3] = 255;
      }
    });

    // To make it 8-bit, we pixelate it (size 8 or 10 is good for 8-bit look)
    img.pixelate(8);
    
    // Resize to fit in the app logo canvas
    img.resize({ w: 840 });
    
    // Create the final 1024x1024 black canvas
    const bg = new Jimp({ width: 1024, height: 1024, color: '#000000' });
    
    // Center it
    const x = (1024 - img.bitmap.width) / 2;
    const y = (1024 - img.bitmap.height) / 2;
    bg.composite(img, x, y);
    
    await bg.write('public/favicon-pwa.jpg');
    await bg.write('public/favicon.png');
    console.log("Success: Pixelated exact physalis saved!");
  } catch (err) {
    console.error(err);
  }
}

processPhysalis();
