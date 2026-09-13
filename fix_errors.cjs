const fs = require('fs');
const path = require('path');

// 1. AnatomyWorkoutGuide.tsx
const anatomyPath = path.join(__dirname, 'src', 'components', 'AnatomyWorkoutGuide.tsx');
let anatomy = fs.readFileSync(anatomyPath, 'utf8');
anatomy = anatomy.replace(/export function AnatomyWorkoutGuide\(\{\s*profile,\s*onBack,\s*onComplete\s*\}\s*:\s*AnatomyWorkoutGuideProps\)\s*\{/, "export function AnatomyWorkoutGuide() {");
fs.writeFileSync(anatomyPath, anatomy);

// 2. BodyAnalyzer.tsx
const bodyPath = path.join(__dirname, 'src', 'components', 'BodyAnalyzer.tsx');
let body = fs.readFileSync(bodyPath, 'utf8');
body = body.replace(/export function BodyAnalyzer\(\{\s*profile,\s*onBack\s*\}\s*:\s*BodyAnalyzerProps\)\s*\{/, "import { UserProfile } from '../types';\nexport function BodyAnalyzer({ profile, onUpdateProfile, onAwardPoints }: { profile: UserProfile | null; onUpdateProfile: (p: Partial<UserProfile>) => void; onAwardPoints?: (points: number, reason: string) => void }) {");
fs.writeFileSync(bodyPath, body);

// 3. JuiceGenerator.tsx
const juicePath = path.join(__dirname, 'src', 'components', 'JuiceGenerator.tsx');
let juice = fs.readFileSync(juicePath, 'utf8');
juice = juice.replace(/export function JuiceGenerator\(\{\s*profile,\s*onAwardPoints,\s*onBack\s*\}\s*:\s*JuiceGeneratorProps\)\s*\{/, "export function JuiceGenerator({ profile, onAwardPoints }: { profile: any; onAwardPoints?: (points: number, reason: string) => void }) {");
fs.writeFileSync(juicePath, juice);

// 4. MealPlanCalendar.tsx
const mealPath = path.join(__dirname, 'src', 'components', 'MealPlanCalendar.tsx');
let meal = fs.readFileSync(mealPath, 'utf8');
if (!meal.includes('useTranslation')) {
    meal = meal.replace(/(import React[^;]*;)/, `$1\nimport { useTranslation } from 'react-i18next';`);
}
meal = meal.replace(/export function MealPlanView\(([^)]+)\)\s*\{/, "export function MealPlanView($1) {\n  const { t } = useTranslation();");
fs.writeFileSync(mealPath, meal);

// 5. PlateAnalyzer.tsx
const platePath = path.join(__dirname, 'src', 'components', 'PlateAnalyzer.tsx');
let plate = fs.readFileSync(platePath, 'utf8');
plate = plate.replace(/export function PlateAnalyzer\(props:\s*any\)\s*\{/, "export function PlateAnalyzer({ profile, onAwardPoints }: { profile: any; onAwardPoints?: (points: number, reason: string) => void }) {");
fs.writeFileSync(platePath, plate);

// 6. RecipeCard.tsx
const recipePath = path.join(__dirname, 'src', 'components', 'RecipeCard.tsx');
let recipe = fs.readFileSync(recipePath, 'utf8');
recipe = recipe.replace(/export function RecipeCard\(\{\s*recipe,\s*onSave,\s*onBack\s*\}\s*:\s*RecipeCardProps\)\s*\{/, "export function RecipeCard({ recipe }: RecipeCardProps) {");
fs.writeFileSync(recipePath, recipe);

// 7. SmartFridge.tsx
const fridgePath = path.join(__dirname, 'src', 'components', 'SmartFridge.tsx');
let fridge = fs.readFileSync(fridgePath, 'utf8');
fridge = fridge.replace(/export function SmartFridge\(\{\s*profile,\s*onAwardPoints,\s*onBack\s*\}\s*:\s*SmartFridgeProps\)\s*\{/, "export function SmartFridge() {");
fs.writeFileSync(fridgePath, fridge);

// 8. SmartPlateCombiner.tsx
const spcPath = path.join(__dirname, 'src', 'components', 'SmartPlateCombiner.tsx');
let spc = fs.readFileSync(spcPath, 'utf8');
if (!spc.includes('useTranslation')) {
    spc = spc.replace(/(import React[^;]*;)/, `$1\nimport { useTranslation } from 'react-i18next';`);
}
spc = spc.replace(/export function SmartPlateCombiner\(\{\s*onClose,\s*profile\s*\}\s*:\s*\{\s*onClose:\s*\(\)\s*=>\s*void;\s*profile\?:\s*UserProfile\s*\}\)\s*\{/, "export function SmartPlateCombiner({ onClose, profile }: { onClose: () => void; profile?: any }) {\n  const { t } = useTranslation();");
fs.writeFileSync(spcPath, spc);

console.log("All fixed.");
