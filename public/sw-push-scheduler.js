/**
 * NutriAI - Native Offline Push & Meal/Challenge Notification Scheduler
 * Executado dentro do Service Worker para garantir que alertas de refeições,
 * hidratação e desafios sejam disparados mesmo com o app fechado ou offline.
 */

// Identificadores de cache e IndexedDB para persistência offline
const NOTIFICATION_CACHE = 'nutriai-schedules-v2';
const NOTIFICATION_CACHE_KEY = 'https://nutriai.local/scheduled-notifications.json';
const DB_NAME = 'nutriai_offline_scheduler_db';
const DB_VERSION = 1;
const STORE_NAME = 'scheduler_config';

// Estado de agendamento em memória com valores padrão
let localSchedules = {
  mealAlertsEnabled: true,
  challengeAlertsEnabled: true,
  meals: [
    { id: 'breakfast', label: 'Café da Manhã', time: '08:00', defaultTip: 'Comece o dia com energia e proteínas nutritivas!' },
    { id: 'morningSnack', label: 'Lanche da Manhã', time: '10:30', defaultTip: 'Hora de um snack leve ou fruta fresca.' },
    { id: 'lunch', label: 'Almoço', time: '12:30', defaultTip: 'Nutrientes balanceados para recarregar sua tarde.' },
    { id: 'afternoonSnack', label: 'Lanche da Tarde', time: '16:30', defaultTip: 'Mantenha o metabolismo ativo e a energia alta.' },
    { id: 'dinner', label: 'Jantar', time: '20:00', defaultTip: 'Refeição leve para uma boa digestão e sono reparador.' },
    { id: 'supper', label: 'Ceia', time: '22:00', defaultTip: 'Um chá calmante ou porção leve para a noite.' }
  ],
  challenges: [
    { id: 'morning-challenge', title: 'Desafio Diário NutriAI 🎯', time: '09:00', body: 'Confira seus desafios de hoje: hidratação, proteínas e passos!' },
    { id: 'evening-review', title: 'Revisão de Desafios & Metas 🏆', time: '19:00', body: 'Falta pouco para bater sua meta diária e pontuar na comunidade!' }
  ]
};

// Conjunto de chaves de notificações disparadas no dia para evitar disparos duplicados
const notifiedAlarmsSet = new Set();

