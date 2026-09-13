const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'SmartFridge.tsx');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('useTranslation')) {
    content = content.replace(/(import React[^;]*;)/, `$1\nimport { useTranslation } from 'react-i18next';`);
    content = content.replace(/export function SmartFridge\([^)]*\)\s*{/, `export function SmartFridge({ profile, onAwardPoints, onBack }: SmartFridgeProps) {\n  const { t } = useTranslation();`);
}

const replacements = [
    { old: />Nutrição Sem Desperdício</g, new: ">{t('fridge_hero_title', 'Nutrição Sem Desperdício')}<" },
    { old: />Tire fotos de seus alimentos para que a IA os identifique, gerencie prazos de validade e crie receitas saudáveis\.</g, new: ">{t('fridge_hero_subtitle', 'Tire fotos de seus alimentos para que a IA os identifique, gerencie prazos de validade e crie receitas saudáveis.')}<" },
    { old: />Próx\. Vencimento</g, new: ">{t('fridge_next_expiration', 'Próx. Vencimento')}<" },
    { old: />A IA irá escanear a foto, detectar vegetais, proteínas, embalagens de laticínios, frutas, e deduzir o frescor geral\.</g, new: ">{t('fridge_scan_hint', 'A IA irá escanear a foto, detectar vegetais, proteínas, embalagens de laticínios, frutas, e deduzir o frescor geral.')}<" },
    { old: />Ou teste rápido com um exemplo:</g, new: ">{t('fridge_quick_test', 'Ou teste rápido com um exemplo:')}<" },
    { old: />A Inteligência Artificial está analisando\.\.\.</g, new: ">{t('fridge_analyzing', 'A Inteligência Artificial está analisando...')}<" },
    { old: />Identificando ingredientes, deduzindo data estimada de vencimento e criando sugestões de receitas exclusivas\.</g, new: ">{t('fridge_analyzing_hint', 'Identificando ingredientes, deduzindo data estimada de vencimento e criando sugestões de receitas exclusivas.')}<" },
    { old: />Sugestões de Receitas Saudáveis</g, new: ">{t('fridge_healthy_recipes', 'Sugestões de Receitas Saudáveis')}<" },
    { old: />Ver Instruções</g, new: ">{t('fridge_view_instructions', 'Ver Instruções')}<" },
    { old: />Sugestão Automática de Compras</g, new: ">{t('fridge_shopping_suggestion', 'Sugestão Automática de Compras')}<" }
];

replacements.forEach(r => {
    content = content.replace(r.old, r.new);
});

fs.writeFileSync(filePath, content);
console.log("Done SmartFridge");
