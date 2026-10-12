import React, { useState } from 'react';
import { X, Printer, Check, Image as ImageIcon, Scale } from 'lucide-react';
import { PrintableRecipeInput, PrintableRecipeOptions, generatePrintableRecipeHtml, printRecipe } from '../lib/recipePrinter';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: PrintableRecipeInput;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({ isOpen, onClose, recipe }) => {
  const [showPhoto, setShowPhoto] = useState(true);
  const [showNutrition, setShowNutrition] = useState(true);

  if (!isOpen) return null;

  const options: PrintableRecipeOptions = { showPhoto, showNutrition };
  const previewHtml = generatePrintableRecipeHtml(recipe, options);

  const handlePrint = () => {
    printRecipe(recipe, options);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-[24px] shadow-2xl overflow-hidden flex flex-col">
        
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Prévia de Impressão</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 p-5 border-r border-slate-100 dark:border-slate-800 space-y-4">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2">Opções</h4>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={showPhoto} onChange={e => setShowPhoto(e.target.checked)} className="accent-emerald-500" />
              <ImageIcon className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-700 dark:text-slate-300">Mostrar Foto</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={showNutrition} onChange={e => setShowNutrition(e.target.checked)} className="accent-emerald-500" />
              <Scale className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-700 dark:text-slate-300">Mostrar Nutrientes</span>
            </label>
          </div>

          <div className="flex-1 bg-slate-100 p-5 overflow-auto">
            <div className="bg-white p-8 shadow-sm mx-auto" style={{ width: '210mm', minHeight: '297mm' }} dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-sm">Cancelar</button>
          <button onClick={handlePrint} className="px-5 py-2.5 bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2 text-sm">
            <Printer className="w-4 h-4" />
            Imprimir Receita
          </button>
        </div>
      </div>
    </div>
  );
};
