import { safeGet, safeSet, safeRemove } from "../lib/storage";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from '../lib/firebase';
import { 
  Scale, Camera, Upload, Sparkles, CheckCircle2, AlertTriangle, 
  Trash2, Flame, Droplets, ShieldAlert, Zap, ArrowLeftRight,
  TrendingDown, TrendingUp, Info, HelpCircle, Utensils, Apple,
  Bookmark, RefreshCcw, X, Check, Award
} from 'lucide-react';
import Markdown from 'react-markdown';

// Mock/Preset comparisons for quick testing
const COMPARISON_PRESETS = [
  {
    title: "Iogurte Grego vs. Iogurte Natural",
    goal: "Hipertrofia / Ganho de Massa",
    productA: {
      name: "Iogurte Grego Tradicional",
      url: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&q=80&w=300&h=300",
      calories: "115 kcal (por 100g)",
      sugars: "12g",
      fats: "4.5g",
      sodium: "45mg",
      proteins: "6.2g",
      ingredients: "Leite integral pasteurizado, creme de leite, açúcar, fermento lácteo.",
      processingLevel: "Médio"
    },
    productB: {
      name: "Iogurte Natural Desnatado",
      url: "https://images.unsplash.com/photo-1571244856341-4f3dd95db33e?auto=format&fit=crop&q=80&w=300&h=300",
      calories: "45 kcal (por 100g)",
      sugars: "5g (lactose natural)",
      fats: "0.2g",
      sodium: "50mg",
      proteins: "4.5g",
      ingredients: "Leite desnatado pasteurizado, fermento lácteo.",
      processingLevel: "Baixo"
    },
    comparison: {
      betterOption: "A",
      winnerName: "Iogurte Grego Tradicional",
      reason: "O Iogurte Grego possui maior densidade proteica (6.2g contra 4.5g do desnatado), ideal para recuperação muscular e síntese proteica, apesar de possuir mais calorias e gorduras.",
      macroComparison: "O Produto A possui 37% mais proteína por porção do que o Produto B.",
      detailedAnalysis: "### Análise Detalhada para Hipertrofia\n\n1. **Aporte de Proteína**: Para o objetivo de ganho de massa, a quantidade de proteínas por porção é o fator determinante. O Iogurte Grego (Produto A) supera o Produto B com **6.2g** de proteína por 100g, oferecendo aminoácidos essenciais de rápida absorção.\n2. **Qualidade dos Ingredientes**: O Produto B (Natural Desnatado) possui uma lista de ingredientes mais limpa (apenas leite e fermento). No entanto, o Produto A atende melhor à demanda de calorias necessárias para o superávit energético exigido no bulking limpo.\n3. **Saciedade**: As gorduras presentes no Produto A (4.5g), combinadas com o teor de proteína, auxiliam na saciedade prolongada pré-treino.",
      recommendations: [
        "Se o seu plano alimentar permitir gorduras adicionais, escolha o Iogurte Grego para turbinar seus músculos.",
        "Evite marcas que adicionem amido modificado ou xarope de glicose no grego."
      ]
    }
  },
  {
    title: "Refrigerante de Cola vs. Cola Zero",
    goal: "Emagrecimento / Perda de Peso",
    productA: {
      name: "Refrigerante de Cola Original",
      url: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=300&h=300",
      calories: "150 kcal (lata 350ml)",
      sugars: "37g",
      fats: "0g",
      sodium: "18mg",
      proteins: "0g",
      ingredients: "Água gaseificada, açúcar, extrato de noz de cola, cafeína, corante caramelo IV, acidulante ácido fosfórico.",
      processingLevel: "Alto"
    },
    productB: {
      name: "Refrigerante de Cola Zero",
      url: "https://images.unsplash.com/photo-1543257580-7269da773bf5?auto=format&fit=crop&q=80&w=300&h=300",
      calories: "0 kcal",
      sugars: "0g",
      fats: "0g",
      sodium: "28mg",
      proteins: "0g",
      ingredients: "Água gaseificada, extrato de noz de cola, cafeína, corante caramelo IV, acidulante ácido fosfórico, edulcorantes aspartame, ciclamato de sódio.",
      processingLevel: "Alto"
    },
    comparison: {
      betterOption: "B",
      winnerName: "Refrigerante de Cola Zero",
      reason: "Para emagrecimento, o déficit calórico é mandatório. O Refrigerante Cola Zero (Produto B) não fornece calorias nem açúcares (0g contra 37g do original), auxiliando no controle de ingestão energética imediata.",
      macroComparison: "O Produto B economiza 150 calorias e 37g de açúcar livre por lata em relação ao Produto A.",
      detailedAnalysis: "### Análise Detalhada para Déficit Calórico\n\n1. **Teor de Açúcar**: O refrigerante original contém **37g de açúcares simples** em uma única lata, o que equivale a quase 8 colheres de chá de açúcar purificado. Esse pico glicêmico sabota o emagrecimento ao disparar a insulina.\n2. **Adoçantes Artificiais**: O Refrigerante Zero utiliza aspartame e ciclamato. Embora não seja saudável para o consumo diário contínuo devido aos aditivos industriais, no contexto exclusivo de **perda de peso rápida**, ele funciona como um excelente substituto de transição para saciar a vontade de doces sem somar calorias.\n3. **Teor de Sódio**: O refrigerante Zero tem um teor de sódio ligeiramente superior (28mg vs 18mg), mas que é irrelevante para a pressão arterial geral no consumo moderado.",
      recommendations: [
        "Prefira transicionar para água com gás e limão, mas use a versão Zero moderadamente como alternativa para evitar recaídas.",
        "Não consuma refrigerante zero junto com refeições principais para não prejudicar a absorção de nutrientes."
      ]
    }
  },
  {
    title: "Shoyu Tradicional vs. Shoyu de Coco (Coconut Aminos)",
    goal: "Redução de Sódio / Cardiovascular",
    productA: {
      name: "Molho de Soja Shoyu Tradicional",
      url: "https://images.unsplash.com/photo-1581600140682-d4e68c8cde32?auto=format&fit=crop&q=80&w=300&h=300",
      calories: "60 kcal (por 100g)",
      sugars: "5g",
      fats: "0g",
      sodium: "5690mg (altíssimo)",
      proteins: "8g",
      ingredients: "Água, sal, soja, trigo, corante caramelo, conservador sorbato de potássio.",
      processingLevel: "Alto"
    },
    productB: {
      name: "Molho de Coco Coconut Aminos",
      url: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=300&h=300",
      calories: "90 kcal (por 100g)",
      sugars: "15g (açúcar de coco natural)",
      fats: "0g",
      sodium: "1200mg (baixo sódio)",
      proteins: "1.5g",
      ingredients: "Néctar de coco fermentado, sal marinho.",
      processingLevel: "Baixo"
    },
    comparison: {
      betterOption: "B",
      winnerName: "Molho de Coco Coconut Aminos",
      reason: "O Coconut Aminos possui cerca de 80% menos sódio em relação ao Shoyu Tradicional (1200mg contra 5690mg por 100g), reduzindo a retenção hídrica e protegendo a saúde cardíaca.",
      macroComparison: "O Produto B possui 79% menos sódio que o Produto A.",
      detailedAnalysis: "### Análise Detalhada de Saúde Cardiovascular\n\n1. **Redução de Sódio**: O Shoyu Tradicional é uma das fontes de sódio mais concentradas da culinária (5690mg por 100g), representando uma grande ameaça para hipertensos e retenção de líquidos. O Produto B reduz essa carga drasticamente.\n2. **Qualidade dos Ingredientes**: O Coconut Aminos possui apenas néctar de coco e sal marinho, sendo totalmente livre de corantes caramelo IV e conservantes artificiais presentes no shoyu convencional.\n3. **Açúcares**: O néctar de coco confere mais açúcares naturais ao Produto B. Caso você tenha restrição severa de carboidratos, consuma em pequenas porções para tempero.",
      recommendations: [
        "Use o Coconut Aminos para saladas, legumes grelhados e comida japonesa para saborear sem sobrecarregar seus rins.",
        "Caso compre o Shoyu tradicional, dilua metade do frasco em água mineral filtrada para suavizar o sódio."
      ]
    }
  }
];

