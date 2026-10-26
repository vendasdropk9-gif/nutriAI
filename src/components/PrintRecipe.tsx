import React, { useState } from 'react';
import { Printer, Check, Copy } from 'lucide-react';
import { Recipe } from '../types';
import { 
  PrintableRecipeInput, 
  PrintableRecipeOptions, 
  printRecipe 
} from '../lib/recipePrinter';
import { PrintPreviewModal } from './PrintPreviewModal';
import { playSfx, vibrate } from '../lib/sensory';

export interface PrintRecipeProps {
  recipe: Recipe | PrintableRecipeInput;
  variant?: 'button' | 'icon' | 'badge' | 'secondary' | 'custom';
  className?: string;
  label?: string;
  servingsMultiplier?: number;
  showPreviewModal?: boolean;
  onPrint?: () => void;
  children?: React.ReactNode;
  id?: string;
  title?: string;
}

/**
 * Reusable Print Recipe Component.
 * Formats recipe details into a clean, printer-friendly layout using CSS print media queries
 * and attaches seamlessly to any recipe detail view.
 */
export const PrintRecipe: React.FC<PrintRecipeProps> = ({
  recipe,
  variant = 'button',
  className = '',
  label,
  servingsMultiplier = 1,
  showPreviewModal = true,
  onPrint,
  children,
  id,
  title = 'Imprimir receita para cozinha em folha limpa A4 ou salvar como PDF'
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const handleTrigger = (e: React.MouseEvent) => {
    e.stopPropagation();
    playSfx('tap');
    vibrate(15);

    if (showPreviewModal) {
      setIsPreviewOpen(true);
    } else {
      handleDirectPrint();
    }
  };

  const handleDirectPrint = () => {
    setIsPrinting(true);
    const options: PrintableRecipeOptions = {
      servingsMultiplier,
      showPhoto: true,
      showNutrition: true,
      showChefTip: true,
      showIngredients: true,
      showInstructions: true,
      category: (recipe as any).category,
      chefTip: (recipe as any).chefTips,
    };

    printRecipe(recipe, options);
    if (onPrint) onPrint();

    setTimeout(() => {
      setIsPrinting(false);
    }, 450);
  };

  // Base recipe ID for accessibility and query selectors
  const elementId = id || `print-recipe-btn-${recipe.id || 'current'}`;
  const displayLabel = label || (isPrinting ? 'Preparando...' : 'Imprimir Receita');

  // Render the appropriate trigger variant
  const renderTrigger = () => {
    if (children) {
      return (
        <span onClick={handleTrigger} className="inline-flex cursor-pointer" role="button" tabIndex={0}>
          {children}
        </span>
      );
    }

    switch (variant) {
      case 'icon':
        return (
          <button
            type="button"
            id={elementId}
            onClick={handleTrigger}
            disabled={isPrinting}
            title={title}
            className={`p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50 ${className}`}
          >
            <Printer className="w-4 h-4" />
          </button>
        );

      case 'badge':
        return (
          <button
            type="button"
            id={elementId}
            onClick={handleTrigger}
            disabled={isPrinting}
            title={title}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-100 transition-all cursor-pointer active:scale-95 ${className}`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{displayLabel}</span>
          </button>
        );

      case 'secondary':
        return (
          <button
            type="button"
            id={elementId}
            onClick={handleTrigger}
            disabled={isPrinting}
            title={title}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-95 shadow-xs ${className}`}
          >
            <Printer className="w-4 h-4 text-emerald-500" />
            <span>{displayLabel}</span>
          </button>
        );

      case 'custom':
        return (
          <button
            type="button"
            id={elementId}
            onClick={handleTrigger}
            disabled={isPrinting}
            className={className}
            title={title}
          >
            <Printer className="w-4 h-4" />
            <span>{displayLabel}</span>
          </button>
        );

      case 'button':
      default:
        return (
          <button
            type="button"
            id={elementId}
            onClick={handleTrigger}
            disabled={isPrinting}
            title={title}
            className={`flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold px-4 py-2 rounded-xl transition-all duration-300 cursor-pointer shadow-sm shadow-emerald-500/10 active:scale-95 disabled:opacity-50 ${className}`}
          >
            {isPrinting ? (
              <span className="w-4 h-4 border-2 border-emerald-600 dark:border-emerald-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            )}
            <span>{displayLabel}</span>
          </button>
        );
    }
  };

  return (
    <>
      {/* Print CSS Media Queries */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          
          /* Hide all application chrome and UI non-print elements */
          body > *:not(#nutri-print-section):not(.print-recipe-portal) {
            display: none !important;
          }
          
          .no-print, 
          header, 
          nav, 
          aside, 
          footer, 
          button:not(.allow-print), 
          .fixed, 
          [role="dialog"] {
            display: none !important;
          }

          /* Ensure high-contrast ink-saving colors on physical paper */
          body {
            background: #ffffff !important;
            color: #0f172a !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          #nutri-print-section,
          .print-recipe-sheet {
            display: block !important;
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #0f172a !important;
          }

          .print-recipe-sheet * {
            visibility: visible !important;
          }

          .print-avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Trigger element */}
      {renderTrigger()}

      {/* Interactive Print Customizer & Preview Modal */}
      {showPreviewModal && isPreviewOpen && (
        <PrintPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          recipe={recipe}
        />
      )}
    </>
  );
};

export default PrintRecipe;
