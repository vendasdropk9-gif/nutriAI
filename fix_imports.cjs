const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = glob.sync('src/**/*.tsx').concat(glob.sync('src/**/*.ts'));

for (const file of files) {
  if (file === 'src/lib/firebase.ts' || file === 'src/lib/firebaseUtils.ts') continue;
  
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Replace static imports
  if (content.match(/import\s+{([^}]+)}\s+from\s+['"]firebase\/firestore['"]/)) {
    content = content.replace(/import\s+{([^}]+)}\s+from\s+['"]firebase\/firestore['"];?/g, (match, p1) => {
      const depth = file.split('/').length - 2;
      const firebasePath = depth === 0 ? './lib/firebase' : (depth === 1 ? '../' : '../../') + 'lib/firebase';
      return `import { ${p1.trim()} } from '${firebasePath}';`;
    });
    changed = true;
  }

  // Replace dynamic imports
  if (content.includes("import('firebase/firestore')")) {
    const depth = file.split('/').length - 2;
    const firebasePath = depth === 0 ? './lib/firebase' : (depth === 1 ? '../' : '../../') + 'lib/firebase';
    content = content.replace(/import\(['"]firebase\/firestore['"]\)/g, `import('${firebasePath}')`);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
