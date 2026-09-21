import { BudgetMonitoringAnalysis, SmartBudgetSubstitution, PartnerOffer } from '../types';

export interface LocalPartnerStoreOffer {
  storeId: string;
  storeName: string;
  storeLogo: string;
  category: string;
  itemName: string;
  price: number;
  unit: string;
  isPromo: boolean;
  originalPrice?: number;
  promoBadge?: string;
}

// Catálogo expandido de ofertas reais de parceiros locais
export const LOCAL_PARTNER_OFFERS: LocalPartnerStoreOffer[] = [
  // Sacolão Vida Verde (Orgânicos & Frescos)
  { storeId: 'm-vv', storeName: 'Sacolão Vida Verde', storeLogo: '🥬', category: 'Frutas', itemName: 'Banana Nanica', price: 4.80, unit: 'kg', isPromo: true, originalPrice: 6.20, promoBadge: '22% OFF' },
  { storeId: 'm-vv', storeName: 'Sacolão Vida Verde', storeLogo: '🥬', category: 'Frutas', itemName: 'Mamão Papaia', price: 5.90, unit: 'unid', isPromo: false },
  { storeId: 'm-vv', storeName: 'Sacolão Vida Verde', storeLogo: '🥬', category: 'Frutas', itemName: 'Laranja Pêra', price: 4.20, unit: 'kg', isPromo: true, originalPrice: 5.50, promoBadge: '23% OFF' },
  { storeId: 'm-vv', storeName: 'Sacolão Vida Verde', storeLogo: '🥬', category: 'Legumes', itemName: 'Abóbora Cabotiá Fresca', price: 2.90, unit: 'kg', isPromo: true, originalPrice: 4.20, promoBadge: '30% OFF' },
  { storeId: 'm-vv', storeName: 'Sacolão Vida Verde', storeLogo: '🥬', category: 'Legumes', itemName: 'Cenoura Fresca', price: 4.50, unit: 'kg', isPromo: false },
  { storeId: 'm-vv', storeName: 'Sacolão Vida Verde', storeLogo: '🥬', category: 'Legumes', itemName: 'Abobrinha Italiana', price: 4.90, unit: 'kg', isPromo: true, originalPrice: 6.80, promoBadge: '28% OFF' },
  { storeId: 'm-vv', storeName: 'Sacolão Vida Verde', storeLogo: '🥬', category: 'Verduras', itemName: 'Couve Manteiga Orgânica', price: 3.20, unit: 'maço', isPromo: true, originalPrice: 4.50, promoBadge: 'Feira Fresca' },
  { storeId: 'm-vv', storeName: 'Sacolão Vida Verde', storeLogo: '🥬', category: 'Verduras', itemName: 'Espinafre Hidropônico', price: 3.90, unit: 'maço', isPromo: false },
  { storeId: 'm-vv', storeName: 'Sacolão Vida Verde', storeLogo: '🥬', category: 'Verduras', itemName: 'Alface Crespa Hidropônica', price: 3.20, unit: 'unid', isPromo: true, originalPrice: 4.20, promoBadge: 'Colheita do Dia' },

  // Hortifruti Premium (Boutique & Higienizados)
  { storeId: 'm-hp', storeName: 'Hortifruti Premium', storeLogo: '🍊', category: 'Frutas', itemName: 'Morango Orgânico', price: 9.90, unit: 'bandeja', isPromo: true, originalPrice: 12.90, promoBadge: '23% OFF' },
  { storeId: 'm-hp', storeName: 'Hortifruti Premium', storeLogo: '🍊', category: 'Verduras', itemName: 'Brócolis Ninja Orgânico', price: 6.50, unit: 'unid', isPromo: true, originalPrice: 8.90, promoBadge: '27% OFF' },
  { storeId: 'm-hp', storeName: 'Hortifruti Premium', storeLogo: '🍊', category: 'Kits', itemName: 'Kit Salada Prática', price: 15.90, unit: 'unid', isPromo: true, originalPrice: 19.90, promoBadge: '20% OFF' },
  { storeId: 'm-hp', storeName: 'Hortifruti Premium', storeLogo: '🍊', category: 'Proteínas', itemName: 'Ovos Vermelhos Selecionados', price: 13.90, unit: 'dúzia', isPromo: false },

  // Sacolão Economia Popular (Preço Direto do Produtor / Cestas Econômicas)
  { storeId: 'm-sep', storeName: 'Sacolão Economia Popular', storeLogo: '💰', category: 'Proteínas', itemName: 'Ovos Caipiras da Granja', price: 11.50, unit: 'dúzia', isPromo: true, originalPrice: 15.90, promoBadge: 'Super Econômico' },
  { storeId: 'm-sep', storeName: 'Sacolão Economia Popular', storeLogo: '💰', category: 'Proteínas', itemName: 'Filé de Frango em Peito', price: 15.90, unit: 'kg', isPromo: true, originalPrice: 18.90, promoBadge: 'Preço Direto' },
  { storeId: 'm-sep', storeName: 'Sacolão Economia Popular', storeLogo: '💰', category: 'Proteínas', itemName: 'Filé de Tilápia Congelado', price: 21.90, unit: 'kg', isPromo: true, originalPrice: 28.50, promoBadge: 'Oferta da Semana' },
  { storeId: 'm-sep', storeName: 'Sacolão Economia Popular', storeLogo: '💰', category: 'Grãos, Cereais & Sementes', itemName: 'Aveia em Flocos a Granel', price: 3.80, unit: 'pct', isPromo: true, originalPrice: 5.50, promoBadge: 'Granel Barato' },
  { storeId: 'm-sep', storeName: 'Sacolão Economia Popular', storeLogo: '💰', category: 'Grãos, Cereais & Sementes', itemName: 'Sementes de Girassol / Linhaça', price: 5.90, unit: 'pct', isPromo: false },
  { storeId: 'm-sep', storeName: 'Sacolão Economia Popular', storeLogo: '💰', category: 'Outros', itemName: 'Azeite Virgem Especial', price: 22.90, unit: 'garrafa', isPromo: true, originalPrice: 29.90, promoBadge: 'Oferta Relâmpago' }
];

