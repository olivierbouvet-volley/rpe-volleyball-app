
const fs = require('fs');
const path = require('path');

// Read the stickers.js file (assuming we can read it as text since it's a browser file)
const stickersPath = path.join('public', 'js', 'stickers.js');
const stickersContent = fs.readFileSync(stickersPath, 'utf8');

// Regex to find all image paths: image: '/img/stickers/...'
const imageRegex = /image:\s*'(\/img\/stickers\/[^']+)'/g;
let match;
const missingFiles = [];
const foundFiles = [];

console.log("Verifying sticker images...");

while ((match = imageRegex.exec(stickersContent)) !== null) {
    const relativePath = match[1]; // e.g., /img/stickers/common/checin.webp
    // Convert to local file system path: public/img/stickers/...
    // remove leading slash
    const fsPath = path.join('public', relativePath.substring(1));
    
    if (!fs.existsSync(fsPath)) {
        missingFiles.push(relativePath);
    } else {
        foundFiles.push(relativePath);
    }
}

console.log(`checked ${foundFiles.length + missingFiles.length} links.`);

if (missingFiles.length > 0) {
    console.log("❌ MISSING FILES:");
    missingFiles.forEach(f => console.log(` - ${f}`));
} else {
    console.log("✅ All sticker images referenced in stickers.js exist on disk.");
}
