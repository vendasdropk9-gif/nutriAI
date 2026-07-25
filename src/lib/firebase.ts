import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { supabase, isSupabaseConfigured } from './supabase';

// Initialize Firebase App for Authentication only
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isIframe = window !== window.parent;

    if ((isStandalone || isMobile) && !isIframe) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    } else {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    }
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const signInWithApple = async () => {
  throw new Error("Apple Sign-In not configured");
};

// --- FIRESTORE TO SUPABASE BRIDGE LAYER ---

// Map Firestore collection names to Supabase tables
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
  'medicinalHerbs': 'medicinal_herbs'
};

// Key transformation utilities for snake_case/camelCase mappings
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

// Special serializers and deserializers for tables with flattened schemas (e.g. intake_logs)
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

  if (table === 'medicinal_herbs') {
    const extra: any = {};
    const allowedKeys = [
      'id', 'popular_name', 'scientific_name', 'botanical_family',
      'other_names', 'description', 'origin', 'biome', 'states',
      'harvest_season', 'part_used', 'properties', 'indications',
      'preparation', 'dosage', 'contraindications', 'created_at', 'user_id'
    ];
    
    const contraindicationsObj = converted.contraindications || {};
    for (const key of Object.keys(converted)) {
      if (!allowedKeys.includes(key)) {
        extra[key] = converted[key];
        delete converted[key];
      }
    }
    converted.contraindications = {
      ...contraindicationsObj,
      extra_fields: extra
    };
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

  if (table === 'medicinal_herbs') {
    if (converted.contraindications && converted.contraindications.extraFields) {
      const extra = converted.contraindications.extraFields;
      delete converted.contraindications.extraFields;
      Object.assign(converted, extra);
    }
  }

  return converted;
}

export const db: any = { isDb: true };

export function initializeFirestore(app: any, config: any, dbId?: string) {
  return db;
}

export function setLogLevel(level: string) {
  // no-op
}

export function collection(dbOrRef: any, ...parts: string[]) {
  const allParts = dbOrRef && dbOrRef.parts ? [...dbOrRef.parts, ...parts] : parts;
  
  let table = '';
  let userId = undefined;

  if (allParts.length === 1) {
    table = TABLE_MAPPING[allParts[0]] || allParts[0];
  } else if (allParts.length === 3 && allParts[0] === 'users') {
    userId = allParts[1];
    table = TABLE_MAPPING[allParts[2]] || allParts[2];
  } else if (allParts.length === 4 && allParts[0] === 'users') {
    userId = allParts[1];
    table = TABLE_MAPPING[allParts[2]] || allParts[2];
  } else {
    table = TABLE_MAPPING[allParts[0]] || allParts[0];
  }

  return {
    isCollection: true,
    parts: allParts,
    table,
    userId,
  };
}

export function doc(dbOrRef: any, ...parts: string[]) {
  const allParts = dbOrRef && dbOrRef.parts ? [...dbOrRef.parts, ...parts] : parts;

  let table = '';
  let userId = undefined;
  let id = '';

  if (allParts.length === 2) {
    if (allParts[0] === 'users') {
      table = 'profiles';
      id = allParts[1];
    } else {
      table = TABLE_MAPPING[allParts[0]] || allParts[0];
      id = allParts[1];
    }
  } else if (allParts.length === 4 && allParts[0] === 'users') {
    userId = allParts[1];
    table = TABLE_MAPPING[allParts[2]] || allParts[2];
    id = allParts[3];
  } else {
    table = TABLE_MAPPING[allParts[0]] || allParts[0];
    id = allParts[allParts.length - 1];
  }

  return {
    isDoc: true,
    parts: allParts,
    table,
    userId,
    id,
  };
}

export function query(collectionRef: any, ...constraints: any[]) {
  return {
    ...collectionRef,
    constraints: constraints.filter(Boolean),
  };
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
  return new Date().toISOString();
}

// --- HYBRID LOCAL STORAGE FALLBACK ENGINE ---
const localDB: Record<string, Record<string, any>> = {};
const isBrowser = typeof window !== 'undefined';
const listeners: Array<{
  table: string;
  queryOrDocRef: any;
  onNext: (snap: any) => void;
}> = [];

import { safeGet, safeSet } from './storage';

function getLocalTable(table: string): Record<string, any> {
  if (!localDB[table]) {
    localDB[table] = {};
    if (isBrowser) {
      try {
        const stored = safeGet(`local_db_${table}`);
        if (stored) {
          localDB[table] = JSON.parse(stored);
        }
      } catch (e) {
        // Silently handle json parse errors
      }
    }
  }
  return localDB[table];
}

