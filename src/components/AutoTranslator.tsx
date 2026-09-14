import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { localesMap } from '../i18n/locales';

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
    "ar": "اترك ملاحظاتك",
    "ru": "Оставить отзыв",
    "tr": "Geri bildirim bırakın",
    "hi": "अपनी प्रतिक्रिया दें"
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
    "ar": "ملاحظات",
    "ru": "Отзыв",
    "tr": "Geri bildirim",
    "hi": "प्रतिक्रिया"
  },
  "mudar idioma": {
    "en": "Change Language",
    "es": "Cambiar idioma",
    "fr": "Changer de langue",
    "it": "Cambia lingua",
    "de": "Sprache ändern",
    "ja": "言語を変更",
    "ko": "언어 변경",
    "zh": "更改语言",
    "ar": "تغيير اللغة",
    "ru": "Изменить язык",
    "tr": "Dili değiştir",
    "hi": "भाषा बदलें"
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
    "ar": "تغيير اللغة",
    "ru": "Изменить язык",
    "tr": "Dili değiştir",
    "hi": "भाषा बदलें"
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
    "ar": "التبديل إلى الوضع الفاتح",
    "ru": "Переключить на светлую тему",
    "tr": "Açık moda geç",
    "hi": "लाइट मोड पर स्विच करें"
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
    "ar": "التبديل إلى الوضع الداكن",
    "ru": "Переключить на темную тему",
    "tr": "Karanlık moda geç",
    "hi": "डार्क मोड पर स्विच करें"
  },
  "ativar modo de leitura": {
    "en": "Enable reading mode",
    "es": "Activar modo de lectura",
    "fr": "Activer le mode lecture",
    "it": "Attiva modalità lettura",
    "de": "Lesemodus aktivieren",
    "ja": "閲覧モードを有効化",
    "ko": "읽기 모드 활성화",
    "zh": "启用阅读模式",
    "ar": "تفعيل وضع القراءة",
    "ru": "Включить режим чтения",
    "tr": "Okuma modunu etkinleştir",
    "hi": "रीडिंग मोड सक्षम करें"
  },
  "desativar modo de leitura": {
    "en": "Disable reading mode",
    "es": "Desactivar modo de lectura",
    "fr": "Désactiver le mode lecture",
    "it": "Disattiva modalità lettura",
    "de": "Lesemodus deaktivieren",
    "ja": "閲覧モードを無効化",
    "ko": "읽기 모드 비활성화",
    "zh": "禁用阅读模式",
    "ar": "تعطيل وضع القراءة",
    "ru": "Отключить режим чтения",
    "tr": "Okuma modunu devre dışı bırak",
    "hi": "रीडिंग मोड अक्षम करें"
  },

  // Common UI Actions & Verbs
  "salvar": {
    "en": "Save",
    "es": "Guardar",
    "fr": "Enregistrer",
    "it": "Salva",
    "de": "Speichern",
    "ja": "保存",
    "ko": "저장",
    "zh": "保存",
    "ar": "حفظ",
    "ru": "Сохранить",
    "tr": "Kaydet",
    "hi": "सहेजें"
  },
  "cancelar": {
    "en": "Cancel",
    "es": "Cancelar",
    "fr": "Annuler",
    "it": "Annulla",
    "de": "Abbrechen",
    "ja": "キャンセル",
    "ko": "취소",
    "zh": "取消",
    "ar": "إلغاء",
    "ru": "Отмена",
    "tr": "İptal",
    "hi": "रद्द करें"
  },
  "voltar": {
    "en": "Back",
    "es": "Volver",
    "fr": "Retour",
    "it": "Indietro",
    "de": "Zurück",
    "ja": "戻る",
    "ko": "뒤로",
    "zh": "返回",
    "ar": "رجوع",
    "ru": "Назад",
    "tr": "Geri",
    "hi": "वापस"
  },
  "próximo": {
    "en": "Next",
    "es": "Siguiente",
    "fr": "Suivant",
    "it": "Avanti",
    "de": "Weiter",
    "ja": "次へ",
    "ko": "다음",
    "zh": "下一步",
    "ar": "التالي",
    "ru": "Далее",
    "tr": "İleri",
    "hi": "अगला"
  },
  "continuar": {
    "en": "Continue",
    "es": "Continuar",
    "fr": "Continuer",
    "it": "Continua",
    "de": "Weiter",
    "ja": "続ける",
    "ko": "계속",
    "zh": "继续",
    "ar": "متابعة",
    "ru": "Продолжить",
    "tr": "Devam et",
    "hi": "जारी रखें"
  },
  "fechar": {
    "en": "Close",
    "es": "Cerrar",
    "fr": "Fermer",
    "it": "Chiudi",
    "de": "Schließen",
    "ja": "閉じる",
    "ko": "닫기",
    "zh": "关闭",
    "ar": "إغلاق",
    "ru": "Закрыть",
    "tr": "Kapat",
    "hi": "बंद करें"
  },
  "confirmar": {
    "en": "Confirm",
    "es": "Confirmar",
    "fr": "Confirmer",
    "it": "Conferma",
    "de": "Bestätigen",
    "ja": "確認",
    "ko": "확인",
    "zh": "确认",
    "ar": "تأكيد",
    "ru": "Подтвердить",
    "tr": "Onayla",
    "hi": "पुष्टि करें"
  },
  "excluir": {
    "en": "Delete",
    "es": "Eliminar",
    "fr": "Supprimer",
    "it": "Elimina",
    "de": "Löschen",
    "ja": "削除",
    "ko": "삭제",
    "zh": "删除",
    "ar": "حذف",
    "ru": "Удалить",
    "tr": "Sil",
    "hi": "हटाएं"
  },
  "remover": {
    "en": "Remove",
    "es": "Eliminar",
    "fr": "Supprimer",
    "it": "Rimuovi",
    "de": "Entfernen",
    "ja": "削除",
    "ko": "제거",
    "zh": "移除",
    "ar": "إزالة",
    "ru": "Удалить",
    "tr": "Kaldır",
    "hi": "हटाएं"
  },
  "editar": {
    "en": "Edit",
    "es": "Editar",
    "fr": "Modifier",
    "it": "Modifica",
    "de": "Bearbeiten",
    "ja": "編集",
    "ko": "수정",
    "zh": "编辑",
    "ar": "تعديل",
    "ru": "Редактировать",
    "tr": "Düzenle",
    "hi": "संपादित करें"
  },
  "adicionar": {
    "en": "Add",
    "es": "Añadir",
    "fr": "Ajouter",
    "it": "Aggiungi",
    "de": "Hinzufügen",
    "ja": "追加",
    "ko": "추가",
    "zh": "添加",
    "ar": "إضافة",
    "ru": "Добавить",
    "tr": "Ekle",
    "hi": "जोड़ें"
  },
  "atualizar": {
    "en": "Update",
    "es": "Actualizar",
    "fr": "Mettre à jour",
    "it": "Aggiorna",
    "de": "Aktualisieren",
    "ja": "更新",
    "ko": "업데이트",
    "zh": "更新",
    "ar": "تحديث",
    "ru": "Обновить",
    "tr": "Güncelle",
    "hi": "अद्यतन करें"
  },
  "carregando...": {
    "en": "Loading...",
    "es": "Cargando...",
    "fr": "Chargement...",
    "it": "Caricamento...",
    "de": "Laden...",
    "ja": "読み込み中...",
    "ko": "로딩 중...",
    "zh": "加载中...",
    "ar": "جاري التحميل...",
    "ru": "Загрузка...",
    "tr": "Yükleniyor...",
    "hi": "लोड हो रहा है..."
  },
  "gerar": {
    "en": "Generate",
    "es": "Generar",
    "fr": "Générer",
    "it": "Genera",
    "de": "Generieren",
    "ja": "生成",
    "ko": "생성",
    "zh": "生成",
    "ar": "إنشاء",
    "ru": "Сгенерировать",
    "tr": "Oluştur",
    "hi": "उत्पन्न करें"
  },
  "gerando...": {
    "en": "Generating...",
    "es": "Generando...",
    "fr": "Génération...",
    "it": "Generazione...",
    "de": "Wird generiert...",
    "ja": "生成中...",
    "ko": "생성 중...",
    "zh": "正在生成...",
    "ar": "جاري التوليد...",
    "ru": "Генерация...",
    "tr": "Oluşturuluyor...",
    "hi": "उत्पन्न हो रहा है..."
  },
  "escanear": {
    "en": "Scan",
    "es": "Escanear",
    "fr": "Scanner",
    "it": "Scansiona",
    "de": "Scannen",
    "ja": "スキャン",
    "ko": "스캔",
    "zh": "扫描",
    "ar": "مسح",
    "ru": "Сканировать",
    "tr": "Tara",
    "hi": "स्कैन करें"
  },
  "escaneando...": {
    "en": "Scanning...",
    "es": "Escaneando...",
    "fr": "Numérisation...",
    "it": "Scansione...",
    "de": "Wird gescannt...",
    "ja": "スキャン中...",
    "ko": "스캔 중...",
    "zh": "正在扫描...",
    "ar": "جاري المسح...",
    "ru": "Сканирование...",
    "tr": "Taranıyor...",
    "hi": "स्कैन हो रहा है..."
  },
  "compartilhar": {
    "en": "Share",
    "es": "Compartir",
    "fr": "Partager",
    "it": "Condividi",
    "de": "Teilen",
    "ja": "共有",
    "ko": "공유",
    "zh": "分享",
    "ar": "مشاركة",
    "ru": "Поделиться",
    "tr": "Paylaş",
    "hi": "साझा करें"
  },
  "copiar": {
    "en": "Copy",
    "es": "Copiar",
    "fr": "Copier",
    "it": "Copia",
    "de": "Kopieren",
    "ja": "コピー",
    "ko": "복사",
    "zh": "复制",
    "ar": "نسخ",
    "ru": "Копировать",
    "tr": "Kopyala",
    "hi": "कॉपी करें"
  },
  "copiado!": {
    "en": "Copied!",
    "es": "¡Copiado!",
    "fr": "Copié !",
    "it": "Copiato!",
    "de": "Kopiert!",
    "ja": "コピーしました！",
    "ko": "복사됨!",
    "zh": "已复制！",
    "ar": "تم النسخ!",
    "ru": "Скопировано!",
    "tr": "Kopyalandı!",
    "hi": "कॉपी किया गया!"
  },
  "comprar": {
    "en": "Buy",
    "es": "Comprar",
    "fr": "Acheter",
    "it": "Acquista",
    "de": "Kaufen",
    "ja": "購入",
    "ko": "구매",
    "zh": "购买",
    "ar": "شراء",
    "ru": "Купить",
    "tr": "Satın al",
    "hi": "खरीदें"
  },
  "assinar": {
    "en": "Subscribe",
    "es": "Suscribirse",
    "fr": "S'abonner",
    "it": "Abbonati",
    "de": "Abonnieren",
    "ja": "購読する",
    "ko": "구독하기",
    "zh": "订阅",
    "ar": "اشتراك",
    "ru": "Подписаться",
    "tr": "Abone ol",
    "hi": "सब्सक्राइब करें"
  },
  "todos": {
    "en": "All",
    "es": "Todos",
    "fr": "Tous",
    "it": "Tutti",
    "de": "Alle",
    "ja": "すべて",
    "ko": "전체",
    "zh": "全部",
    "ar": "الكل",
    "ru": "Все",
    "tr": "Tümü",
    "hi": "सभी"
  },
  "nenhum": {
    "en": "None",
    "es": "Ninguno",
    "fr": "Aucun",
    "it": "Nessuno",
    "de": "Keine",
    "ja": "なし",
    "ko": "없음",
    "zh": "无",
    "ar": "لا شيء",
    "ru": "Нет",
    "tr": "Yok",
    "hi": "कोई नहीं"
  },
  "detalhes": {
    "en": "Details",
    "es": "Detalles",
    "fr": "Détails",
    "it": "Dettagli",
    "de": "Details",
    "ja": "詳細",
    "ko": "상세",
    "zh": "详情",
    "ar": "التفاصيل",
    "ru": "Детали",
    "tr": "Detaylar",
    "hi": "विवरण"
  },
  "ações": {
    "en": "Actions",
    "es": "Acciones",
    "fr": "Actions",
    "it": "Azioni",
    "de": "Aktionen",
    "ja": "アクション",
    "ko": "작업",
    "zh": "操作",
    "ar": "إجراءات",
    "ru": "Действия",
    "tr": "Eylemler",
    "hi": "कार्रवाई"
  },
  "limpar": {
    "en": "Clear",
    "es": "Limpiar",
    "fr": "Effacer",
    "it": "Cancella",
    "de": "Löschen",
    "ja": "クリア",
    "ko": "지우기",
    "zh": "清除",
    "ar": "مسح",
    "ru": "Очистить",
    "tr": "Temizle",
    "hi": "साफ़ करें"
  },
  "filtrar": {
    "en": "Filter",
    "es": "Filtrar",
    "fr": "Filtrer",
    "it": "Filtra",
    "de": "Filtern",
    "ja": "フィルター",
    "ko": "필터",
    "zh": "筛选",
    "ar": "تصفية",
    "ru": "Фильтр",
    "tr": "Filtrele",
    "hi": "फ़िल्टर"
  },
  "buscar": {
    "en": "Search",
    "es": "Buscar",
    "fr": "Rechercher",
    "it": "Cerca",
    "de": "Suchen",
    "ja": "検索",
    "ko": "검색",
    "zh": "搜索",
    "ar": "بحث",
    "ru": "Поиск",
    "tr": "Ara",
    "hi": "खोजें"
  },

  // Nutrition, Metrics & Ingredients
  "tempo de preparo": {
    "en": "Prep Time",
    "es": "Tiempo de preparación",
    "fr": "Temps de préparation",
    "it": "Tempo di preparazione",
    "de": "Zubereitungszeit",
    "ja": "調理時間",
    "ko": "준비 시간",
    "zh": "准备时间",
    "ar": "وقت التحضير",
    "ru": "Время приготовления",
    "tr": "Hazırlık süresi",
    "hi": "तैयारी का समय"
  },
  "dificuldade": {
    "en": "Difficulty",
    "es": "Dificultad",
    "fr": "Difficulté",
    "it": "Difficoltà",
    "de": "Schwierigkeit",
    "ja": "難易度",
    "ko": "난이도",
    "zh": "难度",
    "ar": "الصعوبة",
    "ru": "Сложность",
    "tr": "Zorluk",
    "hi": "कठिनाई"
  },
  "calorias": {
    "en": "Calories",
    "es": "Calorías",
    "fr": "Calories",
    "it": "Calorie",
    "de": "Kalorien",
    "ja": "カロリー",
    "ko": "칼로리",
    "zh": "卡路里",
    "ar": "السعرات الحرارية",
    "ru": "Калории",
    "tr": "Kalori",
    "hi": "कैलोरी"
  },
  "proteínas": {
    "en": "Proteins",
    "es": "Proteínas",
    "fr": "Protéines",
    "it": "Proteine",
    "de": "Proteine",
    "ja": "タンパク質",
    "ko": "단백질",
    "zh": "蛋白质",
    "ar": "البروتينات",
    "ru": "Белки",
    "tr": "Protein",
    "hi": "प्रोटीन"
  },
  "carboidratos": {
    "en": "Carbs",
    "es": "Carbohidratos",
    "fr": "Glucides",
    "it": "Carboidrati",
    "de": "Kohlenhydrate",
    "ja": "炭水化物",
    "ko": "탄수화물",
    "zh": "碳水化合物",
    "ar": "الكربوهيدرات",
    "ru": "Углеводы",
    "tr": "Karbonhidrat",
    "hi": "कार्बोहाइड्रेट"
  },
  "gorduras": {
    "en": "Fats",
    "es": "Grasas",
    "fr": "Lipides",
    "it": "Grassi",
    "de": "Fette",
    "ja": "脂質",
    "ko": "지방",
    "zh": "脂肪",
    "ar": "الدهون",
    "ru": "Жиры",
    "tr": "Yağlar",
    "hi": "वसा"
  },
  "fibras": {
    "en": "Fibers",
    "es": "Fibras",
    "fr": "Fibres",
    "it": "Fibre",
    "de": "Ballaststoffe",
    "ja": "食物繊維",
    "ko": "식이섬유",
    "zh": "膳食纤维",
    "ar": "الألياف",
    "ru": "Клетчатка",
    "tr": "Lifler",
    "hi": "फाइबर"
  },
  "ingredientes": {
    "en": "Ingredients",
    "es": "Ingredientes",
    "fr": "Ingrédients",
    "it": "Ingredienti",
    "de": "Zutaten",
    "ja": "材料",
    "ko": "재료",
    "zh": "食材",
    "ar": "المكونات",
    "ru": "Ингредиенты",
    "tr": "Malzemeler",
    "hi": "सामग्री"
  },
  "modo de preparo": {
    "en": "Instructions",
    "es": "Modo de preparación",
    "fr": "Instructions de préparation",
    "it": "Istruzioni",
    "de": "Zubereitung",
    "ja": "作り方",
    "ko": "조리법",
    "zh": "制作方法",
    "ar": "طريقة التحضير",
    "ru": "Способ приготовления",
    "tr": "Hazırlanışı",
    "hi": "बनाने की विधि"
  },
  "porções": {
    "en": "Servings",
    "es": "Porciones",
    "fr": "Portions",
    "it": "Porzioni",
    "de": "Portionen",
    "ja": "人前",
    "ko": "인분",
    "zh": "份数",
    "ar": "الحصص",
    "ru": "Порции",
    "tr": "Porsiyon",
    "hi": "सर्विंग्स"
  },
  "fácil": {
    "en": "Easy",
    "es": "Fácil",
    "fr": "Facile",
    "it": "Facile",
    "de": "Einfach",
    "ja": "簡単",
    "ko": "쉬움",
    "zh": "简单",
    "ar": "سهل",
    "ru": "Легко",
    "tr": "Kolay",
    "hi": "आसान"
  },
  "médio": {
    "en": "Medium",
    "es": "Medio",
    "fr": "Moyen",
    "it": "Medio",
    "de": "Mittel",
    "ja": "普通",
    "ko": "보통",
    "zh": "中等",
    "ar": "متوسط",
    "ru": "Средне",
    "tr": "Orta",
    "hi": "मध्यम"
  },
  "avançado": {
    "en": "Advanced",
    "es": "Avanzado",
    "fr": "Avancé",
    "it": "Avanzato",
    "de": "Fortgeschritten",
    "ja": "上級",
    "ko": "고급",
    "zh": "高级",
    "ar": "متقدم",
    "ru": "Сложно",
    "tr": "İleri",
    "hi": "उन्नत"
  },
  "café da manhã": {
    "en": "Breakfast",
    "es": "Desayuno",
    "fr": "Petit-déjeuner",
    "it": "Colazione",
    "de": "Frühstück",
    "ja": "朝食",
    "ko": "아침 식사",
    "zh": "早餐",
    "ar": "الإفطار",
    "ru": "Завтрак",
    "tr": "Kahvaltı",
    "hi": "नाश्ता"
  },
  "almoço": {
    "en": "Lunch",
    "es": "Almuerzo",
    "fr": "Déjeuner",
    "it": "Pranzo",
    "de": "Mittagessen",
    "ja": "昼食",
    "ko": "점심 식사",
    "zh": "午餐",
    "ar": "الغداء",
    "ru": "Обед",
    "tr": "Öğle yemeği",
    "hi": "दोपहर का भोजन"
  },
  "lanche": {
    "en": "Snack",
    "es": "Merienda",
    "fr": "Collation",
    "it": "Spuntino",
    "de": "Snack",
    "ja": "軽食",
    "ko": "간식",
    "zh": "小吃",
    "ar": "وجبة خفيفة",
    "ru": "Перекус",
    "tr": "Atıştırmalık",
    "hi": "स्नैक"
  },
  "jantar": {
    "en": "Dinner",
    "es": "Cena",
    "fr": "Dîner",
    "it": "Cena",
    "de": "Abendessen",
    "ja": "夕食",
    "ko": "저녁 식사",
    "zh": "晚餐",
    "ar": "العشاء",
    "ru": "Ужин",
    "tr": "Akşam yemeği",
    "hi": "रात का खाना"
  },

  // Goals & Metrics
  "quero emagrecer": {
    "en": "Lose Weight",
    "es": "Quiero Perder Peso",
    "fr": "Perdre du poids",
    "it": "Perdere peso",
    "de": "Abnehmen",
    "ja": "減量したい",
    "ko": "체중 감량",
    "zh": "我想减肥",
    "ar": "إنقاص الوزن",
    "ru": "Похудеть",
    "tr": "Kilo vermek istiyorum",
    "hi": "वजन कम करना"
  },
  "quero ganhar massa": {
    "en": "Gain Muscle",
    "es": "Ganar Masa Muscular",
    "fr": "Prendre du muscle",
    "it": "Aumentare massa",
    "de": "Muskeln aufbauen",
    "ja": "筋肉を増やしたい",
    "ko": "근육량 증가",
    "zh": "我想增肌",
    "ar": "بناء العضلات",
    "ru": "Набрать массу",
    "tr": "Kas kazanmak istiyorum",
    "hi": "मांसपेशियां बढ़ाना"
  },
  "ganhar massa": {
    "en": "Gain Muscle",
    "es": "Ganar Masa",
    "fr": "Prendre du muscle",
    "it": "Aumentare massa",
    "de": "Muskelaufbau",
    "ja": "筋肉増量",
    "ko": "근육 증가",
    "zh": "增肌",
    "ar": "بناء العضلات",
    "ru": "Набор массы",
    "tr": "Kas kazanımı",
    "hi": "मांसपेशियां बढ़ाना"
  },
  "alimentação saudável e longevidade": {
    "en": "Healthy Eating & Longevity",
    "es": "Alimentación Saludable y Longevidad",
    "fr": "Alimentation saine et longévité",
    "it": "Alimentazione sana e longevità",
    "de": "Gesunde Ernährung & Langlebigkeit",
    "ja": "健康的な食事と長寿",
    "ko": "건강한 식단과 장수",
    "zh": "健康饮食与长寿",
    "ar": "تغذية صحية وطول العمر",
    "ru": "Здоровое питание и долголетие",
    "tr": "Sağlıklı beslenme ve uzun ömür",
    "hi": "स्वस्थ खान-पान और दीर्घायु"
  },
  "definição corporal": {
    "en": "Body Definition",
    "es": "Definición Corporal",
    "fr": "Définition corporelle",
    "it": "Definizione corporea",
    "de": "Körperdefinition",
    "ja": "ボディメイク",
    "ko": "바디 데피니션",
    "zh": "塑造身形",
    "ar": "تحديد القوام",
    "ru": "Рельеф тела",
    "tr": "Vücut belirginleştirme",
    "hi": "शारीरिक परिभाषा"
  },
  "meu progresso": {
    "en": "My Progress",
    "es": "Mi Progreso",
    "fr": "Mon Progrès",
    "it": "I miei progressi",
    "de": "Mein Fortschritt",
    "ja": "進捗状況",
    "ko": "내 진행 상황",
    "zh": "我的进度",
    "ar": "تقدمي",
    "ru": "Мой прогресс",
    "tr": "İlerlemem",
    "hi": "मेरी प्रगति"
  },
  "meta de água": {
    "en": "Water Goal",
    "es": "Meta de Agua",
    "fr": "Objectif d'eau",
    "it": "Obiettivo acqua",
    "de": "Wasserziel",
    "ja": "水分の目標",
    "ko": "수분 섭취 목표",
    "zh": "饮水目标",
    "ar": "هدف شرب الماء",
    "ru": "Цель по воде",
    "tr": "Su hedefi",
    "hi": "पानी का लक्ष्य"
  },
  "meta de calorias": {
    "en": "Calorie Goal",
    "es": "Meta de Calorías",
    "fr": "Objectif de calories",
    "it": "Obiettivo calorie",
    "de": "Kalorienziel",
    "ja": "カロリー目標",
    "ko": "칼로리 목표",
    "zh": "卡路里目标",
    "ar": "هدف السعرات",
    "ru": "Цель по калориям",
    "tr": "Kalori hedefi",
    "hi": "कैलोरी लक्ष्य"
  },
  "peso & classificação": {
    "en": "Weight & Status",
    "es": "Peso y Clasificación",
    "fr": "Poids & Statut",
    "it": "Peso e Classificazione",
    "de": "Gewicht & Einstufung",
    "ja": "体重と分類",
    "ko": "체중 및 분류",
    "zh": "体重与评估",
    "ar": "الوزن والتصنيف",
    "ru": "Вес и статус",
    "tr": "Kilo ve durum",
    "hi": "वजन और स्थिति"
  },
  "sono & humor": {
    "en": "Sleep & Mood",
    "es": "Sueño y Estado de Ánimo",
    "fr": "Sommeil & Humeur",
    "it": "Sonno e Umore",
    "de": "Schlaf & Stimmung",
    "ja": "睡眠と気分",
    "ko": "수면 및 기분",
    "zh": "睡眠与心情",
    "ar": "النوم والمزاج",
    "ru": "Сон и настроение",
    "tr": "Uyku ve ruh hali",
    "hi": "नींद और मनोदशा"
  },
  "painel do seu dia": {
    "en": "Your Daily Dashboard",
    "es": "Panel de su Día",
    "fr": "Tableau de votre journée",
    "it": "Pannello del tuo giorno",
    "de": "Dein Tages-Dashboard",
    "ja": "今日のダッシュボード",
    "ko": "오늘의 대시보드",
    "zh": "今日概览",
    "ar": "لوحة يومك",
    "ru": "Панель вашего дня",
    "tr": "Günlük paneliniz",
    "hi": "आपका दैनिक डैशबोर्ड"
  },
  "recursos inteligentes": {
    "en": "Smart Features",
    "es": "Funciones Inteligentes",
    "fr": "Fonctionnalités intelligentes",
    "it": "Funzioni intelligenti",
    "de": "Smarte Funktionen",
    "ja": "スマート機能",
    "ko": "스마트 기능",
    "zh": "智能功能",
    "ar": "الميزات الذكية",
    "ru": "Умные функции",
    "tr": "Akıllı özellikler",
    "hi": "स्मार्ट सुविधाएं"
  },
  "conversar com a malu": {
    "en": "Talk to Malu",
    "es": "Hablar con Malu",
    "fr": "Parler avec Malu",
    "it": "Parla con Malu",
    "de": "Mit Malu sprechen",
    "ja": "Maluと話す",
    "ko": "Malu와 대화하기",
    "zh": "与 Malu 对话",
    "ar": "تحدث مع مالو",
    "ru": "Поговорить с Малу",
    "tr": "Malu ile konuş",
    "hi": "मालू से बात करें"
  },
  "ia por voz ativa": {
    "en": "Active Voice AI",
    "es": "IA por Voz Activa",
    "fr": "IA vocale active",
    "it": "IA vocale attiva",
    "de": "Aktive Sprach-KI",
    "ja": "アクティブ音声AI",
    "ko": "음성 AI 활성화",
    "zh": "语音 AI 已激活",
    "ar": "الذكاء الاصطناعي الصوتي مفعل",
    "ru": "Голосовой ИИ активен",
    "tr": "Sesli Yapay Zeka Aktif",
    "hi": "ध्वनि एआई सक्रिय"
  },

  // Quick Dishes
  "inteligência culinária instantânea": {
    "en": "Instant Culinary Intelligence",
    "es": "Inteligencia Culinaria Instantánea",
    "fr": "Intelligence culinaire instantanée",
    "it": "Intelligenza culinaria istantanea",
    "de": "Sofortige kulinarische Intelligenz",
    "ja": "インスタント料理AI",
    "ko": "즉석 요리 인공지능",
    "zh": "即时烹饪智能",
    "ar": "ذكاء الطهي الفوري",
    "ru": "Мгновенный кулинарный ИИ",
    "tr": "Anında Mutfak Zekası",
    "hi": "त्वरित पाक बुद्धिमत्ता"
  },
  "pratos rápidos com ia": {
    "en": "Quick Dishes with AI",
    "es": "Platos Rápidos con IA",
    "fr": "Plats rapides avec l'IA",
    "it": "Piatti veloci con IA",
    "de": "Schnelle Gerichte mit KI",
    "ja": "AIクイックディッシュ",
    "ko": "AI 간편 요리",
    "zh": "AI 快捷菜肴",
    "ar": "أطباق سريعة مع الذكاء الاصطناعي",
    "ru": "Быстрые блюда с ИИ",
    "tr": "Yapay Zeka ile Hızlı Yemekler",
    "hi": "एआई के साथ त्वरित व्यंजन"
  },
  "gerar outras 3": {
    "en": "Generate 3 More",
    "es": "Generar otras 3",
    "fr": "Générer 3 autres",
    "it": "Genera altre 3",
    "de": "3 weitere generieren",
    "ja": "別の3品を生成",
    "ko": "다른 3가지 생성",
    "zh": "生成另外3道",
    "ar": "إنشاء 3 خيارات أخرى",
    "ru": "Сгенерировать еще 3",
    "tr": "Başka 3 tane oluştur",
    "hi": "3 और उत्पन्न करें"
  },
  "ver modo preparo": {
    "en": "View Instructions",
    "es": "Ver preparación",
    "fr": "Voir les instructions",
    "it": "Vedi preparazione",
    "de": "Zubereitung ansehen",
    "ja": "作り方を見る",
    "ko": "조리법 보기",
    "zh": "查看制作方法",
    "ar": "عرض طريقة التحضير",
    "ru": "Посмотреть рецепт",
    "tr": "Hazırlanışı gör",
    "hi": "विधि देखें"
  },
  "adicionar ingredientes": {
    "en": "Add Ingredients",
    "es": "Añadir ingredientes",
    "fr": "Ajouter les ingrédients",
    "it": "Aggiungi ingredienti",
    "de": "Zutaten hinzufügen",
    "ja": "材料を追加",
    "ko": "재료 추가",
    "zh": "添加食材",
    "ar": "إضافة المكونات",
    "ru": "Добавить ингредиенты",
    "tr": "Malzemeleri ekle",
    "hi": "सामग्री जोड़ें"
  },
  "salvar receita": {
    "en": "Save Recipe",
    "es": "Guardar receta",
    "fr": "Enregistrer la recette",
    "it": "Salva ricetta",
    "de": "Rezept speichern",
    "ja": "レシピを保存",
    "ko": "레시피 저장",
    "zh": "保存菜谱",
    "ar": "حفظ الوصفة",
    "ru": "Сохранить рецепт",
    "tr": "Tarifi kaydet",
    "hi": "रेसिपी सहेजें"
  },

  // Smart Fridge & Garden & Herbs
  "geladeira inteligente": {
    "en": "Smart Fridge",
    "es": "Nevera Inteligente",
    "fr": "Frigo Intelligent",
    "it": "Frigorifero Intelligente",
    "de": "Smarter Kühlschrank",
    "ja": "スマート冷蔵庫",
    "ko": "스마트 냉장고",
    "zh": "智能冰箱",
    "ar": "الثلاجة الذكية",
    "ru": "Умный холодильник",
    "tr": "Akıllı Buzdolabı",
    "hi": "स्मार्ट फ्रिज"
  },
  "geladeira": {
    "en": "Fridge",
    "es": "Nevera",
    "fr": "Réfrigérateur",
    "it": "Frigorifero",
    "de": "Kühlschrank",
    "ja": "冷蔵庫",
    "ko": "냉장고",
    "zh": "冰箱",
    "ar": "ثلاجة",
    "ru": "Холодильник",
    "tr": "Buzdolabı",
    "hi": "फ्रिज"
  },
  "instrutor 3d": {
    "en": "3D Coach",
    "es": "Entrenador 3D",
    "fr": "Coach 3D",
    "it": "Coach 3D",
    "de": "3D-Trainer",
    "ja": "3Dコーチ",
    "ko": "3D 코치",
    "zh": "3D 教练",
    "ar": "مدرب ثلاثي الأبعاد",
    "ru": "3D Тренер",
    "tr": "3D Antrenör",
    "hi": "3D कोच"
  },
  "guia 3d": {
    "en": "3D Guide",
    "es": "Guía 3D",
    "fr": "Guide 3D",
    "it": "Guida 3D",
    "de": "3D-Anleitung",
    "ja": "3Dガイド",
    "ko": "3D 가이드",
    "zh": "3D 指南",
    "ar": "دليل ثلاثي الأبعاد",
    "ru": "3D Гид",
    "tr": "3D Rehber",
    "hi": "3D गाइड"
  },
  "anatomia 3d": {
    "en": "3D Anatomy",
    "es": "Anatomía 3D",
    "fr": "Anatomie 3D",
    "it": "Anatomia 3D",
    "de": "3D-Anatomie",
    "ja": "3D解剖学",
    "ko": "3D 해부학",
    "zh": "3D 解剖学",
    "ar": "تشريح ثلاثي الأبعاد",
    "ru": "3D Анатомия",
    "tr": "3D Anatomi",
    "hi": "3D एनाटॉमी"
  },
  "simulador 3d": {
    "en": "3D Simulator",
    "es": "Simulador 3D",
    "fr": "Simulateur 3D",
    "it": "Simulatore 3D",
    "de": "3D-Simulator",
    "ja": "3Dシミュレーター",
    "ko": "3D 시뮬레이터",
    "zh": "3D 身材模拟",
    "ar": "محاكي ثلاثي الأبعاد",
    "ru": "3D Симулятор",
    "tr": "3D Simülatör",
    "hi": "3D सिम्युलेटर"
  },
  "projeção 3d inteligente": {
    "en": "Smart 3D Projection",
    "es": "Proyección 3D Inteligente",
    "fr": "Projection 3D Intelligente",
    "it": "Proiezione 3D Intelligente",
    "de": "Intelligente 3D-Projektion",
    "ja": "スマート3Dプロジェクション",
    "ko": "스마트 3D 투영",
    "zh": "智能 3D 投影",
    "ar": "إسقاط ذكي ثلاثي الأبعاد",
    "ru": "Умная 3D-проекция",
    "tr": "Akıllı 3D Projeksiyon",
    "hi": "स्मार्ट 3D प्रक्षेपण"
  },
  "simulação evolutiva": {
    "en": "Evolutionary Simulation",
    "es": "Simulación Evolutiva",
    "fr": "Simulation Évolutive",
    "it": "Simulazione Evolutiva",
    "de": "Evolutionssimulation",
    "ja": "進化シミュレーション",
    "ko": "진화 시뮬레이션",
    "zh": "身材演化模拟",
    "ar": "المحاكاة التطورية",
    "ru": "Эволюционная симуляция",
    "tr": "Gelişim Simülasyonu",
    "hi": "विकासवादी सिमुलेशन"
  },
  "simulação 3d em tempo real": {
    "en": "Real-time 3D Simulation",
    "es": "Simulación 3D en Tiempo Real",
    "fr": "Simulation 3D en Temps Réel",
    "it": "Simulazione 3D in Tempo Reale",
    "de": "Echtzeit-3D-Simulation",
    "ja": "リアルタイム3Dシミュレーション",
    "ko": "실시간 3D 시뮬레이션",
    "zh": "实时 3D 模拟",
    "ar": "محاكاة ثلاثية الأبعاد في الوقت الحقيقي",
    "ru": "3D-симуляция в реальном времени",
    "tr": "Gerçek Zamanlı 3D Simülasyon",
    "hi": "रीयल-टाइम 3D सिमुलेशन"
  },
  "ajustar meu plano": {
    "en": "Adjust My Plan",
    "es": "Ajustar Mi Plan",
    "fr": "Ajuster Mon Plan",
    "it": "Modifica Il Mio Piano",
    "de": "Meinen Plan Anpassen",
    "ja": "プランを調整",
    "ko": "내 계획 수정",
    "zh": "调整我的计划",
    "ar": "تعديل خطتي",
    "ru": "Настроить мой план",
    "tr": "Planımı Düzenle",
    "hi": "मेरी योजना समायोजित करें"
  },
  "relatório pdf": {
    "en": "PDF Report",
    "es": "Informe PDF",
    "fr": "Rapport PDF",
    "it": "Report PDF",
    "de": "PDF-Bericht",
    "ja": "PDFレポート",
    "ko": "PDF 보고서",
    "zh": "PDF 报告",
    "ar": "تقرير PDF",
    "ru": "PDF Отчет",
    "tr": "PDF Raporu",
    "hi": "पीडीएफ रिपोर्ट"
  },
  "horta": {
    "en": "Garden",
    "es": "Huerto",
    "fr": "Potager",
    "it": "Orto",
    "de": "Garten",
    "ja": "菜園",
    "ko": "텃밭",
    "zh": "果蔬园",
    "ar": "حديقة",
    "ru": "Огород",
    "tr": "Bahçe",
    "hi": "बगीचा"
  },
  "ervas": {
    "en": "Herbs",
    "es": "Hierbas",
    "fr": "Herbes",
    "it": "Erbe",
    "de": "Kräuter",
    "ja": "ハーブ",
    "ko": "허브",
    "zh": "草本",
    "ar": "أعشاب",
    "ru": "Травы",
    "tr": "Otlar",
    "hi": "जड़ी-बूटियाँ"
  },
  "horta inteligente": {
    "en": "Smart Garden",
    "es": "Huerto Inteligente",
    "fr": "Potager Intelligent",
    "it": "Orto Intelligente",
    "de": "Smarter Garten",
    "ja": "スマート菜園",
    "ko": "스마트 텃밭",
    "zh": "智能果蔬园",
    "ar": "الحديقة الذكية",
    "ru": "Умный сад",
    "tr": "Akıllı Bahçe",
    "hi": "स्मार्ट गार्डन"
  },
  "minha horta inteligente": {
    "en": "My Smart Garden",
    "es": "Mi Huerto Inteligente",
    "fr": "Mon Potager Intelligent",
    "it": "Il Mio Orto Intelligente",
    "de": "Mein Smarter Garten",
    "ja": "マイスマート菜園",
    "ko": "나의 스마트 텃밭",
    "zh": "我的智能果蔬园",
    "ar": "حديقتي الذكية",
    "ru": "Мой умный сад",
    "tr": "Akıllı Bahçem",
    "hi": "मेरा स्मार्ट गार्डन"
  },
  "horta caseira inteligente": {
    "en": "Smart Home Garden",
    "es": "Huerto Casero Inteligente",
    "fr": "Potager Maison Intelligent",
    "it": "Orto Domestico Intelligente",
    "de": "Smarter Hausgarten",
    "ja": "スマート家庭菜園",
    "ko": "스마트 홈 텃밭",
    "zh": "智能家庭果蔬园",
    "ar": "الحديقة المنزلية الذكية",
    "ru": "Умный домашний сад",
    "tr": "Akıllı Ev Bahçesi",
    "hi": "स्मार्ट होम गार्डन"
  },
  "guia de plantio": {
    "en": "Planting Guide",
    "es": "Guía de Siembra",
    "fr": "Guide de Plantation",
    "it": "Guida alla Semina",
    "de": "Pflanzanleitung",
    "ja": "栽培ガイド",
    "ko": "재배 가이드",
    "zh": "种植指南",
    "ar": "دليل الزراعة",
    "ru": "Руководство по посадке",
    "tr": "Ekim Rehberi",
    "hi": "रोपण गाइड"
  },
  "minha horta": {
    "en": "My Garden",
    "es": "Mi Huerto",
    "fr": "Mon Jardin",
    "it": "Il Mio Orto",
    "de": "Mein Garten",
    "ja": "私の菜園",
    "ko": "나의 텃밭",
    "zh": "我的果蔬园",
    "ar": "حديقتي",
    "ru": "Мой сад",
    "tr": "Bahçem",
    "hi": "मेरा बगीचा"
  },
  "diagnóstico botânico": {
    "en": "Botanical Diagnosis",
    "es": "Diagnóstico Botánico",
    "fr": "Diagnostic Botanique",
    "it": "Diagnosi Botanica",
    "de": "Botanische Diagnose",
    "ja": "植物診断",
    "ko": "식물 진단",
    "zh": "植物诊断",
    "ar": "التشخيص النباتي",
    "ru": "Ботаническая диагностика",
    "tr": "Bitki Teşhisi",
    "hi": "वानस्पतिक निदान"
  },
  "diagnóstico ia": {
    "en": "AI Diagnosis",
    "es": "Diagnóstico IA",
    "fr": "Diagnostic IA",
    "it": "Diagnosi IA",
    "de": "KI-Diagnose",
    "ja": "AI診断",
    "ko": "AI 진단",
    "zh": "AI 诊断",
    "ar": "تشخيص الذكاء الاصطناعي",
    "ru": "ИИ-диагностика",
    "tr": "Yapay Zeka Teşhisi",
    "hi": "एआई निदान"
  },
  "ervas medicinais": {
    "en": "Medicinal Herbs",
    "es": "Hierbas Medicinales",
    "fr": "Herbes Médicinales",
    "it": "Erbe Medicinali",
    "de": "Heilkräuter",
    "ja": "薬用ハーブ",
    "ko": "약초 및 허브",
    "zh": "草本植物",
    "ar": "الأعشاب الطبية",
    "ru": "Лекарственные травы",
    "tr": "Şifalı Otlar",
    "hi": "औषधीय जड़ी-बूटियाँ"
  },
  "adicionar alimento": {
    "en": "Add Food",
    "es": "Añadir Alimento",
    "fr": "Ajouter un aliment",
    "it": "Aggiungi cibo",
    "de": "Lebensmittel hinzufügen",
    "ja": "食材を追加",
    "ko": "식품 추가",
    "zh": "添加食材",
    "ar": "إضافة طعام",
    "ru": "Добавить продукт",
    "tr": "Yiyecek ekle",
    "hi": "भोजन जोड़ें"
  },
  "validade": {
    "en": "Expiration Date",
    "es": "Fecha de caducidad",
    "fr": "Date de péremption",
    "it": "Scadenza",
    "de": "Haltbarkeit",
    "ja": "賞味期限",
    "ko": "유통기한",
    "zh": "保质期",
    "ar": "تاريخ الانتهاء",
    "ru": "Срок годности",
    "tr": "Son kullanma tarihi",
    "hi": "समाप्ति तिथि"
  },
  "quantidade": {
    "en": "Quantity",
    "es": "Cantidad",
    "fr": "Quantité",
    "it": "Quantità",
    "de": "Menge",
    "ja": "数量",
    "ko": "수량",
    "zh": "数量",
    "ar": "الكمية",
    "ru": "Количество",
    "tr": "Miktar",
    "hi": "मात्रा"
  },
  "categoria": {
    "en": "Category",
    "es": "Categoría",
    "fr": "Catégorie",
    "it": "Categoria",
    "de": "Kategorie",
    "ja": "カテゴリー",
    "ko": "카테고리",
    "zh": "类别",
    "ar": "الفئة",
    "ru": "Категория",
    "tr": "Kategori",
    "hi": "श्रेणी"
  },
  "fresco": {
    "en": "Fresh",
    "es": "Fresco",
    "fr": "Frais",
    "it": "Fresco",
    "de": "Frisch",
    "ja": "新鮮",
    "ko": "신선함",
    "zh": "新鲜",
    "ar": "طازج",
    "ru": "Свежий",
    "tr": "Taze",
    "hi": "ताज़ा"
  },
  "vence em breve": {
    "en": "Expiring Soon",
    "es": "Vence pronto",
    "fr": "Expire bientôt",
    "it": "In scadenza",
    "de": "Läuft bald ab",
    "ja": "期限間近",
    "ko": "곧 만료됨",
    "zh": "即将过期",
    "ar": "ينتهي قريباً",
    "ru": "Скоро испортится",
    "tr": "Yakında bitiyor",
    "hi": "जल्द समाप्त होने वाला"
  },
  "vencido": {
    "en": "Expired",
    "es": "Vencido",
    "fr": "Expiré",
    "it": "Scaduto",
    "de": "Abgelaufen",
    "ja": "期限切れ",
    "ko": "만료됨",
    "zh": "已过期",
    "ar": "منتهي الصلاحية",
    "ru": "Истек срок",
    "tr": "Süresi doldu",
    "hi": "समाप्त"
  },
  "vegetais": {
    "en": "Vegetables",
    "es": "Vegetales",
    "fr": "Légumes",
    "it": "Verdure",
    "de": "Gemüse",
    "ja": "野菜",
    "ko": "채소",
    "zh": "蔬菜",
    "ar": "الخضروات",
    "ru": "Овощи",
    "tr": "Sebzeler",
    "hi": "सब्जियां"
  },
  "laticínios": {
    "en": "Dairy",
    "es": "Lácteos",
    "fr": "Produits laitiers",
    "it": "Latticini",
    "de": "Milchprodukte",
    "ja": "乳製品",
    "ko": "유제품",
    "zh": "乳制品",
    "ar": "منتجات الألبان",
    "ru": "Молочные продукты",
    "tr": "Süt ürünleri",
    "hi": "डेयरी"
  },
  "bebidas": {
    "en": "Beverages",
    "es": "Bebidas",
    "fr": "Boissons",
    "it": "Bevande",
    "de": "Getränke",
    "ja": "飲み物",
    "ko": "음료",
    "zh": "饮料",
    "ar": "المشروبات",
    "ru": "Напитки",
    "tr": "İçecekler",
    "hi": "पेय पदार्थ"
  },
  "frutas": {
    "en": "Fruits",
    "es": "Frutas",
    "fr": "Fruits",
    "it": "Frutta",
    "de": "Früchte",
    "ja": "果物",
    "ko": "과일",
    "zh": "水果",
    "ar": "الفواكه",
    "ru": "Фрукты",
    "tr": "Meyveler",
    "hi": "फल"
  },
  "condimentos": {
    "en": "Condiments",
    "es": "Condimentos",
    "fr": "Condiments",
    "it": "Condimenti",
    "de": "Gewürze",
    "ja": "調味料",
    "ko": "양념 및 소스",
    "zh": "调味料",
    "ar": "التوابل",
    "ru": "Приправы",
    "tr": "Baharatlar",
    "hi": "मसाले"
  },
  "outros": {
    "en": "Others",
    "es": "Otros",
    "fr": "Autres",
    "it": "Altri",
    "de": "Andere",
    "ja": "その他",
    "ko": "기타",
    "zh": "其他",
    "ar": "أخرى",
    "ru": "Другое",
    "tr": "Diğer",
    "hi": "अन्य"
  },

  // Subscriptions & VIP
  "planos & assinaturas": {
    "en": "Plans & Subscriptions",
    "es": "Planes y Suscripciones",
    "fr": "Forfaits & Abonnements",
    "it": "Piani e Abbonamenti",
    "de": "Pläne & Abonnements",
    "ja": "プランとサブスクリプション",
    "ko": "요금제 및 구독",
    "zh": "方案与订阅",
    "ar": "الخطط والاشتراكات",
    "ru": "Тарифы и подписки",
    "tr": "Planlar ve Abonelikler",
    "hi": "योजनाएं और सदस्यता"
  },
  "cancele quando quiser": {
    "en": "Cancel anytime",
    "es": "Cancele cuando desee",
    "fr": "Annulez quand vous voulez",
    "it": "Annulla quando vuoi",
    "de": "Jederzeit kündbar",
    "ja": "いつでもキャンセル可能",
    "ko": "언제든지 취소 가능",
    "zh": "随时可以取消",
    "ar": "إلغاء في أي وقت",
    "ru": "Отмена в любой момент",
    "tr": "İstediğiniz zaman iptal edin",
    "hi": "कभी भी रद्द करें"
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
    "ar": "تجربة مجانية",
    "ru": "Бесплатная пробная версия",
    "tr": "Ücretsiz Deneme",
    "hi": "मुफ्त परीक्षण"
  },
  "plano pro": {
    "en": "PRO Plan",
    "es": "Plan PRO",
    "fr": "Plan PRO",
    "it": "Piano PRO",
    "de": "PRO-Plan",
    "ja": "PROプラン",
    "ko": "PRO 요금제",
    "zh": "PRO 方案",
    "ar": "خطة برو",
    "ru": "Тариф PRO",
    "tr": "PRO Plan",
    "hi": "प्रो योजना"
  },
  "plano premium": {
    "en": "Premium Plan",
    "es": "Plan Premium",
    "fr": "Plan Premium",
    "it": "Piano Premium",
    "de": "Premium-Plan",
    "ja": "プレミアムプラン",
    "ko": "프리미엄 요금제",
    "zh": "高级方案",
    "ar": "الخطة المميزة",
    "ru": "Премиум тариф",
    "tr": "Premium Plan",
    "hi": "प्रीमियम योजना"
  },
  "economia real": {
    "en": "Real Savings",
    "es": "Ahorro Real",
    "fr": "Économie réelle",
    "it": "Risparmio reale",
    "de": "Echte Ersparnis",
    "ja": "確実な節約",
    "ko": "실질적 절약",
    "zh": "真实节省",
    "ar": "توفير حقيقي",
    "ru": "Реальная экономия",
    "tr": "Gerçek Tasarruf",
    "hi": "वास्तविक बचत"
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
  "perto_vencimento": { "en": "Expiring Soon", "es": "Pronto a vencer", "fr": "Expire bientôt", "it": "In scadenza", "de": "Bald ablaufend", "ja": "まもなく賞味期限", "ko": "만료 임박", "zh": "即将过期", "ar": "قريب الانتهاء" },

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
  "saciedade & fibras": {
    "en": "Satiety & Fiber",
    "es": "Saciedad y Fibras",
    "fr": "Satiété et Fibres",
    "it": "Sazietà e Fibre",
    "de": "Sättigung und Ballaststoffe",
    "ja": "満腹感と食物繊維",
    "ko": "포만감과 식이섬유",
    "zh": "饱腹感与膳食纤维",
    "ar": "الشبع والألياف"
  },
  "alta proteína (35g+)": {
    "en": "High Protein (35g+)",
    "es": "Alta Proteína (35g+)",
    "fr": "Riche en Protéines (35g+)",
    "it": "Alto Contenuto Proteico (35g+)",
    "de": "Viel Protein (35g+)",
    "ja": "高タンパク質 (35g+)",
    "ko": "고단백 (35g+)",
    "zh": "高蛋白质 (35g+)",
    "ar": "بروتين عالي (35 جم+)"
  },
  "preparo em 5-15 min": {
    "en": "Ready in 5-15 min",
    "es": "Listo en 5-15 min",
    "fr": "Prêt en 5-15 min",
    "it": "Pronto in 5-15 min",
    "de": "Fertig in 5-15 Min",
    "ja": "5-15分で完成",
    "ko": "5-15분 조리",
    "zh": "5-15分钟制作",
    "ar": "جاهز في 5-15 دقيقة"
  },
  "lanches rápidos": {
    "en": "Quick Snacks",
    "es": "Snacks Rápidos",
    "fr": "Collations Rapides",
    "it": "Spuntini Rapidi",
    "de": "Schnelle Snacks",
    "ja": "手軽なスナック",
    "ko": "간편 간식",
    "zh": "快手小食",
    "ar": "وجبات خفيفة سريعة"
  },
  "preparando suas 3 opções ideais...": {
    "en": "Preparing your 3 ideal options...",
    "es": "Preparando tus 3 opciones ideales...",
    "fr": "Préparation de vos 3 options idéales...",
    "it": "Preparando le tue 3 opzioni ideali...",
    "de": "Ihre 3 idealen Optionen werden vorbereitet...",
    "ja": "理想の3品を準備中...",
    "ko": "최적의 3가지 옵션을 준비하는 중...",
    "zh": "正在为您定制3道理想选择...",
    "ar": "جارٍ إعداد خياراتك الثلاثة المثالية..."
  },
  "receita completa": {
    "en": "Full Recipe",
    "es": "Receta Completa",
    "fr": "Recette Complète",
    "it": "Ricetta Completa",
    "de": "Vollständiges Rezept",
    "ja": "完全なレシピ",
    "ko": "전체 레시피",
    "zh": "完整食谱",
    "ar": "الوصفة الكاملة"
  },
  "ver receita": {
    "en": "View Recipe",
    "es": "Ver Receta",
    "fr": "Voir la Recette",
    "it": "Vedi Ricetta",
    "de": "Rezept ansehen",
    "ja": "レシピを見る",
    "ko": "레시피 보기",
    "zh": "查看食谱",
    "ar": "عرض الوصفة"
  },
  "favoritar": {
    "en": "Favorite",
    "es": "Favorito",
    "fr": "Favoris",
    "it": "Preferito",
    "de": "Favorit",
    "ja": "お気に入り",
    "ko": "즐겨찾기",
    "zh": "收藏",
    "ar": "تفضيل"
  },
  "salvo": {
    "en": "Saved",
    "es": "Guardado",
    "fr": "Enregistré",
    "it": "Salvato",
    "de": "Gespeichert",
    "ja": "保存済み",
    "ko": "저장됨",
    "zh": "已保存",
    "ar": "محفوظ"
  },
  "3 opções geradas sob medida": {
    "en": "3 Tailor-made Options",
    "es": "3 Opciones Hechas a Medida",
    "fr": "3 Options Sur Mesure",
    "it": "3 Opzioni Su Misura",
    "de": "3 maßgeschneiderte Optionen",
    "ja": "カスタマイズされた3品",
    "ko": "맞춤 생성된 3가지 옵션",
    "zh": "3道专属定制菜品",
    "ar": "3 خيارات مخصصة لك"
  }
};