// ==========================================
// 1. IndexedDB Helper para Persistência Offline
// ==========================================
function openSchedulerDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in self)) {
      return reject(new Error('IndexedDB não disponível no Service Worker'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveSchedulesToIDB(data) {
  try {
    const db = await openSchedulerDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ id: 'current_schedules', data, updatedAt: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    // Silencioso se IDB falhar; fallback via Cache Storage atuará
    return false;
  }
}

async function loadSchedulesFromIDB() {
  try {
    const db = await openSchedulerDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get('current_schedules');
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    return null;
  }
}

// ==========================================
// 2. Persistência Dupla (Cache API + IDB)
// ==========================================
async function persistSchedules(data) {
  // Salva no IndexedDB
  await saveSchedulesToIDB(data);

  // Salva no Cache Storage como redundância
  try {
    if ('caches' in self) {
      const cache = await caches.open(NOTIFICATION_CACHE);
      const res = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
      await cache.put(NOTIFICATION_CACHE_KEY, res);
    }
  } catch (err) {
    console.warn('[SW Push] Falha ao persistir no Cache Storage:', err);
  }
}

async function loadPersistedSchedules() {
  // 1. Tentar IndexedDB
  const idbData = await loadSchedulesFromIDB();
  if (idbData && typeof idbData === 'object') {
    localSchedules = { ...localSchedules, ...idbData };
    return;
  }

  // 2. Fallback para Cache Storage
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
    console.warn('[SW Push] Falha ao carregar agendamentos salvos:', err);
  }
}

// ==========================================
// 3. Utilitários de Tempo
// ==========================================
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

/**
 * Converte um horário "HH:MM" para o próximo Date timestamp (hoje ou amanhã se já passou)
 */
function getNextTimestampForTime(timeStr) {
  if (!timeStr || !timeStr.includes(':')) return null;
  const [hStr, mStr] = timeStr.split(':');
  const target = new Date();
  target.setHours(parseInt(hStr, 10), parseInt(mStr, 10), 0, 0);

  // Se já passou mais de 2 minutos do horário hoje, agenda para amanhã
  if (target.getTime() < Date.now() - 2 * 60 * 1000) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime();
}

// ==========================================
// 4. Disparo de Notificações Nativas
// ==========================================
async function triggerNativeNotification(title, options = {}) {
  if (!self.registration || !self.registration.showNotification) {
    console.warn('[SW Push] registration.showNotification não disponível');
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
    console.log('[SW Push] Notificação nativa disparada:', title);
    return true;
  } catch (err) {
    console.error('[SW Push] Erro ao disparar notificação nativa:', err);
    return false;
  }
}

// ==========================================
// 5. Suporte a Notification Triggers (W3C API)
// Permite que o SO do dispositivo agende notificações offline
// mesmo com o app e Service Worker totalmente encerrados
// ==========================================
async function registerNativeTimestampTriggers() {
  try {
    // Checa se a API TimestampTrigger é suportada (ex: Chrome Android)
    if (typeof TimestampTrigger === 'undefined' || !('showTrigger' in Notification.prototype)) {
      return false;
    }

    // Cancelar triggers anteriores se suportado
    const existing = await self.registration.getNotifications({ includeTriggered: true });
    for (const notif of existing) {
      if (notif.tag && (notif.tag.startsWith('trigger-meal-') || notif.tag.startsWith('trigger-challenge-'))) {
        notif.close();
      }
    }

    const todayStr = getTodayDateString();

    // 1. Agendar Triggers para Refeições
    if (localSchedules.mealAlertsEnabled && Array.isArray(localSchedules.meals)) {
      for (const meal of localSchedules.meals) {
        if (!meal.time) continue;
        const nextTime = getNextTimestampForTime(meal.time);
        if (!nextTime || nextTime <= Date.now()) continue;

        const title = `🍲 Hora do ${meal.label}!`;
        const body = meal.recipeName 
          ? `Sugestão do seu plano: ${meal.recipeName}. Bom apetite!`
          : (meal.defaultTip || 'Hora de manter sua nutrição em dia.');

        await self.registration.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/icon-192.png',
          vibrate: [150, 80, 150, 80, 250],
          tag: `trigger-meal-${meal.id}-${todayStr}`,
          showTrigger: new TimestampTrigger(nextTime),
          data: {
            url: '/?tab=plan',
            type: 'meal',
            mealId: meal.id
          },
          actions: [
            { action: 'open_plan', title: 'Ver Plano 🥗' },
            { action: 'dismiss', title: 'Fechar' }
          ]
        });
      }
    }

    // 2. Agendar Triggers para Desafios
    if (localSchedules.challengeAlertsEnabled && Array.isArray(localSchedules.challenges)) {
      for (const challenge of localSchedules.challenges) {
        if (!challenge.time) continue;
        const nextTime = getNextTimestampForTime(challenge.time);
        if (!nextTime || nextTime <= Date.now()) continue;

        await self.registration.showNotification(challenge.title || 'Desafio NutriAI 🎯', {
          body: challenge.body || 'Não esqueça de registrar seu progresso hoje!',
          icon: '/pwa-192x192.png',
          badge: '/icon-192.png',
          vibrate: [200, 100, 200],
          tag: `trigger-challenge-${challenge.id}-${todayStr}`,
          showTrigger: new TimestampTrigger(nextTime),
          data: {
            url: '/?tab=challenge',
            type: 'challenge',
            challengeId: challenge.id
          },
          actions: [
            { action: 'open_challenges', title: 'Ver Desafios 🎯' },
            { action: 'dismiss', title: 'Fechar' }
          ]
        });
      }
    }

    console.log('[SW Push] TimestampTriggers registrados com sucesso no SO.');
    return true;
  } catch (err) {
    console.warn('[SW Push] TimestampTrigger não suportado ou erro ao configurar:', err);
    return false;
  }
}

