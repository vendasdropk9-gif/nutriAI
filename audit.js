const fs = require('fs');
const path = require('path');

const targetFiles = [
  'AnatomyWorkoutGuide.tsx', 'PersonalTrainer.tsx', 'WorkoutTracker.tsx', 'BodyAnalyzer.tsx', // Fitness
  'SmartPlateCombiner.tsx', 'SmartFridge.tsx', 'RecipeCard.tsx', 'JuiceGenerator.tsx', // Nutricao
  'FoodAllergyDetector.tsx', 'Generator.tsx', 'QuickDishes.tsx', 'PlateAnalyzer.tsx', 
  'DiningOut.tsx', 'MealPlanCalendar.tsx', 'NutritionalComparisonChart.tsx'
];

targetFiles.forEach(file => {
  const p = path.join(__dirname, 'src', 'components', file);
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, 'utf8');
    // very basic check for hardcoded portuguese text (has accented chars or common words)
    const matches = content.match(/([>\}]\s*)([A-Z][a-z]*(?:[áéíóúãõç][a-z]*|\s+[A-Za-z]+)+)(?=\s*[<\{])/g);
    if (matches && matches.length > 0) {
      console.log(`Found in ${file}: ${matches.length} matches`);
    }
  }
});