function saveLocalTable(table: string) {
  if (isBrowser) {
    try {
      safeSet(`local_db_${table}`, JSON.stringify(localDB[table] || {}));
    } catch (e) {
      // Silently handled by safeSet
    }
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
  const table = queryObj.table;
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
      const dir = orderByConstraint.direction;
      items.sort((a, b) => {
        const valA = a[field];
        const valB = b[field];
        if (valA === valB) return 0;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        const comp = valA < valB ? -1 : 1;
        return dir === 'desc' ? -comp : comp;
      });
    }

    const limitConstraint = queryObj.constraints.find((c: any) => c.type === 'limit');
    if (limitConstraint) {
      items = items.slice(0, limitConstraint.value);
    }
  }

  const docs = items.map(item => {
    const itemData = deserializeRow(table, item);
    return {
      id: item.id,
      data: () => itemData,
      exists: () => true,
    };
  });

  return {
    docs,
    forEach: (callback: any) => docs.forEach(callback),
    size: docs.length,
    empty: docs.length === 0,
  };
}

function getDocLocal(docRef: any) {
  const table = docRef.table;
  const id = docRef.id;
  const tableData = getLocalTable(table);
  const data = tableData[id];

  return {
    exists: () => data !== undefined,
    data: () => data ? deserializeRow(table, data) : null,
    id,
  };
}

function setDocLocal(docRef: any, data: any) {
  const table = docRef.table;
  const id = docRef.id;
  const tableData = getLocalTable(table);
  
  const serialized = serializeRow(table, data, docRef.userId);
  tableData[id] = { ...serialized, id };
  saveLocalTable(table);
  
  triggerSnapshots(table);
}

function addDocLocal(collectionRef: any, data: any) {
  const table = collectionRef.table;
  const id = crypto.randomUUID();
  const tableData = getLocalTable(table);
  
  const serialized = serializeRow(table, data, collectionRef.userId);
  tableData[id] = { ...serialized, id };
  saveLocalTable(table);
  
  triggerSnapshots(table);
  return { id };
}

function updateDocLocal(docRef: any, data: any) {
  const table = docRef.table;
  const id = docRef.id;
  const tableData = getLocalTable(table);
  
  const existing = tableData[id] || {};
  const serialized = serializeRow(table, data, docRef.userId);
  tableData[id] = { ...existing, ...serialized, id };
  saveLocalTable(table);
  
  triggerSnapshots(table);
}

function deleteDocLocal(docRef: any) {
  const table = docRef.table;
  const id = docRef.id;
  const tableData = getLocalTable(table);
  
  delete tableData[id];
  saveLocalTable(table);
  
  triggerSnapshots(table);
}

// Intercepts queries and routes them to Supabase with local fallback
export async function getDocs(queryObj: any) {
  if (!isSupabaseConfigured) {
    return getDocsLocal(queryObj);
  }

  try {
    let builder = supabase.from(queryObj.table).select('*');
    if (queryObj.userId) {
      builder = builder.eq('user_id', queryObj.userId);
    }
    
    if (queryObj.constraints) {
      for (const c of queryObj.constraints) {
        if (c.type === 'where') {
          const col = camelToSnake(c.field);
          if (c.op === '==') {
            builder = builder.eq(col, c.value);
          } else if (c.op === 'in') {
            builder = builder.in(col, c.value);
          } else if (c.op === 'array-contains') {
            builder = builder.contains(col, [c.value]);
          }
        } else if (c.type === 'limit') {
          builder = builder.limit(c.value);
        } else if (c.type === 'orderBy') {
          const col = camelToSnake(c.field);
          builder = builder.order(col, { ascending: c.direction === 'asc' });
        }
      }
    }

    const { data, error } = await builder;
    if (error) throw error;

    const docs = (data || []).map(row => {
      const docData = deserializeRow(queryObj.table, row);
      return {
        id: row.id,
        data: () => docData,
        exists: () => true,
      };
    });

    return {
      docs,
      forEach: (callback: any) => docs.forEach(callback),
      size: docs.length,
      empty: docs.length === 0,
    };
  } catch (err) {
    console.warn(`Supabase getDocs failed on ${queryObj.table}. Falling back to local in-memory DB.`);
    return getDocsLocal(queryObj);
  }
}

export async function getDoc(docRef: any) {
  if (!isSupabaseConfigured) {
    return getDocLocal(docRef);
  }

  try {
    const { data, error } = await supabase
      .from(docRef.table)
      .select('*')
      .eq('id', docRef.id)
      .maybeSingle();

    if (error) throw error;

    const docData = data ? deserializeRow(docRef.table, data) : null;
    return {
      exists: () => !!data,
      data: () => docData,
      id: docRef.id,
    };
  } catch (err) {
    console.warn(`Supabase getDoc failed on ${docRef.table}/${docRef.id}. Falling back to local in-memory DB.`);
    return getDocLocal(docRef);
  }
}

export const getDocFromServer = getDoc;

export async function setDoc(docRef: any, data: any, options?: any) {
  // Always write locally first to keep cache warm and consistent
  setDocLocal(docRef, data);

  if (!isSupabaseConfigured) return;

  try {
    const serialized = serializeRow(docRef.table, data, docRef.userId);
    serialized.id = docRef.id;

    const { error } = await supabase
      .from(docRef.table)
      .upsert(serialized);

    if (error) throw error;
  } catch (err: any) {
    console.warn(`Supabase setDoc failed on ${docRef.table}/${docRef.id}. Written locally only. Error:`, err?.message || err);
  }
}