// ==========================================
// 6. Verificação Periódica de Alarmes Ativos
// ==========================================
async function checkScheduledAlarms() {
  const currentTime = getCurrentTimeString();
  const todayStr = getTodayDateString();

  // Limpeza de histórico de dias anteriores para não acumular memória
  if (notifiedAlarmsSet.size > 50) {
    notifiedAlarmsSet.clear();
  }

  // 1. Verificar Refeições
  if (localSchedules.mealAlertsEnabled && Array.isArray(localSchedules.meals)) {
    for (const meal of localSchedules.meals) {
      if (!meal.time) continue;
      
      const key = `${todayStr}-meal-${meal.id}`;
      if (meal.time === currentTime && !notifiedAlarmsSet.has(key)) {
        notifiedAlarmsSet.add(key);
        
        const title = `🍲 Hora do ${meal.label}!`;
        const body = meal.recipeName 
          ? `Sugestão do seu plano: ${meal.recipeName}. Bom apetite!`
          : (meal.defaultTip || 'Hora de nutrir seu corpo de acordo com seu plano alimentar.');

        await triggerNativeNotification(title, {
          body,
          tag: `meal-${meal.id}-${todayStr}`,
          data: {
            type: 'meal',
            mealId: meal.id,
            url: '/?tab=plan'
          },
          actions: [
            { action: 'open_plan', title: 'Ver Plano 🥗' },
            { action: 'dismiss', title: 'Mais tarde' }
          ]
        });
      }
    }
  }

  // 2. Verificar Desafios & Metas
  if (localSchedules.challengeAlertsEnabled && Array.isArray(localSchedules.challenges)) {
    for (const challenge of localSchedules.challenges) {
      if (!challenge.time) continue;

      const key = `${todayStr}-challenge-${challenge.id}`;
      if (challenge.time === currentTime && !notifiedAlarmsSet.has(key)) {
        notifiedAlarmsSet.add(key);

        const title = challenge.title || 'Desafio NutriAI 🏆';
        const body = challenge.body || 'Não se esqueça de registrar seu progresso para somar pontos e manter seu streak ativo!';

        await triggerNativeNotification(title, {
          body,
          tag: `challenge-${challenge.id}-${todayStr}`,
          data: {
            type: 'challenge',
            challengeId: challenge.id,
            url: '/?tab=challenge'
          },
          actions: [
            { action: 'open_challenges', title: 'Ver Desafios 🎯' },
            { action: 'dismiss', title: 'Dispensar' }
          ]
        });
      }
    }
  }
}

// ==========================================
// 7. Ciclo de Vida e Inicialização do Service Worker
// ==========================================
loadPersistedSchedules().then(() => {
  registerNativeTimestampTriggers().catch(() => {});
}).catch(() => {});

// Intervalo de checagem enquanto o worker estiver ativo (a cada 25 segundos)
setInterval(() => {
  checkScheduledAlarms().catch((err) => {
    console.warn('[SW Push] Erro na checagem de alarmes:', err);
  });
}, 25000);

// ==========================================
// 8. Event Listeners do Service Worker
// ==========================================

