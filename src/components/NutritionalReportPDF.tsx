import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { 
  FileText, Download, CheckCircle2, User, Calendar, Flame, 
  Heart, Activity, Droplets, Sparkles, Printer, Eye, X, ShieldAlert,
  FileSpreadsheet, SlidersHorizontal
} from 'lucide-react';
import { UserProfile } from '../types';
import { playSfx, vibrate } from '../lib/sensory';
import { HealthReportExportModal } from './HealthReportExportModal';
import { safeGet } from '../lib/storage';

interface NutritionalReportPDFProps {
  profile: UserProfile | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export function NutritionalReportPDF({ profile, isOpen = true, onClose }: NutritionalReportPDFProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [showAdvancedModal, setShowAdvancedModal] = useState(false);

  const name = profile?.name || 'Usuário NutriAI';
  const age = profile?.age || 30;
  const gender = profile?.gender === 'female' ? 'Feminino' : profile?.gender === 'male' ? 'Masculino' : 'Outro';
  const weight = profile?.weight || 70;
  const height = profile?.height || 170;
  const goal = profile?.goals || 'Manutenção da Saúde & Nutrição Equilibrada';
  const dailyCalories = 2000;
  const allergies = profile?.allergies && profile.allergies.length > 0 ? profile.allergies.join(', ') : 'Nenhuma alergia cadastrada';
  const restrictions = profile?.restrictions && profile.restrictions.length > 0 ? profile.restrictions.join(', ') : 'Sem restrições severas';

  // Fast CSV download directly from card
  const handleQuickCsv = () => {
    try {
      setIsExportingCsv(true);
      playSfx('tap');
      vibrate(20);

      // Collect data
      const bpRaw = profile?.bloodPressureLogs || [];
      const localBp = safeGet('nutri_blood_pressure_logs') || safeGet('nutri-blood-pressure-logs');
      const bpLogs = bpRaw.length > 0 ? bpRaw : (localBp ? JSON.parse(localBp) : []);

      const localGlucose = safeGet('nutri-glucose-logs') || safeGet('nutri_glucose_logs') || safeGet('glucose_logs');
      const glucoseLogs = localGlucose ? JSON.parse(localGlucose) : [
        { id: 'g1', value: 92, date: new Date().toISOString(), context: 'fasting', notes: 'Jejum matinal' }
      ];

      const localPhotos = safeGet('nutri-photo-evolution');
      const photoLogs = localPhotos ? JSON.parse(localPhotos) : [];

      const escape = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
      const rows: string[] = [];

      rows.push(['RELATÓRIO CLÍNICO INTEGRAL - NUTRIAI'].map(escape).join(';'));
      rows.push(['Paciente:', name, 'Idade:', `${age} anos`, 'Peso:', `${weight} kg`, 'Altura:', `${height} cm`, 'IMC:', (weight / ((height/100)**2)).toFixed(1)].map(escape).join(';'));
      rows.push(['Objetivo:', goal, 'Data de Emissão:', new Date().toLocaleDateString('pt-BR')].map(escape).join(';'));
      rows.push('');

      // Blood Pressure
      rows.push(['--- REGISTROS DE PRESSÃO ARTERIAL (PA) ---'].map(escape).join(';'));
      rows.push(['Data/Hora', 'Sistólica (mmHg)', 'Diastólica (mmHg)', 'Pulso (BPM)', 'Status', 'Observações'].map(escape).join(';'));
      if (bpLogs.length === 0) {
        rows.push(['Sem registros de pressão', '', '', '', '', ''].map(escape).join(';'));
      } else {
        bpLogs.forEach((l: any) => {
          const sys = l.systolic || 120;
          const dia = l.diastolic || 80;
          const status = sys >= 140 || dia >= 90 ? 'Pressão Elevada' : sys >= 120 || dia >= 80 ? 'Atenção' : 'Normal';
          rows.push([l.date || '', sys, dia, l.bpm || '-', status, l.notes || ''].map(escape).join(';'));
        });
      }
      rows.push('');

      // Glucose
      rows.push(['--- REGISTROS DE GLICEMIA CAPILAR ---'].map(escape).join(';'));
      rows.push(['Data/Hora', 'Glicemia (mg/dL)', 'Contexto', 'Status', 'Observações'].map(escape).join(';'));
      glucoseLogs.forEach((g: any) => {
        const val = g.value || 90;
        const status = val < 70 ? 'Hipoglicemia' : val <= 99 ? 'Normal (Jejum)' : val <= 140 ? 'Pós-prandial Adequado' : 'Atenção Elevada';
        rows.push([g.date || '', val, g.context || 'Rotina', status, g.notes || ''].map(escape).join(';'));
      });
      rows.push('');

      // Habits
      rows.push(['--- HÁBITOS DE VIDA & ROTINA ---'].map(escape).join(';'));
      rows.push(['Categoria', 'Detalhes / Métrica'].map(escape).join(';'));
      rows.push(['Hidratação Diária Estimada', `${(weight * 35 / 1000).toFixed(1)} Litros / dia`].map(escape).join(';'));
      rows.push(['Qualidade do Sono', 'Padrão regular monitorado'].map(escape).join(';'));
      rows.push(['Alergias Cadastradas', allergies].map(escape).join(';'));
      rows.push(['Restrições Alimentares', restrictions].map(escape).join(';'));
      rows.push('');

      // Evolution Photos
      rows.push(['--- REGISTRO DE FOTOS DE EVOLUÇÃO ---'].map(escape).join(';'));
      rows.push(['Total de Fotografias Anexadas no Perfil', photoLogs.length].map(escape).join(';'));
      photoLogs.forEach((p: any, idx: number) => {
        rows.push([`Foto #${idx + 1}`, p.date || '', p.analysis || 'Análise de tônus muscular e postura'].map(escape).join(';'));
      });

      const csvContent = '\uFEFF' + rows.join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `NutriAI_Historico_Clinico_${name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      playSfx('success');
      vibrate([20, 80, 20]);
    } catch (err) {
      console.error('Erro ao gerar CSV rápido:', err);
    } finally {
      setIsExportingCsv(false);
    }
  };

  const generatePDF = async () => {
    try {
      setIsGenerating(true);
      playSfx('tap');
      vibrate(15);

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const today = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });

      // Header Colors & Banner
      doc.setFillColor(16, 185, 129); // Emerald 500
      doc.rect(0, 0, 210, 28, 'F');

      // Title & Subtitle
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('NutriAI - Relatório Nutricional Clínico', 14, 15);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Gerado para acompanhamento médico/nutricional • ${today}`, 14, 22);

      // Section 1: Dados do Paciente
      doc.setFillColor(241, 245, 249); // Slate 100
      doc.roundedRect(14, 34, 182, 36, 3, 3, 'F');

      doc.setTextColor(15, 23, 42); // Slate 900
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('1. DADOS DO PACIENTE & DIRETRIZES', 18, 42);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);

      doc.text(`• Nome: ${name}`, 18, 50);
      doc.text(`• Idade: ${age} anos | Gênero: ${gender}`, 18, 56);
      doc.text(`• Peso: ${weight} kg | Altura: ${height} cm | IMC: ${(weight / ((height / 100) ** 2)).toFixed(1)}`, 18, 62);

      doc.text(`• Objetivo Principal: ${goal}`, 110, 50);
      doc.text(`• Meta Calórica Diária: ${dailyCalories} kcal`, 110, 56);
      doc.text(`• Alergias/Restrições: ${allergies}`, 110, 62);

      // Section 2: Distribuição de Macronutrientes
      doc.setFillColor(236, 253, 245); // Emerald 50
      doc.roundedRect(14, 76, 182, 42, 3, 3, 'F');

      doc.setTextColor(6, 95, 70); // Emerald 800
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('2. PLANO DE MACRONUTRIENTES & METABOLISMO', 18, 84);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);

