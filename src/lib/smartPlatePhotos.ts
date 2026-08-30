export interface SmartPlateFoodItem {
  name: string;
  category?: string;
  portion?: string;
  description?: string;
  image?: string;
}

// Curated high-resolution gastronomic food photography for restaurant & buffet dishes
export const SMART_PLATE_PHOTOS: Record<string, string[]> = {
  // Frango Grelhado & Aves
  frango_grelhado: [
    "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&q=80&w=900&h=700"
  ],
  // Carne Bovina & Grelhados
  carne_bovina: [
    "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&q=80&w=900&h=700"
  ],
  // Peixe & Frutos do Mar
  peixe_grelhado: [
    "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&q=80&w=900&h=700"
  ],
  // Ovos & Omeletes
  ovos: [
    "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1510693206972-df098062cb71?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&q=80&w=900&h=700"
  ],
  // Arroz (Integral / Branco / 7 Grãos)
  arroz: [
    "https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&q=80&w=900&h=700"
  ],
  // Feijão, Lentilha & Leguminosas
  feijao_leguminosas: [
    "https://images.unsplash.com/photo-1547496502-affa22d38842?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&q=80&w=900&h=700"
  ],
  // Batata Doce, Batatas Assadas & Mandioca
  tuberculos: [
    "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1628294895950-9805252327bc?auto=format&fit=crop&q=80&w=900&h=700"
  ],
  // Quinoa & Grãos Nobres
  quinoa_graos: [
    "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&q=80&w=900&h=700"
  ],
  // Saladas Verdes & Folhas Frescas
  salada_verde: [
    "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=900&h=700"
  ],
  // Legumes Grelhados / No Vapor / Brócolis
  legumes_vapor: [
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1592417817098-8f3d6910985b?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1568600891621-50f697b9a1c7?auto=format&fit=crop&q=80&w=900&h=700"
  ],
  // Massas & Risottos
  massas: [
    "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1621996346565-e3d5d6281699?auto=format&fit=crop&q=80&w=900&h=700"
  ],
  // Abacate & Azeite
  abacate_azeite: [
    "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=900&h=700"
  ],
  // Prato Completo Harmonioso (Fallback)
  prato_completo: [
    "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&q=80&w=900&h=700"
  ]
};

export const DEFAULT_PLATE_IMAGE = "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=900&h=700";

/**
 * Retorna uma foto gastronômica em alta resolução baseada no nome e categoria do alimento
 */