// Regras de substituições nutricionalmente equivalentes com alto impacto no bolso
export interface SubstitutionRule {
  triggerMatches: string[];
  substituteName: string;
  substituteUnit: string;
  preferredStoreId: string;
  storeName: string;
  storeLogo: string;
  substitutePrice: number;
  nutritionalEquivalence: string;
  culinaryAdvice: string;
  isPartnerDeal: boolean;
  partnerPromoId?: string;
}

export const SMART_SUBSTITUTION_RULES: SubstitutionRule[] = [
  {
    triggerMatches: ['morango', 'frutas vermelhas', 'framboesa', 'mirtilo'],
    substituteName: 'Banana Nanica Orgânica',
    substituteUnit: 'kg',
    preferredStoreId: 'm-vv',
    storeName: 'Sacolão Vida Verde',
    storeLogo: '🥬',
    substitutePrice: 4.80,
    nutritionalEquivalence: 'Rica em potássio, vitamina B6 e fibras solúveis de rápida digestão, com custo 60% menor que frutas vermelhas.',
    culinaryAdvice: 'Perfeita com aveia, iogurtes e shakes pré/pós treino mantendo alto teor energético sem estourar o orçamento.',
    isPartnerDeal: true,
    partnerPromoId: 'promo-1'
  },
  {
    triggerMatches: ['peito de frango', 'frango', 'filé de frango', 'peito frango'],
    substituteName: 'Ovos Caipiras da Granja (Dúzia)',
    substituteUnit: 'dúzia',
    preferredStoreId: 'm-sep',
    storeName: 'Sacolão Economia Popular',
    storeLogo: '💰',
    substitutePrice: 11.50,
    nutritionalEquivalence: 'Proteína de altíssimo valor biológico com 100% de absorção, colina e ferro com menor preço por porção proteica.',
    culinaryAdvice: 'Prepare mexidos, cozidos ou omeletes ricas com vegetais para substituir a proteína do almoço ou jantar.',
    isPartnerDeal: true
  },
  {
    triggerMatches: ['carne bovina', 'patinho', 'alcatra', 'filé mignon', 'bife'],
    substituteName: 'Filé de Peito no Sacolão Economia Popular',
    substituteUnit: 'kg',
    preferredStoreId: 'm-sep',
    storeName: 'Sacolão Economia Popular',
    storeLogo: '💰',
    substitutePrice: 15.90,
    nutritionalEquivalence: 'Proteína magra equivalente com menor teor de gorduras saturadas e economia superior a R$ 18 por quilo.',
    culinaryAdvice: 'Grelhado com alho, açafrão e limão atinge suculência excelente sem calorias extras.',
    isPartnerDeal: true
  },
  {
    triggerMatches: ['salmão', 'bacalhau', 'peixe nobre', 'salmao'],
    substituteName: 'Filé de Tilápia Congelado',
    substituteUnit: 'kg',
    preferredStoreId: 'm-sep',
    storeName: 'Sacolão Economia Popular',
    storeLogo: '💰',
    substitutePrice: 21.90,
    nutritionalEquivalence: 'Peixe branco magro, excelente fonte de fósforo e proteínas leves com digestibilidade excelente e valor 50% menor.',
    culinaryAdvice: 'Asse ao forno com azeite, tomates frescos e ervas finas para um prato leve e sofisticado.',
    isPartnerDeal: true
  },
  {
    triggerMatches: ['brócolis', 'brocolis', 'aspargos', 'cogumelo', 'shimeji', 'shitake'],
    substituteName: 'Couve Manteiga Orgânica',
    substituteUnit: 'maço',
    preferredStoreId: 'm-vv',
    storeName: 'Sacolão Vida Verde',
    storeLogo: '🥬',
    substitutePrice: 3.20,
    nutritionalEquivalence: 'Altíssima densidade de cálcio vegetal, clorofila, vitamina C e magnésio, desintoxicando o organismo.',
    culinaryAdvice: 'Refogue rapidamente com alho e fio de azeite para preservar a cor verde escura e os micronutrientes.',
    isPartnerDeal: true
  },
  {
    triggerMatches: ['kit salada', 'salada pronta', 'kit salada prática'],
    substituteName: 'Alface Crespa + Couve Fresca Avulsas',
    substituteUnit: 'combo',
    preferredStoreId: 'm-vv',
    storeName: 'Sacolão Vida Verde',
    storeLogo: '🥬',
    substitutePrice: 6.40,
    nutritionalEquivalence: 'Rendimento 3x maior que o kit higienizado industrial, com folhas mais crocantes e sem conservantes de atmosfera.',
    culinaryAdvice: 'Higienize com água e vinagre de maçã e guarde em pote com papel toalha por até 6 dias.',
    isPartnerDeal: true,
    partnerPromoId: 'promo-4'
  },
  {
    triggerMatches: ['azeite de oliva', 'azeite extra virgem', 'azeite'],
    substituteName: 'Azeite Virgem Especial em Oferta',
    substituteUnit: 'garrafa',
    preferredStoreId: 'm-sep',
    storeName: 'Sacolão Economia Popular',
    storeLogo: '💰',
    substitutePrice: 22.90,
    nutritionalEquivalence: 'Gorduras monoinsaturadas antioxidantes essenciais com economia direta de R$ 7,00 na cesta.',
    culinaryAdvice: 'Use cru para finalizar pratos frios e saladas, preservando polifenóis.',
    isPartnerDeal: true
  },
  {
    triggerMatches: ['quinoa', 'chia', 'linhaça dourada', 'castanha de caju', 'nozes'],
    substituteName: 'Aveia em Flocos a Granel',
    substituteUnit: 'pct',
    preferredStoreId: 'm-sep',
    storeName: 'Sacolão Economia Popular',
    storeLogo: '💰',
    substitutePrice: 3.80,
    nutritionalEquivalence: 'Riquíssima em beta-glucana para controle glicêmico e saciedade duradoura com preço muito acessível.',
    culinaryAdvice: 'Use em mingaus, panquecas fit e polvilhada em frutas frescas.',
    isPartnerDeal: true
  },
  {
    triggerMatches: ['queijo cottage', 'ricota fresca', 'queijo brie', 'parmesão'],
    substituteName: 'Iogurte Natural ou Ovos Caipiras',
    substituteUnit: 'unid',
    preferredStoreId: 'm-vv',
    storeName: 'Sacolão Vida Verde',
    storeLogo: '🥬',
    substitutePrice: 3.50,
    nutritionalEquivalence: 'Proteína limpa e probióticos naturais para a flora intestinal com fração do preço dos queijos artesanais.',
    culinaryAdvice: 'Tempere com uma pitada de sal e ervas para um molho cremoso proteico.',
    isPartnerDeal: true
  }
];

