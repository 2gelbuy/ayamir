import fs from 'fs';

const createIcon = (size) => {
  const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  fs.writeFileSync(`public/icon-${size}.png`, buffer);
  console.log(`Created icon-${size}.png`);
};

[16, 48, 128].forEach(createIcon);
