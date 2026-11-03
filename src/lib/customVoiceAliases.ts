export type BaseCommandKey = 'pause' | 'resume' | 'next' | 'prev' | 'repeat' | 'ingredients' | 'exit';

export interface CommandMetadata {
  key: BaseCommandKey;
  label: string;
  defaultKeywords: string[];
  description: string;
  badgeColor: string;
}

export const CORE_COMMANDS_META: CommandMetadata[] = [
  {
    key: 'pause',
    label: 'PAUSA / PARAR',
    defaultKeywords: ['pausa', 'pausar', 'pare', 'parar', 'espera', 'aguarde', 'silêncio', 'silencio', 'calma', 'stop', 'pause', 'quiet'],
    description: 'Interrompe a leitura em voz alta imediatamente (<150ms).',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  },
  {
    key: 'resume',
    label: 'CONTINUAR / RETOMAR',
    defaultKeywords: ['continuar', 'retomar', 'ler', 'prosseguir', 'play', 'resume'],
    description: 'Retoma a leitura do passo a passo do ponto onde parou.',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  },
  {
    key: 'next',
    label: 'PRÓXIMO PASSO',
    defaultKeywords: ['próximo', 'proximo', 'avançar', 'avancar', 'seguinte', 'next', 'forward', 'vai para a frente'],
    description: 'Avança para o próximo passo da receita.',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40'
  },
  {
    key: 'prev',
    label: 'PASSO ANTERIOR',
    defaultKeywords: ['voltar', 'anterior', 'passo anterior', 'atrás', 'atras', 'back', 'previous'],
    description: 'Retorna ao passo de preparo anterior.',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
  },
  {
    key: 'repeat',
    label: 'REPETIR PASSO',
    defaultKeywords: ['repetir', 'de novo', 'novamente', 'repeat', 'ouvir de novo', 'repitir'],
    description: 'Relê o passo de preparo atual.',
    badgeColor: 'bg-amber-400/20 text-amber-200 border-amber-400/40'
  },
  {
    key: 'ingredients',
    label: 'REPETIR INGREDIENTES',
    defaultKeywords: ['ingrediente', 'ingredientes', 'repetir ingrediente', 'quais ingredientes', 'ler ingredientes', 'listar ingredientes'],
    description: 'Malu lê em voz alta a lista completa de ingredientes.',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40'
  },
  {
    key: 'exit',
    label: 'ENCERRAR / SAIR',
    defaultKeywords: ['fechar', 'sair', 'encerrar', 'exit', 'close'],
    description: 'Finaliza o Modo Hands-Free e desativa o microfone.',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
  }
];

const STORAGE_KEY = 'nutri_handsfree_custom_voice_aliases_v1';

export const getCustomVoiceAliases = (): Record<BaseCommandKey, string[]> => {
  const initial: Record<BaseCommandKey, string[]> = {
    pause: [],
    resume: [],
    next: ['vai para a frente'],
    prev: [],
    repeat: [],
    ingredients: [],
    exit: []
  };

  if (typeof window === 'undefined') return initial;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return initial;
    const parsed = JSON.parse(stored);
    return {
      pause: Array.isArray(parsed.pause) ? parsed.pause : [],
      resume: Array.isArray(parsed.resume) ? parsed.resume : [],
      next: Array.isArray(parsed.next) ? parsed.next : ['vai para a frente'],
      prev: Array.isArray(parsed.prev) ? parsed.prev : [],
      repeat: Array.isArray(parsed.repeat) ? parsed.repeat : [],
      ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
      exit: Array.isArray(parsed.exit) ? parsed.exit : []
    };
  } catch (e) {
    return initial;
  }
};

export const saveCustomVoiceAliases = (aliases: Record<BaseCommandKey, string[]>) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(aliases));
    window.dispatchEvent(new CustomEvent('nutri:voice-aliases-changed', { detail: { aliases } }));
  } catch (e) {}
};

export const addCustomVoiceAlias = (commandKey: BaseCommandKey, aliasStr: string): Record<BaseCommandKey, string[]> => {
  const clean = aliasStr.toLowerCase().trim();
  if (!clean) return getCustomVoiceAliases();

  const current = getCustomVoiceAliases();
  const existingList = current[commandKey] || [];

  if (!existingList.includes(clean)) {
    const updated = {
      ...current,
      [commandKey]: [...existingList, clean]
    };
    saveCustomVoiceAliases(updated);
    return updated;
  }

  return current;
};

export const removeCustomVoiceAlias = (commandKey: BaseCommandKey, aliasToRemove: string): Record<BaseCommandKey, string[]> => {
  const clean = aliasToRemove.toLowerCase().trim();
  const current = getCustomVoiceAliases();
  const updated = {
    ...current,
    [commandKey]: (current[commandKey] || []).filter((a) => a.toLowerCase().trim() !== clean)
  };
  saveCustomVoiceAliases(updated);
  return updated;
};

export const resetCustomVoiceAliases = (commandKey?: BaseCommandKey): Record<BaseCommandKey, string[]> => {
  const current = getCustomVoiceAliases();
  if (commandKey) {
    const updated = {
      ...current,
      [commandKey]: commandKey === 'next' ? ['vai para a frente'] : []
    };
    saveCustomVoiceAliases(updated);
    return updated;
  }

  const resetAll: Record<BaseCommandKey, string[]> = {
    pause: [],
    resume: [],
    next: ['vai para a frente'],
    prev: [],
    repeat: [],
    ingredients: [],
    exit: []
  };
  saveCustomVoiceAliases(resetAll);
  return resetAll;
};

/**
 * Normaliza e busca correspondência de texto para mapear comandos
 */
export const matchVoiceCommandKey = (
  rawTranscript: string,
  customAliasesMap?: Record<BaseCommandKey, string[]>
): { matchedKey: BaseCommandKey | null; matchedPhrase: string | null } => {
  const trimmed = rawTranscript.toLowerCase().trim();
  if (!trimmed) return { matchedKey: null, matchedPhrase: null };

  const userAliases = customAliasesMap || getCustomVoiceAliases();

  for (const cmdMeta of CORE_COMMANDS_META) {
    const key = cmdMeta.key;
    const userCustomList = userAliases[key] || [];
    const allTriggers = [...userCustomList, ...cmdMeta.defaultKeywords];

    for (const trigger of allTriggers) {
      if (trimmed.includes(trigger.toLowerCase().trim())) {
        return { matchedKey: key, matchedPhrase: trigger };
      }
    }
  }

  return { matchedKey: null, matchedPhrase: null };
};
