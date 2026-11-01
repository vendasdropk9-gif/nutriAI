import { Recipe } from '../types';

/**
 * Codifica com segurança uma receita em base64 com suporte completo a caracteres UTF-8 (acentos em português).
 */
export function encodeRecipeForShareLink(recipe: Recipe): string {
  const payload = {
    id: recipe.id || `shared-${Date.now()}`,
    name: recipe.name || recipe.title || 'Receita Compartilhada',
    title: recipe.title || recipe.name || 'Receita Compartilhada',
    description: recipe.description || '',
    prepTime: recipe.prepTime || '20 min',
    difficulty: recipe.difficulty || 'Fácil',
    calories: recipe.calories ?? recipe.nutrition?.calories ?? 0,
    protein: recipe.protein ?? recipe.nutrition?.protein ?? 0,
    carbs: recipe.carbs ?? recipe.nutrition?.carbs ?? 0,
    fat: recipe.fat ?? recipe.nutrition?.fat ?? 0,
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
    nutrition: {
      calories: recipe.nutrition?.calories ?? recipe.calories ?? 0,
      protein: recipe.nutrition?.protein ?? recipe.protein ?? 0,
      carbs: recipe.nutrition?.carbs ?? recipe.carbs ?? 0,
      fat: recipe.nutrition?.fat ?? recipe.fat ?? 0,
      fiber: recipe.nutrition?.fiber ?? 0,
      sugar: recipe.nutrition?.sugar,
      vitamins: Array.isArray(recipe.nutrition?.vitamins) ? recipe.nutrition.vitamins : [],
      minerals: Array.isArray(recipe.nutrition?.minerals) ? recipe.nutrition.minerals : []
    },
    // Exclui base64 pesado de imagens locais para evitar exceder limite de tamanho de URLs de navegadores
    image: (recipe.image && !recipe.image.startsWith('data:')) ? recipe.image : undefined,
    imageUrl: (recipe.imageUrl && !recipe.imageUrl.startsWith('data:')) ? recipe.imageUrl : undefined,
    tags: Array.isArray(recipe.tags) ? recipe.tags : [],
    sharedAt: new Date().toISOString(),
    source: 'NutriAI'
  };

  const jsonStr = JSON.stringify(payload);
  const utf8Bytes = encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) => {
    return String.fromCharCode(parseInt(p1, 16));
  });

  return btoa(utf8Bytes);
}

/**
 * Decodifica o payload base64 da URL de volta para o objeto Recipe tipado.
 */
export function decodeRecipeFromShareLink(encodedStr: string): Recipe | null {
  if (!encodedStr || typeof encodedStr !== 'string') return null;

  try {
    let cleaned = decodeURIComponent(encodedStr.trim());
    cleaned = cleaned.replace(/-/g, '+').replace(/_/g, '/');
    while (cleaned.length % 4 !== 0) {
      cleaned += '=';
    }

    const binaryStr = atob(cleaned);
    const jsonStr = decodeURIComponent(
      Array.from(binaryStr)
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const data = JSON.parse(jsonStr);

    if (!data || typeof data !== 'object') return null;
    const name = data.name || data.title;
    if (!name || typeof name !== 'string') return null;

    const recipe: Recipe = {
      id: data.id || `imported-${Date.now()}`,
      name: name.trim(),
      title: data.title || name.trim(),
      description: typeof data.description === 'string' ? data.description : '',
      prepTime: typeof data.prepTime === 'string' ? data.prepTime : '20 min',
      difficulty: data.difficulty || 'Fácil',
      calories: Number(data.calories || data.nutrition?.calories || 0),
      protein: Number(data.protein || data.nutrition?.protein || 0),
      carbs: Number(data.carbs || data.nutrition?.carbs || 0),
      fat: Number(data.fat || data.nutrition?.fat || 0),
      ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
      instructions: Array.isArray(data.instructions) ? data.instructions : [],
      nutrition: {
        calories: Number(data.nutrition?.calories || data.calories || 0),
        protein: Number(data.nutrition?.protein || data.protein || 0),
        carbs: Number(data.nutrition?.carbs || data.carbs || 0),
        fat: Number(data.nutrition?.fat || data.fat || 0),
        fiber: Number(data.nutrition?.fiber || 0),
        sugar: data.nutrition?.sugar !== undefined ? Number(data.nutrition?.sugar) : undefined,
        vitamins: Array.isArray(data.nutrition?.vitamins) ? data.nutrition.vitamins : [],
        minerals: Array.isArray(data.nutrition?.minerals) ? data.nutrition.minerals : []
      },
      image: data.image || data.imageUrl,
      imageUrl: data.imageUrl || data.image,
      tags: Array.isArray(data.tags) ? data.tags : []
    };

    return recipe;
  } catch (err) {
    console.error('Falha ao decodificar receita compartilhada:', err);
    return null;
  }
}

/**
 * Constrói a URL completa e exclusiva de compartilhamento da refeição no NutriAI.
 */
export function generateRecipeShareUrl(recipe: Recipe): string {
  const b64 = encodeRecipeForShareLink(recipe);
  const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://nutri-ai.app';
  const pathname = typeof window !== 'undefined' && window.location.pathname ? window.location.pathname : '/';
  
  return `${origin}${pathname}?import_recipe=${encodeURIComponent(b64)}`;
}

/**
 * Copia a URL de compartilhamento para a área de transferência do usuário.
 */
export async function copyShareUrlToClipboard(url: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    }
    // Fallback para navegadores legados
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.warn('Não foi possível copiar URL:', err);
    return false;
  }
}

/**
 * Gera o link direto de compartilhamento via WhatsApp com mensagem formatada.
 */
export function generateWhatsAppShareUrl(url: string, recipeName: string, calories?: number): string {
  const calText = calories ? ` (${calories} kcal)` : '';
  const message = `🍽️ Veja esta receita que compartilhei no NutriAI: *${recipeName}*${calText}!\n\nAbra o link abaixo para importar e salvar direto no seu NutriAI com modo de preparo e macronutrientes completos:\n\n${url}`;
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}

/**
 * Verifica se a Web Share API nativa está disponível no dispositivo.
 */
export function canUseNativeShare(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.share;
}

/**
 * Executa o compartilhamento via Web Share API nativa do sistema operacional.
 */
export async function shareViaNativeShare(recipe: Recipe, shareUrl: string): Promise<boolean> {
  if (!canUseNativeShare()) return false;

  try {
    await navigator.share({
      title: `NutriAI: ${recipe.name}`,
      text: `Confira a receita "${recipe.name}" com ingredientes e modo de preparo no NutriAI!`,
      url: shareUrl
    });
    return true;
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      console.warn('Erro ao compartilhar nativamente:', err);
    }
    return false;
  }
}
