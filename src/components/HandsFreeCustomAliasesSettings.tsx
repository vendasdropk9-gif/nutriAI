import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Sparkles, RotateCcw, Check, MessageSquare, Mic, HelpCircle, X, ShieldCheck } from 'lucide-react';
import {
  CORE_COMMANDS_META,
  BaseCommandKey,
  getCustomVoiceAliases,
  addCustomVoiceAlias,
  removeCustomVoiceAlias,
  resetCustomVoiceAliases
} from '../lib/customVoiceAliases';
import { playSfx, vibrate } from '../lib/sensory';

interface HandsFreeCustomAliasesSettingsProps {
  onClose?: () => void;
  className?: string;
}

export const HandsFreeCustomAliasesSettings: React.FC<HandsFreeCustomAliasesSettingsProps> = ({
  onClose,
  className = ''
}) => {
  const [aliases, setAliases] = useState<Record<BaseCommandKey, string[]>>(() => getCustomVoiceAliases());
  const [inputs, setInputs] = useState<Record<BaseCommandKey, string>>({
    pause: '',
    resume: '',
    next: '',
    prev: '',
    repeat: '',
    ingredients: '',
    exit: ''
  });
  const [addedFeedback, setAddedFeedback] = useState<string | null>(null);

  useEffect(() => {
    const handleVoiceAliasesChanged = (e: any) => {
      if (e.detail && e.detail.aliases) {
        setAliases(e.detail.aliases);
      }
    };
    window.addEventListener('nutri:voice-aliases-changed', handleVoiceAliasesChanged);
    return () => window.removeEventListener('nutri:voice-aliases-changed', handleVoiceAliasesChanged);
  }, []);

  const handleAddAlias = (cmdKey: BaseCommandKey) => {
    const val = (inputs[cmdKey] || '').trim();
    if (!val) return;

    const updated = addCustomVoiceAlias(cmdKey, val);
    setAliases(updated);
    setInputs((prev) => ({ ...prev, [cmdKey]: '' }));

    playSfx('crystal');
    vibrate([20, 30]);

    setAddedFeedback(`Sinônimo "${val}" adicionado para ${cmdKey.toUpperCase()}!`);
    setTimeout(() => setAddedFeedback(null), 2500);
  };

  const handleRemoveAlias = (cmdKey: BaseCommandKey, aliasStr: string) => {
    const updated = removeCustomVoiceAlias(cmdKey, aliasStr);
    setAliases(updated);
    playSfx('pop');
    vibrate(15);
  };

  const handleResetAll = () => {
    const reset = resetCustomVoiceAliases();
    setAliases(reset);
    playSfx('tap');
    vibrate(20);
    setAddedFeedback('Sinônimos personalizados restaurados ao padrão!');
    setTimeout(() => setAddedFeedback(null), 2500);
  };

  return (
    <div
      className={`rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border-2 border-emerald-500/40 p-5 sm:p-7 shadow-2xl relative overflow-hidden backdrop-blur-xl text-white ${className}`}
      id="custom-voice-aliases-settings-card"
    >
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/30">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white">
                Sinônimos e Expressões Personalizadas
              </h3>
              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/70 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                Voz IA Personalizada
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              Crie frases e gírias do seu dia a dia (ex: trocar <em>"próximo"</em> por <em>"vai para a frente"</em>).
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer active:scale-95"
            title="Concluir e fechar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Feedback Toast Banner */}
      {addedFeedback && (
        <div className="my-3 p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{addedFeedback}</span>
        </div>
      )}

      {/* Commands Aliases List */}
      <div className="space-y-4 pt-4 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar relative z-10">
        {CORE_COMMANDS_META.map((cmd) => {
          const userCustomList = aliases[cmd.key] || [];
          const currentInputVal = inputs[cmd.key] || '';

          return (
            <div
              key={cmd.key}
              className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3 hover:border-emerald-500/30 transition-colors"
            >
              {/* Command Title & Core Meta */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-xl border ${cmd.badgeColor}`}>
                    {cmd.label}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({userCustomList.length} sinônimos personalizados)
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 italic font-medium">
                  {cmd.description}
                </p>
              </div>

              {/* Default Triggers Badges */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold mr-1">
                  Expressões Padrão:
                </span>
                {cmd.defaultKeywords.slice(0, 5).map((kw, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-white/5"
                  >
                    "{kw}"
                  </span>
                ))}
                {cmd.defaultKeywords.length > 5 && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    +{cmd.defaultKeywords.length - 5}
                  </span>
                )}
              </div>

              {/* User Custom Synonyms Badges */}
              {userCustomList.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 bg-emerald-950/30 p-2 rounded-xl border border-emerald-500/20">
                  <span className="text-[10px] font-mono text-emerald-400 font-bold mr-1 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    Seus Sinônimos:
                  </span>
                  {userCustomList.map((customAlias, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] font-bold bg-emerald-500/20 text-emerald-200 px-2.5 py-1 rounded-lg border border-emerald-500/40 flex items-center gap-1.5 shadow-sm"
                    >
                      <span>"{customAlias}"</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAlias(cmd.key, customAlias)}
                        className="text-emerald-400 hover:text-rose-400 p-0.5 transition-colors cursor-pointer"
                        title={`Remover sinônimo "${customAlias}"`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Add New Synonym Input Row */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={currentInputVal}
                  onChange={(e) =>
                    setInputs((prev) => ({ ...prev, [cmd.key]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddAlias(cmd.key);
                    }
                  }}
                  placeholder={`Digite nova frase para ${cmd.label} (ex: vai para a frente)...`}
                  className="flex-1 bg-black/60 border border-white/10 focus:border-emerald-400 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => handleAddAlias(cmd.key)}
                  disabled={!currentInputVal.trim()}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 font-black text-xs transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-md shadow-emerald-500/20 active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Adicionar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Actions */}
      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between gap-3 relative z-10 text-xs">
        <button
          type="button"
          onClick={handleResetAll}
          className="flex items-center gap-1.5 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restaurar Sinônimos Padrão</span>
        </button>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all cursor-pointer active:scale-95"
          >
            Concluir
          </button>
        )}
      </div>
    </div>
  );
};

export default HandsFreeCustomAliasesSettings;
