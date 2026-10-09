/**
 * NutriAI - Service Worker Push & Smart Demonstration Offline Scheduler
 * src/sw-push-scheduler.js
 * 
 * Gerencia em segundo plano:
 * 1. Lembretes nativos de treinos, exercícios biomecânicos e preparo de refeições
 * 2. Persistência offline completa do estado da Demonstração Inteligente (Avatar 3D)
 * 3. Cache Storage e IndexedDB para modelos anatômicos, animações e histórico de treinos
 * 4. Sincronização em background (Periodic Background Sync e TimestampTriggers)
 */

// ============================================================================
// CONSTANTES DE CACHE & INDEXEDDB
// ============================================================================
const NOTIFICATION_CACHE = 'nutriai-schedules-v2';
const NOTIFICATION_CACHE_KEY = 'https://nutriai.local/scheduled-notifications.json';
const DEMO_CACHE_NAME = 'demonstracao-inteligente-v1';
const DEMO_ASSETS_CACHE = 'nutriai-3d-assets-v1';
const RECIPE_IMAGE_CACHE = 'recipe-food-images-cache';

const DB_NAME = 'nutriai_offline_scheduler_db';
const DB_VERSION = 2; // Incremented for Demonstracao Inteligente offline stores
const STORE_SCHEDULER = 'scheduler_config';
const STORE_DEMO_STATE = 'demonstracao_inteligente_state';
const STORE_EXERCISES_OFFLINE = 'offline_exercises_data';
const STORE_WORKOUT_LOGS = 'offline_workout_logs';

// ============================================================================
// ESTADO EM MEMÓRIA DO SERVICE WORKER
// ============================================================================
let localSchedules = {
  mealAlertsEnabled: true,
  mealPrepAlertsEnabled: true,
  exerciseAlertsEnabled: true,
  challengeAlertsEnabled: true,
  prepLeadTimeMinutes: 30, // Notificar 30 min antes de preparar a refeição
  meals: [
    { id: 'breakfast', label: 'Café da Manhã', time: '08:00', prepTime: '07:30', defaultTip: 'Comece o dia com energia e proteínas nutritivas!' },
    { id: 'morningSnack', label: 'Lanche da Manhã', time: '10:30', prepTime: '10:15', defaultTip: 'Hora de um snack leve ou fruta fresca.' },
    { id: 'lunch', label: 'Almoço', time: '12:30', prepTime: '12:00', defaultTip: 'Nutrientes balanceados para recarregar sua tarde.' },
    { id: 'afternoonSnack', label: 'Lanche da Tarde', time: '16:30', prepTime: '16:15', defaultTip: 'Mantenha o metabolismo ativo e a energia alta.' },
    { id: 'dinner', label: 'Jantar', time: '20:00', prepTime: '19:30', defaultTip: 'Refeição leve para uma boa digestão e sono reparador.' },
    { id: 'supper', label: 'Ceia', time: '22:00', prepTime: '21:45', defaultTip: 'Um chá calmante ou porção leve para a noite.' }
  ],
  exercises: [
    {
      id: 'morning-workout',
      title: 'Treino e Demonstração 3D 🏋️',
      time: '07:00',
      category: 'Força & Hipertrofia',
      exerciseId: 'supino-reto',
      body: 'Hora do seu treino programado! Abra a Demonstração Inteligente para conferir a biomecânica correta.'
    },
    {
      id: 'evening-workout',
      title: 'Treino da Tarde/Noite 🔥',
      time: '18:00',
      category: 'Condicionamento & Postura',
      exerciseId: 'agachamento-livre',
      body: 'Hora de ativar os músculos com execução guiada pelo Avatar Anatômico 3D!'
    }
  ],
  challenges: [
    { id: 'morning-challenge', title: 'Desafio Diário NutriAI 🎯', time: '09:00', body: 'Confira seus desafios de hoje: hidratação, proteínas e passos!' },
    { id: 'evening-review', title: 'Revisão de Desafios & Metas 🏆', time: '19:00', body: 'Falta pouco para bater sua meta diária e pontuar na comunidade!' }
  ]
};

// Conjunto de alarmes disparados hoje para evitar duplicações
const notifiedAlarmsSet = new Set();

