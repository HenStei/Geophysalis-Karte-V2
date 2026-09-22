const { Jimp } = require('jimp');

async function processImage() {
  try {
    const inputPath = 'C:\\Users\\Henry\\.gemini\\antigravity\\brain\\c4fd34c8-d912-4edb-a38e-04c29e4c06ed\\favicon_physalis_1790028307202.jpg';
    const outputPath = 'public/favicon.png';
    
    console.log('Reading image...');
    const image = await Jimp.read(inputPath);
    
    console.log('Processing pixels...');
    // Replace white-ish background with transparent
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      const red = this.bitmap.data[idx + 0];
      const green = this.bitmap.data[idx + 1];
      const blue = this.bitmap.data[idx + 2];
      
      // If pixel is white or very close to white
      if (red > 240 && green > 240 && blue > 240) {
        this.bitmap.data[idx + 3] = 0; // Alpha to 0 (transparent)
      }
    });
    
    // Scale it down a bit to ensure it works well as a favicon and reduces size
    image.resize({ w: 256, h: 256 });
    
    console.log('Saving image...');
    await image.write(outputPath);
    console.log('Done!');
  } catch (err) {
    console.error(err);
  }
}

processImage();
