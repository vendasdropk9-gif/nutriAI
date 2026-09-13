const fs = require('fs');
const path = require('path');

const commonJsonPath = path.join(__dirname, 'src', 'locales', 'pt-BR', 'common.json');
let commonJson = JSON.parse(fs.readFileSync(commonJsonPath, 'utf8'));

// Helper to add translation
function addT(key, value) {
    if (!commonJson[key]) {
        commonJson[key] = value;
    }
}

// Write back
function saveT() {
    fs.writeFileSync(commonJsonPath, JSON.stringify(commonJson, null, 2));
}

// Let's do a targeted replace for PlateAnalyzer.tsx
const paPath = path.join(__dirname, 'src', 'components', 'PlateAnalyzer.tsx');
let paContent = fs.readFileSync(paPath, 'utf8');

if (!paContent.includes('useTranslation')) {
    paContent = paContent.replace(/(import React[^;]*;)/, `$1\nimport { useTranslation } from 'react-i18next';`);
    paContent = paContent.replace(/export function PlateAnalyzer\([^)]*\)\s*{/, `export function PlateAnalyzer(props: any) {\n  const { t } = useTranslation();`);
}

// targeted replacements
const replacementsPA = [
    { old: />Análise de Prato</g, new: ">{t('analyzer_title', 'Análise de Prato')}<" },
    { old: />Tire ou envie uma foto do seu prato para calcular calorias, macronutrientes e gerar um card de compartilhamento em alta definição\.</g, new: ">{t('analyzer_subtitle', 'Tire ou envie uma foto do seu prato para calcular calorias, macronutrientes e gerar um card de compartilhamento em alta definição.')}<" },
    { old: />Como deseja registrar sua refeição\?</g, new: ">{t('analyzer_how_to_register', 'Como deseja registrar sua refeição?')}<" },
    { old: />Aponte a câmera ao vivo para o seu prato ou envie uma foto já salva na sua galeria\.</g, new: ">{t('analyzer_camera_hint', 'Aponte a câmera ao vivo para o seu prato ou envie uma foto já salva na sua galeria.')}<" },
    { old: />Voltar para Seleção</g, new: ">{t('analyzer_back_selection', 'Voltar para Seleção')}<" },
    { old: />Nossa inteligência artificial está escaneando proporções, calorias e equilíbrio da refeição\.</g, new: ">{t('analyzer_scanning', 'Nossa inteligência artificial está escaneando proporções, calorias e equilíbrio da refeição.')}<" },
    { old: />Cancelar análise</g, new: ">{t('analyzer_cancel', 'Cancelar análise')}<" },
    { old: />Avaliação da sua refeição</g, new: ">{t('analyzer_evaluation', 'Avaliação da sua refeição')}<" },
    { old: />Proteína</g, new: ">{t('analyzer_protein', 'Proteína')}<" }
];

replacementsPA.forEach(r => {
    paContent = paContent.replace(r.old, r.new);
});

fs.writeFileSync(paPath, paContent);
saveT();
console.log("Done PlateAnalyzer");
