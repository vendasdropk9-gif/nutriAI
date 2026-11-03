import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Sparkles, CheckCircle2, Pause, Play, ChevronRight, ChevronLeft, RotateCcw, Utensils, Hand, X, Mic, Volume2, ShieldCheck, Flame, Search } from 'lucide-react';

interface VoiceCommandItem {
  id: string;
  category: 'pause' | 'navigation' | 'ingredients' | 'system';
  primary: string;
  variations: string[];
  action: string;
  kitchenTip: string;
  samplePhrase: string;
  badgeColor: string;
}

interface HandsFreeVoiceCommandsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulateCommand?: (cmd: string) => void;
  onOpenCustomAliases?: () => void;
  className?: string;
}

export const HandsFreeVoiceCommandsPanel: React.FC<HandsFreeVoiceCommandsPanelProps> = ({
  isOpen,
  onClose,
  onSimulateCommand,
  onOpenCustomAliases,
  className = ''
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  const commandsList: VoiceCommandItem[] = [
    {
      id: 'cmd-pause',
      category: 'pause',
      primary: 'PAUSA',
      variations: ['pausa', 'pausar', 'pare', 'parar', 'espera', 'aguarde', 'silêncio', 'calma', 'stop', 'pause'],
      action: 'Interrompe a leitura em voz alta instantaneamente (resposta em <150ms).',
      kitchenTip: 'Ideal para quando o óleo espirrar, a água ferver ou você precisar de mais tempo.',
      samplePhrase: '"Malu, PAUSA!" ou apenas "PAUSA"',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
    },
    {
      id: 'cmd-resume',
      category: 'pause',
      primary: 'CONTINUAR',
      variations: ['continuar', 'retomar', 'ler', 'prosseguir', 'play', 'resume'],
      action: 'Retoma a narração do passo atual de onde parou.',
      kitchenTip: 'Use logo após terminar de picar ou refogar um ingrediente.',
      samplePhrase: '"Continuar" ou "Retomar"',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    },
    {
      id: 'cmd-next',
      category: 'navigation',
      primary: 'PRÓXIMO',
      variations: ['próximo', 'proximo', 'avançar', 'avancar', 'seguinte', 'next', 'próximo passo'],
      action: 'Avança para o próximo passo do preparo e inicia a leitura em voz alta.',
      kitchenTip: 'Fale assim que terminar o passo atual com as mãos sujas de massa ou tempero.',
      samplePhrase: '"Próximo" ou "Avançar"',
      badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40'
    },
    {
      id: 'cmd-prev',
      category: 'navigation',
      primary: 'VOLTAR',
      variations: ['voltar', 'anterior', 'passo anterior', 'atrás', 'back', 'previous'],
      action: 'Retorna para o passo de preparo anterior e o relê em voz alta.',
      kitchenTip: 'Ótimo para conferir instruções de fogo, tempo ou ordem de adição.',
      samplePhrase: '"Voltar" ou "Passo anterior"',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
    },
    {
      id: 'cmd-repeat',
      category: 'navigation',
      primary: 'REPETIR',
      variations: ['repetir', 'de novo', 'repitir', 'ler de novo', 'ouvir de novo', 'repeat'],
      action: 'Relê o passo de preparo atual em voz alta do início.',
      kitchenTip: 'Perfeito para quando o barulho da cozinha impediu de ouvir tudo na primeira vez.',
      samplePhrase: '"Repetir" ou "De novo"',
      badgeColor: 'bg-amber-400/20 text-amber-200 border-amber-400/40'
    },
    {
      id: 'cmd-ingredients',
      category: 'ingredients',
      primary: 'REPETIR INGREDIENTE',
      variations: ['repetir ingrediente', 'ingredientes', 'quais ingredientes', 'ler ingredientes', 'listar ingredientes'],
      action: 'Malu lê em voz alta a lista completa de ingredientes e quantidades da receita.',
      kitchenTip: 'Útil para confirmar proporções de temperos ou conferir o que ainda falta adicionar à panela.',
      samplePhrase: '"Repetir ingredientes" ou "Quais ingredientes?"',
      badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40'
    },
    {
      id: 'cmd-gesture',
      category: 'pause',
      primary: 'ACENO DE MÃO ✋ (GESTO)',
      variations: ['Gesto óptico via câmera frontal', 'Sem precisar falar'],
      action: 'Pausa a leitura instantaneamente ao detectar um aceno com a palma da mão na frente da câmera.',
      kitchenTip: 'Use se a boca estiver ocupada experimentando a comida ou se o exaustor estiver muito alto.',
      samplePhrase: 'Acene a mão a 30-50cm da tela',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
    },
    {
      id: 'cmd-exit',
      category: 'system',
      primary: 'SAIR',
      variations: ['fechar', 'sair', 'encerrar', 'exit', 'close'],
      action: 'Encerra o Modo Hands-Free e para a leitura e captura de microfone.',
      kitchenTip: 'Diga quando finalizar o prato para voltar à visualização padrão.',
      samplePhrase: '"Sair do hands-free" ou "Fechar"',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
    }
  ];

  const categories = [
    { id: 'all', label: 'Todos os Comandos', count: commandsList.length },
    { id: 'pause', label: 'Pausa & Retomada', count: commandsList.filter((c) => c.category === 'pause').length },
    { id: 'navigation', label: 'Navegação de Passos', count: commandsList.filter((c) => c.category === 'navigation').length },
    { id: 'ingredients', label: 'Ingredientes', count: commandsList.filter((c) => c.category === 'ingredients').length },
    { id: 'system', label: 'Sistema & Saída', count: commandsList.filter((c) => c.category === 'system').length }
  ];

  const filteredCommands = commandsList.filter((cmd) => {
    const matchesCategory = selectedCategory === 'all' || cmd.category === selectedCategory;
    const matchesSearch =
      searchFilter.trim() === '' ||
      cmd.primary.toLowerCase().includes(searchFilter.toLowerCase()) ||
      cmd.variations.some((v) => v.toLowerCase().includes(searchFilter.toLowerCase())) ||
      cmd.action.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (!isOpen) return null;

  return (
    <div
      role="region"
      aria-label="Painel de Comandos de Voz Hands-Free"
      className={`rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border-2 border-amber-500/40 shadow-2xl p-5 sm:p-7 relative overflow-hidden backdrop-blur-xl ${className}`}
    >
      {/* Ambient Glow */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/25">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                Guia de Voz na Cozinha
              </span>
              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                {commandsList.length} Comandos Ativos
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white mt-1">
              Comandos de Voz Reconhecidos no Modo Hands-Free
            </h3>
            <p className="text-xs text-slate-300 font-medium">
              Aprenda as frases exatas para falar enquanto cozinha com as mãos ocupadas sem precisar tocar na tela.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer active:scale-95"
          title="Fechar guia de comandos"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search & Category Tabs */}
      <div className="py-4 space-y-3 relative z-10">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                  selectedCategory === cat.id
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20 border border-amber-300'
                    : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-white/5'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    selectedCategory === cat.id ? 'bg-slate-950/20 text-slate-950' : 'bg-black/40 text-slate-400'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Buscar comando (ex: pausa, ingrediente)..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>
      </div>

      {/* Command Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar relative z-10">
        {filteredCommands.map((cmd) => (
          <div
            key={cmd.id}
            className="rounded-2xl bg-black/40 border border-white/10 p-4 hover:border-amber-500/40 transition-all duration-200 flex flex-col justify-between gap-3 shadow-md group"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-xl border ${cmd.badgeColor} flex items-center gap-1.5 shadow-sm`}>
                  <Mic className="w-3.5 h-3.5" />
                  "{cmd.primary}"
                </span>

                {onSimulateCommand && (
                  <button
                    type="button"
                    onClick={() => onSimulateCommand(cmd.primary.toLowerCase())}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-[11px] font-bold transition-all cursor-pointer active:scale-95 border border-white/10 flex items-center gap-1 shadow-sm"
                    title={`Simular comando: "${cmd.primary}"`}
                  >
                    <span>Testar</span>
                    <Play className="w-2.5 h-2.5 fill-current" />
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-200 font-medium leading-relaxed">
                {cmd.action}
              </p>

              {/* Variations list */}
              <div className="pt-1">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-1">
                  Frases e variações reconhecidas:
                </span>
                <div className="flex flex-wrap gap-1">
                  {cmd.variations.map((v, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-white/5"
                    >
                      "{v}"
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Kitchen Tip & Example */}
            <div className="pt-2 border-t border-white/5 space-y-1 bg-white/[0.02] -mx-4 -mb-4 p-3 rounded-b-2xl">
              <div className="flex items-start gap-1.5 text-[11px] text-amber-200/90 font-medium">
                <span className="text-amber-400 font-bold shrink-0">Exemplo:</span>
                <span className="italic">{cmd.samplePhrase}</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-snug">
                🍳 {cmd.kitchenTip}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer with Kitchen Effectiveness Tips */}
      <div className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-300 relative z-10">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-[11px] text-slate-300">
            <strong>Dica de Eficácia:</strong> Fale com voz firme em direção ao dispositivo. Palavras isoladas como <strong className="text-amber-300">"PAUSA"</strong> ou <strong className="text-emerald-300">"PRÓXIMO"</strong> têm taxa de acerto de 99% mesmo com exaustor ligado.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenCustomAliases && (
            <button
              type="button"
              onClick={onOpenCustomAliases}
              className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Personalizar Sinônimos</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-all cursor-pointer active:scale-95 shrink-0 shadow-md shadow-amber-500/20"
          >
            Entendido, voltar à receita
          </button>
        </div>
      </div>
    </div>
  );
};

export default HandsFreeVoiceCommandsPanel;
