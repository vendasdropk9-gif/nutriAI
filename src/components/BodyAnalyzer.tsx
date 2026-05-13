import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Loader2, Sparkles, AlertCircle, RefreshCw, Activity, Volume2, Play, CheckCircle2, ShieldCheck, Heart, User, Droplet, Dumbbell } from 'lucide-react';
import { analyzeBodyImage, getGeneralBodyTips, textToSpeech } from '../lib/gemini';
import { playAudioUrl } from '../lib/speech';
import { UserProfile } from '../types';

interface BodyAnalyzerProps {
  profile: UserProfile | null;
  onAwardPoints?: (amount: number, reason: string) => void;
}

export function BodyAnalyzer({ profile, onAwardPoints }: BodyAnalyzerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopAudio = () => {
    setIsPlaying(false);
  };

  const playTTS = async (text: string) => {
    if (isPlaying) return;
    setIsPlaying(true);
    
    try {
      if (audioUrl) {
        await playAudioUrl(audioUrl, { onEnded: () => setIsPlaying(false) });
        return;
      }

      const base64Audio = await textToSpeech(text);
      if (base64Audio) {
        const url = `data:audio/wav;base64,${base64Audio}`;
        setAudioUrl(url);
        await playAudioUrl(url, { onEnded: () => setIsPlaying(false) });
      } else {
        setIsPlaying(false);
      }
    } catch (error) {
      console.error(error);
      setIsPlaying(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      stopAudio();
      setAudioUrl(null);
      setIsScanning(true);
      setAnalysisResult(null);
      
      const previewUrl = URL.createObjectURL(file);
      setPreviewImage(previewUrl);

      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        const mimeType = file.type;

        const data = await analyzeBodyImage(base64Data, mimeType, profile);
        if (data) {
          setAnalysisResult(data);
          if (onAwardPoints) onAwardPoints(100, 'Análise de evolução corporal concluída');
        } else {
          alert('Não foi possível realizar a análise. Tente novamente.');
        }
        setIsScanning(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      alert('Erro ao processar imagem.');
      setIsScanning(false);
    }
  };

  const handleGeneralTips = async () => {
    stopAudio();
    setAudioUrl(null);
    setIsScanning(true);
    setAnalysisResult(null);
    setPreviewImage(null);

    const data = await getGeneralBodyTips(profile);
    if (data) {
      setAnalysisResult(data);
      if (onAwardPoints) onAwardPoints(50, 'Dicas gerais de bem-estar consultadas');
    } else {
      alert('Não foi possível gerar dicas. Tente novamente.');
    }
    setIsScanning(false);
  };

  const resetAnalyzer = () => {
    stopAudio();
    setPreviewImage(null);
    setAnalysisResult(null);
    setAudioUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16">
      <div className="text-center space-y-4 mb-12">
        <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
          Clínica Corporal e Evolução
        </h2>
        <p className="font-sans text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-lg leading-relaxed">
          Nossa IA avalia sua forma de maneira neutra e confidencial para sugerir ajustes na sua jornada. 100% privado e opcional.
        </p>
      </div>

      <div className="clay-card p-6 md:p-8">
        
        {/* State 1: Upload / Wait */}
        {!previewImage && !isScanning && !analysisResult && (
          <div className="space-y-8">
            <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-[24px] p-6 border border-emerald-100 dark:border-emerald-800/30 flex items-start gap-4">
              <ShieldCheck className="w-8 h-8 text-emerald-600 mt-1 shrink-0" />
              <div>
                <h4 className="font-bold text-emerald-800 dark:text-emerald-400 text-lg mb-1">Privacidade Garantida</h4>
                <p className="text-emerald-700/80 dark:text-emerald-400/80 text-sm">
                  Sua foto não é salva ou compartilhada. O processamento é feito em tempo real para gerar dicas e depois a imagem é descartada. Você também pode receber dicas sem enviar foto.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div 
                className="flex flex-col items-center justify-center p-8 md:p-12 border-2 border-dashed border-emerald-300 dark:border-emerald-700/50 bg-white/50 dark:bg-slate-800/50 rounded-[24px] hover:bg-emerald-50 dark:hover:bg-slate-800 transition-all cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Camera className="w-10 h-10" />
                </div>
                <h4 className="text-slate-800 dark:text-white font-bold text-lg mb-2">Análise por Foto</h4>
                <p className="text-slate-500 dark:text-slate-400 text-center text-sm">
                  Envie uma foto de corpo (preferencialmente com roupas leves) para análise.
                </p>
              </div>

              <div 
                className="flex flex-col items-center justify-center p-8 md:p-12 border-2 border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 rounded-[24px] hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer group"
                onClick={handleGeneralTips}
              >
                <div className="w-20 h-20 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-10 h-10" />
                </div>
                <h4 className="text-slate-800 dark:text-white font-bold text-lg mb-2">Dicas Gerais</h4>
                <p className="text-slate-500 dark:text-slate-400 text-center text-sm">
                  Prefiro não enviar foto agora, mas quero recomendações da NutriAI.
                </p>
              </div>
            </div>

            <input
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="hidden"
            />
          </div>
        )}

        {/* State 2: Scanning / Processing */}
        {isScanning && (
          <div className="relative w-full aspect-[4/3] md:aspect-video rounded-[24px] overflow-hidden bg-emerald-100 flex items-center justify-center border border-white/60">
            {previewImage && <img src={previewImage} alt="Análise" className="absolute inset-0 w-full h-full object-cover blur-[4px] opacity-70" />}
            <div className={`absolute inset-0 flex flex-col items-center justify-center z-10 ${previewImage ? 'bg-emerald-900/60 backdrop-blur-sm text-white' : 'bg-slate-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400'}`}>
              <Loader2 className="w-12 h-12 animate-spin mb-4" />
              <p className="text-lg font-medium">{previewImage ? 'Analisando forma e evolução...' : 'Buscando recomendações personalizadas...'}</p>
            </div>
            
            {previewImage && (
              <div className="absolute top-0 left-0 right-0 h-2 bg-emerald-400 shadow-[0_0_20px_#34d399] z-20 animate-[scan_2s_ease-in-out_infinite]"></div>
            )}
          </div>
        )}

        {/* State 3: Analysis Done */}
        {analysisResult && !isScanning && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            <div className="flex flex-col md:flex-row gap-6 items-start clay-card p-6 bg-white dark:bg-slate-800 border-none shadow-xl">
              {previewImage ? (
                 <div className="w-32 h-32 md:w-48 md:h-48 shrink-0 rounded-[20px] overflow-hidden shadow-lg border-4 border-white dark:border-slate-700 relative">
                    <img src={previewImage} alt="Sua Análise" className="w-full h-full object-cover opacity-90" />
                 </div>
              ) : (
                 <div className="w-24 h-24 shrink-0 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-500 shadow-inner">
                    <User className="w-12 h-12" />
                 </div>
              )}
              
              <div className="flex-1 space-y-4">
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => playTTS(analysisResult.assistantMessage)}
                    className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-white bg-emerald-500 hover:scale-105 transition-all shadow-md ${isPlaying ? 'animate-pulse ring-4 ring-emerald-500/30' : ''}`}
                  >
                    {isPlaying ? <Volume2 className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                  </button>
                  <div className="pt-1">
                    <h4 className="font-serif text-xl text-slate-800 dark:text-slate-100 font-medium mb-2">Mensagem do Treinador:</h4>
                    <p className="font-sans text-slate-600 dark:text-slate-300 text-lg leading-relaxed italic border-l-4 border-emerald-500 pl-4 bg-slate-50 dark:bg-slate-800/50 py-2 rounded-r-lg">
                      "{analysisResult.assistantMessage}"
                    </p>
                  </div>
                </div>
              </div>
              <div className="shrink-0 pt-2">
                 <button
                  onClick={resetAnalyzer}
                  className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reiniciar
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30 rounded-[24px] p-6 shadow-sm">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                       <Heart className="w-5 h-5" />
                    </div>
                    <h5 className="font-bold text-orange-800 dark:text-orange-400">Nutrição</h5>
                 </div>
                 <ul className="space-y-3">
                    {analysisResult.recommendations?.food?.map((tip: string, idx: number) => (
                      <li key={idx} className="flex gap-2 text-slate-600 dark:text-slate-300 text-sm">
                         <span className="text-orange-400 mt-1">•</span>
                         <span className="leading-relaxed">{tip}</span>
                      </li>
                    ))}
                 </ul>
              </div>

              <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-[24px] p-6 shadow-sm">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                       <Droplet className="w-5 h-5" />
                    </div>
                    <h5 className="font-bold text-blue-800 dark:text-blue-400">Rotina & Hidratação</h5>
                 </div>
                 <ul className="space-y-3">
                    {analysisResult.recommendations?.hydration?.map((tip: string, idx: number) => (
                      <li key={idx} className="flex gap-2 text-slate-600 dark:text-slate-300 text-sm">
                         <span className="text-blue-400 mt-1">•</span>
                         <span className="leading-relaxed">{tip}</span>
                      </li>
                    ))}
                 </ul>
              </div>

              <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 rounded-[24px] p-6 shadow-sm">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                       <Dumbbell className="w-5 h-5" />
                    </div>
                    <h5 className="font-bold text-indigo-800 dark:text-indigo-400">Exercícios</h5>
                 </div>
                 <ul className="space-y-3">
                    {analysisResult.recommendations?.exercise?.map((tip: string, idx: number) => (
                      <li key={idx} className="flex gap-2 text-slate-600 dark:text-slate-300 text-sm">
                         <span className="text-indigo-400 mt-1">•</span>
                         <span className="leading-relaxed">{tip}</span>
                      </li>
                    ))}
                 </ul>
              </div>
            </div>

            {analysisResult.manipulationDetected && (
               <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 p-4 rounded-xl flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-amber-800 dark:text-amber-300 text-sm leading-relaxed">
                    Notei alguns detalhes na imagem que parecem sugerir filtros ou manipulação de imagem. Para a saúde real das emoções e do corpo, evite se comparar com padrões irreais, seja de redes sociais, ou da própria foto. Caso sinta que a percepção do seu corpo está te prejudicando emocionalmente, uma avaliação com um profissional psicólogo pode ser uma excelente e cuidadosa escolha nesse momento!
                  </p>
               </div>
            )}
            
          </div>
        )}
      </div>
    </div>
  );
}
