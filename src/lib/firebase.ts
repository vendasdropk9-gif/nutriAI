import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection as fsCollection, 
  doc as fsDoc, 
  getDocs as fsGetDocs, 
  getDoc as fsGetDoc, 
  setDoc as fsSetDoc, 
  addDoc as fsAddDoc, 
  updateDoc as fsUpdateDoc, 
  deleteDoc as fsDeleteDoc, 
  onSnapshot as fsOnSnapshot, 
  query as fsQuery, 
  where as fsWhere, 
  limit as fsLimit, 
  orderBy as fsOrderBy, 
  serverTimestamp as fsServerTimestamp,
  Timestamp as fsTimestamp,
  writeBatch as fsWriteBatch,
  getDocFromServer as fsGetDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { supabase, isSupabaseConfigured } from './supabase';
import { safeGet, safeSet } from './storage';

// Initialize Firebase App & Services
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Provisioned named Cloud Firestore Database
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const signInWithGoogle = async () => {
  try {
    const isStandalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);
    const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isIframe = typeof window !== 'undefined' && window !== window.parent;

    if ((isStandalone || isMobile) && !isIframe) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    } else {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
      } catch (popupErr: any) {
        if (popupErr?.code === 'auth/popup-blocked' || (popupErr?.code === 'auth/popup-closed-by-user' && isMobile)) {
          console.warn("Popup blocked or closed on mobile, falling back to signInWithRedirect...");
          await signInWithRedirect(auth, googleProvider);
          return null;
        }
        throw popupErr;
      }
    }
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

// Map Firestore collection names to Supabase tables for optional dual-write
export const TABLE_MAPPING: Record<string, string> = {
  'users': 'profiles',
  'fridgeItems': 'fridge_items',
  'plantIdentifications': 'plant_identifications',
  'gardenItems': 'garden_items',
  'allergyScans': 'allergy_scans',
  'recipeReviews': 'recipe_reviews',
  'favoriteHerbs': 'favorite_herbs',
  'deliveries': 'deliveries',
  'orders': 'orders',
  'productComparisons': 'product_comparisons',
  'adaptiveInsights': 'adaptive_insights',
  'mushroomIdentifications': 'mushroom_identifications',
  'feedbacks': 'feedbacks',
  'intakeLogs': 'intake_logs',
  'progressLogs': 'progress_logs',
  'hydrationLogs': 'hydration_logs',
  'workoutLogs': 'workout_logs',
  'sleepLogs': 'sleep_logs',
  'emotionalLogs': 'emotional_logs',
  'fastingLogs': 'fasting_logs',
  'bloodPressureLogs': 'blood_pressure_logs',
  'bodyMonitorLogs': 'body_monitor_logs',
  'notes': 'notes',
  'couriers': 'couriers',
  'medicinalHerbs': 'medicinal_herbs',
  'smartPlateCombinations': 'smart_plate_combinations'
};

function camelToSnake(str: string): string {
  if (str === 'photoURL') return 'photo_url';
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function snakeToCamel(str: string): string {
  if (str === 'photo_url') return 'photoURL';
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function convertObjectKeys(obj: any, convertFn: (s: string) => string): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => convertObjectKeys(item, convertFn));
  }
  if (typeof obj === 'object') {
    if (obj instanceof Date) return obj;
    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      newObj[convertFn(key)] = convertObjectKeys(obj[key], convertFn);
    }
    return newObj;
  }
  return obj;
}

function serializeRow(table: string, data: any, userId?: string) {
  const converted = convertObjectKeys(data, camelToSnake);
  if (userId) {
    converted.user_id = userId;
  }
  
  if (table === 'intake_logs') {
    if (data.planned) {
      converted.planned_calories = data.planned.calories;
      converted.planned_protein = data.planned.protein;
      converted.planned_carbs = data.planned.carbs;
      converted.planned_fat = data.planned.fat;
    }
    if (data.actual) {
      converted.actual_calories = data.actual.calories;
      converted.actual_protein = data.actual.protein;
      converted.actual_carbs = data.actual.carbs;
      converted.actual_fat = data.actual.fat;
    }
    delete converted.planned;
    delete converted.actual;
  }

  return converted;
}

function deserializeRow(table: string, row: any) {
  const converted = convertObjectKeys(row, snakeToCamel);
  
  if (table === 'intake_logs') {
    converted.planned = {
      calories: Number(row.planned_calories || 0),
      protein: Number(row.planned_protein || 0),
      carbs: Number(row.planned_carbs || 0),
      fat: Number(row.planned_fat || 0)
    };
    converted.actual = {
      calories: Number(row.actual_calories || 0),
      protein: Number(row.actual_protein || 0),
      carbs: Number(row.actual_carbs || 0),
      fat: Number(row.actual_fat || 0)
    };
    delete converted.plannedCalories;
    delete converted.plannedProtein;
    delete converted.plannedCarbs;
    delete converted.plannedFat;
    delete converted.actualCalories;
    delete converted.actualProtein;
    delete converted.actualCarbs;
    delete converted.actualFat;
  }

  return converted;
}

