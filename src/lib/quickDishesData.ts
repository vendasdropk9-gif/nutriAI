import { QuickDish, QuickDishGoal, UserProfile } from '../types';

// Curated high-resolution gastronomic food photography matching specific healthy dishes
export const QUICK_DISH_PHOTOS: Record<string, string[]> = {
  // Bowls & Fresh Salads
  bowl_frango: [
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=900&h=700"
  ],
  // Wraps & Rolls
  wrap_fit: [
    "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1528736235302-52922df5c122?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&q=80&w=900&h=700"
  ],
  // Omelettes & Eggs
  omelete: [
    "https://images.unsplash.com/photo-1510693206972-df098062cb71?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&q=80&w=900&h=700"
  ],
  // Muscle Gain Chicken / Steak & Rice
  frango_arroz: [
    "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=900&h=700"
  ],
  // Meat & Sweet Potato
  carne_batata: [
    "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?auto=format&fit=crop&q=80&w=900&h=700"
  ],
  // Protein Pancakes & Crepes
  panqueca_proteica: [
    "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1565299543923-37dd37887442?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1506084868230-bb9d95c24759?auto=format&fit=crop&q=80&w=900&h=700"
  ],
  // Quick Yogurts & Smoothie Bowls
  iogurte_frutas: [
    "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&q=80&w=900&h=700"
  ],
  // Protein Shakes & Smoothies
  shake_proteico: [
    "https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1494390248081-4e55172b3c99?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&q=80&w=900&h=700"
  ],
  // Avocado Toasts & Gourmet Sandwiches
  sanduiche_fit: [
    "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1567234669003-dce7a7a88821?auto=format&fit=crop&q=80&w=900&h=700"
  ],
  // Salmon & Seafood
  salmao_peixe: [
    "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&q=80&w=900&h=700"
  ]
};

export const DEFAULT_FALLBACK_IMAGE = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=900&h=700";

export const getRealisticDishPhoto = (dishName: string = '', description: string = '', index: number = 0): string => {
  const text = (dishName + " " + description).toLowerCase();
  
  if (text.includes("panqueca") || text.includes("crepioca") || text.includes("waffle") || text.includes("crepe")) {
    const list = QUICK_DISH_PHOTOS.panqueca_proteica;
    return list[index % list.length];
  }
  if (text.includes("shake") || text.includes("smoothie") || text.includes("vitamina") || text.includes("suco")) {
    const list = QUICK_DISH_PHOTOS.shake_proteico;
    return list[index % list.length];
  }
  if (text.includes("iogurte") || text.includes("overnight") || text.includes("aveia") || text.includes("parfait") || text.includes("bowl de frutas") || text.includes("chia")) {
    const list = QUICK_DISH_PHOTOS.iogurte_frutas;
    return list[index % list.length];
  }
  if (text.includes("wrap") || text.includes("tapioca") || text.includes("burrito") || text.includes("rolinho")) {
    const list = QUICK_DISH_PHOTOS.wrap_fit;
    return list[index % list.length];
  }
  if (text.includes("omelete") || text.includes("ovos") || text.includes("mexidos") || text.includes("fritada") || text.includes("shakshuka")) {
    const list = QUICK_DISH_PHOTOS.omelete;
    return list[index % list.length];
  }
  if (text.includes("salmão") || text.includes("peixe") || text.includes("tilápia") || text.includes("atum") || text.includes("camarão") || text.includes("ceviche")) {
    const list = QUICK_DISH_PHOTOS.salmao_peixe;
    return list[index % list.length];
  }
  if (text.includes("carne") || text.includes("patinho") || text.includes("alcatra") || text.includes("bife") || text.includes("músculo")) {
    const list = QUICK_DISH_PHOTOS.carne_batata;
    return list[index % list.length];
  }
  if (text.includes("sanduíche") || text.includes("toast") || text.includes("pão") || text.includes("abacate")) {
    const list = QUICK_DISH_PHOTOS.sanduiche_fit;
    return list[index % list.length];
  }
  if (text.includes("frango") || text.includes("arroz") || text.includes("purê") || text.includes("mandioca")) {
    const list = QUICK_DISH_PHOTOS.frango_arroz;
    return list[index % list.length];
  }
  if (text.includes("salada") || text.includes("bowl") || text.includes("legumes") || text.includes("quinoa")) {
    const list = QUICK_DISH_PHOTOS.bowl_frango;
    return list[index % list.length];
  }

  const fallbackList = [
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&q=80&w=900&h=700"
  ];
  return fallbackList[index % fallbackList.length];
};

