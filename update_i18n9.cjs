const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'JuiceGenerator.tsx');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('useTranslation')) {
    content = content.replace(/(import React[^;]*;)/, `$1\nimport { useTranslation } from 'react-i18next';`);
    content = content.replace(/export function JuiceGenerator\([^)]*\)\s*{/, `export function JuiceGenerator({ profile, onAwardPoints, onBack }: JuiceGeneratorProps) {\n  const { t } = useTranslation();`);
}

const replacements = [
    { old: />Sucos naturais focados em emagrecimento, metabolismo e saúde, totalmente personalizados para o seu perfil com foto em alta resolução\.</g, new: ">{t('juice_hero_subtitle', 'Sucos naturais focados em emagrecimento, metabolismo e saúde, totalmente personalizados para o seu perfil com foto em alta resolução.')}<" },
    { old: />Sugestões:</g, new: ">{t('juice_suggestions', 'Sugestões:')}<" },
    { old: />Alta Resolução HD</g, new: ">{t('juice_high_res', 'Alta Resolução HD')}<" },
    { old: />Foto Culinária HD</g, new: ">{t('juice_culinary_photo', 'Foto Culinária HD')}<" },
    { old: />Benefícios para o seu objetivo</g, new: ">{t('juice_benefits_goal', 'Benefícios para o seu objetivo')}<" }
];

replacements.forEach(r => {
    content = content.replace(r.old, r.new);
});

fs.writeFileSync(filePath, content);
console.log("Done JuiceGenerator");
