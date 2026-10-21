/**
 * Recipe Printer Utility for NutriAI
 * Generates an elegant, ink-saving, clean printable HTML layout adhering to the existing print CSS rules in index.css.
 */

import { Recipe, RecipePreparationTips } from '../types';

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface PrintableRecipeOptions {
  chefTip?: string;
  category?: string;
  servings?: string | number;
  showPhoto?: boolean;
  showNutrition?: boolean;
  showChefTip?: boolean;
  showIngredients?: boolean;
  showInstructions?: boolean;
  servingsMultiplier?: number;
}

export type PrintableRecipeInput = {
  id?: string;
  name?: string;
  title?: string;
  description?: string;
  prepTime?: string;
  difficulty?: string;
  category?: string;
  chefTips?: string;
  instructions?: string[];
  ingredients?: any[];
  nutrition?: any;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  imageUrl?: string;
  image?: string;
  tags?: string[];
  [key: string]: any;
};

/**
 * Returns the CSS styles for the printer-friendly recipe layout.
 * Mirrors and enforces the print rules defined in index.css.
 */
export function getRecipePrintCss(): string {
  return `
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print {
        display: none !important;
      }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.45;
      font-size: 10pt;
      padding: 0;
    }
    .print-wrapper {
      max-width: 100%;
      margin: 0 auto;
      background: #ffffff;
      color: #0f172a;
    }
    
    /* Header Branding */
    .print-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #059669;
      padding-bottom: 8px;
      margin-bottom: 14px;
    }
    .brand-title {
      font-size: 16pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .brand-accent {
      color: #059669;
    }
    .brand-tagline {
      font-size: 8pt;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .print-date {
      font-size: 8pt;
      color: #64748b;
      text-align: right;
    }

    /* Recipe Main Meta */
    .recipe-hero {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 12px;
    }
    .recipe-hero-details {
      flex: 1;
    }
    .recipe-title {
      font-size: 18pt;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
      margin-bottom: 6px;
    }
    .recipe-desc {
      font-size: 9pt;
      color: #475569;
      font-style: italic;
      line-height: 1.4;
      margin-bottom: 8px;
    }
    .recipe-hero-img {
      width: 125px;
      height: 90px;
      border-radius: 6px;
      object-fit: cover;
      border: 1px solid #cbd5e1;
      flex-shrink: 0;
    }

    /* Quick Badges */
    .meta-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 10px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2.5px 8px;
      border-radius: 6px;
      font-size: 8pt;
      font-weight: 700;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      color: #334155;
    }
    .badge-primary {
      background: #ecfdf5;
      border-color: #a7f3d0;
      color: #065f46;
    }

    /* Nutrition Bar */
    .nutrition-strip {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 6px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 10px;
      margin-bottom: 14px;
      break-inside: avoid;
    }
    .nutri-col {
      text-align: center;
    }
    .nutri-label {
      font-size: 7pt;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
      display: block;
      margin-bottom: 1px;
    }
    .nutri-val {
      font-size: 10.5pt;
      font-weight: 800;
      color: #0f172a;
    }

    /* Columns Layout for Ingredients & Prep */
    .recipe-grid {
      display: grid;
      grid-template-columns: 38% 62%;
      gap: 18px;
      margin-bottom: 12px;
    }
    .section-title {
      font-size: 10pt;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1.5px solid #059669;
      padding-bottom: 3px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .section-count {
      font-size: 7.5pt;
      color: #64748b;
      font-weight: 600;
      text-transform: none;
    }

    /* Ingredients List */
    .ingredients-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .ingredient-item {
      display: flex;
      align-items: flex-start;
      gap: 7px;
      margin-bottom: 6px;
      font-size: 8.5pt;
      color: #334155;
      break-inside: avoid;
    }
    .ingredient-checkbox {
      width: 12px;
      height: 12px;
      border: 1.5px solid #64748b;
      border-radius: 2px;
      margin-top: 1.5px;
      flex-shrink: 0;
      background: #ffffff;
    }
    .ingredient-text {
      line-height: 1.35;
      font-weight: 500;
    }

    /* Preparation Steps */
    .instructions-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .instruction-step {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
      break-inside: avoid;
    }
    .step-number {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #059669;
      color: #ffffff;
      font-weight: 800;
      font-size: 7.5pt;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .step-text {
      font-size: 8.5pt;
      color: #334155;
      line-height: 1.4;
    }

    /* Chef Tips Box */
    .chef-tip-box {
      margin-top: 8px;
      padding: 8px 12px;
      background: #f0fdf4;
      border: 1px dashed #059669;
      border-radius: 6px;
      break-inside: avoid;
    }
    .chef-tip-title {
      font-size: 7.5pt;
      font-weight: 800;
      color: #065f46;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .chef-tip-text {
      font-size: 8pt;
      color: #166534;
      line-height: 1.35;
      font-style: italic;
    }

    /* Footer */
    .print-footer {
      margin-top: 14px;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 7.5pt;
      color: #94a3b8;
      break-inside: avoid;
    }
  `;
}

