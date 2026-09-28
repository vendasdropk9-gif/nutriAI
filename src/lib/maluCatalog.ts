export type FeatureCategory = 'intelligence' | 'food' | 'fitness' | 'health' | 'account';
export type FeatureStatus = 'active' | 'beta' | 'coming_soon' | 'disabled';
export type UserPlan = 'free' | 'premium' | 'pro';

export interface MaluFeature {
  featureId: string;
  name: Record<string, string>;
  description: Record<string, string>;
  category: FeatureCategory;
  route: string;
  status: FeatureStatus;
  icon: string;
  actions: string[];
  triggers: string[];
  requiredData?: string[];
  optionalData?: string[];
  permissions?: string[];
  plans: UserPlan[];
  relatedFeatures: string[];
  examples: string[];
  limitations?: string[];
  supportedLanguages: string[];
}

export const MALU_APP_CATALOG: MaluFeature[] = [
  {
    featureId: 'plate-analyzer',
    name: { 'pt-BR': 'Análise de Prato', 'en-US': 'Plate Analyzer', 'es-ES': 'Analizador de Platos' },
    description: { 'pt-BR': 'Analisa uma refeição através de imagem por IA.', 'en-US': 'Analyzes a meal via AI image recognition.' },
    category: 'intelligence',
    route: 'analyzer',
    status: 'active',
    icon: 'camera',
    actions: ['open', 'analyze'],
    triggers: ['analise meu prato', 'veja meu almoço', 'o que tem nesse prato', 'calcule essa refeição', 'analisar prato'],
    requiredData: ['image'],
    plans: ['free', 'premium', 'pro'],
    relatedFeatures: ['recipes', 'generator'],
    examples: ['Analisa meu almoço.', 'O que tem neste prato?'],
    supportedLanguages: ['pt-BR', 'en-US', 'es-ES']
  },
  {
    featureId: 'generator',
    name: { 'pt-BR': 'Gerador de Receitas IA', 'en-US': 'AI Recipe Generator' },
    description: { 'pt-BR': 'Cria receitas personalizadas com base nos seus ingredientes e objetivos.', 'en-US': 'Creates custom recipes based on ingredients and goals.' },
    category: 'food',
    route: 'generator',
    status: 'active',
    icon: 'utensils',
    actions: ['open', 'generate'],
    triggers: ['gerar receita', 'criar receita', 'quero uma receita', 'fazer receita', 'cozinhar'],
    optionalData: ['ingredients', 'preferences'],
    plans: ['free', 'premium', 'pro'],
    relatedFeatures: ['plate-analyzer', 'shopping'],
    examples: ['Me dê uma receita com frango e arroz.', 'Quero criar uma sobremesa fit.'],
    supportedLanguages: ['pt-BR', 'en-US', 'es-ES']
  },
  {
    featureId: 'quickdishes',
    name: { 'pt-BR': 'Receitas Rápidas (15min)', 'en-US': 'Quick Dishes' },
    description: { 'pt-BR': 'Opções expressas para emagrecimento e ganho de massa em até 15 minutos.', 'en-US': 'Express meals for weight loss and muscle gain.' },
    category: 'food',
    route: 'quickdishes',
    status: 'active',
    icon: 'zap',
    actions: ['open', 'filter'],
    triggers: ['receitas rápidas', 'prato rápido', 'emagrecimento', 'massa', '15 minutos'],
    plans: ['free', 'premium', 'pro'],
    relatedFeatures: ['generator'],
    examples: ['Mostre receitas rápidas.', 'Quero um prato para emagrecer.'],
    supportedLanguages: ['pt-BR', 'en-US', 'es-ES']
  },
  {
    featureId: 'fridge',
    name: { 'pt-BR': 'Geladeira Inteligente', 'en-US': 'Smart Fridge' },
    description: { 'pt-BR': 'Gerencie o que tem na sua dispensa e geladeira para evitar desperdícios.', 'en-US': 'Manage pantry and fridge items to avoid food waste.' },
    category: 'food',
    route: 'fridge',
    status: 'active',
    icon: 'snowflake',
    actions: ['open', 'scan', 'suggest'],
    triggers: ['geladeira', 'o que tem na geladeira', 'sobras', 'dispensa', 'ingredientes'],
    plans: ['free', 'premium', 'pro'],
    relatedFeatures: ['generator', 'shopping'],
    examples: ['O que consigo fazer com o que tenho na geladeira?'],
    supportedLanguages: ['pt-BR', 'en-US', 'es-ES']
  },
  {
    featureId: 'shopping',
    name: { 'pt-BR': 'Lista de Compras Inteligente', 'en-US': 'Smart Shopping List' },
    description: { 'pt-BR': 'Organiza seus itens por corredores e estima gastos.', 'en-US': 'Organizes items by aisle and estimates costs.' },
    category: 'food',
    route: 'shopping',
    status: 'active',
    icon: 'shopping-basket',
    actions: ['open', 'create', 'export'],
    triggers: ['lista de compras', 'compras', 'supermercado', 'comprar'],
    plans: ['free', 'premium', 'pro'],
    relatedFeatures: ['generator', 'fridge'],
    examples: ['Crie uma lista de compras para a semana.'],
    supportedLanguages: ['pt-BR', 'en-US', 'es-ES']
  },
  {
    featureId: 'habits',
    name: { 'pt-BR': 'Rastreador de Hábitos & Hidratação', 'en-US': 'Habit & Hydration Tracker' },
    description: { 'pt-BR': 'Monitore água, sono e jejum com alertas inteligentes.', 'en-US': 'Monitor water, sleep, and fasting with smart reminders.' },
    category: 'health',
    route: 'habits',
    status: 'active',
    icon: 'droplet',
    actions: ['open', 'log', 'remind'],
    triggers: ['água', 'hidratação', 'hábitos', 'sono', 'jejum', 'beber água'],
    plans: ['free', 'premium', 'pro'],
    relatedFeatures: ['profile'],
    examples: ['Quero registrar água.', 'Como está meu sono?'],
    supportedLanguages: ['pt-BR', 'en-US', 'es-ES']
  },
  {
    featureId: 'trainer',
    name: { 'pt-BR': 'Personal Trainer & Treinos', 'en-US': 'Personal Trainer' },
    description: { 'pt-BR': 'Planos de treino adaptados e guias visuais em 3D.', 'en-US': 'Adapted workout plans and 3D visual guides.' },
    category: 'fitness',
    route: 'trainer',
    status: 'active',
    icon: 'dumbbell',
    actions: ['open', 'start', 'customize'],
    triggers: ['treino', 'exercício', 'academia', 'musculação', 'personal'],
    plans: ['free', 'premium', 'pro'],
    relatedFeatures: ['evolution'],
    examples: ['Quero treinar agora.', 'Mostre exercícios para pernas.'],
    supportedLanguages: ['pt-BR', 'en-US', 'es-ES']
  },
  {
    featureId: 'evolution',
    name: { 'pt-BR': 'Evolução Corporal', 'en-US': 'Body Evolution' },
    description: { 'pt-BR': 'Acompanhe peso, fotos de progresso e medidas corporais.', 'en-US': 'Track weight, progress photos, and body measurements.' },
    category: 'fitness',
    route: 'evolution',
    status: 'active',
    icon: 'trending-up',
    actions: ['open', 'log_weight', 'compare'],
    triggers: ['evolução', 'progresso', 'peso', 'medidas', 'minhas fotos'],
    plans: ['free', 'premium', 'pro'],
    relatedFeatures: ['trainer', 'profile'],
    examples: ['Mostre minha evolução.', 'Quero ver meu progresso.'],
    supportedLanguages: ['pt-BR', 'en-US', 'es-ES']
  },
  {
    featureId: 'pricing',
    name: { 'pt-BR': 'Planos Premium & PRO', 'en-US': 'Pricing & PRO' },
    description: { 'pt-BR': 'Desbloqueie recursos avançados de IA e nutrição.', 'en-US': 'Unlock advanced AI and nutrition features.' },
    category: 'account',
    route: 'pricing',
    status: 'active',
    icon: 'crown',
    actions: ['open', 'upgrade'],
    triggers: ['premium', 'pro', 'assinatura', 'pagamento', 'planos'],
    plans: ['free', 'premium', 'pro'],
    relatedFeatures: ['profile'],
    examples: ['Quero virar PRO.', 'Quais são os planos?'],
    supportedLanguages: ['pt-BR', 'en-US', 'es-ES']
  },
  {
    featureId: 'profile',
    name: { 'pt-BR': 'Perfil e Configurações', 'en-US': 'Profile & Settings' },
    description: { 'pt-BR': 'Gerencie seus dados pessoais, objetivos, idioma e segurança.', 'en-US': 'Manage personal data, goals, language, and security.' },
    category: 'account',
    route: 'profile',
    status: 'active',
    icon: 'user',
    actions: ['open', 'edit', 'settings'],
    triggers: ['perfil', 'configurações', 'ajustes', 'idioma', 'conta', 'suporte'],
    plans: ['free', 'premium', 'pro'],
    relatedFeatures: ['pricing'],
    examples: ['Abra minhas configurações.', 'Mude meu objetivo.'],
    supportedLanguages: ['pt-BR', 'en-US', 'es-ES']
  }
];

export const getFeatureById = (featureId: string): MaluFeature | undefined => {
  return MALU_APP_CATALOG.find(f => f.featureId === featureId);
};

export const findFeatureByTrigger = (query: string): MaluFeature | undefined => {
  const lower = query.toLowerCase().trim();
  return MALU_APP_CATALOG.find(f => f.triggers.some(t => lower.includes(t)));
};
