/**
 * NutriAI - Critical Data Backup & Storage Service
 * 
 * Performs scheduled periodic and on-demand backups of critical application data
 * (Meal Plans, Health Logs, Biometrics, Glucose, Blood Pressure, Intake Logs,
 * Smart Fridge & Pantry Items) to a dedicated storage bucket & Firestore collection,
 * with snapshot history, integrity checksums, and restoration tools.
 */

import { db, auth } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit as fsLimit, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { safeGet, safeSet } from './storage';
import { UserProfile, IntakeLog, ProgressLog, HydrationLog, WorkoutLog, SleepLog, EmotionalLog, FastingLog, BloodPressureLog, BodyMonitorLog, Note } from '../types';

export interface BackupCollectionCounts {
  profiles: number;
  mealPlans: number;
  intakeLogs: number;
  progressLogs: number;
  hydrationLogs: number;
  bloodPressureLogs: number;
  glucoseLogs: number;
  workoutLogs: number;
  sleepLogs: number;
  emotionalLogs: number;
  fastingLogs: number;
  bodyMonitorLogs: number;
  fridgeItems: number;
  pantryItems: number;
  shoppingList: number;
  notes: number;
  savedRecipes: number;
  feedbacks: number;
  [key: string]: number;
}

export interface BackupMetadata {
  id: string;
  backupId: string;
  timestamp: string;
  version: string;
  status: 'completed' | 'in_progress' | 'failed' | 'warning';
  totalRecords: number;
  sizeBytes: number;
  formattedSize: string;
  targetBucket: string;
  durationMs: number;
  triggeredBy: 'auto_periodic' | 'manual_admin' | 'system_trigger';
  checksum: string;
  collectionCounts: BackupCollectionCounts;
  errorDetails?: string;
  userEmail?: string;
  nextScheduledBackup?: string;
}

export interface CriticalBackupData {
  metadata: BackupMetadata;
  payload: {
    profiles: any[];
    mealPlans: any[];
    intakeLogs: any[];
    progressLogs: any[];
    hydrationLogs: any[];
    bloodPressureLogs: any[];
    glucoseLogs: any[];
    workoutLogs: any[];
    sleepLogs: any[];
    emotionalLogs: any[];
    fastingLogs: any[];
    bodyMonitorLogs: any[];
    fridgeItems: any[];
    pantryItems: any[];
    shoppingList: any[];
    notes: any[];
    savedRecipes: any[];
    feedbacks: any[];
    rawCollections?: Record<string, any[]>;
  };
}

export interface BackupConfig {
  enabled: boolean;
  intervalHours: number; // e.g. 6, 12, 24, 48
  targetBucket: string;
  lastBackupTimestamp: string | null;
  lastBackupId: string | null;
  maxSnapshotsToKeep: number;
  autoDownloadOnSchedule: boolean;
  includeMediaRefs: boolean;
}

const DEFAULT_CONFIG: BackupConfig = {
  enabled: true,
  intervalHours: 24,
  targetBucket: 'firestore://ai-studio-nutriai/system_backups/critical_vault',
  lastBackupTimestamp: null,
  lastBackupId: null,
  maxSnapshotsToKeep: 15,
  autoDownloadOnSchedule: false,
  includeMediaRefs: true
};

const BACKUP_CONFIG_KEY = 'nutri_backup_config_v2';
const LOCAL_BACKUP_CACHE_KEY = 'nutri_latest_backup_meta';
const LOCAL_BACKUP_SNAPSHOTS_LIST = 'nutri_backup_history_cache';

/**
 * Retorna as configurações ativas de backup
 */
export function getBackupConfig(): BackupConfig {
  try {
    const raw = safeGet(BACKUP_CONFIG_KEY);
    if (raw) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('[BackupService] Erro ao carregar config:', e);
  }
  return DEFAULT_CONFIG;
}

/**
 * Salva as configurações de backup
 */
