import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { 
  Mic, 
  Loader2, 
  Waves,
  Sparkles,
  Volume2,
  VolumeX,
  Compass,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { UserProfile } from '../types';
import { chatWithAssistant } from '../lib/gemini';
import { speak, stopSpeech, unlockAudio } from '../lib/speech';
import { playSfx, vibrate } from '../lib/sensory';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

export interface LiveAssistantProps {
  profile: UserProfile | null;
  activeTab?: string;
  onNavigate?: (tab: string, payload?: any) => void;
  onOpenLanguage?: () => void;
  onOpenFeedback?: () => void;
  onAwardPoints?: (points: number, reason: string) => void;
  onUpdateProfile?: (updater: React.SetStateAction<UserProfile | null>) => void;
}

// Inactivity timeout in milliseconds (8 seconds of silence closes the session)
const INACTIVITY_TIMEOUT_MS = 8000;

// Compute time-appropriate greeting in active language
function getTimeGreeting(profile?: UserProfile | null, lang: string = 'pt-BR'): { spoken: string; display: string } {
  const currentHour = new Date().getHours();
  const baseLang = (lang || 'pt-BR').split('-')[0].toLowerCase();
  
  let timeGreeting = "Boa noite";
  let icon = "🌙";
  let question = "Como posso ajudar você hoje?";

  if (baseLang === 'en') {
    question = "How can I help you today?";
    if (currentHour >= 5 && currentHour < 12) {
      timeGreeting = "Good morning";
      icon = "☀️";
    } else if (currentHour >= 12 && currentHour < 18) {
      timeGreeting = "Good afternoon";
      icon = "🌤️";
    } else {
      timeGreeting = "Good evening";
    }
  } else if (baseLang === 'es') {
    question = "¿Cómo puedo ayudarte hoy?";
    if (currentHour >= 5 && currentHour < 12) {
      timeGreeting = "¡Buenos días";
      icon = "☀️";
    } else if (currentHour >= 12 && currentHour < 18) {
      timeGreeting = "¡Buenas tardes";
      icon = "🌤️";
    } else {
      timeGreeting = "¡Buenas noches";
    }
  } else if (baseLang === 'de') {
    question = "Wie kann ich dir heute helfen?";
    if (currentHour >= 5 && currentHour < 12) {
      timeGreeting = "Guten Morgen";
      icon = "☀️";
    } else if (currentHour >= 12 && currentHour < 18) {
      timeGreeting = "Guten Tag";
      icon = "🌤️";
    } else {
      timeGreeting = "Guten Abend";
    }
  } else if (baseLang === 'fr') {
    question = "Comment puis-je vous aider aujourd'hui ?";
    if (currentHour >= 5 && currentHour < 18) {
      timeGreeting = "Bonjour";
      icon = "☀️";
    } else {
      timeGreeting = "Bonsoir";
    }
  } else if (baseLang === 'it') {
    question = "Come posso aiutarti oggi?";
    if (currentHour >= 5 && currentHour < 17) {
      timeGreeting = "Buongiorno";
      icon = "☀️";
    } else {
      timeGreeting = "Buonasera";
    }
  } else if (baseLang === 'zh') {
    question = "今天我可以怎样帮助你？";
    if (currentHour >= 5 && currentHour < 12) {
      timeGreeting = "早上好";
      icon = "☀️";
    } else if (currentHour >= 12 && currentHour < 18) {
      timeGreeting = "下午好";
      icon = "🌤️";
    } else {
      timeGreeting = "晚上好";
    }
  } else if (baseLang === 'ja') {
    question = "今日はどのようにお手伝いできますか？";
    if (currentHour >= 5 && currentHour < 11) {
      timeGreeting = "おはようございます";
      icon = "☀️";
    } else if (currentHour >= 11 && currentHour < 18) {
      timeGreeting = "こんにちは";
      icon = "🌤️";
    } else {
      timeGreeting = "こんばんは";
    }
  } else if (baseLang === 'ko') {
    question = "오늘 어떻게 도와드릴까요?";
    if (currentHour >= 5 && currentHour < 12) {
      timeGreeting = "좋은 아침이에요";
      icon = "☀️";
    } else if (currentHour >= 12 && currentHour < 18) {
      timeGreeting = "좋은 오후예요";
      icon = "🌤️";
    } else {
      timeGreeting = "좋은 저녁이에요";
    }
  } else if (baseLang === 'hi') {
    question = "आज मैं आपकी कैसे मदद कर सकती हूँ?";
    if (currentHour >= 5 && currentHour < 12) {
      timeGreeting = "शुभ प्रभात";
      icon = "☀️";
    } else if (currentHour >= 12 && currentHour < 18) {
      timeGreeting = "शुभ दोपहर";
      icon = "🌤️";
    } else {
      timeGreeting = "शुभ संध्या";
    }
  } else if (baseLang === 'ar') {
    question = "كيف يمكنني مساعدتك اليوم؟";
    if (currentHour >= 5 && currentHour < 12) {
      timeGreeting = "صباح الخير";
      icon = "☀️";
    } else {
      timeGreeting = "مساء الخير";
      icon = "🌙";
    }
  } else if (baseLang === 'tr') {
    question = "Bugün size nasıl yardımcı olabilirim?";
    if (currentHour >= 5 && currentHour < 12) {
      timeGreeting = "Günaydın";
      icon = "☀️";
    } else if (currentHour >= 12 && currentHour < 18) {
      timeGreeting = "İyi günler";
      icon = "🌤️";
    } else {
      timeGreeting = "İyi akşamlar";
    }
  } else {
    if (currentHour >= 5 && currentHour < 12) {
      timeGreeting = "Bom dia";
      icon = "☀️";
    } else if (currentHour >= 12 && currentHour < 18) {
      timeGreeting = "Boa tarde";
      icon = "🌤️";
    }
  }

  const rawName = profile?.name?.trim();
  const firstName = rawName && !['usuário', 'usuario', 'user', 'amigo', 'amiga', 'amigo(a)', ''].includes(rawName.toLowerCase())
    ? rawName.split(' ')[0]
    : null;

  const nameGreeting = firstName ? `, ${firstName}` : '';
  const spoken = `${timeGreeting}${nameGreeting}! ${question}`;
  const display = `${timeGreeting}${nameGreeting}! ${icon} ${question}`;

  return { spoken, display };
}

function getLocalizedAssistantStrings(lang: string = 'pt-BR') {
  const base = (lang || 'pt-BR').split('-')[0].toLowerCase();
  const map: Record<string, {
    listening: string;
    thinking: string;
    speaking: string;
    goodbye: string;
    tryAgain: string;
    micError: string;
    noMic: string;
    unsupported: string;
  }> = {
    pt: {
      listening: "Estou ouvindo...",
      thinking: "Pensando...",
      speaking: "Respondendo...",
      goodbye: "Vou ficar por aqui. Quando precisar, é só me chamar.",
      tryAgain: "Tente novamente.",
      micError: "Não consegui acessar seu microfone. Verifique a permissão do navegador.",
      noMic: "Nenhum microfone encontrado neste dispositivo. Conecte um microfone para falar com a Malu.",
      unsupported: "Reconhecimento de voz indisponível neste navegador."
    },
    en: {
      listening: "Listening...",
      thinking: "Thinking...",
      speaking: "Speaking...",
      goodbye: "I'll be right here whenever you need me. Just tap to talk!",
      tryAgain: "Please try again.",
      micError: "Could not access microphone. Please check browser permissions.",
      noMic: "No microphone found on this device. Please connect a microphone to talk with Malu.",
      unsupported: "Speech recognition is not available on this browser."
    },
    es: {
      listening: "Escuchando...",
      thinking: "Pensando...",
      speaking: "Hablando...",
      goodbye: "Estaré aquí cuando me necesites. ¡Solo tienes que llamarme!",
      tryAgain: "Inténtalo de nuevo.",
      micError: "No se pudo acceder al micrófono. Verifica los permisos del navegador.",
      noMic: "No se encontró ningún micrófono en este dispositivo. Conecta un micrófono para hablar con Malu.",
      unsupported: "Reconocimiento de voz no disponible en este navegador."
    },
    fr: {
      listening: "À votre écoute...",
      thinking: "Réflexion...",
      speaking: "En train de parler...",
      goodbye: "Je reste là si vous avez besoin. N'hésitez pas à me solliciter !",
      tryAgain: "Veuillez réessayer.",
      micError: "Impossible d'accéder au microphone. Vérifiez les autorisations.",
      noMic: "Aucun microphone trouvé sur cet appareil. Connectez un microphone pour parler à Malu.",
      unsupported: "Reconnaissance vocale non disponible sur ce navigateur."
    },
    de: {
      listening: "Höre zu...",
      thinking: "Nachdenken...",
      speaking: "Spreche...",
      goodbye: "Ich bin hier, wenn du mich brauchst. Ruf mich einfach!",
      tryAgain: "Bitte versuche es erneut.",
      micError: "Mikrofonzugriff nicht möglich. Bitte Berechtigungen prüfen.",
      noMic: "Kein Mikrofon auf diesem Gerät gefunden. Bitte schließen Sie ein Mikrofon an.",
      unsupported: "Spracherkennung in diesem Browser nicht verfügbar."
    },
    it: {
      listening: "Sto ascoltando...",
      thinking: "Sto pensando...",
      speaking: "Sto rispondendo...",
      goodbye: "Rimango qui a disposizione. Quando hai bisogno, chiamami pure!",
      tryAgain: "Riprova per favore.",
      micError: "Impossibile accedere al microfono. Controlla i permessi.",
      noMic: "Nessun microfono trovato su questo dispositivo. Collega un microfono per parlare con Malu.",
      unsupported: "Riconoscimento vocale non disponibile in questo browser."
    },
    zh: {
      listening: "正在倾听...",
      thinking: "正在思考...",
      speaking: "正在回答...",
      goodbye: "我随时在此等候。需要时请随时叫我！",
      tryAgain: "请重试。",
      micError: "无法访问麦克风，请检查浏览器权限。",
      noMic: "在此设备上未找到麦克风。请连接麦克风以与 Malu 对话。",
      unsupported: "此浏览器不支持语音识别。"
    },
    ja: {
      listening: "聞いています...",
      thinking: "考えています...",
      speaking: "話しています...",
      goodbye: "いつでもお呼びください。またお話ししましょう！",
      tryAgain: "もう一度お試しください。",
      micError: "マイクにアクセスできませんでした。権限を確認してください。",
      noMic: "このデバイスでマイクが見つかりませんでした。マイクを接続してください。",
      unsupported: "このブラウザでは音声認識がサポートされていません。"
    },
    ko: {
      listening: "듣고 있어요...",
      thinking: "생각 중...",
      speaking: "말씀드리는 중...",
      goodbye: "필요하실 때 언제든 불러주세요. 언제나 곁에 있을게요!",
      tryAgain: "다시 시도해 주세요.",
      micError: "마이크에 접근할 수 없습니다. 권한을 확인해 주세요.",
      noMic: "이 기기에서 마이크를 찾을 수 없습니다. 마이크를 연결해 주세요.",
      unsupported: "이 브라우저에서는 음성 인식을 지원하지 않습니다."
    },
    hi: {
      listening: "सुन रही हूँ...",
      thinking: "सोच रही हूँ...",
      speaking: "बोल रही हूँ...",
      goodbye: "जब भी ज़रूरत हो, बस मुझे बुला लीजिएगा। मैं यहीं हूँ!",
      tryAgain: "कृपया पुनः प्रयास करें।",
      micError: "माइक्रोफ़ोन तक पहुँच नहीं मिली। कृपया अनुमति जाँचें।",
      noMic: "इस उपकरण पर कोई माइक्रोफ़ोन नहीं मिला। कृपया माइक्रोफ़ोन कनेक्ट करें।",
      unsupported: "इस ब्राउज़र में ध्वनि पहचान उपलब्ध नहीं है।"
    },
    ar: {
      listening: "أستمع إليك...",
      thinking: "جارٍ التفكير...",
      speaking: "أتحدث...",
      goodbye: "سأكون هنا متى احتجتني. فقط اضغط للتحدث!",
      tryAgain: "يرجى المحاولة مرة أخرى.",
      micError: "تعذر الوصول إلى الميكروفون. يرجى التحقق من أذونات المتصفح.",
      noMic: "لم يتم العثور على ميكروفون في هذا الجهاز. يرجى توصيل ميكروفون.",
      unsupported: "التعرف على الصوت غير مدعوم في هذا المتصفح."
    },
    tr: {
      listening: "Dinliyorum...",
      thinking: "Düşünüyor...",
      speaking: "Konuşuyor...",
      goodbye: "İhtiyacınız olduğunda buradayım. İstediğiniz an seslenebilirsiniz!",
      tryAgain: "Lütfen tekrar deneyin.",
      micError: "Mikrofona erişilemedi. Lütfen tarayıcı izinlerini kontrol edin.",
      noMic: "Bu cihazda mikrofon bulunamadı. Lütfen bir mikrofon bağlayın.",
      unsupported: "Bu tarayıcıda ses tanıma desteklenmiyor."
    }
  };
  return map[base] || map['pt'];
}

// Local fast-intent classifier for zero-latency instant navigation & actions
function classifyLocalIntent(query: string, profile?: UserProfile | null): {
  text: string;
  action: 'NAVIGATE' | 'OPEN_MODAL' | 'CONFIRM_ACTION' | 'CHANGE_LANGUAGE' | 'NONE';
  actionData?: { tab?: string; modal?: string; filter?: string; language?: string; targetLanguage?: string };
} | null {
  const q = query.toLowerCase().trim();

  // 1. Emagrecimento / Receita rápida para emagrecer
  if (
    (q.includes('emagrecer') || q.includes('perder peso') || q.includes('secar') || q.includes('emagrecimento')) &&
    (q.includes('receita') || q.includes('prato') || q.includes('rápida') || q.includes('rapida') || q.includes('comer') || q.includes('gerar'))
  ) {
    return {
      text: "Claro! Vou abrir os pratos rápidos para emagrecimento.",
      action: "NAVIGATE",
      actionData: { tab: "quickdishes", filter: "emagrecimento" }
    };
  }

  // 2. Ganho de Massa / Hipertrofia
  if (
    q.includes('ganho de massa') || q.includes('ganhar massa') || q.includes('hipertrofia') || q.includes('mais músculo') || q.includes('musculo')
  ) {
    return {
      text: "Perfeito! Vou abrir os pratos e opções para ganho de massa muscular.",
      action: "NAVIGATE",
      actionData: { tab: "quickdishes", filter: "massa" }
    };
  }

  // 3. Receita Rápida / Pratos Rápidos
  if (
    q.includes('receita rápida') || q.includes('receita rapida') || q.includes('prato rápido') || q.includes('pratos rápidos') || q.includes('15 minutos')
  ) {
    return {
      text: "Com certeza! Abrindo pratos rápidos e práticos para você.",
      action: "NAVIGATE",
      actionData: { tab: "quickdishes" }
    };
  }

  // 4. Receitas / Gerador de Receitas
  if (
    q.includes('receita') || q.includes('receitas') || q.includes('gerador') || q.includes('cozinhar') || q.includes('ideia de almoço') || q.includes('ideia de janta')
  ) {
    return {
      text: "Claro! Abrindo o Gerador de Receitas com Inteligência Artificial.",
      action: "NAVIGATE",
      actionData: { tab: "generator" }
    };
  }

  // 5. Análise de Prato
  if (
    q.includes('analisar prato') || q.includes('análise de prato') || q.includes('analise de prato') || q.includes('foto do prato') || q.includes('avaliar prato') || q.includes('foto da comida')
  ) {
    return {
      text: "Claro! Vou abrir a Análise de Prato para você.",
      action: "NAVIGATE",
      actionData: { tab: "analyzer" }
    };
  }

  // 6. Restaurante / Comer Fora
  if (
    q.includes('restaurante') || q.includes('comer fora') || q.includes('comi fora') || q.includes('cardápio fora') || q.includes('estou no restaurante')
  ) {
    return {
      text: "Vou abrir nosso guia de escolhas saudáveis para restaurantes e comer fora.",
      action: "NAVIGATE",
      actionData: { tab: "dining" }
    };
  }

  // 7. Geladeira Inteligente
  if (
    q.includes('geladeira') || q.includes('minha geladeira') || q.includes('o que tem na geladeira') || q.includes('ingredientes que tenho')
  ) {
    return {
      text: "Abrindo sua Geladeira Inteligente para aproveitar o que você tem em casa.",
      action: "NAVIGATE",
      actionData: { tab: "fridge" }
    };
  }

  // 8. Sucos Funcionais / Detox
  if (
    q.includes('suco') || q.includes('sucos') || q.includes('detox') || q.includes('suco funcional')
  ) {
    return {
      text: "Preparando as melhores receitas de sucos funcionais e detox para você.",
      action: "NAVIGATE",
      actionData: { tab: "juice" }
    };
  }

  // 9. Chás / Ervas Medicinais / Plantas
  if (
    q.includes('chá') || q.includes('chas') || q.includes('erva') || q.includes('ervas') || q.includes('planta') || q.includes('medicinal')
  ) {
    return {
      text: "Abrindo a seção de chás funcionais e ervas medicinais.",
      action: "NAVIGATE",
      actionData: { tab: "herbs" }
    };
  }

  // 10. Treino / Exercícios / Personal
  if (
    q.includes('treino') || q.includes('treinar') || q.includes('exercício') || q.includes('exercicio') || q.includes('personal') || q.includes('academia')
  ) {
    return {
      text: "Excelente iniciativa! Abrindo a sua área de treinos e personal.",
      action: "NAVIGATE",
      actionData: { tab: "trainer" }
    };
  }

  // 11. Água / Hidratação / Hábitos
  if (
    q.includes('água') || q.includes('agua') || q.includes('beber água') || q.includes('hidratação') || q.includes('hidratacao') || q.includes('hábito') || q.includes('habitos')
  ) {
    const waterGoal = profile?.waterGoal || 2000;
    return {
      text: `Sua meta diária é de ${waterGoal} ml de água. Vou abrir seus hábitos para você registrar.`,
      action: "NAVIGATE",
      actionData: { tab: "habits" }
    };
  }

  // 12. Progresso / Evolução Corporal / Fotos / Peso
  if (
    q.includes('progresso') || q.includes('evolução') || q.includes('evolucao') || q.includes('minhas fotos') || q.includes('antes e depois') || q.includes('meu peso')
  ) {
    return {
      text: "Vou abrir o seu histórico e fotos de evolução corporal.",
      action: "NAVIGATE",
      actionData: { tab: "evolution" }
    };
  }

  // 13. Avatar 3D / Análise Corporal
  if (
    q.includes('avatar') || q.includes('meu corpo') || q.includes('composição corporal') || q.includes('bioimpedância')
  ) {
    return {
      text: "Abrindo seu Avatar 3D e análise de composição corporal.",
      action: "NAVIGATE",
      actionData: { tab: "body" }
    };
  }

  // 14. Lista de Compras
  if (
    q.includes('lista de compras') || q.includes('minhas compras') || q.includes('compras') || q.includes('ingredientes para comprar')
  ) {
    return {
      text: "Abrindo sua Lista de Compras Inteligente.",
      action: "NAVIGATE",
      actionData: { tab: "shopping" }
    };
  }

  // 15. Comparador de Preços / Mercado
  if (
    q.includes('comparar preço') || q.includes('comparador') || q.includes('mercado') || q.includes('delivery') || q.includes('pedir marmita')
  ) {
    return {
      text: "Abrindo o Mercado Saudável e comparador de preços.",
      action: "NAVIGATE",
      actionData: { tab: "market" }
    };
  }

  // 16. Horta Inteligente
  if (
    q.includes('horta') || q.includes('cultivo') || q.includes('plantar') || q.includes('temperos em casa')
  ) {
    return {
      text: "Abrindo a sua Horta Inteligente e dicas de cultivo.",
      action: "NAVIGATE",
      actionData: { tab: "garden" }
    };
  }

  // 17. Equilíbrio Emocional / Humor / Ansiedade
  if (
    q.includes('emocional') || q.includes('ansiedade') || q.includes('estresse') || q.includes('humor') || q.includes('vontade de comer doce')
  ) {
    return {
      text: "Cuidar da mente é fundamental. Abrindo o rastreador de Equilíbrio Emocional.",
      action: "NAVIGATE",
      actionData: { tab: "emotional" }
    };
  }

  // 18. Pressão Arterial
  if (
    q.includes('pressão') || q.includes('pressao') || q.includes('hipertensão')
  ) {
    return {
      text: "Abrindo o monitor de Pressão Arterial para você registrar suas medições.",
      action: "NAVIGATE",
      actionData: { tab: "bloodpressure" }
    };
  }

  // 19. Glicose / Glicemia / Diabetes
  if (
    q.includes('glicose') || q.includes('glicemia') || q.includes('diabetes')
  ) {
    return {
      text: "Abrindo o monitor de Glicemia e controle glicêmico.",
      action: "NAVIGATE",
      actionData: { tab: "glucose" }
    };
  }

  // 20. Caderno de Notas / Diário
  if (
    q.includes('notas') || q.includes('anotação') || q.includes('anotacoes') || q.includes('diário') || q.includes('diario')
  ) {
    return {
      text: "Abrindo o seu Caderno de Notas e Diário Alimentar.",
      action: "NAVIGATE",
      actionData: { tab: "notes" }
    };
  }

  // 21. Substituições Inteligentes / Trocas
  if (
    q.includes('troca') || q.includes('trocas') || q.includes('substituição') || q.includes('substituicao') || q.includes('substituir')
  ) {
    return {
      text: "Abrindo a ferramenta de Substituições Inteligentes de Alimentos.",
      action: "NAVIGATE",
      actionData: { tab: "swaps" }
    };
  }

  // 22. Desafios / Roleta Fit
  if (
    q.includes('desafio') || q.includes('desafios') || q.includes('roleta') || q.includes('conquista') || q.includes('selos')
  ) {
    return {
      text: "Abrindo os Desafios Saudáveis e Conquistas da semana!",
      action: "NAVIGATE",
      actionData: { tab: "challenge" }
    };
  }

  // 23. Plano Alimentar / Cardápio Semanal
  if (
    q.includes('plano alimentar') || q.includes('cardápio') || q.includes('cardapio') || q.includes('minha dieta') || q.includes('planejamento')
  ) {
    return {
      text: "Abrindo seu Plano Alimentar e Cardápio da semana.",
      action: "NAVIGATE",
      actionData: { tab: "plan" }
    };
  }

  // 24. Scanner de Código de Barras / Alimentos
  if (
    q.includes('scanner') || q.includes('código de barra') || q.includes('codigo de barras') || q.includes('escanear')
  ) {
    return {
      text: "Abrindo o Scanner de Alimentos para você escanear o rótulo.",
      action: "NAVIGATE",
      actionData: { tab: "barcode" }
    };
  }

  // 25. Alergias e Alérgenos
  if (
    q.includes('alergia') || q.includes('alergias') || q.includes('alérgeno') || q.includes('intolerância')
  ) {
    return {
      text: "Abrindo o Detector de Alergias e Alérgenos Ocultos.",
      action: "NAVIGATE",
      actionData: { tab: "allergy" }
    };
  }

  // 26. Idioma
  if (
    q.includes('mudar idioma') || q.includes('trocar idioma') || q.includes('alterar idioma') || q.includes('idiomas') || q.includes('língua') || q.includes('lingua') ||
    q.includes('change language') || q.includes('cambiar idioma')
  ) {
    if (q.includes('espanhol') || q.includes('spanish') || q.includes('español')) {
      return {
        text: "¡Cambiando el idioma a español! Todo el aplicativo se ha actualizado.",
        action: "CHANGE_LANGUAGE",
        actionData: { language: "es-ES" }
      };
    }
    if (q.includes('inglês') || q.includes('ingles') || q.includes('english')) {
      return {
        text: "Switching language to English! The entire app has been updated.",
        action: "CHANGE_LANGUAGE",
        actionData: { language: "en-US" }
      };
    }
    if (q.includes('português') || q.includes('portugues') || q.includes('portuguese')) {
      return {
        text: "Mudando o idioma para português! Todo o aplicativo foi atualizado.",
        action: "CHANGE_LANGUAGE",
        actionData: { language: "pt-BR" }
      };
    }
    return {
      text: "Vou abrir as configurações de idioma para você.",
      action: "OPEN_MODAL",
      actionData: { modal: "language" }
    };
  }

  // 27. Premium / PRO / Planos / Assinatura
  if (
    q.includes('premium') || q.includes('pro') || q.includes('plano premium') || q.includes('assinar') || q.includes('assinatura') || q.includes('preço')
  ) {
    return {
      text: "Vou te mostrar todos os planos e recursos exclusivos do NutriAI Premium.",
      action: "NAVIGATE",
      actionData: { tab: "pricing" }
    };
  }

  // 28. Perfil / Configurações
  if (
    q.includes('perfil') || q.includes('minha conta') || q.includes('configurações') || q.includes('configuracoes') || q.includes('meus dados')
  ) {
    return {
      text: "Abrindo o seu Perfil e configurações pessoais.",
      action: "NAVIGATE",
      actionData: { tab: "profile" }
    };
  }

  // 29. Suporte / Feedback
  if (
    q.includes('suporte') || q.includes('ajuda') || q.includes('feedback') || q.includes('falar com atendimento') || q.includes('sugestão')
  ) {
    return {
      text: "Abrindo a central de Feedback e Suporte para você enviar sua mensagem.",
      action: "OPEN_MODAL",
      actionData: { modal: "feedback" }
    };
  }

  // 30. Início / Página Inicial / Assistente 360°
  if (
    q.includes('início') || q.includes('inicio') || q.includes('página inicial') || q.includes('pagina inicial') || q.includes('home') || q.includes('360')
  ) {
    return {
      text: "Voltando para a tela inicial do Assistente 360°.",
      action: "NAVIGATE",
      actionData: { tab: "assistant360" }
    };
  }

  // 31. Confirmação de ações críticas
  if (
    q.includes('excluir conta') || q.includes('apagar conta') || q.includes('deletar conta') || q.includes('apagar histórico') || q.includes('limpar tudo')
  ) {
    return {
      text: "Essa ação é permanente. Você realmente deseja excluir sua conta ou limpar todos os seus dados?",
      action: "CONFIRM_ACTION"
    };
  }

  // 32. Piada ou conversa descontraída fora de contexto
  if (
    q.includes('piada') || q.includes('brincadeira') || q.includes('engraçado')
  ) {
    return {
      text: "Posso até brincar um pouco! 😄 Mas vamos voltar ao que pode ajudar você de verdade: seu foco hoje é emagrecer, ganhar massa ou melhorar sua alimentação?",
      action: "NONE"
    };
  }

  return null;
}

export function LiveAssistant({ 
  profile,
  activeTab = 'assistant360',
  onNavigate,
  onOpenLanguage,
  onOpenFeedback,
  onAwardPoints,
  onUpdateProfile
}: LiveAssistantProps) {
  const { language: currentLanguage, changeLanguage: setAppLanguage, t } = useLanguage();

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [statusText, setStatusText] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'idle' | 'listening' | 'processing' | 'speaking' | 'error' | 'success'>('idle');
  const [audioVolume, setAudioVolume] = useState<number>(0);

  // Conversation history in memory
  const [conversationHistory, setConversationHistory] = useState<{ role: 'user' | 'model', text: string }[]>([]);

  // References
  const recognitionRef = useRef<any>(null);
  const statusTimerRef = useRef<any>(null);
  const inactivityTimerRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const isAssistantActiveRef = useRef(false);
  const latestTranscriptRef = useRef<string>('');

  // Audio Analysis References
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Check and request explicit microphone permission on user interaction
  const checkAndRequestMicPermission = useCallback(async (): Promise<{ granted: boolean; isDeviceNotFound?: boolean }> => {
    console.log('[NutriAI Mic] Probing microphone permissions...');
    if (typeof window === 'undefined' || !navigator?.mediaDevices) {
      console.warn('[NutriAI Mic] navigator.mediaDevices unavailable in this environment');
      return { granted: true }; // Fallback to SpeechRecognition attempt
    }

    // Check device enumeration first if available
    try {
      if (typeof navigator.mediaDevices.enumerateDevices === 'function') {
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        const audioInputs = devices.filter(d => d.kind === 'audioinput');
        // If device enumeration lists devices and no audioinput exists, mic hardware is absent
        if (devices.length > 0 && audioInputs.length === 0) {
          console.warn('[NutriAI Mic] No audioinput devices detected on this system');
          return { granted: false, isDeviceNotFound: true };
        }
      }
    } catch {
      // Ignore enumeration error and proceed
    }

    if (typeof navigator.mediaDevices.getUserMedia !== 'function') {
      return { granted: true };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tracks = stream.getAudioTracks();
      console.log(`[NutriAI Mic] Microphone permission granted! Active tracks: ${tracks.length}`);
      // Clean up probe tracks immediately so Web Speech API has exclusive access
      tracks.forEach(track => {
        try { track.stop(); } catch {}
      });
      return { granted: true };
    } catch (err: any) {
      const isNotFound = err?.name === 'NotFoundError' || 
                         err?.name === 'DevicesNotFoundError' || 
                         (typeof err?.message === 'string' && (
                           err.message.toLowerCase().includes('not found') ||
                           err.message.toLowerCase().includes('requested device') ||
                           err.message.toLowerCase().includes('device')
                         ));
      console.warn('[NutriAI Mic] Microphone probe notice:', err?.name || 'Error', err?.message || 'Device notice');
      return { granted: false, isDeviceNotFound: isNotFound };
    }
  }, []);

  // Stop audio visualizer
  const stopAudioVisualizer = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    setAudioVolume(0);
  }, []);

  // Start real-time audio volume analyzer
  const startAudioVisualizer = useCallback(async () => {
    try {
      stopAudioVisualizer();
      if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) return;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }).catch(() => null);
      if (!stream) return;
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.65;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        if (!analyserRef.current || !isListeningRef.current) {
          setAudioVolume(0);
          return;
        }

        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        const binCount = dataArray.length;
        for (let i = 0; i < binCount; i++) {
          sum += dataArray[i];
        }

        // Calculate average normalized volume (0 to 1) with non-linear boost for speech
        const avg = sum / binCount / 255;
        const boosted = Math.min(1, Math.pow(avg * 2.2, 1.2));
        
        // Smooth transition
        setAudioVolume(prev => prev * 0.4 + boosted * 0.6);
        animFrameIdRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();
    } catch {
      // Audio visualizer fallback handled silently
    }
  }, [stopAudioVisualizer]);

  // Synchronize audio visualizer with listening state
  useEffect(() => {
    if (isListening) {
      startAudioVisualizer();
    } else {
      stopAudioVisualizer();
    }
    return () => {
      stopAudioVisualizer();
    };
  }, [isListening, startAudioVisualizer, stopAudioVisualizer]);

  // Synchronize ref flags
  useEffect(() => {
    isListeningRef.current = isListening;
    isSpeakingRef.current = isSpeaking;
    isProcessingRef.current = isProcessing;
    isAssistantActiveRef.current = isListening || isSpeaking || isProcessing;
  }, [isListening, isSpeaking, isProcessing]);

  const showStatus = useCallback((text: string, type: 'idle' | 'listening' | 'processing' | 'speaking' | 'error' | 'success' = 'idle', autoHideMs = 4000) => {
    setStatusText(text);
    setStatusType(type);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    if (autoHideMs > 0) {
      statusTimerRef.current = setTimeout(() => {
        setStatusText(null);
        setStatusType('idle');
      }, autoHideMs);
    }
  }, []);

  // Clear inactivity timer
  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  // Stop everything immediately
  const stopAll = useCallback((options?: { silent?: boolean; goodbye?: boolean }) => {
    clearInactivityTimer();
    stopSpeech();
    setIsSpeaking(false);
    setIsListening(false);
    setIsProcessing(false);

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }

    const locStrings = getLocalizedAssistantStrings(currentLanguage);

    if (options?.goodbye) {
      const goodbyeMsg = t('malu_goodbye', locStrings.goodbye);
      showStatus(goodbyeMsg, 'speaking', 4000);
      speak(goodbyeMsg, {
        lang: currentLanguage,
        onEnded: () => {
          showStatus("Malu", 'idle', 2000);
        }
      });
    } else if (!options?.silent) {
      showStatus("Malu", 'idle', 2000);
    }
  }, [clearInactivityTimer, currentLanguage, showStatus, t]);

  // Execute navigation or actions safely
  const executeAppAction = useCallback((action: string, actionData?: any) => {
    if (action === 'NAVIGATE' && actionData?.tab) {
      if (onNavigate) {
        onNavigate(actionData.tab, actionData);
      } else {
        window.dispatchEvent(new CustomEvent('app:navigate', { detail: { tab: actionData.tab, ...actionData } }));
      }
      playSfx('success');
      vibrate(20);
    } else if (action === 'OPEN_MODAL') {
      if (actionData?.modal === 'language') {
        if (onOpenLanguage) onOpenLanguage();
        else window.dispatchEvent(new CustomEvent('app:openLanguageModal'));
      } else if (actionData?.modal === 'feedback') {
        if (onOpenFeedback) onOpenFeedback();
        else window.dispatchEvent(new CustomEvent('app:openFeedbackModal'));
      }
      playSfx('pop');
    } else if (action === 'CHANGE_LANGUAGE') {
      const targetLang = actionData?.language || actionData?.targetLanguage;
      if (targetLang) {
        setAppLanguage(targetLang, supabase, profile?.id);
        if (onUpdateProfile) {
          onUpdateProfile(prev => prev ? { ...prev, language: targetLang, preferred_language: targetLang } : prev);
        }
      }
      playSfx('success');
      vibrate(20);
    }
  }, [onNavigate, onOpenLanguage, onOpenFeedback, onUpdateProfile, profile?.id, setAppLanguage]);

  // Forward declaration of startListening
  const startListeningRef = useRef<() => void>(() => {});

  // Send user query to Malu (Gemini with zero-latency local shortcut fallback) and speak reply
  const handleUserQuery = useCallback(async (queryText: string) => {
    const cleanQuery = queryText.trim();
    console.log(`[NutriAI Query] Preparing to process user query: "${cleanQuery}"`);
    if (!cleanQuery || isProcessingRef.current) return;

    latestTranscriptRef.current = '';
    setTranscript('');
    clearInactivityTimer();
    stopSpeech();
    setIsSpeaking(false);
    setIsListening(false);
    setIsProcessing(true);

    const locStrings = getLocalizedAssistantStrings(currentLanguage);
    showStatus(t('malu_thinking', locStrings.thinking), 'processing', 0);

    // Add user query to conversation history
    const updatedHistory = [...conversationHistory, { role: 'user' as const, text: cleanQuery }];
    setConversationHistory(updatedHistory);

    try {
      // 1. Fast local classification check for instant, flawless app navigation (PT only or fallback)
      const isPt = currentLanguage.toLowerCase().startsWith('pt');
      const localMatch = isPt ? classifyLocalIntent(cleanQuery, profile) : null;

      let replyText = "";
      let actionToRun = "NONE";
      let actionDataToRun: any = undefined;

      if (localMatch) {
        console.log(`[NutriAI Query] Local intent matched:`, localMatch);
        replyText = localMatch.text;
        actionToRun = localMatch.action;
        actionDataToRun = localMatch.actionData;
      } else {
        console.log(`[NutriAI Query] Sending query to Gemini backend: "${cleanQuery}"`);
        // 2. Call Gemini Assistant backend with full app awareness, profile, and current language context
        const defaultProfile: UserProfile = profile || {
          name: 'Amigo(a)',
          age: 30,
          gender: 'Outro',
          weight: 70,
          height: 170,
          activityLevel: 'Moderado',
          goals: 'Alimentação saudável e energia',
          routine: 'Rotina ativa',
          restrictions: [],
          allergies: [],
          equipment: [],
          waterGoal: 2000,
          targetWeight: 68,
          points: 100,
          badges: []
        };

        const effectiveProfile = {
          ...defaultProfile,
          language: currentLanguage
        };

        const res = await chatWithAssistant(effectiveProfile, conversationHistory, cleanQuery);
        console.log(`[NutriAI Query] Received response from Gemini backend:`, res);
        replyText = res?.text || (isPt 
          ? "Estou aqui com você! Como posso te ajudar na sua alimentação hoje?" 
          : "I'm right here with you! How can I help you with your nutrition today?");
        actionToRun = res?.action || "NONE";
        actionDataToRun = res?.actionData;
      }

      // Execute action immediately in the app
      if (actionToRun && actionToRun !== 'NONE') {
        executeAppAction(actionToRun, actionDataToRun);
      }

      // Update history with model response
      setConversationHistory([...updatedHistory, { role: 'model', text: replyText }]);

      setIsProcessing(false);
      setIsSpeaking(true);
      showStatus(t('malu_speaking', locStrings.speaking), 'speaking', 0);

      // Play voice in the current active language
      await speak(replyText, {
        lang: currentLanguage,
        onEnded: () => {
          console.log('[NutriAI Query] Malu voice playback completed. Restarting listening...');
          setIsSpeaking(false);
          showStatus(t('malu_listening', locStrings.listening), 'listening', 0);
          startListeningRef.current();
        },
        onError: (err) => {
          console.warn('[NutriAI Query] Malu voice playback error:', err);
          setIsSpeaking(false);
          showStatus(t('malu_listening', locStrings.listening), 'listening', 0);
          startListeningRef.current();
        }
      });

    } catch (err: any) {
      console.warn("Malu voice processing error:", err);
      setIsProcessing(false);
      setIsSpeaking(false);
      showStatus(t('malu_try_again', locStrings.tryAgain), 'error', 3000);
      // Restart listening after brief pause
      setTimeout(() => {
        if (isAssistantActiveRef.current) {
          startListeningRef.current();
        }
      }, 1500);
    }
  }, [clearInactivityTimer, conversationHistory, currentLanguage, executeAppAction, profile, showStatus, t]);

  // Handler for inactivity timeout
  const handleInactivityTimeout = useCallback(() => {
    console.log('[NutriAI LiveAssistant] Inactivity timeout reached (8s silence)');
    if (isListeningRef.current) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsListening(false);
      const locStrings = getLocalizedAssistantStrings(currentLanguage);
      const goodbyeMsg = t('malu_goodbye', locStrings.goodbye);
      showStatus(goodbyeMsg, 'speaking', 3500);
      speak(goodbyeMsg, {
        lang: currentLanguage,
        onEnded: () => {
          showStatus('Malu', 'idle', 1500);
        }
      });
      playSfx('pop');
    }
  }, [currentLanguage, showStatus, t]);

  // Start or reset the inactivity timer
  const resetInactivityTimer = useCallback(() => {
    clearInactivityTimer();
    inactivityTimerRef.current = setTimeout(() => {
      handleInactivityTimeout();
    }, INACTIVITY_TIMEOUT_MS);
  }, [clearInactivityTimer, handleInactivityTimeout]);

  // Web Speech Recognition setup
  const initSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[NutriAI SpeechRecognition] Web Speech API SpeechRecognition is NOT supported in this browser environment');
      return null;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = currentLanguage;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      const locStrings = getLocalizedAssistantStrings(currentLanguage);

      recognition.onstart = () => {
        console.log(`[NutriAI SpeechRecognition] Listening started (language: ${currentLanguage})`);
        setIsListening(true);
        showStatus(t('malu_listening', locStrings.listening), 'listening', 0);
        latestTranscriptRef.current = '';
        setTranscript('');
        resetInactivityTimer();
      };

      recognition.onspeechstart = () => {
        console.log('[NutriAI SpeechRecognition] User voice detected in mic stream!');
      };

      recognition.onresult = (event: any) => {
        // If speaking, user spoke: interrupt speech and prioritize user input
        if (isSpeakingRef.current) {
          stopSpeech();
          setIsSpeaking(false);
        }

        resetInactivityTimer();
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        console.log(`[NutriAI SpeechRecognition] Result captured: "${currentTranscript}"`);
        latestTranscriptRef.current = currentTranscript;
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.warn(`[NutriAI SpeechRecognition] Recognition event notice: "${event?.error}"`, event);
        clearInactivityTimer();
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          showStatus(t('malu_mic_error', locStrings.micError), 'error', 4500);
        } else if (event.error === 'audio-capture') {
          showStatus(t('malu_no_mic', locStrings.noMic), 'error', 4500);
        } else if (event.error === 'no-speech') {
          console.log('[NutriAI SpeechRecognition] No speech detected in listening window');
        } else if (event.error !== 'aborted') {
          showStatus(t('malu_try_again', locStrings.tryAgain), 'error', 3000);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        console.log(`[NutriAI SpeechRecognition] Recognition session ended. Captured transcript: "${latestTranscriptRef.current}"`);
        clearInactivityTimer();
        setIsListening(false);

        const textToProcess = latestTranscriptRef.current.trim();
        if (textToProcess && !isProcessingRef.current) {
          console.log(`[NutriAI SpeechRecognition] Processing captured transcript on recognition end: "${textToProcess}"`);
          handleUserQuery(textToProcess);
        }
      };

      return recognition;
    } catch (e) {
      console.warn('[NutriAI SpeechRecognition] Init error:', e);
      return null;
    }
  }, [clearInactivityTimer, currentLanguage, handleUserQuery, resetInactivityTimer, showStatus, t]);

  // Start listening
  const startListening = useCallback(() => {
    console.log('[NutriAI LiveAssistant] startListening invoked');
    clearInactivityTimer();
    stopSpeech();
    setIsSpeaking(false);

    if (!recognitionRef.current) {
      recognitionRef.current = initSpeechRecognition();
    }

    const locStrings = getLocalizedAssistantStrings(currentLanguage);

    if (recognitionRef.current) {
      try {
        latestTranscriptRef.current = '';
        setTranscript('');
        recognitionRef.current.lang = currentLanguage;
        recognitionRef.current.start();
        playSfx('pop');
        vibrate(15);
        resetInactivityTimer();
      } catch (err: any) {
        console.warn('[NutriAI SpeechRecognition] Restarting recognition on error:', err?.message || err);
        recognitionRef.current = initSpeechRecognition();
        try {
          if (recognitionRef.current) {
            latestTranscriptRef.current = '';
            recognitionRef.current.lang = currentLanguage;
            recognitionRef.current.start();
          }
          resetInactivityTimer();
        } catch (e) {
          showStatus(t('malu_listening', locStrings.listening), 'listening', 2000);
        }
      }
    } else {
      console.warn('[NutriAI SpeechRecognition] Unable to initialize speech recognition');
      showStatus(t('malu_unsupported', locStrings.unsupported), 'error', 3500);
    }
  }, [clearInactivityTimer, currentLanguage, initSpeechRecognition, resetInactivityTimer, showStatus, t]);

  startListeningRef.current = startListening;

  // Greet user on first tap, speak greeting with Malu voice, then open mic
  const activateAssistantWithGreeting = useCallback(async () => {
    console.log('[NutriAI LiveAssistant] Activating Malu with greeting...');
    clearInactivityTimer();
    setIsProcessing(false);
    setIsListening(false);
    setIsSpeaking(true);

    const { spoken, display } = getTimeGreeting(profile, currentLanguage);
    const locStrings = getLocalizedAssistantStrings(currentLanguage);
    showStatus(display, 'speaking', 0);
    playSfx('crystal');
    vibrate([20, 40, 20]);

    await speak(spoken, {
      lang: currentLanguage,
      onEnded: () => {
        console.log('[NutriAI LiveAssistant] Greeting ended. Starting speech recognition...');
        setIsSpeaking(false);
        showStatus(t('malu_listening', locStrings.listening), 'listening', 0);
        startListening();
      },
      onError: (err) => {
        console.warn('[NutriAI LiveAssistant] Greeting speech error:', err);
        setIsSpeaking(false);
        showStatus(t('malu_listening', locStrings.listening), 'listening', 0);
        startListening();
      }
    });
  }, [clearInactivityTimer, currentLanguage, profile, showStatus, startListening, t]);

  // Toggle button click (1st touch: Activate with greeting, 2nd touch: Deactivate with goodbye)
  const handleToggleClick = async () => {
    console.log('[NutriAI LiveAssistant] Mic button toggled by user');
    unlockAudio();
    playSfx('tap');
    vibrate(20);

    const isCurrentlyActive = isListening || isSpeaking || isProcessing;

    if (isCurrentlyActive) {
      console.log('[NutriAI LiveAssistant] Deactivating Malu session...');
      // 2nd Tap: Deactivate Malu with warm farewell
      stopAll({ goodbye: true });
    } else {
      console.log('[NutriAI LiveAssistant] Requesting mic access on user click...');
      const micResult = await checkAndRequestMicPermission();
      if (!micResult.granted) {
        console.warn('[NutriAI LiveAssistant] Microphone access not granted or device not found');
        const locStrings = getLocalizedAssistantStrings(currentLanguage);
        if (micResult.isDeviceNotFound) {
          const noMicMsg = t('malu_no_mic', locStrings.noMic);
          showStatus(noMicMsg, 'error', 5000);
          speak(noMicMsg, { lang: currentLanguage });
        } else {
          showStatus(t('malu_mic_error', locStrings.micError), 'error', 5000);
        }
        return;
      }
      // 1st Tap: Activate Malu immediately with time-based greeting
      activateAssistantWithGreeting();
    }
  };

  // Keyboard navigation support
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggleClick();
    }
  };

  // Listen for custom app open event
  useEffect(() => {
    const handleOpen = async () => {
      const micResult = await checkAndRequestMicPermission();
      if (!micResult.granted) {
        console.warn('[NutriAI LiveAssistant] Microphone access not granted or device not found');
        const locStrings = getLocalizedAssistantStrings(currentLanguage);
        if (micResult.isDeviceNotFound) {
          const noMicMsg = t('malu_no_mic', locStrings.noMic);
          showStatus(noMicMsg, 'error', 5000);
          speak(noMicMsg, { lang: currentLanguage });
        } else {
          showStatus(t('malu_mic_error', locStrings.micError), 'error', 5000);
        }
        return;
      }
      activateAssistantWithGreeting();
    };
    window.addEventListener('app:openLiveAssistant', handleOpen);
    return () => {
      window.removeEventListener('app:openLiveAssistant', handleOpen);
      stopAll({ silent: true });
    };
  }, [activateAssistantWithGreeting, checkAndRequestMicPermission, currentLanguage, showStatus, stopAll, t]);

  // Process transcript automatically when user finishes speaking
  useEffect(() => {
    if (!isListening && transcript.trim() && !isProcessing) {
      const timer = setTimeout(() => {
        handleUserQuery(transcript);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isListening, transcript, isProcessing, handleUserQuery]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearInactivityTimer();
      stopSpeech();
    };
  }, [clearInactivityTimer]);

  const isActive = isListening || isSpeaking || isProcessing;

  return (
    <div 
      className="fixed bottom-5 left-5 z-50 flex items-center gap-3 select-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Central Voice Button with High-Fidelity Circular Neon Halo Ring */}
      <div className="relative group p-1 flex items-center justify-center">
        {/* Ambient Neon Glow behind the button */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
          className={`absolute inset-0 rounded-full blur-[6px] transition-all duration-500 pointer-events-none ${
            isListening
              ? 'bg-[conic-gradient(from_0deg,#00f2fe,#00ffcc,#10b981,#06b6d4,#00f2fe)] opacity-95 blur-[10px]'
              : isSpeaking
              ? 'bg-[conic-gradient(from_0deg,#00ffcc,#00ff66,#00ccff,#00ffcc)] opacity-90 blur-[8px]'
              : isProcessing
              ? 'bg-[conic-gradient(from_0deg,#06b6d4,#38bdf8,#00f2fe,#06b6d4)] opacity-90 blur-[8px]'
              : 'bg-[conic-gradient(from_0deg,#00f2fe,#4facfe,#00ff88,#00f2fe)] opacity-60 group-hover:opacity-90'
          }`}
        />

        {/* Outer Circular Neon Border Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
          className={`absolute inset-0 rounded-full p-[2px] transition-all duration-500 pointer-events-none ${
            isListening
              ? 'bg-[conic-gradient(from_0deg,#00f2fe,#00ffcc,#10b981,#06b6d4,#00f2fe)]'
              : isSpeaking
              ? 'bg-[conic-gradient(from_0deg,#00ffcc,#10b981,#06b6d4,#00ffcc)]'
              : isProcessing
              ? 'bg-[conic-gradient(from_0deg,#06b6d4,#38bdf8,#10b981,#06b6d4)]'
              : 'bg-[conic-gradient(from_0deg,#06b6d4,#10b981,#3b82f6,#06b6d4)]'
          }`}
        >
          <div className="w-full h-full rounded-full bg-transparent" />
        </motion.div>

        {/* Real-time Dynamic Voice Reactive Waves when listening */}
        {isListening && (
          <>
            {/* Outer dynamic voice shockwave */}
            <motion.div
              animate={{
                scale: 1.25 + audioVolume * 1.55,
                opacity: 0.15 + audioVolume * 0.75,
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 18,
              }}
              className="absolute inset-0 rounded-full pointer-events-none bg-gradient-to-tr from-cyan-500/30 via-teal-400/25 to-emerald-400/20 blur-[6px]"
            />

            {/* Middle dynamic voice harmonic wave */}
            <motion.div
              animate={{
                scale: 1.12 + audioVolume * 1.05,
                opacity: 0.3 + audioVolume * 0.65,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
              className="absolute inset-0 rounded-full pointer-events-none bg-gradient-to-tr from-emerald-400/35 via-cyan-400/30 to-teal-300/25 blur-[3px]"
            />

            {/* Inner dynamic voice core ring */}
            <motion.div
              animate={{
                scale: 1.04 + audioVolume * 0.6,
                opacity: 0.5 + audioVolume * 0.5,
              }}
              transition={{
                type: "spring",
                stiffness: 350,
                damping: 22,
              }}
              className="absolute inset-0 rounded-full pointer-events-none border border-cyan-300/60 bg-cyan-400/20 blur-[1px]"
            />

            {/* Radial Voice Equalizer Sound Bars on 4 Cardinal Axis */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, idx) => (
              <motion.div
                key={angle}
                style={{
                  transformOrigin: 'center center',
                  transform: `rotate(${angle}deg) translateY(-${30 + (idx % 2 === 0 ? 4 : 0)}px)`,
                }}
                animate={{
                  height: [6, Math.max(6, 6 + audioVolume * 22 * (idx % 2 === 0 ? 1.2 : 0.8)), 6],
                  opacity: Math.max(0.3, audioVolume * 1.4),
                  scaleY: 1 + audioVolume * 1.8,
                }}
                transition={{
                  duration: 0.12,
                  ease: "easeOut",
                }}
                className="absolute w-1 rounded-full bg-gradient-to-t from-emerald-400 to-cyan-300 pointer-events-none shadow-[0_0_8px_rgba(6,182,212,0.8)]"
              />
            ))}
          </>
        )}

        {/* Pulse Ripple Waves while speaking or processing */}
        {(isSpeaking || isProcessing) && (
          <motion.div
            animate={{
              scale: [1, 1.35, 1],
              opacity: [0.5, 0.15, 0.5]
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 rounded-full pointer-events-none bg-cyan-400/25 blur-[1px]"
          />
        )}

        {/* Main Floating Voice Button with Framer Motion Breathing & Real-Time Voice Volume Reaction */}
        <motion.button
          id="malu-voice-assistant-central-btn"
          role="button"
          tabIndex={0}
          aria-label={isActive ? "Desativar Malu" : "Ativar Malu"}
          aria-pressed={isActive}
          animate={
            isListening
              ? {
                  scale: 1 + audioVolume * 0.18,
                  boxShadow: `0 10px 30px -4px rgba(6, 182, 212, ${0.5 + audioVolume * 0.5}), 0 0 ${15 + audioVolume * 35}px rgba(16, 185, 129, ${0.4 + audioVolume * 0.6})`
                }
              : isSpeaking
              ? {
                  scale: [1, 1.04, 1],
                  boxShadow: [
                    "0 10px 25px -5px rgba(16, 185, 129, 0.5)",
                    "0 14px 30px -3px rgba(16, 185, 129, 0.7)",
                    "0 10px 25px -5px rgba(16, 185, 129, 0.5)"
                  ]
                }
              : {
                  scale: 1,
                  boxShadow: "0 20px 25px -5px rgba(15, 23, 42, 0.6)"
                }
          }
          transition={
            isListening
              ? {
                  type: "spring",
                  stiffness: 350,
                  damping: 24,
                }
              : isSpeaking
              ? {
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              : { duration: 0.3 }
          }
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={handleToggleClick}
          onKeyDown={handleKeyDown}
          disabled={isProcessing}
          className={`relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-colors duration-300 cursor-pointer outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 ${
            isListening
              ? 'bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-400 text-white ring-2 ring-cyan-300/80'
              : isSpeaking
              ? 'bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 text-white ring-2 ring-emerald-300/80'
              : isProcessing
              ? 'bg-gradient-to-tr from-teal-700 via-cyan-600 to-blue-600 text-white'
              : 'bg-gradient-to-tr from-slate-950 via-teal-950 to-slate-900 text-teal-300 border border-teal-500/40 hover:text-white hover:border-teal-300'
          }`}
          title={
            isActive
              ? "Toque para desativar a Malu"
              : "Toque para falar com a Malu (Assistente de Voz)"
          }
        >
          {isProcessing ? (
            <Loader2 className="w-6 h-6 sm:w-7 sm:h-7 animate-spin text-white" />
          ) : isSpeaking ? (
            <Waves className="w-6 h-6 sm:w-7 sm:h-7 text-white animate-pulse" />
          ) : isListening ? (
            <motion.div
              animate={{
                scale: 1 + audioVolume * 0.25,
                filter: `drop-shadow(0 0 ${4 + audioVolume * 12}px rgba(255,255,255,0.95))`
              }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 20
              }}
            >
              <Mic className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </motion.div>
          ) : (
            <Mic className="w-6 h-6 sm:w-7 sm:h-7" />
          )}
        </motion.button>
      </div>

      {/* Floating Status Pill / Feedback Bubble */}
      <AnimatePresence>
        {statusText && (
          <motion.div
            initial={{ opacity: 0, x: -10, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`max-w-xs sm:max-w-sm px-3.5 py-2 rounded-2xl text-xs font-medium shadow-xl border backdrop-blur-md flex items-center gap-2 ${
              statusType === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                : statusType === 'speaking'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                : statusType === 'processing'
                ? 'bg-cyan-950/90 border-cyan-500/50 text-cyan-200'
                : statusType === 'listening'
                ? 'bg-teal-950/90 border-teal-500/50 text-teal-200'
                : 'bg-slate-900/90 border-slate-700/60 text-slate-200'
            }`}
          >
            {statusType === 'error' && (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            {statusType === 'processing' && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400 shrink-0" />
            )}
            {statusType === 'speaking' && (
              <Volume2 className="w-3.5 h-3.5 animate-pulse text-emerald-400 shrink-0" />
            )}
            {statusType === 'listening' && (
              <Mic className="w-3.5 h-3.5 animate-pulse text-teal-400 shrink-0" />
            )}
            <span className="truncate">{statusText}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