/**
 * Generates the clean semantic HTML body fragment of the recipe.
 * Used for #nutri-print-section and the in-app preview modal.
 */
export function generatePrintableRecipeContentHtml(
  recipe: PrintableRecipeInput,
  options?: PrintableRecipeOptions
): string {
  const title = escapeHtml(recipe.name || recipe.title || 'Receita Saudável');
  const description = escapeHtml(recipe.description || '');
  const prepTime = escapeHtml(recipe.prepTime || '30 min');
  const difficulty = escapeHtml(recipe.difficulty || '');
  const category = escapeHtml(options?.category || recipe.category || '');
  const chefTip = escapeHtml(options?.chefTip || recipe.chefTips || '');
  const servings = options?.servings || recipe.servings;
  const showPhoto = options?.showPhoto !== false;
  const showNutrition = options?.showNutrition !== false;
  const showChefTip = options?.showChefTip !== false;
  const showIngredients = options?.showIngredients !== false;
  const showInstructions = options?.showInstructions !== false;
  const multiplier = options?.servingsMultiplier && options.servingsMultiplier > 0 ? options.servingsMultiplier : 1;

  // Normalize ingredients
  const rawIngredients: any[] = recipe.ingredients || [];
  const ingredients: string[] = rawIngredients.map((item) => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') {
      if (item.amount && item.name) return `${item.amount} de ${item.name}`;
      if (item.name) return item.name;
    }
    return String(item);
  });

  const instructions: string[] = recipe.instructions || [];

  // Nutrition values
  const calories = Math.round((recipe.nutrition?.calories ?? recipe.calories ?? 0) * multiplier);
  const protein = Math.round((recipe.nutrition?.protein ?? recipe.protein ?? 0) * multiplier);
  const carbs = Math.round((recipe.nutrition?.carbs ?? recipe.carbs ?? 0) * multiplier);
  const fat = Math.round((recipe.nutrition?.fat ?? recipe.fat ?? 0) * multiplier);
  const fiber = Math.round((recipe.nutrition?.fiber ?? 0) * multiplier);

  const nowFormatted = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date());

  const imageSrc = recipe.imageUrl || recipe.image;

  return `
  <div class="print-wrapper nutri-print-wrapper">
    <!-- Header -->
    <div class="print-header nutri-print-header">
      <div>
        <div class="brand-title nutri-print-brand">Nutri<span class="brand-accent nutri-print-accent">AI</span></div>
        <div class="brand-tagline nutri-print-tagline">Nutrição, Saúde & Receitas Inteligentes</div>
      </div>
      <div class="print-date nutri-print-date">
        Impresso em: ${nowFormatted}
      </div>
    </div>

    <!-- Recipe Meta Hero -->
    <div class="recipe-hero nutri-print-hero">
      <div class="recipe-hero-details nutri-print-hero-details">
        <h1 class="recipe-title nutri-print-title">${title}</h1>
        ${description ? `<p class="recipe-desc nutri-print-desc">${description}</p>` : ''}
        
        <div class="meta-badges nutri-print-badges">
          <span class="badge badge-primary nutri-print-badge nutri-print-badge-primary">⏱️ Tempo: ${prepTime}</span>
          ${servings ? `<span class="badge nutri-print-badge">🍽️ Rendimento: ${escapeHtml(String(servings))}${multiplier !== 1 ? ` (${multiplier}x)` : ''}</span>` : ''}
          ${category ? `<span class="badge nutri-print-badge">📂 ${category}</span>` : ''}
          ${difficulty ? `<span class="badge nutri-print-badge">⭐ Dificuldade: ${difficulty}</span>` : ''}
          <span class="badge nutri-print-badge">🔥 ${calories} kcal</span>
          <span class="badge nutri-print-badge">💪 ${protein}g proteína</span>
        </div>
      </div>
      ${showPhoto && imageSrc ? `<img src="${imageSrc}" alt="${title}" class="recipe-hero-img nutri-print-hero-img" />` : ''}
    </div>

    <!-- Nutrition Values -->
    ${showNutrition ? `
    <div class="nutrition-strip nutri-print-nutrition">
      <div class="nutri-col nutri-print-nutri-col">
        <span class="nutri-label nutri-print-nutri-label">Calorias</span>
        <span class="nutri-val nutri-print-nutri-val">${calories} <small style="font-size:7pt;">kcal</small></span>
      </div>
      <div class="nutri-col nutri-print-nutri-col">
        <span class="nutri-label nutri-print-nutri-label">Proteínas</span>
        <span class="nutri-val nutri-print-nutri-val">${protein}g</span>
      </div>
      <div class="nutri-col nutri-print-nutri-col">
        <span class="nutri-label nutri-print-nutri-label">Carboidratos</span>
        <span class="nutri-val nutri-print-nutri-val">${carbs}g</span>
      </div>
      <div class="nutri-col nutri-print-nutri-col">
        <span class="nutri-label nutri-print-nutri-label">Gorduras</span>
        <span class="nutri-val nutri-print-nutri-val">${fat}g</span>
      </div>
      <div class="nutri-col nutri-print-nutri-col">
        <span class="nutri-label nutri-print-nutri-label">Fibras</span>
        <span class="nutri-val nutri-print-nutri-val">${fiber}g</span>
      </div>
    </div>
    ` : ''}

    <!-- Main Grid: Ingredients + Instructions -->
    ${showIngredients || showInstructions ? `
    <div class="recipe-grid nutri-print-grid" ${!showIngredients || !showInstructions ? 'style="grid-template-columns: 100%;"' : ''}>
      <!-- Ingredients Column -->
      ${showIngredients ? `
      <div>
        <div class="section-title nutri-print-section-title">
          <span>Ingredientes</span>
          <span class="section-count nutri-print-section-count">(${ingredients.length} itens${multiplier !== 1 ? ` • ${multiplier}x` : ''})</span>
        </div>
        <ul class="ingredients-list nutri-print-list">
          ${ingredients.map((ing) => `
            <li class="ingredient-item nutri-print-ingredient-item">
              <div class="ingredient-checkbox nutri-print-checkbox"></div>
              <span class="ingredient-text">${escapeHtml(ing)}</span>
            </li>
          `).join('')}
        </ul>
      </div>
      ` : ''}

      <!-- Preparation Steps Column -->
      ${showInstructions ? `
      <div>
        <div class="section-title nutri-print-section-title">
          <span>Modo de Preparo</span>
          <span class="section-count nutri-print-section-count">(${instructions.length} passos)</span>
        </div>
        <ol class="instructions-list nutri-print-list">
          ${instructions.map((step, idx) => `
            <li class="instruction-step nutri-print-step-item">
              <div class="step-number nutri-print-step-number">${idx + 1}</div>
              <div class="step-text nutri-print-step-text">${escapeHtml(step)}</div>
            </li>
          `).join('')}
        </ol>

        ${showChefTip && chefTip ? `
          <div class="chef-tip-box nutri-print-tip-box">
            <div class="chef-tip-title nutri-print-tip-title">👨‍🍳 Dica do Chef Malu</div>
            <div class="chef-tip-text nutri-print-tip-text">${chefTip}</div>
          </div>
        ` : ''}
      </div>
      ` : ''}
    </div>
    ` : ''}

    <!-- Footer -->
    <div class="print-footer nutri-print-footer">
      <span>Receita gerada pelo NutriAI • Sua assistente inteligente de nutrição</span>
      <span>www.nutriai.app • Bom apetite!</span>
    </div>
  </div>
  `.trim();
}

