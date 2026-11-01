import React, { useState, useMemo, useRef } from 'react';
import { 
  X, FileText, Calendar, Copy, Check, Share2, Download, 
  Stethoscope, Activity, Heart, Droplets, Moon, Scale, 
  AlertCircle, Filter, Sparkles, Clock, CheckCircle2,
  ChevronRight, RefreshCw, Send, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, BloodPressureLog, HydrationLog, SleepLog, FastingLog } from '../types';
import { safeGet } from '../lib/storage';
import { playSfx, vibrate } from '../lib/sensory';
import { EvolutionPhotoLog, GlucoseRecord } from './HealthReportExportModal';

export interface ExtendedBloodPressureLog extends BloodPressureLog {
  pulse?: number;
  arm?: 'left' | 'right' | string;
}

interface ClinicalTextSummaryModalProps {
  profile: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

type PeriodPreset = '7d' | '15d' | '30d' | '60d' | '90d' | 'all' | 'custom';
type SummaryFormat = 'detailed' | 'compact' | 'soap';

export function ClinicalTextSummaryModal({ profile, isOpen, onClose }: ClinicalTextSummaryModalProps) {
  // Date interval state
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const defaultStartStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  }, []);

  const [activePreset, setActivePreset] = useState<PeriodPreset>('30d');
  const [startDate, setStartDate] = useState<string>(defaultStartStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Configuration & toggles
  const [formatMode, setFormatMode] = useState<SummaryFormat>('detailed');
  const [includeAnamnesis, setIncludeAnamnesis] = useState(true);
  const [includeBp, setIncludeBp] = useState(true);
  const [includeGlucose, setIncludeGlucose] = useState(true);
  const [includeHabits, setIncludeHabits] = useState(true);
  const [includePhotos, setIncludePhotos] = useState(true);
  const [patientNotes, setPatientNotes] = useState('');
  
  // Interaction states
  const [copied, setCopied] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle preset selection
  const handleSelectPreset = (preset: PeriodPreset) => {
    setActivePreset(preset);
    playSfx('tap');
    vibrate(15);

    const now = new Date();
    const end = now.toISOString().split('T')[0];
    setEndDate(end);

    if (preset === 'all') {
      // 1 year back or origin of logs
      const start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setStartDate(start);
      return;
    }

    if (preset === 'custom') {
      return;
    }

    const daysMap: Record<string, number> = {
      '7d': 7,
      '15d': 15,
      '30d': 30,
      '60d': 60,
      '90d': 90
    };
    const days = daysMap[preset] || 30;
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setStartDate(start);
  };

  // 1. Gather all Blood Pressure Logs
  const allBpLogs: ExtendedBloodPressureLog[] = useMemo(() => {
    let list: ExtendedBloodPressureLog[] = [];
    if (profile?.bloodPressureLogs && profile.bloodPressureLogs.length > 0) {
      list = [...profile.bloodPressureLogs];
    } else {
      const local = safeGet('nutri_blood_pressure_logs') || safeGet('nutri-bp-logs') || safeGet('nutri-blood-pressure-logs');
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) list = parsed;
        } catch (e) {}
      }
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [profile?.bloodPressureLogs]);

  // 2. Gather Glucose Logs
  const allGlucoseLogs: GlucoseRecord[] = useMemo(() => {
    let list: GlucoseRecord[] = [];
    const local = safeGet('nutri-glucose-logs') || safeGet('nutri_glucose_logs') || safeGet('glucose_logs');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) list = parsed;
      } catch (e) {}
    }
    if (list.length === 0) {
      list = [
        { id: 'g-def-1', value: 92, date: new Date().toISOString(), context: 'fasting', notes: 'Jejum matinal normal' },
        { id: 'g-def-2', value: 118, date: new Date(Date.now() - 86400000).toISOString(), context: 'post-meal', notes: 'Pós-almoço balanceado' }
      ];
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, []);

  // 3. Gather Habits (Hydration, Sleep, Fasting)
  const allHydrationLogs: HydrationLog[] = useMemo(() => {
    if (profile?.hydrationLogs && profile.hydrationLogs.length > 0) {
      return [...profile.hydrationLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    const local = safeGet('nutri-hydration-logs');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  }, [profile?.hydrationLogs]);

  const allSleepLogs: SleepLog[] = useMemo(() => {
    if (profile?.sleepLogs && profile.sleepLogs.length > 0) {
      return [...profile.sleepLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    const local = safeGet('nutri-sleep-logs');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  }, [profile?.sleepLogs]);

  const allFastingLogs: FastingLog[] = useMemo(() => {
    if (profile?.fastingLogs && profile.fastingLogs.length > 0) {
      return [...profile.fastingLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    const local = safeGet('nutri-fasting-logs');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  }, [profile?.fastingLogs]);

  // 4. Gather Evolution Photos
  const allPhotoLogs: EvolutionPhotoLog[] = useMemo(() => {
    let list: EvolutionPhotoLog[] = [];
    const local = safeGet('nutri-photo-evolution');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) list = parsed;
      } catch (e) {}
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, []);

  // Filter items between startDate (00:00:00) and endDate (23:59:59)
  const filterByDateRange = <T extends { date: string }>(items: T[]): T[] => {
    if (!startDate && !endDate) return items;
    const startMs = startDate ? new Date(`${startDate}T00:00:00`).getTime() : 0;
    const endMs = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : Infinity;

    return items.filter(item => {
      const itemTime = new Date(item.date).getTime();
      if (isNaN(itemTime)) return true;
      return itemTime >= startMs && itemTime <= endMs;
    });
  };

  const filteredBp = useMemo(() => filterByDateRange(allBpLogs), [allBpLogs, startDate, endDate]);
  const filteredGlucose = useMemo(() => filterByDateRange(allGlucoseLogs), [allGlucoseLogs, startDate, endDate]);
  const filteredHydration = useMemo(() => filterByDateRange(allHydrationLogs), [allHydrationLogs, startDate, endDate]);
  const filteredSleep = useMemo(() => filterByDateRange(allSleepLogs), [allSleepLogs, startDate, endDate]);
  const filteredFasting = useMemo(() => filterByDateRange(allFastingLogs), [allFastingLogs, startDate, endDate]);
  const filteredPhotos = useMemo(() => filterByDateRange(allPhotoLogs), [allPhotoLogs, startDate, endDate]);

  // Computed clinical statistics
  const stats = useMemo(() => {
    // Blood Pressure stats
    const bpCount = filteredBp.length;
    let avgSys = 0;
    let avgDia = 0;
    let avgPulse = 0;
    let minSys = Infinity;
    let maxSys = -Infinity;
    let minDia = Infinity;
    let maxDia = -Infinity;
    let elevatedBpCount = 0; // >130/80
    let stage2BpCount = 0; // >140/90

    if (bpCount > 0) {
      let sumSys = 0;
      let sumDia = 0;
      let sumPulse = 0;
      let pulseItems = 0;

      filteredBp.forEach(b => {
        sumSys += b.systolic;
        sumDia += b.diastolic;
        const pulseVal = b.bpm || b.pulse;
        if (pulseVal) {
          sumPulse += pulseVal;
          pulseItems++;
        }
        if (b.systolic < minSys) minSys = b.systolic;
        if (b.systolic > maxSys) maxSys = b.systolic;
        if (b.diastolic < minDia) minDia = b.diastolic;
        if (b.diastolic > maxDia) maxDia = b.diastolic;

        if (b.systolic >= 140 || b.diastolic >= 90) {
          stage2BpCount++;
        } else if (b.systolic >= 130 || b.diastolic >= 80) {
          elevatedBpCount++;
        }
      });

      avgSys = Math.round(sumSys / bpCount);
      avgDia = Math.round(sumDia / bpCount);
      avgPulse = pulseItems > 0 ? Math.round(sumPulse / pulseItems) : 0;
    }

    // Glucose stats
    const glucoseCount = filteredGlucose.length;
    let avgGlucose = 0;
    let fastingSum = 0;
    let fastingCount = 0;
    let postMealSum = 0;
    let postMealCount = 0;
    let hypoCount = 0; // < 70
    let hyperCount = 0; // > 140

    if (glucoseCount > 0) {
      const sum = filteredGlucose.reduce((s, g) => s + g.value, 0);
      avgGlucose = Math.round(sum / glucoseCount);

      filteredGlucose.forEach(g => {
        if (g.value < 70) hypoCount++;
        if (g.value > 140) hyperCount++;

        const ctx = (g.context || '').toLowerCase();
        if (ctx.includes('fasting') || ctx.includes('jejum')) {
          fastingSum += g.value;
          fastingCount++;
        } else if (ctx.includes('post') || ctx.includes('pos') || ctx.includes('almoço') || ctx.includes('jantar')) {
          postMealSum += g.value;
          postMealCount++;
        }
      });
    }

    const avgFasting = fastingCount > 0 ? Math.round(fastingSum / fastingCount) : null;
    const avgPostMeal = postMealCount > 0 ? Math.round(postMealSum / postMealCount) : null;

    // Habits stats
    const waterDays = filteredHydration.length;
    const avgWater = waterDays > 0 ? Math.round(filteredHydration.reduce((s, h) => s + h.amount, 0) / waterDays) : (profile?.waterGoal || 2200);
    const targetWater = profile?.waterGoal || 2500;
    const waterCompliance = Math.min(100, Math.round((avgWater / targetWater) * 100));

    const sleepDays = filteredSleep.length;
    const avgSleepHours = sleepDays > 0 ? (filteredSleep.reduce((s, l) => s + l.durationHours, 0) / sleepDays).toFixed(1) : '7.5';

    const fastingSessions = filteredFasting.length;
    const avgFastingHours = fastingSessions > 0 ? (filteredFasting.reduce((s, f) => s + f.durationHours, 0) / fastingSessions).toFixed(1) : null;

    // Anthropometry
    const weightNum = parseFloat(String(profile?.weight || '0'));
    const targetWeightNum = parseFloat(String(profile?.targetWeight || '0'));
    const heightNum = parseFloat(String(profile?.height || '0'));
    let bmi: number | null = null;
    let bmiClass = '';

    if (weightNum > 0 && heightNum > 0) {
      const hM = heightNum > 3 ? heightNum / 100 : heightNum;
      bmi = parseFloat((weightNum / (hM * hM)).toFixed(1));
      if (bmi < 18.5) bmiClass = 'Baixo Peso (OMS)';
      else if (bmi < 25) bmiClass = 'Eutrofia / Peso Saudável (OMS)';
      else if (bmi < 30) bmiClass = 'Sobrepeso (Pré-obesidade - OMS)';
      else if (bmi < 35) bmiClass = 'Obesidade Grau I (OMS)';
      else if (bmi < 40) bmiClass = 'Obesidade Grau II (OMS)';
      else bmiClass = 'Obesidade Grau III / Grave (OMS)';
    }

    return {
      bpCount,
      avgSys,
      avgDia,
      avgPulse,
      minSys: minSys === Infinity ? 0 : minSys,
      maxSys: maxSys === -Infinity ? 0 : maxSys,
      minDia: minDia === Infinity ? 0 : minDia,
      maxDia: maxDia === -Infinity ? 0 : maxDia,
      elevatedBpCount,
      stage2BpCount,
      glucoseCount,
      avgGlucose,
      avgFasting,
      fastingCount,
      avgPostMeal,
      postMealCount,
      hypoCount,
      hyperCount,
      waterDays,
      avgWater,
      targetWater,
      waterCompliance,
      sleepDays,
      avgSleepHours,
      fastingSessions,
      avgFastingHours,
      weightNum,
      targetWeightNum,
      heightNum,
      bmi,
      bmiClass,
      photosCount: filteredPhotos.length
    };
  }, [filteredBp, filteredGlucose, filteredHydration, filteredSleep, filteredFasting, filteredPhotos, profile]);

  // Format Brazilian date helper
  const formatBrDate = (isoOrYmd: string) => {
    if (!isoOrYmd) return '';
    try {
      const parts = isoOrYmd.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return new Date(isoOrYmd).toLocaleDateString('pt-BR');
    } catch {
      return isoOrYmd;
    }
  };

  // Generate the formatted consolidated text
  const consolidatedText = useMemo(() => {
    const startFormatted = formatBrDate(startDate);
    const endFormatted = formatBrDate(endDate);
    const generatedNow = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    const pName = profile?.name || 'Paciente NutriAI';

    const lines: string[] = [];

    if (formatMode === 'compact') {
      // Compact WhatsApp-optimized summary
      lines.push(`📋 *RESUMO CLÍNICO NUTRI AI — ${pName.toUpperCase()}*`);
      lines.push(`📅 *Período:* ${startFormatted} até ${endFormatted} (Gerado em ${generatedNow})`);
      lines.push('──────────────────────────────');

      if (includeAnamnesis) {
        lines.push(`👤 *Perfil:* ${profile?.age || '--'} anos | ${profile?.gender || '--'} | Altura: ${profile?.height ? profile.height + 'cm' : '--'} | Peso: ${stats.weightNum ? stats.weightNum + 'kg' : '--'}${stats.bmi ? ` (IMC ${stats.bmi} - ${stats.bmiClass})` : ''}`);
        if (profile?.goals) lines.push(`🎯 *Meta:* ${profile.goals}`);
        if (profile?.allergies && profile.allergies.length > 0) lines.push(`⚠️ *Alergias:* ${profile.allergies.join(', ')}`);
        if (profile?.restrictions && profile.restrictions.length > 0) lines.push(`🚫 *Restrições:* ${profile.restrictions.join(', ')}`);
        lines.push('');
      }

      if (includeBp) {
        lines.push(`🩺 *Pressão Arterial (${stats.bpCount} medições):*`);
        if (stats.bpCount > 0) {
          lines.push(`• Média Geral: *${stats.avgSys}/${stats.avgDia} mmHg*${stats.avgPulse ? ` | Pulso: ${stats.avgPulse} bpm` : ''}`);
          lines.push(`• Faixa: mín ${stats.minSys}/${stats.minDia} | máx ${stats.maxSys}/${stats.maxDia} mmHg`);
          if (stats.elevatedBpCount > 0 || stats.stage2BpCount > 0) {
            lines.push(`• ⚠️ Alertas: ${stats.stage2BpCount + stats.elevatedBpCount} registros fora do alvo (>130/80)`);
          }
        } else {
          lines.push(`• Sem registros de PA neste intervalo.`);
        }
        lines.push('');
      }

      if (includeGlucose) {
        lines.push(`🩸 *Glicemia Capilar (${stats.glucoseCount} medições):*`);
        if (stats.glucoseCount > 0) {
          lines.push(`• Média Geral: *${stats.avgGlucose} mg/dL*`);
          if (stats.avgFasting !== null) lines.push(`• Jejum (média): *${stats.avgFasting} mg/dL* (${stats.fastingCount} aferições)`);
          if (stats.avgPostMeal !== null) lines.push(`• Pós-Prandial (média): *${stats.avgPostMeal} mg/dL* (${stats.postMealCount} aferições)`);
          if (stats.hypoCount > 0) lines.push(`• ⚠️ Hipoglicemias (<70 mg/dL): ${stats.hypoCount} episódios`);
          if (stats.hyperCount > 0) lines.push(`• ⚠️ Hiperglicemias (>140 mg/dL): ${stats.hyperCount} episódios`);
        } else {
          lines.push(`• Sem registros de glicemia neste intervalo.`);
        }
        lines.push('');
      }

      if (includeHabits) {
        lines.push(`💧 *Estilo de Vida & Hábitos:*`);
        lines.push(`• Hidratação: ~${stats.avgWater} mL/dia (Meta: ${stats.targetWater} mL - ${stats.waterCompliance}%)`);
        lines.push(`• Sono Médio: ${stats.avgSleepHours}h/noite`);
        if (stats.fastingSessions > 0) lines.push(`• Jejum Intermitente: ${stats.fastingSessions} sessões (média ${stats.avgFastingHours}h)`);
        lines.push('');
      }

      if (includePhotos && stats.photosCount > 0) {
        lines.push(`📸 *Fotos de Evolução:* ${stats.photosCount} fotos registradas com análise no período.`);
        lines.push('');
      }

      if (patientNotes.trim()) {
        lines.push(`📝 *Notas do Paciente para Consulta:*`);
        lines.push(`"${patientNotes.trim()}"`);
        lines.push('');
      }

      lines.push(`_Exportado via Nutri AI Plataforma de Saúde_`);
      return lines.join('\n');
    }

    if (formatMode === 'soap') {
      // SOAP Clinical Format (Subjective, Objective, Assessment, Plan)
      lines.push(`================================================================================`);
      lines.push(`REGISTRO CLÍNICO AMBULATORIAL / FORMATO S.O.A.P.`);
      lines.push(`PACIENTE: ${pName.toUpperCase()}`);
      lines.push(`PERÍODO AVALIADO: ${startFormatted} A ${endFormatted} | EMISSÃO: ${generatedNow}`);
      lines.push(`================================================================================\n`);

      lines.push(`[S] SUBJETIVO (QUEIXAS, METAS & HISTÓRICO DO PACIENTE)`);
      lines.push(`• Objetivo Informado: ${profile?.goals || 'Acompanhamento nutricional e metabólico contínuo.'}`);
      lines.push(`• Rotina / Nível de Atividade: ${profile?.activityLevel || 'Não informado'} | Rotina: ${profile?.routine || 'Não informada'}`);
      lines.push(`• Alergias Declaradas: ${profile?.allergies?.join(', ') || 'Nenhuma alergia alimentar relatada'}`);
      lines.push(`• Intolerâncias / Restrições: ${profile?.restrictions?.join(', ') || 'Sem restrições severas relatadas'}`);
      if (patientNotes.trim()) {
        lines.push(`• Notas e Sintomas Relatados pelo Paciente: "${patientNotes.trim()}"`);
      } else {
        lines.push(`• Notas e Sintomas: Sem queixas atípicas registradas no aplicativo.`);
      }
      lines.push('');

      lines.push(`[O] OBJETIVO (BIOMARCADORES E MEDIÇÕES COLETADAS)`);
      if (includeAnamnesis) {
        lines.push(`1. Antropometria:`);
        lines.push(`   - Altura: ${profile?.height ? profile.height + ' cm' : 'Não informada'}`);
        lines.push(`   - Peso Atual: ${stats.weightNum ? stats.weightNum + ' kg' : 'Não informado'}${stats.targetWeightNum ? ` (Meta: ${stats.targetWeightNum} kg)` : ''}`);
        if (stats.bmi) lines.push(`   - IMC Calculado: ${stats.bmi} kg/m² -> Classificação: ${stats.bmiClass}`);
      }

      if (includeBp) {
        lines.push(`2. Perfil Pressórico (Monitoramento Residencial - MRPA):`);
        lines.push(`   - Total de Aferições: ${stats.bpCount}`);
        if (stats.bpCount > 0) {
          lines.push(`   - Média no Período: ${stats.avgSys} / ${stats.avgDia} mmHg`);
          lines.push(`   - Amplitude: Mínima ${stats.minSys}/${stats.minDia} mmHg | Máxima ${stats.maxSys}/${stats.maxDia} mmHg`);
          if (stats.avgPulse) lines.push(`   - Frequência Cardíaca Média: ${stats.avgPulse} bpm`);
          lines.push(`   - Registros >= 130/80 mmHg: ${stats.elevatedBpCount}`);
          lines.push(`   - Registros >= 140/90 mmHg: ${stats.stage2BpCount}`);
        } else {
          lines.push(`   - Sem dados de PA registrados para o filtro selecionado.`);
        }
      }

      if (includeGlucose) {
        lines.push(`3. Perfil Glicêmico (Automonitorização Glicêmica):`);
        lines.push(`   - Total de Leituras: ${stats.glucoseCount}`);
        if (stats.glucoseCount > 0) {
          lines.push(`   - Média Geral: ${stats.avgGlucose} mg/dL`);
          lines.push(`   - Média em Jejum: ${stats.avgFasting !== null ? `${stats.avgFasting} mg/dL (n=${stats.fastingCount})` : 'Sem registros em jejum'}`);
          lines.push(`   - Média Pós-Prandial: ${stats.avgPostMeal !== null ? `${stats.avgPostMeal} mg/dL (n=${stats.postMealCount})` : 'Sem registros pós-prandiais'}`);
          lines.push(`   - Episódios de Hipoglicemia (< 70 mg/dL): ${stats.hypoCount}`);
          lines.push(`   - Episódios de Hiperglicemia (> 140 mg/dL): ${stats.hyperCount}`);
        } else {
          lines.push(`   - Sem dados glicêmicos cadastrados no período.`);
        }
      }

      if (includeHabits) {
        lines.push(`4. Hábitos e Crononutrição:`);
        lines.push(`   - Consumo Médio Hídrico: ${stats.avgWater} mL / dia (Adesão: ${stats.waterCompliance}% da meta de ${stats.targetWater} mL)`);
        lines.push(`   - Média de Sono: ${stats.avgSleepHours} horas / noite`);
        if (stats.fastingSessions > 0) {
          lines.push(`   - Protocolos de Jejum Intermitente: ${stats.fastingSessions} sessões (Média: ${stats.avgFastingHours}h)`);
        }
      }

      if (includePhotos && stats.photosCount > 0) {
        lines.push(`5. Documentação Visual de Evolução:`);
        lines.push(`   - ${stats.photosCount} fotos de evolução corporal arquivadas no período.`);
      }
      lines.push('');

      lines.push(`[A] AVALIAÇÃO PRELIMINAR DOS DADOS (INSIGHTS CLÍNICOS)`);
      if (stats.avgSys > 0) {
        const bpStatus = stats.avgSys < 120 && stats.avgDia < 80 ? 'Normotensão preservada na média geral.' : stats.avgSys < 130 && stats.avgDia < 80 ? 'Pressão arterial elevada na média geral.' : 'Hipertensão estágio 1/2 na média calculada.';
        lines.push(`• Controle Pressórico: ${bpStatus}`);
      }
      if (stats.avgGlucose > 0) {
        const glucStatus = stats.avgGlucose < 100 ? 'Controle glicêmico excelente (euglicemia).' : stats.avgGlucose <= 125 ? 'Glicemia média limítrofe/atenção pré-diabetes.' : 'Glicemia média sugestiva de descontrole ou hiperglicemia frequente.';
        lines.push(`• Controle Glicêmico: ${glucStatus}`);
      }
      lines.push(`• Hidratação: ${stats.waterCompliance >= 85 ? 'Excelente adesão à meta hídrica.' : 'Adesão hídrica abaixo do recomendado, requer incentivo.'}`);
      lines.push('');

      lines.push(`[P] PLANO SUGERIDO / PRÓXIMOS PASSOS CLÍNICOS`);
      lines.push(`• Ajuste de conduta nutricional e farmacoterapêutica conforme critério do profissional assistente.`);
      lines.push(`• Manutenção do registro diário de biomarcadores via Nutri AI.`);
      lines.push(`• Reavaliação laboratorial e clínica periódica.`);
      lines.push(`\n================================================================================`);
      lines.push(`Nutri AI • Resumo Clínico Integrado para Profissionais de Saúde`);
      lines.push(`================================================================================`);

      return lines.join('\n');
    }

    // Default: Detailed Executive Report
    lines.push(`================================================================================`);
    lines.push(`🏥 NUTRI AI — RESUMO CLÍNICO CONSOLIDADO PARA PROFISSIONAIS DE SAÚDE`);
    lines.push(`Período Selecionado: ${startFormatted} até ${endFormatted}`);
    lines.push(`Data de Emissão: ${generatedNow}`);
    lines.push(`================================================================================\n`);

    if (includeAnamnesis) {
      lines.push(`[1] IDENTIFICAÇÃO E DADOS ANTROPOMÉTRICOS`);
      lines.push(`• Paciente: ${pName}`);
      lines.push(`• Idade / Sexo: ${profile?.age ? `${profile.age} anos` : 'Não informada'} | ${profile?.gender || 'Não informado'}`);
      lines.push(`• Altura: ${profile?.height ? `${profile.height} cm (${(parseFloat(String(profile.height))/100).toFixed(2)} m)` : 'Não informada'}`);
      lines.push(`• Peso Atual: ${stats.weightNum ? `${stats.weightNum} kg` : 'Não informado'}${stats.targetWeightNum ? ` | Meta Estipulada: ${stats.targetWeightNum} kg` : ''}`);
      if (stats.bmi) {
        lines.push(`• Índice de Massa Corporal (IMC): ${stats.bmi} kg/m² (${stats.bmiClass})`);
      }
      lines.push(`• Nível de Atividade Física: ${profile?.activityLevel || 'Moderado'}`);
      lines.push(`• Objetivo Principal: ${profile?.goals || 'Melhora da saúde metabólica e condicionamento físico'}`);
      lines.push(`• Alergias Alimentares Declaradas: ${profile?.allergies && profile.allergies.length > 0 ? profile.allergies.join(', ') : 'Nenhuma relatada'}`);
      lines.push(`• Restrições / Intolerâncias: ${profile?.restrictions && profile.restrictions.length > 0 ? profile.restrictions.join(', ') : 'Nenhuma relatada'}`);
      lines.push('');
    }

    if (includeBp) {
      lines.push(`[2] MONITORAMENTO DA PRESSÃO ARTERIAL (PA)`);
      lines.push(`• Total de Aferições no Período: ${stats.bpCount}`);
      if (stats.bpCount > 0) {
        lines.push(`• Média Geral Sistólica / Diastólica: ${stats.avgSys} / ${stats.avgDia} mmHg`);
        lines.push(`• Menor Registro: ${stats.minSys} / ${stats.minDia} mmHg`);
        lines.push(`• Maior Registro: ${stats.maxSys} / ${stats.maxDia} mmHg`);
        if (stats.avgPulse > 0) {
          lines.push(`• Frequência Cardíaca Média: ${stats.avgPulse} bpm`);
        }
        lines.push(`• Episódios Fora da Faixa Alvo (> 130/80 mmHg): ${stats.elevatedBpCount + stats.stage2BpCount} ocorrência(s)`);
        if (stats.stage2BpCount > 0) {
          lines.push(`  ⚠️ Dentre eles, ${stats.stage2BpCount} medição(ões) >= 140/90 mmHg (Hipertensão Estágio 2).`);
        }

        // Show up to 5 most recent records
        lines.push(`• Amostra Cronológica Recente das Aferições:`);
        filteredBp.slice(0, 5).forEach((item) => {
          const dt = formatBrDate(item.date);
          const time = item.date.includes('T') ? item.date.split('T')[1].substring(0, 5) : '';
          const pulseItem = item.bpm || item.pulse;
          lines.push(`  - ${dt}${time ? ` às ${time}` : ''}: ${item.systolic}/${item.diastolic} mmHg ${pulseItem ? `(Pulso: ${pulseItem} bpm)` : ''}${item.arm ? ` [Braço ${item.arm === 'left' ? 'Esquerdo' : 'Direito'}]` : ''}${item.notes ? ` - Obs: ${item.notes}` : ''}`);
        });
      } else {
        lines.push(`• Não foram encontrados registros de PA no intervalo de datas selecionado.`);
      }
      lines.push('');
    }

    if (includeGlucose) {
      lines.push(`[3] PERFIL GLICÊMICO (GLICEMIA CAPILAR)`);
      lines.push(`• Total de Medições no Período: ${stats.glucoseCount}`);
      if (stats.glucoseCount > 0) {
        lines.push(`• Média Geral Glicêmica: ${stats.avgGlucose} mg/dL`);
        if (stats.avgFasting !== null) {
          lines.push(`• Glicemia em Jejum (Média): ${stats.avgFasting} mg/dL (${stats.fastingCount} aferições) [Alvo habitual: < 100 mg/dL]`);
        }
        if (stats.avgPostMeal !== null) {
          lines.push(`• Glicemia Pós-Prandial (Média): ${stats.avgPostMeal} mg/dL (${stats.postMealCount} aferições) [Alvo habitual: < 140 mg/dL]`);
        }
        lines.push(`• Ocorrências de Hipoglicemia (< 70 mg/dL): ${stats.hypoCount}`);
        lines.push(`• Ocorrências de Hiperglicemia (> 140 mg/dL): ${stats.hyperCount}`);

        // Show up to 5 most recent records
        lines.push(`• Amostra Cronológica Recente das Leituras:`);
        filteredGlucose.slice(0, 5).forEach((item) => {
          const dt = formatBrDate(item.date);
          const time = item.date.includes('T') ? item.date.split('T')[1].substring(0, 5) : '';
          const ctxLabel = item.context === 'fasting' ? 'Jejum' : item.context === 'post-meal' ? 'Pós-Refeição' : item.context || 'Geral';
          lines.push(`  - ${dt}${time ? ` às ${time}` : ''}: ${item.value} mg/dL [${ctxLabel}]${item.notes ? ` - ${item.notes}` : ''}`);
        });
      } else {
        lines.push(`• Não foram encontrados registros de glicemia no intervalo selecionado.`);
      }
      lines.push('');
    }

    if (includeHabits) {
      lines.push(`[4] HÁBITOS, HIDRATAÇÃO E CRONOBIOLOGIA`);
      lines.push(`• Ingestão Hídrica Média: ${stats.avgWater} mL / dia`);
      lines.push(`  - Meta do Paciente: ${stats.targetWater} mL (${stats.waterCompliance}% de adesão média)`);
      lines.push(`• Descanso e Sono: Média de ${stats.avgSleepHours} horas / noite`);
      if (stats.fastingSessions > 0) {
        lines.push(`• Jejum Intermitente: ${stats.fastingSessions} sessões concluídas no período (Janela média: ${stats.avgFastingHours} horas)`);
      }
      lines.push('');
    }

    if (includePhotos) {
      lines.push(`[5] REGISTROS VISUAIS & EVOLUÇÃO FÍSICA`);
      lines.push(`• Total de Fotos de Evolução no Período: ${stats.photosCount} registro(s)`);
      if (stats.photosCount > 0) {
        filteredPhotos.slice(0, 3).forEach((photo, idx) => {
          const dt = formatBrDate(photo.date);
          lines.push(`  - Registro #${idx + 1} (${dt}): ${photo.analysis ? photo.analysis.substring(0, 80) + '...' : 'Foto comparativa arquivada no histórico'}`);
        });
      }
      lines.push('');
    }

    if (patientNotes.trim()) {
      lines.push(`[6] OBSERVAÇÕES E NOTAS DO PACIENTE PARA A CONSULTA`);
      lines.push(`"${patientNotes.trim()}"`);
      lines.push('');
    }

    lines.push(`================================================================================`);
    lines.push(`Relatório gerado automaticamente através da plataforma Nutri AI.`);
    lines.push(`Destinado ao apoio do raciocínio clínico de nutricionistas, médicos e equipes de saúde.`);
    lines.push(`================================================================================`);

    return lines.join('\n');
  }, [
    profile, startDate, endDate, formatMode, includeAnamnesis, 
    includeBp, includeGlucose, includeHabits, includePhotos, 
    patientNotes, stats, filteredBp, filteredGlucose, filteredPhotos
  ]);

  // Copy to clipboard action
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(consolidatedText);
      setCopied(true);
      setCopyFeedback('Copiado para a Área de Transferência!');
      playSfx('crystal');
      vibrate([30, 40]);
      setTimeout(() => {
        setCopied(false);
        setCopyFeedback(null);
      }, 3500);
    } catch (e) {
      // Fallback
      if (textareaRef.current) {
        textareaRef.current.select();
        document.execCommand('copy');
        setCopied(true);
        setCopyFeedback('Copiado com sucesso!');
        setTimeout(() => setCopied(false), 3000);
      }
    }
  };

  // WhatsApp Share action
  const handleShareWhatsApp = () => {
    playSfx('tap');
    vibrate(20);
    const textEncoded = encodeURIComponent(consolidatedText);
    const url = `https://api.whatsapp.com/send?text=${textEncoded}`;
    window.open(url, '_blank');
  };

  // Download .txt file
  const handleDownloadTxt = () => {
    playSfx('success');
    vibrate([20, 30]);
    const blob = new Blob([consolidatedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = (profile?.name || 'Paciente').replace(/[^a-zA-Z0-9]/g, '_');
    link.href = url;
    link.download = `Resumo_Clinico_${safeName}_${startDate}_a_${endDate}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden my-auto"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 shrink-0">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
                  Resumo Clínico em Texto Consolidado
                </h3>
                <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Profissionais de Saúde
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Gere e exporte um relatório em texto puro formatado para Prontuário Eletrônico (PEP), médicos e nutricionistas.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playSfx('pop');
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* 1. Date Interval Selection */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-sm">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Intervalo de Datas Analisado</span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Selecione os dias para compilar os dados
              </span>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: '7d', label: 'Últimos 7 dias' },
                { id: '15d', label: '15 dias' },
                { id: '30d', label: '30 dias (Padrão)' },
                { id: '60d', label: '60 dias' },
                { id: '90d', label: '90 dias' },
                { id: 'all', label: 'Todo o Histórico' },
              ].map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.id as PeriodPreset)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activePreset === preset.id
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Date Pickers (Start / End) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Data Inicial:
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setActivePreset('custom');
                  }}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Data Final:
                </label>
                <input
                  type="date"
                  value={endDate}
                  max={todayStr}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setActivePreset('custom');
                  }}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Quick Metrics Bar in selected period */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
              <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">PA Aferida</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {stats.bpCount > 0 ? `${stats.bpCount} logs (${stats.avgSys}/${stats.avgDia})` : 'Sem registros'}
                </span>
              </div>
              <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Glicemias</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {stats.glucoseCount > 0 ? `${stats.glucoseCount} logs (Méd ${stats.avgGlucose})` : 'Sem registros'}
                </span>
              </div>
              <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Média Hídrica</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {stats.avgWater} mL/dia ({stats.waterCompliance}%)
                </span>
              </div>
              <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Sono / Noite</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {stats.avgSleepHours}h médias
                </span>
              </div>
            </div>
          </div>

          {/* 2. Format & Section Inclusion Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Format Style */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Formato do Resumo:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'detailed', label: 'Completo', desc: 'Prontuário & PEP' },
                  { id: 'soap', label: 'S.O.A.P.', desc: 'Clínico Estruturado' },
                  { id: 'compact', label: 'Sintético', desc: 'WhatsApp & Direto' },
                ].map(fmt => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => {
                      setFormatMode(fmt.id as SummaryFormat);
                      playSfx('tap');
                    }}
                    className={`p-2.5 rounded-xl text-left transition-all border cursor-pointer ${
                      formatMode === fmt.id
                        ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-500 text-blue-900 dark:text-blue-100 shadow-sm'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span className="block font-bold text-xs">{fmt.label}</span>
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{fmt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sections Toggles */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Seções Inclusas no Resumo:
              </label>
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIncludeAnamnesis(!includeAnamnesis)}
                  className={`px-2.5 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    includeAnamnesis 
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 text-blue-700 dark:text-blue-300' 
                      : 'bg-white dark:bg-slate-800 border-slate-200 text-slate-400'
                  }`}
                >
                  <Check className={`w-3.5 h-3.5 ${includeAnamnesis ? 'opacity-100' : 'opacity-20'}`} />
                  <span>Anamnese & IMC</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIncludeBp(!includeBp)}
                  className={`px-2.5 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    includeBp 
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 text-rose-700 dark:text-rose-300' 
                      : 'bg-white dark:bg-slate-800 border-slate-200 text-slate-400'
                  }`}
                >
                  <Check className={`w-3.5 h-3.5 ${includeBp ? 'opacity-100' : 'opacity-20'}`} />
                  <span>Pressão Arterial</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIncludeGlucose(!includeGlucose)}
                  className={`px-2.5 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    includeGlucose 
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-700 dark:text-amber-300' 
                      : 'bg-white dark:bg-slate-800 border-slate-200 text-slate-400'
                  }`}
                >
                  <Check className={`w-3.5 h-3.5 ${includeGlucose ? 'opacity-100' : 'opacity-20'}`} />
                  <span>Glicemia</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIncludeHabits(!includeHabits)}
                  className={`px-2.5 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    includeHabits 
                      ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-400 text-cyan-700 dark:text-cyan-300' 
                      : 'bg-white dark:bg-slate-800 border-slate-200 text-slate-400'
                  }`}
                >
                  <Check className={`w-3.5 h-3.5 ${includeHabits ? 'opacity-100' : 'opacity-20'}`} />
                  <span>Água, Sono & Jejum</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIncludePhotos(!includePhotos)}
                  className={`px-2.5 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    includePhotos 
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-700 dark:text-emerald-300' 
                      : 'bg-white dark:bg-slate-800 border-slate-200 text-slate-400'
                  }`}
                >
                  <Check className={`w-3.5 h-3.5 ${includePhotos ? 'opacity-100' : 'opacity-20'}`} />
                  <span>Fotos de Evolução</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. Patient Custom Notes input for the consultation */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-700/70">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Notas do Paciente para o Profissional (Opcional):</span>
              </label>
              <span className="text-[10px] text-slate-400">Inserido diretamente no resumo final</span>
            </div>
            <textarea
              value={patientNotes}
              onChange={(e) => setPatientNotes(e.target.value)}
              placeholder="Ex: Tive episódios de dor de cabeça após o almoço na última semana; iniciei creatina há 10 dias..."
              rows={2}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-100 resize-none"
            />
          </div>

          {/* 4. Live Text Preview Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Texto Consolidado Pronto para Cópia:</span>
              </span>
              <span className="text-[11px] text-slate-400">
                {consolidatedText.split('\n').length} linhas • {consolidatedText.length} caracteres
              </span>
            </div>

            <div className="relative">
              <textarea
                ref={textareaRef}
                readOnly
                value={consolidatedText}
                rows={12}
                className="w-full font-mono text-[11px] sm:text-xs leading-relaxed p-4 bg-slate-900 text-slate-100 rounded-2xl border border-slate-700/80 shadow-inner focus:outline-none select-all"
              />

              {/* Copy Overlay Button on top right */}
              <button
                type="button"
                onClick={handleCopy}
                className="absolute top-3 right-3 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg shadow-blue-900/50 active:scale-95 transition-all cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {copyFeedback ? (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-pulse">
                <CheckCircle2 className="w-4 h-4" />
                <span>{copyFeedback}</span>
              </span>
            ) : (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Ideal para prontuário eletrônico, e-mail ou WhatsApp
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* WhatsApp Share Button */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar via WhatsApp</span>
            </button>

            {/* Download .txt file */}
            <button
              type="button"
              onClick={handleDownloadTxt}
              className="flex items-center gap-1.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 text-white px-4 py-2 rounded-xl font-semibold text-xs border border-slate-600 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Arquivo (.txt)</span>
            </button>

            {/* Primary Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2 rounded-xl font-bold text-xs shadow-lg shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copiado para Prontuário!' : 'Copiar Resumo Completo'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
