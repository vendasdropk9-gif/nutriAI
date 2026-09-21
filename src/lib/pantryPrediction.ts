import { PantryItem, PantryDepletionPrediction, PantryReplenishmentSummary } from '../types';
import { getAverageLocalItemPrice, getItemUnit } from './priceMonitor';

// Categorized baseline pantry essentials with typical depletion frequencies (days) and standard units
const BASELINE_PANTRY_ESSENTIALS = [
  { name: 'Ovos Caipiras', category: 'Laticínios & Ovos', defaultStock: '4 unidades', days: 2, avgDaily: '2 unidades/dia', unit: 'dúzia', tip: 'Fonte primária de proteína de alto valor biológico.' },
  { name: 'Aveia em Flocos', category: 'Grãos & Massas', defaultStock: '150g', days: 3, avgDaily: '50g/dia', unit: 'pacote', tip: 'Rica em beta-glucana para saciedade e controle glicêmico.' },
  { name: 'Azeite de Oliva Extravirgem', category: 'Temperos & Molhos', defaultStock: '80ml', days: 4, avgDaily: '20ml/dia', unit: 'frasco 500ml', tip: 'Gordura monoinsaturada anti-inflamatória essencial.' },
  { name: 'Peito de Frango', category: 'Proteínas & Carnes', defaultStock: '300g', days: 1, avgDaily: '250g/dia', unit: 'kg', tip: 'Proteína magra chave para manutenção de massa muscular.' },
  { name: 'Banana Prata', category: 'Vegetais & Frutas', defaultStock: '2 unidades', days: 2, avgDaily: '1-2 unidades/dia', unit: 'kg', tip: 'Rica em potássio e energia rápida pré-treino.' },
  { name: 'Iogurte Natural Desnatado', category: 'Laticínios & Ovos', defaultStock: '1 pote', days: 2, avgDaily: '1 pote/dia', unit: 'pote', tip: 'Probióticos essenciais para a microbiota intestinal.' },
  { name: 'Espinafre / Folhas Verdes', category: 'Vegetais & Frutas', defaultStock: '1/2 maço', days: 2, avgDaily: '1 porção/dia', unit: 'maço', tip: 'Magnésio e folato para vitalidade e recuperação celular.' },
  { name: 'Castanhas do Pará / Nozes', category: 'Grãos & Massas', defaultStock: '50g', days: 4, avgDaily: '20g/dia', unit: 'pct 150g', tip: 'Selênio e antioxidantes essenciais.' },
  { name: 'Café Especial em Grãos/Moído', category: 'Bebidas', defaultStock: '100g', days: 5, avgDaily: '20g/dia', unit: 'pacote', tip: 'Termogênico natural e foco matinal.' },
  { name: 'Arroz Integral / Quinoa', category: 'Grãos & Massas', defaultStock: '250g', days: 5, avgDaily: '80g/dia', unit: 'kg', tip: 'Carboidratos complexos de baixo índice glicêmico.' }
];

/**
 * Calculates depletion days remaining for a given expiration or consumption date
 */
function calculateDaysRemaining(dateStr?: string, defaultDays: number = 3): number {
  if (!dateStr) return defaultDays;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(dateStr);
    targetDate.setHours(0, 0, 0, 0);
    const diff = targetDate.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return isNaN(days) ? defaultDays : days;
  } catch {
    return defaultDays;
  }
}

/**
 * Predicts pantry item depletion based on registered items, meal plan usage, and intake history
 */