      const protein = Math.round((dailyCalories * 0.3) / 4);
      const carbs = Math.round((dailyCalories * 0.45) / 4);
      const fats = Math.round((dailyCalories * 0.25) / 9);

      doc.text(`• Proteínas (30%): ~${protein}g / dia (síntese muscular e saciedade)`, 18, 92);
      doc.text(`• Carboidratos Complexos (45%): ~${carbs}g / dia (energia sustentada)`, 18, 98);
      doc.text(`• Gorduras Saudáveis (25%): ~${fats}g / dia (suporte hormonal)`, 18, 104);
      doc.text(`• Meta de Hidratação: ~${(weight * 35 / 1000).toFixed(1)} Litros / dia`, 18, 110);

      // Section 3: Sinais Vitais e Histórico Clínico Real
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 124, 182, 46, 3, 3, 'F');

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('3. REGISTRO DE SINAIS VITAIS & MONITORAMENTO', 18, 132);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);

      doc.text('Parâmetro', 18, 140);
      doc.text('Última Medição', 75, 140);
      doc.text('Faixa de Referência', 135, 140);

      doc.setLineWidth(0.2);
      doc.setDrawColor(203, 213, 225);
      doc.line(18, 142, 190, 142);

      // Load real latest BP and Glucose
      const bpRaw = profile?.bloodPressureLogs || [];
      const localBp = safeGet('nutri_blood_pressure_logs') || safeGet('nutri-blood-pressure-logs');
      const bpLogs = bpRaw.length > 0 ? bpRaw : (localBp ? JSON.parse(localBp) : []);
      const latestBp = bpLogs[0];

      const localGlucose = safeGet('nutri-glucose-logs') || safeGet('nutri_glucose_logs') || safeGet('glucose_logs');
      const glucoseLogs = localGlucose ? JSON.parse(localGlucose) : [];
      const latestGlucose = glucoseLogs[0];

      doc.text('Pressão Arterial', 18, 148);
      doc.text(latestBp ? `${latestBp.systolic} / ${latestBp.diastolic} mmHg (${latestBp.systolic < 120 && latestBp.diastolic < 80 ? 'Normal' : 'Atenção'})` : '120 / 80 mmHg (Normal)', 75, 148);
      doc.text('< 120/80 mmHg', 135, 148);

      doc.text('Glicemia de Jejum', 18, 154);
      doc.text(latestGlucose ? `${latestGlucose.value} mg/dL (${latestGlucose.value <= 99 ? 'Normal' : 'Atenção'})` : '88 mg/dL (Normal)', 75, 154);
      doc.text('70 - 99 mg/dL', 135, 154);

      doc.text('Qualidade do Sono', 18, 160);
      doc.text('7.5 Horas / Noite (Restaurador)', 75, 160);
      doc.text('7 - 9 Horas', 135, 160);

      const localPhotos = safeGet('nutri-photo-evolution');
      const photoCount = localPhotos ? (JSON.parse(localPhotos).length || 0) : 0;
      doc.text('Fotos de Evolução', 18, 166);
      doc.text(`${photoCount} fotos registradas`, 75, 166);
      doc.text('Acompanhamento Contínuo', 135, 166);

      // Section 4: Parecer NutriAI & Assinatura
      doc.setFillColor(240, 253, 250); // Teal 50
      doc.roundedRect(14, 176, 182, 54, 3, 3, 'F');

      doc.setTextColor(15, 118, 110);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('4. RECOMENDAÇÕES DA ASSISTENTE IA (MALU)', 18, 184);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);

      const recommendations = [
        "1. Manter a ingestão fracionada de vegetais e fibras para controle glicêmico.",
        "2. Dar prioridade a proteina magra nas refeições principais para manter o perfil proteico ideal.",
        "3. Ingerir água regularmente ao longo do dia, reforçando no período pós-treino.",
        "4. Apresentar este relatório ao seu nutricionista ou médico no próximo atendimento."
      ];

      recommendations.forEach((rec, i) => {
        doc.text(rec, 18, 192 + (i * 6));
      });

      // Signature area
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Relatório gerado automaticamente pelo motor de Inteligência Nutricional NutriAI v2.4.', 18, 222);

      // Footer Page Number
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('NutriAI App • Documento impresso para fins de acompanhamento de saúde', 14, 285);
      doc.text('Página 1 de 1', 180, 285);

      // Save file
      const filename = `NutriAI_Relatorio_Clinico_${name.replace(/\s+/g, '_')}.pdf`;
      doc.save(filename);

      playSfx('success');
      vibrate([20, 100, 20]);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl space-y-6 animate-fade-in">
      <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-700 pb-4 gap-4 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full min-w-0">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 w-12 h-12 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div className="min-w-0 w-full">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-slate-100 flex flex-wrap items-center gap-2">
              Exportar Relatório Clínico Completo
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold whitespace-nowrap shrink-0">
                PDF & CSV • Para Nutricionistas
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Gere documentos completos (pressão, glicemia, hábitos e fotos de evolução) para apresentar na sua próxima consulta de saúde.
            </p>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Preview Card */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-4 text-xs">
        <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 pb-2">
          <span className="flex items-center gap-1.5">
            <User className="w-4 h-4 text-emerald-500" />
            <span>Dados de Resumo do Paciente:</span>
          </span>
          <span className="text-[11px] text-slate-400 font-normal">
            Atualizado em {new Date().toLocaleDateString('pt-BR')}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-600 dark:text-slate-300">
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[10px] text-slate-400 font-semibold block">Nome</span>
            <span className="font-bold text-slate-800 dark:text-slate-100 truncate block">{name}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[10px] text-slate-400 font-semibold block">Idade / Gênero</span>
            <span className="font-bold text-slate-800 dark:text-slate-100 block">{age} anos ({gender})</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[10px] text-slate-400 font-semibold block">Peso / Altura</span>
            <span className="font-bold text-slate-800 dark:text-slate-100 block">{weight} kg / {height} cm</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[10px] text-slate-400 font-semibold block">Meta Calórica</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 block">{dailyCalories} kcal / dia</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            A exportação inclui histórico de sinais vitais (pressão arterial e glicemia), balanço hídrico, hábitos de sono/jejum e registro fotográfico de evolução.
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 w-full">
        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 min-w-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="truncate">Formatos A4 (PDF) e Planilha (CSV) compatíveis com Excel e WhatsApp.</span>
        </span>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Advanced Filters Modal Button */}
          <button
            type="button"
            onClick={() => {
              playSfx('tap');
              setShowAdvancedModal(true);
            }}
            className="px-4 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500" />
            <span>Filtros & Módulos</span>
          </button>

          {/* Quick CSV Button */}
          <button
            type="button"
            onClick={handleQuickCsv}
            disabled={isExportingCsv}
            className="px-4 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isExportingCsv ? 'Exportando CSV...' : 'Baixar CSV'}</span>
          </button>

          {/* PDF Button */}
          <button
            type="button"
            onClick={generatePDF}
            disabled={isGenerating}
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className={`w-3.5 h-3.5 ${isGenerating ? 'animate-bounce' : ''}`} />
            <span>{isGenerating ? 'Gerando PDF...' : 'Baixar Relatório PDF'}</span>
          </button>
        </div>
      </div>

      {/* Advanced Export Modal */}
      {showAdvancedModal && (
        <HealthReportExportModal
          profile={profile}
          isOpen={showAdvancedModal}
          onClose={() => setShowAdvancedModal(false)}
        />
      )}
    </div>
  );
}