// Rich curated dish library for guaranteed instant rendering anywhere (e.g. Vercel, offline, or API limit)
export const CURATED_DISHES_LIBRARY: Record<QuickDishGoal, QuickDish[]> = {
  weight_loss: [
    {
      id: "dish-wl-1",
      name: "Bowl Colorido de Frango Grelhado com Legumes e Quinoa Real",
      category: 'weight_loss',
      categoryLabel: 'Emagrecimento',
      description: "Rico em volume, micronutrientes e água para saciedade máxima com densidade calórica ultracontrolada.",
      prepTime: "15 min",
      portionSuggestion: "1 bowl farto individual (350g)",
      ingredients: [
        { name: "Peito de frango grelhado em tiras", amount: "130g" },
        { name: "Quinoa cozida ou arroz de couve-flor", amount: "3 colheres de sopa (60g)" },
        { name: "Tomatinhos cereja cortados ao meio", amount: "6 unidades" },
        { name: "Abobrinha e cenoura raladas", amount: "1 xícara cheia" },
        { name: "Mix de folhas verdes (rúcula e alface)", amount: "2 xícaras" },
        { name: "Azeite de oliva e limão siciliano", amount: "1 colher de chá (5ml)" }
      ],
      instructions: [
        "Grelhe as tiras de frango temperadas com sal, cúrcuma e pimenta-do-reino até ficarem bem douradas.",
        "Monte a base da tigela com as folhas verdes higienizadas e os vegetais ralados.",
        "Disponha a quinoa cozida de um lado e o frango grelhado do outro.",
        "Finalize com os tomatinhos cereja e regue com molho de azeite e suco de limão fresco."
      ],
      nutrition: {
        calories: 330,
        protein: 34,
        carbs: 24,
        fat: 10,
        fiber: 7
      },
      possibleSwaps: [
        "Troque o frango por camarões salteados ou tofu marinado grelhado.",
        "Substitua a quinoa por grão-de-bico cozido ou arroz integral."
      ],
      image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=900&h=700"
    },
    {
      id: "dish-wl-2",
      name: "Wrap Fit Integral de Frango Desfiado com Salada Crocante",
      category: 'weight_loss',
      categoryLabel: 'Emagrecimento',
      description: "Praticidade para levar ou comer rápido, com fibras abundantes que promovem mastigação e controle glicêmico.",
      prepTime: "10 min",
      portionSuggestion: "1 wrap duplo enrolado",
      ingredients: [
        { name: "Pão folha ou tortilha integral 100%", amount: "1 unidade (35g)" },
        { name: "Peito de frango cozido e desfiado", amount: "100g" },
        { name: "Cenoura ralada fininha", amount: "3 colheres de sopa" },
        { name: "Iogurte natural temperado com ervas e mostarda", amount: "2 colheres de sopa (30g)" },
        { name: "Alface americana crocante picada", amount: "1 xícara" }
      ],
      instructions: [
        "Misture o frango desfiado com o molho de iogurte e mostarda até ficar úmido e saboroso.",
        "Abra a tortilha integral em uma tábua plana.",
        "Coloque as folhas de alface e a cenoura ralada no centro.",
        "Cubra com a mistura de frango temperado, dobre as laterais e enrole bem apertado."
      ],
      nutrition: {
        calories: 280,
        protein: 28,
        carbs: 26,
        fat: 6,
        fiber: 5
      },
      possibleSwaps: [
        "Substitua o iogurte por homus (pasta de grão-de-bico) ou guacamole suave.",
        "Troque a tortilha por folhas grandes de acelga ou couve para versão zero carb."
      ],
      image: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&q=80&w=900&h=700"
    },
    {
      id: "dish-wl-3",
      name: "Omelete Proteico Gourmet com Vegetais Coloridos e Chia",
      category: 'weight_loss',
      categoryLabel: 'Emagrecimento',
      description: "Gorduras saudáveis na medida certa com colina e antioxidantes para um almoço leve ou jantar saciante.",
      prepTime: "12 min",
      portionSuggestion: "1 omelete médio recheado",
      ingredients: [
        { name: "Ovos caipiras", amount: "2 unidades inteiras" },
        { name: "Clara de ovo", amount: "1 unidade" },
        { name: "Tomate em cubinhos sem sementes", amount: "1/2 unidade" },
        { name: "Cogumelos paris ou palmito fatiado", amount: "1/2 xícara (50g)" },
        { name: "Cebolinha picada e orégano", amount: "1 colher de sopa" },
        { name: "Sementes de chia", amount: "1 colher de chá (5g)" }
      ],
      instructions: [
        "Bata os ovos e a clara com um garfo até espumar levemente, adicionando uma pitada de sal marinho e chia.",
        "Em uma frigideira antiaderente pré-aquecida, salteie os cogumelos e o tomate por 2 minutos.",
        "Despeje os ovos batidos sobre os vegetais, mantendo fogo baixo e tampando a frigideira.",
        "Quando a parte superior estiver firme, salpique a cebolinha, dobre ao meio e sirva quente."
      ],
      nutrition: {
        calories: 260,
        protein: 22,
        carbs: 8,
        fat: 15,
        fiber: 4
      },
      possibleSwaps: [
        "Adicione cubos de ricota fresca ou queijo minas frescal light.",
        "Adicione folhas de manjericão fresco para um toque aromático."
      ],
      image: "https://images.unsplash.com/photo-1510693206972-df098062cb71?auto=format&fit=crop&q=80&w=900&h=700"
    },
    {
      id: "dish-wl-4",
      name: "Salmão Grelhado com Aspargos Crocantes e Limão Siciliano",
      category: 'weight_loss',
      categoryLabel: 'Emagrecimento',
      description: "Rico em ômega-3 anti-inflamatório, estimula o metabolismo e proporciona queima calórica eficiente.",
      prepTime: "15 min",
      portionSuggestion: "1 posta individual (150g)",
      ingredients: [
        { name: "Filé de salmão fresco", amount: "130g" },
        { name: "Aspargos frescos ou vagens", amount: "6 a 8 talos" },
        { name: "Alho laminado e azeite", amount: "1 colher de chá" },
        { name: "Ervas finas e limão siciliano", amount: "A gosto" }
      ],
      instructions: [
        "Tempere o salmão com sal marinho, pimenta-do-reino e suco de limão siciliano.",
        "Aqueça uma frigideira em fogo médio e sele o salmão por 4 minutos com a pele para baixo.",
        "Vire suavemente e adicione os aspargos e o alho na mesma frigideira, salteando por mais 3 minutos.",
        "Sirva com rodelas de limão e ervas frescas."
      ],
      nutrition: {
        calories: 320,
        protein: 30,
        carbs: 6,
        fat: 18,
        fiber: 4
      },
      possibleSwaps: [
        "Substitua o salmão por filé de tilápia ou saint peter.",
        "Troque os aspargos por brócolis ou abobrinha em tiras."
      ],
      image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=900&h=700"
    },
    {
      id: "dish-wl-5",
      name: "Ceviche Refrescante de Tilápia com Abacate e Cebola Roxa",
      category: 'weight_loss',
      categoryLabel: 'Emagrecimento',
      description: "Prato sem cocção no fogo, ultraleve, refrescante e com proteínas puras marinadas no suco de limão.",
      prepTime: "12 min",
      portionSuggestion: "1 prato fundo individual (300g)",
      ingredients: [
        { name: "Filé de tilápia fresca em cubos", amount: "150g" },
        { name: "Suco de limão taiti fresco", amount: "3 unidades" },
        { name: "Cebola roxa cortada em tiras finas", amount: "1/2 unidade" },
        { name: "Abacate firme em cubinhos", amount: "3 colheres de sopa (40g)" },
        { name: "Coentro fresco picado e pimenta dedo-de-moça", amount: "A gosto" }
      ],
      instructions: [
        "Coloque os cubos de peixe em uma tigela gelada com uma pitada de sal marinho.",
        "Despeje o suco de limão fresco e deixe marinar por 5 minutos na geladeira.",
        "Acrescente a cebola roxa, o coentro picado e os cubinhos de abacate delicadamente.",
        "Sirva imediatamente bem gelado."
      ],
      nutrition: {
        calories: 270,
        protein: 32,
        carbs: 7,
        fat: 12,
        fiber: 4
      },
      possibleSwaps: [
        "Troque a tilápia por atum fresco ou camarões cozidos.",
        "Se não gostar de coentro, use salsa fresca picada."
      ],
      image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=900&h=700"
    },
    {
      id: "dish-wl-6",
      name: "Shakshuka Express: Ovos Pochê em Molho Rústico de Tomates e Pimentões",
      category: 'weight_loss',
      categoryLabel: 'Emagrecimento',
      description: "Prato mediterrâneo reconfortante, rico em licopeno e proteínas que aquecem o metabolismo.",
      prepTime: "14 min",
      portionSuggestion: "1 frigideira individual",
      ingredients: [
        { name: "Ovos caipiras", amount: "2 unidades" },
        { name: "Tomates maduros pelados picados", amount: "1 xícara (150g)" },
        { name: "Pimentão vermelho em tiras", amount: "1/2 unidade" },
        { name: "Alho picado e cominho", amount: "1 pitada" },
        { name: "Folhas de manjericão fresco", amount: "1 punhado" }
      ],
      instructions: [
        "Refogue o alho e o pimentão com um fio de azeite por 3 minutos.",
        "Acrescente os tomates picados, o cominho e sal, deixando cozinhar até criar um molho espesso.",
        "Faça duas pequenas cavidades no molho e quebre os ovos dentro.",
        "Tampe a frigideira e cozinhe por 4 a 5 minutos até as claras ficarem firmes e a gema cremosa."
      ],
      nutrition: {
        calories: 240,
        protein: 16,
        carbs: 14,
        fat: 13,
        fiber: 5
      },
      possibleSwaps: [
        "Adicione queijo de cabra ou feta por cima para mais cremosidade.",
        "Acrescente espinafre picado ao molho de tomate."
      ],
      image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&q=80&w=900&h=700"
    }
  ],

  muscle_gain: [
    {
      id: "dish-mg-1",
      name: "Frango Grelhado Suculento com Arroz Integral e Brócolis",
      category: 'muscle_gain',
      categoryLabel: 'Ganho de Massa',
      description: "Combinação clássica e poderosa para hipertrofia, rica em aminoácidos essenciais e carboidratos de liberação gradual.",
      prepTime: "20 min",
      portionSuggestion: "1 prato generoso (380g)",
      ingredients: [
        { name: "Peito de frango temperado", amount: "170g" },
        { name: "Arroz integral cozido", amount: "1 xícara cheia (140g)" },
        { name: "Brócolis frescos no vapor", amount: "1 xícara e meia (120g)" },
        { name: "Azeite de oliva extra virgem", amount: "1 colher de sobremesa (10ml)" },
        { name: "Alho, ervas finas e páprica", amount: "A gosto" }
      ],
      instructions: [
        "Aqueça uma frigideira antiaderente com um fio de azeite e grelhe o frango por 4 a 5 minutos de cada lado até dourar.",
        "Cozinhe o brócolis no vapor por 4 minutos para manter a cor verde viva e os nutrientes crocantes.",
        "Monte o prato com o arroz integral quente, os filés suculentos e o brócolis temperado."
      ],
      nutrition: {
        calories: 520,
        protein: 46,
        carbs: 52,
        fat: 14,
        fiber: 6
      },
      possibleSwaps: [
        "Substitua o arroz integral por batata-doce assada ou mandioca cozida.",
        "Troque o frango por filé de tilápia ou patinho moído magro."
      ],
      image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&q=80&w=900&h=700"
    },
    {
      id: "dish-mg-2",
      name: "Sanduíche Hiperproteico de Frango com Abacate",
      category: 'muscle_gain',
      categoryLabel: 'Ganho de Massa',
      description: "Energia densa e gorduras boas com alta carga proteica para construção muscular imediata e saciedade prolongada.",
      prepTime: "10 min",
      portionSuggestion: "1 sanduíche duplo completo",
      ingredients: [
        { name: "Pão 100% integral com grãos", amount: "2 fatias" },
        { name: "Frango desfiado temperado", amount: "130g" },
        { name: "Abacate maduro amassado", amount: "2 colheres de sopa (40g)" },
        { name: "Queijo cottage ou ricota cremosa", amount: "2 colheres de sopa (30g)" },
        { name: "Folhas de rúcula fresca e tomate em rodelas", amount: "A gosto" }
      ],
      instructions: [
        "Em uma tigela, misture o frango desfiado com o cottage e o abacate amassado até formar uma pasta cremosa.",
        "Aqueça levemente as fatias de pão integral na torradeira ou frigideira.",
        "Espalhe a pasta proteica generosamente sobre uma fatia.",
        "Adicione as rodelas de tomate, a rúcula fresca e feche com a outra fatia."
      ],
      nutrition: {
        calories: 480,
        protein: 38,
        carbs: 42,
        fat: 18,
        fiber: 7
      },
      possibleSwaps: [
        "Troque o frango desfiado por atum sólido em água ou ovos cozidos picados.",
        "Substitua o pão por wrap integral tipo tortilha."
      ],
      image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&q=80&w=900&h=700"
    },
    {
      id: "dish-mg-3",
      name: "Panqueca Proteica Dourada de Aveia e Banana",
      category: 'muscle_gain',
      categoryLabel: 'Ganho de Massa',
      description: "Opção anabólica e naturalmente adocicada, perfeita para pré ou pós-treino com ótima proporção de glicogênio e proteína.",
      prepTime: "12 min",
      portionSuggestion: "2 panquecas médias empilhadas",
      ingredients: [
        { name: "Ovos inteiros", amount: "2 unidades" },
        { name: "Clara de ovo", amount: "2 unidades" },
        { name: "Farinha ou farelo de aveia", amount: "4 colheres de sopa (40g)" },
        { name: "Banana madura", amount: "1 unidade média" },
        { name: "Canela em pó e essência de baunilha", amount: "1 pitada" },
        { name: "Pasta de amendoim integral", amount: "1 colher de sobremesa (15g)" }
      ],
      instructions: [
        "Em um prato fundo, amasse a banana com um garfo.",
        "Adicione os ovos, as claras, a aveia, a canela e a baunilha, batendo bem até homogeneizar.",
        "Despeje metade da massa em uma frigideira antiaderente untada em fogo baixo.",
        "Vire quando dourar por baixo e repita. Sirva com a pasta de amendoim por cima."
      ],
      nutrition: {
        calories: 440,
        protein: 29,
        carbs: 48,
        fat: 15,
        fiber: 6
      },
      possibleSwaps: [
        "Adicione 1 scoop de whey protein na massa para elevar a proteína para 45g.",
        "Substitua a banana por purê de maçã ou maçã ralada."
      ],
      image: "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&q=80&w=900&h=700"
    },
    {
      id: "dish-mg-4",
      name: "Bife de Alcatra Grelhado com Purê Rústico de Mandioquinha",
      category: 'muscle_gain',
      categoryLabel: 'Ganho de Massa',
      description: "Proteína vermelha de altíssimo valor biológico, rica em creatina natural, ferro heme e zinco para força e hipertrofia.",
      prepTime: "18 min",
      portionSuggestion: "1 prato substancial (400g)",
      ingredients: [
        { name: "Bife de alcatra ou patinho magro", amount: "160g" },
        { name: "Mandioquinha (batata-baroa) cozida", amount: "150g" },
        { name: "Leite desnatado ou vegetal para o purê", amount: "3 colheres de sopa" },
        { name: "Mix de legumes assados (cenoura e vagem)", amount: "1 xícara" },
        { name: "Manteiga ghee e alecrim", amount: "1 colher de chá" }
      ],
      instructions: [
        "Amasse a mandioquinha cozida com o leite quente e sal até formar um purê macio.",
        "Aqueça a frigideira em fogo alto com a manteiga ghee e o alecrim.",
        "Sele o bife por 3 minutos de cada lado para manter a suculência e o ponto ideal.",
        "Monte o prato com o bife fatiado sobre o purê e acompanhe os legumes."
      ],
      nutrition: {
        calories: 540,
        protein: 44,
        carbs: 46,
        fat: 18,
        fiber: 6
      },
      possibleSwaps: [
        "Troque a mandioquinha por batata-doce ou arroz negro.",
        "Substitua o bife por lombo suíno magro grelhado."
      ],
      image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=900&h=700"
    },
    {
      id: "dish-mg-5",
      name: "Pasta Integral com Frango Cremoso ao Molho de Castanhas",
      category: 'muscle_gain',
      categoryLabel: 'Ganho de Massa',
      description: "Carboidratos densos com fonte nobre de aminoácidos, perfeito para refeições pós-treino intenso de pernas.",
      prepTime: "15 min",
      portionSuggestion: "1 prato fundo generoso (380g)",
      ingredients: [
        { name: "Macarrão penne ou espaguete integral cozido", amount: "120g" },
        { name: "Cubos de peito de frango dourados", amount: "150g" },
        { name: "Creme de castanha de caju ou ricota", amount: "3 colheres de sopa" },
        { name: "Tomates secos e folhas de manjericão", amount: "2 colheres de sopa" },
        { name: "Alho picado e azeite", amount: "1 colher de chá" }
      ],
      instructions: [
        "Salteie os cubos de frango com alho no azeite até ficarem suculentos e dourados.",
        "Adicione o creme de castanha, o tomate seco e 2 colheres da água do cozimento da massa.",
        "Junte o macarrão integral cozido al dente e envolva tudo no molho cremoso.",
        "Finalize com folhas de manjericão fresco e sirva fumegante."
      ],
      nutrition: {
        calories: 560,
        protein: 48,
        carbs: 58,
        fat: 16,
        fiber: 8
      },
      possibleSwaps: [
        "Use massa de grão-de-bico para ainda mais proteínas e fibras.",
        "Troque o frango por carne moída de patinho com molho rústico."
      ],
      image: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&q=80&w=900&h=700"
    }
  ],

  quick_fit_snack: [
    {
      id: "dish-qf-1",
      name: "Bowl de Iogurte Grego com Frutas Vermelhas e Sementes",
      category: 'quick_fit_snack',
      categoryLabel: 'Lanches Rápidos',
      description: "Proteína de digestão balanceada com antioxidantes e fibras crocantes, pronto em menos de 5 minutos.",
      prepTime: "5 min",
      portionSuggestion: "1 taça ou tigela individual (220g)",
      ingredients: [
        { name: "Iogurte grego natural ou desnatado", amount: "1 pote (150g)" },
        { name: "Morangos ou mirtilos frescos", amount: "1/2 xícara (60g)" },
        { name: "Sementes de chia", amount: "1 colher de sopa (10g)" },
        { name: "Castanha-do-pará picada", amount: "2 unidades (10g)" },
        { name: "Mel puro ou canela", amount: "1 fio opcional" }
      ],
      instructions: [
        "Coloque o iogurte grego gelado na base de uma tigela funda.",
        "Distribua os morangos frescos picados em metade do bowl.",
        "Polvilhe as sementes de chia e as castanhas picadas para dar crocância.",
        "Finalize com uma pitada de canela em pó e saboreie imediatamente."
      ],
      nutrition: {
        calories: 230,
        protein: 19,
        carbs: 22,
        fat: 8,
        fiber: 5
      },
      possibleSwaps: [
        "Substitua as frutas vermelhas por kiwi, mirtilos ou banana em rodelas.",
        "Use sementes de abóbora ou amêndoas laminadas no lugar das castanhas."
      ],
      image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&q=80&w=900&h=700"
    },
    {
      id: "dish-qf-2",
      name: "Wrap Expresso de Ovos Mexidos com Ricota e Espinafre",
      category: 'quick_fit_snack',
      categoryLabel: 'Lanches Rápidos',
      description: "Lanche morno e aconchegante, feito rapidamente na frigideira com excelente equilíbrio de aminoácidos e ferro.",
      prepTime: "8 min",
      portionSuggestion: "1 wrap enrolado aquecido",
      ingredients: [
        { name: "Tortilha ou wrap integral", amount: "1 unidade (40g)" },
        { name: "Ovos caipiras", amount: "2 unidades" },
        { name: "Folhas de espinafre baby", amount: "1 xícara" },
        { name: "Creme de ricota light", amount: "1 colher de sopa cheia (25g)" },
        { name: "Azeite e orégano", amount: "A gosto" }
      ],
      instructions: [
        "Bata ligeiramente os dois ovos com uma pitada de sal e orégano.",
        "Em fogo médio, refogue o espinafre na frigideira com um fio de azeite até murchar (1 min).",
        "Adicione os ovos batidos e mexa suavemente até ficarem macios e cremosos.",
        "Aqueça o wrap por 30 segundos, espalhe o creme de ricota, adicione os ovos mexidos e enrole firmemente."
      ],
      nutrition: {
        calories: 290,
        protein: 20,
        carbs: 24,
        fat: 12,
        fiber: 4
      },
      possibleSwaps: [
        "Troque a tortilha por folha de couve manteiga crua para versão low carb extrema.",
        "Adicione cubos de tomate fresco ou tiras de peito de peru."
      ],
      image: "https://images.unsplash.com/photo-1528736235302-52922df5c122?auto=format&fit=crop&q=80&w=900&h=700"
    },
    {
      id: "dish-qf-3",
      name: "Smoothie Cremoso de Banana, Cacau Puro e Pasta de Amendoim",
      category: 'quick_fit_snack',
      categoryLabel: 'Lanches Rápidos',
      description: "Bebida energética aveludada com sabor marcante de sobremesa, porém 100% nutritiva e sem adição de açúcares refinados.",
      prepTime: "5 min",
      portionSuggestion: "1 copo grande (350ml)",
      ingredients: [
        { name: "Banana congelada em rodelas", amount: "1 unidade média" },
        { name: "Leite vegetal (amêndoa/aveia) ou desnatado", amount: "200ml" },
        { name: "Cacau em pó 100% puro", amount: "1 colher de sopa cheia (10g)" },
        { name: "Pasta de amendoim pura", amount: "1 colher de sobremesa (15g)" },
        { name: "Gelo e canela", amount: "A gosto" }
      ],
      instructions: [
        "Coloque o leite e a banana congelada no liquidificador.",
        "Adicione o cacau puro, a pasta de amendoim e 3 pedras de gelo.",
        "Bata na velocidade máxima por 60 a 90 segundos até atingir consistência densa e cremosa.",
        "Despeje no copo, polvilhe canela e beba geladinho."
      ],
      nutrition: {
        calories: 270,
        protein: 10,
        carbs: 38,
        fat: 10,
        fiber: 6
      },
      possibleSwaps: [
        "Adicione 1 dose de proteína vegetal ou whey de chocolate para elevar a proteína para 30g.",
        "Substitua a banana por abacate e adoçante natural se preferir low carb."
      ],
      image: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&q=80&w=900&h=700"
    },
    {
      id: "dish-qf-4",
      name: "Toast Integral com Abacate Amassado, Ovos Mexidos e Gergelim",
      category: 'quick_fit_snack',
      categoryLabel: 'Lanches Rápidos',
      description: "Clássico cafezeiro fitness que combina gorduras nobres e proteínas para saciedade prolongada.",
      prepTime: "7 min",
      portionSuggestion: "2 fatias de toast crocantes",
      ingredients: [
        { name: "Pão de fermentação natural ou integral", amount: "2 fatias" },
        { name: "Abacate maduro amassado", amount: "3 colheres de sopa (50g)" },
        { name: "Ovos caipiras mexidos", amount: "2 unidades" },
        { name: "Sementes de gergelim preto e flocos de pimenta", amount: "1 colher de café" },
        { name: "Gotas de limão e azeite", amount: "A gosto" }
      ],
      instructions: [
        "Toste as fatias de pão até ficarem bem douradas e crocantes.",
        "Amasse o abacate com um garfo, sal e gotinhas de limão fresco.",
        "Prepare os ovos mexidos cremosos na frigideira com uma pitada de azeite.",
        "Espalhe o abacate nas torradas, acomode os ovos mexidos por cima e salpique gergelim."
      ],
      nutrition: {
        calories: 340,
        protein: 18,
        carbs: 28,
        fat: 19,
        fiber: 6
      },
      possibleSwaps: [
        "Substitua o ovo por pasta de grão-de-bico ou fatias de queijo minas.",
        "Adicione tomatinhos cereja cortados por cima."
      ],
      image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&q=80&w=900&h=700"
    },
    {
      id: "dish-qf-5",
      name: "Crepioca Crocante Recheada com Queijo Cottage e Tomate Seco",
      category: 'quick_fit_snack',
      categoryLabel: 'Lanches Rápidos',
      description: "Massa leve de tapioca com ovo, crocante por fora e macia por dentro, rica em cálcio e saciedade.",
      prepTime: "6 min",
      portionSuggestion: "1 crepioca média dobrada",
      ingredients: [
        { name: "Goma de tapioca hidratada", amount: "2 colheres de sopa (30g)" },
        { name: "Ovo caipira", amount: "1 unidade inteira" },
        { name: "Queijo cottage ou ricota cremosa", amount: "2 colheres de sopa cheias (40g)" },
        { name: "Tomate picadinho e orégano", amount: "2 colheres de sopa" },
        { name: "Sementes de chia", amount: "1 colher de chá" }
      ],
      instructions: [
        "Bata o ovo com a goma de tapioca, a chia e uma pitada de sal com um garfo.",
        "Despeje em uma frigideira antiaderente pré-aquecida em fogo baixo.",
        "Quando a borda soltar, vire para dourar o outro lado.",
        "Recheie com o queijo cottage, o tomate e o orégano, dobre ao meio e sirva quente."
      ],
      nutrition: {
        calories: 250,
        protein: 17,
        carbs: 22,
        fat: 10,
        fiber: 3
      },
      possibleSwaps: [
        "Recheie com frango desfiado ou atum.",
        "Adicione folhas de manjericão fresco ao recheio."
      ],
      image: "https://images.unsplash.com/photo-1506084868230-bb9d95c24759?auto=format&fit=crop&q=80&w=900&h=700"
    }
  ]
};

export const getClientFallbackQuickDishes = (
  goal: QuickDishGoal = 'weight_loss',
  profile: UserProfile | null = null,
  previousDishes: string[] = []
): QuickDish[] => {
  const library = CURATED_DISHES_LIBRARY[goal] || CURATED_DISHES_LIBRARY.weight_loss;
  
  // Exclude previously shown dishes if possible to give fresh rotation
  const prevSet = new Set(previousDishes.map(d => d.toLowerCase().trim()));
  let available = library.filter(d => !prevSet.has(d.name.toLowerCase().trim()));
  
  if (available.length < 3) {
    available = [...library];
  }

  // Shuffle or select 3
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 3);

  // Return fresh copies with unique IDs and ensured photo URLs
  return selected.map((dish, idx) => ({
    ...dish,
    id: `quick-dish-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
    image: dish.image || getRealisticDishPhoto(dish.name, dish.description, idx)
  }));
};
