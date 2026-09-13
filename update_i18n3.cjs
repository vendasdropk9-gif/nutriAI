const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'SmartPlateCombiner.tsx');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('useTranslation')) {
    content = content.replace(/(import React[^;]*;)/, `$1\nimport { useTranslation } from 'react-i18next';`);
    content = content.replace(/export function SmartPlateCombiner\([^)]*\)\s*{/, `export function SmartPlateCombiner({ profile, onAwardPoints, onBack }: SmartPlateCombinerProps) {\n  const { t } = useTranslation();`);
}

const replacements = [
    { old: />Histórico de Refeições Fora de Casa</g, new: ">{t('spc_history_title', 'Histórico de Refeições Fora de Casa')}<" },
    { old: />Nenhum histórico encontrado\.</g, new: ">{t('spc_no_history', 'Nenhum histórico encontrado.')}<" },
    { old: />Está no restaurante e não sabe o que escolher\?</g, new: ">{t('spc_hero_title', 'Está no restaurante e não sabe o que escolher?')}<" },
    { old: />Tire fotos das opções disponíveis e deixe a Inteligência Artificial encontrar uma combinação mais adequada ao seu objetivo com fotos dos pratos\.</g, new: ">{t('spc_hero_subtitle', 'Tire fotos das opções disponíveis e deixe a Inteligência Artificial encontrar uma combinação mais adequada ao seu objetivo com fotos dos pratos.')}<" },
    { old: />Fotografe as opções</g, new: ">{t('spc_photo_options', 'Fotografe as opções')}<" },
    { old: />Tire fotos do buffet, das travessas, ou do cardápio do restaurante\. \(Máx\. 5 fotos\)</g, new: ">{t('spc_photo_hint', 'Tire fotos do buffet, das travessas, ou do cardápio do restaurante. (Máx. 5 fotos)')}<" },
    { old: />Qual o seu objetivo nesta refeição\?</g, new: ">{t('spc_goal_question', 'Qual o seu objetivo nesta refeição?')}<" },
    { old: />Analisando opções e montando prato\.\.\.</g, new: ">{t('spc_analyzing', 'Analisando opções e montando prato...')}<" },
    { old: />Gastronomia Saudável & Nutritiva</g, new: ">{t('spc_gastronomy_badge', 'Gastronomia Saudável & Nutritiva')}<" },
    { old: />Sua combinação inteligente está pronta</g, new: ">{t('spc_combination_ready', 'Sua combinação inteligente está pronta')}<" }
];

replacements.forEach(r => {
    content = content.replace(r.old, r.new);
});

fs.writeFileSync(filePath, content);
console.log("Done SmartPlateCombiner");
