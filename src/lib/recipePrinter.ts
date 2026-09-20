/**
 * Recipe Printer Utility for NutriAI
 * Generates an elegant, ink-saving, clean printable HTML layout and triggers the browser's print dialog.
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
  [key: string]: any;
};

export function generatePrintableRecipeHtml(
  recipe: PrintableRecipeInput,
  options?: PrintableRecipeOptions
): string {
  const title = escapeHtml(recipe.name || recipe.title || 'Receita Saudável');
  const description = escapeHtml(recipe.description || '');
  const prepTime = escapeHtml(recipe.prepTime || '30 min');
  const difficulty = escapeHtml(recipe.difficulty || '');
  const category = escapeHtml(options?.category || recipe.category || '');
  const chefTip = escapeHtml(options?.chefTip || recipe.chefTips || '');

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
  const calories = recipe.nutrition?.calories ?? recipe.calories ?? 0;
  const protein = recipe.nutrition?.protein ?? recipe.protein ?? 0;
  const carbs = recipe.nutrition?.carbs ?? recipe.carbs ?? 0;
  const fat = recipe.nutrition?.fat ?? recipe.fat ?? 0;
  const fiber = recipe.nutrition?.fiber ?? 0;

  const nowFormatted = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date());

  const imageSrc = recipe.imageUrl || recipe.image;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title} - NutriAI</title>
  <style>
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
      color: #1e293b;
      background: #ffffff;
      line-height: 1.45;
      font-size: 10.5pt;
      padding: 0;
    }
    .print-wrapper {
      max-width: 100%;
      margin: 0 auto;
    }
    
    /* Header Branding */
    .print-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #059669;
      padding-bottom: 8px;
      margin-bottom: 16px;
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
      font-size: 8.5pt;
      color: #64748b;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .print-date {
      font-size: 8.5pt;
      color: #64748b;
      text-align: right;
    }

    /* Recipe Main Meta */
    .recipe-hero {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 14px;
    }
    .recipe-hero-details {
      flex: 1;
    }
    .recipe-title {
      font-size: 20pt;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.15;
      margin-bottom: 6px;
    }
    .recipe-desc {
      font-size: 9.5pt;
      color: #475569;
      font-style: italic;
      line-height: 1.4;
      margin-bottom: 10px;
    }
    .recipe-hero-img {
      width: 130px;
      height: 95px;
      border-radius: 8px;
      object-fit: cover;
      border: 1px solid #cbd5e1;
      flex-shrink: 0;
    }

    /* Quick Badges */
    .meta-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 8.5pt;
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
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 16px;
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
      margin-bottom: 2px;
    }
    .nutri-val {
      font-size: 11pt;
      font-weight: 800;
      color: #0f172a;
    }

    /* Columns Layout for Ingredients & Prep */
    .recipe-grid {
      display: grid;
      grid-template-columns: 38% 62%;
      gap: 18px;
      margin-bottom: 14px;
    }
    .section-title {
      font-size: 11pt;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1.5px solid #059669;
      padding-bottom: 4px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .section-count {
      font-size: 8pt;
      color: #64748b;
      font-weight: 600;
      text-transform: none;
    }

    /* Ingredients List */
    .ingredients-list {
      list-style: none;
    }
    .ingredient-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 7px;
      font-size: 9pt;
      color: #334155;
      break-inside: avoid;
    }
    .ingredient-checkbox {
      width: 13px;
      height: 13px;
      border: 1.5px solid #64748b;
      border-radius: 3px;
      margin-top: 2px;
      flex-shrink: 0;
    }
    .ingredient-text {
      line-height: 1.35;
      font-weight: 500;
    }

    /* Preparation Steps */
    .instructions-list {
      list-style: none;
    }
    .instruction-step {
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
      break-inside: avoid;
    }
    .step-number {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #059669;
      color: #ffffff;
      font-weight: 800;
      font-size: 8.5pt;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .step-text {
      font-size: 9.5pt;
      color: #334155;
      line-height: 1.45;
    }

    /* Chef Tips Box */
    .chef-tip-box {
      margin-top: 10px;
      padding: 10px 14px;
      background: #f0fdf4;
      border: 1px dashed #059669;
      border-radius: 8px;
      break-inside: avoid;
    }
    .chef-tip-title {
      font-size: 8.5pt;
      font-weight: 800;
      color: #065f46;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    .chef-tip-text {
      font-size: 8.5pt;
      color: #166534;
      line-height: 1.4;
      font-style: italic;
    }

    /* Footer */
    .print-footer {
      margin-top: 18px;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 8pt;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="print-wrapper">
    <!-- Header -->
    <div class="print-header">
      <div>
        <div class="brand-title">Nutri<span class="brand-accent">AI</span></div>
        <div class="brand-tagline">Nutrição, Saúde & Receitas Inteligentes</div>
      </div>
      <div class="print-date">
        Impresso em: ${nowFormatted}
      </div>
    </div>

    <!-- Recipe Meta Hero -->
    <div class="recipe-hero">
      <div class="recipe-hero-details">
        <h1 class="recipe-title">${title}</h1>
        ${description ? `<p class="recipe-desc">${description}</p>` : ''}
        
        <div class="meta-badges">
          <span class="badge badge-primary">⏱️ Tempo: ${prepTime}</span>
          ${category ? `<span class="badge">📂 ${category}</span>` : ''}
          ${difficulty ? `<span class="badge">⭐ Dificuldade: ${difficulty}</span>` : ''}
          <span class="badge">🔥 ${calories} kcal</span>
          <span class="badge">💪 ${protein}g proteína</span>
        </div>
      </div>
      ${imageSrc ? `<img src="${imageSrc}" alt="${title}" class="recipe-hero-img" />` : ''}
    </div>

    <!-- Nutrition Values -->
    <div class="nutrition-strip">
      <div class="nutri-col">
        <span class="nutri-label">Calorias</span>
        <span class="nutri-val">${calories} <small style="font-size:7pt;">kcal</small></span>
      </div>
      <div class="nutri-col">
        <span class="nutri-label">Proteínas</span>
        <span class="nutri-val">${protein}g</span>
      </div>
      <div class="nutri-col">
        <span class="nutri-label">Carboidratos</span>
        <span class="nutri-val">${carbs}g</span>
      </div>
      <div class="nutri-col">
        <span class="nutri-label">Gorduras</span>
        <span class="nutri-val">${fat}g</span>
      </div>
      <div class="nutri-col">
        <span class="nutri-label">Fibras</span>
        <span class="nutri-val">${fiber}g</span>
      </div>
    </div>

    <!-- Main Grid: Ingredients + Instructions -->
    <div class="recipe-grid">
      <!-- Ingredients Column -->
      <div>
        <div class="section-title">
          <span>Ingredientes</span>
          <span class="section-count">(${ingredients.length} itens)</span>
        </div>
        <ul class="ingredients-list">
          ${ingredients.map((ing) => `
            <li class="ingredient-item">
              <div class="ingredient-checkbox"></div>
              <span class="ingredient-text">${escapeHtml(ing)}</span>
            </li>
          `).join('')}
        </ul>
      </div>

      <!-- Preparation Steps Column -->
      <div>
        <div class="section-title">
          <span>Modo de Preparo</span>
          <span class="section-count">(${instructions.length} passos)</span>
        </div>
        <ol class="instructions-list">
          ${instructions.map((step, idx) => `
            <li class="instruction-step">
              <div class="step-number">${idx + 1}</div>
              <div class="step-text">${escapeHtml(step)}</div>
            </li>
          `).join('')}
        </ol>

        ${chefTip ? `
          <div class="chef-tip-box">
            <div class="chef-tip-title">👨‍🍳 Dica do Chef Malu</div>
            <div class="chef-tip-text">${chefTip}</div>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- Footer -->
    <div class="print-footer">
      <span>Receita gerada pelo NutriAI • Sua assistente inteligente de nutrição</span>
      <span>www.nutriai.app • Bom apetite!</span>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Triggers the browser's native print dialog using an isolated print iframe,
 * falling back gracefully to window.print() if sandboxed.
 */
export function printRecipe(
  recipe: PrintableRecipeInput,
  options?: PrintableRecipeOptions
): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const html = generatePrintableRecipeHtml(recipe, options);

  // 1. Prepare print container in the main DOM for fallback
  let printContainer = document.getElementById('nutri-print-section');
  if (!printContainer) {
    printContainer = document.createElement('div');
    printContainer.id = 'nutri-print-section';
    printContainer.style.display = 'none';
    document.body.appendChild(printContainer);
  }
  printContainer.innerHTML = html;

  // 2. Create an isolated hidden iframe for clean printing
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
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    // Allow resources/styles to settle, then invoke print
    setTimeout(() => {
      try {
        iframe?.contentWindow?.focus();
        iframe?.contentWindow?.print();
      } catch (err) {
        console.warn('Iframe print restricted, triggering window.print() fallback:', err);
        fallbackWindowPrint();
      } finally {
        setTimeout(() => {
          if (iframe && iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 60000);
      }
    }, 250);
  } else {
    fallbackWindowPrint();
  }
}

function fallbackWindowPrint(): void {
  document.body.classList.add('printing-recipe-active');
  const cleanup = () => {
    document.body.classList.remove('printing-recipe-active');
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
  setTimeout(cleanup, 4000);
}