export async function addDoc(collectionRef: any, data: any) {
  const localRes = addDocLocal(collectionRef, data);

  if (!isSupabaseConfigured) return localRes;

  try {
    const serialized = serializeRow(collectionRef.table, data, collectionRef.userId);
    serialized.id = localRes.id;

    const { error } = await supabase
      .from(collectionRef.table)
      .insert(serialized);

    if (error) throw error;
  } catch (err: any) {
    console.warn(`Supabase addDoc failed on ${collectionRef.table}. Saved locally only. Error:`, err?.message || err);
  }

  return localRes;
}

export async function updateDoc(docRef: any, data: any) {
  updateDocLocal(docRef, data);

  if (!isSupabaseConfigured) return;

  try {
    const serialized = serializeRow(docRef.table, data, docRef.userId);

    const { error } = await supabase
      .from(docRef.table)
      .update(serialized)
      .eq('id', docRef.id);

    if (error) throw error;
  } catch (err: any) {
    console.warn(`Supabase updateDoc failed on ${docRef.table}/${docRef.id}. Updated locally only. Error:`, err?.message || err);
  }
}

export async function deleteDoc(docRef: any) {
  deleteDocLocal(docRef);

  if (!isSupabaseConfigured) return;

  try {
    const { error } = await supabase
      .from(docRef.table)
      .delete()
      .eq('id', docRef.id);

    if (error) throw error;
  } catch (err) {
    console.warn(`Supabase deleteDoc failed on ${docRef.table}/${docRef.id}. Deleted locally only.`);
  }
}

export function onSnapshot(
  queryOrDocRef: any,
  onNext: (snapshot: any) => void,
  onError?: (error: any) => void
) {
  let active = true;
  let channel: any = null;

  const runFetch = async () => {
    try {
      if (!isSupabaseConfigured) {
        onNext(queryOrDocRef.isDoc ? getDocLocal(queryOrDocRef) : getDocsLocal(queryOrDocRef));
        return;
      }

      if (queryOrDocRef.isDoc) {
        const { data, error } = await supabase
          .from(queryOrDocRef.table)
          .select('*')
          .eq('id', queryOrDocRef.id)
          .maybeSingle();

        if (error) throw error;
        if (!active) return;

        const docData = data ? deserializeRow(queryOrDocRef.table, data) : null;
        onNext({
          exists: () => !!data,
          data: () => docData,
          id: queryOrDocRef.id,
        });
      } else {
        let builder = supabase.from(queryOrDocRef.table).select('*');
        if (queryOrDocRef.userId) {
          builder = builder.eq('user_id', queryOrDocRef.userId);
        }
        
        if (queryOrDocRef.constraints) {
          for (const c of queryOrDocRef.constraints) {
            if (c.type === 'where') {
              const col = camelToSnake(c.field);
              if (c.op === '==') {
                builder = builder.eq(col, c.value);
              } else if (c.op === 'in') {
                builder = builder.in(col, c.value);
              } else if (c.op === 'array-contains') {
                builder = builder.contains(col, [c.value]);
              }
            } else if (c.type === 'limit') {
              builder = builder.limit(c.value);
            } else if (c.type === 'orderBy') {
              const col = camelToSnake(c.field);
              builder = builder.order(col, { ascending: c.direction === 'asc' });
            }
          }
        }

        const { data, error } = await builder;
        if (error) throw error;
        if (!active) return;

        const docs = (data || []).map(row => {
          const docData = deserializeRow(queryOrDocRef.table, row);
          return {
            id: row.id,
            data: () => docData,
            exists: () => true,
          };
        });

        onNext({
          forEach: (callback: any) => docs.forEach(callback),
          docs,
          size: docs.length,
          empty: docs.length === 0,
        });
      }
    } catch (err) {
      console.warn(`Supabase onSnapshot failed on ${queryOrDocRef.table}. Falling back to local in-memory snapshot.`);
      if (active) {
        onNext(queryOrDocRef.isDoc ? getDocLocal(queryOrDocRef) : getDocsLocal(queryOrDocRef));
      }
    }
  };

  runFetch();

  // Register as local listener to capture local updates
  const listenerObj = { table: queryOrDocRef.table, queryOrDocRef, onNext };
  listeners.push(listenerObj);

  if (isSupabaseConfigured) {
    channel = supabase
      .channel(`realtime:${queryOrDocRef.table}:${Math.random().toString(36).substr(2, 9)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: queryOrDocRef.table },
        () => {
          if (active) {
            runFetch();
          }
        }
      )
      .subscribe();
  }

  return () => {
    active = false;
    if (channel) {
      supabase.removeChannel(channel);
    }
    const idx = listeners.indexOf(listenerObj);
    if (idx !== -1) {
      listeners.splice(idx, 1);
    }
  };
}
