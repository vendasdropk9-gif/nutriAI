import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, Loader2, Sparkles, AlertTriangle, Info, History, ArrowLeft, ArrowRight, Upload, X, CheckCircle2, ChevronRight, Scale, Zap, Flame, Target } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { combineSmartPlate } from '../lib/gemini';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';

interface SmartPlateCombination {
  recommendedPlate: string[];
  reasoning: string[];
  nutritionEstimate: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  bestChoices: string[];
  moderateChoices: string[];
  alternatives: string[];
  warningMessage?: string;
}

interface HistoryItem {
  id: string;
  date: Date;
  goal: string;
  result: SmartPlateCombination;
  imagesCount: number;
}

export function SmartPlateCombiner({ onClose }: { onClose: () => void }) {
  const { user, profile } = useAuth();
  
  const [images, setImages] = useState<{ url: string; file: File; base64: string; mimeType: string }[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<string>('Emagrecimento');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<SmartPlateCombination | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
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
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        date: doc.data().createdAt?.toDate() || new Date(),
        goal: doc.data().goal,
        result: doc.data().result,
        imagesCount: doc.data().imagesCount || 1
      }));
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
                      <h4 className="text-sm font-semibold text-emerald-400 mb-2">Prato Recomendado</h4>
                      <ul className="list-disc pl-5 text-sm text-slate-300">
                        {item.result.recommendedPlate.map((food, i) => (
                          <li key={i}>{food}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="flex gap-4 text-xs text-slate-400">
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
                Tire fotos das opções disponíveis e deixe a Inteligência Artificial encontrar uma combinação mais adequada ao seu objetivo.
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
                  className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold transition-colors"
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
                    <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/20">
                      <img src={img.url} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/80"
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
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
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
                    className="bg-emerald-500 hover:bg-emerald-600 text-white w-full md:w-auto px-12 py-4 rounded-full font-bold text-lg transition-colors flex items-center justify-center gap-3 mx-auto disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Analisando opções...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-6 h-6" />
                        Combinar Prato com IA
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
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
                
                <div className="text-center py-4">
                  <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    Sua combinação inteligente está pronta.
                  </h2>
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

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Recommended Plate */}
                  <div className="bg-emerald-500/10 rounded-3xl p-6 border border-emerald-500/20">
                    <h3 className="text-xl font-bold text-emerald-400 mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Prato Recomendado
                    </h3>
                    <ul className="space-y-3">
                      {result.recommendedPlate.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-3 bg-white/5 p-3 rounded-xl">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span className="text-white">{item}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <div className="mt-6 pt-6 border-t border-emerald-500/20">
                      <h4 className="text-sm font-bold text-emerald-300 mb-3">Por que essa combinação?</h4>
                      <ul className="space-y-2">
                        {result.reasoning.map((reason, idx) => (
                          <li key={idx} className="text-sm text-emerald-200/80 flex items-start gap-2">
                            <span className="text-emerald-500 mt-1">•</span>
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Nutrition & Choices */}
                  <div className="space-y-6">
                    {/* Nutrition Estimates */}
                    <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
                      <h3 className="text-lg font-bold text-white mb-4">Estimativa Nutricional</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="bg-slate-800 rounded-2xl p-3 text-center">
                          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Calorias</p>
                          <p className="text-xl font-bold text-white">{result.nutritionEstimate.calories}</p>
                        </div>
                        <div className="bg-slate-800 rounded-2xl p-3 text-center">
                          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Proteínas</p>
                          <p className="text-xl font-bold text-white">{result.nutritionEstimate.protein}g</p>
                        </div>
                        <div className="bg-slate-800 rounded-2xl p-3 text-center">
                          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Carbos</p>
                          <p className="text-xl font-bold text-white">{result.nutritionEstimate.carbs}g</p>
                        </div>
                        <div className="bg-slate-800 rounded-2xl p-3 text-center">
                          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Gorduras</p>
                          <p className="text-xl font-bold text-white">{result.nutritionEstimate.fat}g</p>
                        </div>
                        <div className="bg-slate-800 rounded-2xl p-3 text-center">
                          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Fibras</p>
                          <p className="text-xl font-bold text-white">{result.nutritionEstimate.fiber}g</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-4 text-center">
                        *Valores são estimativas baseadas na identificação visual.
                      </p>
                    </div>
                    
                    {/* Choices breakdown */}
                    <div className="bg-white/5 rounded-3xl p-6 border border-white/10 space-y-4">
                      {result.bestChoices.length > 0 && (
                        <div>
                          <h4 className="text-sm font-bold text-emerald-400 mb-2">Melhores escolhas</h4>
                          <p className="text-sm text-slate-300">{result.bestChoices.join(", ")}</p>
                        </div>
                      )}
                      
                      {result.moderateChoices.length > 0 && (
                        <div>
                          <h4 className="text-sm font-bold text-amber-400 mb-2">Escolhas para moderar</h4>
                          <p className="text-sm text-slate-300">{result.moderateChoices.join(", ")}</p>
                        </div>
                      )}
                      
                      {result.alternatives.length > 0 && (
                        <div>
                          <h4 className="text-sm font-bold text-blue-400 mb-2">Alternativas / Substituições</h4>
                          <ul className="text-sm text-slate-300 space-y-1">
                            {result.alternatives.map((alt, i) => <li key={i}>• {alt}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-center pt-8">
                   <button
                     onClick={() => {
                       setImages([]);
                       setResult(null);
                     }}
                     className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-full font-medium transition-colors"
                   >
                     Fazer nova análise
                   </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
