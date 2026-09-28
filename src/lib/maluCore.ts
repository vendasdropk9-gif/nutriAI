import { MALU_APP_CATALOG, MaluFeature, findFeatureByTrigger } from './malu/MaluCatalog';

export type MaluIntent = 
  | 'OPEN_FEATURE'
  | 'ANALYZE_PLATE'
  | 'CREATE_RECIPE'
  | 'FIND_RECIPE'
  | 'USE_FRIDGE'
  | 'CREATE_SHOPPING_LIST'
  | 'CHECK_HYDRATION'
  | 'CHECK_HABITS'
  | 'START_WORKOUT'
  | 'CHECK_PROGRESS'
  | 'UPDATE_GOAL'
  | 'ASK_NUTRITION'
  | 'ASK_FOOD_SUBSTITUTION'
  | 'ASK_HERB'
  | 'ASK_TEA'
  | 'ASK_JUICE'
  | 'ASK_CALORIES'
  | 'ASK_MACROS'
  | 'ASK_FITNESS'
  | 'CHANGE_LANGUAGE'
  | 'OPEN_PROFILE'
  | 'OPEN_SETTINGS'
  | 'OPEN_PREMIUM'
  | 'ASK_SUPPORT'
  | 'UNKNOWN';

export interface ProcessIntentResult {
  intent: MaluIntent;
  actionType: 'NAVIGATE' | 'OPEN_MODAL' | 'EXECUTE' | 'PROMPT';
  targetTab?: string;
  feature?: MaluFeature;
  message: string;
  success: boolean;
}

export const processIntent = (intentInput: string | MaluIntent, params?: any): ProcessIntentResult => {
  let matchedIntent: MaluIntent = 'UNKNOWN';
  let feature: MaluFeature | undefined = undefined;

  if (typeof intentInput === 'string') {
    const textLower = intentInput.toLowerCase();
    feature = findFeatureByTrigger(textLower);
    
    if (feature) {
      matchedIntent = 'OPEN_FEATURE';
    } else {
      const upper = intentInput.toUpperCase().trim();
      matchedIntent = (upper as MaluIntent) || 'UNKNOWN';
    }
  }

  if (!feature && matchedIntent === 'CREATE_RECIPE') {
    feature = MALU_APP_CATALOG.find(f => f.featureId === 'generator');
  } else if (!feature && matchedIntent === 'ANALYZE_PLATE') {
    feature = MALU_APP_CATALOG.find(f => f.featureId === 'plate-analyzer');
  } else if (!feature && matchedIntent === 'USE_FRIDGE') {
    feature = MALU_APP_CATALOG.find(f => f.featureId === 'fridge');
  } else if (!feature && matchedIntent === 'CHECK_HYDRATION') {
    feature = MALU_APP_CATALOG.find(f => f.featureId === 'habits');
  } else if (!feature && matchedIntent === 'START_WORKOUT') {
    feature = MALU_APP_CATALOG.find(f => f.featureId === 'trainer');
  }

  if (!feature && matchedIntent === 'OPEN_FEATURE' && params?.featureId) {
    feature = MALU_APP_CATALOG.find(f => f.featureId === params.featureId);
  }

  if (!feature) {
    return {
      intent: matchedIntent,
      actionType: 'PROMPT',
      message: 'Não encontrei uma função correspondente exata no NutriAI. Como posso te ajudar?',
      success: false
    };
  }

  if (typeof window !== 'undefined' && feature.route) {
    window.dispatchEvent(new CustomEvent('app:navigate', { detail: feature.route }));
  }

  const name = feature.name['pt-BR'] || feature.name[Object.keys(feature.name)[0]];

  return {
    intent: matchedIntent,
    actionType: 'NAVIGATE',
    targetTab: feature.route,
    feature,
    message: `Abrindo ${name} para você!`,
    success: true
  };
};

export const parseAndProcessUserMessage = (text: string, userPlan: string = 'free'): ProcessIntentResult => {
  const feature = findFeatureByTrigger(text);
  if (feature) {
    if (!feature.plans.includes(userPlan as any)) {
      return {
        intent: 'OPEN_PREMIUM',
        actionType: 'NAVIGATE',
        targetTab: 'pricing',
        feature,
        message: `A função "${feature.name['pt-BR'] || feature.featureId}" está disponível nos planos Premium e PRO.`,
        success: false
      };
    }
    return processIntent('OPEN_FEATURE', { featureId: feature.featureId });
  }

  return processIntent(text);
};
