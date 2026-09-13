const fs = require('fs');
const path = require('path');

const targetFiles = [
  'AnatomyWorkoutGuide.tsx', 'PersonalTrainer.tsx', 'WorkoutTracker.tsx', 'BodyAnalyzer.tsx', 
  'SmartPlateCombiner.tsx', 'SmartFridge.tsx', 'RecipeCard.tsx', 'JuiceGenerator.tsx', 
  'FoodAllergyDetector.tsx', 'Generator.tsx', 'QuickDishes.tsx', 'PlateAnalyzer.tsx', 
  'DiningOut.tsx', 'MealPlanCalendar.tsx', 'NutritionalComparisonChart.tsx'
];

targetFiles.forEach(file => {
  const p = path.join(__dirname, 'src', 'components', file);
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, 'utf8');
    // Check for hardcoded texts inside JSX
    // This looks for anything between > and < that contains Portuguese specific letters or common words
    const matches = content.match(/>([^<\{]+[áéíóúãõç]+[^<\{]*)<\//gi);
    console.log(`\n--- ${file} ---`);
    if (matches) {
        // filter out only whitespace
        const cleanMatches = matches.map(m => m.replace(/^>/, '').replace(/<\/?$/, '').trim()).filter(m => m.length > 1);
        if (cleanMatches.length > 0) {
            console.log(cleanMatches.slice(0, 10).join(' | '));
            console.log(`Total: ${cleanMatches.length}`);
        } else {
            console.log("None");
        }
    } else {
        console.log("None");
    }
  }
});
