import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, Loader2, Sparkles, AlertTriangle, Info, History, ArrowLeft, ArrowRight, Upload, X, CheckCircle2, ChevronRight, Scale, Zap, Flame, Target, Eye, Maximize2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { combineSmartPlate } from '../lib/gemini';
import { db, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from '../lib/firebase';
import { UserProfile, SmartPlateCombination, SmartPlateDishItem } from '../types';
import { normalizeSmartPlateDish, DEFAULT_PLATE_IMAGE, SmartPlateFoodItem } from '../lib/smartPlatePhotos';

interface HistoryItem {
  id: string;
  date: Date;
  goal: string;
  result: SmartPlateCombination;
  imagesCount: number;
}

export function SmartPlateCombiner({ onClose, profile }: { onClose: () => void; profile?: UserProfile }) {
  const { user } = useAuth();
  
  const [images, setImages] = useState<{ url: string; file: File; base64: string; mimeType: string }[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<string>('Emagrecimento');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<SmartPlateCombination | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [previewDish, setPreviewDish] = useState<SmartPlateFoodItem | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const goals = [
    { id: 'Emagrecimento', label: 'Emagrecimento', icon: <Flame className="w-4 h-4" /> },
    { id: 'Ganho de massa muscular', label: 'Ganho de massa', icon: <Scale className="w-4 h-4" /> },
    { id: 'Manutenção da alimentação', label: 'Manutenção', icon: <Target className="w-4 h-4" /> },
    { id: 'Mais energia', label: 'Mais energia', icon: <Zap className="w-4 h-4" /> },
    { id: 'Performance', label: 'Performance', icon: <Zap className="w-4 h-4" /> },
  ];

  useEffect(() => {
    loadHistory();
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'users', user.uid, 'smartPlateCombinations'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        let date = new Date();
        if (data.createdAt) {
          if (typeof data.createdAt.toDate === 'function') {
            date = data.createdAt.toDate();
          } else if (typeof data.createdAt === 'string' || typeof data.createdAt === 'number') {
            date = new Date(data.createdAt);
          }
        }
        return {
          id: doc.id,
          date,
          goal: data.goal,
          result: data.result,
          imagesCount: data.imagesCount || 1
        };
      });
      setHistory(items);
    } catch (err) {
      console.error('Error loading history:', err);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setError(null);
    setResult(null);
    
    const newImages = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 10 * 1024 * 1024) {
        setError('Uma ou mais imagens são muito grandes. O tamanho máximo é 10MB.');
        return;
      }
      
      try {
        const base64 = await fileToBase64(file);
        newImages.push({
          url: URL.createObjectURL(file),
          file,
          base64,
          mimeType: file.type || 'image/jpeg'
        });
      } catch (err) {
        console.error("Error converting file:", err);
      }
    }
    
    setImages(prev => [...prev, ...newImages].slice(0, 5)); // max 5 images
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    if (images.length === 1) {
      setResult(null);
    }
  };

  const handleAnalyze = async () => {
    if (images.length === 0) {
      setError('Por favor, adicione pelo menos uma foto das opções disponíveis.');
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const imagesPayload = images.map(img => ({
        base64: img.base64,
        mimeType: img.mimeType
      }));
      
      const data = await combineSmartPlate(imagesPayload, selectedGoal, profile);
      
      if (!data) throw new Error("A IA não retornou um resultado válido.");
      
      setResult(data);
      
      // Save to history
      if (user) {
        try {
          await addDoc(collection(db, 'users', user.uid, 'smartPlateCombinations'), {
            goal: selectedGoal,
            result: data,
            imagesCount: images.length,
            createdAt: serverTimestamp()
          });
          loadHistory();
        } catch (err) {
          console.error("Error saving history:", err);
        }
      }
      
    } catch (err) {
      console.error('Error analyzing plate:', err);
      setError('Ocorreu um erro ao analisar as opções. Verifique sua conexão e tente novamente.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-white/10 px-4 py-4 flex items-center justify-between">
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          Combine seu Prato
        </h1>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`p-2 rounded-full transition-colors ${showHistory ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-white/10 text-white'}`}
          title="Histórico"
        >
          <History className="w-6 h-6" />
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-4 pb-32">
        {showHistory ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-6">Histórico de Refeições Fora de Casa</h2>
            
            {history.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum histórico encontrado.</p>
              </div>
            ) : (
              history.map((item) => (
                <div key={item.id} className="bg-white/5 rounded-3xl p-6 border border-white/10">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm text-slate-400">{item.date.toLocaleDateString('pt-BR')} às {item.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                      <p className="text-lg font-bold text-white mt-1">Objetivo: {item.goal}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-1.5">
                        <Target className="w-4 h-4" />
                        Prato Recomendado
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {item.result.recommendedPlate.map((foodRaw, i) => {
                          const food = normalizeSmartPlateDish(foodRaw, i);
                          return (
                            <div key={i} className="flex items-center gap-3 bg-white/5 p-2.5 rounded-2xl border border-white/5">
                              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-slate-800 relative">
                                <img
                                  src={food.image || DEFAULT_PLATE_IMAGE}
                                  alt={food.name}
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = DEFAULT_PLATE_IMAGE;
                                  }}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-white truncate">{food.name}</p>
                                {food.portion && (
                                  <p className="text-xs text-emerald-400/80 truncate">{food.portion}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div className="flex gap-4 text-xs text-slate-400 pt-2 border-t border-white/5">
                      <span>{item.result.nutritionEstimate.calories} kcal</span>
                      <span>•</span>
                      <span>{item.result.nutritionEstimate.protein}g prot</span>
                      <span>•</span>
                      <span>{item.result.nutritionEstimate.carbs}g carb</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-8">
            
            <div className="text-center space-y-4 py-8">
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                Está no restaurante e não sabe o que escolher?
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                Tire fotos das opções disponíveis e deixe a Inteligência Artificial encontrar uma combinação mais adequada ao seu objetivo com fotos dos pratos.
              </p>
              <div className="inline-block bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-6 py-3 rounded-full font-medium mt-4">
                Você escolhe o restaurante. A IA ajuda você a escolher o prato.
              </div>
            </div>

            {/* Image Selection Area */}
            <div className="bg-white/5 rounded-3xl p-6 md:p-8 border border-white/10 text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Camera className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Fotografe as opções</h3>
              <p className="text-slate-400 mb-8 max-w-md mx-auto">
                Tire fotos do buffet, das travessas, ou do cardápio do restaurante. (Máx. 5 fotos)
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold transition-colors shadow-lg shadow-emerald-500/20"
                >
                  <Camera className="w-5 h-5" />
                  TIRAR FOTO
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-2xl font-bold transition-colors"
                >
                  <ImageIcon className="w-5 h-5" />
                  ESCOLHER DA GALERIA
                </button>
                <input
                  type="file"
                  ref={cameraInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  multiple
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                  className="hidden"
                  multiple
                />
              </div>

              {images.length > 0 && (
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/20 shadow-md">
                      <img src={img.url} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/90 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {images.length > 0 && !result && (
              <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
                <h3 className="text-lg font-bold text-white mb-4">Qual o seu objetivo nesta refeição?</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {goals.map(goal => (
                    <button
                      key={goal.id}
                      onClick={() => setSelectedGoal(goal.id)}
                      className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                        selectedGoal === goal.id 
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md' 
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {goal.icon}
                      <span className="font-medium text-sm">{goal.label}</span>
                    </button>
                  ))}
                </div>
                
                <div className="mt-8 text-center">
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white w-full md:w-auto px-12 py-4 rounded-full font-bold text-lg transition-colors flex items-center justify-center gap-3 mx-auto disabled:opacity-70 disabled:cursor-not-allowed shadow-xl shadow-emerald-500/25"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Analisando opções e montando prato...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-6 h-6" />
                        Combinar Prato com Fotos em Alta Qualidade
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex gap-3 text-red-400">
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {result && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
                
                <div className="text-center py-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    Gastronomia Saudável & Nutritiva
                  </span>
                  <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                    Sua combinação inteligente está pronta
                  </h2>
                  <p className="text-slate-400 text-sm mt-1 max-w-xl mx-auto">
                    Montamos cada componente do seu prato com fotos em alta resolução e referências práticas de porção.
                  </p>
                </div>

                {result.warningMessage && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3 text-amber-400">
                    <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                    <p className="text-sm">
                      <span className="font-bold">Atenção:</span> {result.warningMessage}
                      <br /><br />
                      <span className="text-xs opacity-80">A identificação visual não garante ausência de contaminação cruzada. Confirme os ingredientes com o estabelecimento.</span>
                    </p>
                  </div>
                )}

                {/* RECOMMENDED DISHES SECTION WITH HIGH QUALITY PHOTOS */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
                      <Target className="w-6 h-6 text-emerald-400" />
                      Prato Recomendado
                    </h3>
                    <span className="text-xs text-slate-400">Toque na foto para ampliar</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.recommendedPlate.map((itemRaw, idx) => {
                      const item = normalizeSmartPlateDish(itemRaw, idx);
                      return (
                        <div
                          key={idx}
                          className="group relative bg-white/5 hover:bg-white/[0.08] rounded-3xl p-4 border border-white/10 hover:border-emerald-500/40 transition-all duration-300 flex flex-col justify-between shadow-lg"
                        >
                          {/* Image Banner */}
                          <div className="relative w-full h-44 sm:h-48 rounded-2xl overflow-hidden bg-slate-800 mb-3.5">
                            <img
                              src={item.image || DEFAULT_PLATE_IMAGE}
                              alt={item.name}
                              referrerPolicy="no-referrer"
                              loading="lazy"
                              className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = DEFAULT_PLATE_IMAGE;
                              }}
                            />
                            {/* Subtle dark gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />
                            
                            {/* Category Badge */}
                            {item.category && (
                              <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-xs font-semibold text-emerald-300 flex items-center gap-1.5 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                {item.category}
                              </div>
                            )}

                            {/* Zoom Button */}
                            <button
                              type="button"
                              onClick={() => setPreviewDish(item)}
                              className="absolute top-3 right-3 bg-black/50 hover:bg-black/80 backdrop-blur-md p-2 rounded-full text-white/90 hover:text-white transition-colors"
                              title="Ampliar foto em alta resolução"
                            >
                              <Maximize2 className="w-4 h-4" />
                            </button>

                            {/* Dish name on image bottom */}
                            <div className="absolute bottom-3 left-3 right-3">
                              <h4 className="text-base sm:text-lg font-bold text-white drop-shadow-md leading-snug">
                                {item.name}
                              </h4>
                            </div>
                          </div>

                          {/* Details below photo */}
                          <div className="space-y-2 pt-1">
                            {item.portion && (
                              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-xs font-medium text-emerald-300">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>Porção recomendada: <strong>{item.portion}</strong></span>
                              </div>
                            )}

                            {item.description && (
                              <p className="text-xs text-slate-300 leading-relaxed px-1">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Why this combination */}
                  {result.reasoning && result.reasoning.length > 0 && (
                    <div className="bg-emerald-500/10 rounded-3xl p-6 border border-emerald-500/20 mt-6">
                      <h4 className="text-base font-bold text-emerald-300 mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        Por que essa combinação é a ideal para você?
                      </h4>
                      <ul className="space-y-2">
                        {result.reasoning.map((reason, idx) => (
                          <li key={idx} className="text-sm text-emerald-200/90 flex items-start gap-2">
                            <span className="text-emerald-400 mt-1 font-bold">•</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Nutrition Estimates and Choices Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Nutrition Estimates */}
                  <div className="bg-white/5 rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-4">Estimativa Nutricional do Prato</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="bg-slate-800/90 rounded-2xl p-3.5 text-center border border-white/5 min-w-0">
                          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1 whitespace-nowrap overflow-hidden text-ellipsis">Calorias</p>
                          <p className="text-2xl font-bold text-white">{result.nutritionEstimate.calories}</p>
                          <p className="text-[10px] text-slate-400">kcal</p>
                        </div>
                        <div className="bg-slate-800/90 rounded-2xl p-3.5 text-center border border-white/5 min-w-0">
                          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1 whitespace-nowrap overflow-hidden text-ellipsis">Proteínas</p>
                          <p className="text-2xl font-bold text-emerald-400">{result.nutritionEstimate.protein}g</p>
                          <p className="text-[10px] text-slate-400">construção</p>
                        </div>
                        <div className="bg-slate-800/90 rounded-2xl p-3.5 text-center border border-white/5 min-w-0">
                          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1 whitespace-nowrap overflow-hidden text-ellipsis">Carbos</p>
                          <p className="text-2xl font-bold text-amber-400">{result.nutritionEstimate.carbs}g</p>
                          <p className="text-[10px] text-slate-400">energia</p>
                        </div>
                        <div className="bg-slate-800/90 rounded-2xl p-3.5 text-center border border-white/5 min-w-0">
                          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1 whitespace-nowrap overflow-hidden text-ellipsis">Gorduras</p>
                          <p className="text-2xl font-bold text-blue-400">{result.nutritionEstimate.fat}g</p>
                          <p className="text-[10px] text-slate-400">essenciais</p>
                        </div>
                        <div className="bg-slate-800/90 rounded-2xl p-3.5 text-center border border-white/5 col-span-2 sm:col-span-1 min-w-0">
                          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1 whitespace-nowrap overflow-hidden text-ellipsis">Fibras</p>
                          <p className="text-2xl font-bold text-emerald-300">{result.nutritionEstimate.fiber}g</p>
                          <p className="text-[10px] text-slate-400">saciedade</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-4 text-center">
                      *Estimativas nutricionais calculadas por inteligência artificial baseadas na identificação visual das opções.
                    </p>
                  </div>
                  
                  {/* Choices breakdown */}
                  <div className="bg-white/5 rounded-3xl p-6 border border-white/10 space-y-4">
                    {result.bestChoices.length > 0 && (
                      <div className="bg-emerald-500/10 p-3.5 rounded-2xl border border-emerald-500/20">
                        <h4 className="text-sm font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          Melhores escolhas identificadas no buffet/cardápio
                        </h4>
                        <p className="text-sm text-slate-200">{result.bestChoices.join(", ")}</p>
                      </div>
                    )}
                    
                    {result.moderateChoices.length > 0 && (
                      <div className="bg-amber-500/10 p-3.5 rounded-2xl border border-amber-500/20">
                        <h4 className="text-sm font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4" />
                          Escolhas para moderar ou evitar repetições
                        </h4>
                        <p className="text-sm text-slate-200">{result.moderateChoices.join(", ")}</p>
                      </div>
                    )}
                    
                    {result.alternatives.length > 0 && (
                      <div className="bg-blue-500/10 p-3.5 rounded-2xl border border-blue-500/20">
                        <h4 className="text-sm font-bold text-blue-400 mb-1 flex items-center gap-1.5">
                          <Zap className="w-4 h-4" />
                          Substituições inteligentes recomendadas
                        </h4>
                        <ul className="text-sm text-slate-200 space-y-1">
                          {result.alternatives.map((alt, i) => <li key={i}>• {alt}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center pt-6">
                   <button
                     onClick={() => {
                       setImages([]);
                       setResult(null);
                     }}
                     className="bg-white/10 hover:bg-white/20 text-white px-8 py-3.5 rounded-full font-semibold transition-colors inline-flex items-center gap-2"
                   >
                     <Camera className="w-4 h-4" />
                     Fotografar outro restaurante / buffet
                   </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FULL HIGH RESOLUTION DISH PREVIEW MODAL */}
      {previewDish && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewDish(null)}
        >
          <div 
            className="bg-slate-900 border border-white/20 rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-64 sm:h-72 bg-slate-950">
              <img 
                src={previewDish.image || DEFAULT_PLATE_IMAGE} 
                alt={previewDish.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_PLATE_IMAGE;
                }}
              />
              <button
                type="button"
                onClick={() => setPreviewDish(null)}
                className="absolute top-4 right-4 bg-black/60 hover:bg-black/90 text-white p-2 rounded-full transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
              {previewDish.category && (
                <div className="absolute bottom-4 left-4 bg-slate-900/85 backdrop-blur-md border border-white/10 px-3.5 py-1.5 rounded-full text-xs font-bold text-emerald-300">
                  {previewDish.category}
                </div>
              )}
            </div>

            <div className="p-6 space-y-4">
              <h3 className="text-xl font-bold text-white leading-tight">
                {previewDish.name}
              </h3>

              {previewDish.portion && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl text-emerald-300 text-sm flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Porção sugerida no prato: <strong>{previewDish.portion}</strong></span>
                </div>
              )}

              {previewDish.description && (
                <p className="text-slate-300 text-sm leading-relaxed">
                  {previewDish.description}
                </p>
              )}

              <button
                type="button"
                onClick={() => setPreviewDish(null)}
                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-medium transition-colors text-sm"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
