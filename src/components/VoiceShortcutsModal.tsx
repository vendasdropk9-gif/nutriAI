import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Search, X, Sparkles, Navigation, Play, ArrowRight, Home, User, Target, Dumbbell, Activity, Droplets, MessageCircle, Filter, Eye } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { playSfx, vibrate } from '../lib/sensory';

interface VoiceShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: string;
}

export function VoiceShortcutsModal({ isOpen, onClose, activeTab = 'assistant360' }: VoiceShortcutsModalProps) {
  const { language, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);

  if (!isOpen) return null;

  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'quickdishes': return language?.startsWith('pt') ? 'Pratos Rápidos e Receitas' : 'Quick Dishes & Recipes';
      case 'glucose': return language?.startsWith('pt') ? 'Monitor de Glicose' : 'Glucose Monitor';
      case 'habits': return language?.startsWith('pt') ? 'Hidratação e Hábitos' : 'Hydration & Habits';
      case 'trainer': return language?.startsWith('pt') ? 'Treino Personalizado' : 'Personal Trainer';
      case 'profile': return language?.startsWith('pt') ? 'Perfil de Saúde' : 'Health Profile';
      case 'plan': return language?.startsWith('pt') ? 'Plano Nutricional' : 'Nutrition Plan';
      case 'coach': return language?.startsWith('pt') ? 'NutriCoach (Malu)' : 'NutriCoach (Malu)';
      default: return language?.startsWith('pt') ? 'Painel Assistant 360' : 'Assistant 360 Dashboard';
    }
  };

  const commands = [
    {
      category: language?.startsWith('pt') ? 'Atualização de Macronutrientes por Voz' : 'Voice Macro Updates',
      icon: <Sparkles className="w-5 h-5 text-emerald-400" />,
      items: [
        { id: 'assistant360', phrase: language?.startsWith('pt') ? '"Adicionar 30 gramas de proteína"' : '"Add 30 grams of protein"', desc: language?.startsWith('pt') ? 'Adiciona gramas de proteína, carboidrato ou gordura ao registro diário' : 'Adds protein, carbs or fat grams to daily intake', icon: <Utensils className="w-4 h-4 text-emerald-500" /> },
        { id: 'assistant360', phrase: language?.startsWith('pt') ? '"Adicionar 50 gramas de carbo"' : '"Add 50 grams of carbs"', desc: language?.startsWith('pt') ? 'Atualiza rapidamente os carboidratos consumidos' : 'Quickly updates consumed carbohydrates', icon: <Utensils className="w-4 h-4 text-amber-500" /> },
      ]
    },
    {
      category: language?.startsWith('pt') ? 'Navegação Geral' : 'General Navigation',
      icon: <Navigation className="w-5 h-5 text-emerald-400" />,
      items: [
        { id: 'assistant360', phrase: language?.startsWith('pt') ? '"Ir para Início" / "Painel"' : '"Go home" / "Dashboard"', desc: language?.startsWith('pt') ? 'Retorna ao painel principal Assistant 360' : 'Returns to Assistant 360 main dashboard', icon: <Home className="w-4 h-4 text-emerald-500" /> },
        { id: 'quickdishes', phrase: language?.startsWith('pt') ? '"Abrir Receitas" / "Pratos"' : '"Open recipes" / "Dishes"', desc: language?.startsWith('pt') ? 'Navega para Pratos Rápidos IA' : 'Navigates to Quick Dishes AI', icon: <Sparkles className="w-4 h-4 text-orange-500" /> },
        { id: 'profile', phrase: language?.startsWith('pt') ? '"Meu Perfil" / "Conta"' : '"My Profile" / "Account"', desc: language?.startsWith('pt') ? 'Abre as configurações e perfil de saúde' : 'Opens health profile and settings', icon: <User className="w-4 h-4 text-blue-500" /> },
        { id: 'plan', phrase: language?.startsWith('pt') ? '"Ver Metas" / "Plano"' : '"View goals" / "Plan"', desc: language?.startsWith('pt') ? 'Exibe o plano nutricional e metas diárias' : 'Displays nutrition plan and daily goals', icon: <Target className="w-4 h-4 text-purple-500" /> },
        { id: 'trainer', phrase: language?.startsWith('pt') ? '"Treino" / "Exercício"' : '"Workout" / "Fitness"', desc: language?.startsWith('pt') ? 'Inicia o modo de Treino Personalizado' : 'Starts Personalized Workout mode', icon: <Dumbbell className="w-4 h-4 text-teal-500" /> },
        { id: 'glucose', phrase: language?.startsWith('pt') ? '"Monitor de Glicose" / "Açúcar"' : '"Glucose monitor" / "Sugar"', desc: language?.startsWith('pt') ? 'Abre o registro e histórico glicêmico' : 'Opens glucose tracker and history', icon: <Activity className="w-4 h-4 text-red-400" /> },
        { id: 'habits', phrase: language?.startsWith('pt') ? '"Água" / "Hidratação"' : '"Water" / "Hydration"', desc: language?.startsWith('pt') ? 'Abre o painel de hidratação e hábitos' : 'Opens hydration and habits panel', icon: <Droplets className="w-4 h-4 text-blue-400" /> },
        { id: 'coach', phrase: language?.startsWith('pt') ? '"NutriCoach" / "Malu" / "Chat"' : '"NutriCoach" / "Malu" / "Chat"', desc: language?.startsWith('pt') ? 'Inicia conversa com a assistente Malu' : 'Starts conversation with assistant Malu', icon: <MessageCircle className="w-4 h-4 text-emerald-400" /> },
      ]
    },
    {
      category: language?.startsWith('pt') ? 'Controle de Receitas Hands-Free' : 'Hands-Free Recipe Control',
      icon: <Play className="w-5 h-5 text-amber-400" />,
      items: [
        { id: 'quickdishes', phrase: language?.startsWith('pt') ? '"Próximo" / "Next"' : '"Next step" / "Forward"', desc: language?.startsWith('pt') ? 'Avança para o próximo passo da receita' : 'Advances to the next recipe step', icon: <ArrowRight className="w-4 h-4 text-amber-500" /> },
        { id: 'quickdishes', phrase: language?.startsWith('pt') ? '"Anterior" / "Voltar"' : '"Previous" / "Back"', desc: language?.startsWith('pt') ? 'Retorna ao passo anterior da receita' : 'Returns to the previous recipe step', icon: <ArrowRight className="w-4 h-4 rotate-180 text-amber-500" /> },
        { id: 'quickdishes', phrase: language?.startsWith('pt') ? '"Repetir" / "Repeat"' : '"Repeat step"', desc: language?.startsWith('pt') ? 'Repete em voz alta o passo atual' : 'Repeats the current step aloud', icon: <Sparkles className="w-4 h-4 text-amber-400" /> },
        { id: 'quickdishes', phrase: language?.startsWith('pt') ? '"Parar" / "Stop"' : '"Stop speech"', desc: language?.startsWith('pt') ? 'Interrompe a fala e desativa o reconhecimento' : 'Stops speech and deactivates recognition', icon: <X className="w-4 h-4 text-red-500" /> },
      ]
    }
  ];

  const processedGroups = commands.map(group => {
    const filteredItems = group.items.filter(item => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        item.phrase.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.desc.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      // Tab filter (if not showAll and activeTab is not assistant360)
      if (!showAll && activeTab && activeTab !== 'assistant360') {
        return item.id === activeTab;
      }

      return true;
    });

    return {
      ...group,
      items: filteredItems
    };
  }).filter(group => group.items.length > 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-2xl max-h-[85vh] bg-[#151B23] border border-[#232C39] rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-[#232C39] flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400">
                <Mic className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Malu / Aoede Voice Assistant</span>
                </div>
                <h3 className="text-xl font-display font-bold text-white">
                  {t('voice_shortcuts_title', 'Atalhos de Voz Disponíveis')}
                </h3>
              </div>
            </div>

            <button
              onClick={() => {
                playSfx('tap');
                vibrate(10);
                onClose();
              }}
              className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Context Filter Banner */}
          <div className="px-6 py-3 bg-[#0B0F14] border-b border-[#232C39] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Filter className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {showAll 
                  ? (language?.startsWith('pt') ? 'Mostrando todos os comandos do sistema' : 'Showing all system commands')
                  : (language?.startsWith('pt') ? `Filtrado para a tela atual: ` : `Filtered for current screen: `)}
                {!showAll && <strong className="text-emerald-400">{getTabLabel(activeTab)}</strong>}
              </span>
            </div>
            <button
              onClick={() => {
                playSfx('tap');
                vibrate(5);
                setShowAll(!showAll);
              }}
              className="text-emerald-400 hover:text-emerald-300 font-medium underline transition cursor-pointer flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" />
              {showAll 
                ? (language?.startsWith('pt') ? 'Filtrar pela tela atual' : 'Filter by current screen')
                : (language?.startsWith('pt') ? 'Ver todos os comandos' : 'View all commands')}
            </button>
          </div>

          {/* Search bar */}
          <div className="p-4 sm:p-5 border-b border-[#232C39] bg-[#0B0F14]/50">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={t('search_voice_commands', 'Pesquisar comandos de voz (ex: receita, glicose, próximo)...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-[#0B0F14] border border-[#232C39] rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {/* Commands List */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {processedGroups.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm space-y-2">
                <p>{t('no_commands_found', 'Nenhum comando encontrado para esta tela ou busca.')}</p>
                {!showAll && (
                  <button
                    onClick={() => setShowAll(true)}
                    className="text-xs text-emerald-400 underline hover:text-emerald-300"
                  >
                    {language?.startsWith('pt') ? 'Clique aqui para ver todos os comandos' : 'Click here to view all commands'}
                  </button>
                )}
              </div>
            ) : (
              processedGroups.map((group, idx) => (
                <div key={idx} className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
                    {group.icon}
                    <span>{group.category}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {group.items.map((cmd, cIdx) => (
                      <div 
                        key={cIdx}
                        className="p-4 rounded-2xl bg-[#0B0F14] border border-[#232C39] hover:border-emerald-500/40 transition flex items-start gap-3"
                      >
                        <div className="p-2 rounded-xl bg-white/5 mt-0.5 shrink-0">
                          {cmd.icon}
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="font-display font-bold text-sm text-white font-mono bg-emerald-500/10 px-2 py-0.5 rounded inline-block text-emerald-300">
                            {cmd.phrase}
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            {cmd.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-[#232C39] bg-[#0B0F14] text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('voice_tip_footer', 'Clique em "Ativar Voz" no painel principal e pronuncie qualquer comando acima.')}</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
