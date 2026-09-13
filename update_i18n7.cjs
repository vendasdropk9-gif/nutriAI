const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'RecipeCard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('useTranslation')) {
    content = content.replace(/(import React[^;]*;)/, `$1\nimport { useTranslation } from 'react-i18next';`);
    content = content.replace(/export function RecipeCard\([^)]*\)\s*{/, `export function RecipeCard({ recipe, onSave, onBack }: RecipeCardProps) {\n  const { t } = useTranslation();`);
}

const replacements = [
    { old: />Modo de Leitura Acessível</g, new: ">{t('recipe_accessible_reading', 'Modo de Leitura Acessível')}<" },
    { old: />Proteínas & Macros</g, new: ">{t('recipe_proteins_macros', 'Proteínas & Macros')}<" },
    { old: />Narração em Áudio Completa</g, new: ">{t('recipe_full_audio_narration', 'Narração em Áudio Completa')}<" },
    { old: />Ouça toda a receita narrada pela voz da NutriAI Malu</g, new: ">{t('recipe_audio_hint', 'Ouça toda a receita narrada pela voz da NutriAI Malu')}<" },
    { old: />Pausar Áudio da Receita</g, new: ">{t('recipe_pause_audio', 'Pausar Áudio da Receita')}<" },
    { old: />Toque nos ingredientes para marcá-los conforme for separando</g, new: ">{t('recipe_ingredients_hint', 'Toque nos ingredientes para marcá-los conforme for separando')}<" },
    { old: />Siga as instruções com calma\. Toque em "Ouvir este passo" para narração isolada\.</g, new: `>{t('recipe_instructions_hint', 'Siga as instruções com calma. Toque em "Ouvir este passo" para narração isolada.')}<` },
    { old: />Visualização da Receita</g, new: ">{t('recipe_visualization', 'Visualização da Receita')}<" },
    { old: />Deseja ver como seu prato ficará\? Gere uma visualização premium e realista com nossa IA\.</g, new: ">{t('recipe_visualization_hint', 'Deseja ver como seu prato ficará? Gere uma visualização premium e realista com nossa IA.')}<" },
    { old: />Que horas deseja que a refeição esteja pronta\?</g, new: ">{t('recipe_time_question', 'Que horas deseja que a refeição esteja pronta?')}<" }
];

replacements.forEach(r => {
    content = content.replace(r.old, r.new);
});

fs.writeFileSync(filePath, content);
console.log("Done RecipeCard");
