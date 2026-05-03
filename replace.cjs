const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');
const navStart = content.indexOf('<nav className=\"flex items-center');
const navEnd = content.indexOf('</nav>', navStart) + 6;

let navCode = content.substring(navStart, navEnd);

navCode = navCode.replace(/<button/g, '<motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}');
navCode = navCode.replace(/<\/button>/g, '</motion.button>');

content = content.substring(0, navStart) + navCode + content.substring(navEnd);
fs.writeFileSync('src/App.tsx', content);

console.log("Done!");
