import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

// Comprehensive runtime translation mapping for elements not covered by direct translation keys
const RUNTIME_DICTIONARY: Record<string, Record<string, string>> = {
  // Navigation & Headers
  "deixe seu feedback": {
    "en": "Leave your feedback",
    "es": "Deje sus comentarios",
    "fr": "Laissez vos commentaires",
    "it": "Lascia un feedback",
    "de": "Hinterlassen Sie Ihr Feedback",
    "ja": "フィードバックを残す",
    "ko": "피드백을 남겨주세요",
    "zh": "留下您的反馈",
    "ar": "اترك ملاحظاتك"
  },
  "feedback": {
    "en": "Feedback",
    "es": "Comentarios",
    "fr": "Commentaires",
    "it": "Feedback",
    "de": "Feedback",
    "ja": "フィードバック",
    "ko": "피드백",
    "zh": "反馈",
    "ar": "ملاحظات"
  },
  "mudar idioma / change language": {
    "en": "Change Language",
    "es": "Cambiar idioma",
    "fr": "Changer de langue",
    "it": "Cambia lingua",
    "de": "Sprache ändern",
    "ja": "言語を変更",
    "ko": "언어 변경",
    "zh": "更改语言",
    "ar": "تغيير اللغة"
  },
  "mudar para modo claro": {
    "en": "Switch to light mode",
    "es": "Cambiar a modo claro",
    "fr": "Passer au mode clair",
    "it": "Passa alla modalità chiara",
    "de": "In den hellen Modus wechseln",
    "ja": "ライトモードに切り替え",
    "ko": "라이트 모드로 전환",
    "zh": "切换到浅色模式",
    "ar": "التبديل إلى الوضع الفاتح"
  },
  "mudar para modo escuro": {
    "en": "Switch to dark mode",
    "es": "Cambiar a modo oscuro",
    "fr": "Passer au mode sombre",
    "it": "Passa alla modalità scura",
    "de": "In den dunklen Modus wechseln",
    "ja": "ダークモードに切り替え",
    "ko": "다크 모드로 전환",
    "zh": "切换到深色模式",
    "ar": "التبديل إلى الوضع الداكن"
  },

  // Auth, Login, Registration
  "entrar com google": {
    "en": "Sign in with Google",
    "es": "Iniciar sesión con Google",
    "fr": "Se connecter com Google",
    "it": "Accedi con Google",
    "de": "Mit Google anmelden",
    "ja": "Googleでログイン",
    "ko": "Google로 로그인",
    "zh": "使用 Google 登录",
    "ar": "تسجيل الدخول باستخدام Google"
  },
  "por favor, informe seu e-mail.": {
    "en": "Please enter your email.",
    "es": "Por favor, introduzca su correo electrónico.",
    "fr": "S'il vous plaît, entrez votre e-mail.",
    "it": "Per favore, inserisci la tua email.",
    "de": "Bitte geben Sie Ihre E-Mail-Adresse ein.",
    "ja": "メールアドレスを入力してください。",
    "ko": "이메일을 입력해 주세요.",
    "zh": "请输入您的电子邮件。",
    "ar": "يرجى إدخال البريد الإلكتروني."
  },
  "por favor, insira um e-mail válido.": {
    "en": "Please enter a valid email.",
    "es": "Por favor, introduzca un correo válido.",
    "fr": "S'il vous plaît, entrez un e-mail valide.",
    "it": "Per favore, inserisci un'email valida.",
    "de": "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
    "ja": "有効なメールアドレスを入力してください。",
    "ko": "올바른 이메일을 입력해 주세요.",
    "zh": "请输入有效的电子邮件。",
    "ar": "يرجى إدخال بريد إلكتروني صالح."
  },
  "por favor, informe sua senha.": {
    "en": "Please enter your password.",
    "es": "Por favor, introduzca su contraseña.",
    "fr": "S'il vous plaît, entrez votre mot de passe.",
    "it": "Per favore, inserisci la tua password.",
    "de": "Bitte geben Sie Ihr Passwort ein.",
    "ja": "パスワードを入力してください。",
    "ko": "비밀번호를 입력해 주세요.",
    "zh": "请输入您的密码。",
    "ar": "يرجى إدخال كلمة المرور."
  },
  "a senha deve ter pelo menos 8 caracteres para maior segurança.": {
    "en": "Password must be at least 8 characters for security.",
    "es": "La contraseña debe tener al menos 8 caracteres.",
    "fr": "Le mot de passe doit comporter au moins 8 caractères.",
    "it": "La password deve contenere almeno 8 caratteri.",
    "de": "Das Passwort muss aus Sicherheitsgründen mindestens 8 Zeichen lang sein.",
    "ja": "セキュリティのため、パスワードは8文字以上にする必要があります。",
    "ko": "비밀번호는 보안을 위해 최소 8자 이상이어야 합니다.",
    "zh": "为了安全起见，密码必须至少为8个字符。",
    "ar": "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل للأمان."
  },
  "esqueceu sua senha?": {
    "en": "Forgot password?",
    "es": "¿Olvidó su contraseña?",
    "fr": "Mot de passe oublié?",
    "it": "Password dimenticata?",
    "de": "Passwort vergessen?",
    "ja": "パスワードをお忘れですか？",
    "ko": "비밀번호를 잊으셨나요?",
    "zh": "忘记密码？",
    "ar": "هل نسيت كلمة المرور؟"
  },
  "não tem uma conta? cadastre-se": {
    "en": "Don't have an account? Sign up",
    "es": "¿No tiene cuenta? Regístrese",
    "fr": "Vous n'avez pas de compte? S'inscrire",
    "it": "Non hai un account? Registrati",
    "de": "Haben Sie kein Konto? Registrieren Sie sich",
    "ja": "アカウントをお持ちでないですか？ 新規登録",
    "ko": "계정이 없으신가요? 회원가입",
    "zh": "没有账户？注册",
    "ar": "ليس لديك حساب؟ سجل الآن"
  },
  "já tem uma conta? entre": {
    "en": "Already have an account? Sign in",
    "es": "¿Ya tiene una cuenta? Inicie sesión",
    "fr": "Vous avez déjà un compte? Se connecter",
    "it": "Hai già un account? Accedi",
    "de": "Haben Sie bereits ein Konto? Anmelden",
    "ja": "既にアカウントをお持ちですか？ ログイン",
    "ko": "이미 계정이 있으신가요? 로그인",
    "zh": "已有账户？登录",
    "ar": "هل لديك حساب بالفعل؟ سجل الدخول"
  },
  "enviar link de recuperação": {
    "en": "Send recovery link",
    "es": "Enviar enlace de recuperación",
    "fr": "Envoyer le lien de récupération",
    "it": "Invia link di recupero",
    "de": "Wiederherstellungslink senden",
    "ja": "再設定リンクを送信",
    "ko": "복구 링크 전송",
    "zh": "发送重置链接",
    "ar": "إرسال رابط الاستعادة"
  },
  "voltar para o login": {
    "en": "Back to login",
    "es": "Volver al login",
    "fr": "Retour à la connexion",
    "it": "Torna al login",
    "de": "Zurück zum Login",
    "ja": "ログインに戻る",
    "ko": "로그인으로 돌아가기",
    "zh": "返回登录",
    "ar": "العودة إلى تسجيل الدخول"
  },

  // Fridge Inteligente
  "geladeira de frutas e laticínios": {
    "en": "Fruits and Dairy Fridge",
    "es": "Nevera de Frutas y Lácteos",
    "fr": "Réfrigérateur Fruits & Laitages",
    "it": "Frigorifero Frutta e Latticini",
    "de": "Obst- und Milchprodukte-Kühlschrank",
    "ja": "果物と乳製品の冷蔵庫",
    "ko": "과일 및 유제품 냉장고",
    "zh": "水果与乳制品冰箱",
    "ar": "ثلاجة الفواكه ومنتجات الألبان"
  },
  "despensa e vegetais fitness": {
    "en": "Pantry and Fitness Vegetables",
    "es": "Despensa y Vegetales Fitness",
    "fr": "Garde-manger & Légumes Fitness",
    "it": "Dispensa e Verdure Fitness",
    "de": "Vorratskammer & Fitness-Gemüse",
    "ja": "パントリーとフィットネス野菜",
    "ko": "팬트리 및 피트니스 채소",
    "zh": "健身餐配料与蔬菜",
    "ar": "خزانة وخضروات اللياقة البدنية"
  },
  "iogurtes, leite vegetal, morangos frescos, brócolis, queijo branco e ovos.": {
    "en": "Yogurt, plant milk, fresh strawberries, broccoli, white cheese and eggs.",
    "es": "Yogures, leche vegetal, fresas frescas, brócoli, queso blanco y huevos.",
    "fr": "Yaourts, lait végétal, fraises fraîches, brocolis, fromage blanc et œufs.",
    "it": "Yogurt, latte vegetale, fragole fresche, broccoli, formaggio bianco e uova.",
    "de": "Joghurt, Pflanzenmilch, frische Erdbeeren, Brokkoli, Weichkäse und Eier.",
    "ja": "ヨーグルト、植物性ミルク、新鮮なイチゴ、ブロッコリー、ホワイトチーズ、卵。",
    "ko": "요거트, 식물성 우유, 신선한 딸기, 브로콜리, 백치즈, 달걀.",
    "zh": "酸奶、植物奶、新鲜草莓、西兰花、白干酪和鸡蛋。",
    "ar": "الزبادي، الحليب النباتي، الفراولة الطازجة، البروكلي، الجبن الأبيض والبيض."
  },
  "tomate, espinafre fresco, cenouras, peito de frango, limões e abacate.": {
    "en": "Tomatoes, fresh spinach, carrots, chicken breast, lemons and avocado.",
    "es": "Tomate, espinaca fresca, zanahorias, pechuga de pollo, limones y aguacate.",
    "fr": "Tomates, épinards frais, carottes, blanc de poulet, citrons et avocat.",
    "it": "Pomodori, spinaci freschi, carote, petto di pollo, limoni e avocado.",
    "de": "Tomaten, frischer Spinat, Karotten, Hähnchenbrust, Zitronen und Avocado.",
    "ja": "トマト、新鮮なほうれん草、人参、鶏胸肉、レモン、アボカド。",
    "ko": "토마토, 신선한 시금치, 당근, 닭가슴살, 레몬, 아보카도.",
    "zh": "西红柿、新鲜菠菜、胡萝卜、鸡胸肉、柠檬和牛油果。",
    "ar": "الطماطم، السبانخ الطازجة، الجزر، صدر الدجاج، الليمون والأفوكادو."
  },
  "todas": { "en": "All", "es": "Todas", "fr": "Toutes", "it": "Tutte", "de": "Alle", "ja": "すべて", "ko": "전체", "zh": "全部", "ar": "الكل" },
  "todos": { "en": "All", "es": "Todos", "fr": "Tous", "it": "Tutti", "de": "Alle", "ja": "すべて", "ko": "전체", "zh": "全部", "ar": "الكل" },
  "vegetais": { "en": "Vegetables", "es": "Vegetales", "fr": "Légumes", "it": "Verdure", "de": "Gemüse", "ja": "野菜", "ko": "채소", "zh": "蔬菜", "ar": "خضروات" },
  "proteínas": { "en": "Proteins", "es": "Proteínas", "fr": "Protéines", "it": "Proteine", "de": "Proteine", "ja": "タンパク質", "ko": "단백질", "zh": "蛋白质", "ar": "بروتينات" },
  "laticínios": { "en": "Dairy", "es": "Lácteos", "fr": "Laitages", "it": "Latticini", "de": "Milchprodukte", "ja": "乳製品", "ko": "유제품", "zh": "乳制品", "ar": "منتجات الألبان" },
  "bebidas": { "en": "Drinks", "es": "Bebidas", "fr": "Boissons", "it": "Bevande", "de": "Getränke", "ja": "飲み物", "ko": "음료", "zh": "饮料", "ar": "مشروبات" },
  "condimentos": { "en": "Condiments", "es": "Condimentos", "fr": "Condiments", "it": "Condimenti", "de": "Gewürze", "ja": "調味料", "ko": "조미료", "zh": "调味品", "ar": "توابل" },
  "outros": { "en": "Others", "es": "Otros", "fr": "Autres", "it": "Altri", "de": "Andere", "ja": "その他", "ko": "기타", "zh": "其他", "ar": "أخرى" },
  "fresco": { "en": "Fresh", "es": "Fresco", "fr": "Frais", "it": "Fresco", "de": "Frisch", "ja": "新鮮", "ko": "신선함", "zh": "新鲜", "ar": "طازج" },
  "perto_vencimento": { "en": "Expiring Soon", "es": "Pronto a vencer", "fr": "Expire bientôt", "it": "In scadenza", "de": "Bald ablaufend", "ja": "まもなく賞味期限", "ko": "만료 임박", "zh": "即将过期", "ar": "قريب الانتهاء" },
  "vencido": { "en": "Expired", "es": "Vencido", "fr": "Expiré", "it": "Scaduto", "de": "Abgelaufen", "ja": "賞味期限切れ", "ko": "만료됨", "zh": "已过期", "ar": "منتهي الصلاحية" },

  // Banners, Market & Cards
  "cesta fresh da semana": {
    "en": "Fresh Basket of the Week",
    "es": "Cesta Fresh de la Semana",
    "fr": "Panier Frais de la Semaine",
    "it": "Cesto Fresco della Settimana",
    "de": "Frische Korb der Woche",
    "ja": "今週のフレッシュバスケット",
    "ko": "금주의 신선 바구니",
    "zh": "本周新鲜果篮",
    "ar": "سلة طازجة للأسبوع"
  },
  "direto do produtor": {
    "en": "Direct from the producer",
    "es": "Directo del productor",
    "fr": "Directement du producteur",
    "it": "Diretto dal produttore",
    "de": "Direkt vom Erzeuger",
    "ja": "生産者から直接",
    "ko": "산지 직송",
    "zh": "农场直供",
    "ar": "مباشرة من المنتج"
  },
  "essas frutas estão fresquinhas hoje 💚": {
    "en": "These fruits are extremely fresh today 💚",
    "es": "Estas frutas están súper frescas hoy 💚",
    "fr": "Ces fruits sont très frais aujourd'hui 💚",
    "it": "Questi frutti sono freschissimi oggi 💚",
    "de": "Diese Früchte sind heute super frisch 💚",
    "ja": "これらの果物は今日とても新鮮です 💚",
    "ko": "이 과일들은 오늘 아주 신선합니다 💚",
    "zh": "这些水果今天非常新鲜 💚",
    "ar": "هذه الفواكه طازجة جداً اليوم 💚"
  },
  "orgânicos certificados": {
    "en": "Certified Organics",
    "es": "Orgánicos Certificados",
    "fr": "Organiques Certifiés",
    "it": "Biologico Certificato",
    "de": "Zertifizierte Bio-Produkte",
    "ja": "認証オーガニック",
    "ko": "유기농 인증 제품",
    "zh": "认证有机食品",
    "ar": "منتجات عضوية معتمدة"
  },
  "saúde sem agrotóxicos": {
    "en": "Pesticide-free health",
    "es": "Salud sin pesticidas",
    "fr": "Santé sans pesticides",
    "it": "Salute senza pesticidi",
    "de": "Gesundheit ohne Pestizide",
    "ja": "無農薬の健康",
    "ko": "농약 없는 건강함",
    "zh": "无农药健康",
    "ar": "صحة خالية من المبيدات"
  },
  "quer que eu monte uma cesta saudável pra sua semana?": {
    "en": "Would you like me to build a healthy basket for your week?",
    "es": "¿Quiere que arme una cesta saludable para su semana?",
    "fr": "Voulez-vous que je compose un panier sain pour votre semaine?",
    "it": "Vuoi che prepari un cesto salutare per la tua settimana?",
    "de": "Soll ich einen gesunden Korb für Ihre Woche zusammenstellen?",
    "ja": "今週の健康的なバスケットを作成しましょうか？",
    "ko": "금주를 위한 건강 바구니를 구성해 드릴까요?",
    "zh": "需要我为您定制本周的健康食品篮吗？",
    "ar": "هل تريد مني تحضير سلة صحية لأسبوعك؟"
  },
  "frutas tropicais selecionadas": {
    "en": "Selected Tropical Fruits",
    "es": "Frutas Tropicales Seleccionadas",
    "fr": "Fruits Tropicaux Sélectionnés",
    "it": "Frutta Tropicale Selezionata",
    "de": "Ausgewählte tropische Früchte",
    "ja": "厳選されたトロピカルフルーツ",
    "ko": "선별된 열대 과일",
    "zh": "精选热带水果",
    "ar": "فواكه استوائية مختارة"
  },
  "doces e suculentas": {
    "en": "Sweet and juicy",
    "es": "Dulces y jugosas",
    "fr": "Douces et juteuses",
    "it": "Dolci e succosi",
    "de": "Süß und saftig",
    "ja": "甘くてジューシー",
    "ko": "달콤하고 과즙이 풍부함",
    "zh": "香甜多汁",
    "ar": "حلوة وعصارية"
  },
  "ricas em vitaminas e minerais essenciais.": {
    "en": "Rich in essential vitamins and minerals.",
    "es": "Ricas en vitaminas y minerales esenciales.",
    "fr": "Riches en vitamines et minéraux essentiels.",
    "it": "Ricchi di vitamine e minerali essenziali.",
    "de": "Reich an essenziellen Vitaminen und Mineralstoffen.",
    "ja": "必須ビタミンとミネラルが豊富です。",
    "ko": "필수 비타민과 미네랄이 풍부합니다.",
    "zh": "富含必需维生素和矿物质。",
    "ar": "غنية بالفيتامينات والمعادن الأساسية."
  },
  "saladas prontas para o consumo": {
    "en": "Ready-to-eat Salads",
    "es": "Ensaladas Listas para Consumir",
    "fr": "Salades Prêtes à Consommer",
    "it": "Insalate Pronte al Consumo",
    "de": "Verzehrfertige Salate",
    "ja": "すぐに食べられるサラダ",
    "ko": "바로 섭취 가능한 샐러드",
    "zh": "即食沙拉",
    "ar": "سلطات جاهزة للأكل"
  },
  "higienizadas e frescas": {
    "en": "Sanitized and fresh",
    "es": "Higienizadas y frescas",
    "fr": "Lavées et fraîches",
    "it": "Igienizzate e fresche",
    "de": "Gereinigt und frisch",
    "ja": "衛生的で新鮮",
    "ko": "세척 및 신선함",
    "zh": "已清洗且新鲜",
    "ar": "معقمة وطازجة"
  },
  "praticidade e saúde no seu dia a dia.": {
    "en": "Convenience and health in your daily life.",
    "es": "Comodidad y salud en su día a día.",
    "fr": "Praticité et santé au quotidien.",
    "it": "Praticità e salute nel tuo quotidiano.",
    "de": "Praktisch und gesund im Alltag.",
    "ja": "日々の生活に便利さと健康を。",
    "ko": "일상에 편리함과 건강을 더하세요.",
    "zh": "日常生活中的便利与健康。",
    "ar": "العملية والصحة في حياتك اليومية."
  },

  // Premium / Pricing Modal
  "economia real": {
    "en": "Real Savings",
    "es": "Ahorro Real",
    "fr": "Économies Réelles",
    "it": "Risparmio Reale",
    "de": "Echte Ersparnisse",
    "ja": "本物の節約",
    "ko": "실제 비용 절감",
    "zh": "真实节省",
    "ar": "توفير حقيقي"
  },
  "cancelar quando quiser": {
    "en": "Cancel anytime",
    "es": "Cancele cuando desee",
    "fr": "Annuler quand vous voulez",
    "it": "Annulla quando vuoi",
    "de": "Jederzeit kündbar",
    "ja": "いつでもキャンセル可能",
    "ko": "언제든지 취소 가능",
    "zh": "随时可以取消",
    "ar": "إلغاء في أي وقت"
  },
  "teste grátis": {
    "en": "Free Trial",
    "es": "Prueba Gratis",
    "fr": "Essai Gratuit",
    "it": "Prova Gratuita",
    "de": "Kostenlose Testversion",
    "ja": "無料トライアル",
    "ko": "무료 체험",
    "zh": "免费试用",
    "ar": "تجربة مجانية"
  },
  "plano pro": {
    "en": "PRO Plan",
    "es": "Plan PRO",
    "fr": "Plan PRO",
    "it": "Piano PRO",
    "de": "PRO-Plan",
    "ja": "PROプラン",
    "ko": "PRO 요금제",
    "zh": "PRO 计划",
    "ar": "خطة برو"
  },
  "plano premium": {
    "en": "Premium Plan",
    "es": "Plan Premium",
    "fr": "Plan Premium",
    "it": "Piano Premium",
    "de": "Premium-Plan",
    "ja": "プレミアムプラン",
    "ko": "프리미엄 요금제",
    "zh": "高级计划",
    "ar": "الخطة المميزة"
  }
};