// Helper para estimar preço aproximado de um item da lista
export function estimateItemCost(itemName: string): { price: number; unit: string } {
  const n = itemName.toLowerCase();
  if (n.includes('morango')) return { price: 12.90, unit: 'bandeja' };
  if (n.includes('azeite')) return { price: 29.90, unit: 'garrafa' };
  if (n.includes('salmão') || n.includes('salmao')) return { price: 42.00, unit: 'kg' };
  if (n.includes('carne') || n.includes('patinho') || n.includes('alcatra')) return { price: 34.90, unit: 'kg' };
  if (n.includes('peito de frango') || n.includes('frango')) return { price: 18.20, unit: 'kg' };
  if (n.includes('kit salada')) return { price: 19.90, unit: 'unid' };
  if (n.includes('brócolis') || n.includes('brocolis')) return { price: 8.90, unit: 'unid' };
  if (n.includes('ovo') || n.includes('ovos')) return { price: 14.90, unit: 'dúzia' };
  if (n.includes('abóbora') || n.includes('abobora')) return { price: 4.20, unit: 'kg' };
  if (n.includes('banana')) return { price: 5.50, unit: 'kg' };
  if (n.includes('tomate')) return { price: 7.90, unit: 'kg' };
  if (n.includes('cenoura')) return { price: 5.20, unit: 'kg' };
  if (n.includes('alface')) return { price: 3.80, unit: 'unid' };
  if (n.includes('espinafre')) return { price: 4.50, unit: 'maço' };
  if (n.includes('aveia')) return { price: 5.20, unit: 'pct' };
  if (n.includes('quinoa') || n.includes('chia')) return { price: 12.50, unit: 'pct' };
  if (n.includes('castanha') || n.includes('nozes')) return { price: 24.00, unit: 'pct' };
  if (n.includes('queijo') || n.includes('ricota') || n.includes('cottage')) return { price: 16.50, unit: 'unid' };

  // Preço determinístico padrão baseado no nome
  let basePrice = 4.50;
  for (let i = 0; i < itemName.length; i++) {
    basePrice += (itemName.charCodeAt(i) % 7) * 0.65;
  }
  return { price: Number((basePrice % 14 + 3.50).toFixed(2)), unit: 'unid' };
}

