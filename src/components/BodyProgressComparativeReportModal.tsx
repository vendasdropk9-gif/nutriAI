import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Layers,
  Sparkles,
  Calendar,
  CheckCircle2,
  Printer,
  Copy,
  Download,
  Share2,
  TrendingUp,
  Activity,
  Dumbbell,
  Droplets,
  Heart,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Sliders,
  Grid,
  FileText,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Flame,
  Award,
  ArrowRight,
  Check
} from 'lucide-react';
import { PhotoEntry } from './PhotoEvolution';
import { UserProfile, ComparativeProgressReport } from '../types';
import { generateComparativeProgressReport, textToSpeech } from '../lib/gemini';
import { playSfx, vibrate } from '../lib/sensory';
import { exportElementAsImage } from '../lib/cardExport';

interface BodyProgressComparativeReportModalProps {
  entries: PhotoEntry[];
  profile: UserProfile | null;
  onClose: () => void;
  onSelectEntries?: (idA: string, idB: string) => void;
}

type ViewMode = 'split' | 'side-by-side' | 'ghost';

// Curated benchmark evolution photos for demo mode if user has < 2 photos
const DEMO_PHOTO_BEFORE: PhotoEntry = {
  id: 'demo-before',
  date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 35).toISOString(), // 35 days ago
  imageBase64: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=600&h=800',
  analysis: 'Registro inicial de referência: postura relaxada, bom potencial para tonificação do core e deltoides.'
};

const DEMO_PHOTO_AFTER: PhotoEntry = {
  id: 'demo-after',
  date: new Date().toISOString(),
  imageBase64: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&q=80&w=600&h=800',
  analysis: 'Evolução evidente aos 35 dias: melhor sustentação escapular, contorno abdominal visivelmente mais tonificado e firmeza geral.'
};

