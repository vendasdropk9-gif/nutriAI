const fs = require('fs');
let content = fs.readFileSync('src/components/MealPlanCalendar.tsx', 'utf8');

// Fix the extra div
content = content.replace(
  /<\/div>\s*<div className="flex flex-col sm:flex-row gap-2">/g,
  '<div className="flex flex-col sm:flex-row gap-2">'
);

fs.writeFileSync('src/components/MealPlanCalendar.tsx', content);
