import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { MealPlan, Recipe, UserProfile, IntakeLog, PantryItem } from '../types';
import { 
  Plus, X, Wand2, Loader2, Info, PieChart, Activity, Share2, 
  Download, ExternalLink, Sparkles, Search, BookOpen, Clock, 
  Flame, Dumbbell, Leaf, Zap, Utensils, Check, TrendingDown, 
  Folder, ShoppingCart, CheckCircle2, AlertCircle, ArrowRight, 
  RefreshCw, CheckSquare, Square, ChevronDown, ChevronUp, Mic, MicOff
} from 'lucide-react';
import { RecipeCard } from './RecipeCard';
import { CategoryFilter, filterRecipesByCategory, getRecipeCategoryCounts, RecipeCategoryTag } from './CategoryFilter';
import { RecipeCollectionsView } from './RecipeCollectionsView';
import { generateMealSuggestions } from '../lib/gemini';
import { motion, AnimatePresence } from 'motion/react';


import { playSfx, vibrate } from '../lib/sensory';
import { safeGet, safeSet } from '../lib/storage';
import { auth, db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { exportElementAsImage, downloadBlobUrl } from '../lib/cardExport';

export const DAYS_OF_WEEK = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo'
];

export const MEALS = [
  { id: 'breakfast', label: 'breakfast' },
  { id: 'lunch', label: 'lunch' },
  { id: 'snack', label: 'snack' },
  { id: 'dinner', label: 'dinner' }
];

