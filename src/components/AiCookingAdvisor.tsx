import React, { useState } from 'react';
import { 
  ChefHat, Sparkles, Clock, Thermometer, ArrowRightLeft, 
  HeartPulse, Lightbulb, AlertTriangle, Volume2, Mic, MicOff, 
  Loader2, Send, CheckCircle2, RotateCcw, Flame
} from 'lucide-react';
import { askCookingAssistant } from '../lib/gemini';
import { speak } from '../lib/speech';
import { CookingAdviceResult, UserProfile } from '../types';

interface AiCookingAdvisorProps {
  profile?: UserProfile | null;
  recipeContext?: {
    recipeTitle?: string;
    ingredients?: string[];
    currentStep?: string;
    targetDish?: string;
  };
  onClose?: () => void;
}

const QUICK_QUESTIONS = [
  {
    icon: '🍗',
    label: 'Quanto tempo devo assar este frango?',
    query: 'Quanto tempo devo assar este frango?'
  },
  {
    icon: '🥣',
    label: 'Posso substituir creme de leite por iogurte grego?',
    query: 'Posso substituir o creme de leite por iogurte grego nesta receita?'
  },
  {
    icon: '🥩',
    label: 'Como selar carne e manter suculência?',
    query: 'Qual a técnica correta para selar a carne na panela sem perder o suco e sem ressecar?'
  },
  {
    icon: '🧂',
    label: 'O molho salgou, como corrigir?',
    query: 'Meu molho ou ensopado ficou com excesso de sal, como posso corrigir sem estragar a receita?'
  },
  {
    icon: '🥑',
    label: 'Como trocar manteiga por azeite?',
    query: 'Qual a proporção para substituir manteiga por azeite de oliva e o que muda na textura?'
  },
  {
    icon: '🥕',
    label: 'Legumes no vapor sem perder nutrientes?',
    query: 'Quanto tempo cozinhar legumes no vapor para ficarem crocantes e manterem as vitaminas?'
  }
];

