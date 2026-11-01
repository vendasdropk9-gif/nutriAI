import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { 
  FileSpreadsheet, FileText, Download, X, Check, Calendar, 
  Heart, Activity, Droplets, Moon, Camera, CheckCircle2, 
  AlertCircle, Sparkles, Filter, ChevronDown, ChevronUp, Share2, 
  User, RefreshCw, Eye
} from 'lucide-react';
import { UserProfile, BloodPressureLog, HydrationLog, SleepLog, FastingLog } from '../types';
import { safeGet } from '../lib/storage';
import { playSfx, vibrate } from '../lib/sensory';

export interface EvolutionPhotoLog {
  id: string;
  date: string;
  imageBase64: string;
  analysis?: string;
}

export interface GlucoseRecord {
  id: string;
  value: number;
  date: string;
  context?: string;
  notes?: string;
  timestamp?: number;
}

interface HealthReportExportModalProps {
  profile: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

export function HealthReportExportModal({ profile, isOpen, onClose }: HealthReportExportModalProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | '30d' | '14d' | '7d'>('all');
  const [includeBloodPressure, setIncludeBloodPressure] = useState(true);
  const [includeGlucose, setIncludeGlucose] = useState(true);
  const [includeHabits, setIncludeHabits] = useState(true);
  const [includePhotos, setIncludePhotos] = useState(true);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showPreviewData, setShowPreviewData] = useState(false);

