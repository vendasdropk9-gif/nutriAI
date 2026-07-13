import { safeGet, safeSet, safeRemove } from "../lib/storage";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, deleteDoc, query, onSnapshot, getDocs } from 'firebase/firestore';
import { 
  Camera, Upload, Sparkles, Trash2, Edit2, Plus, Search, Calendar, 
  AlertTriangle, ShieldCheck, CheckSquare, Square, ShoppingBag, 
  ChevronRight, RefreshCw, Loader2, Utensils, AlertOctagon, ListFilter,
  CheckCircle2, ArrowRight, Save, Clock, BookOpen, X
} from 'lucide-react';
import { analyzeFridgeContents, FridgeAnalysisResult } from '../lib/gemini';
import { playSfx, vibrate } from '../lib/sensory';

interface FridgeItem {
  id: string;
  name: string;
  quantity: string;
  category: string;
  expirationDate: string;
  status: 'fresco' | 'perto_vencimento' | 'vencido';
  addedAt: string;
}

const PRESET_FRIDGES = [
  {
    name: "Geladeira de Frutas e Laticínios",
    url: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&q=80&w=400&h=400",
    description: "Iogurtes, leite vegetal, morangos frescos, brócolis, queijo branco e ovos."
  },
  {
    name: "Despensa e Vegetais Fitness",
    url: "https://images.unsplash.com/photo-1610970881699-44a5587caaec?auto=format&fit=crop&q=80&w=400&h=400",
    description: "Tomate, espinafre fresco, cenouras, peito de frango, limões e abacate."
  }
];

const CATEGORIES = ["Vegetais", "Proteínas", "Laticínios", "Bebidas", "Condimentos", "Outros"];

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

