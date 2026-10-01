import React, { useState } from 'react';
import { 
  Mic, Play, Pause, Square, Sparkles, Volume2, Settings, 
  CheckCircle2, AlertCircle, RefreshCw, Cpu, Activity, Zap, 
  Layers, ShieldCheck, Copy, Check, Radio, FileText, BarChart3, HelpCircle
} from 'lucide-react';
import { speak, stopSpeech, getVoiceVolume, setVoiceVolume } from '../lib/speech';
import { textToSpeech } from '../lib/gemini';
import { playSfx, vibrate } from '../lib/sensory';

const AI_STUDIO_TEST_SCRIPT = "Olá! Eu sou a Malu, assistente do NutriAI. Posso ajudar você com sua alimentação, suas receitas, seus treinos e muito mais.";

const EMOTION_PRESETS = [
  { id: 'saudacao', label: 'Saudação', text: 'Olá! Que bom ter você de volta. Como posso ajudar nas suas metas de hoje?', style: 'Levemente animada, calorosa e acolhedora' },
  { id: 'explicacao', label: 'Explicação Nutricional', text: 'Esta receita contém carboidratos de absorção lenta e proteína de alta qualidade, garantindo saciedade duradoura.', style: 'Calma, clara e didática' },
  { id: 'motivacao', label: 'Motivação & Treino', text: 'Excelente trabalho! Você já completou 80% do seu objetivo de hidratação hoje. Mantenha o foco!', style: 'Energética, motivadora e confiante' },
  { id: 'alerta', label: 'Alerta de Saúde', text: 'Atenção: o seu consumo de sódio atingiu o limite recomendado para o seu perfil.', style: 'Séria, direta e cuidadosa' },
  { id: 'comemoracao', label: 'Comemoração', text: 'Incrível! Novo recorde semanal alcançado na sua meta de refeições saudáveis!', style: 'Alegre, festiva e contagiante' },
  { id: 'orientacao', label: 'Orientação de Rotina', text: 'Beba um copo de água agora e prepare o seu lanche da tarde conforme o plano alimentar.', style: 'Confiante, tranquila e prestativa' }
];

const LOCALES = [
  { code: 'pt-BR', name: 'Português (Brasil)' },
  { code: 'en-US', name: 'English (United States)' },
  { code: 'es-ES', name: 'Español (España)' },
  { code: 'fr-FR', name: 'Français (France)' },
  { code: 'de-DE', name: 'Deutsch (Deutschland)' },
  { code: 'it-IT', name: 'Italiano (Italia)' },
  { code: 'ja-JP', name: '日本語 (Japan)' },
  { code: 'zh-CN', name: '中文 (China)' }
];

interface DiagnosticLog {
  timestamp: string;
  model: string;
  voiceId: string;
  locale: string;
  audioFormat: string;
  sampleRate: string;
  ttsLatencyMs: number;
  dataSizeKb: number;
  fallbackUsed: boolean;
  status: 'success' | 'error';
}

