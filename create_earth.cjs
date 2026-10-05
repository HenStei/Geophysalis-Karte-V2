const { Jimp } = require('jimp');

async function createEarthPlaceholder() {
  try {
    // Create a 64x64 blue canvas
    const img = new Jimp({ width: 64, height: 64, color: '#000000' });
    
    // Draw a basic circle
    const r = 30;
    const cx = 32;
    const cy = 32;
    
    img.scan(0, 0, 64, 64, function(x, y, idx) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx*dx + dy*dy <= r*r) {
        // Pixel color: blueish with some noise
        const isLand = Math.random() > 0.6;
        this.bitmap.data[idx + 0] = isLand ? 34 : 20; // R
        this.bitmap.data[idx + 1] = isLand ? 139 : 50; // G
        this.bitmap.data[idx + 2] = isLand ? 34 : 180; // B
        this.bitmap.data[idx + 3] = 255; // Alpha
      }
    });

    await img.write('public/pixel_earth.jpg');
    console.log("Placeholder earth created!");
  } catch (err) {
    console.error(err);
  }
}

createEarthPlaceholder();