// Global WeakMaps to store original textual content and attributes
// This prevents loss of fidelity when cycling through multiple languages
const originalTextMap = new WeakMap<Node, string>();
const originalAttrMap = new WeakMap<HTMLElement, Record<string, string>>();

export function AutoTranslator() {
  const { i18n } = useTranslation();
  const [activeLang, setActiveLang] = useState(i18n.language || 'pt-BR');

  // Listen to language events from all sources
  useEffect(() => {
    const handleLanguageChange = (lng?: string) => {
      const target = lng || i18n.language || 'pt-BR';
      setActiveLang(target);
    };

    i18n.on('languageChanged', handleLanguageChange);
    const onNutri = (e: any) => handleLanguageChange(e?.detail);
    window.addEventListener('nutri:language-changed', onNutri);
    window.addEventListener('languageChanged', onNutri);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
      window.removeEventListener('nutri:language-changed', onNutri);
      window.removeEventListener('languageChanged', onNutri);
    };
  }, [i18n]);

  // Load comprehensive bidirectional translation dictionary across all languages
  const translationMap = useMemo(() => {
    const currentLang = activeLang;
    const cleanLang = currentLang.split('-')[0];
    const isPortuguese = currentLang.startsWith('pt');

    const map = new Map<string, string>();

    // 1. Process all entries in RUNTIME_DICTIONARY
    for (const rawPtKey of Object.keys(RUNTIME_DICTIONARY)) {
      const translations = RUNTIME_DICTIONARY[rawPtKey];
      const targetText = isPortuguese 
        ? rawPtKey 
        : (translations[cleanLang] || translations[currentLang] || translations['en'] || rawPtKey);

      if (targetText && typeof targetText === 'string') {
        // Map Portuguese key to target language
        map.set(rawPtKey.toLowerCase().trim(), targetText);

        // Map every translation variant across all languages directly to target language
        for (const langCode of Object.keys(translations)) {
          const otherLangText = translations[langCode];
          if (otherLangText && typeof otherLangText === 'string') {
            map.set(otherLangText.toLowerCase().trim(), targetText);
          }
        }
      }
    }

    // 2. Process all locale bundles in localesMap
    const targetBundle = localesMap[currentLang] || localesMap[cleanLang] || localesMap['pt-BR'] || {};
    const ptBundle = localesMap['pt-BR'] || {};

    const allKeys = new Set<string>();
    for (const bundle of Object.values(localesMap)) {
      if (bundle && typeof bundle === 'object') {
        Object.keys(bundle).forEach(k => allKeys.add(k));
      }
    }

    for (const key of allKeys) {
      const targetText = isPortuguese 
        ? (ptBundle[key] || key)
        : (targetBundle[key] || localesMap['en-US']?.[key] || ptBundle[key] || key);

      if (targetText && typeof targetText === 'string') {
        for (const bundle of Object.values(localesMap)) {
          if (bundle && bundle[key] && typeof bundle[key] === 'string') {
            map.set(bundle[key].toLowerCase().trim(), targetText);
          }
        }
      }
    }

    return map;
  }, [activeLang]);

  useEffect(() => {
    const currentLang = activeLang;
    const isPortuguese = currentLang.startsWith('pt');
    
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

    // Helper to translate single string safely with smart punctuation and emoji preservation
    const translateString = (str: string): string => {
      if (!str || typeof str !== 'string') return str;
      const trimmed = str.trim();
      if (!trimmed) return str;

      const prefix = str.slice(0, str.indexOf(trimmed));
      const suffix = str.slice(str.indexOf(trimmed) + trimmed.length);

      // 1. Check exact match
      const lower = trimmed.toLowerCase();
      if (translationMap.has(lower)) {
        const match = translationMap.get(lower)!;
        return prefix + match + suffix;
      }

      // 2. Check for surrounding emojis or leading/trailing symbols
      const emojiRegex = /^([\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s•\-\+—\(\)\[\]\{\}:;!?#@]+)(.*?)([\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s•\-\+—\(\)\[\]\{\}:;!?#@]+)?$/u;
      const matchEmoji = trimmed.match(emojiRegex);
      if (matchEmoji && matchEmoji[2] && matchEmoji[2].trim().length > 0) {
        const coreText = matchEmoji[2].trim();
        const coreLower = coreText.toLowerCase();
        if (translationMap.has(coreLower)) {
          const translatedCore = translationMap.get(coreLower)!;
          const lead = matchEmoji[1] || '';
          const trail = matchEmoji[3] || '';
          return prefix + lead + translatedCore + trail + suffix;
        }
      }

      // 3. Check for trailing punctuation (e.g., "Calorias:", "Salvo com sucesso!", "Esqueceu sua senha?")
      const punctRegex = /^(.+?)([:!?,.;]+)$/;
      const matchPunct = trimmed.match(punctRegex);
      if (matchPunct && matchPunct[1]) {
        const coreText = matchPunct[1].trim();
        const coreLower = coreText.toLowerCase();
        if (translationMap.has(coreLower)) {
          const translatedCore = translationMap.get(coreLower)!;
          return prefix + translatedCore + matchPunct[2] + suffix;
        }
      }

      // 4. Check for parentheses (e.g., "(Fácil)", "(35g+)")
      if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
        const inner = trimmed.slice(1, -1).trim();
        const innerLower = inner.toLowerCase();
        if (translationMap.has(innerLower)) {
          const translatedInner = translationMap.get(innerLower)!;
          return prefix + `(${translatedInner})` + suffix;
        }
      }

      // If in Portuguese and no translation found, return original string
      if (isPortuguese) {
        return str;
      }

      // If no match, return original text safely
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

        // Translate attributes if applicable
        let attrStore = originalAttrMap.get(el);
        if (!attrStore) {
          attrStore = {};
          originalAttrMap.set(el, attrStore);
        }

        for (const attr of ['placeholder', 'title', 'alt'] as const) {
          const currentVal = el.getAttribute(attr);
          if (currentVal) {
            if (!attrStore[attr]) {
              attrStore[attr] = currentVal;
            }
            const trans = translateString(attrStore[attr]);
            if (trans && trans !== currentVal) {
              el.setAttribute(attr, trans);
            }
          }
        }
      }

      // Translate text nodes using lossless WeakMap cache
      if (node.nodeType === Node.TEXT_NODE) {
        let original = originalTextMap.get(node);
        if (!original) {
          original = node.nodeValue || '';
          if (original.trim().length > 0) {
            originalTextMap.set(node, original);
          }
        }
        if (original && original.trim().length > 0) {
          const targetText = translateString(original);
          if (targetText && targetText !== node.nodeValue) {
            node.nodeValue = targetText;
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

    // Translate the initial layout immediately
    walkAndTranslate(document.body);

    // Staggered passes to capture animated mounts and lazy chunks
    const t1 = setTimeout(() => walkAndTranslate(document.body), 60);
    const t2 = setTimeout(() => walkAndTranslate(document.body), 250);

    // Create a MutationObserver to catch dynamic content additions (e.g. modals, notifications, AI chat bubbles)
    const observer = new MutationObserver((mutations) => {
      observer.disconnect();

      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            walkAndTranslate(node);
          });
        } else if (mutation.type === 'characterData') {
          const targetNode = mutation.target;
          let original = originalTextMap.get(targetNode);
          if (!original) {
            original = targetNode.nodeValue || '';
            if (original.trim().length > 0) {
              originalTextMap.set(targetNode, original);
            }
          }
          if (original && original.trim().length > 0) {
            const targetText = translateString(original);
            if (targetText && targetText !== targetNode.nodeValue) {
              targetNode.nodeValue = targetText;
            }
          }
        } else if (mutation.type === 'attributes') {
          const el = mutation.target as HTMLElement;
          const attr = mutation.attributeName;
          if (attr === 'placeholder' || attr === 'title' || attr === 'alt') {
            let attrStore = originalAttrMap.get(el);
            if (!attrStore) {
              attrStore = {};
              originalAttrMap.set(el, attrStore);
            }
            const currentVal = el.getAttribute(attr);
            if (currentVal) {
              if (!attrStore[attr]) {
                attrStore[attr] = currentVal;
              }
              const trans = translateString(attrStore[attr]);
              if (trans && trans !== currentVal) {
                el.setAttribute(attr, trans);
              }
            }
          }
        }
      }

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
      clearTimeout(t1);
      clearTimeout(t2);
      observer.disconnect();
    };
  }, [translationMap, activeLang]);

  return null; // Invisible global manager
}
