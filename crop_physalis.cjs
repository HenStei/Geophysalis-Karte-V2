const { Jimp } = require('jimp');

async function processPhysalis() {
  try {
    const img = await Jimp.read('C:/Users/Henry/.gemini/antigravity/brain/c4fd34c8-d912-4edb-a38e-04c29e4c06ed/.user_uploaded/media_1790800211514.png');
    
    // Crop the bottom portion containing the Physalis
    // x, y, w, h
    img.crop({ x: 90, y: 420, w: 840, h: 560 });
    
    // Replace white background with black
    img.scan(0, 0, img.bitmap.width, img.bitmap.height, function(x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      
      // If it's pure white or close to it, and not part of the physalis (which is yellow/orange)
      // Actually the background is pure white #FFFFFF. The physalis has no pure white.
      if (r > 240 && g > 240 && b > 240) {
        this.bitmap.data[idx + 0] = 0;
        this.bitmap.data[idx + 1] = 0;
        this.bitmap.data[idx + 2] = 0;
        this.bitmap.data[idx + 3] = 255; // Alpha
      }
    });

    // Save temporary cropped image to verify
    await img.write('crop_test.jpg');
    console.log("Cropped successfully.");
    
  } catch (err) {
    console.error(err);
  }
}
processPhysalis();
