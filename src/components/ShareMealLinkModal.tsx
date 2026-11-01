import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Recipe } from '../types';
import {
  generateRecipeShareUrl,
  copyShareUrlToClipboard,
  generateWhatsAppShareUrl,
  canUseNativeShare,
  shareViaNativeShare
} from '../lib/recipeShareLink';
import { playSfx, vibrate } from '../lib/sensory';
import {
  Link2,
  Copy,
  Check,
  Share2,
  MessageCircle,
  X,
  Sparkles,
  Clock,
  Flame,
  Beef,
  Wheat,
  Droplet,
  ChefHat,
  ShieldCheck,
  QrCode
} from 'lucide-react';

interface ShareMealLinkModalProps {
  recipe: Recipe;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareMealLinkModal: React.FC<ShareMealLinkModalProps> = ({
  recipe,
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = useState(false);
  const [nativeShareLoading, setNativeShareLoading] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);

  const shareUrl = useMemo(() => {
    if (!recipe) return '';
    return generateRecipeShareUrl(recipe);
  }, [recipe]);

  const calories = recipe.nutrition?.calories ?? recipe.calories ?? 0;
  const protein = recipe.nutrition?.protein ?? recipe.protein ?? 0;
  const carbs = recipe.nutrition?.carbs ?? recipe.carbs ?? 0;
  const fat = recipe.nutrition?.fat ?? recipe.fat ?? 0;
  const ingredientsCount = recipe.ingredients?.length || 0;
  const instructionsCount = recipe.instructions?.length || 0;

  const handleCopy = async () => {
    if (!shareUrl) return;
    const ok = await copyShareUrlToClipboard(shareUrl);
    if (ok) {
      setCopied(true);
      playSfx('pop');
      vibrate(40);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleWhatsApp = () => {
    if (!shareUrl) return;
    const waUrl = generateWhatsAppShareUrl(shareUrl, recipe.name, calories);
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = async () => {
    if (!shareUrl) return;
    setNativeShareLoading(true);
    try {
      await shareViaNativeShare(recipe, shareUrl);
    } finally {
      setNativeShareLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-[32px] shadow-2xl w-full max-w-lg p-6 space-y-5 text-slate-800 dark:text-slate-100 max-h-[92vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20 shadow-inner">
                <Link2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-lg font-bold leading-tight">Compartilhar Refeição</h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/30">
                    Base64
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-[240px]">
                  {recipe.name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Recipe Card Snapshot */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 line-clamp-1">
                  {recipe.name}
                </h4>
                {recipe.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                    {recipe.description}
                  </p>
                )}
              </div>
              {recipe.prepTime && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-600 shrink-0">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  {recipe.prepTime}
                </span>
              )}
            </div>

            {/* Macros Chips */}
            <div className="grid grid-cols-4 gap-2 pt-1 text-center">
              <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center justify-center gap-1">
                  <Flame className="w-2.5 h-2.5 text-orange-500" /> Kcal
                </span>
                <span className="text-xs font-black text-slate-800 dark:text-slate-100">{calories}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] uppercase font-bold text-blue-500 block flex items-center justify-center gap-1">
                  <Beef className="w-2.5 h-2.5" /> Prot
                </span>
                <span className="text-xs font-black text-blue-600 dark:text-blue-400">{protein}g</span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] uppercase font-bold text-amber-500 block flex items-center justify-center gap-1">
                  <Wheat className="w-2.5 h-2.5" /> Carb
                </span>
                <span className="text-xs font-black text-amber-600 dark:text-amber-400">{carbs}g</span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] uppercase font-bold text-rose-500 block flex items-center justify-center gap-1">
                  <Droplet className="w-2.5 h-2.5" /> Gord
                </span>
                <span className="text-xs font-black text-rose-600 dark:text-rose-400">{fat}g</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
              <span>{ingredientsCount} ingredientes inclusos</span>
              <span>{instructionsCount} passos de preparo</span>
            </div>
          </div>

          {/* Share Link Field */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Link Exclusivo com Dados da Refeição
            </label>
            <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full bg-transparent text-xs text-slate-700 dark:text-slate-300 font-mono outline-none px-2 select-all overflow-hidden text-ellipsis whitespace-nowrap"
              />
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 cursor-pointer ${
                  copied
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
                }`}
              >
                {copied ? (
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

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={handleWhatsApp}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-2xl font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>Enviar via WhatsApp</span>
            </button>

            {canUseNativeShare() ? (
              <button
                onClick={handleNativeShare}
                disabled={nativeShareLoading}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Share2 className="w-4 h-4" />
                <span>Compartilhar no Aparelho</span>
              </button>
            ) : (
              <button
                onClick={() => setShowQrCode(!showQrCode)}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl font-bold text-xs transition-all border border-slate-700 active:scale-95 cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>{showQrCode ? 'Ocultar QR Code' : 'Visualizar QR Code'}</span>
              </button>
            )}
          </div>

          {/* Optional QR Code View */}
          {showQrCode && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center space-y-2">
              <p className="text-[11px] font-bold text-slate-600">Aponte a câmera de outro celular para importar:</p>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareUrl)}`}
                alt="QR Code da Receita"
                className="w-44 h-44 mx-auto rounded-xl border border-slate-100 shadow-sm"
              />
            </div>
          )}

          {/* Explanation Banner */}
          <div className="flex items-start gap-2.5 p-3.5 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-900 dark:text-emerald-200 mb-0.5">
                Importação instantânea no NutriAI
              </p>
              <p>
                Os ingredientes, modo de preparo e macronutrientes foram codificados em base64 diretamente na URL. Quem abrir o link poderá salvar a refeição em 1 clique no NutriAI sem precisar cadastrar manualmente.
              </p>
            </div>
          </div>

          {/* Close button */}
          <div className="pt-2 text-center">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
            >
              Concluir
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
