const fs = require('fs');
const path = require('path');

// --- PersonalTrainer.tsx ---
const ptPath = path.join(__dirname, 'src', 'components', 'PersonalTrainer.tsx');
let ptContent = fs.readFileSync(ptPath, 'utf8');

if (!ptContent.includes('useTranslation')) {
    ptContent = ptContent.replace(/(import React[^;]*;)/, `$1\nimport { useTranslation } from 'react-i18next';`);
    ptContent = ptContent.replace(/export function PersonalTrainer\([^)]*\)\s*{/, `export function PersonalTrainer({ profile, onAwardPoints, onUpdateProfile }: PersonalTrainerProps) {\n  const { t } = useTranslation();`);
}

const replacementsPT = [
    { old: />Treine em casa com precisão\. Siga seu plano de exercícios semanais sugerido pela IA ou inicie o treino guiado em 3D\.</g, new: ">{t('trainer_subtitle', 'Treine em casa com precisão. Siga seu plano de exercícios semanais sugerido pela IA ou inicie o treino guiado em 3D.')}<" },
    { old: />Sincronização de IA Ativa</g, new: ">{t('trainer_sync_active', 'Sincronização de IA Ativa')}<" },
    { old: />Inicie uma sessão 3D interativa! Escolha um dia específico na aba \*\*Plano Semanal\*\* ou gere um Treino Inteligente personalizado agora mesmo\.</g, new: ">{t('trainer_start_hint', 'Inicie uma sessão 3D interativa! Escolha um dia específico na aba **Plano Semanal** ou gere um Treino Inteligente personalizado agora mesmo.')}<" },
    { old: />Vença a si mesma!</g, new: ">{t('trainer_beat_yourself', 'Vença a si mesma!')}<" },
    { old: />Músculos Ativados:</g, new: ">{t('trainer_activated_muscles', 'Músculos Ativados:')}<" },
    { old: />Começar</g, new: ">{t('trainer_start', 'Começar')}<" },
    { old: />Benefício IA</g, new: ">{t('trainer_ai_benefit', 'Benefício IA')}<" },
    { old: />Olha só como a execução foi perfeita\./g, new: ">{t('trainer_perfect_execution', 'Olha só como a execução foi perfeita.')}<" }
];

replacementsPT.forEach(r => {
    ptContent = ptContent.replace(r.old, r.new);
});

fs.writeFileSync(ptPath, ptContent);
console.log("Done PersonalTrainer");