const USER_GOALS = [
  { id: "emagrecimento", name: "Emagrecimento / Déficit Calórico", icon: "🔥", desc: "Foco em menor valor calórico, baixo açúcar e gordura moderada." },
  { id: "hipertrofia", name: "Hipertrofia / Ganho de Massa", icon: "💪", desc: "Foco em maior densidade proteica e calorias de boa qualidade." },
  { id: "sodium", name: "Saúde Cardiovascular / Baixo Sódio", icon: "❤️", desc: "Prioridade absoluta para menor teor de sódio por porção." },
  { id: "diabetes", name: "Controle de Glicemia / Diabetes", icon: "🩸", desc: "Foco em produtos sem açúcar adicionado ou baixo índice glicêmico." },
  { id: "natural", name: "Alimentação Saudável / Menos Ultraprocessados", icon: "🌱", desc: "Foco em ingredientes limpos e menor nível de processamento." }
];

export function ProductComparer() {
  const { user } = useAuth();
  
  // Goal state
  const [selectedGoal, setSelectedGoal] = useState<string>("emagrecimento");

  // Product A states
  const [imgA, setImgA] = useState<string | null>(null);
  const [fileA, setFileA] = useState<File | null>(null);
  const [textA, setTextA] = useState<string>('');

  // Product B states
  const [imgB, setImgB] = useState<string | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [textB, setTextB] = useState<string>('');

  // UI state
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Load history from Firestore
  useEffect(() => {
    if (!user) {
      // Local fallback
      const localHistory = safeGet('nutri_comparer_history');
      if (localHistory) {
        setHistory(JSON.parse(localHistory));
      }
      setHistoryLoading(false);
      return;
    }

    const colRef = collection(db, 'users', user.uid, 'productComparisons');
    const q = query(colRef, orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(q, (snap) => {
      const items: any[] = [];
      snap.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      setHistory(items);
      setHistoryLoading(false);
    }, (err) => {
      console.error("Erro ao ler histórico de comparações:", err);
      setHistoryLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, productLabel: 'A' | 'B') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (productLabel === 'A') {
          setFileA(file);
          setImgA(reader.result as string);
          setTextA(''); // clear text when image uploaded
        } else {
          setFileB(file);
          setImgB(reader.result as string);
          setTextB('');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Preset activation
  const handleLoadPreset = (preset: typeof COMPARISON_PRESETS[0]) => {
    setImgA(preset.productA.url);
    setImgB(preset.productB.url);
    setFileA(null);
    setFileB(null);
    setTextA(preset.productA.name);
    setTextB(preset.productB.name);
    
    // map preset goals
    const foundGoal = USER_GOALS.find(g => preset.goal.toLowerCase().includes(g.id) || g.name.toLowerCase().includes(preset.goal.split(' ')[0].toLowerCase()));
    if (foundGoal) {
      setSelectedGoal(foundGoal.id);
    }
    
    setComparisonResult(preset);
    setError(null);
  };

  // Compare main trigger
  const handleCompare = async () => {
    const inputA = imgA || textA.trim();
    const inputB = imgB || textB.trim();

    if (!inputA || !inputB) {
      setError("Por favor, forneça imagens, fotos de rótulos ou descrições em texto para os DOIS produtos para realizar a comparação.");
      return;
    }

    setIsComparing(true);
    setError(null);
    setComparisonResult(null);

    try {
      let payloadA = inputA;
      let payloadB = inputB;

      if (fileA) {
        payloadA = await fileToBase64(fileA);
      }
      if (fileB) {
        payloadB = await fileToBase64(fileB);
      }

      const goalObj = USER_GOALS.find(g => g.id === selectedGoal);
      const goalText = goalObj ? `${goalObj.name} - ${goalObj.desc}` : selectedGoal;

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'compareTwoProducts',
          args: [payloadA, payloadB, goalText]
        })
      });

      if (!response.ok) {
        throw new Error("Erro na comunicação com o servidor de comparação nutricional.");
      }

      const data = await response.json();
      setComparisonResult(data);

      // Save to history
      const savedItem = {
        title: `${data.productA.name} vs. ${data.productB.name}`,
        goal: goalObj?.name || selectedGoal,
        productA: { ...data.productA, url: imgA || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&h=150" },
        productB: { ...data.productB, url: imgB || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&h=150" },
        comparison: data.comparison,
        date: new Date().toISOString()
      };

      if (user) {
        await addDoc(collection(db, 'users', user.uid, 'productComparisons'), savedItem);
      } else {
        const localHistory = safeGet('nutri_comparer_history');
        const list = localHistory ? JSON.parse(localHistory) : [];
        list.unshift(savedItem);
        safeSet('nutri_comparer_history', JSON.stringify(list));
        setHistory(list);
      }

    } catch (err) {
      console.error("Erro na comparação:", err);
      setError("Falha técnica ao tentar processar e comparar os produtos. Verifique se as imagens estão níveis e nítidas.");
    } finally {
      setIsComparing(false);
    }
  };

  const handleDeleteHistory = async (id: string, idx: number) => {
    if (user) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'productComparisons', id));
      } catch (err) {
        console.error("Error deleting from cloud history:", err);
      }
    } else {
      const list = [...history];
      list.splice(idx, 1);
      safeSet('nutri_comparer_history', JSON.stringify(list));
      setHistory(list);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="product_comparer_tab">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 bottom-0 translate-y-6 translate-x-4 opacity-15 scale-125">
          <Scale className="w-44 h-44" />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase">
              Laboratório Nutricional Inteligente
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight font-sans">
            Comparador de Produtos com IA
          </h2>
          <p className="text-xs text-teal-50 max-w-xl leading-relaxed font-medium">
            Envie a foto ou digite o nome de dois alimentos industriais ou pratos. 
            Nossa Inteligência Artificial compara calorias, açúcares, gorduras, sódio e ingredientes para determinar qual é o melhor para a sua meta diária de saúde.
          </p>
        </div>
      </div>

      {/* Grid: Setup Zone & Interactive Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Setup Control Column */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Goal selection card */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-500 animate-pulse" />
              1. Qual é o seu Objetivo Alimentar?
            </h3>
            <div className="space-y-2">
              {USER_GOALS.map((goal) => {
                const isSel = selectedGoal === goal.id;
                return (
                  <div
                    key={goal.id}
                    onClick={() => setSelectedGoal(goal.id)}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                      isSel 
                        ? 'border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/20' 
                        : 'border-gray-100 dark:border-gray-800 hover:bg-gray-50/50'
                    }`}
                  >
                    <span className="text-xl shrink-0 mt-0.5">{goal.icon}</span>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">
                        {goal.name}
                      </h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {goal.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Product A and B scan zone */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-emerald-500" />
              2. Upload dos Dois Produtos
            </h3>

            <div className="grid grid-cols-2 gap-4">
              
              {/* Product A uploader */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">
                  Produto A (Opção 1)
                </label>
                
                <div 
                  onClick={() => document.getElementById('input-file-a')?.click()}
                  className={`border border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all min-h-[140px] flex flex-col items-center justify-center ${
                    imgA 
                      ? 'border-emerald-500 bg-emerald-50/5' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-emerald-500/20'
                  }`}
                >
                  <input 
                    type="file" 
                    id="input-file-a" 
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'A')}
                    className="hidden" 
                  />

                  {imgA ? (
                    <div className="relative w-full h-24 rounded-lg overflow-hidden">
                      <img src={imgA} alt="Produto A" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImgA(null);
                          setFileA(null);
                        }}
                        className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/85 text-white rounded-full transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Camera className="w-5 h-5 mx-auto text-gray-400" />
                      <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300">Foto ou Rótulo</p>
                      <p className="text-[8px] text-gray-400">Toque p/ enviar</p>
                    </div>
                  )}
                </div>

                {!imgA && (
                  <input
                    type="text"
                    value={textA}
                    onChange={(e) => {
                      setTextA(e.target.value);
                      setImgA(null);
                      setFileA(null);
                    }}
                    placeholder="Ou digite o nome..."
                    className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[11px]"
                  />
                )}
              </div>

              {/* Product B uploader */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">
                  Produto B (Opção 2)
                </label>
                
                <div 
                  onClick={() => document.getElementById('input-file-b')?.click()}
                  className={`border border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all min-h-[140px] flex flex-col items-center justify-center ${
                    imgB 
                      ? 'border-emerald-500 bg-emerald-50/5' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-emerald-500/20'
                  }`}
                >
                  <input 
                    type="file" 
                    id="input-file-b" 
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'B')}
                    className="hidden" 
                  />

                  {imgB ? (
                    <div className="relative w-full h-24 rounded-lg overflow-hidden">
                      <img src={imgB} alt="Produto B" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImgB(null);
                          setFileB(null);
                        }}
                        className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/85 text-white rounded-full transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Camera className="w-5 h-5 mx-auto text-gray-400" />
                      <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300">Foto ou Rótulo</p>
                      <p className="text-[8px] text-gray-400">Toque p/ enviar</p>
                    </div>
                  )}
                </div>

                {!imgB && (
                  <input
                    type="text"
                    value={textB}
                    onChange={(e) => {
                      setTextB(e.target.value);
                      setImgB(null);
                      setFileB(null);
                    }}
                    placeholder="Ou digite o nome..."
                    className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[11px]"
                  />
                )}
              </div>

            </div>

            <button
              onClick={handleCompare}
              disabled={isComparing || (!imgA && !textA.trim()) || (!imgB && !textB.trim())}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-45 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {isComparing ? (
                <>
                  <RefreshCcw className="w-4 h-4 animate-spin" />
                  Cruzando tabelas de nutrientes...
                </>
              ) : (
                <>
                  <Scale className="w-4 h-4" />
                  Comparar Produtos com IA
                </>
              )}
            </button>
          </div>

          {/* Preset Buttons */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              Comparação Rápida (Exemplos)
            </h3>
            <p className="text-[10px] text-gray-400 mb-3">
              Toque em um exemplo para ver a comparação científica instantânea:
            </p>
            <div className="space-y-2">
              {COMPARISON_PRESETS.map((preset, idx) => (
                <div
                  key={idx}
                  onClick={() => handleLoadPreset(preset)}
                  className="p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-emerald-500/20 hover:bg-emerald-50/5 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex -space-x-2">
                      <img src={preset.productA.url} alt="" className="w-6 h-6 object-cover rounded-full border border-white" />
                      <img src={preset.productB.url} alt="" className="w-6 h-6 object-cover rounded-full border border-white" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[11px] font-bold text-gray-800 dark:text-white truncate">
                        {preset.title}
                      </h4>
                      <p className="text-[8px] text-emerald-600 font-extrabold truncate uppercase">{preset.goal}</p>
                    </div>
                  </div>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Dynamic Analysis & Visualizer Column */}
        <div className="lg:col-span-7 space-y-6">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-2xl p-4 text-red-700 dark:text-red-300 text-xs flex gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            {isComparing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-12 text-center shadow-xs space-y-4"
              >
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 border-4 border-emerald-500/10 rounded-full" />
                  <div className="absolute inset-0 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xl absolute inset-0 flex items-center justify-center animate-bounce">🔬</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">Análise Química de Nutrientes em Andamento...</h4>
                  <p className="text-xs text-gray-400 max-w-xs mx-auto mt-1">
                    Nosso nutricionista IA está decodificando e comparando Calorias, Açúcares, Gorduras, Sódio e Aditivos de ambos os alimentos.
                  </p>
                </div>
              </motion.div>
            )}

            {comparisonResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Winner Card Block */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-xs relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Award className="w-24 h-24 text-emerald-500" />
                  </div>
                  
                  <div className="space-y-4 relative z-10">
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded">
                        Veredito do Nutricionista
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-gray-900 dark:text-white">
                        Opção Recomendada:{" "}
                        <span className="text-emerald-600">
                          {comparisonResult.comparison.betterOption === 'A' 
                            ? comparisonResult.productA.name 
                            : comparisonResult.comparison.betterOption === 'B' 
                            ? comparisonResult.productB.name 
                            : 'Ambos Equiparáveis (Empate)'}
                        </span>
                      </h3>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-semibold bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                      <strong>Resumo do Veredito:</strong> {comparisonResult.comparison.reason}
                    </p>
                  </div>
                </div>

                {/* Grid comparing side by side metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Product A Card */}
                  <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-xs relative">
                    <div className="absolute top-4 right-4 bg-gray-100 dark:bg-gray-800 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-md">
                      Opção A
                    </div>
                    
                    <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-4 pr-10">
                      {comparisonResult.productA.name}
                    </h4>

                    {/* Nutrient list for A */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs pb-1.5 border-b border-gray-50 dark:border-gray-800">
                        <span className="text-gray-400 flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-orange-500" /> Calorias
                        </span>
                        <span className="font-extrabold text-gray-800 dark:text-gray-200">{comparisonResult.productA.calories}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs pb-1.5 border-b border-gray-50 dark:border-gray-800">
                        <span className="text-gray-400 flex items-center gap-1">
                          <Droplets className="w-3.5 h-3.5 text-amber-500" /> Açúcares
                        </span>
                        <span className="font-extrabold text-gray-800 dark:text-gray-200">{comparisonResult.productA.sugars}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs pb-1.5 border-b border-gray-50 dark:border-gray-800">
                        <span className="text-gray-400 flex items-center gap-1">
                          <Info className="w-3.5 h-3.5 text-yellow-500" /> Gorduras
                        </span>
                        <span className="font-extrabold text-gray-800 dark:text-gray-200">{comparisonResult.productA.fats}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs pb-1.5 border-b border-gray-50 dark:border-gray-800">
                        <span className="text-gray-400 flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5 text-red-500" /> Sódio
                        </span>
                        <span className="font-extrabold text-gray-800 dark:text-gray-200">{comparisonResult.productA.sodium}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs pb-1.5 border-b border-gray-50 dark:border-gray-800">
                        <span className="text-gray-400 flex items-center gap-1">
                          <Utensils className="w-3.5 h-3.5 text-blue-500" /> Proteínas
                        </span>
                        <span className="font-extrabold text-gray-800 dark:text-gray-200">{comparisonResult.productA.proteins}</span>
                      </div>

                      {/* Processing badge */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-gray-400">Classificação</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          comparisonResult.productA.processingLevel === 'Baixo' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                            : comparisonResult.productA.processingLevel === 'Médio'
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400'
                        }`}>
                          Processamento {comparisonResult.productA.processingLevel}
                        </span>
                      </div>

                      {/* Ingredients list block */}
                      <div className="bg-gray-50 dark:bg-gray-800/20 p-3 rounded-xl mt-4">
                        <h5 className="text-[9px] font-black uppercase text-gray-400 tracking-wider mb-1">Lista de Ingredientes:</h5>
                        <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed max-h-24 overflow-y-auto">
                          {comparisonResult.productA.ingredients}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Product B Card */}
                  <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-xs relative">
                    <div className="absolute top-4 right-4 bg-gray-100 dark:bg-gray-800 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-md">
                      Opção B
                    </div>
                    
                    <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-4 pr-10">
                      {comparisonResult.productB.name}
                    </h4>

                    {/* Nutrient list for B */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs pb-1.5 border-b border-gray-50 dark:border-gray-800">
                        <span className="text-gray-400 flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-orange-500" /> Calorias
                        </span>
                        <span className="font-extrabold text-gray-800 dark:text-gray-200">{comparisonResult.productB.calories}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs pb-1.5 border-b border-gray-50 dark:border-gray-800">
                        <span className="text-gray-400 flex items-center gap-1">
                          <Droplets className="w-3.5 h-3.5 text-amber-500" /> Açúcares
                        </span>
                        <span className="font-extrabold text-gray-800 dark:text-gray-200">{comparisonResult.productB.sugars}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs pb-1.5 border-b border-gray-50 dark:border-gray-800">
                        <span className="text-gray-400 flex items-center gap-1">
                          <Info className="w-3.5 h-3.5 text-yellow-500" /> Gorduras
                        </span>
                        <span className="font-extrabold text-gray-800 dark:text-gray-200">{comparisonResult.productB.fats}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs pb-1.5 border-b border-gray-50 dark:border-gray-800">
                        <span className="text-gray-400 flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5 text-red-500" /> Sódio
                        </span>
                        <span className="font-extrabold text-gray-800 dark:text-gray-200">{comparisonResult.productB.sodium}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs pb-1.5 border-b border-gray-50 dark:border-gray-800">
                        <span className="text-gray-400 flex items-center gap-1">
                          <Utensils className="w-3.5 h-3.5 text-blue-500" /> Proteínas
                        </span>
                        <span className="font-extrabold text-gray-800 dark:text-gray-200">{comparisonResult.productB.proteins}</span>
                      </div>

                      {/* Processing badge */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-gray-400">Classificação</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          comparisonResult.productB.processingLevel === 'Baixo' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                            : comparisonResult.productB.processingLevel === 'Médio'
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400'
                        }`}>
                          Processamento {comparisonResult.productB.processingLevel}
                        </span>
                      </div>

                      {/* Ingredients list block */}
                      <div className="bg-gray-50 dark:bg-gray-800/20 p-3 rounded-xl mt-4">
                        <h5 className="text-[9px] font-black uppercase text-gray-400 tracking-wider mb-1">Lista de Ingredientes:</h5>
                        <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed max-h-24 overflow-y-auto">
                          {comparisonResult.productB.ingredients}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Detailed Analysis Markdown */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-xs">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-emerald-500" />
                    Comparação Quantitativa e Qualitativa Completa
                  </h4>
                  <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed space-y-3 markdown-body">
                    <Markdown>{comparisonResult.comparison.detailedAnalysis}</Markdown>
                  </div>
                </div>

                {/* Practical Recommendations */}
                {comparisonResult.comparison.recommendations.length > 0 && (
                  <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-xs">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Apple className="w-4 h-4 text-emerald-500" />
                      Dicas e Sugestões do Nutricionista
                    </h4>
                    <div className="space-y-2">
                      {comparisonResult.comparison.recommendations.map((rec: string, rIdx: number) => (
                        <div key={rIdx} className="bg-emerald-50/15 border border-emerald-100/30 p-3 rounded-xl flex gap-3 items-start">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {!comparisonResult && !isComparing && (
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-emerald-500" />
                    Comparações Anteriores
                  </h3>
                  <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full font-bold">
                    {history.length} salvas
                  </span>
                </div>

                {historyLoading ? (
                  <div className="py-12 text-center text-xs text-gray-400 space-y-2">
                    <RefreshCcw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                    <p>Carregando histórico de comparações...</p>
                  </div>
                ) : history.length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                    <span className="text-4xl">⚖️</span>
                    <div>
                      <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300">Nenhuma comparação feita ainda</h4>
                      <p className="text-[10px] text-gray-400 mt-1 max-w-xs mx-auto">
                        Selecione as imagens ou nomes de dois produtos à esquerda e confira a comparação em tempo real.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {history.map((item, hIdx) => (
                      <div
                        key={item.id || hIdx}
                        onClick={() => handleLoadPreset(item)}
                        className="p-3.5 border border-gray-100 dark:border-gray-800 hover:border-emerald-500/20 rounded-2xl flex gap-3 items-center justify-between bg-white dark:bg-gray-900 hover:bg-gray-50/50 cursor-pointer transition-all"
                      >
                        <div className="flex gap-3 items-center min-w-0">
                          <div className="flex -space-x-2 shrink-0">
                            <img src={item.productA.url} alt="" className="w-8 h-8 object-cover rounded-full border border-white dark:border-gray-800" />
                            <img src={item.productB.url} alt="" className="w-8 h-8 object-cover rounded-full border border-white dark:border-gray-800" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-gray-800 dark:text-white truncate">
                              {item.title}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.2 rounded font-extrabold uppercase">
                                {item.goal}
                              </span>
                              <span className="text-[8px] text-gray-400">
                                {item.date ? new Date(item.date).toLocaleDateString('pt-BR') : ''}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleDeleteHistory(item.id, hIdx)}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