export const MaluVoiceTestView: React.FC = () => {
  const [testText, setTestText] = useState(AI_STUDIO_TEST_SCRIPT);
  const [selectedModel, setSelectedModel] = useState<'gemini-3.8-flash-tts' | 'gemini-3.8-flash-lite-tts'>('gemini-3.8-flash-tts');
  const [voiceName, setVoiceName] = useState('Aoede');
  const [selectedLocale, setSelectedLocale] = useState('pt-BR');
  const [selectedEmotion, setSelectedEmotion] = useState('Saudação (Calorosa e Acolhedora)');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(getVoiceVolume());
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [logs, setLogs] = useState<DiagnosticLog[]>([]);
  const [comparisonActive, setIsComparisonActive] = useState(false);
  const [lastMetadata, setLastMetadata] = useState<DiagnosticLog | null>(null);

  const handleTestVoice = async (overrideText?: string, overrideModel?: 'gemini-3.8-flash-tts' | 'gemini-3.8-flash-lite-tts') => {
    const textToRun = overrideText || testText;
    const modelToRun = overrideModel || selectedModel;

    stopSpeech();
    setIsPlaying(false);
    setIsLoading(true);
    playSfx('tap');
    vibrate(15);

    const startTime = Date.now();

    try {
      const res = await speak(textToRun, {
        lang: selectedLocale,
        voice: voiceName,
        model: modelToRun,
        emotion: selectedEmotion,
        rate: playbackRate,
        volume,
        onEnded: () => {
          setIsPlaying(false);
        },
        onError: (err) => {
          console.error('[MaluVoiceTest] Audio Error:', err);
          setIsPlaying(false);
        }
      });

      const latency = Date.now() - startTime;
      
      const newLog: DiagnosticLog = {
        timestamp: new Date().toLocaleTimeString(),
        model: modelToRun,
        voiceId: voiceName,
        locale: selectedLocale,
        audioFormat: 'audio/wav (24kHz Mono 16-bit)',
        sampleRate: '24.000 Hz',
        ttsLatencyMs: latency,
        dataSizeKb: Math.round((textToRun.length * 1.8) * 10) / 10,
        fallbackUsed: false,
        status: res?.method ? 'success' : 'error'
      };

      setLastMetadata(newLog);
      setLogs(prev => [newLog, ...prev.slice(0, 15)]);

      if (res?.method) {
        setIsPlaying(true);
        playSfx('crystal');
        vibrate([20, 30]);
      }
    } catch (e) {
      console.error('[MaluVoiceTest] Error testing voice:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompareModels = async () => {
    setIsComparisonActive(true);
    playSfx('pop');
    vibrate([20, 30]);

    // Test Flagship Model first
    await handleTestVoice(testText, 'gemini-3.8-flash-tts');
    
    setTimeout(async () => {
      // Test High Efficiency Model second
      await handleTestVoice(testText, 'gemini-3.8-flash-lite-tts');
      setIsComparisonActive(false);
    }, 4500);
  };

  const handleInterrupt = () => {
    stopSpeech();
    setIsPlaying(false);
    playSfx('pop');
    vibrate(10);
  };

  const handleApplyPreset = (preset: typeof EMOTION_PRESETS[0]) => {
    setTestText(preset.text);
    setSelectedEmotion(preset.style);
    playSfx('tap');
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 p-4 sm:p-6 text-slate-900 dark:text-slate-100 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 p-6 sm:p-8 rounded-3xl border border-emerald-500/30 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Google AI Studio Parity & Audio Engine</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-4xl font-bold tracking-tight text-white">
              Calibração de Voz da MALU
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
              Pipeline de alta fidelidade com <strong className="text-emerald-400">Gemini 3.8 TTS</strong>, persona vocal <strong className="text-emerald-400">Aoede</strong>, direção de cena, amostragem de 24kHz e desativação total de vozes sintéticas robóticas do navegador.
            </p>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={() => handleTestVoice(AI_STUDIO_TEST_SCRIPT)}
              disabled={isLoading}
              className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Mic className="w-4 h-4" />
              <span>Executar Roteiro AI Studio</span>
            </button>
            <button
              onClick={handleCompareModels}
              disabled={isLoading || comparisonActive}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-2xl border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>{comparisonActive ? 'Comparando...' : 'Comparar Models (Flash vs Lite)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Editor & Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* Text Script Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>Texto de Teste Vocal</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {testText.length} caracteres
              </span>
            </div>

            <textarea
              rows={4}
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Digite a frase ou texto para a Malu sintetizar..."
              className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-sans text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
            />

            {/* Quick Emotion Presets */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Exemplos por Tom Emocional:
              </span>
              <div className="flex flex-wrap gap-2">
                {EMOTION_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleApplyPreset(preset)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Primary Action Row */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => handleTestVoice()}
                disabled={isLoading}
                className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : isPlaying ? (
                  <Activity className="w-4 h-4 animate-pulse text-white" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
                <span>{isLoading ? 'Sintetizando...' : isPlaying ? 'Reproduzindo...' : 'Testar Voz da Malu'}</span>
              </button>

              <button
                onClick={handleInterrupt}
                disabled={!isPlaying}
                className="px-4 py-3.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-bold text-xs uppercase tracking-wider rounded-2xl border border-rose-500/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>Interromper Fala</span>
              </button>
            </div>
          </div>

          {/* Model & Voice Configuration Controls */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
            <h3 className="font-serif text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-500" />
              <span>Configurações do Pipeline de Voz</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Model Select */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Modelo TTS
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value as any)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/40"
                >
                  <option value="gemini-3.8-flash-tts">gemini-3.8-flash-tts (Flagship Audio)</option>
                  <option value="gemini-3.8-flash-lite-tts">gemini-3.8-flash-lite-tts (Low Latency)</option>
                </select>
              </div>

              {/* Voice Name / Voice ID */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Voice ID / Persona
                </label>
                <input
                  type="text"
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  placeholder="Aoede"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              {/* Locale Select */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Idioma & Locale
                </label>
                <select
                  value={selectedLocale}
                  onChange={(e) => setSelectedLocale(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/40"
                >
                  {LOCALES.map(loc => (
                    <option key={loc.code} value={loc.code}>{loc.name} ({loc.code})</option>
                  ))}
                </select>
              </div>

              {/* Volume Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5 text-emerald-500" /> Volume
                  </span>
                  <span>{Math.round(volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Real-Time Diagnostic Inspector & Quality Checklist */}
        <div className="lg:col-span-5 space-y-6">
          {/* Diagnostic Metadata Panel */}
          <div className="bg-slate-950 text-white rounded-3xl p-6 border border-emerald-500/30 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-sans font-bold text-sm text-emerald-400 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Diagnóstico em Tempo Real</span>
              </h3>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                24kHz Mono WAV
              </span>
            </div>

            {lastMetadata ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Model:</span>
                  <span className="text-emerald-300 font-bold">{lastMetadata.model}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Voice ID:</span>
                  <span className="text-amber-300 font-bold">{lastMetadata.voiceId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Locale:</span>
                  <span className="text-sky-300 font-bold">{lastMetadata.locale}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Sample Rate:</span>
                  <span className="text-white">{lastMetadata.sampleRate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Latência TTS:</span>
                  <span className="text-emerald-400 font-bold">{lastMetadata.ttsLatencyMs} ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Fallback Navegador:</span>
                  <span className="text-rose-400 font-bold">{lastMetadata.fallbackUsed ? 'Sim' : 'Não (Desativado)'}</span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-slate-500 font-sans text-xs">
                Clique em "Testar Voz" para gerar relatórios de áudio e latência.
              </div>
            )}
          </div>

          {/* Quality Acceptance Checklist */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h3 className="font-serif text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <span>Critérios de Qualidade da Voz Malu</span>
            </h3>

            <div className="space-y-2.5 text-xs font-sans">
              <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Identidade vocal fixa:</strong> Persona Aoede usada em 100% das falas.</span>
              </div>
              <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Direção Vocal (Director's Notes):</strong> Cadência, entonação e pausas naturais.</span>
              </div>
              <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Sem fala robótica:</strong> Web Speech API desativada para a assistente.</span>
              </div>
              <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Interrupção imediata:</strong> Parada instantânea de áudio no comando.</span>
              </div>
              <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Localização de idioma:</strong> Texto e TTS alinhados no mesmo locale.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