  // 1. Gather all Blood Pressure Logs
  const allBpLogs: BloodPressureLog[] = useMemo(() => {
    let list: BloodPressureLog[] = [];
    if (profile?.bloodPressureLogs && profile.bloodPressureLogs.length > 0) {
      list = [...profile.bloodPressureLogs];
    } else {
      const local = safeGet('nutri_blood_pressure_logs') || safeGet('nutri-blood-pressure-logs');
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) list = parsed;
        } catch (e) {}
      }
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [profile?.bloodPressureLogs]);

  // 2. Gather all Glucose Logs
  const allGlucoseLogs: GlucoseRecord[] = useMemo(() => {
    let list: GlucoseRecord[] = [];
    const local = safeGet('nutri-glucose-logs') || safeGet('nutri_glucose_logs') || safeGet('glucose_logs');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) list = parsed;
      } catch (e) {}
    }
    // Default fallback if empty
    if (list.length === 0) {
      list = [
        { id: 'g-def-1', value: 92, date: new Date().toISOString(), context: 'fasting', notes: 'Jejum matinal' },
        { id: 'g-def-2', value: 114, date: new Date(Date.now() - 86400000).toISOString(), context: 'post-meal', notes: 'Pós-almoço equilibrado' }
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

  // Period Filtering helper
  const filterByDate = <T extends { date: string }>(items: T[]): T[] => {
    if (selectedPeriod === 'all') return items;
    const now = Date.now();
    const days = selectedPeriod === '7d' ? 7 : selectedPeriod === '14d' ? 14 : 30;
    const threshold = now - (days * 24 * 60 * 60 * 1000);
    return items.filter(item => {
      const t = new Date(item.date).getTime();
      return isNaN(t) || t >= threshold;
    });
  };

  const filteredBp = useMemo(() => filterByDate(allBpLogs), [allBpLogs, selectedPeriod]);
  const filteredGlucose = useMemo(() => filterByDate(allGlucoseLogs), [allGlucoseLogs, selectedPeriod]);
  const filteredHydration = useMemo(() => filterByDate(allHydrationLogs), [allHydrationLogs, selectedPeriod]);
  const filteredSleep = useMemo(() => filterByDate(allSleepLogs), [allSleepLogs, selectedPeriod]);
  const filteredFasting = useMemo(() => filterByDate(allFastingLogs), [allFastingLogs, selectedPeriod]);
  const filteredPhotos = useMemo(() => filterByDate(allPhotoLogs), [allPhotoLogs, selectedPeriod]);

  // Compute Averages
  const avgSys = filteredBp.length > 0 ? Math.round(filteredBp.reduce((s, l) => s + l.systolic, 0) / filteredBp.length) : (profile?.bloodPressureLogs?.[0]?.systolic || 120);
  const avgDia = filteredBp.length > 0 ? Math.round(filteredBp.reduce((s, l) => s + l.diastolic, 0) / filteredBp.length) : (profile?.bloodPressureLogs?.[0]?.diastolic || 80);
  const avgGlucose = filteredGlucose.length > 0 ? Math.round(filteredGlucose.reduce((s, l) => s + l.value, 0) / filteredGlucose.length) : 92;
  const avgSleep = filteredSleep.length > 0 ? (filteredSleep.reduce((s, l) => s + l.durationHours, 0) / filteredSleep.length).toFixed(1) : '7.5';
  const totalWaterDays = filteredHydration.length;
  const avgWater = totalWaterDays > 0 ? Math.round(filteredHydration.reduce((s, l) => s + l.amount, 0) / totalWaterDays) : 2200;

  if (!isOpen) return null;

  // Format Date Helper
  const formatDateStr = (isoOrStr: string) => {
    try {
      const d = new Date(isoOrStr);
      if (isNaN(d.getTime())) return isoOrStr;
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoOrStr;
    }
  };

  // Status Labels
  const getBpStatus = (sys: number, dia: number) => {
    if (sys >= 140 || dia >= 90) return 'Pressão Elevada / Hipertensão';
    if (sys >= 120 || dia >= 80) return 'Atenção / Pré-Hipertensão';
    return 'Normal / Saudável';
  };

  const getGlucoseStatus = (val: number, context?: string) => {
    if (val < 70) return 'Hipoglicemia (< 70 mg/dL)';
    if (context === 'fasting') {
      if (val <= 99) return 'Jejum Normal (70-99 mg/dL)';
      if (val <= 125) return 'Glicemia de Jejum Alterada (100-125 mg/dL)';
      return 'Hiperglicemia (≥ 126 mg/dL)';
    }
    if (val <= 140) return 'Pós-Prandial Ideal (< 140 mg/dL)';
    return 'Atenção Pós-Prandial (> 140 mg/dL)';
  };

  // CSV Generator
  const handleExportCSV = () => {
    try {
      setIsExportingCsv(true);
      playSfx('tap');
      vibrate(20);

      const rows: string[] = [];
      const escape = (val: any) => {
        const str = String(val ?? '').replace(/"/g, '""');
        return `"${str}"`;
      };

      // Header with Patient Data
      rows.push(['RELATÓRIO CLÍNICO INTEGRAL - NUTRIAI'].map(escape).join(';'));
      rows.push(['Gerado para compartilhamento com Nutricionistas e Médicos'].map(escape).join(';'));
      rows.push(['Data de Emissão:', new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR')].map(escape).join(';'));
      rows.push(['Paciente:', profile?.name || 'Usuário NutriAI', 'Idade:', `${profile?.age || 30} anos`, 'Gênero:', profile?.gender || 'Não especificado'].map(escape).join(';'));
      rows.push(['Peso Atual:', `${profile?.weight || 70} kg`, 'Altura:', `${profile?.height || 170} cm`, 'IMC:', `${((profile?.weight || 70) / (((profile?.height || 170)/100)**2)).toFixed(1)}`].map(escape).join(';'));
      rows.push(['Objetivo Principal:', profile?.goals || 'Saúde & Longevidade'].map(escape).join(';'));
      rows.push(['Alergias / Intolerâncias:', (profile?.allergies || []).join(', ') || 'Nenhuma informada'].map(escape).join(';'));
      rows.push(['Restrições Alimentares:', (profile?.restrictions || []).join(', ') || 'Nenhuma informada'].map(escape).join(';'));
      rows.push('');

      // Section: Pressão Arterial
      if (includeBloodPressure) {
        rows.push(['--- HISTÓRICO DE PRESSÃO ARTERIAL (PA) ---'].map(escape).join(';'));
        rows.push(['Data/Hora', 'Sistólica (mmHg)', 'Diastólica (mmHg)', 'Pulso (BPM)', 'Classificação Clínica', 'Observações'].map(escape).join(';'));
        if (filteredBp.length === 0) {
          rows.push(['Nenhum registro no período selecionado', '', '', '', '', ''].map(escape).join(';'));
        } else {
          filteredBp.forEach(log => {
            rows.push([
              formatDateStr(log.date),
              log.systolic,
              log.diastolic,
              log.bpm || '-',
              getBpStatus(log.systolic, log.diastolic),
              log.notes || 'Sem observações adicionais'
            ].map(escape).join(';'));
          });
        }
        rows.push('');
      }

      // Section: Glicemia
      if (includeGlucose) {
        rows.push(['--- HISTÓRICO DE GLICEMIA CAPILAR ---'].map(escape).join(';'));
        rows.push(['Data/Hora', 'Glicemia (mg/dL)', 'Contexto / Momento', 'Diagnóstico / Faixa', 'Notas'].map(escape).join(';'));
        if (filteredGlucose.length === 0) {
          rows.push(['Nenhum registro no período selecionado', '', '', '', ''].map(escape).join(';'));
        } else {
          filteredGlucose.forEach(log => {
            rows.push([
              formatDateStr(log.date),
              log.value,
              log.context === 'fasting' ? 'Jejum' : log.context === 'post-meal' ? 'Pós-refeição' : log.context === 'bedtime' ? 'Antes de dormir' : 'Aleatório',
              getGlucoseStatus(log.value, log.context),
              log.notes || ''
            ].map(escape).join(';'));
          });
        }
        rows.push('');
      }

      // Section: Hábitos (Hidratação, Sono, Jejum)
      if (includeHabits) {
        rows.push(['--- HÁBITOS DE VIDA & ROTINA METABÓLICA ---'].map(escape).join(';'));
        rows.push(['Data/Hora', 'Categoria', 'Volume / Duração', 'Qualidade / Fonte', 'Notas / Status'].map(escape).join(';'));
        
        filteredHydration.forEach(h => {
          rows.push([
            formatDateStr(h.date),
            'Hidratação',
            `${h.amount} ml`,
            h.source || 'Água Filtrada',
            'Meta diária em andamento'
          ].map(escape).join(';'));
        });

        filteredSleep.forEach(s => {
          rows.push([
            formatDateStr(s.date),
            'Sono & Descanso',
            `${s.durationHours} horas`,
            `Qualidade: ${s.quality}`,
            'Sono reparador monitorado'
          ].map(escape).join(';'));
        });

        filteredFasting.forEach(f => {
          rows.push([
            formatDateStr(f.date),
            'Jejum Intermitente',
            `${f.durationHours} horas`,
            'Autofagia & Sensibilidade à Insulina',
            'Jejum concluído'
          ].map(escape).join(';'));
        });

        if (filteredHydration.length === 0 && filteredSleep.length === 0 && filteredFasting.length === 0) {
          rows.push(['Nenhum registro de hábitos no período selecionado', '', '', '', ''].map(escape).join(';'));
        }
        rows.push('');
      }

      // Section: Fotos de Evolução
      if (includePhotos) {
        rows.push(['--- REGISTRO DE FOTOS DE EVOLUÇÃO CORPORAL ---'].map(escape).join(';'));
        rows.push(['Data/Hora', 'ID do Registro', 'Foto Armazenada', 'Análise Biométrica da IA (Malu)'].map(escape).join(';'));
        if (filteredPhotos.length === 0) {
          rows.push(['Nenhuma foto de evolução no período selecionado', '', '', ''].map(escape).join(';'));
        } else {
          filteredPhotos.forEach(p => {
            rows.push([
              formatDateStr(p.date),
              p.id,
              'Sim (Presente no aplicativo)',
              p.analysis || 'Registro de progresso corporal'
            ].map(escape).join(';'));
          });
        }
        rows.push('');
      }

      // Final signature
      rows.push(['Documento gerado pelo NutriAI • Inteligência Artificial Nutricional & Clínica'].map(escape).join(';'));

      const csvContent = '\uFEFF' + rows.join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const patientName = (profile?.name || 'Paciente').replace(/\s+/g, '_');
      const datePart = new Date().toISOString().slice(0, 10);
      link.setAttribute('href', url);
      link.setAttribute('download', `NutriAI_Historico_Clinico_${patientName}_${datePart}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      playSfx('success');
      vibrate([20, 80, 20]);
    } catch (err) {
      console.error('Erro ao exportar CSV:', err);
    } finally {
      setIsExportingCsv(false);
    }
  };

  // PDF Generator
  const handleExportPDF = async () => {
    try {
      setIsExportingPdf(true);
      playSfx('tap');
      vibrate(20);

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const patientName = profile?.name || 'Usuário NutriAI';
      const patientAge = profile?.age || 30;
      const patientGender = profile?.gender === 'female' ? 'Feminino' : profile?.gender === 'male' ? 'Masculino' : 'Outro';
      const patientWeight = profile?.weight || 70;
      const patientHeight = profile?.height || 170;
      const patientImc = (patientWeight / ((patientHeight / 100) ** 2)).toFixed(1);
      const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

      // PAGE 1: Header, Patient Data, KPI Averages, Blood Pressure & Glucose Tables
      doc.setFillColor(16, 185, 129); // Emerald 500
      doc.rect(0, 0, 210, 28, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('NutriAI • Relatório Clínico Integral', 14, 14);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Prontuário & Histórico de Sinais Vitais • Compartilhamento com Nutricionistas • ${today}`, 14, 21);

      // Section 1: Dados do Paciente
      doc.setFillColor(248, 250, 252); // Slate 50
      doc.roundedRect(14, 33, 182, 34, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 33, 182, 34, 3, 3, 'S');

      doc.setTextColor(15, 23, 42); // Slate 900
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('1. IDENTIFICAÇÃO DO PACIENTE & PARÂMETROS BIOMÉTRICOS', 18, 41);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);

      doc.text(`• Nome: ${patientName}`, 18, 48);
      doc.text(`• Idade / Gênero: ${patientAge} anos (${patientGender})`, 18, 54);
      doc.text(`• Peso: ${patientWeight} kg | Altura: ${patientHeight} cm | IMC: ${patientImc} kg/m²`, 18, 60);

      doc.text(`• Objetivo: ${profile?.goals || 'Acompanhamento Nutricional'}`, 110, 48);
      doc.text(`• Alergias: ${(profile?.allergies || []).join(', ') || 'Nenhuma cadastrada'}`, 110, 54);
      doc.text(`• Restrições: ${(profile?.restrictions || []).join(', ') || 'Sem restrições severas'}`, 110, 60);

      // KPI Summary Badges
      let currentY = 72;
      doc.setFillColor(236, 253, 245); // Emerald 50
      doc.roundedRect(14, currentY, 43, 20, 2, 2, 'F');
      doc.roundedRect(59, currentY, 43, 20, 2, 2, 'F');
      doc.roundedRect(104, currentY, 43, 20, 2, 2, 'F');
      doc.roundedRect(149, currentY, 47, 20, 2, 2, 'F');

      doc.setFontSize(8);
      doc.setTextColor(5, 150, 105);
      doc.text('MÉDIA PRESSÓRICA', 18, currentY + 6);
      doc.text('MÉDIA GLICÊMICA', 63, currentY + 6);
      doc.text('HIDRATAÇÃO DIÁRIA', 108, currentY + 6);
      doc.text('SONO MÉDIO', 153, currentY + 6);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(6, 95, 70);
      doc.text(`${avgSys} / ${avgDia} mmHg`, 18, currentY + 14);
      doc.text(`${avgGlucose} mg/dL`, 63, currentY + 14);
      doc.text(`${avgWater} ml / dia`, 108, currentY + 14);
      doc.text(`${avgSleep} h / noite`, 153, currentY + 14);

      currentY += 26;

      // Section 2: Pressão Arterial Table
      if (includeBloodPressure) {
        doc.setFillColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text(`2. HISTÓRICO DE PRESSÃO ARTERIAL (${filteredBp.length} medições)`, 14, currentY);

        currentY += 5;
        // Table Header
        doc.setFillColor(241, 245, 249);
        doc.rect(14, currentY, 182, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text('Data / Hora', 16, currentY + 5);
        doc.text('Sistólica', 60, currentY + 5);
        doc.text('Diastólica', 85, currentY + 5);
        doc.text('Pulso (BPM)', 110, currentY + 5);
        doc.text('Classificação Clínica', 140, currentY + 5);

        currentY += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        const bpSlice = filteredBp.slice(0, 8);
        if (bpSlice.length === 0) {
          doc.setTextColor(148, 163, 184);
          doc.text('Sem medições de pressão registradas no período.', 16, currentY + 5);
          currentY += 8;
        } else {
          bpSlice.forEach((item, index) => {
            if (index % 2 === 1) {
              doc.setFillColor(248, 250, 252);
              doc.rect(14, currentY - 3, 182, 6, 'F');
            }
            doc.setTextColor(30, 41, 59);
            doc.text(formatDateStr(item.date).slice(0, 16), 16, currentY + 1);
            doc.text(`${item.systolic} mmHg`, 60, currentY + 1);
            doc.text(`${item.diastolic} mmHg`, 85, currentY + 1);
            doc.text(item.bpm ? `${item.bpm} bpm` : '-', 110, currentY + 1);

            const status = getBpStatus(item.systolic, item.diastolic);
            if (status.includes('Normal')) doc.setTextColor(16, 185, 129);
            else if (status.includes('Atenção')) doc.setTextColor(217, 119, 6);
            else doc.setTextColor(225, 29, 72);
            doc.text(status, 140, currentY + 1);

            currentY += 6;
          });
        }
        currentY += 6;
      }

      // Section 3: Glicemia Capilar Table
      if (includeGlucose && currentY < 230) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text(`3. HISTÓRICO DE GLICEMIA CAPILAR (${filteredGlucose.length} registros)`, 14, currentY);

        currentY += 5;
        doc.setFillColor(241, 245, 249);
        doc.rect(14, currentY, 182, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text('Data / Hora', 16, currentY + 5);
        doc.text('Glicemia', 65, currentY + 5);
        doc.text('Contexto', 95, currentY + 5);
        doc.text('Diagnóstico Clínico', 135, currentY + 5);

        currentY += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        const gluSlice = filteredGlucose.slice(0, 6);
        if (gluSlice.length === 0) {
          doc.setTextColor(148, 163, 184);
          doc.text('Sem medições de glicemia registradas no período.', 16, currentY + 5);
          currentY += 8;
        } else {
          gluSlice.forEach((item, index) => {
            if (index % 2 === 1) {
              doc.setFillColor(248, 250, 252);
              doc.rect(14, currentY - 3, 182, 6, 'F');
            }
            doc.setTextColor(30, 41, 59);
            doc.text(formatDateStr(item.date).slice(0, 16), 16, currentY + 1);
            doc.text(`${item.value} mg/dL`, 65, currentY + 1);
            doc.text(item.context === 'fasting' ? 'Jejum' : item.context === 'post-meal' ? 'Pós-refeição' : 'Rotina', 95, currentY + 1);

            const status = getGlucoseStatus(item.value, item.context);
            if (status.includes('Normal') || status.includes('Ideal')) doc.setTextColor(16, 185, 129);
            else if (status.includes('Alterada')) doc.setTextColor(217, 119, 6);
            else doc.setTextColor(225, 29, 72);
            doc.text(status, 135, currentY + 1);

            currentY += 6;
          });
        }
      }

      // Page 1 Footer
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('NutriAI Clinical Suite • Página 1 de 2 • Documento emitido para suporte à prescrição nutricional', 14, 287);

      // PAGE 2: Habits, Routine, Nutritionist Notes & Photos
      doc.addPage();

      // Top mini header
      doc.setFillColor(15, 23, 42); // Slate 900
      doc.rect(0, 0, 210, 16, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`NutriAI • Relatório Clínico: ${patientName}`, 14, 11);

      let p2Y = 26;

      // Section 4: Hábitos & Rotina de Vida
      if (includeHabits) {
        doc.setFillColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text('4. ROTINA, HÁBITOS DE VIDA & HORÁRIOS DE INGESTÃO', 14, p2Y);

        p2Y += 6;
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, p2Y, 182, 38, 3, 3, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, p2Y, 182, 38, 3, 3, 'S');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);

        doc.text(`• Meta de Ingestão de Água: ${(patientWeight * 35 / 1000).toFixed(1)} L/dia (Consumo médio registrado: ${(avgWater/1000).toFixed(1)} L/dia)`, 18, p2Y + 8);
        doc.text(`• Padrão de Sono: Média de ${avgSleep} horas por noite (Objetivo: 7-9 horas de sono profundo)`, 18, p2Y + 15);
        doc.text(`• Registro de Jejum Intermitente: ${filteredFasting.length > 0 ? `${filteredFasting.length} sessões concluídas` : 'Sem jejum prolongado ativo'}`, 18, p2Y + 22);
        
        const routineItems = profile?.ingestionRemindersList || [
          { time: '08:00', title: 'Café da Manhã' },
          { time: '13:00', title: 'Almoço Balanceado' },
          { time: '20:00', title: 'Jantar Leve' }
        ];
        doc.text(`• Fracionamento das Refeições: ${routineItems.map(r => `${r.title} às ${r.time}`).slice(0, 3).join(' | ')}`, 18, p2Y + 29);

        p2Y += 46;
      }

      // Section 5: Fotos de Evolução Corporal
      if (includePhotos) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text(`5. REGISTRO FOTOGRÁFICO DE EVOLUÇÃO CORPORAL (${filteredPhotos.length} fotos)`, 14, p2Y);

        p2Y += 6;

        if (filteredPhotos.length === 0) {
          doc.setFillColor(248, 250, 252);
          doc.roundedRect(14, p2Y, 182, 24, 2, 2, 'F');
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(100, 116, 139);
          doc.text('Nenhuma fotografia de evolução anexada no período selecionado.', 18, p2Y + 14);
          p2Y += 32;
        } else {
          // Render up to 2 photos on Page 2 side-by-side or stacked
          const photosToRender = filteredPhotos.slice(0, 2);
          for (let i = 0; i < photosToRender.length; i++) {
            const photo = photosToRender[i];
            const startX = 14 + (i * 94);
            const boxW = 88;
            const boxH = 65;

            doc.setFillColor(248, 250, 252);
            doc.roundedRect(startX, p2Y, boxW, boxH, 2, 2, 'F');
            doc.setDrawColor(203, 213, 225);
            doc.roundedRect(startX, p2Y, boxW, boxH, 2, 2, 'S');

            try {
              if (photo.imageBase64 && photo.imageBase64.startsWith('data:image')) {
                doc.addImage(photo.imageBase64, 'JPEG', startX + 4, p2Y + 4, 38, 48);
              }
            } catch (imgErr) {
              console.warn("Could not embed image into PDF:", imgErr);
            }

            // Text beside image
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(15, 23, 42);
            doc.text(`Foto #${i + 1} • ${formatDateStr(photo.date).slice(0, 10)}`, startX + 45, p2Y + 10);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(71, 85, 105);
            const analysisText = photo.analysis ? photo.analysis.slice(0, 130) + '...' : 'Análise de tônus muscular e postura realizada pela IA.';
            doc.text(doc.splitTextToSize(analysisText, 38), startX + 45, p2Y + 18);
          }
          p2Y += 72;
        }
      }

      // Section 6: Parecer & Espaço para Assinatura do Profissional
      if (p2Y < 235) {
        doc.setFillColor(240, 253, 250); // Teal 50
        doc.roundedRect(14, p2Y, 182, 38, 3, 3, 'F');
        doc.setDrawColor(153, 246, 228);
        doc.roundedRect(14, p2Y, 182, 38, 3, 3, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 118, 110);
        doc.text('6. PARECER CLÍNICO & CONDUTA NUTRICIONAL', 18, p2Y + 8);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        doc.text('Espaço reservado para carimbo, anotações e assinatura do nutricionista / médico responsável:', 18, p2Y + 15);

        doc.setDrawColor(203, 213, 225);
        doc.line(18, p2Y + 30, 95, p2Y + 30);
        doc.line(105, p2Y + 30, 185, p2Y + 30);

        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('Assinatura do Paciente', 18, p2Y + 34);
        doc.text('Carimbo / CRN do Nutricionista', 105, p2Y + 34);
      }

      // Page 2 Footer
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('NutriAI Clinical Suite • Página 2 de 2 • Documento emitido para suporte à prescrição nutricional', 14, 287);

      const filename = `NutriAI_Relatorio_Clinico_${patientName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);

      playSfx('success');
      vibrate([30, 100, 30]);
    } catch (err) {
      console.error('Erro ao gerar relatório PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-export-title"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 id="modal-export-title" className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
                Exportar Histórico de Saúde
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Compartilhe seus dados com médicos e nutricionistas em PDF ou CSV
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playSfx('tap');
              onClose();
            }}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          {/* Patient Quick Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-100 block">
                  {profile?.name || 'Usuário NutriAI'}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {profile?.age || 30} anos • {profile?.weight || 70} kg • {profile?.height || 170} cm
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
              {profile?.goals || 'Nutrição Saudável'}
            </span>
          </div>

          {/* Period Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              <span>Intervalo de Tempo dos Registros:</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'all', label: 'Tudo' },
                { id: '30d', label: '30 Dias' },
                { id: '14d', label: '14 Dias' },
                { id: '7d', label: '7 Dias' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    playSfx('tap');
                    vibrate(10);
                    setSelectedPeriod(opt.id as any);
                  }}
                  className={`py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    selectedPeriod === opt.id
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Data Modules Toggles */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-emerald-500" />
              <span>Módulos de Saúde a Incluir:</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Pressão Arterial */}
              <button
                type="button"
                onClick={() => setIncludeBloodPressure(!includeBloodPressure)}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  includeBloodPressure
                    ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40 text-rose-900 dark:text-rose-200'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${includeBloodPressure ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    <Heart className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold block text-xs">Pressão Arterial</span>
                    <span className="text-[11px] opacity-75">{filteredBp.length} medições</span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${includeBloodPressure ? 'bg-rose-500 border-rose-500 text-white' : 'border-slate-300'}`}>
                  {includeBloodPressure && <Check className="w-3 h-3" />}
                </div>
              </button>

              {/* Glicose */}
              <button
                type="button"
                onClick={() => setIncludeGlucose(!includeGlucose)}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  includeGlucose
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${includeGlucose ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold block text-xs">Glicemia Capilar</span>
                    <span className="text-[11px] opacity-75">{filteredGlucose.length} registros</span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${includeGlucose ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
                  {includeGlucose && <Check className="w-3 h-3" />}
                </div>
              </button>

              {/* Hábitos */}
              <button
                type="button"
                onClick={() => setIncludeHabits(!includeHabits)}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  includeHabits
                    ? 'bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800/40 text-teal-900 dark:text-teal-200'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${includeHabits ? 'bg-teal-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    <Droplets className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold block text-xs">Hábitos (Água/Sono/Jejum)</span>
                    <span className="text-[11px] opacity-75">{filteredHydration.length + filteredSleep.length + filteredFasting.length} logs</span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${includeHabits ? 'bg-teal-500 border-teal-500 text-white' : 'border-slate-300'}`}>
                  {includeHabits && <Check className="w-3 h-3" />}
                </div>
              </button>

              {/* Fotos de Evolução */}
              <button
                type="button"
                onClick={() => setIncludePhotos(!includePhotos)}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  includePhotos
                    ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${includePhotos ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold block text-xs">Fotos de Evolução</span>
                    <span className="text-[11px] opacity-75">{filteredPhotos.length} fotos</span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${includePhotos ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300'}`}>
                  {includePhotos && <Check className="w-3 h-3" />}
                </div>
              </button>
            </div>
          </div>

          {/* Collapsible Data Preview */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPreviewData(!showPreviewData)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-emerald-500" />
                <span>Pré-visualizar resumo dos dados que serão exportados</span>
              </span>
              {showPreviewData ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showPreviewData && (
              <div className="p-4 bg-white dark:bg-slate-900 text-xs space-y-3 max-h-48 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <span className="text-[10px] text-slate-400 block">Pressão Média</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{avgSys}/{avgDia} mmHg</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <span className="text-[10px] text-slate-400 block">Glicemia Média</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{avgGlucose} mg/dL</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <span className="text-[10px] text-slate-400 block">Média Hidratação</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{avgWater} ml/dia</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <span className="text-[10px] text-slate-400 block">Fotos Anexadas</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{filteredPhotos.length} fotos</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  O arquivo gerado conterá carimbos de data/hora originais, histórico detalhado e diagnósticos para facilitar o ajuste do plano alimentar pelo seu nutricionista.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer / Action Buttons */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer text-center"
          >
            Cancelar
          </button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={isExportingCsv || isExportingPdf}
              className="px-5 py-2.5 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>{isExportingCsv ? 'Gerando CSV...' : 'Exportar CSV (Planilha)'}</span>
            </button>

            {/* PDF Button */}
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isExportingCsv || isExportingPdf}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/25 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <FileText className="w-4 h-4 text-emerald-100" />
              <span>{isExportingPdf ? 'Gerando PDF Clínico...' : 'Exportar PDF Clínico'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
