const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'BodyAnalyzer.tsx');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('useTranslation')) {
    content = content.replace(/(import React[^;]*;)/, `$1\nimport { useTranslation } from 'react-i18next';`);
    content = content.replace(/export function BodyAnalyzer\([^)]*\)\s*{/, `export function BodyAnalyzer({ profile, onBack }: BodyAnalyzerProps) {\n  const { t } = useTranslation();`);
}

const replacements = [
    { old: />Portal Clínico Corporal</g, new: ">{t('body_portal_title', 'Portal Clínico Corporal')}<" },
    { old: />Clínica Corporal e Evolução</g, new: ">{t('body_clinic_evolution', 'Clínica Corporal e Evolução')}<" },
    { old: />Sua foto não é salva ou compartilhada\. O processamento é feito em tempo real para gerar dicas e depois a imagem é descartada\. Você também pode receber dicas sem enviar foto\.</g, new: ">{t('body_privacy_hint', 'Sua foto não é salva ou compartilhada. O processamento é feito em tempo real para gerar dicas e depois a imagem é descartada. Você também pode receber dicas sem enviar foto.')}<" },
    { old: />Análise por Foto</g, new: ">{t('body_photo_analysis', 'Análise por Foto')}<" },
    { old: />Tire uma foto frontal com roupas de treino ou envie da galeria para receber recomendações de evolução\.</g, new: ">{t('body_photo_hint', 'Tire uma foto frontal com roupas de treino ou envie da galeria para receber recomendações de evolução.')}<" },
    { old: />Prefiro não utilizar foto neste momento, mas quero orientações inteligentes da NutriAI com base no meu objetivo atual\.</g, new: ">{t('body_no_photo_hint', 'Prefiro não utilizar foto neste momento, mas quero orientações inteligentes da NutriAI com base no meu objetivo atual.')}<" },
    { old: />Nutrição</g, new: ">{t('body_nutrition', 'Nutrição')}<" },
    { old: />Rotina & Hidratação</g, new: ">{t('body_routine_hydration', 'Rotina & Hidratação')}<" }
];

replacements.forEach(r => {
    content = content.replace(r.old, r.new);
});

fs.writeFileSync(filePath, content);
console.log("Done BodyAnalyzer");