export function getSmartPlateFoodPhoto(foodName: string = '', index: number = 0): string {
  const text = (foodName || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Salmão e peixes
  if (text.includes("salmao") || text.includes("peixe") || text.includes("tilapia") || text.includes("atum") || text.includes("camarao") || text.includes("pescada") || text.includes("merluza") || text.includes("bacalhau")) {
    const list = SMART_PLATE_PHOTOS.peixe_grelhado;
    return list[index % list.length];
  }

  // Frango e aves
  if (text.includes("frango") || text.includes("peito") || text.includes("galinha") || text.includes("peru") || text.includes("sobrecoxa") || text.includes("ave")) {
    const list = SMART_PLATE_PHOTOS.frango_grelhado;
    return list[index % list.length];
  }

  // Carnes bovinas
  if (text.includes("carne") || text.includes("bife") || text.includes("alcatra") || text.includes("patinho") || text.includes("mignon") || text.includes("picanha") || text.includes("coxao") || text.includes("assado") || text.includes("churrasco") || text.includes("moida")) {
    const list = SMART_PLATE_PHOTOS.carne_bovina;
    return list[index % list.length];
  }

  // Ovos e omeletes
  if (text.includes("ovo") || text.includes("omelete") || text.includes("mexido") || text.includes("poche") || text.includes("cozido")) {
    const list = SMART_PLATE_PHOTOS.ovos;
    return list[index % list.length];
  }

  // Arroz
  if (text.includes("arroz") || text.includes("risoto") || text.includes("grao")) {
    const list = SMART_PLATE_PHOTOS.arroz;
    return list[index % list.length];
  }

  // Feijão e leguminosas
  if (text.includes("feijao") || text.includes("lentilha") || text.includes("grao de bico") || text.includes("ervilha")) {
    const list = SMART_PLATE_PHOTOS.feijao_leguminosas;
    return list[index % list.length];
  }

  // Batata, mandioca, aipim, purê
  if (text.includes("batata") || text.includes("mandioca") || text.includes("aipim") || text.includes("pure") || text.includes("inhame")) {
    const list = SMART_PLATE_PHOTOS.tuberculos;
    return list[index % list.length];
  }

  // Quinoa e cuscuz
  if (text.includes("quinoa") || text.includes("cuscuz") || text.includes("chia") || text.includes("aveia")) {
    const list = SMART_PLATE_PHOTOS.quinoa_graos;
    return list[index % list.length];
  }

  // Massas
  if (text.includes("macarrao") || text.includes("massa") || text.includes("espaguete") || text.includes("penne") || text.includes("nhoque")) {
    const list = SMART_PLATE_PHOTOS.massas;
    return list[index % list.length];
  }

  // Legumes, brócolis, cenoura, abobrinha
  if (text.includes("legume") || text.includes("brocolis") || text.includes("cenoura") || text.includes("abobrinha") || text.includes("couve-flor") || text.includes("berinjela") || text.includes("vapor") || text.includes("grelhado") || text.includes("beterraba") || text.includes("chuchu")) {
    const list = SMART_PLATE_PHOTOS.legumes_vapor;
    return list[index % list.length];
  }

  // Salada e folhas
  if (text.includes("salada") || text.includes("folha") || text.includes("alface") || text.includes("rucula") || text.includes("agriao") || text.includes("tomate") || text.includes("pepino") || text.includes("vinagrete") || text.includes("palmito")) {
    const list = SMART_PLATE_PHOTOS.salada_verde;
    return list[index % list.length];
  }

  // Abacate e azeite
  if (text.includes("abacate") || text.includes("azeite") || text.includes("castanha") || text.includes("noz") || text.includes("amendoim")) {
    const list = SMART_PLATE_PHOTOS.abacate_azeite;
    return list[index % list.length];
  }

  // Fallback
  const list = SMART_PLATE_PHOTOS.prato_completo;
  return list[index % list.length];
}

/**
 * Detecta a categoria nutricional baseada no nome do alimento
 */
export function inferFoodCategory(foodName: string = ''): { category: string; badgeColor: string } {
  const text = (foodName || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (text.includes("frango") || text.includes("carne") || text.includes("peixe") || text.includes("salmao") || text.includes("tilapia") || text.includes("ovo") || text.includes("bife") || text.includes("patinho") || text.includes("tofu") || text.includes("atum")) {
    return { category: "Proteína Principal", badgeColor: "bg-red-500/20 text-red-300 border-red-500/30" };
  }
  if (text.includes("arroz") || text.includes("batata") || text.includes("mandioca") || text.includes("aipim") || text.includes("pure") || text.includes("quinoa") || text.includes("macarrao") || text.includes("cuscuz")) {
    return { category: "Carboidrato Complexo", badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30" };
  }
  if (text.includes("feijao") || text.includes("lentilha") || text.includes("grao de bico")) {
    return { category: "Leguminosa & Fibras", badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" };
  }
  if (text.includes("salada") || text.includes("folha") || text.includes("alface") || text.includes("rucula") || text.includes("legume") || text.includes("brocolis") || text.includes("cenoura") || text.includes("tomate") || text.includes("abobrinha")) {
    return { category: "Vegetais & Fibras", badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" };
  }
  if (text.includes("azeite") || text.includes("abacate") || text.includes("castanha")) {
    return { category: "Gordura Saudável", badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30" };
  }

  return { category: "Acompanhamento", badgeColor: "bg-slate-500/20 text-slate-300 border-slate-500/30" };
}

/**
 * Normaliza qualquer item do recommendedPlate (seja string ou objeto) para SmartPlateFoodItem com imagem
 */
export function normalizeSmartPlateDish(item: string | SmartPlateFoodItem | any, index: number = 0): SmartPlateFoodItem {
  if (typeof item === 'string') {
    const photo = getSmartPlateFoodPhoto(item, index);
    const { category } = inferFoodCategory(item);
    return {
      name: item,
      category,
      image: photo
    };
  }

  const name = item?.name || String(item || 'Alimento');
  const photo = item?.image || getSmartPlateFoodPhoto(name, index);
  const category = item?.category || inferFoodCategory(name).category;
  const portion = item?.portion || undefined;
  const description = item?.description || undefined;

  return {
    name,
    category,
    portion,
    description,
    image: photo
  };
}
