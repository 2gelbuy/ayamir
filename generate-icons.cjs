const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [16, 48, 128];
const svgPath = path.join(__dirname, 'public', 'icon', 'icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

async function generateIcons() {
    const outputDir = path.join(__dirname, 'public', 'icon');

    for (const size of sizes) {
        const outputPath = path.join(outputDir, `${size}.png`);
        await sharp(svgBuffer)
            .resize(size, size)
            .png()
            .toFile(outputPath);
        console.log(`Generated ${outputPath}`);
    }
    console.log('Done!');
}

generateIcons().catch(console.error);
