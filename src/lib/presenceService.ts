import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  getDocs,
  serverTimestamp,
  getFirestore
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { UserPresence, PresenceStatus, UserProfile } from '../types';

// Mock initial buyer presences so sellers have immediate rich live data to observe
export const INITIAL_DEMO_BUYERS: UserPresence[] = [
  {
    userId: 'buyer-ana-maria-4401',
    userName: 'Ana Maria',
    userEmail: 'ana.maria@email.com',
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    isOnline: true,
    currentView: 'Mercado Hortifruti (Verduras)',
    currentAction: 'Montando Cesta Orgânica',
    lastActiveAt: new Date(Date.now() - 1000 * 20).toISOString(), // 20s ago (Active)
    updatedAt: new Date().toISOString(),
    deviceType: 'mobile',
    cartItemCount: 3,
    role: 'buyer'
  },
  {
    userId: 'buyer-pedro-s-4402',
    userName: 'Pedro S.',
    userEmail: 'pedro.s@email.com',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    isOnline: true,
    currentView: 'Acompanhamento de Entrega',
    currentAction: 'Aguardando Despacho',
    lastActiveAt: new Date(Date.now() - 1000 * 45).toISOString(), // 45s ago (Active)
    updatedAt: new Date().toISOString(),
    deviceType: 'desktop',
    cartItemCount: 0,
    role: 'buyer'
  },
  {
    userId: 'buyer-julia-l-4403',
    userName: 'Julia L.',
    userEmail: 'julia.lima@email.com',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    status: 'inactive',
    isOnline: false,
    currentView: 'Plano Alimentar Semanal',
    currentAction: 'Ausente (Último pedido há 2h)',
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(), // 35min ago (Inactive)
    updatedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    deviceType: 'mobile',
    cartItemCount: 0,
    role: 'buyer'
  },
  {
    userId: 'buyer-carlos-henrique-4404',
    userName: 'Carlos Henrique',
    userEmail: 'carlos.h@email.com',
    photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    isOnline: true,
    currentView: 'Catálogo de Frutas Frescas',
    currentAction: 'Navegando em Frutas da Estação',
    lastActiveAt: new Date(Date.now() - 1000 * 10).toISOString(), // 10s ago (Active)
    updatedAt: new Date().toISOString(),
    deviceType: 'mobile',
    cartItemCount: 2,
    role: 'buyer'
  },
  {
    userId: 'buyer-mariana-costa-4405',
    userName: 'Mariana Costa',
    userEmail: 'mariana.costa@email.com',
    photoURL: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    status: 'inactive',
    isOnline: false,
    currentView: 'Despensa Inteligente',
    currentAction: 'Inativo (Aba em segundo plano)',
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(), // 12 min ago (Inactive)
    updatedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    deviceType: 'desktop',
    cartItemCount: 1,
    role: 'buyer'
  },
  {
    userId: 'buyer-lucas-oliveira-4406',
    userName: 'Lucas Oliveira',
    userEmail: 'lucas.oliveira@email.com',
    photoURL: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    isOnline: true,
    currentView: 'Carrinho de Compras',
    currentAction: 'Finalizando Pedido com Entrega Rápida',
    lastActiveAt: new Date(Date.now() - 1000 * 5).toISOString(), // 5s ago (Active)
    updatedAt: new Date().toISOString(),
    deviceType: 'mobile',
    cartItemCount: 4,
    role: 'buyer'
  }
];

// In-memory / LocalStorage cache for fast fallback
const LOCAL_PRESENCE_KEY = 'nutri_presence_cache';

// Helper to determine if a presence entry is currently active (green)
export function isPresenceActive(presence: UserPresence | undefined | null): boolean {
  if (!presence) return false;
  if (presence.status !== 'active') return false;
  if (!presence.isOnline) return false;
  
  if (!presence.lastActiveAt) return false;
  const lastActiveTime = new Date(presence.lastActiveAt).getTime();
  const now = Date.now();
  // If no activity in the last 2 minutes, consider inactive (red)
  return (now - lastActiveTime) < (2 * 60 * 1000);
}

