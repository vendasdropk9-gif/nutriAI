import fs from 'fs';
const content = fs.readFileSync('src/lib/gemini.server.ts', 'utf8');
const newContent = content
  .replace(/console\.warn\(([^,]+), error\?\.[^)]+\);/g, 'console.info($1);')
  .replace(/console\.warn\(([^,]+), error\);/g, 'console.info($1);')
  .replace(/console\.error\([^,]+, err\);/g, 'console.info("Failed to fetch fallback image returning SVG");');
fs.writeFileSync('src/lib/gemini.server.ts', newContent);
console.log('Replaced more');
