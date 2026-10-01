import React, { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { localesMap } from '../i18n/locales';
import { useLanguage } from '../contexts/LanguageContext';
import { RUNTIME_DICTIONARY, lookupRuntimeTranslation } from '../i18n/runtimeDictionary';

// Global WeakMaps to store original textual content and attributes
// This guarantees zero loss of fidelity when cycling through any language and back to Portuguese
const originalTextMap = new WeakMap<Node, string>();
const originalAttrMap = new WeakMap<HTMLElement, Record<string, string>>();

// Global in-memory cache for dynamic translations
const dynamicTranslationCache = new Map<string, string>();
let clientBatchCooldownUntil = 0;

// High-frequency UI phrases across all NutriAI screens for instant 0ms translation
const STATIC_APP_PHRASES: Record<string, Record<string, string>> = {
  "descubra novas refeições": {
    en: "Discover New Meals",
    es: "Descubre Nuevas Comidas",
    fr: "Découvrez de Nouveaux Repas",
    de: "Entdecken Sie neue Mahlzeiten",
    it: "Scopri Nuovi Pasti",
  },
  "informe o que você tem na geladeira ou tire uma foto. a inteligência artificial criará uma receita exclusiva respeitando seu perfil.": {
    en: "Tell us what you have in your fridge or snap a photo. AI will create an exclusive recipe tailored to your profile.",
    es: "Indica lo que tienes en el refrigerador o toma una foto. La IA creará una receta exclusiva según tu perfil.",
    fr: "Indiquez ce que vous avez dans le réfrigérateur ou prenez une photo. L'IA créera une recette adaptée à votre profil.",
    de: "Sagen Sie uns, was Sie im Kühlschrank haben, oder machen Sie ein Foto. Die KI erstellt ein maßgeschneidertes Rezept.",
    it: "Indica cosa hai nel frigorifero o scatta una foto. L'IA creerà una ricetta su misura per il tuo profilo.",
  },
  "ingredientes disponíveis": {
    en: "Available Ingredients",
    es: "Ingredientes Disponibles",
    fr: "Ingrédients Disponibles",
    de: "Verfügbare Zutaten",
    it: "Ingredienti Disponibili",
  },
  "falar ingredientes": {
    en: "Speak Ingredients",
    es: "Hablar Ingredientes",
    fr: "Dicter les Ingrédients",
    de: "Zutaten Einsprechen",
    it: "Pronuncia Ingredienti",
  },
  "ouça com a voz da malu": {
    en: "Listen to Malu's Voice",
    es: "Escuchar con la voz de Malu",
    fr: "Écouter avec la voix de Malu",
    de: "Mit Malus Stimme anhören",
    it: "Ascolta con la voce di Malu",
  },
  "ouvir com a voz da malu": {
    en: "Listen with Malu's Voice",
    es: "Escuchar con la voz de Malu",
    fr: "Écouter avec la voix de Malu",
    de: "Mit Malus Stimme anhören",
    it: "Ascolta con la voce di Malu",
  },
  "ouça com a voz da nutriai": {
    en: "Listen with NutriAI Voice",
    es: "Escuchar con la voz de NutriAI",
    fr: "Écouter avec la voix de NutriAI",
    de: "Mit NutriAI-Stimme anhören",
    it: "Ascolta con la voce di NutriAI",
  },
  "falar com nutriai": {
    en: "Talk to NutriAI",
    es: "Hablar con NutriAI",
    fr: "Parler à NutriAI",
    de: "Mit NutriAI sprechen",
    it: "Parla con NutriAI",
  },
  "falar com malu": {
    en: "Talk to Malu",
    es: "Hablar con Malu",
    fr: "Parler à Malu",
    de: "Mit Malu sprechen",
    it: "Parla con Malu",
  },
  "gerar pratos rápidos (1 toque)": {
    en: "GENERATE QUICK DISHES (1 TAP)",
    es: "GENERAR PLATOS RÁPIDOS (1 TOQUE)",
    fr: "GÉNÉRER PLATS RAPIDES (1 TOUCHE)",
    de: "SCHNELLE GERICHTE GENERIEREN (1 TIPP)",
    it: "GENERA PIATTI RAPIDI (1 TOCCO)",
  },
  "🍽️ gerar pratos rápidos (1 toque)": {
    en: "🍽️ GENERATE QUICK DISHES (1 TAP)",
    es: "🍽️ GENERAR PLATOS RÁPIDOS (1 TOQUE)",
    fr: "🍽️ GÉNÉRER PLATS RAPIDES (1 TOUCHE)",
    de: "🍽️ SCHNELLE GERICHTE GENERIEREN (1 TIPP)",
    it: "🍽️ GENERA PIATTI RAPIDI (1 TOCCO)",
  },
  "dicas de especialista": {
    en: "Expert Tips",
    es: "Consejos de Experto",
    fr: "Conseils d'Expert",
    de: "Expertentipps",
    it: "Consigli dell'Esperto",
  },
  "informe preferências ou restrições": {
    en: "Enter preferences or restrictions",
    es: "Ingresa preferencias o restricciones",
    fr: "Entrez préférences ou restrictions",
    de: "Präferenzen oder Einschränkungen eingeben",
    it: "Inserisci preferenze o restrizioni",
  },
  "gerar receita exclusiva": {
    en: "Generate Exclusive Recipe",
    es: "Generar Receta Exclusiva",
    fr: "Générer Recette Exclusive",
    de: "Exklusives Rezept Generieren",
    it: "Genera Ricetta Esclusiva",
  },
  "gerando receita...": {
    en: "Generating recipe...",
    es: "Generando receta...",
    fr: "Génération de la recette...",
    de: "Rezept wird generiert...",
    it: "Generazione ricetta in corso...",
  },
  "refeições planejadas": {
    en: "Planned Meals",
    es: "Comidas Planificadas",
    fr: "Repas Planifiés",
    de: "Geplante Mahlzeiten",
    it: "Pasti Pianificati",
  },
  "adicionar refeição": {
    en: "Add Meal",
    es: "Agregar Comida",
    fr: "Ajouter un Repas",
    de: "Mahlzeit Hinzufügen",
    it: "Aggiungi Pasto",
  },
  "gerar plano semanal": {
    en: "Generate Weekly Plan",
    es: "Generar Plan Semanal",
    fr: "Générer Plan Semainier",
    de: "Wochenplan Generieren",
    it: "Genera Piano Settimanale",
  },
  "lista de compras inteligente": {
    en: "Smart Shopping List",
    es: "Lista de Compras Inteligente",
    fr: "Liste de Courses Intelligente",
    de: "Intelligente Einkaufsliste",
    it: "Lista della Spesa Intelligente",
  },
  "itens pendentes": {
    en: "Pending Items",
    es: "Artículos Pendientes",
    fr: "Articles En Attente",
    de: "Ausstehende Artikel",
    it: "Articoli in Sospeso",
  },
  "itens comprados": {
    en: "Purchased Items",
    es: "Artículos Comprados",
    fr: "Articles Achetés",
    de: "Gekaufte Artikel",
    it: "Articoli Acquistati",
  },
  "adicionar item": {
    en: "Add Item",
    es: "Agregar Artículo",
    fr: "Ajouter Article",
    de: "Artikel Hinzufügen",
    it: "Aggiungi Articolo",
  },
  "limpar lista": {
    en: "Clear List",
    es: "Limpiar Lista",
    fr: "Vider la Liste",
    de: "Liste Leeren",
    it: "Svuota Lista",
  },
  "compartilhar lista": {
    en: "Share List",
    es: "Compartir Lista",
    fr: "Partager la Liste",
    de: "Liste Teilen",
    it: "Condividi Lista",
  },
  "exportar pdf": {
    en: "Export PDF",
    es: "Exportar PDF",
    fr: "Exporter en PDF",
    de: "PDF Exportieren",
    it: "Esporta PDF",
  },
  "tire uma foto do seu prato": {
    en: "Take a photo of your plate",
    es: "Toma una foto de tu plato",
    fr: "Prenez une photo de votre assiette",
    de: "Fotografieren Sie Ihren Teller",
    it: "Scatta una foto del tuo piatto",
  },
  "analisando seu prato com ia...": {
    en: "Analyzing your plate with AI...",
    es: "Analizando tu plato con IA...",
    fr: "Analyse de votre assiette par IA...",
    de: "Teller wird mit KI analysiert...",
    it: "Analisi del piatto con IA in corso...",
  },
  "pontuação nutricional": {
    en: "NutriScore",
    es: "Puntuación Nutricional",
    fr: "Score Nutritionnel",
    de: "Nährwert-Score",
    it: "Punteggio Nutrizionale",
  },
  "itens na geladeira": {
    en: "Items in Fridge",
    es: "Artículos en el Refrigerador",
    fr: "Articles dans le Frigo",
    de: "Artikel im Kühlschrank",
    it: "Articoli nel Frigorifero",
  },
  "adicionar alimento": {
    en: "Add Food",
    es: "Agregar Alimento",
    fr: "Ajouter un Aliment",
    de: "Lebensmittel Hinzufügen",
    it: "Aggiungi Alimento",
  },
  "data de validade": {
    en: "Expiration Date",
    es: "Fecha de Vencimiento",
    fr: "Date d'Expiration",
    de: "Ablaufdatum",
    it: "Data di Scadenza",
  },
  "vence em breve": {
    en: "Expiring soon",
    es: "Vence pronto",
    fr: "Expire bientôt",
    de: "Läuft bald ab",
    it: "Scade a breve",
  },
  "receitas com o que tenho": {
    en: "Recipes with what I have",
    es: "Recetas con lo que tengo",
    fr: "Recettes avec ce que j'ai",
    de: "Rezepte mit vorhandenen Zutaten",
    it: "Ricette con quello che ho",
  },
  "aproveitamento 100%": {
    en: "100% Zero Waste",
    es: "Aprovechamiento 100%",
    fr: "100% Zéro Gaspillage",
    de: "100% Verwertung",
    it: "100% Zero Sprechi",
  },
  "meu perfil": {
    en: "My Profile",
    es: "Mi Perfil",
    fr: "Mon Profil",
    de: "Mein Profil",
    it: "Il Mio Profilo",
  },
  "peso atual": {
    en: "Current Weight",
    es: "Peso Actual",
    fr: "Poids Actuel",
    de: "Aktuelles Gewicht",
    it: "Peso Attuale",
  },
  "meta de peso": {
    en: "Target Weight",
    es: "Meta de Peso",
    fr: "Poids Cible",
    de: "Zielgewicht",
    it: "Peso Obiettivo",
  },
  "altura": {
    en: "Height",
    es: "Altura",
    fr: "Taille",
    de: "Größe",
    it: "Altezza",
  },
  "idade": {
    en: "Age",
    es: "Edad",
    fr: "Âge",
    de: "Alter",
    it: "Età",
  },
  "nível de atividade": {
    en: "Activity Level",
    es: "Nivel de Actividad",
    fr: "Niveau d'Activité",
    de: "Aktivitätslevel",
    it: "Livello di Attività",
  },
  "salvar perfil": {
    en: "Save Profile",
    es: "Guardar Perfil",
    fr: "Enregistrer Profil",
    de: "Profil Speichern",
    it: "Salva Profilo",
  },
  "preferências alimentares": {
    en: "Dietary Preferences",
    es: "Preferencias Alimentarias",
    fr: "Préférences Alimentaires",
    de: "Ernährungspräferenzen",
    it: "Preferenze Alimentari",
  },
  "alergias e intolerâncias": {
    en: "Allergies & Intolerances",
    es: "Alergias e Intolerancias",
    fr: "Allergies et Intolérances",
    de: "Allergien & Unverträglichkeiten",
    it: "Allergie e Intolleranze",
  },
  "treino do dia": {
    en: "Workout of the Day",
    es: "Entrenamiento del Día",
    fr: "Entraînement du Jour",
    de: "Training des Tages",
    it: "Allenamento del Giorno",
  },
  "iniciar treino": {
    en: "Start Workout",
    es: "Iniciar Entrenamiento",
    fr: "Commencer l'Entraînement",
    de: "Training Starten",
    it: "Inizia Allenamento",
  },
  "exercícios": {
    en: "Exercises",
    es: "Ejercicios",
    fr: "Exercices",
    de: "Übungen",
    it: "Esercizi",
  },
  "séries": {
    en: "Sets",
    es: "Series",
    fr: "Séries",
    de: "Sätze",
    it: "Serie",
  },
  "repetições": {
    en: "Reps",
    es: "Repeticiones",
    fr: "Répétitions",
    de: "Wiederholungen",
    it: "Ripetizioni",
  },
  "descanso": {
    en: "Rest",
    es: "Descanso",
    fr: "Repos",
    de: "Pause",
    it: "Riposo",
  },
  "concluir exercício": {
    en: "Complete Exercise",
    es: "Completar Ejercicio",
    fr: "Terminer l'Exercice",
    de: "Übung Abschließen",
    it: "Completa Esercizio",
  },
  "como você está se sentindo hoje?": {
    en: "How are you feeling today?",
    es: "¿Cómo te sientes hoy?",
    fr: "Comment vous sentez-vous aujourd'hui ?",
    de: "Wie fühlen Sie sich heute?",
    it: "Come ti senti oggi?",
  },
  "fome emocional vs física": {
    en: "Emotional vs Physical Hunger",
    es: "Hambre Emocional vs Física",
    fr: "Faim Émotionnelle vs Physique",
    de: "Emotionaler vs. physischer Hunger",
    it: "Fame Emotiva vs Fisica",
  },
  "antes e depois": {
    en: "Before & After",
    es: "Antes y Después",
    fr: "Avant et Après",
    de: "Vorher & Nachher",
    it: "Prima e Dopo",
  },
  "comparar fotos": {
    en: "Compare Photos",
    es: "Comparar Fotos",
    fr: "Comparer les Photos",
    de: "Fotos Vergleichen",
    it: "Confronta Foto",
  },
  "adicionar nova foto": {
    en: "Add New Photo",
    es: "Agregar Nueva Foto",
    fr: "Ajouter Nouvelle Photo",
    de: "Neues Foto Hinzufügen",
    it: "Aggiungi Nuova Foto",
  },
  "chás e infusões": {
    en: "Teas & Infusions",
    es: "Tés e Infusiones",
    fr: "Thés et Infusions",
    de: "Tees & Aufgüsse",
    it: "Tè e Infusi",
  },
  "como preparar": {
    en: "How to Prepare",
    es: "Cómo Preparar",
    fr: "Comment Préparer",
    de: "Zubereitung",
    it: "Come Preparare",
  },
  "minhas plantas": {
    en: "My Plants",
    es: "Mis Plantas",
    fr: "Mes Plantes",
    de: "Meine Pflanzen",
    it: "Le Mie Piante",
  },
  "colheita": {
    en: "Harvest",
    es: "Cosecha",
    fr: "Récolte",
    de: "Ernte",
    it: "Raccolta",
  },
  "sacolão & hortifruti": {
    en: "Grocery & Fresh Market",
    es: "Verdulería y Frutas",
    fr: "Primeur et Marché Frais",
    de: "Obst- & Gemüsemarkt",
    it: "Ortofrutta e Mercato Fresco",
  },
  "seu sacolão": {
    en: "Your Market",
    es: "Tu Mercado",
    fr: "Votre Marché",
    de: "Ihr Markt",
    it: "Il Tuo Mercato",
  },
  "possui um sacolão ou hortifruti?": {
    en: "Do you own a market or grocery store?",
    es: "¿Tienes una verdulería o frutería?",
    fr: "Possédez-vous un primeur ou une épicerie ?",
    de: "Haben Sie einen Obst- oder Gemüseladen?",
    it: "Possiedi un negozio ortofrutticolo?",
  },
  "trabalhe com entregas?": {
    en: "Do you work with deliveries?",
    es: "¿Trabajas con entregas?",
    fr: "Travaillez-vous avec des livraisons ?",
    de: "Arbeiten Sie mit Lieferungen?",
    it: "Lavori con le consegne?",
  },
  "fontes indexadas": {
    en: "Indexed Sources",
    es: "Fuentes Indexadas",
    fr: "Sources Indexées",
    de: "Indexierte Quellen",
    it: "Fonti Indicizzate",
  },
  "dica de quem entende:": {
    en: "Expert tip:",
    es: "Consejo de experto:",
    fr: "Conseil de spécialiste :",
    de: "Expertentipp:",
    it: "Consiglio dell'esperto:",
  },
  "3 dicas para este prato:": {
    en: "3 tips for this meal:",
    es: "3 consejos para este plato:",
    fr: "3 conseils pour ce plat :",
    de: "3 Tipps für diese Mahlzeit:",
    it: "3 consigli per questo piatto:",
  },
  "lembre-se:": {
    en: "Remember:",
    es: "Recuerda:",
    fr: "Rappelez-vous :",
    de: "Denken Sie daran:",
    it: "Ricorda:",
  },
  "scanner de despensa inteligente": {
    en: "Smart Pantry Scanner",
    es: "Escáner de Despensa Inteligente",
    fr: "Scanner de Garde-Manger Intelligent",
    de: "Intelligenter Vorratskammer-Scanner",
    it: "Scanner Dispensa Intelligente",
  },
  "estatísticas de poder": {
    en: "Power Statistics",
    es: "Estadísticas de Poder",
    fr: "Statistiques de Puissance",
    de: "Kraft-Statistiken",
    it: "Statistiche di Potenza",
  },
  "jornada de conquistas": {
    en: "Achievement Journey",
    es: "Viaje de Logros",
    fr: "Parcours des Succès",
    de: "Erfolgsreise",
    it: "Percorso Traguardi",
  },
  "como ganhar mais pontos?": {
    en: "How to earn more points?",
    es: "¿Cómo ganar más puntos?",
    fr: "Comment gagner plus de points ?",
    de: "Wie man mehr Punkte verdient?",
    it: "Come guadagnare più punti?",
  },
  "deixe seu feedback": {
    en: "Leave your Feedback",
    es: "Deja tu Comentario",
    fr: "Laissez votre Avis",
    de: "Feedback Hinterlassen",
    it: "Lascia il tuo Feedback",
  },
  "erros comuns a evitar": {
    en: "Common Mistakes to Avoid",
    es: "Errores Comunes a Evitar",
    fr: "Erreurs Courantes à Éviter",
    de: "Häufige Fehler vermeiden",
    it: "Errori Comuni da Evitare",
  },
  "protocolo de séries e repetições": {
    en: "Sets and Reps Protocol",
    es: "Protocolo de Series y Repeticiones",
    fr: "Protocole de Séries et Répétitions",
    de: "Satz- und Wiederholungsprotokoll",
    it: "Protocollo Serie e Ripetizioni",
  },
  "escanear ingredientes": {
    en: "Scan Ingredients",
    es: "Escanear Ingredientes",
    fr: "Scanner les Ingrédients",
    de: "Zutaten Scannen",
    it: "Scansiona Ingredienti",
  },
  "conecte seu histórico de pratos": {
    en: "Connect Your Plate History",
    es: "Conecta tu Historial de Platos",
    fr: "Connectez Votre Historique de Plats",
    de: "Verbinden Sie Ihren Mahlzeitenverlauf",
    it: "Connetti la Cronologia Piatti",
  },
  "conectar seu histórico de pratos": {
    en: "Connect Your Plate History",
    es: "Conectar tu Historial de Platos",
    fr: "Connecter Votre Historique de Plats",
    de: "Mahlzeitenverlauf Verbinden",
    it: "Connetti Cronologia Piatti",
  },
  "dica proativa": {
    en: "Proactive Tip",
    es: "Consejo Proactivo",
    fr: "Conseil Proactif",
    de: "Proaktiver Tipp",
    it: "Consiglio Proattivo",
  },
  "recomendações adaptadas aos seus registros e objetivo": {
    en: "Recommendations tailored to your logs and goal",
    es: "Recomendaciones adaptadas a tus registros y objetivo",
    fr: "Recommandations adaptées à vos journaux et objectifs",
    de: "Empfehlungen angepasst an Ihre Einträge und Ziele",
    it: "Raccomandazioni adattate ai tuoi registri e obiettivi",
  },
  "histórico conectado": {
    en: "History Connected",
    es: "Historial Conectado",
    fr: "Historique Connecté",
    de: "Verlauf Verbunden",
    it: "Cronologia Connessa",
  },
  "como dica rápida para seu objetivo de perda de peso: ao registrar seu almoço, seu jantar poderá ser calibrado automaticamente para ser mais leve ou volumoso.": {
    en: "Quick tip for your weight loss goal: when you log your lunch, your dinner can be automatically calibrated to be lighter or more filling.",
    es: "Como consejo rápido para tu objetivo de pérdida de peso: al registrar tu almuerzo, tu cena podrá calibrarse automáticamente para ser más ligera o nutritiva.",
    fr: "Astuce rapide pour votre perte de poids : en enregistrant votre déjeuner, votre dîner sera calibré automatiquement pour être plus léger ou plus copieux.",
    de: "Schnelltipp für Ihr Abnehmziel: Wenn Sie Ihr Mittagessen erfassen, kann Ihr Abendessen automatisch leichter kalibriert werden.",
    it: "Consiglio rapido per il tuo obiettivo di perdita di peso: registrando il pranzo, la cena potrà essere calibrata automaticamente.",
  },
  "o registro do almoço permite ao nutriai calcular com exatidão os macronutrientes restantes para você terminar o dia no déficit calórico ideal sem passar fome.": {
    en: "Logging your lunch allows NutriAI to accurately calculate remaining macronutrients so you finish the day in the ideal calorie deficit without going hungry.",
    es: "Registrar el almuerzo le permite a NutriAI calcular con precisión los macronutrientes restantes para terminar el día en el déficit calórico ideal sin pasar hambre.",
    fr: "Enregistrer le déjeuner permet à NutriAI de calculer avec précision les macronutriments restants pour rester en déficit sans avoir faim.",
    de: "Die Erfassung des Mittagessens ermöglicht NutriAI die genaue Berechnung der verbleibenden Makronährstoffe ohne Hungergefühl.",
    it: "Registrare il pranzo consente a NutriAI di calcolare con precisione i macronutrienti rimanenti per rimanere in deficit senza fame.",
  },
  "registrar almoço agora": {
    en: "Log Lunch Now",
    es: "Registrar Almuerzo Ahora",
    fr: "Enregistrer Déjeuner Maintenant",
    de: "Mittagessen Jetzt Erfassen",
    it: "Registra Pranzo Ora",
  },
  "registrar almoço rápido": {
    en: "Log Quick Lunch",
    es: "Registrar Almuerzo Rápido",
    fr: "Enregistrer Déjeuner Rapide",
    de: "Schnelles Mittagessen Erfassen",
    it: "Registra Pranzo Rapido",
  },
  "almoço registrado • jantar leve sugerido": {
    en: "Lunch Logged • Light Dinner Suggested",
    es: "Almuerzo Registrado • Cena Ligera Sugerida",
    fr: "Déjeuner Enregistré • Dîner Léger Suggéré",
    de: "Mittagessen Erfasst • Leichtes Abendessen Vorgeschlagen",
    it: "Pranzo Registrato • Cena Leggera Suggerita",
  },
  "almoço registrado • jantar anabólico": {
    en: "Lunch Logged • Anabolic Dinner",
    es: "Almuerzo Registrado • Cena Anabólica",
    fr: "Déjeuner Enregistré • Dîner Anabolique",
    de: "Mittagessen Erfasst • Anaboles Abendessen",
    it: "Pranzo Registrato • Cena Anabolica",
  },
  "almoço registrado • jantar digestivo": {
    en: "Lunch Logged • Digestive Dinner",
    es: "Almuerzo Registrado • Cena Digestiva",
    fr: "Déjeuner Enregistré • Dîner Digestif",
    de: "Mittagessen Erfasst • Verdauungsfreundliches Abendessen",
    it: "Pranzo Registrato • Cena Digestiva",
  },
  "atualizar dica com ia": {
    en: "Refresh tip with AI",
    es: "Actualizar consejo con IA",
    fr: "Actualiser conseil avec IA",
    de: "Tipp mit KI aktualisieren",
    it: "Aggiorna consiglio con IA",
  },
  "dica anterior": {
    en: "Previous tip",
    es: "Consejo anterior",
    fr: "Conseil précédent",
    de: "Vorheriger Tipp",
    it: "Consiglio precedente",
  },
  "próxima dica": {
    en: "Next tip",
    es: "Siguiente consejo",
    fr: "Conseil suivant",
    de: "Nächster Tipp",
    it: "Prossimo consiglio",
  },
  "nutricoach 360°": {
    en: "NutriCoach 360°",
    es: "NutriCoach 360°",
    fr: "NutriCoach 360°",
    de: "NutriCoach 360°",
    it: "NutriCoach 360°",
  },
  "seu metabolismo está operando em padrão ótimo hoje. lembre-se de manter a hidratação contínua.": {
    en: "Your metabolism is operating at optimal levels today. Remember to stay hydrated throughout the day.",
    es: "Tu metabolismo está funcionando en un nivel óptimo hoy. Recuerda mantenerte hidratado.",
    fr: "Votre métabolisme fonctionne à un niveau optimal aujourd'hui. N'oubliez pas de bien vous hydrater.",
    de: "Ihr Stoffwechsel läuft heute optimal. Denken Sie daran, ausreichend zu trinken.",
    it: "Il tuo metabolismo funziona a livelli ottimali oggi. Ricorda di mantenerti idratato.",
  },
  "sua meta de hidratação precisa de 600ml para ser concluída hoje.": {
    en: "Your hydration goal needs 600ml to be completed today.",
    es: "Tu meta de hidratación necesita 600ml para completarse hoy.",
    fr: "Votre objectif d'hydratation a besoin de 600ml pour être atteint aujourd'hui.",
    de: "Ihr Trinkziel benötigt heute noch 600ml zur Fertigstellung.",
    it: "Il tuo obiettivo di idratazione ha bisogno di 600ml per essere completato oggi.",
  },
  "ingestão de proteínas recomendada para o pós-treino: 35g.": {
    en: "Recommended post-workout protein intake: 35g.",
    es: "Ingesta de proteína recomendada post-entrenamiento: 35g.",
    fr: "Apport en protéines recommandé après l'entraînement : 35g.",
    de: "Empfohlene Proteinzufuhr nach dem Training: 35g.",
    it: "Assunzione proteica consigliata post-allenamento: 35g.",
  },
  "caminhada leve de 20 min recomendada para estabilizar glicemia.": {
    en: "Light 20-min walk recommended to stabilize blood sugar.",
    es: "Caminata ligera de 20 min recomendada para estabilizar glucemia.",
    fr: "Marche légère de 20 min recommandée pour stabiliser la glycémie.",
    de: "Leichter 20-minütiger Spaziergang zur Blutzuckerstabilisierung empfohlen.",
    it: "Camminata leggera di 20 min consigliata per stabilizzare la glicemia.",
  },
  "qualidade do sono ontem atingiu 88%. excelente recuperação corporal!": {
    en: "Sleep quality last night reached 88%. Excellent physical recovery!",
    es: "La calidad del sueño anoche alcanzó el 88%. ¡Excelente recuperación corporal!",
    fr: "La qualité du sommeil hier a atteint 88%. Excellente récupération physique !",
    de: "Schlafqualität erreichte gestern 88%. Ausgezeichnete Erholung!",
    it: "La qualità del sonno ieri ha raggiunto l'88%. Ottimo recupero corporeo!",
  },
  "pratos rápidos ia": {
    en: "AI Quick Dishes",
    es: "Platos Rápidos IA",
    fr: "Plats Rapides IA",
    de: "KI Schnelle Gerichte",
    it: "Piatti Rapidi IA",
  },
  "3 opções em 1 toque": {
    en: "3 options in 1 tap",
    es: "3 opciones en 1 toque",
    fr: "3 options en 1 clic",
    de: "3 Optionen mit 1 Tipp",
    it: "3 opzioni in 1 tocco",
  },
  "receitas com ia": {
    en: "AI Recipes",
    es: "Recetas con IA",
    fr: "Recettes par IA",
    de: "KI-Rezepte",
    it: "Ricette IA",
  },
  "geradas sob medida": {
    en: "Tailored to you",
    es: "Generadas a tu medida",
    fr: "Générées sur mesure",
    de: "Maßgeschneidert generiert",
    it: "Generate su misura",
  },
  "nutricoach ia": {
    en: "AI NutriCoach",
    es: "NutriCoach IA",
    fr: "NutriCoach IA",
    de: "KI-NutriCoach",
    it: "NutriCoach IA",
  },
  "análise de dieta 24/7": {
    en: "24/7 diet analysis",
    es: "Análisis de dieta 24/7",
    fr: "Analyse régime 24/7",
    de: "24/7 Ernährungsanalyse",
    it: "Analisi dieta 24/7",
  },
  "scanner de prato": {
    en: "Plate Scanner",
    es: "Escáner de Plato",
    fr: "Scanner d'Assiette",
    de: "Teller-Scanner",
    it: "Scanner Piatto",
  },
  "fotografe e analise": {
    en: "Snap & analyze",
    es: "Fotografía y analiza",
    fr: "Photographiez et analysez",
    de: "Fotografieren & analysieren",
    it: "Fotografa e analizza",
  },
  "combine opções de fora": {
    en: "Combine dining out",
    es: "Combina opciones de fuera",
    fr: "Combinez vos sorties",
    de: "Auswärtsessen kombinieren",
    it: "Combina opzioni fuori",
  },
  "treino personalizado": {
    en: "Custom Workout",
    es: "Entrenamiento Personalizado",
    fr: "Entraînement Personnalisé",
    de: "Personalisiertes Training",
    it: "Allenamento Personalizzato",
  },
  "exercícios guiados": {
    en: "Guided exercises",
    es: "Ejercicios guiados",
    fr: "Exercices guidés",
    de: "Geführte Übungen",
    it: "Esercizi guidati",
  },
  "geladeira inteligente": {
    en: "Smart Fridge",
    es: "Refrigerador Inteligente",
    fr: "Frigo Intelligent",
    de: "Smarter Kühlschrank",
    it: "Frigorifero Intelligente",
  },
  "hábitos & sono": {
    en: "Habits & Sleep",
    es: "Hábitos y Sueño",
    fr: "Habitudes et Sommeil",
    de: "Gewohnheiten & Schlaf",
    it: "Abitudini e Sonno",
  },
  "ritmo circadiano": {
    en: "Circadian rhythm",
    es: "Ritmo circadiano",
    fr: "Rythme circadien",
    de: "Zirkadianer Rhythmus",
    it: "Ritmo circadiano",
  },
  "ervas & fitoterapia": {
    en: "Herbs & Phytotherapy",
    es: "Hierbas y Fitoterapia",
    fr: "Herbes et Phytothérapie",
    de: "Kräuter & Phytotherapie",
    it: "Erbe e Fitoterapia",
  },
  "infusões e remédios": {
    en: "Infusions & remedies",
    es: "Infusiones y remedios",
    fr: "Infusions et remèdes",
    de: "Aufgüsse & Heilmittel",
    it: "Infusi e rimedi",
  },
  "marketplace orgânico": {
    en: "Organic Marketplace",
    es: "Mercado Orgánico",
    fr: "Marché Bio",
    de: "Bio-Marktplatz",
    it: "Mercato Biologico",
  },
  "insumos selecionados": {
    en: "Curated ingredients",
    es: "Insumos seleccionados",
    fr: "Ingrédients sélectionnés",
    de: "Ausgewählte Zutaten",
    it: "Ingredienti selezionati",
  },
  "assistente 360°": {
    en: "360° Assistant",
    es: "Asistente 360°",
    fr: "Assistant 360°",
    de: "360° Assistent",
    it: "Assistente 360°",
  },
  "pratos rápidos": {
    en: "Quick Dishes",
    es: "Platos Rápidos",
    fr: "Plats Rapides",
    de: "Schnelle Gerichte",
    it: "Piatti Rapidi",
  },
  "coach ia": {
    en: "AI Coach",
    es: "Entrenador IA",
    fr: "Coach IA",
    de: "KI-Coach",
    it: "Coach IA",
  },
  "receitas": {
    en: "Recipes",
    es: "Recetas",
    fr: "Recettes",
    de: "Rezepte",
    it: "Ricette",
  },
  "geladeira": {
    en: "Fridge",
    es: "Refrigerador",
    fr: "Réfrigérateur",
    de: "Kühlschrank",
    it: "Frigorifero",
  },
  "despensa": {
    en: "Pantry",
    es: "Despensa",
    fr: "Garde-manger",
    de: "Vorratskammer",
    it: "Dispensa",
  },
  "horta": {
    en: "Garden",
    es: "Huerto",
    fr: "Potager",
    de: "Garten",
    it: "Orto",
  },
  "ervas": {
    en: "Herbs",
    es: "Hierbas",
    fr: "Herbes",
    de: "Kräuter",
    it: "Erbe",
  },
  "sucos": {
    en: "Juices",
    es: "Jugos",
    fr: "Jus",
    de: "Säfte",
    it: "Succhi",
  },
  "hábitos": {
    en: "Habits",
    es: "Hábitos",
    fr: "Habitudes",
    de: "Gewohnheiten",
    it: "Abitudini",
  },
  "notas": {
    en: "Notes",
    es: "Notas",
    fr: "Notes",
    de: "Notizen",
    it: "Note",
  },
  "pressão": {
    en: "Blood Pressure",
    es: "Presión",
    fr: "Pression",
    de: "Blutdruck",
    it: "Pressione",
  },
  "glicemia": {
    en: "Glucose",
    es: "Glucemia",
    fr: "Glycémie",
    de: "Blutzucker",
    it: "Glicemia",
  },
  "scanner": {
    en: "Scanner",
    es: "Escáner",
    fr: "Scanner",
    de: "Scanner",
    it: "Scanner",
  },
  "alergias": {
    en: "Allergies",
    es: "Alergias",
    fr: "Allergies",
    de: "Allergien",
    it: "Allergie",
  },
  "comparar": {
    en: "Compare",
    es: "Comparar",
    fr: "Comparer",
    de: "Vergleichen",
    it: "Confronta",
  },
  "mente": {
    en: "Mind",
    es: "Mente",
    fr: "Esprit",
    de: "Geist",
    it: "Mente",
  },
  "prato": {
    en: "Plate",
    es: "Plato",
    fr: "Assiette",
    de: "Teller",
    it: "Piatto",
  },
  "corpo": {
    en: "Body",
    es: "Cuerpo",
    fr: "Corps",
    de: "Körper",
    it: "Corpo",
  },
  "plano": {
    en: "Plan",
    es: "Plan",
    fr: "Plan",
    de: "Plan",
    it: "Piano",
  },
  "compras": {
    en: "Shopping",
    es: "Compras",
    fr: "Courses",
    de: "Einkaufen",
    it: "Spesa",
  },
  "evolução": {
    en: "Evolution",
    es: "Evolución",
    fr: "Évolution",
    de: "Entwicklung",
    it: "Evoluzione",
  },
  "desafio": {
    en: "Challenge",
    es: "Desafío",
    fr: "Défi",
    de: "Herausforderung",
    it: "Sfida",
  },
  "trocas": {
    en: "Swaps",
    es: "Sustituciones",
    fr: "Échanges",
    de: "Tausch",
    it: "Sostituzioni",
  },
  "comi fora": {
    en: "Ate Out",
    es: "Comí Fuera",
    fr: "Manger Dehors",
    de: "Auswärts Essen",
    it: "Mangiato Fuori",
  },
  "restaurante": {
    en: "Restaurant",
    es: "Restaurante",
    fr: "Restaurant",
    de: "Restaurant",
    it: "Ristorante",
  },
  "mercados, sacolões e hortifruti": {
    en: "Markets & Groceries",
    es: "Mercados y Verdulerías",
    fr: "Marchés et Épiceries",
    de: "Märkte & Lebensmittel",
    it: "Mercati e Alimentari",
  },
  "mapa": {
    en: "Map",
    es: "Mapa",
    fr: "Carte",
    de: "Karte",
    it: "Mappa",
  },
  "treinar": {
    en: "Train",
    es: "Entrenar",
    fr: "S'entraîner",
    de: "Trainieren",
    it: "Allenati",
  },
  "bem-estar": {
    en: "Wellness",
    es: "Bienestar",
    fr: "Bien-être",
    de: "Wellness",
    it: "Benessere",
  },
  "academias": {
    en: "Gyms",
    es: "Gimnasios",
    fr: "Salles de Sport",
    de: "Fitnessstudios",
    it: "Palestre",
  },
  "conquistas": {
    en: "Achievements",
    es: "Logros",
    fr: "Succès",
    de: "Erfolge",
    it: "Traguardi",
  },
  "previsão": {
    en: "Prediction",
    es: "Predicción",
    fr: "Prédiction",
    de: "Vorhersage",
    it: "Previsione",
  },
  "perfil": {
    en: "Profile",
    es: "Perfil",
    fr: "Profil",
    de: "Profil",
    it: "Profilo",
  },
  "admin db": {
    en: "Admin DB",
    es: "Admin BD",
    fr: "Admin BD",
    de: "Admin DB",
    it: "Admin DB",
  },
  "premium": {
    en: "Premium",
    es: "Premium",
    fr: "Premium",
    de: "Premium",
    it: "Premium",
  },
  "parceiro": {
    en: "Partner",
    es: "Socio",
    fr: "Partenaire",
    de: "Partner",
    it: "Partner",
  },
  "hidratação": {
    en: "Hydration",
    es: "Hidratación",
    fr: "Hydratation",
    de: "Hydratation",
    it: "Idratazione",
  },
  "calorias": {
    en: "Calories",
    es: "Calorías",
    fr: "Calories",
    de: "Kalorien",
    it: "Calorie",
  },
  "peso & imc": {
    en: "Weight & BMI",
    es: "Peso e IMC",
    fr: "Poids & IMC",
    de: "Gewicht & BMI",
    it: "Peso e IMC",
  },
  "sono": {
    en: "Sleep",
    es: "Sueño",
    fr: "Sommeil",
    de: "Schlaf",
    it: "Sonno",
  },
  "humor": {
    en: "Mood",
    es: "Ánimo",
    fr: "Humeur",
    de: "Stimmung",
    it: "Umore",
  },
  "meta do dia": {
    en: "Daily Goal",
    es: "Meta del Día",
    fr: "Objectif du Jour",
    de: "Tagesziel",
    it: "Obiettivo Giornaliero",
  },
  "consumido": {
    en: "Consumed",
    es: "Consumido",
    fr: "Consommé",
    de: "Verbraucht",
    it: "Consumato",
  },
  "restante": {
    en: "Remaining",
    es: "Restante",
    fr: "Restant",
    de: "Verbleibend",
    it: "Rimanente",
  },
  "abaixo do peso": {
    en: "Underweight",
    es: "Bajo peso",
    fr: "Poids insuffisant",
    de: "Untergewicht",
    it: "Sottopeso",
  },
  "normal": {
    en: "Normal",
    es: "Normal",
    fr: "Normal",
    de: "Normal",
    it: "Normale",
  },
  "sobrepeso": {
    en: "Overweight",
    es: "Sobrepeso",
    fr: "Surpoids",
    de: "Übergewicht",
    it: "Sovrappeso",
  },
  "obesidade": {
    en: "Obesity",
    es: "Obesidad",
    fr: "Obésité",
    de: "Fettleibigkeit",
    it: "Obesità",
  },
  "ótimo": {
    en: "Great",
    es: "Excelente",
    fr: "Super",
    de: "Großartig",
    it: "Ottimo",
  },
  "bom": {
    en: "Good",
    es: "Bueno",
    fr: "Bon",
    de: "Gut",
    it: "Buono",
  },
  "cansado": {
    en: "Tired",
    es: "Cansado",
    fr: "Fatigué",
    de: "Müde",
    it: "Stanco",
  },
  "estressado": {
    en: "Stressed",
    es: "Estresado",
    fr: "Stressé",
    de: "Gestresst",
    it: "Stressato",
  },
};

export function AutoTranslator() {
  const { language: contextLanguage } = useLanguage();
  const { i18n } = useTranslation();
  const activeLang = contextLanguage || i18n.language || 'pt-BR';
  const isTranslatingRef = useRef(false);
  const pendingNodesRef = useRef<Set<Node>>(new Set());
  const batchTimerRef = useRef<any>(null);

  // Build high-performance bidirectional translation dictionary
  const translationMap = useMemo(() => {
    const currentLang = activeLang;
    const cleanLang = currentLang.split('-')[0];
    const isPortuguese = currentLang.startsWith('pt');

    const map = new Map<string, string>();

    const pickTranslation = (translations: Record<string, string>): string | null => {
      if (!translations) return null;
      return translations[currentLang] || translations[cleanLang] || translations['en'] || Object.values(translations)[0] || null;
    };

    // 1. Static high-frequency UI phrases
    for (const [rawPtKey, translations] of Object.entries(STATIC_APP_PHRASES)) {
      const targetText = isPortuguese ? rawPtKey : pickTranslation(translations);
      if (targetText && typeof targetText === 'string') {
        const cleanPt = rawPtKey.toLowerCase().trim();
        map.set(cleanPt, targetText);
        for (const [_, other] of Object.entries(translations)) {
          if (other) map.set(other.toLowerCase().trim(), targetText);
        }
      }
    }

    // 2. RUNTIME_DICTIONARY
    for (const [rawPtKey, translations] of Object.entries(RUNTIME_DICTIONARY)) {
      if (typeof rawPtKey !== 'string') continue;
      const targetText = isPortuguese ? rawPtKey : pickTranslation(translations);
      if (targetText && typeof targetText === 'string') {
        const cleanPtKey = rawPtKey.toLowerCase().trim();
        map.set(cleanPtKey, targetText);
        for (const [_, otherLangText] of Object.entries(translations)) {
          if (otherLangText && typeof otherLangText === 'string') {
            map.set(otherLangText.toLowerCase().trim(), targetText);
          }
        }
      }
    }

    // 3. Locale bundles
    const targetBundle = localesMap[currentLang] || localesMap[cleanLang] || localesMap['en-US'] || localesMap['pt-BR'] || {};
    const ptBundle = localesMap['pt-BR'] || {};

    const allKeys = new Set<string>();
    for (const bundle of Object.values(localesMap)) {
      if (bundle && typeof bundle === 'object') {
        Object.keys(bundle).forEach((k) => allKeys.add(k));
      }
    }

    for (const key of allKeys) {
      const targetText = isPortuguese
        ? ptBundle[key] || key
        : targetBundle[key] || localesMap['en-US']?.[key] || ptBundle[key] || key;

      if (targetText && typeof targetText === 'string') {
        map.set(key.toLowerCase().trim(), targetText);
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
    const isRtl = currentLang.startsWith('ar') || currentLang.startsWith('he');

    // Synchronize HTML element attributes and layout class
    if (typeof document !== 'undefined') {
      document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
      document.documentElement.lang = currentLang;
      if (document.body) {
        if (isRtl) {
          document.body.classList.add('rtl-layout');
          document.body.classList.remove('ltr-layout');
        } else {
          document.body.classList.remove('rtl-layout');
          document.body.classList.add('ltr-layout');
        }
      }
    }

    // Comprehensive string translation engine with segment parsing
    const translateString = (str: string): string => {
      if (!str || typeof str !== 'string') return str;
      const trimmed = str.trim();
      if (!trimmed) return str;

      if (isPortuguese) {
        return str;
      }

      // Check dynamic cache first
      const dynKey = `${currentLang}:::${trimmed}`;
      if (dynamicTranslationCache.has(dynKey)) {
        const cached = dynamicTranslationCache.get(dynKey)!;
        const prefix = str.slice(0, str.indexOf(trimmed));
        const suffix = str.slice(str.indexOf(trimmed) + trimmed.length);
        return prefix + cached + suffix;
      }

      const prefix = str.slice(0, str.indexOf(trimmed));
      const suffix = str.slice(str.indexOf(trimmed) + trimmed.length);

      // Helper to translate single phrase or token
      const translatePhrase = (p: string): string => {
        const pTrim = p.trim();
        if (!pTrim) return p;
        const pLower = pTrim.toLowerCase();
        if (translationMap.has(pLower)) return translationMap.get(pLower)!;
        const dictRes = lookupRuntimeTranslation(pTrim, currentLang);
        if (dictRes) return dictRes;
        return p;
      };

      // 1. Direct exact match
      const lower = trimmed.toLowerCase();
      if (translationMap.has(lower)) {
        return prefix + translationMap.get(lower)! + suffix;
      }

      // Direct lookup in runtime dictionary helper
      const dictMatch = lookupRuntimeTranslation(trimmed, currentLang);
      if (dictMatch && dictMatch !== trimmed) {
        return prefix + dictMatch + suffix;
      }

      // 2. Surrounding emojis & icons
      const emojiRegex = /^([\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s•\-\+—\(\)\[\]\{\}:;!?#@]+)(.*?)([\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s•\-\+—\(\)\[\]\{\}:;!?#@]+)?$/u;
      const matchEmoji = trimmed.match(emojiRegex);
      if (matchEmoji && matchEmoji[2] && matchEmoji[2].trim().length > 0) {
        const coreText = matchEmoji[2].trim();
        const translatedCore = translatePhrase(coreText);
        if (translatedCore !== coreText) {
          const lead = matchEmoji[1] || '';
          const trail = matchEmoji[3] || '';
          return prefix + lead + translatedCore + trail + suffix;
        }
      }

      // 3. Trailing punctuation
      const punctRegex = /^(.+?)([:!?,.;]+)$/;
      const matchPunct = trimmed.match(punctRegex);
      if (matchPunct && matchPunct[1]) {
        const coreText = matchPunct[1].trim();
        const translatedCore = translatePhrase(coreText);
        if (translatedCore !== coreText) {
          return prefix + translatedCore + matchPunct[2] + suffix;
        }
      }

      // 4. Parentheses
      if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
        const inner = trimmed.slice(1, -1).trim();
        const translatedInner = translatePhrase(inner);
        if (translatedInner !== inner) {
          return prefix + `(${translatedInner})` + suffix;
        }
      }

      // 5. Multi-sentence translation (split paragraphs into individual sentences)
      const sentenceRegex = /([.!?]+(?:\s+|\n+|$))/;
      const sentenceTokens = trimmed.split(sentenceRegex);
      if (sentenceTokens.length > 2) {
        let translatedAnySentence = false;
        const resSentences: string[] = [];
        for (let i = 0; i < sentenceTokens.length; i += 2) {
          const sent = sentenceTokens[i];
          const delim = sentenceTokens[i + 1] || '';
          const sTrim = sent.trim();
          if (sTrim) {
            const sTrans = translatePhrase(sTrim);
            if (sTrans !== sTrim) {
              translatedAnySentence = true;
              const sp = sent.slice(0, sent.indexOf(sTrim));
              const ss = sent.slice(sent.indexOf(sTrim) + sTrim.length);
              resSentences.push(sp + sTrans + ss + delim);
            } else {
              resSentences.push(sent + delim);
            }
          } else {
            resSentences.push(sent + delim);
          }
        }
        if (translatedAnySentence) {
          return prefix + resSentences.join('') + suffix;
        }
      }

      // 6. Colon-based translation (e.g. "Sugerido: Leve 🥗")
      if (trimmed.includes(': ')) {
        const colonIdx = trimmed.indexOf(': ');
        const left = trimmed.slice(0, colonIdx).trim();
        const right = trimmed.slice(colonIdx + 2).trim();
        const leftTrans = translatePhrase(left);
        const rightTrans = translatePhrase(right);
        if (leftTrans !== left || rightTrans !== right) {
          return prefix + `${leftTrans}: ${rightTrans}` + suffix;
        }
      }

      // 7. Segment-based translation for compound phrases (e.g. "Almoço Registrado • Jantar Leve Sugerido")
      if (trimmed.includes(' • ') || trimmed.includes(' | ') || trimmed.includes(' — ') || (trimmed.includes(' - ') && !/^\d+ - \d+$/.test(trimmed))) {
        const delimiter = trimmed.includes(' • ')
          ? ' • '
          : trimmed.includes(' | ')
          ? ' | '
          : trimmed.includes(' — ')
          ? ' — '
          : ' - ';
        const parts = trimmed.split(delimiter);
        let hasTranslatedPart = false;
        const translatedParts = parts.map((part) => {
          const subTrimmed = part.trim();
          if (!subTrimmed) return part;
          const subTrans = translatePhrase(subTrimmed);
          if (subTrans !== subTrimmed) {
            hasTranslatedPart = true;
            return subTrans;
          }
          return part;
        });

        if (hasTranslatedPart) {
          return prefix + translatedParts.join(delimiter) + suffix;
        }
      }

      return str;
    };

    // Dispatch background batch translation for complex untranslated sentences/paragraphs
    const flushPendingTranslations = async () => {
      if (isPortuguese || pendingNodesRef.current.size === 0) return;

      const nodes = Array.from(pendingNodesRef.current);
      pendingNodesRef.current.clear();

      const uniqueTexts: string[] = [];
      const textToNodes = new Map<string, Node[]>();

      nodes.forEach((node) => {
        const orig = originalTextMap.get(node);
        if (orig) {
          const clean = orig.trim();
          // Filter out numbers, pure symbols, or very short tokens
          if (clean.length > 2 && /[a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/.test(clean)) {
            if (!textToNodes.has(clean)) {
              textToNodes.set(clean, []);
              uniqueTexts.push(clean);
            }
            textToNodes.get(clean)!.push(node);
          }
        }
      });

      if (uniqueTexts.length === 0) return;

      // Check localStorage/sessionStorage cache and offline dictionary
      const neededTexts: string[] = [];
      uniqueTexts.forEach((text) => {
        const k = `${currentLang}:::${text}`;
        let cached = dynamicTranslationCache.get(k);
        if (!cached && typeof localStorage !== 'undefined') {
          try {
            cached = localStorage.getItem(`nutri_tr_${k}`) || undefined;
            if (cached) dynamicTranslationCache.set(k, cached);
          } catch (e) {}
        }
        if (!cached) {
          const dictRes = lookupRuntimeTranslation(text, currentLang);
          if (dictRes && dictRes !== text) {
            cached = dictRes;
            dynamicTranslationCache.set(k, cached);
          }
        }
        if (cached) {
          const targetNodes = textToNodes.get(text) || [];
          targetNodes.forEach((node) => {
            const raw = originalTextMap.get(node) || '';
            const p = raw.slice(0, raw.indexOf(text));
            const s = raw.slice(raw.indexOf(text) + text.length);
            node.nodeValue = p + cached + s;
          });
        } else {
          neededTexts.push(text);
        }
      });

      if (neededTexts.length === 0) return;
      if (Date.now() < clientBatchCooldownUntil) return;

      try {
        const response = await fetch('/api/translate-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: neededTexts.slice(0, 30), targetLang: currentLang }),
        });

        if (response.status === 429) {
          clientBatchCooldownUntil = Date.now() + 60000;
          return;
        }

        if (response.ok) {
          const data = await response.json();
          const translations: string[] = data?.translations || [];

          neededTexts.forEach((text, i) => {
            const translated = translations[i];
            if (translated && translated !== text) {
              const k = `${currentLang}:::${text}`;
              dynamicTranslationCache.set(k, translated);
              try {
                if (typeof localStorage !== 'undefined') {
                  localStorage.setItem(`nutri_tr_${k}`, translated);
                }
              } catch (e) {}

              const targetNodes = textToNodes.get(text) || [];
              targetNodes.forEach((node) => {
                const raw = originalTextMap.get(node) || '';
                const p = raw.slice(0, raw.indexOf(text));
                const s = raw.slice(raw.indexOf(text) + text.length);
                node.nodeValue = p + translated + s;
              });
            }
          });
        }
      } catch (err) {
        // graceful offline fallback
      }
    };

    const scheduleBatchTranslation = () => {
      if (batchTimerRef.current) clearTimeout(batchTimerRef.current);
      batchTimerRef.current = setTimeout(flushPendingTranslations, 800);
    };

    // Recursive DOM walker that translates or restores original text
    const walkAndTranslate = (node: Node) => {
      if (!node) return;

      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tagName = el.tagName ? el.tagName.toLowerCase() : '';
        if (['script', 'style', 'iframe', 'canvas', 'noscript', 'code', 'pre'].includes(tagName)) {
          return;
        }

        // Handle attributes
        let attrStore = originalAttrMap.get(el);
        if (!attrStore) {
          attrStore = {};
          originalAttrMap.set(el, attrStore);
        }

        for (const attr of ['placeholder', 'title', 'alt', 'aria-label'] as const) {
          const currentVal = el.getAttribute(attr);
          if (currentVal) {
            if (!attrStore[attr]) {
              attrStore[attr] = currentVal;
            }
            if (isPortuguese) {
              const orig = attrStore[attr];
              if (orig && currentVal !== orig) {
                el.setAttribute(attr, orig);
              }
            } else {
              const trans = translateString(attrStore[attr]);
              if (trans && trans !== currentVal) {
                el.setAttribute(attr, trans);
              }
            }
          }
        }
      }

      // Handle Text Nodes
      if (node.nodeType === Node.TEXT_NODE) {
        let original = originalTextMap.get(node);
        if (!original) {
          original = node.nodeValue || '';
          if (original.trim().length > 0) {
            originalTextMap.set(node, original);
          }
        }

        if (original && original.trim().length > 0) {
          if (isPortuguese) {
            if (node.nodeValue !== original) {
              node.nodeValue = original;
            }
          } else {
            const targetText = translateString(original);
            if (targetText && targetText !== node.nodeValue) {
              node.nodeValue = targetText;
            } else if (targetText === original && original.trim().length > 2) {
              // Untranslated Portuguese sentence/paragraph - queue for batch translation
              pendingNodesRef.current.add(node);
              scheduleBatchTranslation();
            }
          }
        }
      }

      // Traverse children
      let child = node.firstChild;
      while (child) {
        walkAndTranslate(child);
        child = child.nextSibling;
      }
    };

    const runFullScan = () => {
      if (isTranslatingRef.current || typeof document === 'undefined' || !document.body) return;
      try {
        isTranslatingRef.current = true;
        walkAndTranslate(document.body);
      } finally {
        isTranslatingRef.current = false;
      }
    };

    // Staggered scans to catch all initial and dynamically rendered components
    runFullScan();
    const t0 = setTimeout(runFullScan, 0);
    const t1 = setTimeout(runFullScan, 50);
    const t2 = setTimeout(runFullScan, 150);
    const t3 = setTimeout(runFullScan, 350);
    const t4 = setTimeout(runFullScan, 700);
    const t5 = setTimeout(runFullScan, 1200);

    const handleLanguageEvent = () => {
      runFullScan();
      setTimeout(runFullScan, 60);
    };

    window.addEventListener('nutri:language-changed', handleLanguageEvent);
    window.addEventListener('languageChanged', handleLanguageEvent);

    // MutationObserver to translate dynamically rendered components, modals, and toasts
    const observer = new MutationObserver((mutations) => {
      if (isTranslatingRef.current) return;
      isTranslatingRef.current = true;

      try {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
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
              if (isPortuguese) {
                if (targetNode.nodeValue !== original) {
                  targetNode.nodeValue = original;
                }
              } else {
                const targetText = translateString(original);
                if (targetText && targetText !== targetNode.nodeValue) {
                  targetNode.nodeValue = targetText;
                } else if (targetText === original && original.trim().length > 2) {
                  pendingNodesRef.current.add(targetNode);
                  scheduleBatchTranslation();
                }
              }
            }
          } else if (mutation.type === 'attributes') {
            const el = mutation.target as HTMLElement;
            const attr = mutation.attributeName;
            if (attr === 'placeholder' || attr === 'title' || attr === 'alt' || attr === 'aria-label') {
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
                if (isPortuguese) {
                  const orig = attrStore[attr];
                  if (orig && currentVal !== orig) {
                    el.setAttribute(attr, orig);
                  }
                } else {
                  const trans = translateString(attrStore[attr]);
                  if (trans && trans !== currentVal) {
                    el.setAttribute(attr, trans);
                  }
                }
              }
            }
          }
        }
      } finally {
        isTranslatingRef.current = false;
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'alt', 'aria-label'],
    });

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      if (batchTimerRef.current) clearTimeout(batchTimerRef.current);
      window.removeEventListener('nutri:language-changed', handleLanguageEvent);
      window.removeEventListener('languageChanged', handleLanguageEvent);
      observer.disconnect();
    };
  }, [translationMap, activeLang]);

  return null;
}
export default AutoTranslator;