// Format readable presence status for sellers
export function getPresenceStatusLabel(presence: UserPresence | undefined | null): {
  status: PresenceStatus;
  label: string;
  sublabel: string;
  color: string;
  dotClass: string;
  pulseClass: string;
} {
  const active = isPresenceActive(presence);
  
  if (active) {
    return {
      status: 'active',
      label: 'Ativo e Navegando',
      sublabel: presence?.currentView ? `Navegando: ${presence.currentView}` : 'Navegando no aplicativo',
      color: 'text-emerald-600 dark:text-emerald-400',
      dotClass: 'bg-emerald-500 ring-2 ring-white dark:ring-slate-900 shadow-sm shadow-emerald-500/50',
      pulseClass: 'animate-ping bg-emerald-400 opacity-75'
    };
  }

  // Inactive state calculation
  let timeAgoStr = 'Inativo';
  if (presence?.lastActiveAt) {
    const minutesAgo = Math.floor((Date.now() - new Date(presence.lastActiveAt).getTime()) / 60000);
    if (minutesAgo < 1) {
      timeAgoStr = 'Inativo há instantes';
    } else if (minutesAgo < 60) {
      timeAgoStr = `Inativo há ${minutesAgo} min`;
    } else {
      const hours = Math.floor(minutesAgo / 60);
      timeAgoStr = `Inativo há ${hours}h`;
    }
  }

  return {
    status: 'inactive',
    label: 'Inativo',
    sublabel: timeAgoStr,
    color: 'text-rose-600 dark:text-rose-400',
    dotClass: 'bg-rose-500 ring-2 ring-white dark:ring-slate-900 shadow-sm shadow-rose-500/40',
    pulseClass: 'hidden'
  };
}

class PresenceManager {
  private static instance: PresenceManager;
  private currentUserId: string | null = null;
  private currentProfile: UserProfile | null = null;
  private currentTab: string = 'home';
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private idleTimeout: NodeJS.Timeout | null = null;
  private lastActivityTimestamp: number = Date.now();
  private lastFirestoreWriteTimestamp: number = 0;
  private isUserActive: boolean = true;
  private presences: Map<string, UserPresence> = new Map();
  private listeners: Set<(presences: UserPresence[]) => void> = new Set();
  private firestoreUnsubscribe: (() => void) | null = null;

  private constructor() {
    this.initLocalPresences();
    this.setupFirestoreListener();
    this.setupActivityEventListeners();
  }

  public static getInstance(): PresenceManager {
    if (!PresenceManager.instance) {
      PresenceManager.instance = new PresenceManager();
    }
    return PresenceManager.instance;
  }

  private initLocalPresences() {
    try {
      const cached = localStorage.getItem(LOCAL_PRESENCE_KEY);
      if (cached) {
        const parsed: UserPresence[] = JSON.parse(cached);
        parsed.forEach(p => this.presences.set(p.userId, p));
      } else {
        INITIAL_DEMO_BUYERS.forEach(p => this.presences.set(p.userId, p));
        localStorage.setItem(LOCAL_PRESENCE_KEY, JSON.stringify(INITIAL_DEMO_BUYERS));
      }
    } catch (e) {
      INITIAL_DEMO_BUYERS.forEach(p => this.presences.set(p.userId, p));
    }
  }

