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
  actionsRequiredData?: Record<string, string[]>;
  permissions?: string[];
  plans: UserPlan[];
  relatedFeatures: string[];
  examples: string[];
  limitations?: string[];
  supportedLanguages: string[];
  fallbackBehavior?: string;
  missingDataResponses?: Record<string, string>;
}

export const MALU_APP_CATALOG: MaluFeature[] = [
  {
    featureId: 'plate-analyzer',
    name: { 'pt-BR': 'Análise de Prato', 'en-US': 'Plate Analyzer', 'en-GB': 'Plate Analyser', 'en-AU': 'Plate Analyser' },
    description: { 'pt-BR': 'Analisa uma refeição através de imagem por IA.', 'en-US': 'Analyzes a meal via AI image recognition.', 'en-GB': 'Analyses a meal via AI image recognition.', 'en-AU': 'Analyses a meal via AI image recognition.' },
    category: 'intelligence',
    route: 'analyzer',
    status: 'active',
    icon: 'camera',
    actions: ['open', 'analyze'],
    triggers: ['analise meu prato', 'veja meu almoço', 'o que tem nesse prato', 'calcule essa refeição', 'analisar prato'],
    requiredData: ['image'],
    optionalData: ['mealName', 'mealTime'],
    actionsRequiredData: {
      open: [],
      analyze: ['image']
    },
    plans: ['free', 'premium', 'pro'],
    relatedFeatures: ['recipes', 'generator'],
    examples: ['Analisa meu almoço.', 'O que tem neste prato?'],
    supportedLanguages: ['pt-BR', 'en-US', 'en-GB', 'en-AU'],
    fallbackBehavior: 'Abrir a câmera para captura de foto ou seleção de arquivo.',
    missingDataResponses: {
      image: 'Posso analisar seu prato. Envie uma foto da refeição para continuarmos.'
    }
  },
  {
    featureId: 'generator',
    name: { 'pt-BR': 'Gerador de Receitas IA', 'en-US': 'AI Recipe Generator', 'en-GB': 'AI Recipe Generator', 'en-AU': 'AI Recipe Generator' },
    description: { 'pt-BR': 'Cria receitas personalizadas com base nos seus ingredientes e objetivos.', 'en-US': 'Creates custom recipes based on ingredients and goals.', 'en-GB': 'Creates personalised recipes based on ingredients and goals.', 'en-AU': 'Creates personalised recipes based on ingredients and goals.' },
    category: 'food',
    route: 'generator',
    status: 'active',
    icon: 'utensils',
    actions: ['open', 'generate'],
    triggers: ['gerar receita', 'criar receita', 'quero uma receita', 'fazer receita', 'cozinhar'],
    requiredData: ['goal'],
    optionalData: ['ingredients', 'preferences', 'diet'],
    actionsRequiredData: {
      open: [],
      generate: ['goal']
    },
    plans: ['free', 'premium', 'pro'],
    relatedFeatures: ['plate-analyzer', 'shopping'],
    examples: ['Me dê uma receita com frango e arroz.', 'Quero criar uma sobremesa fit.'],
    supportedLanguages: ['pt-BR', 'en-US', 'en-GB', 'en-AU'],
    fallbackBehavior: 'Perguntar o objetivo principal e ingredientes disponíveis.',
    missingDataResponses: {
      goal: 'Qual é o seu objetivo para esta receita: emagrecimento, ganho de massa ou manutenção?'
    }
  },
  {
    featureId: 'quickdishes',
    name: { 'pt-BR': 'Receitas Rápidas (15min)', 'en-US': 'Quick Dishes', 'en-GB': 'Quick Dishes', 'en-AU': 'Quick Dishes' },
    description: { 'pt-BR': 'Opções expressas para emagrecimento e ganho de massa em até 15 minutos.', 'en-US': 'Express meals for weight loss and muscle gain.', 'en-GB': 'Express meals for weight loss and muscle gain.', 'en-AU': 'Express meals for weight loss and muscle gain.' },
    category: 'food',
    route: 'quickdishes',
    status: 'active',
    icon: 'zap',
    actions: ['open', 'filter'],
    triggers: ['receitas rápidas', 'prato rápido', 'emagrecimento', 'massa', '15 minutos'],
    plans: ['free', 'premium', 'pro'],
    relatedFeatures: ['generator'],
    examples: ['Mostre receitas rápidas.', 'Quero um prato para emagrecer.'],
    supportedLanguages: ['pt-BR', 'en-US', 'en-GB', 'en-AU'],
    fallbackBehavior: 'Exibir opções padrão de receitas expressas.'
  },
  {
    featureId: 'fridge',
    name: { 'pt-BR': 'Geladeira Inteligente', 'en-US': 'Smart Fridge', 'en-GB': 'Smart Fridge', 'en-AU': 'Smart Fridge' },
    description: { 'pt-BR': 'Gerencie o que tem na sua dispensa e geladeira para evitar desperdícios.', 'en-US': 'Manage pantry and fridge items to avoid food waste.', 'en-GB': 'Manage pantry and fridge items to avoid food waste.', 'en-AU': 'Manage pantry and fridge items to avoid food waste.' },
    category: 'food',
    route: 'fridge',
    status: 'active',
    icon: 'snowflake',
    actions: ['open', 'scan', 'suggest'],
    triggers: ['geladeira', 'o que tem na geladeira', 'sobras', 'dispensa', 'ingredientes'],
    plans: ['free', 'premium', 'pro'],
    relatedFeatures: ['generator', 'shopping'],
    examples: ['O que consigo fazer com o que tenho na geladeira?'],
    supportedLanguages: ['pt-BR', 'en-US', 'en-GB', 'en-AU'],
    fallbackBehavior: 'Abrir o gerenciador da geladeira para inserção manual ou escaneamento.'
  },
  {
    featureId: 'shopping',
    name: { 'pt-BR': 'Lista de Compras Inteligente', 'en-US': 'Smart Shopping List', 'en-GB': 'Smart Shopping List', 'en-AU': 'Smart Shopping List' },
    description: { 'pt-BR': 'Organiza seus itens por corredores e estima gastos.', 'en-US': 'Organizes items by aisle and estimates costs.', 'en-GB': 'Organises items by aisle and estimates costs.', 'en-AU': 'Organises items by aisle and estimates costs.' },
    category: 'food',
    route: 'shopping',
    status: 'active',
    icon: 'shopping-basket',
    actions: ['open', 'create', 'export'],
    triggers: ['lista de compras', 'compras', 'supermercado', 'comprar'],
    plans: ['free', 'premium', 'pro'],
    relatedFeatures: ['generator', 'fridge'],
    examples: ['Crie uma lista de compras para a semana.'],
    supportedLanguages: ['pt-BR', 'en-US', 'en-GB', 'en-AU'],
    fallbackBehavior: 'Abrir a lista de compras atual.'
  },
  {
    featureId: 'habits',
    name: { 'pt-BR': 'Rastreador de Hábitos & Hidratação', 'en-US': 'Habit & Hydration Tracker', 'en-GB': 'Habit & Hydration Tracker', 'en-AU': 'Habit & Hydration Tracker' },
    description: { 'pt-BR': 'Monitore água, sono e jejum com alertas inteligentes.', 'en-US': 'Monitor water, sleep, and fasting with smart reminders.', 'en-GB': 'Monitor water, sleep, and fasting with smart reminders.', 'en-AU': 'Monitor water, sleep, and fasting with smart reminders.' },
    category: 'health',
    route: 'habits',
    status: 'active',
    icon: 'droplet',
    actions: ['open', 'log', 'remind'],
    triggers: ['água', 'hidratação', 'hábitos', 'sono', 'jejum', 'beber água'],
    plans: ['free', 'premium', 'pro'],
    relatedFeatures: ['profile'],
    examples: ['Quero registrar água.', 'Como está meu sono?'],
    supportedLanguages: ['pt-BR', 'en-US', 'en-GB', 'en-AU'],
    fallbackBehavior: 'Exibir painel diário de hábitos.'
  },
  {
    featureId: 'trainer',
    name: { 'pt-BR': 'Personal Trainer & Treinos', 'en-US': 'Personal Trainer', 'en-GB': 'Personal Trainer', 'en-AU': 'Personal Trainer' },
    description: { 'pt-BR': 'Planos de treino adaptados e guias visuais em 3D.', 'en-US': 'Adapted workout plans and 3D visual guides.', 'en-GB': 'Adapted workout plans and 3D visual guides.', 'en-AU': 'Adapted workout plans and 3D visual guides.' },
    category: 'fitness',
    route: 'trainer',
    status: 'active',
    icon: 'dumbbell',
    actions: ['open', 'start', 'customize'],
    triggers: ['treino', 'exercício', 'academia', 'musculação', 'personal'],
    plans: ['free', 'premium', 'pro'],
    relatedFeatures: ['evolution'],
    examples: ['Quero treinar agora.', 'Mostre exercícios para pernas.'],
    supportedLanguages: ['pt-BR', 'en-US', 'en-GB', 'en-AU'],
    fallbackBehavior: 'Abrir o painel de treinos diários.'
  },
  {
    featureId: 'evolution',
    name: { 'pt-BR': 'Evolução Corporal', 'en-US': 'Body Evolution', 'en-GB': 'Body Evolution', 'en-AU': 'Body Evolution' },
    description: { 'pt-BR': 'Acompanhe peso, fotos de progresso e medidas corporais.', 'en-US': 'Track weight, progress photos, and body measurements.', 'en-GB': 'Track weight, progress photos, and body measurements.', 'en-AU': 'Track weight, progress photos, and body measurements.' },
    category: 'fitness',
    route: 'evolution',
    status: 'active',
    icon: 'trending-up',
    actions: ['open', 'log_weight', 'compare'],
    triggers: ['evolução', 'progresso', 'peso', 'medidas', 'minhas fotos'],
    plans: ['free', 'premium', 'pro'],
    relatedFeatures: ['trainer', 'profile'],
    examples: ['Mostre minha evolução.', 'Quero ver meu progresso.'],
    supportedLanguages: ['pt-BR', 'en-US', 'en-GB', 'en-AU'],
    fallbackBehavior: 'Abrir a tela de evolução.'
  },
  {
    featureId: 'pricing',
    name: { 'pt-BR': 'Planos Premium & PRO', 'en-US': 'Pricing & PRO', 'en-GB': 'Pricing & PRO', 'en-AU': 'Pricing & PRO' },
    description: { 'pt-BR': 'Desbloqueie recursos avançados de IA e nutrição.', 'en-US': 'Unlock advanced AI and nutrition features.', 'en-GB': 'Unlock advanced AI and nutrition features.', 'en-AU': 'Unlock advanced AI and nutrition features.' },
    category: 'account',
    route: 'pricing',
    status: 'active',
    icon: 'crown',
    actions: ['open', 'upgrade'],
    triggers: ['premium', 'pro', 'assinatura', 'pagamento', 'planos'],
    plans: ['free', 'premium', 'pro'],
    relatedFeatures: ['profile'],
    examples: ['Quero virar PRO.', 'Quais são os planos?'],
    supportedLanguages: ['pt-BR', 'en-US', 'en-GB', 'en-AU'],
    fallbackBehavior: 'Abrir vitrine de planos.'
  },
  {
    featureId: 'smartplate',
    name: { 'pt-BR': 'Prato Inteligente de Restaurante', 'en-US': 'Smart Plate Combiner', 'en-GB': 'Smart Plate Combiner', 'en-AU': 'Smart Plate Combiner' },
    description: { 'pt-BR': 'Combine pratos em restaurantes por quilo mantendo suas metas nutricionais.', 'en-US': 'Combine dishes at buffet restaurants while hitting your nutritional goals.', 'en-GB': 'Combine dishes at buffet restaurants while hitting your nutritional goals.', 'en-AU': 'Combine dishes at buffet restaurants while hitting your nutritional goals.' },
    category: 'food',
    route: 'smartplate',
    status: 'active',
    icon: 'utensils',
    actions: ['open', 'combine'],
    triggers: ['prato inteligente', 'comer fora', 'restaurante por quilo', 'buffet'],
    plans: ['free', 'premium', 'pro'],
    relatedFeatures: ['analyzer', 'shopping'],
    examples: ['Como montar meu prato no restaurante por quilo?'],
    supportedLanguages: ['pt-BR', 'en-US', 'en-GB', 'en-AU'],
    fallbackBehavior: 'Abrir combinador de pratos para restaurantes.'
  },
  {
    featureId: 'cooking_advisor',
    name: { 'pt-BR': 'Chef Malu • Cozinha Orientada', 'en-US': 'Chef Malu Cooking Advisor', 'en-GB': 'Chef Malu Cooking Advisor', 'en-AU': 'Chef Malu Cooking Advisor' },
    description: { 'pt-BR': 'Assistente de voz para cozinhar mãos livres, tirar dúvidas térmicas e substituições.', 'en-US': 'Voice assistant for hands-free cooking and thermal tips.', 'en-GB': 'Voice assistant for hands-free cooking and thermal tips.', 'en-AU': 'Voice assistant for hands-free cooking and thermal tips.' },
    category: 'intelligence',
    route: 'cooking_advisor',
    status: 'active',
    icon: 'chef-hat',
    actions: ['open', 'speak', 'navigate_steps'],
    triggers: ['modo mãos sujas', 'cozinhar com voz', 'quanto tempo assar', 'substituir creme de leite'],
    plans: ['free', 'premium', 'pro'],
    relatedFeatures: ['generator', 'fridge'],
    examples: ['Quanto tempo devo assar este frango?', 'Ativar modo mãos sujas'],
    supportedLanguages: ['pt-BR', 'en-US', 'en-GB', 'en-AU'],
    fallbackBehavior: 'Abrir assistente de cozinha com comando de voz.'
  },
  {
    featureId: 'smartswaps',
    name: { 'pt-BR': 'Trocas Inteligentes', 'en-US': 'Smart Food Swaps', 'en-GB': 'Smart Food Swaps', 'en-AU': 'Smart Food Swaps' },
    description: { 'pt-BR': 'Substitua ingredientes calóricos por opções saudáveis equivalentes.', 'en-US': 'Swap high calorie ingredients for healthy alternatives.', 'en-GB': 'Swap high calorie ingredients for healthy alternatives.', 'en-AU': 'Swap high calorie ingredients for healthy alternatives.' },
    category: 'food',
    route: 'swaps',
    status: 'active',
    icon: 'arrow-right-left',
    actions: ['open', 'swap'],
    triggers: ['trocas inteligentes', 'substituir ingrediente', 'trocar açúcar'],
    plans: ['free', 'premium', 'pro'],
    relatedFeatures: ['generator'],
    examples: ['Qual a melhor substituição para a farinha de trigo?'],
    supportedLanguages: ['pt-BR', 'en-US', 'en-GB', 'en-AU'],
    fallbackBehavior: 'Abrir guia de substituições.'
  },
  {
    featureId: 'herbs',
    name: { 'pt-BR': 'Ervas Medicinais & Chás', 'en-US': 'Medicinal Herbs & Teas', 'en-GB': 'Medicinal Herbs & Teas', 'en-AU': 'Medicinal Herbs & Teas' },
    description: { 'pt-BR': 'Biblioteca científica de ervas e chás fitoterápicos brasileiros.', 'en-US': 'Scientific library of herbal teas and medicinal plants.', 'en-GB': 'Scientific library of herbal teas and medicinal plants.', 'en-AU': 'Scientific library of herbal teas and medicinal plants.' },
    category: 'health',
    route: 'herbs',
    status: 'active',
    icon: 'leaf',
    actions: ['open', 'search'],
    triggers: ['ervas', 'chá', 'alecrim', 'guaco', 'capim limão', 'planta medicinal'],
    plans: ['free', 'premium', 'pro'],
    relatedFeatures: ['juice'],
    examples: ['Quais os benefícios do alecrim?'],
    supportedLanguages: ['pt-BR', 'en-US', 'en-GB', 'en-AU'],
    fallbackBehavior: 'Abrir biblioteca de ervas.'
  },
  {
    featureId: 'profile',
    name: { 'pt-BR': 'Perfil e Configurações', 'en-US': 'Profile & Settings', 'en-GB': 'Profile & Settings', 'en-AU': 'Profile & Settings' },
    description: { 'pt-BR': 'Gerencie seus dados pessoais, objetivos, idioma e segurança.', 'en-US': 'Manage personal data, goals, language, and security.', 'en-GB': 'Manage personal data, goals, language, and security.', 'en-AU': 'Manage personal data, goals, language, and security.' },
    category: 'account',
    route: 'profile',
    status: 'active',
    icon: 'user',
    actions: ['open', 'edit', 'settings'],
    triggers: ['perfil', 'configurações', 'ajustes', 'idioma', 'conta', 'suporte'],
    plans: ['free', 'premium', 'pro'],
    relatedFeatures: ['pricing'],
    examples: ['Abra minhas configurações.', 'Mude meu objetivo.'],
    supportedLanguages: ['pt-BR', 'en-US', 'en-GB', 'en-AU'],
    fallbackBehavior: 'Abrir painel de perfil.'
  }
];

export const getFeatureById = (featureId: string): MaluFeature | undefined => {
  return MALU_APP_CATALOG.find(f => f.featureId === featureId);
};

export const findFeatureByTrigger = (query: string): MaluFeature | undefined => {
  const lower = query.toLowerCase().trim();
  return MALU_APP_CATALOG.find(f => f.triggers.some(t => lower.includes(t)));
};
