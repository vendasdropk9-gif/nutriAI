import fs from 'fs';
let content = fs.readFileSync('src/lib/gemini.server.ts', 'utf8');

content = content.replace(/console\.info\("Failed to analyze plate, using fallback:", error\);/g, 'console.info("Fallback triggered: plate");');
content = content.replace(/console\.info\("Failed to generate juice recipe, using fallback:", error\);/g, 'console.info("Fallback triggered: juice");');
content = content.replace(/console\.info\("Failed to analyze barcode product, using fallback:", error\);/g, 'console.info("Fallback triggered: barcode");');
content = content.replace(/console\.info\("Failed to analyze emotional patterns, using fallback:", error\);/g, 'console.info("Fallback triggered: emotional patterns");');
content = content.replace(/console\.info\("Failed to analyze dining out, using fallback:", error\);/g, 'console.info("Fallback triggered: dining out");');
content = content.replace(/console\.info\("Failed to generate smart swap, using fallback:", error\);/g, 'console.info("Fallback triggered: smart swap");');
content = content.replace(/console\.info\("Failed to generate goal prediction, using fallback:", error\);/g, 'console.info("Fallback triggered: goal prediction");');
content = content.replace(/console\.info\("Failed to generate magic recipe, using fallback:", error\);/g, 'console.info("Fallback triggered: magic recipe");');
content = content.replace(/console\.info\("Failed to analyze product image, using fallback:", error\);/g, 'console.info("Fallback triggered: product image");');
content = content.replace(/console\.info\("Failed to analyze emotional image, using fallback:", error\);/g, 'console.info("Fallback triggered: emotional image");');
content = content.replace(/console\.info\("Failed to analyze blood pressure, using fallback:", error\);/g, 'console.info("Fallback triggered: blood pressure");');
content = content.replace(/console\.info\("Failed to analyze body biometrics, using fallback:", error\);/g, 'console.info("Fallback triggered: body biometrics");');

// Add dish back to the fallback
content = content.replace(
  'verdict: "Moderado",\\n      estimatedCalories: 650,',
  'dish: description,\\n      verdict: "Moderado",\\n      estimatedCalories: 650,'
);

fs.writeFileSync('src/lib/gemini.server.ts', content);
console.log('Fixed fallbacks');