export function BodyProgressComparativeReportModal({
  entries,
  profile,
  onClose
}: BodyProgressComparativeReportModalProps) {
  // Use demo items if fewer than 2 photos are available
  const hasRealComparison = entries.length >= 2;
  const effectiveEntries = useMemo(() => {
    if (entries.length >= 2) return entries;
    if (entries.length === 1) return [entries[0], DEMO_PHOTO_AFTER];
    return [DEMO_PHOTO_BEFORE, DEMO_PHOTO_AFTER];
  }, [entries]);

  // Initial selection: Photo A = oldest, Photo B = newest
  const [photoAId, setPhotoAId] = useState<string>(
    effectiveEntries[effectiveEntries.length - 1]?.id || effectiveEntries[0]?.id
  );
  const [photoBId, setPhotoBId] = useState<string>(effectiveEntries[0]?.id);

  // Visual Modes & Controls
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [sliderPosition, setSliderPosition] = useState(50);
  const [ghostOpacity, setGhostOpacity] = useState(50);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showGridOverlay, setShowGridOverlay] = useState(false);

  // AI Report State
  const [report, setReport] = useState<ComparativeProgressReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const reportContainerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Resolved Photo A and Photo B objects
  const photoA = useMemo(
    () => effectiveEntries.find((e) => e.id === photoAId) || effectiveEntries[effectiveEntries.length - 1],
    [effectiveEntries, photoAId]
  );
  const photoB = useMemo(
    () => effectiveEntries.find((e) => e.id === photoBId) || effectiveEntries[0],
    [effectiveEntries, photoBId]
  );

  // Time elapsed between the two photos
  const daysDiff = useMemo(() => {
    if (!photoA || !photoB) return 1;
    const dA = new Date(photoA.date).getTime();
    const dB = new Date(photoB.date).getTime();
    return Math.max(1, Math.round(Math.abs(dB - dA) / (1000 * 60 * 60 * 24)));
  }, [photoA, photoB]);

  // Load cached report or trigger analysis on entry change
  useEffect(() => {
    if (!photoA || !photoB) return;
    const cacheKey = `nutri-comp-report_${photoA.id}_${photoB.id}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        setReport(JSON.parse(cached));
        return;
      } catch (e) {}
    }
    // Auto-generate report on first view
    generateReport();
  }, [photoA?.id, photoB?.id]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const generateReport = async () => {
    if (!photoA || !photoB) return;
    setIsLoadingReport(true);
    playSfx('crystal');
    vibrate([20, 40]);

    try {
      const res = await generateComparativeProgressReport(
        photoA.imageBase64,
        photoB.imageBase64,
        {
          dateA: photoA.date,
          dateB: photoB.date,
          profile: profile || {}
        }
      );

      if (res) {
        setReport(res);
        const cacheKey = `nutri-comp-report_${photoA.id}_${photoB.id}`;
        try {
          localStorage.setItem(cacheKey, JSON.stringify(res));
        } catch (e) {}
        playSfx('success');
        vibrate([30, 60]);
      }
    } catch (e) {
      console.warn('Erro ao gerar relatório comparativo:', e);
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleSwapPhotos = () => {
    playSfx('tap');
    vibrate(15);
    const temp = photoAId;
    setPhotoAId(photoBId);
    setPhotoBId(temp);
  };

  const handleCopyTextReport = () => {
    if (!report || !photoA || !photoB) return;
    playSfx('tap');
    vibrate(20);

    const text = `📊 RELATÓRIO COMPARATIVO DE PROGRESSO CORPORAL • NutriAI
👤 Paciente: ${profile?.name || 'Usuário'}
🎯 Meta Principal: ${profile?.goals || 'Composição Corporal'}
⚖️ Peso Atual: ${profile?.weight ? `${profile.weight} kg` : 'Em monitoramento'}
📅 Período Analisado: ${new Date(photoA.date).toLocaleDateString('pt-BR')} até ${new Date(photoB.date).toLocaleDateString('pt-BR')} (${daysDiff} dias)
🏆 Score de Evolução: ${report.overallScore}/100 • ${report.milestoneTitle}

📝 RESUMO EXECUTIVO:
${report.executiveSummary}

🔍 ANÁLISE REGIONAL:
• Postura e Alinhamento (${report.regionalAnalysis.postureAndAlignment.score}%): ${report.regionalAnalysis.postureAndAlignment.observation} (Melhoria: ${report.regionalAnalysis.postureAndAlignment.improvement})
• Cintura e Abdômen (${report.regionalAnalysis.coreAndWaistline.score}%): ${report.regionalAnalysis.coreAndWaistline.observation} (Melhoria: ${report.regionalAnalysis.coreAndWaistline.improvement})
• Tônus Muscular (${report.regionalAnalysis.muscleToneAndDensity.score}%): ${report.regionalAnalysis.muscleToneAndDensity.observation} (Melhoria: ${report.regionalAnalysis.muscleToneAndDensity.improvement})
• Retenção Hídrica (${report.regionalAnalysis.fluidRetention.score}%): ${report.regionalAnalysis.fluidRetention.observation} (Melhoria: ${report.regionalAnalysis.fluidRetention.improvement})

🎯 CONQUISTAS NOTÁVEIS:
${report.keyAchievements.map((c) => `- ${c}`).join('\n')}

🩺 RECOMENDAÇÕES CLÍNICAS:
• Nutrição: ${report.clinicalRecommendations.nutritionAdjustment}
• Hidratação: ${report.clinicalRecommendations.hydrationTip}
• Treinamento: ${report.clinicalRecommendations.trainingFocus}

📉 VARIAÇÕES APARENTES ESTIMADAS:
• Gordura Corporal: ${report.estimatedChanges.apparentBodyFatDelta}
• Circunferência da Cintura: ${report.estimatedChanges.apparentWaistDelta}
• Alinhamento Postural: ${report.estimatedChanges.apparentPostureImprovement}
`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    showToast('Relatório completo copiado para a área de transferência!');
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handlePrint = () => {
    playSfx('tap');
    vibrate(15);
    window.print();
  };

  const handleExportImage = async () => {
    if (!reportContainerRef.current) return;
    setIsExportingImage(true);
    playSfx('crystal');
    vibrate([25, 45]);

    try {
      const res = await exportElementAsImage(
        reportContainerRef.current,
        `relatorio_evolucao_nutriai_${Date.now()}.png`,
        'Relatório de Evolução NutriAI',
        true
      );
      if (res.success) {
        showToast('Card comparativo exportado com sucesso!');
      }
    } catch (err) {
      showToast('Erro ao exportar card. Tente imprimir em PDF.');
    } finally {
      setIsExportingImage(false);
    }
  };

  const handleToggleVoiceReport = async () => {
    if (isPlayingAudio) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlayingAudio(false);
      return;
    }

    if (!report) return;

    playSfx('tap');
    vibrate(20);
    setIsPlayingAudio(true);

    const spokenText = `Olá, ${profile?.name || 'atleta'}! Aqui está seu relatório de evolução comparativo de ${daysDiff} dias. ${report.executiveSummary} Seu score de evolução foi de ${report.overallScore} pontos. Parabéns pelo foco e consistência!`;

    try {
      const base64Audio = await textToSpeech(spokenText, 'pt-BR', { voiceName: 'Aoede' });
      if (base64Audio) {
        const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
        audioRef.current = audio;
        audio.onended = () => setIsPlayingAudio(false);
        audio.play();
      } else {
        // Web Speech API fallback with Malu Aoede profile
        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance(spokenText);
        utterance.lang = 'pt-BR';
        const voices = synth.getVoices();
        const aoede = voices.find((v) => v.name.includes('Aoede'));
        if (aoede) utterance.voice = aoede;
        utterance.onend = () => setIsPlayingAudio(false);
        synth.speak(utterance);
      }
    } catch (e) {
      setIsPlayingAudio(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-4 md:p-6 print:p-0 print:bg-white print:overflow-visible">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 z-[150] animate-in fade-in zoom-in slide-in-from-top-4 duration-300 bg-emerald-500 text-slate-950 px-5 py-2 rounded-full text-xs font-black shadow-xl shadow-emerald-500/30 flex items-center gap-2">
          <Sparkles className="w-4 h-4 fill-slate-950" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Modal Card */}
      <div
        ref={reportContainerRef}
        className="w-full max-w-4xl bg-slate-900 text-white rounded-3xl p-5 sm:p-7 md:p-8 shadow-2xl border border-slate-800 relative flex flex-col gap-6 my-auto print:bg-white print:text-slate-900 print:border-none print:shadow-none print:p-2"
      >
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800 print:border-slate-300">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[11px] font-black uppercase tracking-wider rounded-full shadow-sm">
                Visualizador Comparativo
              </span>
              <span className="px-2.5 py-1 bg-slate-800 text-slate-300 text-[11px] font-mono font-bold rounded-full border border-slate-700 flex items-center gap-1.5 print:bg-slate-100 print:text-slate-800">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                {daysDiff} dias de evolução
              </span>
              {!hasRealComparison && (
                <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded-full border border-amber-500/30">
                  ✨ Modo Demonstração (Adicione 2+ fotos para comparar as suas)
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-black text-white print:text-slate-900">
              Relatório de Progresso Corporal
            </h2>
            <p className="text-xs text-slate-400 print:text-slate-600 mt-0.5">
              Inspeção fotográfica com divisor interativo, sobreposição anatômica e parecer clínico de IA.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap no-export print:hidden">
            <button
              type="button"
              onClick={handleToggleVoiceReport}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isPlayingAudio
                  ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
              }`}
              title="Ouvir Resumo com Voz da Malu"
            >
              {isPlayingAudio ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              <span className="hidden md:inline">Malu Voz</span>
            </button>

            <button
              type="button"
              onClick={handleCopyTextReport}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Copiar Relatório em Texto Formatado"
            >
              <Copy className="w-4 h-4 text-sky-400" />
              <span className="hidden md:inline">{isCopied ? 'Copiado!' : 'Copiar'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportImage}
              disabled={isExportingImage}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Baixar Card em Imagem PNG"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">Card PNG</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Imprimir / Salvar em PDF Clínico"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">Imprimir PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2.5 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded-xl border border-slate-700 transition-all cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Photo Selection Bar */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 no-export print:hidden">
          <div className="flex-1 flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
              Ponto Inicial (Antes):
            </span>
            <select
              value={photoAId}
              onChange={(e) => setPhotoAId(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-white outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
            >
              {effectiveEntries.map((e, idx) => (
                <option key={`a-${e.id}`} value={e.id}>
                  Registro {effectiveEntries.length - idx} • {new Date(e.date).toLocaleDateString('pt-BR')}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleSwapPhotos}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            title="Inverter Posições"
          >
            <span>⇄</span>
            <span className="text-[11px]">Inverter</span>
          </button>

          <div className="flex-1 flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
              Evolução (Depois):
            </span>
            <select
              value={photoBId}
              onChange={(e) => setPhotoBId(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-white outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
            >
              {effectiveEntries.map((e, idx) => (
                <option key={`b-${e.id}`} value={e.id}>
                  Registro {effectiveEntries.length - idx} • {new Date(e.date).toLocaleDateString('pt-BR')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Visualizer Mode Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 no-export print:hidden">
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setViewMode('split');
                playSfx('tap');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Divisor Interativo</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode('side-by-side');
                playSfx('tap');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'side-by-side'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Lado a Lado</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode('ghost');
                playSfx('tap');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'ghost'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Sobreposição Fantasma</span>
            </button>
          </div>

          {/* Grid Overlay Toggle & Zoom Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowGridOverlay(!showGridOverlay);
                playSfx('tap');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                showGridOverlay
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Grade Postural</span>
            </button>

            {viewMode === 'side-by-side' && (
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(1, z - 0.25))}
                  className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                  title="Diminuir Zoom"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono font-bold text-slate-300 px-1">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(2, z + 0.25))}
                  className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                  title="Aumentar Zoom"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Visualizer Canvas Container */}
        <div className="w-full relative rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner flex flex-col items-center justify-center min-h-[360px] sm:min-h-[440px] md:min-h-[500px]">
          {/* Optional Anatomical Alignment Grid Lines */}
          {showGridOverlay && (
            <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between p-6">
              <div className="w-full border-b border-cyan-400/50 flex justify-between text-[9px] font-mono font-bold text-cyan-300 px-2">
                <span>NÍVEL DOS OMBROS (ACRÔMIO)</span>
                <span>0.0°</span>
              </div>
              <div className="w-full border-b border-cyan-400/40 flex justify-between text-[9px] font-mono font-bold text-cyan-300 px-2">
                <span>PEITORAL / ESTERNO</span>
                <span>TÓRAX</span>
              </div>
              <div className="w-full border-b border-cyan-400/50 flex justify-between text-[9px] font-mono font-bold text-cyan-300 px-2">
                <span>LINHA DA CINTURA</span>
                <span>CORE</span>
              </div>
              <div className="w-full border-b border-cyan-400/40 flex justify-between text-[9px] font-mono font-bold text-cyan-300 px-2">
                <span>CRISTAS ILÍACAS / QUADRIL</span>
                <span>PELVE</span>
              </div>
              {/* Vertical Sagittal Center Axis */}
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px border-l border-dashed border-cyan-400/60" />
            </div>
          )}

          {/* Mode 1: Split Slider */}
          {viewMode === 'split' && photoA && photoB && (
            <div className="relative w-full aspect-[3/4] sm:aspect-[4/3] max-h-[520px] select-none overflow-hidden">
              {/* Background: Photo A (Before) */}
              <img
                src={photoA.imageBase64}
                alt="Foto Antes"
                className="absolute inset-0 w-full h-full object-contain bg-slate-950"
              />
              <div className="absolute top-4 left-4 z-20 bg-slate-950/80 backdrop-blur-xs px-3 py-1 rounded-full border border-slate-700 text-xs font-bold text-slate-300">
                Ponto Inicial • {new Date(photoA.date).toLocaleDateString('pt-BR')}
              </div>

              {/* Foreground: Photo B (After) clipped with slider */}
              <div
                className="absolute inset-0 w-full h-full overflow-hidden"
                style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
              >
                <img
                  src={photoB.imageBase64}
                  alt="Foto Depois"
                  className="absolute inset-0 w-full h-full object-contain bg-slate-950"
                />
                <div className="absolute top-4 right-4 z-20 bg-emerald-500/90 text-slate-950 px-3 py-1 rounded-full text-xs font-black shadow-md">
                  Evolução • {new Date(photoB.date).toLocaleDateString('pt-BR')}
                </div>
              </div>

              {/* Divider Line & Handle */}
              <div
                className="absolute inset-y-0 z-20 w-0.5 bg-gradient-to-b from-indigo-400 via-white to-purple-400 shadow-xl pointer-events-none"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -left-4 w-8 h-8 rounded-full bg-white text-slate-950 shadow-2xl flex items-center justify-center border-2 border-indigo-500">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                </div>
              </div>

              {/* Range input for drag */}
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPosition}
                onChange={(e) => setSliderPosition(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                aria-label="Controle deslizante de comparação"
              />
            </div>
          )}

          {/* Mode 2: Side by Side */}
          {viewMode === 'side-by-side' && photoA && photoB && (
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
              {/* Photo A Card */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-bold text-slate-400 uppercase tracking-wider">Foto Base (Antes)</span>
                  <span className="font-mono text-slate-400">{new Date(photoA.date).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 relative">
                  <img
                    src={photoA.imageBase64}
                    alt="Foto Antes"
                    className="w-full h-full object-contain transition-transform duration-200"
                    style={{ transform: `scale(${zoomLevel})` }}
                  />
                </div>
              </div>

              {/* Photo B Card */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-bold text-emerald-400 uppercase tracking-wider">Evolução (Depois)</span>
                  <span className="font-mono text-emerald-400">{new Date(photoB.date).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 border border-emerald-500/40 relative ring-2 ring-emerald-500/20">
                  <img
                    src={photoB.imageBase64}
                    alt="Foto Depois"
                    className="w-full h-full object-contain transition-transform duration-200"
                    style={{ transform: `scale(${zoomLevel})` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Mode 3: Ghost Overlay */}
          {viewMode === 'ghost' && photoA && photoB && (
            <div className="w-full aspect-[3/4] sm:aspect-[4/3] max-h-[520px] relative overflow-hidden flex flex-col items-center justify-center p-4">
              <div className="relative w-full h-full">
                {/* Base Photo A */}
                <img
                  src={photoA.imageBase64}
                  alt="Base"
                  className="absolute inset-0 w-full h-full object-contain"
                />
                {/* Overlay Photo B with Opacity */}
                <img
                  src={photoB.imageBase64}
                  alt="Sobreposição"
                  className="absolute inset-0 w-full h-full object-contain mix-blend-screen transition-opacity duration-150"
                  style={{ opacity: ghostOpacity / 100 }}
                />
              </div>

              {/* Floating Opacity Slider */}
              <div className="absolute bottom-4 left-6 right-6 z-20 bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-700/80 flex items-center gap-3">
                <span className="text-[11px] font-bold text-slate-300 shrink-0">
                  Opacidade da Foto B (Depois): {ghostOpacity}%
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={ghostOpacity}
                  onChange={(e) => setGhostOpacity(Number(e.target.value))}
                  className="flex-1 accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Biometric Progress Metrics Cards */}
        {report && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl flex flex-col justify-between print:border-slate-300 print:bg-slate-50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                Intervalo
              </span>
              <div className="text-xl sm:text-2xl font-serif font-black text-white print:text-slate-900 mt-1">
                {daysDiff} <span className="text-xs font-sans font-bold text-slate-400">dias</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5">Tempo de adesão</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl flex flex-col justify-between print:border-slate-300 print:bg-slate-50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                Score Geral
              </span>
              <div className="text-xl sm:text-2xl font-serif font-black text-amber-400 mt-1">
                {report.overallScore}<span className="text-xs font-sans font-bold text-slate-400">/100</span>
              </div>
              <span className="text-[10px] text-amber-300 truncate">{report.milestoneTitle}</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl flex flex-col justify-between print:border-slate-300 print:bg-slate-50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                Retenção Hídrica
              </span>
              <div className="text-xl sm:text-2xl font-serif font-black text-cyan-400 mt-1">
                {report.regionalAnalysis.fluidRetention.score}%
              </div>
              <span className="text-[10px] text-slate-400">Drenagem aparente</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl flex flex-col justify-between print:border-slate-300 print:bg-slate-50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                Variação Cintura
              </span>
              <div className="text-xl sm:text-2xl font-serif font-black text-emerald-400 mt-1">
                {report.estimatedChanges.apparentWaistDelta}
              </div>
              <span className="text-[10px] text-slate-400">Redução estimada</span>
            </div>
          </div>
        )}

        {/* AI Clinical Progress Report Card */}
        <div className="bg-slate-950/90 border border-indigo-500/30 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden space-y-5 print:border-slate-300 print:bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-serif font-bold text-white print:text-slate-900 flex items-center gap-2">
                  Parecer Clínico NutriAI
                  {isLoadingReport && <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />}
                </h3>
                <p className="text-xs text-slate-400 print:text-slate-600">
                  Avaliação biomecânica e nutricional comparativa gerada por visão computacional
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={generateReport}
              disabled={isLoadingReport}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50 no-export print:hidden shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingReport ? 'animate-spin' : ''}`} />
              <span>{isLoadingReport ? 'Analisando...' : 'Regenerar Análise'}</span>
            </button>
          </div>

          {isLoadingReport && (
            <div className="py-8 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
              <p className="text-sm font-medium text-slate-300">
                A IA está processando os vetores anatômicos e alinhamentos posturais...
              </p>
            </div>
          )}

          {!isLoadingReport && report && (
            <div className="space-y-5 text-sm">
              {/* Executive Summary */}
              <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-2xl p-4 text-slate-200 print:bg-indigo-50 print:text-slate-800 leading-relaxed">
                <p className="font-sans text-xs sm:text-sm font-medium">
                  {report.executiveSummary}
                </p>
              </div>

              {/* 4-Axis Regional Analysis Grid */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-400" />
                  Evolução por Regiões Anatômicas
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Axis 1: Posture & Alignment */}
                  <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl print:border-slate-300 print:bg-slate-50 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white print:text-slate-900 flex items-center gap-1.5">
                        🧘 Postura & Alinhamento
                      </span>
                      <span className="font-mono font-bold text-emerald-400">
                        {report.regionalAnalysis.postureAndAlignment.score}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 print:text-slate-700 leading-snug">
                      {report.regionalAnalysis.postureAndAlignment.observation}
                    </p>
                    <div className="text-[11px] text-emerald-400 font-medium">
                      ✓ {report.regionalAnalysis.postureAndAlignment.improvement}
                    </div>
                  </div>

                  {/* Axis 2: Core & Waistline */}
                  <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl print:border-slate-300 print:bg-slate-50 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white print:text-slate-900 flex items-center gap-1.5">
                        ⚡ Cintura & Parede Abdominal
                      </span>
                      <span className="font-mono font-bold text-emerald-400">
                        {report.regionalAnalysis.coreAndWaistline.score}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 print:text-slate-700 leading-snug">
                      {report.regionalAnalysis.coreAndWaistline.observation}
                    </p>
                    <div className="text-[11px] text-emerald-400 font-medium">
                      ✓ {report.regionalAnalysis.coreAndWaistline.improvement}
                    </div>
                  </div>

                  {/* Axis 3: Muscle Tone */}
                  <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl print:border-slate-300 print:bg-slate-50 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white print:text-slate-900 flex items-center gap-1.5">
                        💪 Tônus & Densidade Muscular
                      </span>
                      <span className="font-mono font-bold text-emerald-400">
                        {report.regionalAnalysis.muscleToneAndDensity.score}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 print:text-slate-700 leading-snug">
                      {report.regionalAnalysis.muscleToneAndDensity.observation}
                    </p>
                    <div className="text-[11px] text-emerald-400 font-medium">
                      ✓ {report.regionalAnalysis.muscleToneAndDensity.improvement}
                    </div>
                  </div>

                  {/* Axis 4: Fluid Retention */}
                  <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl print:border-slate-300 print:bg-slate-50 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white print:text-slate-900 flex items-center gap-1.5">
                        💧 Drenagem & Retenção Hídrica
                      </span>
                      <span className="font-mono font-bold text-cyan-400">
                        {report.regionalAnalysis.fluidRetention.score}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 print:text-slate-700 leading-snug">
                      {report.regionalAnalysis.fluidRetention.observation}
                    </p>
                    <div className="text-[11px] text-cyan-400 font-medium">
                      ✓ {report.regionalAnalysis.fluidRetention.improvement}
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Achievements */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Conquistas do Período
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {report.keyAchievements.map((ach, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-200 print:bg-slate-50 print:text-slate-800"
                    >
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 text-[10px] font-bold">
                        ✓
                      </span>
                      <span>{ach}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clinical Recommendations for Next Phase */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2.5 print:bg-slate-50 print:border-slate-300">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-emerald-400" />
                  Recomendações Clínicas para os Próximos Passos
                </h4>
                <div className="space-y-1.5 text-xs text-slate-300 print:text-slate-700">
                  <p>
                    <strong className="text-white print:text-slate-900">🥗 Nutrição:</strong>{' '}
                    {report.clinicalRecommendations.nutritionAdjustment}
                  </p>
                  <p>
                    <strong className="text-white print:text-slate-900">💧 Hidratação:</strong>{' '}
                    {report.clinicalRecommendations.hydrationTip}
                  </p>
                  <p>
                    <strong className="text-white print:text-slate-900">🏋️ Treinamento:</strong>{' '}
                    {report.clinicalRecommendations.trainingFocus}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer / Clinical Disclaimer */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-slate-500 text-[11px] pt-2 border-t border-slate-800 print:border-slate-300 gap-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Dados mantidos em armazenamento local criptografado com respeito à privacidade.</span>
          </div>
          <span className="font-mono">NutriAI Evolution Engine • 2026</span>
        </div>
      </div>
    </div>
  );
}
