const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    
    let isModified = false;
    let newCode = code;
    
    // Add imports if needed
    if (newCode.includes('new Audio(url)') || newCode.includes('new Audio(audioUrl)')) {
        if (!newCode.includes('playAudioUrl')) {
             if (newCode.includes('../lib/speech')) {
                 newCode = newCode.replace(/import \{([^}]+)\} from '\.\.\/lib\/speech'/g, (match, imports) => {
                     if (!imports.includes('playAudioUrl')) {
                         return `import {${imports}, playAudioUrl} from '../lib/speech'`;
                     }
                     return match;
                 });
             } else {
                 newCode = `import { playAudioUrl } from '../lib/speech';\n` + newCode;
             }
             isModified = true;
        }
        
        // Find playAssistantVoice or speak
        newCode = newCode.replace(/const audio = new Audio\((audioUrl|url)\);\s*audio\.onended = \(\) => setIsPlaying\(false\);\s*audio\.play\(\);/g, `await playAudioUrl($1, { onEnded: () => setIsPlaying(false) });`);
        
        newCode = newCode.replace(/const audio = new Audio\((audioUrl|url)\);\s*audio\.onended = \(\) => setIsSpeaking\(false\);\s*audio\.play\(\);/g, `await playAudioUrl($1, { onEnded: () => setIsSpeaking(false) });`);

    }
    
    if (isModified || code !== newCode) {
        fs.writeFileSync(filePath, newCode, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

function traverse(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            traverse(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            replaceInFile(fullPath);
        }
    });
}

traverse(path.join(__dirname, 'src'));