export function AutoTranslator() {
  const { i18n, t } = useTranslation();

  // Load standard translation dictionary from common.json files inside i18n bundles
  const translationMap = useMemo(() => {
    const currentLang = i18n.language || 'pt-BR';
    const cleanLang = currentLang.split('-')[0];
    
    // Retrieve Portuguese bundle as the source keys
    const ptBundle = i18n.getResourceBundle('pt-BR', 'common') || {};
    
    // Retrieve active bundle
    const activeBundle = i18n.getResourceBundle(currentLang, 'common') || 
                         i18n.getResourceBundle(cleanLang, 'common') || 
                         i18n.getResourceBundle('en', 'common') || {};

    const map = new Map<string, string>();

    // 1. Map standard i18n keys
    for (const key of Object.keys(ptBundle)) {
      const ptText = ptBundle[key];
      const activeText = activeBundle[key];
      if (ptText && activeText && ptText !== activeText) {
        map.set(ptText.toLowerCase().trim(), activeText);
      }
    }

    // 2. Overlay runtime custom dictionary overrides
    for (const rawPtKey of Object.keys(RUNTIME_DICTIONARY)) {
      const translations = RUNTIME_DICTIONARY[rawPtKey];
      const activeText = translations[cleanLang] || translations[currentLang] || translations['en'];
      if (activeText) {
        map.set(rawPtKey.toLowerCase().trim(), activeText);
      }
    }

    return map;
  }, [i18n.language]);

  useEffect(() => {
    const currentLang = i18n.language || 'pt-BR';
    
    // Sync document language and text direction (RTL support for Arabic)
    if (currentLang.startsWith('ar')) {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
      document.body.classList.add('rtl-layout');
      document.body.classList.remove('ltr-layout');
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = currentLang;
      document.body.classList.add('ltr-layout');
      document.body.classList.remove('rtl-layout');
    }

    // If active language is Portuguese, do not trigger heavy translation scans
    if (currentLang.startsWith('pt')) return;

    // Helper to translate single string safely
    const translateString = (str: string): string => {
      const clean = str.trim();
      if (!clean) return str;

      const lower = clean.toLowerCase();
      
      // Match exact phrases
      if (translationMap.has(lower)) {
        const match = translationMap.get(lower)!;
        // Keep original trailing spacing if any
        const prefix = str.startsWith(' ') ? ' ' : '';
        const suffix = str.endsWith(' ') ? ' ' : '';
        return prefix + match + suffix;
      }

      // If no exact match, return original
      return str;
    };

    // Recursive function to scan and translate DOM nodes
    const walkAndTranslate = (node: Node) => {
      // Skip script, style and non-visual elements
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tagName = el.tagName.toLowerCase();
        if (['script', 'style', 'iframe', 'canvas', 'noscript'].includes(tagName)) {
          return;
        }

        // Translate inputs and placeholder attributes
        const placeholder = el.getAttribute('placeholder');
        if (placeholder) {
          const trans = translateString(placeholder);
          if (trans !== placeholder) el.setAttribute('placeholder', trans);
        }

        const title = el.getAttribute('title');
        if (title) {
          const trans = translateString(title);
          if (trans !== title) el.setAttribute('title', trans);
        }

        // Translate alt texts on images
        const alt = el.getAttribute('alt');
        if (alt) {
          const trans = translateString(alt);
          if (trans !== alt) el.setAttribute('alt', trans);
        }
      }

      // Translate text nodes
      if (node.nodeType === Node.TEXT_NODE) {
        const val = node.nodeValue;
        if (val && val.trim().length > 0) {
          const translated = translateString(val);
          if (translated !== val) {
            node.nodeValue = translated;
          }
        }
      }

      // Process children
      let child = node.firstChild;
      while (child) {
        walkAndTranslate(child);
        child = child.nextSibling;
      }
    };

    // Translate the initial layout
    walkAndTranslate(document.body);

    // Create a MutationObserver to catch dynamic content additions (e.g. modals, notifications, AI chat bubbles)
    const observer = new MutationObserver((mutations) => {
      // Disconnect observer temporarily to prevent feedback loops while translating newly added texts
      observer.disconnect();

      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            walkAndTranslate(node);
          });
        } else if (mutation.type === 'characterData') {
          // Check text data mutation
          const val = mutation.target.nodeValue;
          if (val && val.trim().length > 0) {
            const translated = translateString(val);
            if (translated !== val) {
              mutation.target.nodeValue = translated;
            }
          }
        } else if (mutation.type === 'attributes') {
          const el = mutation.target as HTMLElement;
          const attr = mutation.attributeName;
          if (attr === 'placeholder' || attr === 'title' || attr === 'alt') {
            const val = el.getAttribute(attr);
            if (val) {
              const trans = translateString(val);
              if (trans !== val) el.setAttribute(attr, trans);
            }
          }
        }
      }

      // Reconnect observer
      connectObserver();
    });

    const connectObserver = () => {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['placeholder', 'title', 'alt']
      });
    };

    connectObserver();

    return () => {
      observer.disconnect();
    };
  }, [translationMap, i18n.language]);

  return null; // Invisible global manager
}