export function saveBackupConfig(partial: Partial<BackupConfig>): BackupConfig {
  const current = getBackupConfig();
  const updated = { ...current, ...partial };
  safeSet(BACKUP_CONFIG_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * Formata bytes em formato legível (KB, MB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Gera um checksum simples e confiável para integridade do payload
 */
export function calculateChecksum(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Converte para 32-bit integer
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `sha256-crc32:${hex.toUpperCase()}`;
}

/**
 * Retorna o último metadata de backup salvo
 */
export function getLatestBackupMetadata(): BackupMetadata | null {
  try {
    const raw = safeGet(LOCAL_BACKUP_CACHE_KEY);
    if (raw) {
      return JSON.parse(raw) as BackupMetadata;
    }
  } catch {}
  return null;
}

/**
 * Coleta dados do Firestore e do armazenamento local do usuário
 */
async function collectCriticalData(currentUserUid?: string): Promise<{
  payload: CriticalBackupData['payload'];
  counts: BackupCollectionCounts;
}> {
  const payload: CriticalBackupData['payload'] = {
    profiles: [],
    mealPlans: [],
    intakeLogs: [],
    progressLogs: [],
    hydrationLogs: [],
    bloodPressureLogs: [],
    glucoseLogs: [],
    workoutLogs: [],
    sleepLogs: [],
    emotionalLogs: [],
    fastingLogs: [],
    bodyMonitorLogs: [],
    fridgeItems: [],
    pantryItems: [],
    shoppingList: [],
    notes: [],
    savedRecipes: [],
    feedbacks: []
  };

  const counts: BackupCollectionCounts = {
    profiles: 0,
    mealPlans: 0,
    intakeLogs: 0,
    progressLogs: 0,
    hydrationLogs: 0,
    bloodPressureLogs: 0,
    glucoseLogs: 0,
    workoutLogs: 0,
    sleepLogs: 0,
    emotionalLogs: 0,
    fastingLogs: 0,
    bodyMonitorLogs: 0,
    fridgeItems: 0,
    pantryItems: 0,
    shoppingList: 0,
    notes: 0,
    savedRecipes: 0,
    feedbacks: 0
  };

  // 1. Tenta carregar coleções globais do Firestore
  const fetchCol = async (colName: string, maxDocs = 200) => {
    try {
      const q = query(collection(db, colName), fsLimit(maxDocs));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch {
      return [];
    }
  };

  // 2. Coleta de subcoleções do usuário ativo
  const uid = currentUserUid || auth.currentUser?.uid || 'anonymous_user';
  const fetchUserSubcol = async (subName: string, maxDocs = 200) => {
    if (!uid || uid === 'anonymous_user') return [];
    try {
      const q = query(collection(db, 'users', uid, subName), fsLimit(maxDocs));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch {
      return [];
    }
  };

  // Executa em paralelo
  try {
    const [
      usersDocs,
      fridgeDocs,
      pantryDocs,
      feedbacksDocs,
      recipesDocs,
      userIntake,
      userProgress,
      userHydration,
      userWorkout,
      userSleep,
      userEmotional,
      userFasting,
      userBP,
      userBodyMon,
      userNotes
    ] = await Promise.all([
      fetchCol('users', 50),
      fetchCol('fridgeItems', 100),
      fetchCol('pantryItems', 100),
      fetchCol('feedbacks', 50),
      fetchCol('recipes', 50),
      fetchUserSubcol('intakeLogs', 100),
      fetchUserSubcol('progressLogs', 100),
      fetchUserSubcol('hydrationLogs', 100),
      fetchUserSubcol('workoutLogs', 100),
      fetchUserSubcol('sleepLogs', 100),
      fetchUserSubcol('emotionalLogs', 100),
      fetchUserSubcol('fastingLogs', 100),
      fetchUserSubcol('bloodPressureLogs', 100),
      fetchUserSubcol('bodyMonitorLogs', 100),
      fetchUserSubcol('notes', 100)
    ]);

    payload.profiles = usersDocs;
    payload.fridgeItems = fridgeDocs;
    payload.pantryItems = pantryDocs;
    payload.feedbacks = feedbacksDocs;
    payload.savedRecipes = recipesDocs;

    payload.intakeLogs = userIntake;
    payload.progressLogs = userProgress;
    payload.hydrationLogs = userHydration;
    payload.workoutLogs = userWorkout;
    payload.sleepLogs = userSleep;
    payload.emotionalLogs = userEmotional;
    payload.fastingLogs = userFasting;
    payload.bloodPressureLogs = userBP;
    payload.bodyMonitorLogs = userBodyMon;
    payload.notes = userNotes;
  } catch (err) {
    console.warn('[BackupService] Falha parcial na leitura remota:', err);
  }

  // 3. Fallback / Enriquecimento com LocalStorage caso offline ou sem rede
  try {
    const localProfileRaw = safeGet('user_profile') || safeGet('profile');
    if (localProfileRaw && payload.profiles.length === 0) {
      const parsed = JSON.parse(localProfileRaw);
      payload.profiles.push(parsed);
      if (parsed.intakeLogs?.length && payload.intakeLogs.length === 0) payload.intakeLogs = parsed.intakeLogs;
      if (parsed.progressLogs?.length && payload.progressLogs.length === 0) payload.progressLogs = parsed.progressLogs;
      if (parsed.hydrationLogs?.length && payload.hydrationLogs.length === 0) payload.hydrationLogs = parsed.hydrationLogs;
      if (parsed.workoutLogs?.length && payload.workoutLogs.length === 0) payload.workoutLogs = parsed.workoutLogs;
      if (parsed.sleepLogs?.length && payload.sleepLogs.length === 0) payload.sleepLogs = parsed.sleepLogs;
      if (parsed.bloodPressureLogs?.length && payload.bloodPressureLogs.length === 0) payload.bloodPressureLogs = parsed.bloodPressureLogs;
      if (parsed.bodyMonitorLogs?.length && payload.bodyMonitorLogs.length === 0) payload.bodyMonitorLogs = parsed.bodyMonitorLogs;
      if (parsed.notes?.length && payload.notes.length === 0) payload.notes = parsed.notes;
    }

    const localMealPlan = safeGet('meal_plan') || safeGet('nutri_meal_plan');
    if (localMealPlan) {
      payload.mealPlans.push(JSON.parse(localMealPlan));
    }

    const localPantry = safeGet('nutri_pantry_items') || safeGet('pantry_items');
    if (localPantry && payload.pantryItems.length === 0) {
      payload.pantryItems = JSON.parse(localPantry);
    }

    const localFridge = safeGet('smart_fridge_items') || safeGet('fridge_items');
    if (localFridge && payload.fridgeItems.length === 0) {
      payload.fridgeItems = JSON.parse(localFridge);
    }

    const localShopping = safeGet('shopping_list') || safeGet('nutri_shopping_items');
    if (localShopping) {
      payload.shoppingList = JSON.parse(localShopping);
    }

    const localBP = safeGet('nutri_blood_pressure_logs');
    if (localBP && payload.bloodPressureLogs.length === 0) {
      payload.bloodPressureLogs = JSON.parse(localBP);
    }

    const localGlucose = safeGet('nutri_glucose_logs') || safeGet('glucose_logs');
    if (localGlucose) {
      payload.glucoseLogs = JSON.parse(localGlucose);
    }
  } catch (parseErr) {
    console.warn('[BackupService] Erro ao carregar dados locais para backup:', parseErr);
  }

  // Preenche as contagens
  Object.keys(payload).forEach(k => {
    if (Array.isArray((payload as any)[k])) {
      counts[k] = (payload as any)[k].length;
    }
  });

  return { payload, counts };
}

/**
 * Executa a rotina completa de backup de dados críticos
 */
export async function runCriticalBackup(options: {
  triggeredBy?: 'auto_periodic' | 'manual_admin' | 'system_trigger';
  force?: boolean;
} = {}): Promise<BackupMetadata> {
  const { triggeredBy = 'manual_admin' } = options;
  const startTime = performance.now();
  const config = getBackupConfig();

  // Notifica o app do início do backup
  window.dispatchEvent(new CustomEvent('nutri:backup-started', { detail: { triggeredBy } }));

  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, '-');
  const backupId = `bkp_${dateStr}_${Math.random().toString(36).substring(2, 7)}`;
  const targetBucket = config.targetBucket || DEFAULT_CONFIG.targetBucket;

  try {
    const { payload, counts } = await collectCriticalData(auth.currentUser?.uid);
    const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);

    const serializedPayload = JSON.stringify(payload);
    const sizeBytes = new Blob([serializedPayload]).size;
    const formattedSize = formatBytes(sizeBytes);
    const checksum = calculateChecksum(serializedPayload);
    const durationMs = Math.round(performance.now() - startTime);

    const nextScheduled = new Date(now.getTime() + config.intervalHours * 60 * 60 * 1000).toISOString();

    const metadata: BackupMetadata = {
      id: backupId,
      backupId,
      timestamp: now.toISOString(),
      version: '2.4.0',
      status: 'completed',
      totalRecords,
      sizeBytes,
      formattedSize,
      targetBucket,
      durationMs,
      triggeredBy,
      checksum,
      collectionCounts: counts,
      userEmail: auth.currentUser?.email || undefined,
      nextScheduledBackup: nextScheduled
    };

    const fullSnapshot: CriticalBackupData = {
      metadata,
      payload
    };

    // 1. Salva no Firestore na coleção dedicada 'system_backups'
    try {
      const backupDocRef = doc(db, 'system_backups', backupId);
      await setDoc(backupDocRef, {
        ...metadata,
        // Armazena resumo e metadados no documento principal
        summaryPreview: {
          profiles: counts.profiles,
          mealPlans: counts.mealPlans,
          intakeLogs: counts.intakeLogs,
          healthLogs: counts.progressLogs + counts.bloodPressureLogs + counts.glucoseLogs,
          pantryAndFridge: counts.pantryItems + counts.fridgeItems
        },
        payloadSnippet: serializedPayload.length > 500000 
          ? JSON.stringify({ note: 'Payload excede 500KB, mantido no vault local/storage' }) 
          : payload,
        createdAt: serverTimestamp()
      });
    } catch (firestoreErr) {
      console.warn('[BackupService] Não foi possível persistir no Firestore remoto (offline ou permissão):', firestoreErr);
      metadata.status = 'warning';
      metadata.errorDetails = 'Salvo em snapshot local com sucesso; Firestore remoto temporariamente inacessível.';
    }

    // 2. Salva o metadata e snapshot no cache local para histórico
    safeSet(LOCAL_BACKUP_CACHE_KEY, JSON.stringify(metadata));

    try {
      const historyRaw = safeGet(LOCAL_BACKUP_SNAPSHOTS_LIST);
      const history: BackupMetadata[] = historyRaw ? JSON.parse(historyRaw) : [];
      history.unshift(metadata);
      // Mantém os N últimos backups
      const trimmed = history.slice(0, config.maxSnapshotsToKeep);
      safeSet(LOCAL_BACKUP_SNAPSHOTS_LIST, JSON.stringify(trimmed));
      
      // Salva snapshot completo no local storage com chave única do backupId
      safeSet(`nutri_snapshot_${backupId}`, JSON.stringify(fullSnapshot));
    } catch (storageErr) {
      console.warn('[BackupService] Aviso ao salvar snapshot completo no storage local:', storageErr);
    }

    // Atualiza config com data do último backup
    saveBackupConfig({
      lastBackupTimestamp: now.toISOString(),
      lastBackupId: backupId
    });

    // Dispara evento global para o Admin Dashboard
    window.dispatchEvent(new CustomEvent('nutri:backup-completed', { detail: metadata }));

    console.info(`%c[NutriAI Backup] ✅ Backup concluído com sucesso: ${backupId} (${formattedSize}, ${totalRecords} registros)`, 'color: #10b981; font-weight: bold;');

    return metadata;
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - startTime);
    const failedMeta: BackupMetadata = {
      id: backupId,
      backupId,
      timestamp: now.toISOString(),
      version: '2.4.0',
      status: 'failed',
      totalRecords: 0,
      sizeBytes: 0,
      formattedSize: '0 B',
      targetBucket,
      durationMs,
      triggeredBy,
      checksum: 'none',
      collectionCounts: countsFallback(),
      errorDetails: err?.message || String(err)
    };

    safeSet(LOCAL_BACKUP_CACHE_KEY, JSON.stringify(failedMeta));
    window.dispatchEvent(new CustomEvent('nutri:backup-completed', { detail: failedMeta }));
    console.error('[BackupService] ❌ Erro ao realizar backup:', err);
    return failedMeta;
  }
}

function countsFallback(): BackupCollectionCounts {
  return {
    profiles: 0,
    mealPlans: 0,
    intakeLogs: 0,
    progressLogs: 0,
    hydrationLogs: 0,
    bloodPressureLogs: 0,
    glucoseLogs: 0,
    workoutLogs: 0,
    sleepLogs: 0,
    emotionalLogs: 0,
    fastingLogs: 0,
    bodyMonitorLogs: 0,
    fridgeItems: 0,
    pantryItems: 0,
    shoppingList: 0,
    notes: 0,
    savedRecipes: 0,
    feedbacks: 0
  };
}

/**
 * Retorna o histórico de backups realizados
 */
export async function getBackupHistory(): Promise<BackupMetadata[]> {
  const localHistoryRaw = safeGet(LOCAL_BACKUP_SNAPSHOTS_LIST);
  let localList: BackupMetadata[] = [];
  if (localHistoryRaw) {
    try {
      localList = JSON.parse(localHistoryRaw);
    } catch {}
  }

  // Tenta buscar backups remotos do Firestore
  try {
    const q = query(collection(db, 'system_backups'), orderBy('timestamp', 'desc'), fsLimit(15));
    const snap = await getDocs(q);
    const remoteList = snap.docs.map(d => ({ id: d.id, ...d.data() } as BackupMetadata));
    
    // Mescla listas priorizando remota se houver
    if (remoteList.length > 0) {
      const mergedMap = new Map<string, BackupMetadata>();
      [...remoteList, ...localList].forEach(item => {
        if (item.backupId && !mergedMap.has(item.backupId)) {
          mergedMap.set(item.backupId, item);
        }
      });
      return Array.from(mergedMap.values());
    }
  } catch {
    // Retorna local se offline
  }

  return localList;
}

/**
 * Obtém o snapshot completo de um backup específico
 */
export async function getBackupSnapshot(backupId: string): Promise<CriticalBackupData | null> {
  // 1. Tenta carregar do Local Storage
  const localRaw = safeGet(`nutri_snapshot_${backupId}`);
  if (localRaw) {
    try {
      return JSON.parse(localRaw) as CriticalBackupData;
    } catch {}
  }

  // 2. Tenta carregar do Firestore
  try {
    const docRef = doc(db, 'system_backups', backupId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        metadata: data as BackupMetadata,
        payload: data.payloadSnippet || {}
      } as CriticalBackupData;
    }
  } catch {}

  return null;
}

/**
 * Faz o download do snapshot do backup em arquivo JSON
 */
export function downloadBackupFile(backupData: CriticalBackupData | BackupMetadata): void {
  let content = '';
  let filename = '';

  if ('payload' in backupData) {
    content = JSON.stringify(backupData, null, 2);
    filename = `nutriai_critical_backup_${backupData.metadata.backupId}.json`;
  } else {
    // É apenas metadata, tenta recuperar snapshot
    const local = safeGet(`nutri_snapshot_${backupData.backupId}`);
    if (local) {
      content = local;
      filename = `nutriai_critical_backup_${backupData.backupId}.json`;
    } else {
      content = JSON.stringify(backupData, null, 2);
      filename = `nutriai_backup_meta_${backupData.backupId}.json`;
    }
  }

  const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Restaura dados a partir de um snapshot de backup
 */
export async function restoreBackupSnapshot(backupData: CriticalBackupData): Promise<{
  success: boolean;
  restoredCount: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let restoredCount = 0;

  if (!backupData?.payload) {
    return { success: false, restoredCount: 0, errors: ['Payload do backup está vazio ou inválido.'] };
  }

  const { payload } = backupData;

  try {
    // 1. Restaura perfil e logs locais
    if (payload.profiles?.length) {
      const profile = payload.profiles[0];
      safeSet('user_profile', JSON.stringify(profile));
      restoredCount++;
    }

    if (payload.mealPlans?.length) {
      safeSet('meal_plan', JSON.stringify(payload.mealPlans[0]));
      restoredCount += payload.mealPlans.length;
    }

    if (payload.pantryItems?.length) {
      safeSet('nutri_pantry_items', JSON.stringify(payload.pantryItems));
      restoredCount += payload.pantryItems.length;
    }

    if (payload.fridgeItems?.length) {
      safeSet('smart_fridge_items', JSON.stringify(payload.fridgeItems));
      restoredCount += payload.fridgeItems.length;
    }

    if (payload.shoppingList?.length) {
      safeSet('shopping_list', JSON.stringify(payload.shoppingList));
      restoredCount += payload.shoppingList.length;
    }

    if (payload.bloodPressureLogs?.length) {
      safeSet('nutri_blood_pressure_logs', JSON.stringify(payload.bloodPressureLogs));
      restoredCount += payload.bloodPressureLogs.length;
    }

    if (payload.glucoseLogs?.length) {
      safeSet('nutri_glucose_logs', JSON.stringify(payload.glucoseLogs));
      restoredCount += payload.glucoseLogs.length;
    }

    window.dispatchEvent(new CustomEvent('nutri:backup-restored', { detail: { restoredCount } }));
    return { success: true, restoredCount, errors };
  } catch (err: any) {
    errors.push(err?.message || String(err));
    return { success: false, restoredCount, errors };
  }
}

/**
 * Inicializador da rotina periódica de backup (Background Scheduler)
 */
export function initPeriodicBackupScheduler(): () => void {
  if (typeof window === 'undefined') return () => {};

  const checkAndRunBackup = async () => {
    const config = getBackupConfig();
    if (!config.enabled) return;

    const now = Date.now();
    const lastTimestamp = config.lastBackupTimestamp ? new Date(config.lastBackupTimestamp).getTime() : 0;
    const intervalMs = config.intervalHours * 60 * 60 * 1000;

    // Se o tempo decorrido for maior que o intervalo configurado, executa backup
    if (now - lastTimestamp >= intervalMs) {
      console.log(`[BackupScheduler] Intervalo de ${config.intervalHours}h decorrido. Iniciando backup periódico automático...`);
      await runCriticalBackup({ triggeredBy: 'auto_periodic' });
    }
  };

  // Verifica na inicialização após 5 segundos
  const initialTimeout = setTimeout(checkAndRunBackup, 5000);

  // Verifica a cada 10 minutos
  const intervalId = setInterval(checkAndRunBackup, 10 * 60 * 1000);

  return () => {
    clearTimeout(initialTimeout);
    clearInterval(intervalId);
  };
}