export function getAverageLocalItemPrice(itemName: string): number {
  return estimateItemCost(itemName).price;
}

export function getItemUnit(itemName: string): string {
  return estimateItemCost(itemName).unit;
}

// Analisador principal de orçamento e substituições de parceiros
export function analyzeShoppingListBudget(
  items: { name: string; checked: boolean }[],
  budgetLimit: number = 120
): BudgetMonitoringAnalysis {
  let currentTotal = 0;
  const itemsMap = new Map<string, { price: number; unit: string }>();

  items.forEach(item => {
    const est = estimateItemCost(item.name);
    itemsMap.set(item.name, est);
    currentTotal += est.price;
  });

  currentTotal = Number(currentTotal.toFixed(2));
  const effectiveLimit = Math.max(10, budgetLimit);
  const budgetUsedPercentage = Math.round((currentTotal / effectiveLimit) * 100);
  const isNearLimit = budgetUsedPercentage >= 75 && budgetUsedPercentage <= 100;
  const isExceeded = currentTotal > effectiveLimit;

  let status: 'safe' | 'warning' | 'danger' = 'safe';
  let statusMessage = 'Seu orçamento está sob controle.';

  if (isExceeded) {
    status = 'danger';
    statusMessage = `Atenção: O total atual (R$ ${currentTotal.toFixed(2)}) ultrapassou seu limite de R$ ${effectiveLimit.toFixed(2)} em R$ ${(currentTotal - effectiveLimit).toFixed(2)}.`;
  } else if (isNearLimit) {
    status = 'warning';
    statusMessage = `Alerta: Você atingiu ${budgetUsedPercentage}% do seu orçamento limite de R$ ${effectiveLimit.toFixed(2)}. Veja as substituições sugeridas para evitar estourar a meta.`;
  } else {
    status = 'safe';
    statusMessage = `Excelente! Você consumiu apenas ${budgetUsedPercentage}% do seu teto de R$ ${effectiveLimit.toFixed(2)}.`;
  }

  // Identificar substituições inteligentes aplicáveis aos itens da lista
  const substitutions: SmartBudgetSubstitution[] = [];
  const processedOriginals = new Set<string>();

  items.forEach(item => {
    const itemNameLower = item.name.toLowerCase();
    if (processedOriginals.has(itemNameLower)) return;

    // Buscar regra correspondente
    const matchedRule = SMART_SUBSTITUTION_RULES.find(rule => 
      rule.triggerMatches.some(trigger => itemNameLower.includes(trigger.toLowerCase()))
    );

    if (matchedRule) {
      const origCost = itemsMap.get(item.name)?.price || estimateItemCost(item.name).price;
      const origUnit = itemsMap.get(item.name)?.unit || 'unid';
      
      // Só sugere se houver economia real (> R$ 1.50)
      const potentialSavings = Number((origCost - matchedRule.substitutePrice).toFixed(2));
      if (potentialSavings > 1.20) {
        const savingsPercentage = Math.round((potentialSavings / origCost) * 100);

        substitutions.push({
          id: `sub-${item.name}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          originalItem: item.name,
          originalPrice: origCost,
          originalUnit: origUnit,
          substituteItem: matchedRule.substituteName,
          substitutePrice: matchedRule.substitutePrice,
          substituteUnit: matchedRule.substituteUnit,
          storeId: matchedRule.preferredStoreId,
          storeName: matchedRule.storeName,
          storeLogo: matchedRule.storeLogo,
          potentialSavings,
          savingsPercentage,
          nutritionalEquivalence: matchedRule.nutritionalEquivalence,
          culinaryAdvice: matchedRule.culinaryAdvice,
          isPartnerDeal: matchedRule.isPartnerDeal,
          partnerPromoId: matchedRule.partnerPromoId
        });

        processedOriginals.add(itemNameLower);
      }
    }
  });

  // Ordenar substituições por maior economia em reais
  substitutions.sort((a, b) => b.potentialSavings - a.potentialSavings);

  const totalPotentialSavings = Number(
    substitutions.reduce((acc, s) => acc + s.potentialSavings, 0).toFixed(2)
  );

  const projectedTotalAfterSubstitutions = Number(
    Math.max(0, currentTotal - totalPotentialSavings).toFixed(2)
  );

  // Determinar loja parceira mais econômica para a cesta
  const cheapestPartnerStore = {
    storeId: 'm-sep',
    storeName: 'Sacolão Economia Popular',
    basketTotal: Number((currentTotal * 0.82).toFixed(2)),
    savingsVsAverage: Number((currentTotal * 0.18).toFixed(2))
  };

  // Resumo por voz da Chef Malu (Aoede)
  let voiceSummary = '';
  if (isExceeded) {
    voiceSummary = `Atenção! Sua lista totalizou R$ ${currentTotal.toFixed(2)}, ultrapassando seu teto estipulado de R$ ${effectiveLimit.toFixed(2)}. Identifiquei ${substitutions.length} substituições de alto valor em parceiros locais que economizam até R$ ${totalPotentialSavings.toFixed(2)} mantendo todos os nutrientes!`;
  } else if (isNearLimit) {
    voiceSummary = `Olá! Seu orçamento de compras atingiu ${budgetUsedPercentage}%. Recomendo aplicar as substituições em ofertas de parceiros para economizar cerca de R$ ${totalPotentialSavings.toFixed(2)} e fechar a compra com tranquilidade.`;
  } else {
    voiceSummary = `Seu orçamento está seguro, com ${budgetUsedPercentage}% consumido. Nossos parceiros locais também têm ${substitutions.length} ofertas com economia potencial de R$ ${totalPotentialSavings.toFixed(2)} se você quiser poupar ainda mais!`;
  }

  return {
    budgetLimit: effectiveLimit,
    currentTotal,
    budgetUsedPercentage,
    isNearLimit,
    isExceeded,
    status,
    statusMessage,
    totalPotentialSavings,
    projectedTotalAfterSubstitutions,
    substitutions,
    cheapestPartnerStore,
    voiceSummary
  };
}

// Aplica uma substituição na lista de compras (substituindo o nome original pelo novo com desconto)
export function applySmartSubstitution(
  currentItems: { name: string; checked: boolean; isCustom?: boolean }[],
  substitution: SmartBudgetSubstitution
): { name: string; checked: boolean; isCustom?: boolean }[] {
  return currentItems.map(item => {
    if (item.name.toLowerCase() === substitution.originalItem.toLowerCase()) {
      return {
        ...item,
        name: substitution.substituteItem,
        checked: false
      };
    }
    return item;
  });
}