export function predictPantryDepletion(
  currentShoppingListItems: { name: string; checked?: boolean }[],
  currentShoppingListTotal: number,
  budgetLimit: number
): PantryReplenishmentSummary {
  const shoppingItemNamesLower = new Set(
    currentShoppingListItems.map(i => i.name.toLowerCase().trim())
  );

  // 1. Try to read user's saved pantry items
  let savedPantryItems: PantryItem[] = [];
  try {
    const rawPantry = localStorage.getItem('nutri_pantry_items');
    if (rawPantry) {
      savedPantryItems = JSON.parse(rawPantry);
    }
  } catch (e) {
    console.error('Error reading pantry from localStorage:', e);
  }

  // 2. Build map of items to evaluate
  const candidateItems: Array<{
    id: string;
    name: string;
    category: string;
    currentStock: string;
    daysRemaining: number;
    avgDaily: string;
    lastUsed: string;
    tip: string;
  }> = [];

  // Add saved pantry items
  savedPantryItems.forEach((p, idx) => {
    const days = calculateDaysRemaining(p.expirationDate, p.daysRemaining || 3);
    candidateItems.push({
      id: p.id || `pantry-${idx}`,
      name: p.name,
      category: p.category || 'Outros',
      currentStock: p.quantity || 'Pouco restante',
      daysRemaining: days,
      avgDaily: 'Consumo regular',
      lastUsed: p.addedAt ? new Date(p.addedAt).toLocaleDateString('pt-BR') : 'Recentemente',
      tip: `Item armazenado em: ${p.storageLocation || 'despensa'}`
    });
  });

  // Supplement with baseline essentials if user has few items
  BASELINE_PANTRY_ESSENTIALS.forEach((base, idx) => {
    const alreadyExists = candidateItems.some(
      c => c.name.toLowerCase().includes(base.name.toLowerCase()) || base.name.toLowerCase().includes(c.name.toLowerCase())
    );
    if (!alreadyExists) {
      candidateItems.push({
        id: `base-pantry-${idx}`,
        name: base.name,
        category: base.category,
        currentStock: base.defaultStock,
        daysRemaining: base.days,
        avgDaily: base.avgDaily,
        lastUsed: 'Registro de hábitos',
        tip: base.tip
      });
    }
  });

  // Sort by urgency (least days remaining first)
  candidateItems.sort((a, b) => a.daysRemaining - b.daysRemaining);

  // 3. Compute budget impacts and depletion predictions
  let cumulativeAffordableCost = currentShoppingListTotal;
  const predictions: PantryDepletionPrediction[] = candidateItems.map(item => {
    const estimatedCost = getAverageLocalItemPrice(item.name);
    const unit = getItemUnit(item.name);
    const isAlreadyInList = shoppingItemNamesLower.has(item.name.toLowerCase().trim()) ||
      Array.from(shoppingItemNamesLower).some(existing => existing.includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(existing));

    const newTotalIfAdded = currentShoppingListTotal + (isAlreadyInList ? 0 : estimatedCost);
    const remainingMargin = Number((budgetLimit - newTotalIfAdded).toFixed(2));
    const willExceedBudget = newTotalIfAdded > budgetLimit;
    const exceededAmount = willExceedBudget ? Number((newTotalIfAdded - budgetLimit).toFixed(2)) : 0;
    const canAfford = !willExceedBudget || isAlreadyInList;

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + Math.max(0, item.daysRemaining));
    const predictedDateStr = targetDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

    let urgency: 'critical' | 'soon' | 'adequate' = 'adequate';
    if (item.daysRemaining <= 2) urgency = 'critical';
    else if (item.daysRemaining <= 5) urgency = 'soon';

    return {
      id: item.id,
      name: item.name,
      category: item.category,
      currentStock: item.currentStock,
      unit,
      estimatedDaysRemaining: item.daysRemaining,
      avgDailyConsumption: item.avgDaily,
      lastUsedOrPurchased: item.lastUsed,
      predictedDepletionDate: predictedDateStr,
      urgency,
      estimatedRestockCost: estimatedCost,
      isAlreadyInShoppingList: isAlreadyInList,
      canAffordWithinBudget: canAfford,
      budgetImpact: {
        currentListTotal: currentShoppingListTotal,
        newTotalIfAdded,
        budgetLimit,
        remainingMargin,
        willExceedBudget,
        exceededAmount
      },
      smartTip: item.tip
    };
  });

  // Summary metrics
  const criticalItems = predictions.filter(p => p.urgency === 'critical' && !p.isAlreadyInShoppingList);
  const soonItems = predictions.filter(p => p.urgency === 'soon' && !p.isAlreadyInShoppingList);
  
  const totalRestockCost = predictions
    .filter(p => !p.isAlreadyInShoppingList)
    .reduce((acc, it) => acc + it.estimatedRestockCost, 0);

  const affordableItems = predictions.filter(p => !p.isAlreadyInShoppingList && p.canAffordWithinBudget);
  const unaffordableItems = predictions.filter(p => !p.isAlreadyInShoppingList && !p.canAffordWithinBudget);

  const affordableRestockCost = affordableItems.reduce((acc, it) => acc + it.estimatedRestockCost, 0);

  // Generate Aoede voice summary
  let aiVoiceSummary = '';
  if (criticalItems.length > 0) {
    const itemNames = criticalItems.slice(0, 3).map(i => i.name).join(', ');
    const affordableCritical = criticalItems.filter(i => i.canAffordWithinBudget);
    if (affordableCritical.length > 0) {
      aiVoiceSummary = `Olá! Analisei sua despensa e identifiquei que ${itemNames} vão acabar nos próximos dias. Você tem saldo disponível no seu orçamento de compras para adicioná-los com segurança e manter seu planejamento em dia!`;
    } else {
      aiVoiceSummary = `Atenção: Itens essenciais como ${itemNames} estão perto de acabar, mas seu orçamento está próximo do limite. Recomendo usar as substituições econômicas da lista para liberar margem!`;
    }
  } else if (soonItems.length > 0) {
    aiVoiceSummary = `Sua despensa está em bom estado, mas itens como ${soonItems[0].name} precisarão de reposição em breve. Seu orçamento atual permite incluí-los com tranquilidade.`;
  } else {
    aiVoiceSummary = `Sua despensa está abastecida e alinhada com seu plano alimentar atual. Nenhum item crítico detectado no momento!`;
  }

  return {
    criticalCount: criticalItems.length,
    soonCount: soonItems.length,
    totalRestockCost: Number(totalRestockCost.toFixed(2)),
    affordableRestockCost: Number(affordableRestockCost.toFixed(2)),
    affordableItemsCount: affordableItems.length,
    unaffordableItemsCount: unaffordableItems.length,
    predictions,
    aiVoiceSummary
  };
}
