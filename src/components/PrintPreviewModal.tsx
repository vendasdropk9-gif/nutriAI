import React, { useState, useMemo } from 'react';
import { X, Printer, Image as ImageIcon, Scale, Sparkles, Users, FileText, Check, Info, QrCode, Copy, Share2 } from 'lucide-react';
import { 
  PrintableRecipeInput, 
  PrintableRecipeOptions, 
  generatePrintableRecipeContentHtml, 
  getRecipePrintCss,
  printRecipe 
} from '../lib/recipePrinter';
import { playSfx, vibrate } from '../lib/sensory';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: PrintableRecipeInput;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({ isOpen, onClose, recipe }) => {
  const [showIngredients, setShowIngredients] = useState(true);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showPhoto, setShowPhoto] = useState(true);
  const [showNutrition, setShowNutrition] = useState(true);
  const [showChefTip, setShowChefTip] = useState(true);
  const [servingsMultiplier, setServingsMultiplier] = useState<number>(1);
  const [isPrintingNow, setIsPrintingNow] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const shareUrl = useMemo(() => {
    try {
      const compactRecipe = {
        id: recipe.id || `recipe-${Date.now()}`,
        name: recipe.name || recipe.title || 'Receita NutriAI',
        description: recipe.description || '',
        prepTime: recipe.prepTime || '30 min',
        difficulty: recipe.difficulty || 'Média',
        category: recipe.category || '',
        calories: recipe.nutrition?.calories ?? recipe.calories ?? 0,
        protein: recipe.nutrition?.protein ?? recipe.protein ?? 0,
        carbs: recipe.nutrition?.carbs ?? recipe.carbs ?? 0,
        fat: recipe.nutrition?.fat ?? recipe.fat ?? 0,
        ingredients: recipe.ingredients || [],
        instructions: recipe.instructions || [],
        chefTips: recipe.chefTips || '',
        imageUrl: recipe.imageUrl || recipe.image || ''
      };
      const jsonStr = JSON.stringify(compactRecipe);
      const b64 = btoa(unescape(encodeURIComponent(jsonStr)));
      const base = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : 'https://nutriai.app';
      return `${base}?import_recipe=${encodeURIComponent(b64)}`;
    } catch (e) {
      const base = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : 'https://nutriai.app';
      return `${base}?recipe_title=${encodeURIComponent(recipe.name || recipe.title || 'Receita')}`;
    }
  }, [recipe]);

  const handleCopyLink = async () => {
    try {
      playSfx('tap');
      vibrate(15);
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      // fallback
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: recipe.name || recipe.title || 'Receita NutriAI',
          text: `Confira esta receita saudável no NutriAI: ${recipe.name || recipe.title}`,
          url: shareUrl
        });
      } catch (e) {}
    } else {
      handleCopyLink();
    }
  };

  const options: PrintableRecipeOptions = useMemo(() => ({
    showPhoto,
    showNutrition,
    showChefTip,
    showIngredients,
    showInstructions,
    servingsMultiplier,
    category: recipe.category,
    chefTip: recipe.chefTips
  }), [showPhoto, showNutrition, showChefTip, showIngredients, showInstructions, servingsMultiplier, recipe]);

  const previewContentHtml = useMemo(() => {
    return generatePrintableRecipeContentHtml(recipe, options);
  }, [recipe, options]);

  const printCss = useMemo(() => {
    return getRecipePrintCss();
  }, []);

  if (!isOpen) return null;

  const handlePrint = () => {
    playSfx('tap');
    vibrate([20, 30]);
    setIsPrintingNow(true);
    printRecipe(recipe, options);
    setTimeout(() => {
      setIsPrintingNow(false);
      onClose();
    }, 400);
  };

  const handleClose = () => {
    playSfx('tap');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-md animate-fade-in-up">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[92vh] rounded-[28px] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                Imprimir Receita Limpa
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Formato otimizado para papel A4, economia de tinta e modo culinária
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose} 
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            title="Fechar prévia"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: Controls Sidebar + Paper Preview */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          
          {/* Options Sidebar */}
          <div className="w-full md:w-72 p-5 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-5 shrink-0 overflow-y-auto">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-3">
                Seções do Conteúdo
              </span>
              <div className="space-y-2.5">
                <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 cursor-pointer hover:border-emerald-500/50 transition-colors">
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <FileText className="w-4 h-4 text-emerald-500" />
                    <span>Lista de Ingredientes</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={showIngredients} 
                    onChange={e => {
                      playSfx('tap');
                      setShowIngredients(e.target.checked);
                    }} 
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer" 
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 cursor-pointer hover:border-emerald-500/50 transition-colors">
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Modo de Preparo</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={showInstructions} 
                    onChange={e => {
                      playSfx('tap');
                      setShowInstructions(e.target.checked);
                    }} 
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer" 
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 cursor-pointer hover:border-emerald-500/50 transition-colors">
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Scale className="w-4 h-4 text-emerald-500" />
                    <span>Tabela Nutricional</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={showNutrition} 
                    onChange={e => {
                      playSfx('tap');
                      setShowNutrition(e.target.checked);
                    }} 
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer" 
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 cursor-pointer hover:border-emerald-500/50 transition-colors">
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <ImageIcon className="w-4 h-4 text-emerald-500" />
                    <span>Foto Ilustrativa</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={showPhoto} 
                    onChange={e => {
                      playSfx('tap');
                      setShowPhoto(e.target.checked);
                    }} 
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer" 
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 cursor-pointer hover:border-emerald-500/50 transition-colors">
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    <span>Dicas da Chef Malu</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={showChefTip} 
                    onChange={e => {
                      playSfx('tap');
                      setShowChefTip(e.target.checked);
                    }} 
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer" 
                  />
                </label>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2.5">
                Escala de Porções
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 1.5, 2, 3].map((factor) => (
                  <button
                    key={factor}
                    type="button"
                    onClick={() => {
                      playSfx('tap');
                      setServingsMultiplier(factor);
                    }}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      servingsMultiplier === factor
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                        : 'bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-750 hover:border-slate-400'
                    }`}
                  >
                    {factor}x
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {servingsMultiplier === 1 ? 'Receita original' : `Multiplicada por ${servingsMultiplier}`}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                💡 Dica de Cozinha
              </span>
              <p className="text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-400">
                A folha impressa inclui caixas de marcação `[ ]` ao lado de cada ingrediente para você ir ticando durante o preparo!
              </p>
            </div>
          </div>

          {/* Paper Preview Area */}
          <div className="flex-1 bg-slate-150 dark:bg-slate-950 p-4 sm:p-8 overflow-y-auto flex items-start justify-center">
            {/* Scoped CSS for the paper preview sheet */}
            <style>{`
              .nutri-print-preview-sheet {
                ${printCss}
              }
            `}</style>
            
            <div 
              className="bg-white text-slate-900 rounded-xl p-6 sm:p-10 shadow-2xl border border-slate-200/80 w-full max-w-[210mm] min-h-[297mm] transition-all nutri-print-preview-sheet"
              style={{
                boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              }}
              dangerouslySetInnerHTML={{ __html: previewContentHtml }}
            />
          </div>
        </div>

        {/* Informational Tip Banner */}
        <div className="px-4 sm:px-6 py-2.5 bg-amber-500/10 dark:bg-amber-500/5 border-t border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2.5">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-[11px] sm:text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            <strong className="text-amber-700 dark:text-amber-400 font-semibold">Dica para melhor resultado:</strong> Na tela de impressão, verifique as configurações de <strong>Margem</strong> (recomendado: <em>&ldquo;Padrão&rdquo;</em> ou <em>&ldquo;Mínima&rdquo;</em>) e marque <em>&ldquo;Gráficos de segundo plano&rdquo;</em> para garantir um enquadramento perfeito no papel.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/80 flex items-center justify-between gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <FileText className="w-4 h-4 text-emerald-500" />
            <span>Compatível com qualquer impressora ou opção &ldquo;Salvar como PDF&rdquo;</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
            <button 
              type="button"
              onClick={() => {
                playSfx('pop');
                vibrate(15);
                setShowQrModal(true);
              }}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 font-bold rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Compartilhar receita via QR Code para outros dispositivos"
            >
              <QrCode className="w-4 h-4 text-emerald-500" />
              <span>Compartilhar via QR Code</span>
            </button>
            <button 
              onClick={handleClose} 
              className="px-4 py-2.5 bg-slate-200/80 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              onClick={handlePrint} 
              disabled={isPrintingNow}
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-70"
            >
              <Printer className="w-4 h-4" />
              <span>{isPrintingNow ? 'Abrindo Impressão...' : 'Imprimir Receita'}</span>
            </button>
          </div>
        </div>

        {/* QR Code Sharing Modal Overlay */}
        {showQrModal && (
          <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm sm:max-w-md w-full p-6 shadow-2xl relative flex flex-col items-center text-center space-y-4">
              <button
                type="button"
                onClick={() => {
                  playSfx('tap');
                  setShowQrModal(false);
                }}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-150 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <QrCode className="w-6 h-6" />
              </div>

              <div>
                <h4 className="font-serif font-bold text-lg text-slate-900 dark:text-white leading-tight">
                  Compartilhar via QR Code
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-1">
                  Aponte a câmera do celular para abrir ou importar <strong>&ldquo;{recipe.name || recipe.title}&rdquo;</strong> diretamente em outro aparelho.
                </p>
              </div>

              {/* QR Code Display Card */}
              <div className="p-4 bg-white rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 flex flex-col items-center">
                <div className="w-48 h-48 sm:w-52 sm:h-52 bg-white rounded-xl p-2 flex items-center justify-center relative overflow-hidden">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=4&data=${encodeURIComponent(shareUrl)}`}
                    alt={`QR Code para ${recipe.name || recipe.title}`}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-2 font-mono">
                  NutriAI • Leitor de Câmera Universal
                </span>
              </div>

              {/* Link Copy Bar */}
              <div className="w-full space-y-1.5 text-left">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Link Direto da Receita
                </label>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="bg-transparent text-xs text-slate-600 dark:text-slate-300 flex-1 outline-none truncate font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Secondary Actions */}
              <div className="flex items-center gap-2 w-full pt-1">
                {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Compartilhar Link</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    playSfx('tap');
                    setShowQrModal(false);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
