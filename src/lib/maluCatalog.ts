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
    name: {
      'pt-BR': 'Análise de Prato',
      'en-US': 'Plate Analyzer',
      'en-GB': 'Plate Analyser',
      'en-AU': 'Plate Analyser',
    },
    description: {
      'pt-BR': 'Analisa uma refeição através de imagem por IA.',
      'en-US': 'Analyzes a meal via AI image recognition.',
      'en-GB': 'Analyses a meal via AI image recognition.',
      'en-AU': 'Analyses a meal via AI image recognition.',
    },
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
    supportedLanguages: ['pt-BR', 'en-US', 'en-GB', 'en-AU']
  },
  {
    featureId: 'generator',
    name: {
      'pt-BR': 'Gerador de Receitas IA',
      'en-US': 'AI Recipe Generator',
      'en-GB': 'AI Recipe Creator',
      'en-AU': 'Smart Recipe Creator',
    },
    description: {
      'pt-BR': 'Cria receitas personalizadas com base nos seus ingredientes e objetivos.',
      'en-US': 'Creates custom recipes based on ingredients and goals.',
      'en-GB': 'Creates personalised recipes based on ingredients and fitness goals.',
      'en-AU': 'Creates customised recipes tailored to your ingredients and goals.',
    },
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
    supportedLanguages: ['pt-BR', 'en-US', 'en-GB', 'en-AU']
  },
  {
    featureId: 'quickdishes',
    name: {
      'pt-BR': 'Receitas Rápidas (15min)',
      'en-US': 'Quick Dishes',
      'en-GB': 'Quick Meals',
      'en-AU': 'Quick Brekkie & Meals',
    },
    description: {
      'pt-BR': 'Opções expressas para emagrecimento e ganho de massa em até 15 minutos.',
      'en-US': 'Express meals for weight loss and muscle gain.',
      'en-GB': 'Express meals for healthy weight loss and lean muscle.',
      'en-AU': 'Express nutritious meals ready in 15 minutes.',
    },
    category: 'food',
    route: 'quickdishes',
    status: 'active',
    icon: 'zap',
    actions: ['open', 'filter'],
    triggers: ['receitas rápidas', 'prato rápido', 'emagrecimento', 'massa', '15 minutos'],
    plans: ['free', 'premium', 'pro'],
    relatedFeatures: ['generator'],
    examples: ['Mostre receitas rápidas.', 'Quero um prato para emagrecer.'],
    supportedLanguages: ['pt-BR', 'en-US', 'en-GB', 'en-AU']
  },
  {
    featureId: 'fridge',
    name: {
      'pt-BR': 'Geladeira Inteligente',
      'en-US': 'Smart Fridge',
      'en-GB': 'Fridge & Larder',
      'en-AU': 'Fridge & Crisper',
    },
    description: {
      'pt-BR': 'Gerencie o que tem na sua dispensa e geladeira para evitar desperdícios.',
      'en-US': 'Manage pantry and fridge items to avoid food waste.',
      'en-GB': 'Manage larder and fridge ingredients to eliminate food waste.',
      'en-AU': 'Manage crisper and pantry items to minimise waste.',
    },
    category: 'food',
    route: 'fridge',
    status: 'active',
    icon: 'snowflake',
    actions: ['open', 'scan', 'suggest'],
    triggers: ['geladeira', 'o que tem na geladeira', 'sobras', 'dispensa', 'ingredientes'],
    plans: ['free', 'premium', 'pro'],
    relatedFeatures: ['generator', 'shopping'],
    examples: ['O que consigo fazer com o que tenho na geladeira?'],
    supportedLanguages: ['pt-BR', 'en-US', 'en-GB', 'en-AU']
  },
  {
    featureId: 'shopping',
    name: {
      'pt-BR': 'Lista de Compras Inteligente',
      'en-US': 'Smart Shopping List',
      'en-GB': 'Smart Grocery List',
      'en-AU': 'Smart Grocery List',
    },
    description: {
      'pt-BR': 'Organiza seus itens por corredores e estima gastos.',
      'en-US': 'Organizes items by aisle and estimates costs.',
      'en-GB': 'Organises items by aisle and estimates grocery expenditure.',
      'en-AU': 'Organises items by category and estimates shopping expenses.',
    },
    category: 'food',
    route: 'shopping',
    status: 'active',
    icon: 'shopping-basket',
    actions: ['open', 'create', 'export'],
    triggers: ['lista de compras', 'compras', 'supermercado', 'comprar'],
    plans: ['free', 'premium', 'pro'],
    relatedFeatures: ['generator', 'fridge'],
    examples: ['Crie uma lista de compras para a semana.'],
    supportedLanguages: ['pt-BR', 'en-US', 'en-GB', 'en-AU']
  },
  {
    featureId: 'habits',
    name: {
      'pt-BR': 'Rastreador de Hábitos & Hidratação',
      'en-US': 'Habit & Hydration Tracker',
      'en-GB': 'Habits & Hydration Tracker',
      'en-AU': 'Daily Habits & Hydration',
    },
    description: {
      'pt-BR': 'Monitore água, sono e jejum com alertas inteligentes.',
      'en-US': 'Monitor water, sleep, and fasting with smart reminders.',
      'en-GB': 'Monitor water intake, sleep patterns, and fasting.',
      'en-AU': 'Track hydration, sleep, and fasting with smart prompts.',
    },
    category: 'health',
    route: 'habits',
    status: 'active',
    icon: 'droplet',
    actions: ['open', 'log', 'remind'],
    triggers: ['água', 'hidratação', 'hábitos', 'sono', 'jejum', 'beber água'],
    plans: ['free', 'premium', 'pro'],
    relatedFeatures: ['profile'],
    examples: ['Quero registrar água.', 'Como está meu sono?'],
    supportedLanguages: ['pt-BR', 'en-US', 'en-GB', 'en-AU']
  },
  {
    featureId: 'trainer',
    name: {
      'pt-BR': 'Personal Trainer & Treinos',
      'en-US': 'Personal Trainer & Workouts',
      'en-GB': 'Personal Trainer & Fitness Programmes',
      'en-AU': 'Personal Trainer & Workouts',
    },
    description: {
      'pt-BR': 'Planos de treino adaptados e guias visuais em 3D.',
      'en-US': 'Adapted workout plans and interactive 3D visual guides.',
      'en-GB': 'Personalised fitness programmes with 3D biomechanics visual guides.',
      'en-AU': 'Tailored training routines with dual 3D avatar guides.',
    },
    category: 'fitness',
    route: 'trainer',
    status: 'active',
    icon: 'dumbbell',
    actions: ['open', 'start', 'customize'],
    triggers: ['treino', 'exercício', 'academia', 'musculação', 'personal'],
    plans: ['free', 'premium', 'pro'],
    relatedFeatures: ['evolution'],
    examples: ['Quero treinar agora.', 'Mostre exercícios para pernas.'],
    supportedLanguages: ['pt-BR', 'en-US', 'en-GB', 'en-AU']
  },
  {
    featureId: 'evolution',
    name: {
      'pt-BR': 'Evolução Corporal',
      'en-US': 'Body Evolution',
      'en-GB': 'Body Composition & Evolution',
      'en-AU': 'Body Progress Tracker',
    },
    description: {
      'pt-BR': 'Acompanhe peso, fotos de progresso e medidas corporais.',
      'en-US': 'Track weight, progress photos, and body measurements.',
      'en-GB': 'Track weight (kg/stone), photo progress, and body measurements.',
      'en-AU': 'Track weight, progress photos, and body circumference metrics.',
    },
    category: 'fitness',
    route: 'evolution',
    status: 'active',
    icon: 'trending-up',
    actions: ['open', 'log_weight', 'compare'],
    triggers: ['evolução', 'progresso', 'peso', 'medidas', 'minhas fotos'],
    plans: ['free', 'premium', 'pro'],
    relatedFeatures: ['trainer', 'profile'],
    examples: ['Mostre minha evolução.', 'Quero ver meu progresso.'],
    supportedLanguages: ['pt-BR', 'en-US', 'en-GB', 'en-AU']
  },
  {
    featureId: 'pricing',
    name: {
      'pt-BR': 'Planos Premium & PRO',
      'en-US': 'Pricing & PRO Plans',
      'en-GB': 'Premium Membership Plans',
      'en-AU': 'PRO Membership & Plans',
    },
    description: {
      'pt-BR': 'Desbloqueie recursos avançados de IA e nutrição.',
      'en-US': 'Unlock advanced AI and nutrition features.',
      'en-GB': 'Unlock advanced AI guidance, recipes, and personalised coaching.',
      'en-AU': 'Unlock unlimited AI smart meal planning and personalised coaching.',
    },
    category: 'account',
    route: 'pricing',
    status: 'active',
    icon: 'crown',
    actions: ['open', 'upgrade'],
    triggers: ['premium', 'pro', 'assinatura', 'pagamento', 'planos'],
    plans: ['free', 'premium', 'pro'],
    relatedFeatures: ['profile'],
    examples: ['Quero virar PRO.', 'Quais são os planos?'],
    supportedLanguages: ['pt-BR', 'en-US', 'en-GB', 'en-AU']
  },
  {
    featureId: 'profile',
    name: {
      'pt-BR': 'Perfil e Configurações',
      'en-US': 'Profile & Settings',
      'en-GB': 'Profile & Preferences',
      'en-AU': 'Profile & Settings',
    },
    description: {
      'pt-BR': 'Gerencie seus dados pessoais, objetivos, idioma e segurança.',
      'en-US': 'Manage personal data, goals, language, and security.',
      'en-GB': 'Manage personal data, health goals, regional preferences, and privacy.',
      'en-AU': 'Manage personal information, nutritional targets, and localization.',
    },
    category: 'account',
    route: 'profile',
    status: 'active',
    icon: 'user',
    actions: ['open', 'edit', 'settings'],
    triggers: ['perfil', 'configurações', 'ajustes', 'idioma', 'conta', 'suporte'],
    plans: ['free', 'premium', 'pro'],
    relatedFeatures: ['pricing'],
    examples: ['Abra minhas configurações.', 'Mude meu objetivo.'],
    supportedLanguages: ['pt-BR', 'en-US', 'en-GB', 'en-AU']
  }
];

export const getFeatureById = (featureId: string): MaluFeature | undefined => {
  return MALU_APP_CATALOG.find(f => f.featureId === featureId);
};

export const findFeatureByTrigger = (query: string): MaluFeature | undefined => {
  const lower = query.toLowerCase().trim();
  return MALU_APP_CATALOG.find(f => f.triggers.some(t => lower.includes(t)));
};