export function SmartFridge() {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'fridge' | 'scan' | 'recipes' | 'shopping'>('fridge');
  
  // Fridge items state
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  
  // CRUD Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FridgeItem | null>(null);
  
  // Add/Edit Form Fields
  const [itemName, setItemName] = useState('');
  const [itemQuantity, setItemQuantity] = useState('');
  const [itemCategory, setItemCategory] = useState('Vegetais');
  const [itemExpiration, setItemExpiration] = useState('');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedStatus, setSelectedStatus] = useState<'todos' | 'fresco' | 'perto_vencimento' | 'vencido'>('todos');

  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<FridgeAnalysisResult | null>(null);

  // Manual local shopping list (for items recommended or checked off)
  const [shoppingList, setShoppingList] = useState<{ id: string; name: string; category: string; reason: string; checked: boolean }[]>([]);

  // Selected Recipe details modal
  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Error logging helper
  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: user?.uid,
        email: user?.email,
        emailVerified: user?.emailVerified,
      },
      operationType,
      path
    };
    console.error('Firestore Error in SmartFridge:', JSON.stringify(errInfo));
  };

  // Subscribe to Firestore fridge items
  useEffect(() => {
    if (!user) {
      setLoadingItems(false);
      // Load fallback from localStorage
      const cached = safeGet('nutri_local_fridge');
      if (cached) {
        setFridgeItems(JSON.parse(cached));
      }
      return;
    }

    setLoadingItems(true);
    const fridgePath = `users/${user.uid}/fridgeItems`;
    const q = query(collection(db, fridgePath));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: FridgeItem[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as FridgeItem);
      });
      
      // Auto status evaluation based on dates
      const updatedItems = items.map(item => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const expDate = new Date(item.expirationDate + 'T12:00:00');
        const diffTime = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let status: 'fresco' | 'perto_vencimento' | 'vencido' = 'fresco';
        if (diffDays <= 0) {
          status = 'vencido';
        } else if (diffDays <= 3) {
          status = 'perto_vencimento';
        }
        
        if (item.status !== status) {
          // If status out of sync, trigger silent update
          const docRef = doc(db, `users/${user.uid}/fridgeItems`, item.id);
          setDoc(docRef, { ...item, status }, { merge: true }).catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/fridgeItems/${item.id}`));
          return { ...item, status };
        }
        return item;
      });

      // Sort items: oldest expiration date first, so expiring/vencido floats to top
      updatedItems.sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());

      setFridgeItems(updatedItems);
      setLoadingItems(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, fridgePath);
      setLoadingItems(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Save fallback to localstorage
  useEffect(() => {
    if (!user) {
      safeSet('nutri_local_fridge', JSON.stringify(fridgeItems));
    }
  }, [fridgeItems, user]);

  // Load shopping list
  useEffect(() => {
    const savedShopping = safeGet('nutri_fridge_shopping');
    if (savedShopping) {
      setShoppingList(JSON.parse(savedShopping));
    }
  }, []);

  useEffect(() => {
    safeSet('nutri_fridge_shopping', JSON.stringify(shoppingList));
  }, [shoppingList]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Camera handling
  const startCamera = async () => {
    setCameraActive(true);
    setCameraError(null);
    setImagePreview(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setCameraError("Não foi possível acessar a câmera do dispositivo. Selecione uma foto ou preset abaixo.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setImagePreview(dataUrl);
      stopCamera();
      triggerAiAnalysis(dataUrl);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImagePreview(base64);
        triggerAiAnalysis(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerAiAnalysis = async (imageInput: string) => {
    setIsScanning(true);
    setAnalysisResult(null);
    playSfx('pop');
    try {
      const result = await analyzeFridgeContents(imageInput);
      setAnalysisResult(result);
      playSfx('success');
      vibrate([40, 40]);
    } catch (err) {
      console.error("Analysis failed:", err);
      alert("Falha ao analisar imagem. Por favor, tente novamente com uma foto mais nítida ou use dados textuais.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleUsePreset = (url: string) => {
    setImagePreview(url);
    triggerAiAnalysis(url);
  };

  // Add Item CRUD
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !itemQuantity || !itemExpiration) return;

    // Evaluate status
    const today = new Date();
    today.setHours(0,0,0,0);
    const expDate = new Date(itemExpiration + 'T12:00:00');
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let status: 'fresco' | 'perto_vencimento' | 'vencido' = 'fresco';
    if (diffDays <= 0) {
      status = 'vencido';
    } else if (diffDays <= 3) {
      status = 'perto_vencimento';
    }

    const newItem: FridgeItem = {
      id: crypto.randomUUID(),
      name: itemName,
      quantity: itemQuantity,
      category: itemCategory,
      expirationDate: itemExpiration,
      status,
      addedAt: new Date().toISOString()
    };

    if (user) {
      const docPath = `users/${user.uid}/fridgeItems/${newItem.id}`;
      try {
        await setDoc(doc(db, docPath), newItem);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, docPath);
      }
    } else {
      setFridgeItems(prev => [...prev, newItem]);
    }

    // Reset Form & Close
    setItemName('');
    setItemQuantity('');
    setItemCategory('Vegetais');
    setItemExpiration('');
    setIsAddModalOpen(false);
    playSfx('success');
    vibrate(30);
  };

  // Edit Item CRUD
  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !itemName || !itemQuantity || !itemExpiration) return;

    const today = new Date();
    today.setHours(0,0,0,0);
    const expDate = new Date(itemExpiration + 'T12:00:00');
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let status: 'fresco' | 'perto_vencimento' | 'vencido' = 'fresco';
    if (diffDays <= 0) {
      status = 'vencido';
    } else if (diffDays <= 3) {
      status = 'perto_vencimento';
    }

    const updated: FridgeItem = {
      ...editingItem,
      name: itemName,
      quantity: itemQuantity,
      category: itemCategory,
      expirationDate: itemExpiration,
      status
    };

    if (user) {
      const docPath = `users/${user.uid}/fridgeItems/${updated.id}`;
      try {
        await setDoc(doc(db, docPath), updated, { merge: true });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, docPath);
      }
    } else {
      setFridgeItems(prev => prev.map(it => it.id === updated.id ? updated : it));
    }

    setIsEditModalOpen(false);
    setEditingItem(null);
    setItemName('');
    setItemQuantity('');
    setItemExpiration('');
    playSfx('success');
    vibrate(30);
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Deseja realmente remover este alimento?")) return;

    if (user) {
      const docPath = `users/${user.uid}/fridgeItems/${id}`;
      try {
        await deleteDoc(doc(db, docPath));
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, docPath);
      }
    } else {
      setFridgeItems(prev => prev.filter(it => it.id !== id));
    }
    playSfx('tap');
    vibrate(20);
  };

  // Add all detected items from AI scan into the actual Fridge
  const handleAddAllDetectedToFridge = async () => {
    if (!analysisResult) return;
    
    // Set default expiration date 5 days from now for ease
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const formattedExp = futureDate.toISOString().split('T')[0];

    for (const item of analysisResult.identifiedItems) {
      const newItem: FridgeItem = {
        id: crypto.randomUUID(),
        name: item.name,
        quantity: item.quantity || "1 unidade",
        category: item.category || "Vegetais",
        expirationDate: formattedExp,
        status: item.status || "fresco",
        addedAt: new Date().toISOString()
      };

      if (user) {
        const docPath = `users/${user.uid}/fridgeItems/${newItem.id}`;
        try {
          await setDoc(doc(db, docPath), newItem);
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, docPath);
        }
      } else {
        setFridgeItems(prev => [...prev, newItem]);
      }
    }

    alert("Todos os ingredientes identificados foram adicionados ao seu inventário!");
    setActiveSubTab('fridge');
    playSfx('success');
  };

  // Add suggested missing items into our shopping list
  const handleAddShoppingToCustomList = () => {
    if (!analysisResult) return;

    const newShoppingItems = analysisResult.suggestedShoppingList.map(item => ({
      id: crypto.randomUUID(),
      name: item.name,
      category: item.category,
      reason: item.reason,
      checked: false
    }));

    setShoppingList(prev => [...prev, ...newShoppingItems]);
    alert("Ingredientes em falta adicionados à sua Lista de Compras!");
    setActiveSubTab('shopping');
    playSfx('success');
  };

  const handleToggleShoppingItem = (id: string) => {
    setShoppingList(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
    playSfx('tap');
  };

  const handleRemoveShoppingItem = (id: string) => {
    setShoppingList(prev => prev.filter(item => item.id !== id));
    playSfx('tap');
  };

  const handleAddManualShopping = (e: React.FormEvent) => {
    e.preventDefault();
    const input = (e.target as any).elements.manualItem;
    if (!input.value.trim()) return;

    const newItem = {
      id: crypto.randomUUID(),
      name: input.value.trim(),
      category: "Outros",
      reason: "Adicionado manualmente",
      checked: false
    };

    setShoppingList(prev => [...prev, newItem]);
    input.value = '';
    playSfx('success');
  };

  // Open Edit Modal with prepopulated values
  const openEditModal = (item: FridgeItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemQuantity(item.quantity);
    setItemCategory(item.category);
    setItemExpiration(item.expirationDate);
    setIsEditModalOpen(true);
  };

  // Calculate stats
  const expiredCount = fridgeItems.filter(i => i.status === 'vencido').length;
  const expiringCount = fridgeItems.filter(i => i.status === 'perto_vencimento').length;
  const freshCount = fridgeItems.filter(i => i.status === 'fresco').length;

  // Filter fridge items
  const filteredItems = fridgeItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || item.category === selectedCategory;
    const matchesStatus = selectedStatus === 'todos' || item.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700" id="smart-fridge-root">
      
      {/* Header Banner */}
      <div className="text-center space-y-4 mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-medium text-xs md:text-sm border border-emerald-200 dark:border-emerald-800 max-w-full select-none shadow-sm">
          <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 animate-pulse shrink-0" />
          <span className="truncate">Nutrição Sem Desperdício</span>
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-slate-850 dark:text-slate-100">
          Geladeira Inteligente
        </h1>
        <p className="font-sans text-slate-500 dark:text-slate-400 text-lg leading-relaxed max-w-2xl mx-auto">
          Tire fotos de seus alimentos para que a IA os identifique, gerencie prazos de validade e crie receitas saudáveis.
        </p>
      </div>

      {/* Sub tabs navigation */}
      <div className="flex flex-wrap justify-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/40 backdrop-blur-xl rounded-[24px] border border-slate-200/50 dark:border-slate-700/30 max-w-3xl mx-auto">
        <button
          onClick={() => { setActiveSubTab('fridge'); playSfx('tap'); }}
          className={`px-5 py-2.5 rounded-xl font-sans text-sm font-medium transition-all ${
            activeSubTab === 'fridge' 
              ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-md' 
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/30'
          }`}
        >
          Minha Geladeira
        </button>
        <button
          onClick={() => { setActiveSubTab('scan'); playSfx('tap'); }}
          className={`px-5 py-2.5 rounded-xl font-sans text-sm font-medium transition-all flex items-center gap-2 ${
            activeSubTab === 'scan' 
              ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-md' 
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/30'
          }`}
        >
          <Camera className="w-4 h-4 text-emerald-500" />
          Escanear Alimentos
        </button>
        <button
          onClick={() => { setActiveSubTab('recipes'); playSfx('tap'); }}
          className={`px-5 py-2.5 rounded-xl font-sans text-sm font-medium transition-all flex items-center gap-2 ${
            activeSubTab === 'recipes' 
              ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-md' 
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/30'
          }`}
        >
          <Utensils className="w-4 h-4 text-emerald-500" />
          Receitas Sugeridas
        </button>
        <button
          onClick={() => { setActiveSubTab('shopping'); playSfx('tap'); }}
          className={`px-5 py-2.5 rounded-xl font-sans text-sm font-medium transition-all flex items-center gap-2 ${
            activeSubTab === 'shopping' 
              ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-md' 
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/30'
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-emerald-500" />
          Lista de Compras
        </button>
      </div>

      {/* Main Content Areas */}
      <AnimatePresence mode="wait">
        {/* VIEW 1: MY FRIDGE */}
        {activeSubTab === 'fridge' && (
          <motion.div
            key="fridge-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Quick Expiration alerts dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-[24px] p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-sans text-emerald-600 dark:text-emerald-400 font-medium">Alimentos Frescos</p>
                  <p className="text-3xl font-serif font-bold text-emerald-700 dark:text-emerald-300">{freshCount}</p>
                </div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900 rounded-[24px] p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-sans text-amber-600 dark:text-amber-400 font-medium">Perto de Vencer (1 a 3 dias)</p>
                  <p className="text-3xl font-serif font-bold text-amber-700 dark:text-amber-300">{expiringCount}</p>
                </div>
              </div>
              <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 rounded-[24px] p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <AlertOctagon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-sans text-rose-600 dark:text-rose-400 font-medium">Vencidos/Murchos</p>
                  <p className="text-3xl font-serif font-bold text-rose-700 dark:text-rose-300">{expiredCount}</p>
                </div>
              </div>
            </div>

            {/* Toolbar for search & filters */}
            <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar alimento..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-700 border border-slate-200/80 dark:border-slate-650 font-sans text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Filtering layout */}
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-700 border border-slate-200/80 dark:border-slate-650 font-sans text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-150"
                >
                  <option value="Todas">Todas Categorias</option>
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>

                <div className="flex rounded-2xl border border-slate-200/80 dark:border-slate-650 bg-white dark:bg-slate-700 overflow-hidden">
                  <button
                    onClick={() => setSelectedStatus('todos')}
                    className={`px-3 py-1 text-xs font-medium border-r border-slate-200 dark:border-slate-650 transition-colors ${selectedStatus === 'todos' ? 'bg-emerald-500 text-white' : 'text-slate-600 dark:text-slate-300'}`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setSelectedStatus('fresco')}
                    className={`px-3 py-1 text-xs font-medium border-r border-slate-200 dark:border-slate-650 transition-colors ${selectedStatus === 'fresco' ? 'bg-emerald-500 text-white' : 'text-slate-600 dark:text-slate-300'}`}
                  >
                    Frescos
                  </button>
                  <button
                    onClick={() => setSelectedStatus('perto_vencimento')}
                    className={`px-3 py-1 text-xs font-medium border-r border-slate-200 dark:border-slate-650 transition-colors ${selectedStatus === 'perto_vencimento' ? 'bg-amber-500 text-white' : 'text-slate-600 dark:text-slate-300'}`}
                  >
                    Próx. Vencimento
                  </button>
                  <button
                    onClick={() => setSelectedStatus('vencido')}
                    className={`px-3 py-1 text-xs font-medium transition-colors ${selectedStatus === 'vencido' ? 'bg-rose-500 text-white' : 'text-slate-600 dark:text-slate-300'}`}
                  >
                    Vencidos
                  </button>
                </div>

                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-5 py-2.5 rounded-2xl font-sans text-sm font-medium shadow-lg hover:from-emerald-600 hover:to-teal-700 transition-all w-full md:w-auto justify-center"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar
                </button>
              </div>
            </div>

            {/* List of ingredients */}
            {loadingItems ? (
              <div className="text-center py-24">
                <Loader2 className="w-10 h-10 animate-spin mx-auto text-emerald-500 mb-4" />
                <p className="font-sans text-slate-500">Sincronizando sua geladeira com a nuvem...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-dashed border-slate-300 dark:border-slate-700 rounded-[32px] p-12 text-center">
                <AlertTriangle className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                <h3 className="font-serif text-2xl font-medium text-slate-700 dark:text-slate-300 mb-2">Nenhum alimento cadastrado</h3>
                <p className="font-sans text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
                  Você pode escanear o interior da geladeira por foto para a IA carregar tudo na hora ou adicionar de forma manual.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setActiveSubTab('scan')}
                    className="flex items-center gap-2 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-5 py-2.5 rounded-2xl font-sans text-sm font-medium transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    Escanear com IA
                  </button>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-2xl font-sans text-sm font-medium transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Inserir Manualmente
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map((item) => (
                  <div 
                    key={item.id}
                    className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-150 dark:border-slate-700/50 rounded-[24px] p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300">
                          {item.category}
                        </span>
                        
                        {/* Expiration warning badge */}
                        {item.status === 'vencido' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                            <AlertOctagon className="w-3.5 h-3.5" />
                            Vencido
                          </span>
                        )}
                        {item.status === 'perto_vencimento' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Perto do Vencimento
                          </span>
                        )}
                        {item.status === 'fresco' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Fresco
                          </span>
                        )}
                      </div>

                      <h4 className="font-serif text-xl font-semibold text-slate-800 dark:text-slate-100">
                        {item.name}
                      </h4>
                      <p className="font-sans text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Quantidade: <span className="font-medium text-slate-750 dark:text-slate-200">{item.quantity}</span>
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-450 text-xs">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Validade: {new Date(item.expirationDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-750 rounded-xl"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-750 rounded-xl"
                          title="Remover"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* VIEW 2: AI SCANNER */}
        {activeSubTab === 'scan' && (
          <motion.div
            key="scan-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 rounded-[32px] p-6 md:p-8 shadow-xl max-w-4xl mx-auto space-y-6">
              
              {/* Photo Input Interface */}
              {!imagePreview && !cameraActive && (
                <div className="space-y-6">
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-[24px] p-12 text-center flex flex-col items-center justify-center space-y-4 hover:border-emerald-500/50 transition-colors">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <Camera className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <p className="font-serif text-xl font-medium text-slate-700 dark:text-slate-300">Fotografar ou enviar imagem da geladeira</p>
                      <p className="font-sans text-xs text-slate-500 max-w-sm mx-auto">
                        A IA irá escanear a foto, detectar vegetais, proteínas, embalagens de laticínios, frutas, e deduzir o frescor geral.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3 justify-center pt-2">
                      <button
                        onClick={startCamera}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-2xl font-sans text-sm font-medium flex items-center gap-2 transition-all shadow-md"
                      >
                        <Camera className="w-4 h-4" />
                        Tirar foto ao vivo
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 px-5 py-2.5 rounded-2xl font-sans text-sm font-medium flex items-center gap-2 transition-all"
                      >
                        <Upload className="w-4 h-4 text-slate-500" />
                        Fazer upload
                      </button>
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Preset option */}
                  <div className="space-y-3">
                    <h4 className="font-serif text-lg font-medium text-slate-700 dark:text-slate-300 text-center">Ou teste rápido com um exemplo:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {PRESET_FRIDGES.map((preset, idx) => (
                        <div 
                          key={idx}
                          onClick={() => handleUsePreset(preset.url)}
                          className="flex items-center gap-4 bg-slate-50 dark:bg-slate-850 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border border-slate-200 dark:border-slate-850 hover:border-emerald-500/30 rounded-2xl p-4 cursor-pointer transition-all group"
                        >
                          <img 
                            src={preset.url} 
                            alt={preset.name}
                            className="w-16 h-16 rounded-xl object-cover shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="text-left">
                            <p className="font-sans font-semibold text-sm text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{preset.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{preset.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Live Camera View */}
              {cameraActive && (
                <div className="space-y-4">
                  <div className="relative rounded-[24px] overflow-hidden bg-black aspect-video max-w-xl mx-auto border border-slate-700 shadow-inner">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 border-2 border-emerald-500/40 pointer-events-none rounded-[24px]"></div>
                  </div>
                  {cameraError && <p className="text-rose-500 text-center text-sm">{cameraError}</p>}
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={capturePhoto}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-2xl font-sans text-sm font-medium flex items-center gap-2 shadow-lg"
                    >
                      <Camera className="w-4 h-4" />
                      Capturar Foto
                    </button>
                    <button
                      onClick={stopCamera}
                      className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 px-6 py-2.5 rounded-2xl font-sans text-sm font-medium"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Analysis Loading Screen */}
              {isScanning && (
                <div className="text-center py-16 space-y-4 animate-pulse">
                  <div className="relative inline-block">
                    <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                    <Sparkles className="w-6 h-6 text-emerald-500 absolute inset-0 m-auto animate-bounce" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-serif text-2xl font-medium text-slate-700 dark:text-slate-300">A Inteligência Artificial está analisando...</h3>
                    <p className="font-sans text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      Identificando ingredientes, deduzindo data estimada de vencimento e criando sugestões de receitas exclusivas.
                    </p>
                  </div>
                  {imagePreview && (
                    <div className="max-w-xs mx-auto rounded-2xl overflow-hidden shadow-md">
                      <img src={imagePreview} alt="Análise" className="w-full max-h-48 object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                </div>
              )}

              {/* Result Preview Panel */}
              {analysisResult && !isScanning && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  
                  {/* Summary of Detected Items */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700/60">
                      <h3 className="font-serif text-2xl font-semibold text-slate-800 dark:text-slate-150 flex items-center gap-2">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        Alimentos Identificados pela IA ({analysisResult.identifiedItems.length})
                      </h3>
                      <button
                        onClick={handleAddAllDetectedToFridge}
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow hover:opacity-90 transition-opacity"
                      >
                        Carregar na Geladeira
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {analysisResult.identifiedItems.map((item, idx) => (
                        <div key={idx} className="bg-slate-50 dark:bg-slate-850/60 p-3.5 rounded-2xl border border-slate-200/50 dark:border-slate-800 flex justify-between items-center">
                          <div>
                            <p className="font-sans font-semibold text-sm text-slate-800 dark:text-slate-200">{item.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Qtd: {item.quantity || "1"}</p>
                          </div>
                          
                          {item.status === 'vencido' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
                              Vencido
                            </span>
                          )}
                          {item.status === 'perto_vencimento' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                              Breve
                            </span>
                          )}
                          {item.status === 'fresco' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                              Fresco
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Recipe Suggestions */}
                  <div className="space-y-4">
                    <h3 className="font-serif text-2xl font-semibold text-slate-800 dark:text-slate-150 flex items-center gap-2">
                      <Utensils className="w-6 h-6 text-emerald-500" />
                      Sugestões de Receitas Saudáveis
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {analysisResult.suggestedRecipes.map((recipe, idx) => (
                        <div 
                          key={idx}
                          className="bg-white dark:bg-slate-850 p-5 rounded-[24px] border border-slate-200/50 dark:border-slate-800 shadow-sm flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-sans font-medium px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                                {recipe.prepTime}
                              </span>
                              <span className="text-xs font-sans font-medium text-slate-500 dark:text-slate-400">
                                {recipe.difficulty}
                              </span>
                            </div>
                            <h4 className="font-serif text-lg font-bold text-slate-850 dark:text-slate-100 mb-1">{recipe.title}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{recipe.description}</p>
                            
                            {/* Used / Missing summary */}
                            <div className="space-y-2 mb-4">
                              <p className="text-xs font-sans font-semibold text-slate-600 dark:text-slate-350">Ingredientes de casa:</p>
                              <div className="flex flex-wrap gap-1">
                                {recipe.usedIngredients.map((u, i) => (
                                  <span key={i} className="text-[10px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/40">{u}</span>
                                ))}
                              </div>
                              {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
                                <>
                                  <p className="text-xs font-sans font-semibold text-slate-600 dark:text-slate-350 mt-2">Faltando/Substituir:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {recipe.missingIngredients.map((m, i) => (
                                      <span key={i} className="text-[10px] bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full border border-rose-100 dark:border-rose-900/40">{m}</span>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => { setSelectedRecipe(recipe); playSfx('tap'); }}
                            className="w-full mt-4 flex items-center justify-center gap-2 py-2 bg-slate-100 hover:bg-emerald-100 dark:bg-slate-800 dark:hover:bg-emerald-950/40 text-slate-700 hover:text-emerald-700 dark:text-slate-350 dark:hover:text-emerald-300 transition-colors rounded-xl text-xs font-semibold border border-transparent hover:border-emerald-200 dark:hover:border-emerald-900"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            Ver Instruções
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Auto Shopping suggestions */}
                  {analysisResult.suggestedShoppingList && (
                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700/60">
                      <div className="flex justify-between items-center">
                        <h3 className="font-serif text-2xl font-semibold text-slate-800 dark:text-slate-150 flex items-center gap-2">
                          <ShoppingBag className="w-6 h-6 text-emerald-500" />
                          Sugestão Automática de Compras
                        </h3>
                        <button
                          onClick={handleAddShoppingToCustomList}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow"
                        >
                          Adicionar à Lista
                        </button>
                      </div>

                      <div className="space-y-3">
                        {analysisResult.suggestedShoppingList.map((shop, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-emerald-50/50 dark:bg-emerald-950/10 p-4 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/30">
                            <div>
                              <p className="font-sans font-semibold text-sm text-slate-800 dark:text-slate-200">{shop.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{shop.reason}</p>
                            </div>
                            <span className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400">
                              {shop.category}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reset Scan */}
                  <div className="flex justify-center pt-4">
                    <button
                      onClick={() => { setImagePreview(null); setAnalysisResult(null); stopCamera(); }}
                      className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-350 flex items-center gap-2 text-sm font-sans font-semibold"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Escanear Outra Foto
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* VIEW 3: INVENTORY-BASED RECIPES */}
        {activeSubTab === 'recipes' && (
          <motion.div
            key="recipes-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {analysisResult?.suggestedRecipes ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-2xl font-bold text-slate-800 dark:text-slate-100">
                    Sugestões Baseadas na Última Foto
                  </h3>
                  <button
                    onClick={() => setActiveSubTab('scan')}
                    className="text-emerald-500 hover:text-emerald-600 text-sm font-semibold flex items-center gap-1"
                  >
                    Escanear Outra Foto <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysisResult.suggestedRecipes.map((recipe, idx) => (
                    <div 
                      key={idx}
                      className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-150 dark:border-slate-700/50 rounded-[28px] p-6 shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-sans font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full">
                            {recipe.prepTime}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            {recipe.difficulty}
                          </span>
                        </div>
                        <h4 className="font-serif text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">{recipe.title}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{recipe.description}</p>
                        
                        <div className="space-y-2 mb-4">
                          <p className="text-xs font-sans font-semibold text-slate-600 dark:text-slate-350">Ingredientes usados:</p>
                          <div className="flex flex-wrap gap-1">
                            {recipe.usedIngredients.map((u, i) => (
                              <span key={i} className="text-[10px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/30">{u}</span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => { setSelectedRecipe(recipe); playSfx('tap'); }}
                        className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 text-white rounded-xl text-sm font-semibold transition-all"
                      >
                        <BookOpen className="w-4 h-4" />
                        Ver Receita Completa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-dashed border-slate-300 dark:border-slate-700 rounded-[32px] p-12 text-center max-w-xl mx-auto">
                <Utensils className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                <h3 className="font-serif text-2xl font-medium text-slate-700 dark:text-slate-300 mb-2">Sem receitas salvas</h3>
                <p className="font-sans text-sm text-slate-500 dark:text-slate-400 mb-6">
                  Tire uma foto dos alimentos em "Escanear Alimentos" para a Inteligência Artificial sugerir as melhores receitas saudáveis possíveis de fazer agora.
                </p>
                <button
                  onClick={() => setActiveSubTab('scan')}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-2xl font-sans text-sm font-medium transition-all inline-flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Escanear agora
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* VIEW 4: LOCAL SHOPPING LIST */}
        {activeSubTab === 'shopping' && (
          <motion.div
            key="shopping-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6 max-w-2xl mx-auto"
          >
            {/* Add manual item form */}
            <form onSubmit={handleAddManualShopping} className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 rounded-3xl p-4 shadow-xl flex gap-3">
              <input
                type="text"
                name="manualItem"
                placeholder="Ex: 1L Leite de Coco, 500g Tapioca..."
                className="flex-grow min-w-0 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-650 font-sans text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
              />
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-sans text-sm font-medium transition-all shadow-md flex items-center gap-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </form>

            <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 rounded-[32px] p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-700">
                <h3 className="font-serif text-2xl font-semibold text-slate-800 dark:text-slate-100">
                  Lista de Compras da Cozinha
                </h3>
                <span className="text-xs font-sans font-medium px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {shoppingList.filter(i => i.checked).length} de {shoppingList.length} Comprados
                </span>
              </div>

              {shoppingList.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p className="font-sans text-slate-500">Sua lista de compras está limpa!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {shoppingList.map((item) => (
                    <div 
                      key={item.id}
                      className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${
                        item.checked 
                          ? 'bg-slate-100/50 dark:bg-slate-800/40 border-slate-200/50 text-slate-400 line-through' 
                          : 'bg-white dark:bg-slate-800 border-slate-150 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <button
                        onClick={() => handleToggleShoppingItem(item.id)}
                        className="flex items-center gap-3 text-left focus:outline-none"
                      >
                        {item.checked ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 hover:border-emerald-500 transition-colors shrink-0"></div>
                        )}
                        <div>
                          <p className="font-sans font-semibold text-sm">{item.name}</p>
                          <p className={`text-xs mt-0.5 ${item.checked ? 'text-slate-400' : 'text-slate-500'}`}>{item.reason}</p>
                        </div>
                      </button>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700">
                          {item.category}
                        </span>
                        <button
                          onClick={() => handleRemoveShoppingItem(item.id)}
                          className="text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CRUD MODAL: ADD FOOD */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-800 rounded-[32px] max-w-md w-full p-6 shadow-2xl border border-slate-150 dark:border-slate-700"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-serif text-2xl font-bold text-slate-800 dark:text-slate-150">Adicionar Alimento</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-xs font-sans font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nome do Alimento</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Brócolis Orgânico, Peito de Frango"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-sans text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-sans font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Quantidade</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 500g, 4 unid."
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-sans text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-sans font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Categoria</label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-sans text-sm"
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-sans font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Data de Vencimento</label>
                <input
                  type="date"
                  required
                  value={itemExpiration}
                  onChange={(e) => setItemExpiration(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-sans text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-sans text-sm font-semibold shadow-lg hover:from-emerald-600 hover:to-teal-700 transition-all mt-4"
              >
                Salvar na Geladeira
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* CRUD MODAL: EDIT FOOD */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-800 rounded-[32px] max-w-md w-full p-6 shadow-2xl border border-slate-150 dark:border-slate-700"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-serif text-2xl font-bold text-slate-800 dark:text-slate-150">Editar Alimento</h3>
              <button onClick={() => { setIsEditModalOpen(false); setEditingItem(null); }} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleEditItem} className="space-y-4">
              <div>
                <label className="block text-xs font-sans font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nome do Alimento</label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-sans text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-sans font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Quantidade</label>
                  <input
                    type="text"
                    required
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-sans text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-sans font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Categoria</label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-sans text-sm"
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-sans font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Data de Vencimento</label>
                <input
                  type="date"
                  required
                  value={itemExpiration}
                  onChange={(e) => setItemExpiration(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-sans text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-sans text-sm font-semibold shadow-lg hover:from-emerald-600 hover:to-teal-700 transition-all mt-4"
              >
                Atualizar Alimento
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* RECIPE DETAILS MODAL */}
      {selectedRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-800 rounded-[32px] max-w-xl w-full p-6 shadow-2xl border border-slate-150 dark:border-slate-700 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                  {selectedRecipe.prepTime} • {selectedRecipe.difficulty}
                </span>
                <h3 className="font-serif text-2xl font-bold text-slate-850 dark:text-slate-100 mt-1">
                  {selectedRecipe.title}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedRecipe(null)} 
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-sans">
              {selectedRecipe.description}
            </p>

            <div className="space-y-6">
              {/* Ingredients section */}
              <div>
                <h4 className="font-serif text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Ingredientes Usados</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedRecipe.usedIngredients.map((u: string, idx: number) => (
                    <span key={idx} className="text-xs bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/30 font-medium">
                      {u}
                    </span>
                  ))}
                </div>
              </div>

              {selectedRecipe.missingIngredients && selectedRecipe.missingIngredients.length > 0 && (
                <div>
                  <h4 className="font-serif text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Ingredientes Faltantes</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRecipe.missingIngredients.map((m: string, idx: number) => (
                      <span key={idx} className="text-xs bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 px-3 py-1 rounded-full border border-rose-100 dark:border-rose-900/30 font-medium">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Step by step instructions */}
              <div>
                <h4 className="font-serif text-lg font-bold text-slate-800 dark:text-slate-200 mb-3">Modo de Preparo</h4>
                <ol className="space-y-3">
                  {selectedRecipe.instructions.map((step: string, idx: number) => (
                    <li key={idx} className="flex gap-3 text-sm font-sans text-slate-600 dark:text-slate-305">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </span>
                      <p className="mt-0.5 leading-relaxed">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <button
              onClick={() => {
                alert("Receita enviada para o seu perfil do NutriAI com sucesso!");
                setSelectedRecipe(null);
              }}
              className="w-full mt-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-sans text-sm font-semibold transition-all shadow-md"
            >
              Favoritar esta Receita
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