// Comunicação cliente <-> Service Worker via postMessage
self.addEventListener('message', (event) => {
  if (!event.data || typeof event.data !== 'object') return;

  const { type, payload } = event.data;

  switch (type) {
    case 'SCHEDULE_NOTIFICATIONS':
    case 'UPDATE_NOTIFICATION_SCHEDULES': {
      if (payload) {
        localSchedules = {
          ...localSchedules,
          ...payload
        };
        persistSchedules(localSchedules);
        console.log('[SW Push] Agendamentos atualizados offline no Service Worker:', localSchedules);
        
        // Roda checagem e registra triggers no SO
        checkScheduledAlarms();
        registerNativeTimestampTriggers();
      }
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ success: true, localSchedules });
      }
      break;
    }

    case 'TEST_PUSH_NOTIFICATION': {
      const title = payload?.title || 'NutriAI Alertas 🛡️';
      const body = payload?.body || 'Notificações push nativas configuradas com sucesso no Service Worker!';
      triggerNativeNotification(title, {
        body,
        tag: `test-push-${Date.now()}`,
        data: { url: '/?tab=profile' },
        actions: [
          { action: 'open', title: 'Abrir App' },
          { action: 'dismiss', title: 'Fechar' }
        ]
      });
      break;
    }

    case 'CLEAR_NOTIFICATION_SCHEDULES': {
      localSchedules.mealAlertsEnabled = false;
      localSchedules.challengeAlertsEnabled = false;
      persistSchedules(localSchedules);
      notifiedAlarmsSet.clear();
      break;
    }

    // Camada de pré-carregamento proativo de imagens de receitas e pratos
    case 'PREFETCH_RECIPE_IMAGES': {
      const urls = payload?.urls || payload?.images || [];
      event.waitUntil(
        prefetchRecipeImages(urls).then((result) => {
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({
              type: 'PREFETCH_RECIPE_IMAGES_RESULT',
              ...result
            });
          }
          // Notifica todas as janelas ativas sobre o término do pré-carregamento
          self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
              client.postMessage({
                type: 'RECIPE_IMAGES_PREFETCHED',
                payload: result
              });
            }
          });
        }).catch((err) => {
          console.warn('[SW Push] Erro ao processar prefetch de imagens:', err);
        })
      );
      break;
    }

    default:
      break;
  }
});

