import { safeGet, safeSet } from './storage';
import { Recipe } from '../types';

export const OFFLINE_RECIPES_STORAGE_KEY = 'nutri_offline_recipes';

export interface SavedOfflineRecipe extends Recipe {
  savedAt: string;
  isCustomSaved?: boolean;
}

/**
 * Retorna todas as receitas salvas para acesso offline no dispositivo
 */
export function getOfflineRecipes(): SavedOfflineRecipe[] {
  try {
    const raw = safeGet(OFFLINE_RECIPES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    
    // Filtra itens inválidos garantindo estrutura mínima de receita
    return parsed.filter((item): item is SavedOfflineRecipe => (
      item &&
      typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      Array.isArray(item.ingredients) &&
      Array.isArray(item.instructions)
    ));
  } catch (err) {
    console.warn('Erro ao carregar receitas offline:', err);
    return [];
  }
}

/**
 * Verifica se uma receita específica já está salva para acesso offline
 */
export function isRecipeSavedOffline(recipeId: string, recipeName?: string): boolean {
  if (!recipeId && !recipeName) return false;
  const list = getOfflineRecipes();
  return list.some(r => (
    (recipeId && r.id === recipeId) ||
    (recipeName && r.name.trim().toLowerCase() === recipeName.trim().toLowerCase())
  ));
}

/**
 * Salva uma receita completa (com passos e ingredientes) no armazenamento offline do navegador
 */
export function saveRecipeOffline(recipe: Recipe): boolean {
  if (!recipe || !recipe.id || !recipe.name) return false;

  try {
    const list = getOfflineRecipes();
    // Remove versão anterior se já existia para atualizar
    const filtered = list.filter(r => r.id !== recipe.id && r.name !== recipe.name);

    const offlineItem: SavedOfflineRecipe = {
      ...recipe,
      savedAt: new Date().toISOString()
    };

    filtered.unshift(offlineItem);
    safeSet(OFFLINE_RECIPES_STORAGE_KEY, JSON.stringify(filtered));

    // Notifica outros componentes
    window.dispatchEvent(new CustomEvent('app:offline-recipes-updated', {
      detail: { recipeId: recipe.id, recipeName: recipe.name, action: 'save', total: filtered.length }
    }));

    window.dispatchEvent(new CustomEvent('app:notification', {
      detail: {
        title: "Salvo para Offline! 📶",
        message: `"${recipe.name}" e seu passo a passo completo agora estão disponíveis sem internet.`,
        type: "success"
      }
    }));

    return true;
  } catch (err) {
    console.error('Falha ao salvar receita offline:', err);
    return false;
  }
}

/**
 * Remove uma receita do armazenamento offline
 */
export function removeRecipeOffline(recipeId: string, recipeName?: string): boolean {
  try {
    const list = getOfflineRecipes();
    const filtered = list.filter(r => {
      if (recipeId && r.id === recipeId) return false;
      if (recipeName && r.name.trim().toLowerCase() === recipeName.trim().toLowerCase()) return false;
      return true;
    });

    safeSet(OFFLINE_RECIPES_STORAGE_KEY, JSON.stringify(filtered));

    window.dispatchEvent(new CustomEvent('app:offline-recipes-updated', {
      detail: { recipeId, recipeName, action: 'remove', total: filtered.length }
    }));

    window.dispatchEvent(new CustomEvent('app:notification', {
      detail: {
        title: "Removido do Offline",
        message: "A receita foi removida do armazenamento offline.",
        type: "info"
      }
    }));

    return true;
  } catch (err) {
    console.error('Falha ao remover receita offline:', err);
    return false;
  }
}

/**
 * Alterna estado de salvar/remover do armazenamento offline
 */
export function toggleRecipeOffline(recipe: Recipe): boolean {
  if (isRecipeSavedOffline(recipe.id, recipe.name)) {
    removeRecipeOffline(recipe.id, recipe.name);
    return false;
  } else {
    saveRecipeOffline(recipe);
    return true;
  }
}

/**
 * Exporta receita completa para texto formatado (ideal para salvar como nota ou imprimir)
 */
export function formatRecipeToPlainText(recipe: Recipe): string {
  const parts: string[] = [
    `=== ${recipe.name.toUpperCase()} ===`,
    `Descrição: ${recipe.description || 'Sem descrição'}`,
    `Tempo de Preparo: ${recipe.prepTime || 'N/A'}`,
    `Calorias: ${recipe.nutrition?.calories || 0} kcal | Proteínas: ${recipe.nutrition?.protein || 0}g | Carbs: ${recipe.nutrition?.carbs || 0}g | Gorduras: ${recipe.nutrition?.fat || 0}g`,
    '',
    '--- INGREDIENTES ---',
    ...(recipe.ingredients || []).map((ing, i) => `[ ] ${i + 1}. ${ing}`),
    '',
    '--- MODO DE PREPARO (PASSO A PASSO) ---',
    ...(recipe.instructions || []).map((step, i) => `Passo ${i + 1}: ${step}`),
    '',
    `Salvo via NutriAI em ${new Date().toLocaleDateString('pt-BR')}`
  ];

  return parts.join('\n');
}
