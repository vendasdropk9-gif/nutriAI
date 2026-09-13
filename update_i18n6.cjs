const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'AnatomyWorkoutGuide.tsx');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('useTranslation')) {
    content = content.replace(/(import React[^;]*;)/, `$1\nimport { useTranslation } from 'react-i18next';`);
    content = content.replace(/export function AnatomyWorkoutGuide\([^)]*\)\s*{/, `export function AnatomyWorkoutGuide({ profile, onBack, onComplete }: AnatomyWorkoutGuideProps) {\n  const { t } = useTranslation();`);
}

const replacements = [
    { old: />Guia de Execução 3D</g, new: ">{t('anatomy_guide_title', 'Guia de Execução 3D')}<" },
    { old: />Selecione o grupo muscular para visualizar a anatomia, o movimento 3D biomecânico em tempo real com iluminação muscular e as orientações da Malu\.</g, new: ">{t('anatomy_guide_subtitle', 'Selecione o grupo muscular para visualizar a anatomia, o movimento 3D biomecânico em tempo real com iluminação muscular e as orientações da Malu.')}<" },
    { old: />Automático:</g, new: ">{t('anatomy_automatic', 'Automático:')}<" },
    { old: />Execução Correta</g, new: ">{t('anatomy_correct_execution', 'Execução Correta')}<" },
    { old: />Séries & Carga</g, new: ">{t('anatomy_sets_weight', 'Séries & Carga')}<" },
    { old: />Biomecânica & Músculo Alvo</g, new: ">{t('anatomy_biomechanics_target', 'Biomecânica & Músculo Alvo')}<" },
    { old: />Músculo Alvo Primário</g, new: ">{t('anatomy_primary_target', 'Músculo Alvo Primário')}<" },
    { old: />Sinérgicos \/ Auxiliares</g, new: ">{t('anatomy_synergists', 'Sinérgicos / Auxiliares')}<" },
    { old: />Passo a Passo da Repetição Perfeita:</g, new: ">{t('anatomy_step_by_step', 'Passo a Passo da Repetição Perfeita:')}<" },
    { old: />Evite estes erros posturais e de compensação muscular para proteger as articulações e garantir estímulo hipertrófico direto no músculo correto:</g, new: ">{t('anatomy_avoid_mistakes', 'Evite estes erros posturais e de compensação muscular para proteger as articulações e garantir estímulo hipertrófico direto no músculo correto:')}<" },
    { old: />Músculo Alvo:/g, new: ">{t('anatomy_target_muscle', 'Músculo Alvo:')}<" }
];

replacements.forEach(r => {
    content = content.replace(r.old, r.new);
});

fs.writeFileSync(filePath, content);
console.log("Done AnatomyWorkoutGuide");