// Clique na notificação nativa (redireciona para o app ou foca na aba existente)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  if (action === 'dismiss') return;

  const notificationData = event.notification.data || {};
  let targetUrl = notificationData.url || '/';

  if (action === 'open_plan') {
    targetUrl = '/?tab=plan';
  } else if (action === 'open_challenges') {
    targetUrl = '/?tab=challenge';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se a aba já existe, traz para o foco e navega
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
      // Se não há aba aberta, abre uma nova janela
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Fechamento de notificação pelo usuário
self.addEventListener('notificationclose', (event) => {
  console.log('[SW Push] Notificação dispensada pelo usuário:', event.notification.tag);
});

// Push vindo de servidor Web Push externo (se conectado)
self.addEventListener('push', (event) => {
  let data = {};
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (err) {
    data = {
      title: 'NutriAI Notificação',
      body: event.data ? event.data.text() : 'Você tem um novo alerta de nutrição e hábitos.'
    };
  }

  const title = data.title || 'NutriAI - Lembrete';
  const options = {
    body: data.body || 'Confira seu aplicativo para ver novos detalhes.',
    icon: data.icon || '/pwa-192x192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: data.data || { url: '/' },
    tag: data.tag || `nutriai-push-${Date.now()}`,
    actions: [
      { action: 'open', title: 'Abrir NutriAI' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Suporte a Periodic Background Sync API (revisa alarmes periodicamente em segundo plano)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'nutriai-periodic-alerts' || event.tag === 'nutriai-meal-check') {
    event.waitUntil(
      loadPersistedSchedules()
        .then(() => checkScheduledAlarms())
        .then(() => registerNativeTimestampTriggers())
    );
  }
});

// Suporte a Background Sync API (quando a conexão ou dispositivo acorda)
self.addEventListener('sync', (event) => {
  if (event.tag === 'nutriai-sync-alerts') {
    event.waitUntil(
      loadPersistedSchedules()
        .then(() => checkScheduledAlarms())
        .then(() => registerNativeTimestampTriggers())
    );
  }
});

// ==========================================
// 9. Camada de Pré-Carregamento (Pre-fetching) de Imagens de Receitas e Pratos
// ==========================================
const RECIPE_IMAGE_CACHE = 'recipe-food-images-cache';

// Catálogo curado de pratos saudáveis pré-aquecidos proativamente
const CURATED_RECIPE_IMAGE_URLS = [
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=900&h=700',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=900&h=700',
  'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=900&h=700',
  'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&q=80&w=900&h=700',
  'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&q=80&w=900&h=700',
  'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&q=80&w=900&h=700',
  'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=900&h=700',
  'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&q=80&w=900&h=700',
  'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=900&h=700',
  'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=900&h=700',
  'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&q=80&w=900&h=700',
  'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&q=80&w=900&h=700',
  'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&q=80&w=900&h=700'
];

/**
 * Executa o pré-carregamento concorrente de imagens de receitas no Cache Storage
 * Permite que todas as fotos de pratos sejam disponibilizadas instantaneamente em modo offline.
 */
async function prefetchRecipeImages(urls) {
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return { success: true, count: 0, cached: 0, alreadyCached: 0 };
  }

  // Sanitiza e remove duplicatas
  const validUrls = Array.from(new Set(
    urls
      .filter((u) => typeof u === 'string' && u.trim().startsWith('http'))
      .map((u) => u.trim())
  ));

  if (validUrls.length === 0) {
    return { success: true, count: 0, cached: 0, alreadyCached: 0 };
  }

  let cachedCount = 0;
  let alreadyCachedCount = 0;
  let failCount = 0;

  try {
    const cache = await caches.open(RECIPE_IMAGE_CACHE);

    // Pré-carregamento em lotes paralelos (máximo 6 simultâneos para evitar sobrecarga)
    const BATCH_SIZE = 6;
    for (let i = 0; i < validUrls.length; i += BATCH_SIZE) {
      const batch = validUrls.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (url) => {
          try {
            // Verifica se a imagem já foi cacheada anteriormente
            const cachedMatch = await cache.match(url);
            if (cachedMatch) {
              alreadyCachedCount++;
              return;
            }

            // Realiza a requisição de pré-carregamento (tentando CORS e caindo para no-cors se opaco)
            let response;
            try {
              response = await fetch(url, {
                mode: 'cors',
                credentials: 'omit',
                headers: {
                  Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
                }
              });
            } catch (corsErr) {
              try {
                response = await fetch(url, { mode: 'no-cors' });
              } catch (fetchErr) {
                failCount++;
                return;
              }
            }

            if (response && (response.status === 200 || response.type === 'opaque')) {
              await cache.put(url, response.clone());
              cachedCount++;
            } else {
              failCount++;
            }
          } catch (err) {
            failCount++;
            console.warn('[SW Image Prefetch] Falha individual na URL:', url, err);
          }
        })
      );
    }

    console.log(
      `[SW Image Prefetch] Pré-carregamento finalizado: ${cachedCount} novas imagens cacheadas, ${alreadyCachedCount} já em cache, ${failCount} falhas.`
    );

    return {
      success: true,
      count: validUrls.length,
      cached: cachedCount,
      alreadyCached: alreadyCachedCount,
      failed: failCount
    };
  } catch (err) {
    console.error('[SW Image Prefetch] Falha crítica ao acessar Cache Storage:', err);
    return { success: false, error: err.message };
  }
}

// Ativação do Service Worker com pré-aquecimento proativo de imagens em segundo plano
self.addEventListener('activate', (event) => {
  event.waitUntil(
    // Garante que o Service Worker assume imediatamente o controle
    self.clients.claim().then(() => {
      console.log('[SW Image Prefetch] Service Worker ativo. Pré-aquecendo catálogo de imagens...');
      return prefetchRecipeImages(CURATED_RECIPE_IMAGE_URLS);
    }).catch((err) => {
      console.warn('[SW Image Prefetch] Aviso no pré-aquecimento inicial:', err);
    })
  );
});
