const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'MealPlanCalendar.tsx');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('useTranslation')) {
    content = content.replace(/(import React[^;]*;)/, `$1\nimport { useTranslation } from 'react-i18next';`);
    content = content.replace(/export function MealPlanCalendar\([^)]*\)\s*{/, `export function MealPlanCalendar({ profile, onBack }: MealPlanCalendarProps) {\n  const { t } = useTranslation();`);
}

const replacements = [
    { old: />Organize suas refeições geradas pela IA e mantenha o foco na sua rotina saudável\.</g, new: ">{t('mealplan_subtitle', 'Organize suas refeições geradas pela IA e mantenha o foco na sua rotina saudável.')}<" },
    { old: />Planeje suas 3 principais refeições\.</g, new: ">{t('mealplan_plan_hint', 'Planeje suas 3 principais refeições.')}<" },
    { old: />Acompanhamento Nutricional Diário</g, new: ">{t('mealplan_daily_tracking', 'Acompanhamento Nutricional Diário')}<" },
    { old: />Calorias Diárias</g, new: ">{t('mealplan_daily_calories', 'Calorias Diárias')}<" },
    { old: />Fibras e Açúcares</g, new: ">{t('mealplan_fiber_sugar', 'Fibras e Açúcares')}<" },
    { old: />Açúcares Diários</g, new: ">{t('mealplan_daily_sugar', 'Açúcares Diários')}<" },
    { old: />Nenhum micronutriente registrado para as refeições deste dia\.</g, new: ">{t('mealplan_no_micronutrients', 'Nenhum micronutriente registrado para as refeições deste dia.')}<" },
    { old: />Adicionar Refeição</g, new: ">{t('mealplan_add_meal', 'Adicionar Refeição')}<" },
    { old: />Proteínas/g, new: ">{t('mealplan_proteins', 'Proteínas')}<" },
    { old: />Proteína</g, new: ">{t('mealplan_protein', 'Proteína')}<" }
];

replacements.forEach(r => {
    content = content.replace(r.old, r.new);
});

fs.writeFileSync(filePath, content);
console.log("Done MealPlanCalendar");