export const AiCookingAdvisor: React.FC<AiCookingAdvisorProps> = ({
  profile,
  recipeContext,
  onClose
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CookingAdviceResult | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleAsk = async (questionText: string) => {
    const q = questionText.trim();
    if (!q) return;
    setLoading(true);
    setQuery(q);

    try {
      const advice = await askCookingAssistant(q, recipeContext, profile || undefined);
      setResult(advice);
      // Auto-vocalize direct answer with Chef Malu's Aoede voice
      if (advice?.directAnswer) {
        speak(advice.directAnswer, { lang: 'pt-BR' });
      }
    } catch (err) {
      console.warn("Erro ao consultar Chef Malu:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Reconhecimento de voz não suportado pelo navegador atual.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        setQuery(transcript);
        handleAsk(transcript);
      }
    };

    recognition.start();
  };

  const playVoiceResponse = () => {
    if (!result) return;
    setIsSpeaking(true);
    const speechText = `${result.directAnswer}. ${result.answer}`;
    speak(speechText, { lang: 'pt-BR' });
    setTimeout(() => setIsSpeaking(false), 4000);
  };

  return (
    <div id="ai-cooking-advisor-container" className="bg-white dark:bg-zinc-900 rounded-2xl border border-emerald-100 dark:border-zinc-800 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-inner">
            <ChefHat className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight">Chef Malu IA • Cozinha Orientada</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-400/20 text-emerald-100 border border-emerald-300/30">
                Nutrição & Gastronomia
              </span>
            </div>
            <p className="text-xs text-emerald-100/90">
              {recipeContext?.recipeTitle 
                ? `Orientando sobre: "${recipeContext.recipeTitle}"` 
                : "Tire dúvidas de tempo de forno, substituições inteligentes e dicas culinárias"}
            </p>
          </div>
        </div>

        {onClose && (
          <button 
            id="close-cooking-advisor-btn"
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition"
          >
            ✕
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="p-5 space-y-6">
        {/* Input Bar */}
        <div className="space-y-2">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleAsk(query); }}
            className="flex items-center gap-2 relative"
          >
            <input
              id="cooking-advisor-query-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: Quanto tempo devo assar este frango? ou Posso trocar creme de leite por iogurte grego?"
              disabled={loading}
              className="w-full px-4 py-3.5 pr-24 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            />
            <div className="absolute right-2 flex items-center gap-1">
              <button
                type="button"
                id="voice-dictation-btn"
                onClick={handleVoiceInput}
                disabled={loading}
                title="Falar com a Chef Malu"
                className={`p-2 rounded-lg text-xs font-medium transition ${
                  isListening 
                    ? 'bg-rose-500 text-white animate-pulse' 
                    : 'text-zinc-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-zinc-700'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button
                type="submit"
                id="submit-cooking-advisor-btn"
                disabled={loading || !query.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white p-2.5 rounded-lg text-xs font-semibold flex items-center justify-center transition shadow-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </form>

          {/* Quick Suggestions Chips */}
          <div>
            <p className="text-xs text-zinc-400 font-medium mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Perguntas frequentes para testar agora:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_QUESTIONS.map((item, i) => (
                <button
                  key={i}
                  id={`quick-cooking-query-${i}`}
                  type="button"
                  onClick={() => handleAsk(item.query)}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-emerald-50 dark:bg-zinc-800 dark:hover:bg-emerald-950/40 text-zinc-700 dark:text-zinc-300 hover:text-emerald-700 dark:hover:text-emerald-300 border border-zinc-200/80 dark:border-zinc-700/60 transition flex items-center gap-1.5 text-left"
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-8 text-center space-y-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Chef Malu analisando técnicas e nutrição...</p>
              <p className="text-xs text-zinc-500">Calculando tempos térmicos, proporções e matriz nutricional.</p>
            </div>
          </div>
        )}

        {/* Advice Results */}
        {result && !loading && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Direct Answer Banner */}
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        Resposta Direta do Chef
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 leading-relaxed">
                      {result.directAnswer}
                    </p>
                  </div>
                </div>

                <button
                  id="play-malu-voice-btn"
                  onClick={playVoiceResponse}
                  title="Ouvir a voz da Chef Malu (Aoede)"
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100/50 transition shadow-sm"
                >
                  <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isSpeaking ? 'Falando...' : 'Ouvir'}</span>
                </button>
              </div>

              <div className="mt-3 pt-3 border-t border-emerald-200/60 dark:border-emerald-800/30 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                {result.answer}
              </div>
            </div>

            {/* Grid of Specialized Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Cooking Time & Temp Card (if applicable) */}
              {result.cookingTimeAndTemp && (
                <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-xs">
                    <Flame className="w-4 h-4 text-amber-600" />
                    <span>Controle de Tempo e Temperatura</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {result.cookingTimeAndTemp.temperature && (
                      <div className="bg-white/80 dark:bg-zinc-800/80 p-2.5 rounded-lg border border-amber-200/40 dark:border-amber-900/30">
                        <span className="text-zinc-400 block text-[10px]">Temperatura do Forno/Panela</span>
                        <span className="font-bold text-amber-900 dark:text-amber-200">
                          {result.cookingTimeAndTemp.temperature}
                        </span>
                      </div>
                    )}
                    {result.cookingTimeAndTemp.time && (
                      <div className="bg-white/80 dark:bg-zinc-800/80 p-2.5 rounded-lg border border-amber-200/40 dark:border-amber-900/30">
                        <span className="text-zinc-400 block text-[10px]">Tempo Estimado</span>
                        <span className="font-bold text-amber-900 dark:text-amber-200">
                          {result.cookingTimeAndTemp.time}
                        </span>
                      </div>
                    )}
                  </div>

                  {result.cookingTimeAndTemp.internalTemp && (
                    <div className="flex items-center gap-2 text-xs bg-white/90 dark:bg-zinc-800/90 p-2 rounded-lg text-zinc-700 dark:text-zinc-300 border border-amber-200/40">
                      <Thermometer className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span><strong>Ponto seguro interno:</strong> {result.cookingTimeAndTemp.internalTemp}</span>
                    </div>
                  )}

                  {result.cookingTimeAndTemp.technique && (
                    <p className="text-xs text-amber-900/90 dark:text-amber-200/90 italic">
                      💡 {result.cookingTimeAndTemp.technique}
                    </p>
                  )}
                </div>
              )}

              {/* Substitution Advice Card (if applicable) */}
              {result.substitutionAdvice && (
                <div className="bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-900/40 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300 font-semibold text-xs">
                    <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                    <span>Substituição Funcional de Ingredientes</span>
                  </div>

                  <div className="bg-white/80 dark:bg-zinc-800/80 p-2.5 rounded-lg border border-indigo-200/40 dark:border-indigo-900/30 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-zinc-400 text-[10px] block">De (Original)</span>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        {result.substitutionAdvice.originalItem || 'Receita original'}
                      </span>
                    </div>
                    <span className="text-indigo-500 font-bold px-2">➔</span>
                    <div>
                      <span className="text-zinc-400 text-[10px] block">Para (Substituto)</span>
                      <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                        {result.substitutionAdvice.substituteItem || 'Ingrediente proposto'}
                      </span>
                    </div>
                  </div>

                  {result.substitutionAdvice.ratio && (
                    <div className="text-xs text-zinc-700 dark:text-zinc-300">
                      <strong>Proporção recomendada:</strong> {result.substitutionAdvice.ratio}
                    </div>
                  )}

                  {result.substitutionAdvice.culinaryImpact && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-300">
                      <strong>Textura & Sabor:</strong> {result.substitutionAdvice.culinaryImpact}
                    </p>
                  )}

                  {result.substitutionAdvice.precaution && (
                    <div className="bg-rose-50 dark:bg-rose-950/30 p-2 rounded-lg text-xs text-rose-800 dark:text-rose-300 border border-rose-200/50 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                      <span>{result.substitutionAdvice.precaution}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Nutritional Comparison Card */}
            {result.nutritionalComparison && (
              <div className="bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/70 dark:border-teal-900/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300 font-semibold text-xs">
                  <HeartPulse className="w-4 h-4 text-teal-600" />
                  <span>Conselho e Impacto Nutricional</span>
                </div>

                <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                  {result.nutritionalComparison.summary}
                </p>

                {(result.nutritionalComparison.caloriesImpact || result.nutritionalComparison.proteinImpact || result.nutritionalComparison.fatImpact) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {result.nutritionalComparison.caloriesImpact && (
                      <div className="bg-white/80 dark:bg-zinc-800/80 p-2 rounded-lg border border-teal-200/40 text-xs">
                        <span className="text-zinc-400 block text-[10px]">Calorias</span>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                          {result.nutritionalComparison.caloriesImpact}
                        </span>
                      </div>
                    )}
                    {result.nutritionalComparison.proteinImpact && (
                      <div className="bg-white/80 dark:bg-zinc-800/80 p-2 rounded-lg border border-teal-200/40 text-xs">
                        <span className="text-zinc-400 block text-[10px]">Proteínas</span>
                        <span className="font-semibold text-blue-700 dark:text-blue-400">
                          {result.nutritionalComparison.proteinImpact}
                        </span>
                      </div>
                    )}
                    {result.nutritionalComparison.fatImpact && (
                      <div className="bg-white/80 dark:bg-zinc-800/80 p-2 rounded-lg border border-teal-200/40 text-xs">
                        <span className="text-zinc-400 block text-[10px]">Gorduras Saturadas</span>
                        <span className="font-semibold text-amber-700 dark:text-amber-400">
                          {result.nutritionalComparison.fatImpact}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {result.nutritionalComparison.healthBenefits && result.nutritionalComparison.healthBenefits.length > 0 && (
                  <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                    {result.nutritionalComparison.healthBenefits.map((b, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="text-emerald-500 font-bold">✓</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Culinary Tips list */}
            {result.culinaryTips && result.culinaryTips.length > 0 && (
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700/60 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span>Dicas Culinárias do Chef</span>
                </div>
                <div className="space-y-1.5">
                  {result.culinaryTips.map((tip, i) => (
                    <div key={i} className="text-xs text-zinc-600 dark:text-zinc-300 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up question chips */}
            {result.suggestedFollowUps && result.suggestedFollowUps.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <span className="text-xs text-zinc-400 font-medium">Continue perguntando à Chef Malu:</span>
                <div className="flex flex-wrap gap-1.5">
                  {result.suggestedFollowUps.map((fu, idx) => (
                    <button
                      key={idx}
                      id={`followup-chip-${idx}`}
                      type="button"
                      onClick={() => handleAsk(fu)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 transition text-left"
                    >
                      💬 {fu}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