// ============================================================================
// 1. INDEXEDDB PERSISTENCE LAYER (ROBUST & RESILIENT)
// ============================================================================
function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in self)) {
      return reject(new Error('IndexedDB não suportado no ambiente'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Store para configurações de agendamento
      if (!db.objectStoreNames.contains(STORE_SCHEDULER)) {
        db.createObjectStore(STORE_SCHEDULER, { keyPath: 'id' });
      }
      // Store para estado offline da Demonstração Inteligente (avatar, preferências, câmera)
      if (!db.objectStoreNames.contains(STORE_DEMO_STATE)) {
        db.createObjectStore(STORE_DEMO_STATE, { keyPath: 'key' });
      }
      // Store para catálogo de exercícios biomecânicos cacheados
      if (!db.objectStoreNames.contains(STORE_EXERCISES_OFFLINE)) {
        db.createObjectStore(STORE_EXERCISES_OFFLINE, { keyPath: 'id' });
      }
      // Store para logs de treino pendentes de sync
      if (!db.objectStoreNames.contains(STORE_WORKOUT_LOGS)) {
        db.createObjectStore(STORE_WORKOUT_LOGS, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Salvar / Ler do IndexedDB de forma genérica
async function idbSet(storeName, keyOrItem) {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.put(keyOrItem);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn(`[SW Scheduler] Falha ao gravar em ${storeName}:`, err);
    return false;
  }
}

async function idbGet(storeName, key) {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`[SW Scheduler] Falha ao ler de ${storeName}:`, err);
    return null;
  }
}

async function idbGetAll(storeName) {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    return [];
  }
}

// ============================================================================
// 2. PERSISTÊNCIA DA DEMONSTRAÇÃO INTELIGENTE (OFFLINE STATE)
// ============================================================================
/**
 * Salva as preferências de visualização do Avatar 3D e estado do exercício
 */
async function saveDemonstracaoOfflineState(state) {
  if (!state || typeof state !== 'object') return false;
  const payload = {
    key: 'last_demonstracao_state',
    ...state,
    updatedAt: Date.now()
  };

  await idbSet(STORE_DEMO_STATE, payload);

  // Também persiste em Cache Storage para redundância PWA
  try {
    if ('caches' in self) {
      const cache = await caches.open(DEMO_CACHE_NAME);
      const res = new Response(JSON.stringify(payload), {
        headers: { 'Content-Type': 'application/json' }
      });
      await cache.put('https://nutriai.local/demonstracao-state.json', res);
    }
  } catch (err) {
    // Silencioso
  }
  return true;
}

/**
 * Recupera o último estado salvo da Demonstração Inteligente
 */
async function getDemonstracaoOfflineState() {
  const stateFromIdb = await idbGet(STORE_DEMO_STATE, 'last_demonstracao_state');
  if (stateFromIdb) return stateFromIdb;

  try {
    if ('caches' in self) {
      const cache = await caches.open(DEMO_CACHE_NAME);
      const res = await cache.match('https://nutriai.local/demonstracao-state.json');
      if (res) {
        return await res.json();
      }
    }
  } catch (err) {
    // Silencioso
  }
  return null;
}

/**
 * Cacheia metadados e definições de exercícios para funcionamento offline
 */
async function cacheExercisesForOfflineDemonstration(exercises) {
  if (!Array.isArray(exercises) || exercises.length === 0) return 0;
  let count = 0;
  for (const ex of exercises) {
    if (ex && ex.id) {
      await idbSet(STORE_EXERCISES_OFFLINE, {
        id: ex.id,
        data: ex,
        cachedAt: Date.now()
      });
      count++;
    }
  }
  return count;
}

// ============================================================================
// 3. AGENDAMENTO E PERSISTÊNCIA DE NOTIFICAÇÕES (REFEIÇÕES, PREPARO & TREINOS)
// ============================================================================
async function persistSchedules(data) {
  if (!data) return;
  await idbSet(STORE_SCHEDULER, { id: 'current_schedules', data, updatedAt: Date.now() });

  try {
    if ('caches' in self) {
      const cache = await caches.open(NOTIFICATION_CACHE);
      const res = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
      await cache.put(NOTIFICATION_CACHE_KEY, res);
    }
  } catch (err) {
    console.warn('[SW Push] Falha ao gravar Cache Storage:', err);
  }
}

async function loadPersistedSchedules() {
  const idbRecord = await idbGet(STORE_SCHEDULER, 'current_schedules');
  if (idbRecord && idbRecord.data) {
    localSchedules = { ...localSchedules, ...idbRecord.data };
    return;
  }

  try {
    if ('caches' in self) {
      const cache = await caches.open(NOTIFICATION_CACHE);
      const res = await cache.match(NOTIFICATION_CACHE_KEY);
      if (res) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          localSchedules = { ...localSchedules, ...data };
        }
      }
    }
  } catch (err) {
    console.warn('[SW Push] Falha ao ler agendamentos:', err);
  }
}