/**
 * Remove undefined values and clean payloads for safe Cloud Firestore ingestion
 */
export function sanitizeDataForFirestore(data: any): any {
  if (data === undefined) return null;
  if (data === null) return null;
  if (data instanceof Date) return data.toISOString();
  if (Array.isArray(data)) {
    return data.map(sanitizeDataForFirestore).filter(item => item !== undefined);
  }
  if (typeof data === 'object') {
    // Preserve Firestore FieldValues
    if (data._methodName || (data.constructor && data.constructor.name === 'FieldValue')) {
      return data;
    }
    const clean: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        clean[key] = sanitizeDataForFirestore(val);
      }
    }
    return clean;
  }
  return data;
}

// --- OPTIMISTIC LOCAL STORAGE CACHING ENGINE ---
const localDB: Record<string, Record<string, any>> = {};
const isBrowser = typeof window !== 'undefined';
const listeners: Array<{
  table: string;
  queryOrDocRef: any;
  onNext: (snap: any) => void;
}> = [];

function getLocalTable(table: string): Record<string, any> {
  if (!localDB[table]) {
    localDB[table] = {};
    if (isBrowser) {
      try {
        const stored = safeGet(`local_db_${table}`);
        if (stored) {
          localDB[table] = JSON.parse(stored);
        }
      } catch (e) {}
    }
  }
  return localDB[table];
}

function saveLocalTable(table: string) {
  if (isBrowser) {
    try {
      safeSet(`local_db_${table}`, JSON.stringify(localDB[table] || {}));
    } catch (e) {}
  }
}

function triggerSnapshots(table: string) {
  listeners.forEach(listener => {
    if (listener.table === table) {
      if (listener.queryOrDocRef.isDoc) {
        listener.onNext(getDocLocal(listener.queryOrDocRef));
      } else {
        listener.onNext(getDocsLocal(listener.queryOrDocRef));
      }
    }
  });
}

function getDocsLocal(queryObj: any) {
  const table = queryObj.table || 'docs';
  const userId = queryObj.userId;
  const tableData = getLocalTable(table);
  
  let items = Object.entries(tableData).map(([id, val]) => ({
    id,
    ...val
  }));

  if (userId) {
    items = items.filter(item => item.user_id === userId || item.userId === userId);
  }

  if (queryObj.constraints) {
    for (const c of queryObj.constraints) {
      if (c.type === 'where') {
        const field = c.field;
        const val = c.value;
        if (c.op === '==') {
          items = items.filter(item => item[field] === val);
        } else if (c.op === 'in') {
          items = items.filter(item => Array.isArray(val) && val.includes(item[field]));
        } else if (c.op === 'array-contains') {
          items = items.filter(item => Array.isArray(item[field]) && item[field].includes(val));
        }
      }
    }
  }

  if (queryObj.constraints) {
    const orderByConstraint = queryObj.constraints.find((c: any) => c.type === 'orderBy');
    if (orderByConstraint) {
      const field = orderByConstraint.field;
      const dir = orderByConstraint.direction === 'desc' ? -1 : 1;
      items.sort((a, b) => {
        if (a[field] < b[field]) return -1 * dir;
        if (a[field] > b[field]) return 1 * dir;
        return 0;
      });
    }

    const limitConstraint = queryObj.constraints.find((c: any) => c.type === 'limit');
    if (limitConstraint) {
      items = items.slice(0, limitConstraint.value);
    }
  }

  return {
    empty: items.length === 0,
    size: items.length,
    docs: items.map(item => ({
      id: item.id,
      data: () => item,
      exists: () => true
    }))
  };
}

function getDocLocal(docRef: any) {
  const table = docRef.table || 'docs';
  const id = docRef.id;
  const tableData = getLocalTable(table);
  const data = tableData[id];

  return {
    id,
    exists: () => !!data,
    data: () => data || null
  };
}

function setDocLocal(docRef: any, data: any) {
  const table = docRef.table || 'docs';
  const id = docRef.id || 'current';
  const tableData = getLocalTable(table);
  tableData[id] = { ...tableData[id], ...data, id };
  saveLocalTable(table);
  triggerSnapshots(table);
}

