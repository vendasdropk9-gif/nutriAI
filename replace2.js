import fs from 'fs';
let content = fs.readFileSync('src/lib/gemini.server.ts', 'utf8');

const stringsToReplace = [
  'console.warn("Failed to generate master strategy, using fallback:", error?.message || error);',
  'console.warn("Failed to generate workout, using fallback:", error);',
  'console.warn("Failed to generate recipe, using fallback:", error);',
  'console.error(`Failed to fetch fallback image for "${description}", returning SVG:`, err);',
  'console.warn("Failed to adjust meal plan, using fallback:", error);',
  'console.warn("Intervenção comportamental offline, usando fallback:", error?.message || error);',
  'console.warn("Gerador adaptativo offline ou indisponível, usando fallback:", error?.message || error);',
  'console.warn("Failed to generate weekly challenges, using fallback:", error?.message || error);',
  'console.error("Gemini avatar generation failed, deploying high-quality Unsplash fallback:", error);',
  'console.error("Gemini recipe image generation failed, using high-quality Unsplash recipe fallback:", error);'
];

for (const str of stringsToReplace) {
  content = content.replace(str, 'console.info("Fallback triggered");');
}

fs.writeFileSync('src/lib/gemini.server.ts', content);
console.log('Done');