export function MealPlanView({
  mealPlan,
  savedRecipes,
  onUpdatePlan,
  onLogIntake,
  profile,
  onGeneratingChange
}: {
  mealPlan: MealPlan;
  savedRecipes: Recipe[];
  onUpdatePlan: (day: string, mealType: string, recipeId: string | null, recipe?: Recipe) => void;
  onLogIntake: (log: IntakeLog) => void;
  profile?: UserProfile | null;
  onGeneratingChange?: (generating: boolean) => void;
}) {
  const { t } = useTranslation();

  const [selectedDay, setSelectedDay] = useState<string>('Segunda-feira');
  const [loggingMeal, setLoggingMeal] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [addingTo, setAddingTo] = useState<{ day: string; meal: string } | null>(null);
  const [viewRecipe, setViewRecipe] = useState<Recipe | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [exportedCardUrl, setExportedCardUrl] = useState<string | null>(null);
  const [exportedBlobUrl, setExportedBlobUrl] = useState<string | null>(null);
  const [isExportingCard, setIsExportingCard] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  // Web Speech API
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognitionAPI) return alert('Speech recognition not supported');
      
      const rec = new SpeechRecognitionAPI();
      rec.lang = 'pt-BR';
      rec.onresult = (e: any) => {
        const command = e.results[0][0].transcript.toLowerCase();
        handleVoiceCommand(command);
        setIsListening(false);
      };
      recognitionRef.current = rec;
      rec.start();
      setIsListening(true);
    }
  };

  const handleVoiceCommand = (command: string) => {
    // Basic parser for: "add [recipe] to [meal] on [day]"
    const addMatch = command.match(/adicionar\s+(.+)\s+ao\s+(café da manhã|almoço|lanche|jantar)\s+na\s+(segunda|terça|quarta|quinta|sexta|sábado|domingo)/i);
    if (addMatch) {
        const recipeName = addMatch[1];
        const meal = addMatch[2];
        const day = addMatch[3];
        const dayMap: Record<string, string> = { 'segunda': 'Segunda-feira', 'terça': 'Terça-feira', 'quarta': 'Quarta-feira', 'quinta': 'Quinta-feira', 'sexta': 'Sexta-feira', 'sábado': 'Sábado', 'domingo': 'Domingo' };
        const mealMap: Record<string, string> = { 'café da manhã': 'breakfast', 'almoço': 'lunch', 'lanche': 'snack', 'jantar': 'dinner' };
        
        const targetDay = dayMap[day];
        const targetMeal = mealMap[meal];
        const recipe = savedRecipes.find(r => r.name.toLowerCase().includes(recipeName.toLowerCase()));

        if (targetDay && targetMeal && recipe) {
            onUpdatePlan(targetDay, targetMeal, recipe.id, recipe);
            playSfx('success');
            vibrate(30);
        }
    }
  };


  // States for 'Sync to Shopping List' checking against PantryScanner
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncScope, setSyncScope] = useState<'week' | 'day'>('week');
  const [isAnalyzingPantry, setIsAnalyzingPantry] = useState(false);
  const [pantryInventory, setPantryInventory] = useState<PantryItem[]>([]);
  const [analyzedIngredients, setAnalyzedIngredients] = useState<Array<{
    id: string;
    name: string;
    raw: string;
    recipeName: string;
    day: string;
    inPantry: boolean;
    pantryMatch?: PantryItem;
    selected: boolean;
  }>>([]);
  const [syncSuccessToast, setSyncSuccessToast] = useState<string | null>(null);
  const [showInPantrySection, setShowInPantrySection] = useState(false);
  const [isSyncingToShopping, setIsSyncingToShopping] = useState(false);

  const cleanIngredientName = (raw: string): string => {
    if (!raw) return '';
    let cleaned = raw.trim();
    cleaned = cleaned.replace(/^[-•*]\s*/, '');
    cleaned = cleaned.replace(/^\d+([.,]\d+)?\s*(g|kg|ml|l|colheres?\s*(de\s*sopa|de\s*chá)?|xícaras?|fatias?|unidades?|copos?|dentes?|pitadas?|latas?|potes?|ramos?)?\s*(de\s*)?/i, '');
    cleaned = cleaned.replace(/\s*\(.*?\)/g, '');
    cleaned = cleaned.replace(/\s*,\s*(a gosto|picado|fatiado|cozido|grelhado|ralado|moído|em cubos).*$/i, '');
    cleaned = cleaned.replace(/\s+a gosto.*$/i, '');
    cleaned = cleaned.trim();
    if (cleaned.length < 2) return raw.trim();
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  };

  const normalizeStr = (str: string): string => {
    return str
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/s\b/g, "");
  };

  const matchPantryItem = (ingredientName: string, pantryList: PantryItem[]): PantryItem | null => {
    const normIng = normalizeStr(cleanIngredientName(ingredientName));
    if (!normIng) return null;

    for (const p of pantryList) {
      const isExpired = p.daysRemaining !== undefined ? p.daysRemaining < 0 : p.status === 'vencido';
      if (isExpired) continue;

      const normPantry = normalizeStr(p.name);
      if (normIng.includes(normPantry) || normPantry.includes(normIng)) {
        return p;
      }

      const ingWords = normIng.split(/\s+/).filter(w => w.length >= 4);
      const pantryWords = normPantry.split(/\s+/).filter(w => w.length >= 4);
      if (ingWords.some(w => pantryWords.includes(w))) {
        return p;
      }
    }

    return null;
  };

  const analyzePlanAgainstPantry = async (scope: 'week' | 'day', dayToUse = selectedDay) => {
    setIsAnalyzingPantry(true);
    let items: PantryItem[] = [];

    // 1. Read localStorage pantry items
    try {
      const local = safeGet('nutri_pantry_items') || localStorage.getItem('nutri_pantry_items');
      if (local) items = JSON.parse(local);
    } catch (e) {}

    // 2. Read Firestore pantry items if user logged in
    try {
      const user = auth.currentUser || (profile?.id ? { uid: profile.id } : null);
      if (user) {
        const snap = await getDocs(collection(db, `users/${user.uid}/pantryItems`));
        if (!snap.empty) {
          items = snap.docs.map(d => ({ id: d.id, ...d.data() } as PantryItem));
        }
      }
    } catch (e) {
      console.warn("Aviso ao carregar itens da despensa do Firestore:", e);
    }

    // 3. Baseline demo items fallback if completely empty
    if (!items || items.length === 0) {
      items = [
        {
          id: 'item-demo-1',
          name: 'Peito de Frango Resfriado',
          quantity: '600g',
          category: 'Proteínas & Carnes',
          expirationDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
          daysRemaining: 2,
          status: 'perto_vencimento',
          storageLocation: 'geladeira',
          addedAt: new Date().toISOString()
        },
        {
          id: 'item-demo-2',
          name: 'Iogurte Grego Natural',
          quantity: '2 potes',
          category: 'Laticínios & Ovos',
          expirationDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
          daysRemaining: 3,
          status: 'perto_vencimento',
          storageLocation: 'geladeira',
          addedAt: new Date().toISOString()
        },
        {
          id: 'item-demo-3',
          name: 'Tomates Maduros',
          quantity: '4 unidades',
          category: 'Vegetais & Frutas',
          expirationDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
          daysRemaining: 3,
          status: 'perto_vencimento',
          storageLocation: 'geladeira',
          addedAt: new Date().toISOString()
        },
        {
          id: 'item-demo-4',
          name: 'Creme de Leite Leve',
          quantity: '1 caixa',
          category: 'Laticínios & Ovos',
          expirationDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          daysRemaining: 30,
          status: 'fresco',
          storageLocation: 'despensa',
          addedAt: new Date().toISOString()
        },
        {
          id: 'item-demo-5',
          name: 'Macarrão Integral Penne',
          quantity: '500g',
          category: 'Grãos & Massas',
          expirationDate: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
          daysRemaining: 180,
          status: 'fresco',
          storageLocation: 'despensa',
          addedAt: new Date().toISOString()
        }
      ];
    }
    setPantryInventory(items);

    // 4. Extract ingredients from meal plan
    const daysToScan = scope === 'week' ? DAYS_OF_WEEK : [dayToUse];
    const candidateList: Array<{
      id: string;
      name: string;
      raw: string;
      recipeName: string;
      day: string;
      inPantry: boolean;
      pantryMatch?: PantryItem;
      selected: boolean;
    }> = [];

    const seenCleanNames = new Set<string>();

    daysToScan.forEach(dayName => {
      const dayMeals = mealPlan[dayName]?.meals;
      if (dayMeals) {
        Object.entries(dayMeals).forEach(([mealKey, recipe]) => {
          if (recipe && Array.isArray(recipe.ingredients)) {
            recipe.ingredients.forEach((rawIng, idx) => {
              const clean = cleanIngredientName(rawIng);
              const key = clean.toLowerCase();
              if (key.length >= 2 && !seenCleanNames.has(key)) {
                seenCleanNames.add(key);
                const match = matchPantryItem(clean, items);
                const inPantry = !!match;
                candidateList.push({
                  id: `sync_${dayName}_${mealKey}_${idx}`,
                  name: clean,
                  raw: rawIng,
                  recipeName: recipe.name || recipe.title || 'Receita do Plano',
                  day: dayName,
                  inPantry,
                  pantryMatch: match || undefined,
                  selected: !inPantry
                });
              }
            });
          }
        });
      }
    });

    setAnalyzedIngredients(candidateList);
    setIsAnalyzingPantry(false);
  };

  const handleOpenSyncModal = () => {
    setIsSyncModalOpen(true);
    setSyncSuccessToast(null);
    analyzePlanAgainstPantry(syncScope, selectedDay);
  };

  const handleScopeChange = (newScope: 'week' | 'day') => {
    setSyncScope(newScope);
    analyzePlanAgainstPantry(newScope, selectedDay);
  };

  const handleToggleIngredient = (id: string) => {
    setAnalyzedIngredients(prev => 
      prev.map(item => item.id === id ? { ...item, selected: !item.selected } : item)
    );
  };

  const handleToggleSelectAll = (select: boolean) => {
    setAnalyzedIngredients(prev =>
      prev.map(item => !item.inPantry ? { ...item, selected: select } : item)
    );
  };

  const handleConfirmSyncToShoppingList = async () => {
    const missingToAdd = analyzedIngredients.filter(i => !i.inPantry && i.selected);
    if (missingToAdd.length === 0) {
      window.dispatchEvent(new CustomEvent('app:notification', {
        detail: {
          title: "Nenhum item selecionado",
          message: "Selecione ao menos um ingrediente para adicionar à lista de compras.",
          type: "info"
        }
      }));
      return;
    }

    setIsSyncingToShopping(true);

    let existingCustom: Array<{ name: string; checked: boolean; [k: string]: any }> = [];
    try {
      const raw = safeGet('nutri-shopping-custom-items');
      if (raw) existingCustom = JSON.parse(raw);
    } catch (e) {}

    let checkedMap: Record<string, boolean> = {};
    try {
      const rawChecked = safeGet('nutri-shopping-checked');
      if (rawChecked) checkedMap = JSON.parse(rawChecked);
    } catch (e) {}

    const existingNames = new Set(existingCustom.map(i => i.name.toLowerCase().trim()));
    const newItemsCreated: any[] = [];

    missingToAdd.forEach((item, idx) => {
      const cleanName = item.name.trim();
      checkedMap[cleanName] = false;
      checkedMap[item.raw] = false;

      if (!existingNames.has(cleanName.toLowerCase())) {
        const newItem = {
          id: `shop_mealplan_${Date.now()}_${idx}`,
          name: cleanName,
          checked: false,
          addedAt: new Date().toISOString(),
          source: 'meal-plan-sync',
          recipeName: item.recipeName,
          day: item.day
        };
        newItemsCreated.push(newItem);
        existingNames.add(cleanName.toLowerCase());
      }
    });

    const updatedCustomList = [...existingCustom, ...newItemsCreated];

    safeSet('nutri-shopping-custom-items', JSON.stringify(updatedCustomList));
    safeSet('nutri-shopping-checked', JSON.stringify(checkedMap));

    try {
      const targetUid = auth.currentUser?.uid || profile?.id;
      if (targetUid) {
        for (const item of newItemsCreated) {
          await setDoc(doc(db, 'users', targetUid, 'shoppingList', item.id), item, { merge: true });
        }
      }
    } catch (e) {
      console.warn("Aviso ao persistir itens sincronizados no Firestore:", e);
    }

    window.dispatchEvent(new CustomEvent('nutri:shopping-list-updated'));
    window.dispatchEvent(new CustomEvent('app:notification', {
      detail: {
        title: "Sincronizado com Sucesso! 🛒",
        message: `${missingToAdd.length} ingredientes adicionados à Lista de Compras.`,
        type: "success"
      }
    }));

    playSfx('success');
    vibrate([30, 50]);

    setIsSyncingToShopping(false);
    setSyncSuccessToast(`${missingToAdd.length} ingredientes faltantes foram adicionados à sua Lista de Compras!`);
  };

  const handleNavigateToShoppingList = () => {
    setIsSyncModalOpen(false);
    window.dispatchEvent(new CustomEvent('app:navigate', { detail: 'shopping' }));
  };

  const handleExportCard = async () => {
    if (!shareCardRef.current) return;
    setIsExportingCard(true);
    try {
      const fileName = `plano-alimentar-${selectedDay.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
      const result = await exportElementAsImage(
        shareCardRef.current,
        fileName,
        `Plano Alimentar - ${selectedDay}`
      );

      if (result.success && result.dataUrl) {
        setExportedCardUrl(result.dataUrl);
        if (result.blobUrl) {
          setExportedBlobUrl(result.blobUrl);
        }

        window.dispatchEvent(new CustomEvent('app:notification', {
          detail: {
            title: result.shared ? "Compartilhado com Sucesso! 📸" : "Imagem Pronta! 📸",
            message: result.shared 
              ? `Plano de ${selectedDay} compartilhado.`
              : `Toque no botão Salvar ou mantenha pressionado para baixar.`,
            type: "success"
          }
        }));
      } else {
        throw new Error(result.error || "Falha ao gerar imagem.");
      }
    } catch (err: any) {
      console.warn("Erro ao gerar imagem do plano:", err);
      window.dispatchEvent(new CustomEvent('app:notification', {
        detail: {
          title: "Aviso de Exportação",
          message: "Você pode tirar um print ou tentar novamente.",
          type: "info"
        }
      }));
    } finally {
      setIsExportingCard(false);
    }
  };

  // States for calorie/nutrient tracker and quick log
  const [activeTrackerTab, setActiveTrackerTab] = useState<'planned' | 'actual'>('planned');
  const [showQuickLogForm, setShowQuickLogForm] = useState(false);
  const [quickLogName, setQuickLogName] = useState('');
  const [quickLogCal, setQuickLogCal] = useState<number>(200);
  const [quickLogProtein, setQuickLogProtein] = useState<number>(15);
  const [quickLogCarbs, setQuickLogCarbs] = useState<number>(25);
  const [quickLogFat, setQuickLogFat] = useState<number>(5);

  // States for CategoryFilter & Recipe Collections
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategoryTag>('all');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [savedRecipesViewMode, setSavedRecipesViewMode] = useState<'collections' | 'categories'>('collections');

  const categoryCounts = useMemo(() => getRecipeCategoryCounts(savedRecipes), [savedRecipes]);

  const filteredSavedRecipes = useMemo(() => {
    let list = filterRecipesByCategory(savedRecipes, selectedCategory);
    if (recipeSearch.trim()) {
      const q = recipeSearch.toLowerCase().trim();
      list = list.filter(r => 
        (r.name || r.title || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [savedRecipes, selectedCategory, recipeSearch]);

  const dayPlan = mealPlan[selectedDay]?.meals || {};

  // Formulate recommended values dynamically based on profile
  const getRecommendedStats = () => {
    if (profile?.masterPlan?.dailyCalories) {
      return {
        calories: profile.masterPlan.dailyCalories,
        protein: profile.masterPlan.macros?.protein || 0,
        carbs: profile.masterPlan.macros?.carbs || 0,
        fat: profile.masterPlan.macros?.fat || 0,
        fiber: 30,
        sugar: 50,
      };
    }

    // Fallback calculation based on profile (Mifflin-St Jeor)
    const weight = profile?.weight || 70;
    const height = profile?.height || 170;
    const age = profile?.age || 30;
    const isMale = profile?.gender?.toLowerCase() === 'masculino';
    
    const s = isMale ? 5 : -161;
    const bmr = 10 * weight + 6.25 * height - 5 * age + s;
    
    let multiplier = 1.3;
    if (profile?.activityLevel?.toLowerCase().includes('alto') || profile?.activityLevel?.toLowerCase().includes('pesado') || profile?.activityLevel?.toLowerCase().includes('muito')) {
      multiplier = 1.6;
    } else if (profile?.activityLevel?.toLowerCase().includes('moderado') || profile?.activityLevel?.toLowerCase().includes('médio')) {
      multiplier = 1.4;
    } else if (profile?.activityLevel?.toLowerCase().includes('baixo') || profile?.activityLevel?.toLowerCase().includes('leve')) {
      multiplier = 1.2;
    }

    let calories = Math.round(bmr * multiplier);
    const goalText = (profile?.goals || '').toLowerCase();
    
    if (goalText.includes('perda') || goalText.includes('emagrecer') || goalText.includes('perder') || goalText.includes('seca')) {
      calories -= 400;
    } else if (goalText.includes('ganho') || goalText.includes('hipertrofia') || goalText.includes('massa') || goalText.includes('bulking')) {
      calories += 300;
    }

    calories = Math.max(1200, calories);

    let protein = Math.round(weight * 1.5);
    if (goalText.includes('ganho') || goalText.includes('hipertrofia')) {
      protein = Math.round(weight * 2.0);
    }
    protein = Math.max(50, Math.min(220, protein));

    const fat = Math.round((calories * 0.25) / 9);
    const carbs = Math.round((calories - (protein * 4) - (fat * 9)) / 4);

    return {
      calories,
      protein,
      carbs,
      fat,
      fiber: 30,
      sugar: 50
    };
  };

  const getPlannedStats = () => {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    let fiber = 0;
    let sugar = 0;
    const vitaminsSet = new Set<string>();
    const mineralsSet = new Set<string>();

    Object.values(dayPlan).forEach((recipe: any) => {
      if (recipe && recipe.nutrition) {
        calories += recipe.nutrition.calories || 0;
        protein += recipe.nutrition.protein || 0;
        carbs += recipe.nutrition.carbs || 0;
        fat += recipe.nutrition.fat || 0;
        fiber += recipe.nutrition.fiber || 0;
        sugar += recipe.nutrition.sugar || 0;
        if (recipe.nutrition.vitamins) {
          recipe.nutrition.vitamins.forEach((v: string) => vitaminsSet.add(v));
        }
        if (recipe.nutrition.minerals) {
          recipe.nutrition.minerals.forEach((m: string) => mineralsSet.add(m));
        }
      }
    });

    return {
      calories,
      protein,
      carbs,
      fat,
      fiber,
      sugar,
      vitamins: Array.from(vitaminsSet),
      minerals: Array.from(mineralsSet)
    };
  };

  const getTodayIntakeStats = () => {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    let fiber = 0;
    let sugar = 0;
    const vitaminsSet = new Set<string>();
    const mineralsSet = new Set<string>();

    const todayStr = new Date().toDateString();
    
    const todayLogs = (profile?.intakeLogs || []).filter(log => {
      return new Date(log.date).toDateString() === todayStr;
    });

    todayLogs.forEach(log => {
      const nut = log.actual || log.planned;
      if (nut) {
        calories += nut.calories || 0;
        protein += nut.protein || 0;
        carbs += nut.carbs || 0;
        fat += nut.fat || 0;
        fiber += nut.fiber || 0;
        sugar += nut.sugar || 0;
        if (nut.vitamins) {
          nut.vitamins.forEach(v => vitaminsSet.add(v));
        }
        if (nut.minerals) {
          nut.minerals.forEach(m => mineralsSet.add(m));
        }
      }
    });

    return {
      calories,
      protein,
      carbs,
      fat,
      fiber,
      sugar,
      vitamins: Array.from(vitaminsSet),
      minerals: Array.from(mineralsSet)
    };
  };

  const recommendedNutrition = getRecommendedStats();
  const plannedNutrition = getPlannedStats();
  const actualNutrition = getTodayIntakeStats();

  const currentNutrition = activeTrackerTab === 'planned' ? plannedNutrition : actualNutrition;

  const proteinDeviation = recommendedNutrition.protein > 0 ? (plannedNutrition.protein - recommendedNutrition.protein) / recommendedNutrition.protein : 0;
  const carbsDeviation = recommendedNutrition.carbs > 0 ? (plannedNutrition.carbs - recommendedNutrition.carbs) / recommendedNutrition.carbs : 0;
  const fatDeviation = recommendedNutrition.fat > 0 ? (plannedNutrition.fat - recommendedNutrition.fat) / recommendedNutrition.fat : 0;
  
  const isProteinOff = Math.abs(proteinDeviation) > 0.2;
  const isCarbsOff = Math.abs(carbsDeviation) > 0.2;
  const isFatOff = Math.abs(fatDeviation) > 0.2;

  const handleQuickLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickLogName.trim()) return;

    const log: IntakeLog = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      mealId: 'custom-log-' + crypto.randomUUID(),
      recipeName: quickLogName,
      planned: {
        calories: Number(quickLogCal),
        protein: Number(quickLogProtein),
        carbs: Number(quickLogCarbs),
        fat: Number(quickLogFat),
        fiber: 0,
        sugar: 0
      },
      actual: {
        calories: Number(quickLogCal),
        protein: Number(quickLogProtein),
        carbs: Number(quickLogCarbs),
        fat: Number(quickLogFat),
        fiber: 0,
        sugar: 0
      },
      adjusted: false
    };

    onLogIntake(log);
    setQuickLogName('');
    setShowQuickLogForm(false);
  };

  const handleLogMeal = (recipe: Recipe, mealLabel: string) => {
    const lower = mealLabel.toLowerCase();
    const detectedType = lower.includes('almo') ? 'lunch'
      : lower.includes('jant') ? 'dinner'
      : lower.includes('caf') ? 'breakfast'
      : 'snack';

    const log: IntakeLog = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      mealId: recipe.id,
      recipeName: recipe.name,
      planned: recipe.nutrition,
      actual: recipe.nutrition, // By default we assume they ate what was planned unless they adjust
      adjusted: false,
      mealType: detectedType
    };
    onLogIntake(log);
    setLoggingMeal(mealLabel);
    setTimeout(() => setLoggingMeal(null), 2000);
  };

  const handleGenerateDay = async () => {
    setIsGenerating(true);
    if (onGeneratingChange) onGeneratingChange(true);
    try {
      const suggestions = await generateMealSuggestions(profile, selectedDay);
      if (suggestions && suggestions.length > 0) {
        const mealTypes = ['breakfast', 'lunch', 'snack', 'dinner'];
        suggestions.forEach((recipe, idx) => {
          if (idx < mealTypes.length) {
            const mealType = mealTypes[idx];
            const recipeId = crypto.randomUUID();
            onUpdatePlan(selectedDay, mealType, recipeId, { ...recipe, id: recipeId } as any);
          }
        });
      } else {
        alert("Não foi possível gerar sugestões suficientes. Tente novamente.");
      }
    } catch (err) {
      console.warn(err);
      alert("Erro ao gerar plano.");
    } finally {
      setIsGenerating(false);
      if (onGeneratingChange) onGeneratingChange(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-4 mb-12">
        <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
          Seu Plano Semanal
        </h2>
        <p className="font-sans text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-lg leading-relaxed">
          Organize suas refeições geradas pela IA e mantenha o foco na sua rotina saudável.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-2">
          {DAYS_OF_WEEK.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`w-full text-left px-6 py-4 rounded-2xl transition-all duration-300 font-medium font-sans ${
                selectedDay === day
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'bg-white/40 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-700/60 border border-white/60 dark:border-slate-700/50 backdrop-blur-md'
              }`}
            >
              {t(day)}
            </button>
          ))}
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="flex justify-between items-center clay-card p-8 shadow-sm">
            <div>
              <h3 className="font-serif text-2xl font-medium text-slate-800 dark:text-slate-100">{t(selectedDay)}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">{t('mealplan_plan_hint', 'Planeje suas 3 principais refeições.')}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={toggleListening} className={`p-3 rounded-full ${isListening ? 'bg-red-500' : 'bg-emerald-500'} text-white`}>
                {isListening ? <MicOff /> : <Mic />}
              </button>
              <button
                onClick={handleOpenSyncModal}
                className="bg-teal-50 dark:bg-teal-900/40 hover:bg-teal-100 dark:hover:bg-teal-800/60 text-teal-700 dark:text-teal-300 font-semibold px-4 py-2.5 rounded-full transition-colors flex items-center justify-center gap-2 text-sm border border-teal-500/20 shadow-sm cursor-pointer"
                title="Sincronizar ingredientes faltantes com a Lista de Compras checando a Despensa"
              >
                <ShoppingCart className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Sincronizar Lista</span>
              </button>
              <button
                onClick={() => {
                  playSfx('tap');
                  vibrate(15);
                  setIsPdfModalOpen(true);
                }}
                className="bg-emerald-50 dark:bg-emerald-900/40 hover:bg-emerald-100 dark:hover:bg-emerald-800/60 text-emerald-700 dark:text-emerald-300 font-medium px-4 py-2.5 rounded-full transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer border border-emerald-500/20"
                title="Exportar Plano da Semana e Lista de Compras em PDF"
              >
                <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Exportar PDF</span>
              </button>
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-800/60 text-indigo-700 dark:text-indigo-300 font-medium px-4 py-2.5 rounded-full transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                {t('share', 'Compartilhar')}
              </button>
              <button
                onClick={handleGenerateDay}
                disabled={isGenerating}
                className="bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 dark:hover:bg-emerald-800/60 text-emerald-700 dark:text-emerald-300 font-medium px-4 py-2.5 rounded-full transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                Auto-Completar
              </button>
            </div>
          </div>


          {/* NOVO: Acompanhamento de Calorias e Nutrientes */}
          <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-[32px] clay-card p-6 md:p-8 border border-white/60 dark:border-slate-700/50 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h4 className="font-serif text-2xl font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <PieChart className="w-6 h-6 text-emerald-500" />
                  Acompanhamento Nutricional Diário
                </h4>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Acompanhe suas calorias e nutrientes contra a meta recomendada.</p>
              </div>
              <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-900/40 rounded-xl w-full sm:w-auto sm:flex sm:flex-row gap-0.5">
                <button
                  type="button"
                  onClick={() => setActiveTrackerTab('planned')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all truncate text-center cursor-pointer ${
                    activeTrackerTab === 'planned'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title={`Plano (${selectedDay})`}
                >
                  <span className="truncate block">Plano ({selectedDay})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTrackerTab('actual')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all truncate text-center cursor-pointer ${
                    activeTrackerTab === 'actual'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Consumo Real (Hoje)"
                >
                  <span className="truncate block">Consumo Real</span>
                </button>
              </div>
            </div>

            {/* Stats & Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Calories radial progress representation */}
              <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-[24px] border border-white/60 dark:border-slate-700/40 shadow-sm text-center">
                <span className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-2">{t('mealplan_daily_calories', 'Calorias Diárias')}</span>
                <div className="relative w-36 h-36 flex items-center justify-center">
                  {/* SVG ring */}
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="72"
                      cy="72"
                      r="60"
                      className="stroke-slate-100 dark:stroke-slate-700/40"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="72"
                      cy="72"
                      r="60"
                      className="stroke-emerald-500"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={377}
                      strokeDashoffset={377 - (377 * Math.min(100, Math.round((currentNutrition.calories / recommendedNutrition.calories) * 100))) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold font-serif text-slate-800 dark:text-slate-100">{currentNutrition.calories}</span>
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500">de {recommendedNutrition.calories} kcal</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
                  <Activity className="w-3.5 h-3.5 text-emerald-500" />
                  {Math.round((currentNutrition.calories / recommendedNutrition.calories) * 100)}% da meta atingida
                </div>
              </div>

              {/* Macronutrient Breakdown progress bars */}
              <div className="lg:col-span-8 space-y-5">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700/40">
                  <span className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Macronutrientes</span>
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Consumido / Recomendado</span>
                </div>

                {/* Protein macro */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                      Proteínas
                    </span>
                    <span className="font-mono text-slate-400 dark:text-slate-500">
                      <span className="font-bold text-slate-700 dark:text-slate-200">{currentNutrition.protein}g</span> / {recommendedNutrition.protein}g
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700/40 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.round((currentNutrition.protein / recommendedNutrition.protein) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Carbs macro */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                      Carboidratos
                    </span>
                    <span className="font-mono text-slate-400 dark:text-slate-500">
                      <span className="font-bold text-slate-700 dark:text-slate-200">{currentNutrition.carbs}g</span> / {recommendedNutrition.carbs}g
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700/40 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.round((currentNutrition.carbs / recommendedNutrition.carbs) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Fats macro */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                      Gorduras
                    </span>
                    <span className="font-mono text-slate-400 dark:text-slate-500">
                      <span className="font-bold text-slate-700 dark:text-slate-200">{currentNutrition.fat}g</span> / {recommendedNutrition.fat}g
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700/40 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.round((currentNutrition.fat / recommendedNutrition.fat) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Calorie Limit Alert & SmartSwaps Bridge Banner */}
            {currentNutrition.calories >= recommendedNutrition.calories && currentNutrition.calories > 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-transparent border border-rose-300 dark:border-rose-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/20">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                      Limite Calórico Atingido ({currentNutrition.calories} / {recommendedNutrition.calories} kcal)
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      O SmartSwaps preparou pequenas trocas saudáveis automáticas para reequilibrar este dia mantendo a saciedade.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    playSfx('tap');
                    window.dispatchEvent(new CustomEvent('app:navigate', { detail: { tab: 'swaps', subTab: 'mealPlanAudit' } }));
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ver Trocas no SmartSwaps</span>
                </button>
              </div>
            )}
            
            {/* Macro Deviation Alerts */}
            {activeTrackerTab === 'planned' && (isProteinOff || isCarbsOff || isFatOff) && (
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-200 dark:border-amber-900/40 flex items-center gap-3 animate-in fade-in">
                <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  {isProteinOff && `Proteínas ${proteinDeviation > 0 ? 'acima' : 'abaixo'} da meta (${(proteinDeviation * 100).toFixed(0)}%). `}
                  {isCarbsOff && `Carboidratos ${carbsDeviation > 0 ? 'acima' : 'abaixo'} da meta (${(carbsDeviation * 100).toFixed(0)}%). `}
                  {isFatOff && `Gorduras ${fatDeviation > 0 ? 'acima' : 'abaixo'} da meta (${(fatDeviation * 100).toFixed(0)}%). `}
                  Revise seu plano para melhor alinhamento.
                </p>
              </div>
            )}

            {/* Micronutrients breakdown inside tracker */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-700/40 text-sm">
              <div>
                <h5 className="font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">{t('mealplan_fiber_sugar', 'Fibras e Açúcares')}</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <p className="text-xs text-slate-400 dark:text-slate-500">Fibras Totais</p>
                    <p className="text-base font-bold text-slate-700 dark:text-slate-200 font-mono mt-0.5">{currentNutrition.fiber}g <span className="text-xs text-slate-400 font-normal">/ {recommendedNutrition.fiber}g</span></p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <p className="text-xs text-slate-400 dark:text-slate-500">{t('mealplan_daily_sugar', 'Açúcares Diários')}</p>
                    <p className="text-base font-bold text-slate-700 dark:text-slate-200 font-mono mt-0.5">{currentNutrition.sugar}g <span className="text-xs text-slate-400 font-normal">/ max {recommendedNutrition.sugar}g</span></p>
                  </div>
                </div>
              </div>

              <div>
                <h5 className="font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Minerais e Vitaminas Ingeridos</h5>
                <div className="bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 min-h-[4.5rem] flex flex-wrap gap-1.5 items-start content-start">
                  {currentNutrition.vitamins.length === 0 && currentNutrition.minerals.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic mt-2">{t('mealplan_no_micronutrients', 'Nenhum micronutriente registrado para as refeições deste dia.')}</p>
                  ) : (
                    <>
                      {currentNutrition.vitamins.map((v, i) => (
                        <span key={`v-${i}`} className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-900 dark:text-emerald-400 px-2 py-0.5 rounded-md flex items-center gap-1">🧪 {v}</span>
                      ))}
                      {currentNutrition.minerals.map((m, i) => (
                        <span key={`m-${i}`} className="text-[10px] font-semibold bg-sky-500/10 text-sky-900 dark:text-sky-400 px-2 py-0.5 rounded-md flex items-center gap-1">💎 {m}</span>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons to trigger Quick Log form */}
            <div className="flex flex-wrap justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowQuickLogForm(!showQuickLogForm)}
                className="bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100/80 hover:dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-semibold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 border border-emerald-500/10"
              >
                <Plus className="w-4 h-4" />
                {showQuickLogForm ? 'Fechar Registro Rápido' : 'Registro Rápido de Alimento'}
              </button>
            </div>

            {showQuickLogForm && (
              <form onSubmit={handleQuickLogSubmit} className="bg-slate-50 dark:bg-slate-900/30 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50 dark:border-slate-700/50">
                  <h5 className="font-serif text-base font-bold text-slate-800 dark:text-slate-200 font-bold">Registrar Alimento</h5>
                  <span className="text-[10px] font-mono tracking-wider font-extrabold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md uppercase font-black">Ganhe +15 Pontos</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider font-bold">{t('food_name_label', 'Nome do Alimento')}</label>
                    <input
                      type="text"
                      placeholder={t('placeholder_quick_log_food', 'Ex: Banana com aveia, Whey protein')}
                      value={quickLogName}
                      onChange={(e) => setQuickLogName(e.target.value)}
                      required
                      className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-800 dark:text-slate-100 text-sm shadow-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase font-bold">{t('kcal_label', 'Kcal')}</label>
                      <input
                        type="number"
                        min="0"
                        value={quickLogCal}
                        onChange={(e) => setQuickLogCal(Number(e.target.value))}
                        required
                        className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-800 dark:text-slate-100 text-sm font-mono text-center shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase font-bold">{t('mealplan_proteins', 'Proteínas')}</label>
                      <input
                        type="number"
                        min="0"
                        value={quickLogProtein}
                        onChange={(e) => setQuickLogProtein(Number(e.target.value))}
                        required
                        className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-800 dark:text-slate-100 text-sm font-mono text-center shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase font-bold">{t('carbs_label', 'Carbos')}</label>
                      <input
                        type="number"
                        min="0"
                        value={quickLogCarbs}
                        onChange={(e) => setQuickLogCarbs(Number(e.target.value))}
                        required
                        className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-800 dark:text-slate-100 text-sm font-mono text-center shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase font-bold">{t('fats_label', 'Gorduras')}</label>
                      <input
                        type="number"
                        min="0"
                        value={quickLogFat}
                        onChange={(e) => setQuickLogFat(Number(e.target.value))}
                        required
                        className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-800 dark:text-slate-100 text-sm font-mono text-center shadow-sm"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickLogForm(false)}
                    className="bg-transparent hover:bg-slate-100 text-slate-500 dark:hover:bg-slate-800 px-4 py-2 rounded-xl text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-md shadow-emerald-500/20 flex items-center gap-1"
                  >
                    Salvar Alimento
                  </button>
                </div>
              </form>
            )}
          </div>

          {MEALS.map((mealType) => {
            const recipe = dayPlan[mealType.id as keyof typeof dayPlan];
            
            return (
              <div key={mealType.id} className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-[32px] clay-card p-6 md:p-8 border border-white/60 dark:border-slate-700/50 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-serif text-2xl font-medium text-slate-800 dark:text-slate-100">
                    {t(mealType.label)}
                  </h3>
                  {recipe && (
                    <button
                      onClick={() => onUpdatePlan(selectedDay, mealType.id, null)}
                      className="text-slate-400 hover:text-red-500 p-2 rounded-full hover:bg-white/60 dark:hover:bg-slate-700/60 transition-colors"
                      title={t('remove_meal', 'Remover refeição')}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {recipe ? (
                  <motion.div 
                    whileHover={{ scale: 1.02, y: -2 }}
                    transition={{ type: "spring", stiffness: 380, damping: 25 }}
                    className="flex items-center justify-between bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-[24px] p-4 border border-white/80 dark:border-slate-600/50 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-500/40 transition-shadow group"
                  >
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{recipe.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{recipe.prepTime} • {recipe.nutrition.calories} kcal</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleLogMeal(recipe, mealType.label)}
                        disabled={loggingMeal === mealType.label}
                        className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                          loggingMeal === mealType.label
                          ? 'bg-emerald-500 text-white'
                          : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100'
                        }`}
                      >
                        {loggingMeal === mealType.label ? (
                          <span className="flex items-center gap-1">✓ Logado</span>
                        ) : 'Eu comi!'}
                      </button>
                      <button 
                        onClick={() => setViewRecipe(recipe)}
                        className="text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 p-2 transition-colors"
                      >
                        <Info className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <div>
                    {addingTo?.day === selectedDay && addingTo?.meal === mealType.id ? (
                      <div className="space-y-4 bg-white/70 dark:bg-slate-900/80 p-5 rounded-[24px] border border-emerald-500/30 shadow-md">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            {t('select_recipe_for_meal', 'Selecionar Receita Salva')}
                          </span>
                          <button 
                            onClick={() => {
                              playSfx('tap');
                              setAddingTo(null);
                            }}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                            title="Fechar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Category Filter Pills */}
                        <CategoryFilter
                          selectedCategory={selectedCategory}
                          onSelectCategory={setSelectedCategory}
                          recipeCounts={categoryCounts}
                          variant="compact"
                          size="sm"
                        />

                        {/* Search Input */}
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={recipeSearch}
                            onChange={(e) => setRecipeSearch(e.target.value)}
                            placeholder={t('search_recipes_placeholder', 'Buscar por nome ou ingrediente...')}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/30"
                          />
                        </div>

                        {/* Filtered Recipes List */}
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                          {filteredSavedRecipes.length > 0 ? (
                            filteredSavedRecipes.map((r) => {
                              const protein = r.nutrition?.protein ?? r.protein ?? 0;
                              const calories = r.nutrition?.calories ?? r.calories ?? 0;
                              return (
                                <motion.div
                                  whileHover={{ scale: 1.015, x: 3 }}
                                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                  key={r.id}
                                  className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-500/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
                                >
                                  <div className="flex-1 min-w-0 pr-3">
                                    <h5 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                                      {r.name || r.title}
                                    </h5>
                                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                      {r.prepTime && (
                                        <span className="flex items-center gap-1 font-mono">
                                          <Clock className="w-3 h-3 text-slate-400" />
                                          {r.prepTime}
                                        </span>
                                      )}
                                      {calories > 0 && (
                                        <span className="flex items-center gap-1 font-mono">
                                          <Flame className="w-3 h-3 text-orange-400" />
                                          {calories} kcal
                                        </span>
                                      )}
                                      {protein > 0 && (
                                        <span className="flex items-center gap-1 font-mono text-blue-600 dark:text-blue-400">
                                          <Dumbbell className="w-3 h-3" />
                                          {protein}g prot
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setViewRecipe(r)}
                                      className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                      title={t('view_recipe', 'Ver Receita')}
                                    >
                                      <Info className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        playSfx('success');
                                        vibrate(20);
                                        onUpdatePlan(selectedDay, mealType.id, r.id, r);
                                        setAddingTo(null);
                                      }}
                                      className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      {t('select', 'Escolher')}
                                    </button>
                                  </div>
                                </motion.div>
                              );
                            })
                          ) : (
                            <div className="text-center py-6 px-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                                {t('no_recipes_in_category', 'Nenhuma receita encontrada para esta categoria ou busca.')}
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCategory('all');
                                  setRecipeSearch('');
                                }}
                                className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                              >
                                {t('view_all_recipes', 'Ver todas as receitas')}
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end pt-1">
                          <button 
                            onClick={() => setAddingTo(null)}
                            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium px-2 py-1"
                          >
                            {t('cancel', 'Cancelar')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          playSfx('tap');
                          setAddingTo({ day: selectedDay, meal: mealType.id });
                        }}
                        className="w-full py-8 border-2 border-dashed border-white/80 dark:border-slate-700/50 bg-white/20 dark:bg-slate-800/20 rounded-[24px] text-slate-400 dark:text-slate-500 hover:text-emerald-500 dark:hover:text-emerald-400 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-white/40 dark:hover:bg-slate-700/40 transition-all flex items-center justify-center gap-2 font-medium cursor-pointer"
                      >
                        <Plus className="w-5 h-5" />
                        {t('add_meal', 'Adicionar Refeição')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {/* Saved Recipes Explorer Section with CategoryFilter and Recipe Collections */}
          {savedRecipes.length > 0 && (
            <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-[32px] clay-card p-6 md:p-8 border border-white/60 dark:border-slate-700/50 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{t('saved_recipes_hub', 'Banco de Receitas Salvas')}</span>
                  </div>
                  <h4 className="font-serif text-2xl font-medium text-slate-800 dark:text-slate-100">
                    {savedRecipesViewMode === 'collections' ? 'Coleções e Pastas Personalizadas' : t('filter_by_category', 'Filtrar por Categoria')}
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
                    {savedRecipesViewMode === 'collections'
                      ? 'Organize e acesse suas receitas em pastas como Weekly Meal Prep, Post-Workout e Desserts.'
                      : t('filter_recipes_desc', 'Explore suas receitas favoritas por tags como Vegano, Hiperproteico, Preparo Rápido e Low-Carb.')}
                  </p>
                </div>

                {/* View Mode Toggle: Coleções vs Categorias */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => { playSfx('tap'); setSavedRecipesViewMode('collections'); }}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      savedRecipesViewMode === 'collections'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Folder className="w-3.5 h-3.5" />
                    <span>Pastas & Coleções</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { playSfx('tap'); setSavedRecipesViewMode('categories'); }}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      savedRecipesViewMode === 'categories'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>Categorias</span>
                  </button>
                </div>
              </div>

              {savedRecipesViewMode === 'collections' ? (
                <RecipeCollectionsView 
                  savedRecipes={savedRecipes}
                  onSelectRecipe={(recipe) => setViewRecipe(recipe)}
                />
              ) : (
                <>
                  {/* Category Filter Component */}
                  <CategoryFilter
                    selectedCategory={selectedCategory}
                    onSelectCategory={setSelectedCategory}
                    recipeCounts={categoryCounts}
                  />

              {/* Grid of Filtered Recipes */}
              {filteredSavedRecipes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  {filteredSavedRecipes.map((recipe) => {
                    const protein = recipe.nutrition?.protein ?? recipe.protein ?? 0;
                    const calories = recipe.nutrition?.calories ?? recipe.calories ?? 0;
                    return (
                      <motion.div
                        whileHover={{ scale: 1.03, y: -4 }}
                        transition={{ type: "spring", stiffness: 350, damping: 22 }}
                        key={recipe.id}
                        className="bg-white/90 dark:bg-slate-800/90 rounded-[24px] p-4 border border-slate-200/80 dark:border-slate-700/70 shadow-sm hover:shadow-xl hover:shadow-emerald-500/15 hover:border-emerald-500/50 transition-all flex flex-col justify-between space-y-3 cursor-pointer group"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h5 className="font-bold text-slate-800 dark:text-slate-100 text-sm line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {recipe.name || recipe.title}
                            </h5>
                            <button
                              type="button"
                              onClick={() => setViewRecipe(recipe)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                              title={t('view_recipe', 'Ver Receita')}
                            >
                              <Info className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                            {recipe.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                            {recipe.prepTime && (
                              <span className="flex items-center gap-1 font-mono">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {recipe.prepTime}
                              </span>
                            )}
                            {calories > 0 && (
                              <span className="flex items-center gap-1 font-mono">
                                <Flame className="w-3 h-3 text-orange-400" />
                                {calories} kcal
                              </span>
                            )}
                          </div>
                          
                          {/* Quick Add Button to current selected day */}
                          <button
                            type="button"
                            onClick={() => {
                              const emptyMeal = MEALS.find(m => !dayPlan[m.id as keyof typeof dayPlan])?.id || 'lunch';
                              playSfx('success');
                              vibrate(20);
                              onUpdatePlan(selectedDay, emptyMeal, recipe.id, recipe);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] transition-colors"
                            title={`Adicionar ao plano de ${selectedDay}`}
                          >
                            + {selectedDay.split('-')[0]}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50/60 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                    {t('no_recipes_for_filter', 'Nenhuma receita salva encontrada com este filtro.')}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    {t('view_all_recipes', 'Ver todas as receitas')}
                  </button>
                </div>
              )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {viewRecipe && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-transparent rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative shadow-2xl">
            <button 
              onClick={() => setViewRecipe(null)}
              className="absolute top-6 right-6 p-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/60 dark:border-slate-600/50 rounded-full hover:bg-white dark:hover:bg-slate-700 transition-colors z-10"
            >
              <X className="w-6 h-6 text-slate-600 dark:text-slate-300" />
            </button>
            <RecipeCard recipe={viewRecipe} />
          </div>
        </div>
      )}

      {/* Modal de Compartilhamento */}
      <AnimatePresence>
        {isShareModalOpen && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[99999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0b131f] text-slate-100 rounded-[28px] sm:rounded-[36px] max-w-lg w-full p-5 sm:p-7 shadow-2xl relative border border-emerald-500/30 max-h-[92vh] flex flex-col my-auto"
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4 shrink-0 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg sm:text-xl font-bold text-white leading-tight">
                        Compartilhar Plano
                      </h3>
                      <p className="text-xs text-slate-400">
                        {selectedDay} • Card de Alta Resolução
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsShareModalOpen(false);
                      setExportedCardUrl(null);
                    }}
                    className="p-2 hover:bg-slate-800 rounded-full transition-all text-slate-400 hover:text-white"
                    aria-label="Fechar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Viewport Card wrapper or Exported Image */}
                <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-950/60 border border-slate-800/80 my-2">
                  {exportedCardUrl ? (
                    <div className="flex flex-col items-center justify-center p-2 space-y-3 w-full">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-500/30">
                        <Sparkles className="w-3.5 h-3.5" />
                        Imagem Gerada com Sucesso!
                      </div>
                      <img 
                        src={exportedCardUrl} 
                        alt="Card Exportado" 
                        className="max-w-[260px] sm:max-w-[300px] rounded-2xl shadow-2xl border-2 border-emerald-500/30 object-contain" 
                      />
                      <p className="text-slate-300 text-center text-[11px] max-w-xs font-medium leading-relaxed bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                        💡 <strong>Dica:</strong> Toque no botão de baixar abaixo ou <strong>pressione e segure</strong> o dedo sobre a imagem para salvar direto na sua galeria.
                      </p>
                    </div>
                  ) : (
                    <div 
                      ref={shareCardRef}
                      id="mealplan-social-share-card"
                      className="w-[320px] sm:w-[340px] bg-[#0c1626] p-5 sm:p-6 rounded-[24px] relative overflow-hidden flex flex-col text-white shadow-2xl border border-emerald-500/30"
                    >
                      {/* Header Branding */}
                      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🥗</span>
                          <span className="font-serif text-sm font-black tracking-widest text-emerald-400 uppercase">
                            NutriAI
                          </span>
                        </div>
                        <span className="text-[9px] uppercase tracking-widest font-black text-emerald-300 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                          Planejamento Alimentar
                        </span>
                      </div>

                      {/* Main Content */}
                      <div className="flex-1 flex flex-col gap-3">
                        <h2 className="text-xl sm:text-2xl font-black font-serif tracking-tight text-white">
                          {selectedDay}
                        </h2>
                        
                        <div className="space-y-2">
                          {['Café da Manhã', 'Almoço', 'Jantar'].map((mealType) => {
                            const mealKey = mealType === 'Café da Manhã' ? 'breakfast' : mealType === 'Almoço' ? 'lunch' : 'dinner';
                            const mealItem = mealPlan[selectedDay]?.meals?.[mealKey as 'breakfast' | 'lunch' | 'dinner'];
                            return (
                              <div key={mealType} className="bg-[#112033] border border-slate-700/60 rounded-xl p-2.5">
                                <p className="text-[9px] text-emerald-400 uppercase tracking-widest font-black mb-0.5">{mealType}</p>
                                {mealItem ? (
                                  <p className="text-xs font-semibold text-white/95 leading-tight">
                                    {mealItem.name}
                                  </p>
                                ) : (
                                  <p className="text-xs text-slate-400 italic">Não planejado</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="pt-3 mt-4 border-t border-slate-800 flex justify-between items-center text-[10px] uppercase tracking-widest font-black text-slate-400">
                        <span>Total Estimado</span>
                        <span className="text-emerald-400 text-xs font-black">
                          {Math.round(
                            Object.values(dayPlan).reduce((acc: number, curr: any) => acc + (curr?.nutrition?.calories || 0), 0)
                          )} kcal
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="mt-4 flex flex-col sm:flex-row gap-2.5 shrink-0 pt-2">
                  {exportedCardUrl ? (
                    <>
                      <button
                        onClick={() => {
                          if (exportedBlobUrl) {
                            downloadBlobUrl(exportedBlobUrl, `plano-alimentar-${selectedDay.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`);
                          } else if (exportedCardUrl) {
                            downloadBlobUrl(exportedCardUrl, `plano-alimentar-${selectedDay.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`);
                          }
                        }}
                        className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs sm:text-sm transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 border border-emerald-400/30"
                      >
                        <Download className="w-4 h-4" />
                        <span>Baixar Arquivo</span>
                      </button>

                      {exportedBlobUrl && (
                        <button
                          onClick={() => window.open(exportedBlobUrl, '_blank')}
                          className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 border border-slate-700"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>Abrir Imagem</span>
                        </button>
                      )}

                      <button
                        onClick={() => setExportedCardUrl(null)}
                        className="py-3 px-4 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl font-bold text-xs transition-all border border-slate-700"
                      >
                        Voltar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setIsShareModalOpen(false)}
                        className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold text-xs sm:text-sm transition-all border border-slate-700"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleExportCard}
                        disabled={isExportingCard}
                        className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-black text-xs sm:text-sm transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed border border-emerald-400/30"
                      >
                        {isExportingCard ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Gerando Imagem...</>
                        ) : (
                          <><Download className="w-4 h-4" /> Baixar Imagem</>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {/* Sincronização Inteligente com Lista de Compras & Despensa */}
        <AnimatePresence>
          {isSyncModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Header */}
                <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-teal-500/10 dark:bg-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold">
                      <ShoppingCart className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-serif text-xl font-bold text-slate-900 dark:text-white">
                        Sincronizar com Lista de Compras
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {t('sync_modal_hint', 'Automatically checks your meal plan against your Pantry / Fridge inventory.')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsSyncModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                  {/* Scope Selector */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                        Escopo da Sincronização
                      </span>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {syncScope === 'week' ? 'Analisando a semana inteira (7 dias)' : `Analisando apenas o dia selecionado (${selectedDay})`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 w-full sm:w-auto">
                      <button
                        onClick={() => handleScopeChange('week')}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                          syncScope === 'week'
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Semana Inteira
                      </button>
                      <button
                        onClick={() => handleScopeChange('day')}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                          syncScope === 'day'
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Apenas {selectedDay}
                      </button>
                    </div>
                  </div>

                  {syncSuccessToast && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 text-emerald-700 dark:text-emerald-300 animate-in fade-in duration-300">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-semibold leading-relaxed">{syncSuccessToast}</span>
                      </div>
                      <button
                        onClick={handleNavigateToShoppingList}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 flex items-center gap-1.5"
                      >
                        <span>Ver Lista</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {isAnalyzingPantry ? (
                    <div className="py-16 flex flex-col items-center justify-center space-y-3">
                      <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                        {t('analyzing_pantry', 'Analyzing recipes and cross-referencing with your Pantry inventory...')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            Ingredientes Identificados ({analyzedIngredients.length})
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Itens já presentes na despensa são marcados automaticamente. Desmarque para não adicionar.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleSelectAll(true)}
                            className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                          >
                            Selecionar Faltantes
                          </button>
                          <span className="text-slate-300 dark:text-slate-700">|</span>
                          <button
                            onClick={() => handleToggleSelectAll(false)}
                            className="text-xs font-semibold text-slate-500 hover:underline"
                          >
                            Desmarcar Todos
                          </button>
                        </div>
                      </div>

                      {analyzedIngredients.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800">
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Nenhum ingrediente encontrado no plano alimentar selecionado. Adicione refeições ao seu plano primeiro!
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                          {analyzedIngredients.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => handleToggleIngredient(item.id)}
                              className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                                item.selected
                                  ? 'bg-teal-500/5 dark:bg-teal-500/10 border-teal-500/30 shadow-sm'
                                  : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <button
                                  type="button"
                                  className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${
                                    item.selected
                                      ? 'bg-teal-600 text-white'
                                      : 'border border-slate-300 dark:border-slate-600 bg-transparent'
                                  }`}
                                >
                                  {item.selected && <Check className="w-3.5 h-3.5" />}
                                </button>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate">
                                      {item.name}
                                    </span>
                                    <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-medium">
                                      {item.day}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                    Original: "{item.raw}" • <span className="italic">{item.recipeName}</span>
                                  </p>
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center">
                                {item.inPantry ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Em Estoque ({item.pantryMatch?.storageLocation || 'despensa'})
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                    <AlertCircle className="w-3 h-3" />
                                    Faltando
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between gap-4">
                  <button
                    onClick={() => analyzePlanAgainstPantry(syncScope, selectedDay)}
                    disabled={isAnalyzingPantry}
                    className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingPantry ? 'animate-spin' : ''}`} />
                    <span>Recalcular Despensa</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsSyncModalOpen(false)}
                      className="px-4 py-2.5 bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Fechar
                    </button>
                    <button
                      onClick={handleConfirmSyncToShoppingList}
                      disabled={isSyncingToShopping || analyzedIngredients.filter(i => !i.inPantry && i.selected).length === 0}
                      className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-teal-600/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isSyncingToShopping ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sincronizando...</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4" />
                          <span>Adicionar Faltantes ({analyzedIngredients.filter(i => !i.inPantry && i.selected).length})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
    </div>
  );
}