function addDocLocal(collectionRef: any, data: any) {
  const table = collectionRef.table || 'docs';
  const id = data.id || `auto_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const tableData = getLocalTable(table);
  tableData[id] = { ...data, id };
  saveLocalTable(table);
  triggerSnapshots(table);
  return { id, path: `${collectionRef.path || table}/${id}` };
}

function updateDocLocal(docRef: any, data: any) {
  setDocLocal(docRef, data);
}

function deleteDocLocal(docRef: any) {
  const table = docRef.table || 'docs';
  const id = docRef.id;
  const tableData = getLocalTable(table);
  delete tableData[id];
  saveLocalTable(table);
  triggerSnapshots(table);
}

function parseSegments(dbOrRef: any, pathSegments: string[]): string[] {
  let basePath = '';
  if (typeof dbOrRef === 'string') {
    pathSegments = [dbOrRef, ...pathSegments];
  } else if (dbOrRef && dbOrRef.path) {
    basePath = dbOrRef.path;
  }

  const segments: string[] = [];
  if (basePath) {
    segments.push(...basePath.split('/').filter(Boolean));
  }
  for (const s of pathSegments) {
    if (typeof s === 'string') {
      segments.push(...s.split('/').filter(Boolean));
    }
  }
  return segments;
}

// --- CLOUD FIRESTORE OPERATIONAL METHODS ---

export function collection(dbOrRef: any, ...pathSegments: string[]): any {
  const segments = parseSegments(dbOrRef, pathSegments);
  const fullPath = segments.join('/');
  
  const ref = fsCollection(db, fullPath) as any;
  try {
    ref.table = segments[segments.length - 1] || 'collection';
    ref.userId = segments[0] === 'users' ? segments[1] : undefined;
    ref.parts = segments;
    ref.isCollection = true;
  } catch (e) {}
  return ref;
}

export function doc(dbOrRef: any, ...pathSegments: string[]): any {
  const segments = parseSegments(dbOrRef, pathSegments);
  const fullPath = segments.join('/');

  const ref = fsDoc(db, fullPath) as any;
  try {
    ref.table = segments[segments.length - 2] || segments[0] || 'doc';
    ref.userId = segments[0] === 'users' ? segments[1] : undefined;
    ref.parts = segments;
    ref.isDoc = true;
  } catch (e) {}
  return ref;
}

export function query(collectionRef: any, ...constraints: any[]) {
  const validConstraints = constraints.filter(Boolean);
  const realConstraints = validConstraints.map(c => {
    if (c.type === 'where') return fsWhere(c.field, c.op, c.value);
    if (c.type === 'orderBy') return fsOrderBy(c.field, c.direction);
    if (c.type === 'limit') return fsLimit(c.value);
    return c;
  });

  try {
    const q = fsQuery(collectionRef, ...realConstraints) as any;
    try {
      q.table = collectionRef.table;
      q.userId = collectionRef.userId;
      q.parts = collectionRef.parts;
      q.constraints = validConstraints;
    } catch (e) {}
    return q;
  } catch (err) {
    return {
      ...collectionRef,
      constraints: validConstraints
    };
  }
}

export function where(field: string, op: string, value: any) {
  return { type: 'where', field, op, value };
}

export function limit(n: number) {
  return { type: 'limit', value: n };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
  return { type: 'orderBy', field, direction };
}

export function serverTimestamp() {
  try {
    return fsServerTimestamp();
  } catch {
    return new Date().toISOString();
  }
}

export const Timestamp = fsTimestamp;
export const writeBatch = (customDb?: any) => fsWriteBatch(customDb || db);

export async function setDoc(docRef: any, data: any, options: any = { merge: true }) {
  // 1. Instant local write for instant UI feedback
  setDocLocal(docRef, data);

  // 2. Persist to real Cloud Firestore Database
  try {
    const cleanData = sanitizeDataForFirestore(data);
    const realRef = docRef.isDoc && docRef.firestore ? docRef : fsDoc(db, docRef.path || `${docRef.table}/${docRef.id}`);
    await fsSetDoc(realRef, cleanData, options);
    console.log(`[NutriAI Firestore] Sucesso ao gravar doc: ${realRef.path}`);
  } catch (err: any) {
    console.warn(`[NutriAI Firestore] Aviso na gravação Firestore (${docRef?.path}):`, err?.message || err);
  }

  // 3. Optional Supabase dual-write if active
  if (isSupabaseConfigured && !docRef.userId?.startsWith('local-user-')) {
    try {
      const serialized = serializeRow(docRef.table, data, docRef.userId);
      serialized.id = docRef.id;
      await supabase.from(docRef.table).upsert(serialized);
    } catch (e) {}
  }
}

export async function addDoc(collectionRef: any, data: any) {
  const localRes = addDocLocal(collectionRef, data);
  const dataWithId = { ...data, id: data.id || localRes.id };

  try {
    const cleanData = sanitizeDataForFirestore(dataWithId);
    const realRef = collectionRef.isCollection && collectionRef.firestore 
      ? collectionRef 
      : fsCollection(db, collectionRef.path || collectionRef.table);
    const docSnap = await fsAddDoc(realRef, cleanData);
    console.log(`[NutriAI Firestore] Sucesso ao adicionar doc: ${docSnap.path}`);
    return docSnap;
  } catch (err: any) {
    console.warn(`[NutriAI Firestore] Aviso ao adicionar no Firestore (${collectionRef?.path}):`, err?.message || err);
    return localRes;
  }
}

export async function updateDoc(docRef: any, data: any) {
  updateDocLocal(docRef, data);

  try {
    const cleanData = sanitizeDataForFirestore(data);
    const realRef = docRef.isDoc && docRef.firestore ? docRef : fsDoc(db, docRef.path || `${docRef.table}/${docRef.id}`);
    await fsUpdateDoc(realRef, cleanData);
    console.log(`[NutriAI Firestore] Sucesso na atualização doc: ${realRef.path}`);
  } catch (err: any) {
    console.warn(`[NutriAI Firestore] Aviso ao atualizar Firestore (${docRef?.path}):`, err?.message || err);
  }

  if (isSupabaseConfigured && !docRef.userId?.startsWith('local-user-')) {
    try {
      const serialized = serializeRow(docRef.table, data, docRef.userId);
      await supabase.from(docRef.table).update(serialized).eq('id', docRef.id);
    } catch (e) {}
  }
}

export async function deleteDoc(docRef: any) {
  deleteDocLocal(docRef);

  try {
    const realRef = docRef.isDoc && docRef.firestore ? docRef : fsDoc(db, docRef.path || `${docRef.table}/${docRef.id}`);
    await fsDeleteDoc(realRef);
    console.log(`[NutriAI Firestore] Sucesso ao excluir doc: ${realRef.path}`);
  } catch (err: any) {
    console.warn(`[NutriAI Firestore] Aviso ao deletar Firestore (${docRef?.path}):`, err?.message || err);
  }

  if (isSupabaseConfigured && !docRef.userId?.startsWith('local-user-')) {
    try {
      await supabase.from(docRef.table).delete().eq('id', docRef.id);
    } catch (e) {}
  }
}

export async function getDoc(docRef: any) {
  try {
    const realRef = docRef.isDoc && docRef.firestore ? docRef : fsDoc(db, docRef.path || `${docRef.table}/${docRef.id}`);
    const snap = await fsGetDoc(realRef);
    if (snap.exists()) {
      setDocLocal(docRef, snap.data());
      return snap;
    }
  } catch (err: any) {
    console.warn(`[NutriAI Firestore] getDoc Firestore fallback para cache (${docRef?.path}):`, err?.message || err);
  }
  return getDocLocal(docRef);
}

export const getDocFromServer = async (docRef: any) => {
  try {
    const realRef = docRef.isDoc && docRef.firestore ? docRef : fsDoc(db, docRef.path || `${docRef.table}/${docRef.id}`);
    return await fsGetDocFromServer(realRef);
  } catch {
    return getDoc(docRef);
  }
};

export async function getDocs(queryOrColRef: any) {
  try {
    const snap = await fsGetDocs(queryOrColRef);
    if (snap && snap.docs) {
      return snap;
    }
  } catch (err: any) {
    console.warn(`[NutriAI Firestore] getDocs Firestore fallback para cache (${queryOrColRef?.path}):`, err?.message || err);
  }
  return getDocsLocal(queryOrColRef);
}

export function onSnapshot(
  queryOrDocRef: any,
  onNext: (snapshot: any) => void,
  onError?: (error: any) => void
) {
  // 1. Fast initial response from local cache to prevent UI delay
  try {
    if (queryOrDocRef.isDoc) {
      const localSnap = getDocLocal(queryOrDocRef);
      if (localSnap.exists()) {
        onNext(localSnap);
      }
    } else {
      const localQuerySnap = getDocsLocal(queryOrDocRef);
      if (localQuerySnap.docs.length > 0) {
        onNext(localQuerySnap);
      }
    }
  } catch (e) {}

  // 2. Attach real live Firestore listener
  try {
    const unsubscribe = fsOnSnapshot(queryOrDocRef, (snap) => {
      onNext(snap);
    }, (err) => {
      console.warn(`[NutriAI Firestore] onSnapshot listener error (${queryOrDocRef?.path}):`, err);
      if (onError) onError(err);
    });
    return unsubscribe;
  } catch (e) {
    console.warn(`[NutriAI Firestore] onSnapshot attachment error:`, e);
    return () => {};
  }
}

export function initializeFirestore(customApp: any, config: any, dbId?: string) {
  return db;
}

export function setLogLevel(level: string) {
  // no-op log level setter for compatibility
}