// ============================================================================
// 4. UTILITÁRIOS DE TEMPO E DISPARO NATIVO
// ============================================================================
function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentTimeString() {
  const d = new Date();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getNextTimestampForTime(timeStr) {
  if (!timeStr || !timeStr.includes(':')) return null;
  const [hStr, mStr] = timeStr.split(':');
  const target = new Date();
  target.setHours(parseInt(hStr, 10), parseInt(mStr, 10), 0, 0);

  if (target.getTime() < Date.now() - 2 * 60 * 1000) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime();
}

/**
 * Dispara uma notificação nativa através do Service Worker Registration
 */
async function triggerNativeNotification(title, options = {}) {
  if (!self.registration || !self.registration.showNotification) {
    console.warn('[SW Push] registration.showNotification indisponível');
    return false;
  }

  const defaultOptions = {
    icon: '/pwa-192x192.png',
    badge: '/icon-192.png',
    vibrate: [150, 80, 150, 80, 250],
    renotify: true,
    requireInteraction: false
  };

  const notificationOptions = {
    ...defaultOptions,
    ...options
  };

  try {
    await self.registration.showNotification(title, notificationOptions);
    console.log('[SW Push] Notificação disparada com sucesso:', title);
    return true;
  } catch (err) {
    console.error('[SW Push] Erro ao disparar notificação nativa:', err);
    return false;
  }
}

// ============================================================================
// 5. REGISTRO DE TIMESTAMP TRIGGERS (W3C NOTIFICATION TRIGGERS API)
// ============================================================================
async function registerNativeTimestampTriggers() {
  try {
    if (typeof TimestampTrigger === 'undefined' || !('showTrigger' in Notification.prototype)) {
      return false;
    }

    const todayStr = getTodayDateString();

    // 1. Triggers de Refeição e Preparo Antecipado
    if (localSchedules.mealAlertsEnabled && Array.isArray(localSchedules.meals)) {
      for (const meal of localSchedules.meals) {
        // Horário da Refeição
        if (meal.time) {
          const nextTime = getNextTimestampForTime(meal.time);
          if (nextTime && nextTime > Date.now()) {
            const title = `🍲 Hora do ${meal.label}!`;
            const body = meal.recipeName
              ? `Sugestão do seu plano: ${meal.recipeName}. Bom apetite!`
              : (meal.defaultTip || 'Hora de manter sua nutrição equilibrada.');

            await self.registration.showNotification(title, {
              body,
              icon: '/pwa-192x192.png',
              badge: '/icon-192.png',
              tag: `trigger-meal-${meal.id}-${todayStr}`,
              showTrigger: new TimestampTrigger(nextTime),
              data: { url: '/?tab=plan', type: 'meal', mealId: meal.id },
              actions: [
                { action: 'open_plan', title: 'Ver Plano 🥗' },
                { action: 'dismiss', title: 'Fechar' }
              ]
            });
          }
        }

        // Lembrete de Preparo Antecipado (Meal Prep)
        if (localSchedules.mealPrepAlertsEnabled && meal.prepTime) {
          const prepTime = getNextTimestampForTime(meal.prepTime);
          if (prepTime && prepTime > Date.now()) {
            const prepTitle = `👩‍🍳 Preparo de Refeição: ${meal.label}`;
            const prepBody = meal.recipeName
              ? `Hora de começar o preparo de "${meal.recipeName}" para comer pontualmente às ${meal.time}!`
              : `Reserve alguns minutos para preparar seu ${meal.label.toLowerCase()} saudável.`;

            await self.registration.showNotification(prepTitle, {
              body: prepBody,
              icon: '/pwa-192x192.png',
              badge: '/icon-192.png',
              tag: `trigger-prep-${meal.id}-${todayStr}`,
              showTrigger: new TimestampTrigger(prepTime),
              data: { url: '/?tab=plan&action=prep', type: 'meal_prep', mealId: meal.id },
              actions: [
                { action: 'open_recipe', title: 'Ver Receita 📖' },
                { action: 'dismiss', title: 'Mais tarde' }
              ]
            });
          }
        }
      }
    }

    // 2. Triggers de Treino & Demonstração Inteligente 3D
    if (localSchedules.exerciseAlertsEnabled && Array.isArray(localSchedules.exercises)) {
      for (const ex of localSchedules.exercises) {
        if (!ex.time) continue;
        const nextTime = getNextTimestampForTime(ex.time);
        if (!nextTime || nextTime <= Date.now()) continue;

        await self.registration.showNotification(ex.title || 'Hora do Treino NutriAI 🏋️', {
          body: ex.body || 'Confira os exercícios guiados pelo Avatar Anatômico 3D!',
          icon: '/pwa-192x192.png',
          badge: '/icon-192.png',
          vibrate: [200, 100, 200, 100, 300],
          tag: `trigger-exercise-${ex.id}-${todayStr}`,
          showTrigger: new TimestampTrigger(nextTime),
          data: {
            url: `/?tab=workout&exerciseId=${ex.exerciseId || 'supino-reto'}&view=demo`,
            type: 'exercise_demo',
            exerciseId: ex.exerciseId
          },
          actions: [
            { action: 'open_demonstracao', title: 'Ver Avatar 3D 🧬' },
            { action: 'open_workout', title: 'Iniciar Treino ⚡' }
          ]
        });
      }
    }

    return true;
  } catch (err) {
    console.warn('[SW Push] TimestampTrigger não suportado ou erro ao agendar:', err);
    return false;
  }
}

// ============================================================================
// 6. VERIFICAÇÃO PERIÓDICA DE ALARMES
// ============================================================================
async function checkScheduledAlarms() {
  const currentTime = getCurrentTimeString();
  const todayStr = getTodayDateString();

  if (notifiedAlarmsSet.size > 80) {
    notifiedAlarmsSet.clear();
  }

  // 1. Refeições e Preparo de Refeição
  if (localSchedules.mealAlertsEnabled && Array.isArray(localSchedules.meals)) {
    for (const meal of localSchedules.meals) {
      // Notificação no horário exato da refeição
      if (meal.time === currentTime) {
        const key = `${todayStr}-meal-${meal.id}`;
        if (!notifiedAlarmsSet.has(key)) {
          notifiedAlarmsSet.add(key);
          const title = `🍲 Hora do ${meal.label}!`;
          const body = meal.recipeName 
            ? `Sugestão do seu plano: ${meal.recipeName}. Bom apetite!`
            : (meal.defaultTip || 'Hora de nutrir seu corpo de acordo com seu plano alimentar.');

          await triggerNativeNotification(title, {
            body,
            tag: `meal-${meal.id}-${todayStr}`,
            data: { type: 'meal', mealId: meal.id, url: '/?tab=plan' },
            actions: [
              { action: 'open_plan', title: 'Ver Plano 🥗' },
              { action: 'dismiss', title: 'Mais tarde' }
            ]
          });
        }
      }

      // Notificação de Preparo Antecipado (Meal Prep)
      if (localSchedules.mealPrepAlertsEnabled && meal.prepTime && meal.prepTime === currentTime) {
        const prepKey = `${todayStr}-mealprep-${meal.id}`;
        if (!notifiedAlarmsSet.has(prepKey)) {
          notifiedAlarmsSet.add(prepKey);
          const prepTitle = `👩‍🍳 Preparar ${meal.label}`;
          const prepBody = meal.recipeName
            ? `Hora de começar o preparo de "${meal.recipeName}" para sua refeição das ${meal.time}!`
            : `Faltam ${localSchedules.prepLeadTimeMinutes || 30} minutos para o seu ${meal.label.toLowerCase()}. Separe os ingredientes!`;

          await triggerNativeNotification(prepTitle, {
            body: prepBody,
            tag: `mealprep-${meal.id}-${todayStr}`,
            data: { type: 'meal_prep', mealId: meal.id, url: '/?tab=plan&action=prep' },
            actions: [
              { action: 'open_recipe', title: 'Ver Ingredientes 🥑' },
              { action: 'dismiss', title: 'Já preparei' }
            ]
          });
        }
      }
    }
  }

  // 2. Treinos e Demonstração Inteligente 3D
  if (localSchedules.exerciseAlertsEnabled && Array.isArray(localSchedules.exercises)) {
    for (const ex of localSchedules.exercises) {
      if (ex.time === currentTime) {
        const key = `${todayStr}-exercise-${ex.id}`;
        if (!notifiedAlarmsSet.has(key)) {
          notifiedAlarmsSet.add(key);
          const title = ex.title || 'Treino do Dia NutriAI 🏋️';
          const body = ex.body || 'Seu treino programado está pronto. Confira os movimentos no Avatar 3D com destaque biomecânico!';

          await triggerNativeNotification(title, {
            body,
            tag: `exercise-${ex.id}-${todayStr}`,
            data: {
              type: 'exercise_demo',
              exerciseId: ex.exerciseId,
              url: `/?tab=workout&exerciseId=${ex.exerciseId || 'supino-reto'}&view=demo`
            },
            actions: [
              { action: 'open_demonstracao', title: 'Ver Avatar 3D 🧬' },
              { action: 'open_workout', title: 'Iniciar Treino ⚡' }
            ]
          });
        }
      }
    }
  }

  // 3. Desafios Diários
  if (localSchedules.challengeAlertsEnabled && Array.isArray(localSchedules.challenges)) {
    for (const challenge of localSchedules.challenges) {
      if (challenge.time === currentTime) {
        const key = `${todayStr}-challenge-${challenge.id}`;
        if (!notifiedAlarmsSet.has(key)) {
          notifiedAlarmsSet.add(key);
          const title = challenge.title || 'Desafio NutriAI 🏆';
          const body = challenge.body || 'Não se esqueça de registrar seu progresso para somar pontos e manter seu streak ativo!';

          await triggerNativeNotification(title, {
            body,
            tag: `challenge-${challenge.id}-${todayStr}`,
            data: { type: 'challenge', challengeId: challenge.id, url: '/?tab=challenge' },
            actions: [
              { action: 'open_challenges', title: 'Ver Desafios 🎯' },
              { action: 'dismiss', title: 'Dispensar' }
            ]
          });
        }
      }
    }
  }
}

// ============================================================================
// 7. PRÉ-CARREGAMENTO DE IMAGENS & ASSETS 3D
// ============================================================================
async function prefetchRecipeImages(urls) {
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return { success: true, count: 0, cached: 0 };
  }
  const validUrls = Array.from(new Set(urls.filter((u) => typeof u === 'string' && u.trim().startsWith('http'))));
  let cachedCount = 0;
  try {
    const cache = await caches.open(RECIPE_IMAGE_CACHE);
    for (let i = 0; i < validUrls.length; i += 5) {
      const batch = validUrls.slice(i, i + 5);
      await Promise.all(
        batch.map(async (url) => {
          try {
            if (await cache.match(url)) return;
            const res = await fetch(url, { mode: 'cors', credentials: 'omit' }).catch(() => fetch(url, { mode: 'no-cors' }));
            if (res && (res.status === 200 || res.type === 'opaque')) {
              await cache.put(url, res.clone());
              cachedCount++;
            }
          } catch (e) {}
        })
      );
    }
    return { success: true, cached: cachedCount };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ============================================================================
// 8. EVENT LISTENERS DO SERVICE WORKER
// ============================================================================

// Inicialização e carregamento de agendamentos persistidos
loadPersistedSchedules().then(() => {
  registerNativeTimestampTriggers().catch(() => {});
}).catch(() => {});

// Intervalo de monitoramento ativo
setInterval(() => {
  checkScheduledAlarms().catch((err) => {
    console.warn('[SW Push] Erro no ciclo de checagem:', err);
  });
}, 25000);

// Mensagens vindas da aplicação React (postMessage)
self.addEventListener('message', (event) => {
  if (!event.data || typeof event.data !== 'object') return;
  const { type, payload } = event.data;

  switch (type) {
    case 'SCHEDULE_NOTIFICATIONS':
    case 'UPDATE_NOTIFICATION_SCHEDULES': {
      if (payload) {
        localSchedules = { ...localSchedules, ...payload };
        persistSchedules(localSchedules);
        checkScheduledAlarms();
        registerNativeTimestampTriggers();
      }
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ success: true, localSchedules });
      }
      break;
    }

    // Persistência offline da Demonstração Inteligente
    case 'PERSIST_DEMO_STATE':
    case 'SAVE_EXERCISE_DEMO_STATE': {
      event.waitUntil(
        saveDemonstracaoOfflineState(payload).then((success) => {
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ success, state: payload });
          }
        })
      );
      break;
    }

    case 'GET_OFFLINE_DEMO_STATE': {
      event.waitUntil(
        getDemonstracaoOfflineState().then((state) => {
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ success: true, state });
          }
        })
      );
      break;
    }

    // Cacheamento do catálogo de exercícios biomecânicos
    case 'CACHE_EXERCISES_OFFLINE': {
      const exercises = payload?.exercises || [];
      event.waitUntil(
        cacheExercisesForOfflineDemonstration(exercises).then((cachedCount) => {
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ success: true, count: cachedCount });
          }
        })
      );
      break;
    }

    // Log de treino offline para sync posterior
    case 'LOG_OFFLINE_WORKOUT': {
      if (payload) {
        event.waitUntil(
          idbSet(STORE_WORKOUT_LOGS, {
            ...payload,
            timestamp: Date.now(),
            synced: false
          }).then(() => {
            if (event.ports && event.ports[0]) {
              event.ports[0].postMessage({ success: true, recorded: true });
            }
          })
        );
      }
      break;
    }

    // Teste de disparo de notificação
    case 'TEST_PUSH_NOTIFICATION': {
      const title = payload?.title || 'NutriAI Demonstração 3D & Alertas 🛡️';
      const body = payload?.body || 'Notificações push de treinos e preparo de refeições ativas offline!';
      triggerNativeNotification(title, {
        body,
        tag: `test-push-${Date.now()}`,
        data: { url: '/?tab=workout&view=demo' },
        actions: [
          { action: 'open_demonstracao', title: 'Ver Avatar 3D 🧬' },
          { action: 'dismiss', title: 'Fechar' }
        ]
      });
      break;
    }

    // Prefetch de imagens de receitas
    case 'PREFETCH_RECIPE_IMAGES': {
      const urls = payload?.urls || payload?.images || [];
      event.waitUntil(
        prefetchRecipeImages(urls).then((result) => {
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ type: 'PREFETCH_RECIPE_IMAGES_RESULT', ...result });
          }
        })
      );
      break;
    }

    case 'CLEAR_NOTIFICATION_SCHEDULES': {
      localSchedules.mealAlertsEnabled = false;
      localSchedules.mealPrepAlertsEnabled = false;
      localSchedules.exerciseAlertsEnabled = false;
      localSchedules.challengeAlertsEnabled = false;
      persistSchedules(localSchedules);
      notifiedAlarmsSet.clear();
      break;
    }

    default:
      break;
  }
});