  private setupFirestoreListener() {
    try {
      const presencesCol = collection(db, 'presence');
      this.firestoreUnsubscribe = onSnapshot(presencesCol, (snapshot) => {
        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data() as UserPresence;
          if (data && data.userId) {
            this.presences.set(data.userId, data);
          }
        });
        this.saveCacheAndNotify();
      }, (err) => {
        console.warn('[PresenceManager] Firestore onSnapshot warning, keeping cached presence:', err);
      });
    } catch (e) {
      console.warn('[PresenceManager] Error initializing Firestore presence listener:', e);
    }
  }

  private saveCacheAndNotify() {
    try {
      const list = Array.from(this.presences.values());
      localStorage.setItem(LOCAL_PRESENCE_KEY, JSON.stringify(list));
      this.listeners.forEach(cb => cb(list));
    } catch (e) {}
  }

  private setupActivityEventListeners() {
    if (typeof window === 'undefined') return;

    const handleUserActivity = () => {
      this.lastActivityTimestamp = Date.now();
      if (!this.isUserActive) {
        this.isUserActive = true;
        this.updatePresence('active');
      }
      this.resetIdleTimer();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        this.isUserActive = false;
        this.updatePresence('inactive');
      } else {
        this.isUserActive = true;
        this.updatePresence('active');
        this.resetIdleTimer();
      }
    };

    const handleWindowBlur = () => {
      // Optional subtle debounce before marking inactive
      this.resetIdleTimer(45000); // 45 seconds when window loses focus
    };

    const handleWindowFocus = () => {
      this.isUserActive = true;
      this.updatePresence('active');
      this.resetIdleTimer();
    };

    const handleBeforeUnload = () => {
      if (this.currentUserId) {
        this.updatePresence('inactive', true);
      }
    };

    window.addEventListener('mousemove', handleUserActivity, { passive: true });
    window.addEventListener('keydown', handleUserActivity, { passive: true });
    window.addEventListener('touchstart', handleUserActivity, { passive: true });
    window.addEventListener('scroll', handleUserActivity, { passive: true });
    window.addEventListener('click', handleUserActivity, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Heartbeat check every 20 seconds
    this.heartbeatInterval = setInterval(() => {
      const timeSinceActivity = Date.now() - this.lastActivityTimestamp;
      if (timeSinceActivity < 90000 && document.visibilityState === 'visible') {
        if (this.currentUserId) {
          this.updatePresence('active');
        }
      } else if (this.isUserActive) {
        this.isUserActive = false;
        this.updatePresence('inactive');
      }
      // Re-notify subscribers so relative times and indicators refresh continuously
      this.saveCacheAndNotify();
    }, 15000);

    this.resetIdleTimer();
  }

  private resetIdleTimer(timeoutMs = 90000) {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
    }
    this.idleTimeout = setTimeout(() => {
      this.isUserActive = false;
      this.updatePresence('inactive');
    }, timeoutMs);
  }

  public setUser(user: any | null, profile: UserProfile | null, currentTab: string = 'home') {
    this.currentUserId = user?.uid || profile?.id || (profile?.email ? `user-${profile.email}` : 'current-user-guest');
    this.currentProfile = profile;
    this.currentTab = currentTab;
    this.isUserActive = document.visibilityState === 'visible';
    this.updatePresence(this.isUserActive ? 'active' : 'inactive');
  }

  public setCurrentTab(tab: string) {
    this.currentTab = tab;
    if (this.currentUserId) {
      this.updatePresence(this.isUserActive ? 'active' : 'inactive');
    }
  }

  public async updatePresence(status: PresenceStatus, isImmediate = false) {
    if (!this.currentUserId) return;

    const now = new Date();
    const nowIso = now.toISOString();

    // Throttle fast writes to Firestore (max 1 every 10s unless immediate or state changed)
    const timeSinceLastWrite = Date.now() - this.lastFirestoreWriteTimestamp;
    const existingPresence = this.presences.get(this.currentUserId);
    const hasStatusChanged = existingPresence?.status !== status;

    if (!isImmediate && !hasStatusChanged && timeSinceLastWrite < 10000) {
      return;
    }

    const deviceType: 'mobile' | 'desktop' | 'tablet' = 
      typeof window !== 'undefined' && window.innerWidth < 640 ? 'mobile' :
      typeof window !== 'undefined' && window.innerWidth < 1024 ? 'tablet' : 'desktop';

    const readableViewName = this.formatTabName(this.currentTab);

    const presenceData: UserPresence = {
      userId: this.currentUserId,
      userName: this.currentProfile?.name || auth.currentUser?.displayName || 'Usuário NutriAI',
      userEmail: this.currentProfile?.email || auth.currentUser?.email || undefined,
      photoURL: this.currentProfile?.photoURL || auth.currentUser?.photoURL || undefined,
      status,
      isOnline: status === 'active',
      currentView: readableViewName,
      currentAction: status === 'active' ? `Navegando em ${readableViewName}` : 'Inativo',
      lastActiveAt: nowIso,
      updatedAt: nowIso,
      deviceType,
      cartItemCount: this.currentProfile?.cart?.length || 0,
      role: 'buyer'
    };

    // Update in memory & cache
    this.presences.set(this.currentUserId, presenceData);
    this.lastFirestoreWriteTimestamp = Date.now();
    this.saveCacheAndNotify();

    // Persist to Firestore
    try {
      const presenceDocRef = doc(db, 'presence', this.currentUserId);
      await setDoc(presenceDocRef, presenceData, { merge: true });
    } catch (err) {
      // Non-blocking in offline or restricted environments
      console.debug('[PresenceManager] Sync to Firestore presence:', err);
    }
  }

  // Toggle mock presence for demonstration & testing in Partner Portal
  public toggleBuyerPresenceSimulation(buyerId: string, forcedStatus?: PresenceStatus) {
    const existing = this.presences.get(buyerId);
    if (!existing) return;

    const newStatus: PresenceStatus = forcedStatus || (existing.status === 'active' ? 'inactive' : 'active');
    const updated: UserPresence = {
      ...existing,
      status: newStatus,
      isOnline: newStatus === 'active',
      lastActiveAt: newStatus === 'active' ? new Date().toISOString() : new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      updatedAt: new Date().toISOString(),
      currentAction: newStatus === 'active' ? 'Ativo e navegando agora' : 'Inativo / Ausente'
    };

    this.presences.set(buyerId, updated);
    this.saveCacheAndNotify();

    try {
      const docRef = doc(db, 'presence', buyerId);
      setDoc(docRef, updated, { merge: true }).catch(() => {});
    } catch (e) {}
  }

  private formatTabName(tab: string): string {
    const tabMap: Record<string, string> = {
      'home': 'Início',
      'market': 'Mercado Hortifruti & Cestas',
      'partner': 'Portal do Vendedor / Parceiro',
      'delivery': 'Entregas & Rastreamento',
      'plan': 'Plano Alimentar',
      'shopping': 'Lista de Compras',
      'fridge': 'Geladeira Inteligente',
      'pantry': 'Despensa & Estoque',
      'cooking_advisor': 'Chef IA Consultor',
      'generator': 'Gerador de Receitas',
      'smartplate': 'Smart Plate Combiner',
      'profile': 'Perfil do Usuário',
      'frescor': 'Mapa de Frescor',
      'pricing': 'Assinatura Premium'
    };
    return tabMap[tab] || (tab.charAt(0).toUpperCase() + tab.slice(1));
  }

  public subscribe(callback: (presences: UserPresence[]) => void): () => void {
    this.listeners.add(callback);
    callback(Array.from(this.presences.values()));
    return () => {
      this.listeners.delete(callback);
    };
  }

  public getPresenceForUser(userIdOrNameOrEmail?: string): UserPresence | null {
    if (!userIdOrNameOrEmail) return null;
    
    // Direct ID match
    if (this.presences.has(userIdOrNameOrEmail)) {
      return this.presences.get(userIdOrNameOrEmail)!;
    }

    // Match by name or email
    const lowerTarget = userIdOrNameOrEmail.toLowerCase().trim();
    for (const presence of this.presences.values()) {
      if (presence.userId.toLowerCase() === lowerTarget) return presence;
      if (presence.userEmail && presence.userEmail.toLowerCase() === lowerTarget) return presence;
      if (presence.userName && (presence.userName.toLowerCase() === lowerTarget || lowerTarget.includes(presence.userName.toLowerCase()) || presence.userName.toLowerCase().includes(lowerTarget))) {
        return presence;
      }
    }

    return null;
  }

  public getAllPresences(): UserPresence[] {
    return Array.from(this.presences.values());
  }
}

export const presenceManager = PresenceManager.getInstance();
