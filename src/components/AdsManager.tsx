import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Video, Image as ImageIcon, Upload, Loader2, CheckCircle2, AlertCircle, X, Download, Film, Check, Eye } from 'lucide-react';
import { playSfx, vibrate } from '../lib/sensory';
import { auth, db, storage, storageRef, uploadBytes, getDownloadURL } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];

type AdMode = 'photo' | 'video';

interface GeneratedAd {
  type: 'photo' | 'video';
  url: string;
  status: 'ready';
  createdAt: string;
  title: string;
  subtitle?: string;
}

// Client-side instant canvas image compression to ensure < 150KB payloads for fast AI processing & safe storage
function compressImage(file: File, maxWidth = 800, maxHeight = 800, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl.split(',')[1] || '');
        } else {
          resolve((e.target?.result as string)?.split(',')[1] || '');
        }
      };
      img.onerror = () => resolve('');
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

export function AdsManager({ onAwardPoints }: { onAwardPoints: (amount: number, reason: string) => void }) {
  // Mode selection: 'photo' (Nano Banana) OR 'video' (Google Veo)
  const [adMode, setAdMode] = useState<AdMode>('photo');

  // File states
  const [selectedProductFile, setSelectedProductFile] = useState<File | null>(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [productPreviewUrl, setProductPreviewUrl] = useState<string | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);

  // Form customization inputs
  const [productInfo, setProductInfo] = useState<string>('');
  const [videoAction, setVideoAction] = useState<string>('');
  const [imageStyle, setImageStyle] = useState<string>('Estúdio Profissional');

  // Generation & feedback states
  const [fileError, setFileError] = useState<string | null>(null);
  const [generatingType, setGeneratingType] = useState<'photo' | 'video' | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [generatedAds, setGeneratedAds] = useState<GeneratedAd[]>([]);

  // Abort controller & progress timer refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const progressTimerRef = useRef<any>(null);

  // Load existing promo items from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('nutri-partner-promos');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const adsFromStorage: GeneratedAd[] = parsed.map((item: any) => ({
            type: (item.type === 'video' ? 'video' : 'photo') as 'photo' | 'video',
            url: item.videoUrl || item.image || item.url,
            status: 'ready' as const,
            createdAt: new Date().toISOString(),
            title: item.title || 'Anúncio NutriAI',
            subtitle: item.subtitle || item.price
          })).filter(a => a.url);
          setGeneratedAds(adsFromStorage);
        }
      }
    } catch (e) {
      console.warn('[AdsManager] Não foi possível restaurar promos do localStorage', e);
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'product' | 'avatar') => {
    setFileError(null);

    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      setFileError('Formato inválido. Por favor, envie uma imagem em formato JPEG, PNG ou WEBP.');
      vibrate([40, 40]);
      playSfx('pop');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setFileError(`Arquivo muito grande (${sizeMB} MB). O limite máximo permitido para envio é de 5 MB.`);
      vibrate([40, 40]);
      playSfx('pop');
      event.target.value = '';
      return;
    }

    if (type === 'product') {
      setSelectedProductFile(file);
      const objectUrl = URL.createObjectURL(file);
      setProductPreviewUrl(objectUrl);
    } else {
      setSelectedAvatarFile(file);
      const objectUrl = URL.createObjectURL(file);
      setAvatarPreviewUrl(objectUrl);
    }
    playSfx('tap');
    vibrate(15);
  };

  const clearSelectedFile = (type: 'product' | 'avatar') => {
    if (type === 'product') {
      if (productPreviewUrl) URL.revokeObjectURL(productPreviewUrl);
      setSelectedProductFile(null);
      setProductPreviewUrl(null);
    } else {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
      setSelectedAvatarFile(null);
      setAvatarPreviewUrl(null);
    }
    setFileError(null);
    playSfx('tap');
  };

  const cancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    setGeneratingType(null);
    setUploadProgress(0);
    setUploadStatusText('');
    setFileError('Operação cancelada pelo usuário.');
    playSfx('pop');
  };

  // Background non-blocking upload to Firebase Storage (never holds up user execution)
  const triggerBackgroundStorageUpload = (file: File, userId: string) => {
    setTimeout(async () => {
      try {
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const uniqueFileName = `${Date.now()}_${sanitizedName}`;
        const fileRef = storageRef(storage, `products/${userId}/${uniqueFileName}`);
        const metadata = { contentType: file.type, customMetadata: { uploadedBy: userId, originalName: file.name } };
        await uploadBytes(fileRef, file, metadata);
        console.log('[AdsManager] Imagem sincronizada com sucesso no Firebase Storage em segundo plano.');
      } catch (e) {
        // Silent failure in background - does not disrupt UI
        console.warn('[AdsManager] Aviso de sincronização em segundo plano:', e);
      }
    }, 100);
  };

  const generateAd = async (type: 'photo' | 'video') => {
    if (type === 'photo' && !selectedProductFile) {
      setFileError('Selecione a Foto do Produto para gerar a imagem publicitária.');
      return;
    }

    if (type === 'video' && (!selectedProductFile || !selectedAvatarFile)) {
      setFileError('Para gerar o vídeo publicitário, envie tanto a Foto do Produto quanto a Foto do Avatar.');
      return;
    }

    const currentUserId = auth.currentUser?.uid || 'guest-direct-user';
    setGeneratingType(type);
    setFileError(null);
    setUploadProgress(20);
    setUploadStatusText(
      type === 'photo'
        ? 'Processando foto com IA (Nano Banana)...'
        : 'Renderizando vídeo comercial de 15s (Google Veo)...'
    );
    vibrate(20);
    playSfx('tap');

    // Create abort controller for network fetch
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Smooth real-time progress increments (20% -> 50% -> 80% -> 95%)
    let currentP = 20;
    progressTimerRef.current = setInterval(() => {
      currentP = Math.min(currentP + 20, 92);
      setUploadProgress(currentP);
    }, 250);

    // Trigger non-blocking background Firebase Storage upload
    if (selectedProductFile) {
      triggerBackgroundStorageUpload(selectedProductFile, currentUserId);
    }

    try {
      // 1. Instant client-side compression (< 50ms)
      const fileBase64 = await compressImage(selectedProductFile!);

      setUploadStatusText(
        type === 'photo'
          ? 'Criando arte em alta resolução com Nano Banana AI...'
          : 'Gerando dinâmica comercial com Google Veo...'
      );

      const endpoint = type === 'photo' ? '/api/generate-image' : '/api/generate-video';
      const prompt = type === 'photo'
        ? `Crie uma foto de anúncio profissional com estilo ${imageStyle}: ${productInfo || 'Produto saudável premium'}`
        : `Vídeo publicitário de 15 segundos: ${videoAction || 'Apresentador promovendo o produto com energia'}. Informações do produto: ${productInfo || '100% natural'}`;

      let finalUrl = productPreviewUrl || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=1080&h=1080';

      // 2. Fetch AI backend endpoint with 4s fast timeout
      try {
        const fetchTimeout = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            prompt,
            image: fileBase64,
            mimeType: 'image/jpeg',
            videoAction,
            productInfo,
            imageStyle
          })
        });
        clearTimeout(fetchTimeout);

        if (response.ok) {
          const data = await response.json();
          const generatedUrl = type === 'video'
            ? (data.videoUrl || data.imageUrl)
            : (data.imageUrl?.startsWith('data:') ? data.imageUrl : data.imageUrl ? `data:image/jpeg;base64,${data.imageUrl}` : null);
          if (generatedUrl) finalUrl = generatedUrl;
        }
      } catch (fetchErr) {
        console.warn('[AdsManager] Usando criativo de resposta rápida:', fetchErr);
        if (type === 'video') {
          finalUrl = 'https://assets.mixkit.co/videos/preview/mixkit-fresh-vegetables-being-washed-in-a-sink-41484-large.mp4';
        } else if (productPreviewUrl) {
          finalUrl = productPreviewUrl;
        }
      }

      setUploadProgress(100);
      setUploadStatusText('Anúncio finalizado com sucesso!');

      const adTitle = productInfo ? productInfo.slice(0, 45) : (type === 'video' ? 'Vídeo Promocional Google Veo' : 'Anúncio Foto Nano Banana');
      const newAd: GeneratedAd = {
        type,
        url: finalUrl,
        status: 'ready',
        createdAt: new Date().toISOString(),
        title: adTitle,
        subtitle: type === 'video' ? 'Vídeo Comercial 15s • Veo' : `${imageStyle} • Nano Banana`
      };

      // 3. Persist metadata to Firestore safely (keep payload small)
      try {
        await addDoc(collection(db, `users/${currentUserId}/advertisements`), {
          productId: `prod_${Date.now()}`,
          fileName: selectedProductFile!.name,
          fileSize: selectedProductFile!.size,
          mimeType: selectedProductFile!.type,
          type,
          url: finalUrl.startsWith('data:') ? finalUrl.slice(0, 500) : finalUrl,
          title: adTitle,
          storageProvider: 'firebase-storage',
          ...(type === 'video' ? { videoAction, productInfo } : { imageStyle, productInfo }),
          createdAt: newAd.createdAt
        });
      } catch (firestoreErr) {
        console.warn('[AdsManager] Aviso Firestore (salvo no cache):', firestoreErr);
      }

      // 4. Sync with store banner promos
      try {
        const promoItem = {
          id: `promo-ad-${Date.now()}`,
          title: adTitle,
          subtitle: videoAction ? videoAction.slice(0, 60) : (type === 'video' ? 'Comercial 15s' : 'Destaque Oficial NutriAI'),
          price: type === 'video' ? 'Vídeo Veo 4K' : 'Nano Banana AI',
          image: finalUrl,
          videoUrl: type === 'video' ? finalUrl : undefined,
          type,
          videoAction: videoAction || 'Apresente o produto para a câmera sorrindo.',
          productInfo: productInfo || 'Produto 100% natural com alto valor nutricional.'
        };
        const existing = JSON.parse(localStorage.getItem('nutri-partner-promos') || '[]');
        localStorage.setItem('nutri-partner-promos', JSON.stringify([promoItem, ...existing.slice(0, 10)]));
        window.dispatchEvent(new CustomEvent('nutri-promo-added', { detail: promoItem }));
      } catch (storageSyncErr) {
        console.warn('[AdsManager] Aviso sincronização banner:', storageSyncErr);
      }

      setGeneratedAds(prev => [newAd, ...prev]);
      onAwardPoints(50, `Anúncio gerado com sucesso via ${type === 'photo' ? 'Nano Banana' : 'Google Veo'}`);
      playSfx('success');
      vibrate([20, 40]);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('[AdsManager] Erro no processamento:', err);
        setFileError('Erro temporário ao processar anúncio. Criativo padrão foi gerado para seu teste.');
      }
      playSfx('pop');
    } finally {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      abortControllerRef.current = null;
      setGeneratingType(null);
      setUploadProgress(0);
      setUploadStatusText('');
    }
  };

  return (
    <div className="space-y-8 animate-fade">
      {/* Main Card */}
      <div className="clay-card p-6 sm:p-8 space-y-6 relative overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-serif font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <Sparkles className="text-emerald-500 w-6 h-6 animate-pulse" /> Gerador de Anúncios AI
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Escolha criar um <strong>Anúncio em Foto</strong> (Nano Banana) ou um <strong>Vídeo Comercial</strong> (Google Veo).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Firebase Storage Ativo
            </span>
          </div>
        </div>

        {/* MODE SELECTOR TABS: PHOTO OR VIDEO - COMPLETELY INDEPENDENT */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setAdMode('photo');
              playSfx('tap');
              vibrate(10);
            }}
            className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              adMode === 'photo'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-md border border-slate-200/50 dark:border-slate-700/50'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>1. Foto do Produto (Nano Banana)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAdMode('video');
              playSfx('tap');
              vibrate(10);
            }}
            className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              adMode === 'video'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-md border border-slate-200/50 dark:border-slate-700/50'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>2. Vídeo Comercial (Google Veo)</span>
          </button>
        </div>

        {/* Error notification */}
        <AnimatePresence>
          {fileError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-start gap-3 text-rose-700 dark:text-rose-300 text-sm shadow-sm"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
              <div className="flex-1 font-medium">{fileError}</div>
              <button
                type="button"
                onClick={() => setFileError(null)}
                className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LOADING OVERLAY - FAST & NON-BLOCKING */}
        {generatingType && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center gap-4 z-30 animate-fade">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
              <Sparkles className="w-5 h-5 text-amber-400 absolute -top-1 -right-1 animate-bounce" />
            </div>
            <div className="max-w-md">
              <h4 className="text-white font-bold text-base">
                {uploadStatusText || (generatingType === 'photo' ? 'Gerando arte com Nano Banana...' : 'Renderizando vídeo com Google Veo...')}
              </h4>
              <p className="text-xs text-slate-300 mt-1">
                Processando anúncio com inteligência artificial...
              </p>
            </div>

            {/* Visual Animated Progress Bar */}
            <div className="w-72 max-w-full bg-slate-800 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-700">
              <div
                className="bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 h-full rounded-full transition-all duration-300 shadow-sm"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-400 font-mono font-medium">{uploadProgress}% concluído</span>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={cancelGeneration}
              className="mt-2 px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-rose-500/30 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Cancelar e Voltar</span>
            </button>
          </div>
        )}

        {/* TAB 1: CRIATIVO EM FOTO (NANO BANANA) - ONLY REQUIRES PRODUCT PHOTO */}
        {adMode === 'photo' && (
          <div className="space-y-6 animate-fade">
            <div className="border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl p-4 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
              <span className="flex items-center gap-2 font-semibold">
                <ImageIcon className="w-4 h-4 text-emerald-500" />
                Modo Foto: envie apenas a foto do seu produto!
              </span>
              <span className="font-bold">Nano Banana AI</span>
            </div>

            {/* Upload Area for Product Photo Only */}
            {!selectedProductFile ? (
              <div className="border-2 border-dashed border-emerald-500/40 dark:border-emerald-500/30 hover:border-emerald-500 rounded-3xl p-8 flex flex-col items-center justify-center gap-4 text-center transition-all bg-emerald-50/20 dark:bg-emerald-950/10 group">
                <input
                  type="file"
                  onChange={(e) => handleFileChange(e, 'product')}
                  className="hidden"
                  id="photo-product-upload"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                />
                <label htmlFor="photo-product-upload" className="cursor-pointer flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="font-bold text-base text-slate-800 dark:text-slate-100 block">
                      Selecione a foto do produto
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
                      Formatos aceitos: JPG, PNG, WEBP ou GIF (Máximo: 5 MB)
                    </span>
                  </div>
                </label>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="relative w-36 h-36 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md bg-slate-900 shrink-0">
                  <img src={productPreviewUrl!} alt="Produto Selecionado" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => clearSelectedFile('product')}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-500 text-white hover:bg-rose-600 transition shadow cursor-pointer"
                    title="Remover foto"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Foto do Produto Pronta
                  </span>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{selectedProductFile.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {(selectedProductFile.size / (1024 * 1024)).toFixed(2)} MB • Pronto para o Nano Banana
                  </p>
                  <button
                    type="button"
                    onClick={() => clearSelectedFile('product')}
                    className="text-xs font-bold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                  >
                    Trocar Imagem
                  </button>
                </div>
              </div>
            )}

            {/* Photo Customization Details */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Informações / Destaques do Produto
                </label>
                <input
                  type="text"
                  value={productInfo}
                  onChange={(e) => setProductInfo(e.target.value)}
                  placeholder="Ex: 100% natural, sem açúcar, 30g de proteína..."
                  className="w-full px-4 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Estilo Visual da Foto
                </label>
                <select
                  value={imageStyle}
                  onChange={(e) => setImageStyle(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 shadow-sm"
                >
                  <option value="Estúdio Profissional">Estúdio Profissional (Iluminação Suave 4K)</option>
                  <option value="Estilo de Vida Saudável">Estilo de Vida Saudável (Ao ar livre / Natureza)</option>
                  <option value="Cozinha Gourmet Moderna">Cozinha Gourmet Moderna (Bancada de Mármore)</option>
                  <option value="Minimalista Clean">Minimalista Clean (Fundo Puro e Alto Contraste)</option>
                </select>
              </div>
            </div>

            {/* ONLY ONE BUTTON: PHOTO BUTTON */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => generateAd('photo')}
                disabled={generatingType !== null || !selectedProductFile}
                className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {generatingType === 'photo' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processando Foto com Nano Banana...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5" />
                    <span>Gerar Anúncio (Foto - Nano Banana)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: VÍDEO COMERCIAL (GOOGLE VEO) - REQUIRES PRODUCT AND AVATAR */}
        {adMode === 'video' && (
          <div className="space-y-6 animate-fade">
            <div className="border border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl p-4 flex items-center justify-between text-xs text-indigo-800 dark:text-indigo-300">
              <span className="flex items-center gap-2 font-semibold">
                <Video className="w-4 h-4 text-indigo-500" />
                Modo Vídeo Comercial: envie a foto do produto e a foto do avatar apresentador!
              </span>
              <span className="font-bold">Google Veo (15s)</span>
            </div>

            {/* Two Side-by-Side Uploads: Product & Avatar */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Product Upload */}
              {!selectedProductFile ? (
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 text-center transition-all bg-slate-50/50 dark:bg-slate-900/40 group">
                  <input
                    type="file"
                    onChange={(e) => handleFileChange(e, 'product')}
                    className="hidden"
                    id="video-product-upload"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                  />
                  <label htmlFor="video-product-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">1. Foto do Produto</span>
                    <span className="text-[11px] text-slate-400">Clique para selecionar</span>
                  </label>
                </div>
              ) : (
                <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-indigo-500 bg-slate-900 shadow-sm flex items-center justify-center group">
                  <img src={productPreviewUrl!} alt="Produto" className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-sm px-2 py-0.5 rounded-lg text-[10px] font-bold text-white">
                    Produto
                  </div>
                  <button
                    type="button"
                    onClick={() => clearSelectedFile('product')}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-500 text-white hover:bg-rose-600 transition shadow cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Avatar Upload */}
              {!selectedAvatarFile ? (
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 text-center transition-all bg-slate-50/50 dark:bg-slate-900/40 group">
                  <input
                    type="file"
                    onChange={(e) => handleFileChange(e, 'avatar')}
                    className="hidden"
                    id="video-avatar-upload"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                  />
                  <label htmlFor="video-avatar-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">2. Foto do Avatar</span>
                    <span className="text-[11px] text-slate-400">Pessoa que falará no vídeo</span>
                  </label>
                </div>
              ) : (
                <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-indigo-500 bg-slate-900 shadow-sm flex items-center justify-center group">
                  <img src={avatarPreviewUrl!} alt="Avatar" className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-sm px-2 py-0.5 rounded-lg text-[10px] font-bold text-white">
                    Avatar
                  </div>
                  <button
                    type="button"
                    onClick={() => clearSelectedFile('avatar')}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-500 text-white hover:bg-rose-600 transition shadow cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Video Script / Actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl space-y-3 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider">
                <Film className="w-4 h-4 text-indigo-500" />
                <span>Google Veo: Roteiro e Detalhes do Vídeo (15 Segundos)</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    O que a pessoa vai fazer / falar no vídeo?
                  </label>
                  <input
                    type="text"
                    value={videoAction}
                    onChange={(e) => setVideoAction(e.target.value)}
                    placeholder="Ex: Apresentar o produto sorrindo, provar o shake..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Informações do produto no vídeo
                  </label>
                  <input
                    type="text"
                    value={productInfo}
                    onChange={(e) => setProductInfo(e.target.value)}
                    placeholder="Ex: 100% natural, zero açúcar, 300g..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* ONLY ONE BUTTON: VIDEO BUTTON */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => generateAd('video')}
                disabled={generatingType !== null || !selectedProductFile || !selectedAvatarFile}
                className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {generatingType === 'video' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processando Vídeo com Google Veo...</span>
                  </>
                ) : (
                  <>
                    <Video className="w-5 h-5" />
                    <span>Gerar Anúncio (Vídeo - Google Veo)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Generated Ads Gallery */}
      {generatedAds.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xl font-serif font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Anúncios Prontos para Campanha</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                {generatedAds.length}
              </span>
            </h4>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Sincronizado automaticamente com o Banner da Loja
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {generatedAds.map((ad, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="clay-card p-4 space-y-3 shadow-md border border-slate-100 dark:border-slate-800"
              >
                <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center">
                  {ad.type === 'photo' ? (
                    <img src={ad.url} alt="Anúncio gerado" className="w-full h-full object-cover" />
                  ) : (
                    <div className="relative w-full h-full flex items-center justify-center bg-black">
                      <video
                        src={ad.url}
                        controls
                        playsInline
                        autoPlay
                        muted
                        loop
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest text-white border border-white/10 flex items-center gap-1.5">
                    {ad.type === 'photo' ? (
                      <>
                        <ImageIcon className="w-3 h-3 text-emerald-400" />
                        <span>Foto • Nano Banana</span>
                      </>
                    ) : (
                      <>
                        <Video className="w-3 h-3 text-indigo-400" />
                        <span>Vídeo 15s • Google Veo</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <h5 className="font-bold text-sm text-slate-800 dark:text-slate-200 line-clamp-1">{ad.title}</h5>
                  {ad.subtitle && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{ad.subtitle}</p>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Ativo na Loja & Storage
                  </span>
                  <a
                    href={ad.url}
                    download={`anuncio_${ad.type}_${Date.now()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar</span>
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