/**
 * Generates a full standalone HTML document for iframe printing or exporting.
 */
export function generatePrintableRecipeHtml(
  recipe: PrintableRecipeInput,
  options?: PrintableRecipeOptions
): string {
  const title = escapeHtml(recipe.name || recipe.title || 'Receita Saudável');
  const bodyContent = generatePrintableRecipeContentHtml(recipe, options);
  const css = getRecipePrintCss();

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title} - NutriAI</title>
  <style>
    ${css}
  </style>
</head>
<body class="printing-recipe-active">
  <div id="nutri-print-section">
    ${bodyContent}
  </div>
</body>
</html>
  `.trim();
}

/**
 * Triggers clean recipe printing adhering directly to the print CSS rules in index.css.
 * Populates #nutri-print-section, applies body.printing-recipe-active, and invokes the browser print dialog.
 */
export function printRecipe(
  recipe: PrintableRecipeInput,
  options?: PrintableRecipeOptions
): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const contentHtml = generatePrintableRecipeContentHtml(recipe, options);

  // 1. Populate #nutri-print-section in the main DOM to strictly adhere to index.css
  let printContainer = document.getElementById('nutri-print-section');
  if (!printContainer) {
    printContainer = document.createElement('div');
    printContainer.id = 'nutri-print-section';
    document.body.appendChild(printContainer);
  }
  printContainer.innerHTML = contentHtml;

  // 2. Try printing through an isolated invisible iframe first (to avoid touching active UI if supported)
  const fullHtml = generatePrintableRecipeHtml(recipe, options);
  let iframe = document.getElementById('nutri-recipe-print-frame') as HTMLIFrameElement | null;
  if (iframe && iframe.parentNode) {
    iframe.parentNode.removeChild(iframe);
  }

  iframe = document.createElement('iframe');
  iframe.id = 'nutri-recipe-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
  iframe.style.zIndex = '-9999';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (iframeDoc) {
    try {
      iframeDoc.open();
      iframeDoc.write(fullHtml);
      iframeDoc.close();

      setTimeout(() => {
        try {
          iframe?.contentWindow?.focus();
          iframe?.contentWindow?.print();
        } catch (err) {
          console.warn('[RecipePrint] Iframe print restricted in sandbox, using fallbackWindowPrint:', err);
          fallbackWindowPrint();
        } finally {
          setTimeout(() => {
            if (iframe && iframe.parentNode) {
              iframe.parentNode.removeChild(iframe);
            }
          }, 60000);
        }
      }, 250);
      return;
    } catch (writeErr) {
      console.warn('[RecipePrint] Iframe write restricted, using fallbackWindowPrint:', writeErr);
    }
  }

  // 3. Fallback: Print using body.printing-recipe-active which directly activates index.css @media print rules
  fallbackWindowPrint();
}

/**
 * Activates body.printing-recipe-active and invokes window.print().
 * Completely adheres to @media print rules in index.css.
 */
function fallbackWindowPrint(): void {
  document.body.classList.add('printing-recipe-active');
  const cleanup = () => {
    document.body.classList.remove('printing-recipe-active');
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
  // Safe timeout to ensure cleanup runs even if afterprint is missed
  setTimeout(cleanup, 4000);
}