// Clique na notificação nativa
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const action = event.action;
  if (action === 'dismiss') return;

  const notificationData = event.notification.data || {};
  let targetUrl = notificationData.url || '/';

  if (action === 'open_demonstracao') {
    targetUrl = `/?tab=workout&exerciseId=${notificationData.exerciseId || 'supino-reto'}&view=demo`;
  } else if (action === 'open_workout') {
    targetUrl = '/?tab=workout';
  } else if (action === 'open_recipe' || action === 'open_plan') {
    targetUrl = '/?tab=plan';
  } else if (action === 'open_challenges') {
    targetUrl = '/?tab=challenge';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'NUTRI_PUSH_CLICK',
            data: notificationData,
            targetUrl
          });
          if ('navigate' in client && targetUrl) {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Sincronizações Periódicas e em Background
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'nutriai-periodic-alerts' || event.tag === 'nutriai-meal-check' || event.tag === 'nutriai-exercise-check') {
    event.waitUntil(
      loadPersistedSchedules()
        .then(() => checkScheduledAlarms())
        .then(() => registerNativeTimestampTriggers())
    );
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'nutriai-sync-alerts' || event.tag === 'nutriai-workout-sync') {
    event.waitUntil(
      loadPersistedSchedules()
        .then(() => checkScheduledAlarms())
        .then(() => registerNativeTimestampTriggers())
    );
  }
});

// Ativação e reivindicação imediata de controle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log('[SW Push Scheduler] Service Worker ativado e controlando clientes.');
    })
  );
});
