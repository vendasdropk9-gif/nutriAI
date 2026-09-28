import { MALU_APP_CATALOG, MaluFeature, findFeatureByTrigger, getFeatureById } from './MaluCatalog';
import { getMaluSessionState, saveMaluSessionState, clearMaluSessionState } from './MaluSession';

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

export interface ProcessIntentOptions {
  userPlan?: string;
  isAuthenticated?: boolean;
  availableData?: Record<string, any>;
}

export interface ProcessIntentResult {
  intent: MaluIntent;
  actionType: 'NAVIGATE' | 'OPEN_MODAL' | 'EXECUTE' | 'PROMPT';
  targetTab?: string;
  feature?: MaluFeature;
  message: string;
  success: boolean;
  missingData?: string[];
}

export const processIntent = (
  intentInput: string | MaluIntent, 
  params?: any, 
  options: ProcessIntentOptions = { userPlan: 'free', isAuthenticated: true, availableData: {} }
): ProcessIntentResult => {
  const session = getMaluSessionState();
  let matchedIntent: MaluIntent = 'UNKNOWN';
  let feature: MaluFeature | undefined = undefined;

  const inputStr = typeof intentInput === 'string' ? intentInput.trim() : intentInput;

  // 1. Check if we have a pending feature expecting missing data input in multi-turn conversation
  if (session.pendingFeature && session.missingDataQueue && session.missingDataQueue.length > 0 && typeof inputStr === 'string') {
    const currentMissing = session.missingDataQueue[0];
    const updatedCollected = { ...session.collectedData, [currentMissing]: inputStr };
    const remainingQueue = session.missingDataQueue.slice(1);

    feature = session.pendingFeature;
    
    if (remainingQueue.length > 0) {
      saveMaluSessionState({
        pendingFeature: feature,
        missingDataQueue: remainingQueue,
        collectedData: updatedCollected
      });

      const nextMissing = remainingQueue[0];
      const customMessage = feature.missingDataResponses?.[nextMissing] || `Para continuar, por favor informe: ${nextMissing}.`;

      return {
        intent: 'OPEN_FEATURE',
        actionType: 'PROMPT',
        targetTab: feature.route,
        feature,
        message: customMessage,
        success: false,
        missingData: remainingQueue
      };
    } else {
      clearMaluSessionState();
      
      if (typeof window !== 'undefined' && feature.route) {
        window.dispatchEvent(new CustomEvent('app:navigate', { detail: feature.route }));
      }

      const featureName = feature.name['pt-BR'] || feature.featureId;
      return {
        intent: 'OPEN_FEATURE',
        actionType: 'NAVIGATE',
        targetTab: feature.route,
        feature,
        message: `Perfeito! Dados coletados. Abrindo ${featureName} com suas preferências!`,
        success: true
      };
    }
  }

  // Normal intent resolution
  if (typeof inputStr === 'string') {
    feature = findFeatureByTrigger(inputStr);
    if (feature) {
      matchedIntent = 'OPEN_FEATURE';
    } else {
      const upper = inputStr.toUpperCase();
      matchedIntent = (upper as MaluIntent) || 'UNKNOWN';
    }
  }

  if (!feature) {
    if (matchedIntent === 'CREATE_RECIPE') feature = getFeatureById('generator');
    else if (matchedIntent === 'ANALYZE_PLATE') feature = getFeatureById('plate-analyzer');
    else if (matchedIntent === 'USE_FRIDGE') feature = getFeatureById('fridge');
    else if (matchedIntent === 'CHECK_HYDRATION' || matchedIntent === 'CHECK_HABITS') feature = getFeatureById('habits');
    else if (matchedIntent === 'START_WORKOUT' || matchedIntent === 'ASK_FITNESS') feature = getFeatureById('trainer');
    else if (matchedIntent === 'CHECK_PROGRESS') feature = getFeatureById('evolution');
    else if (matchedIntent === 'CREATE_SHOPPING_LIST') feature = getFeatureById('shopping');
    else if (matchedIntent === 'OPEN_PROFILE' || matchedIntent === 'OPEN_SETTINGS') feature = getFeatureById('profile');
    else if (matchedIntent === 'OPEN_PREMIUM') feature = getFeatureById('pricing');
    else if (matchedIntent === 'ASK_HERB' || matchedIntent === 'ASK_TEA') feature = getFeatureById('herbs');
  }

  if (!feature && params?.featureId) {
    feature = getFeatureById(params.featureId);
  }

  if (!feature) {
    return {
      intent: matchedIntent,
      actionType: 'PROMPT',
      message: 'Não encontrei uma função correspondente no NutriAI para atender a este pedido. Gostaria de ver o gerador de receitas ou os treinos?',
      success: false
    };
  }

  const userPlan = options.userPlan || 'free';
  if (!feature.plans.includes(userPlan as any)) {
    return {
      intent: 'OPEN_PREMIUM',
      actionType: 'NAVIGATE',
      targetTab: 'pricing',
      feature,
      message: `A funcionalidade "${feature.name['pt-BR'] || feature.featureId}" requer um plano superior (Premium ou PRO).`,
      success: false
    };
  }

  // Missing Data Verification Flow (Single-Question Conversational Mode)
  const availableData = { ...(options.availableData || {}), ...(session.collectedData || {}), ...(params || {}) };
  const requiredData = feature.requiredData || [];
  const missingData: string[] = [];

  for (const req of requiredData) {
    if (availableData[req] === undefined || availableData[req] === null || availableData[req] === '') {
      missingData.push(req);
    }
  }

  if (missingData.length > 0) {
    const primaryMissing = missingData[0];
    const customMessage = feature.missingDataResponses?.[primaryMissing] || `Para continuar com "${feature.name['pt-BR']}", por favor informe: ${primaryMissing}.`;
    
    saveMaluSessionState({
      pendingFeature: feature,
      missingDataQueue: missingData,
      collectedData: availableData,
      lastFeatureId: feature.featureId,
      lastIntent: matchedIntent
    });

    return {
      intent: matchedIntent,
      actionType: 'PROMPT',
      targetTab: feature.route,
      feature,
      message: customMessage,
      success: false,
      missingData
    };
  }

  saveMaluSessionState({
    lastFeatureId: feature.featureId,
    lastIntent: matchedIntent,
    collectedData: availableData
  });

  if (typeof window !== 'undefined' && feature.route) {
    window.dispatchEvent(new CustomEvent('app:navigate', { detail: feature.route }));
  }

  const featureName = feature.name['pt-BR'] || feature.featureId;

  return {
    intent: matchedIntent,
    actionType: 'NAVIGATE',
    targetTab: feature.route,
    feature,
    message: `Navegando para ${featureName}!`,
    success: true
  };
};

export const parseAndProcessUserMessage = (text: string, userPlan: string = 'free', availableData: Record<string, any> = {}): ProcessIntentResult => {
  return processIntent(text, undefined, { userPlan, isAuthenticated: true, availableData });
};
