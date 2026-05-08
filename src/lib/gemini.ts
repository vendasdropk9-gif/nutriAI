import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Recipe, UserProfile, MealPlanDay, EmotionalLog, SmartSwap, DiningOutAnalysis, GoalPrediction, WorkoutSession, Exercise, MasterPlanStrategy, IntakeLog, WorkoutLog, AdaptiveInsight, WeeklyChallenge } from "../types";

export const chatWithAssistant = async (
  profile: UserProfile,
  history: { role: 'user' | 'model', text: string }[],
  userMessage: string
): Promise<{ text: string, action: string, actionData?: any }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const systemInstruction = `Você é a Malu, uma IA superinteligente que atua como uma assistente personalizada de saúde e bem-estar.
SEU COMPORTAMENTO (Voz "Premium Humana", Parceira Constante):
- Você oferece suporte nutricional, motivação diária e adaptação de planos.
- Reconheça o histórico do usuário, adapte as respostas ao contexto dele e forneça recomendações precisas e personalizadas.
- Acompanhe o progresso, ajudando e respondendo dúvidas em tempo real. Adapte as dicas conforme a evolução.
- Converse como uma pessoa real, compassiva, com voz feminina suave e natural. Aja como uma parceira constante na jornada.
- Transforme textos "secos" em falas acolhedoras. NUNCA diga: "Aqui está sua dieta". DICA: "Olha… preparei algo especial pra você hoje."
- Use pausas naturais com reticências ("..."). Isso ajuda no ritmo variável e natural da sua voz.
- Tom: leve, acolhedor, empático. Engaje o usuário com mensagens motivacionais.
- Frases curtas. Sem parágrafos ou listas exaustivas.
- Inicie frases com marcadores de conversa humana: "Olha...", "Sabe...", "Bom...", "Entendi...".
- NUNCA pareça um robô. Nunca seja excessivamente formal.
- Não exagere nos emojis para não atrapalhar o fluxo de áudio.

SOBRE O USUÁRIO:
Biotipo: ${profile.bodyType || 'Não informado'}
Objetivo: ${profile.goals || 'Não informado'}
Rotina: ${profile.routine || 'Não informada'}
Restrições: ${profile.restrictions?.join(', ') || 'Nenhuma'}
Desafio Atual: ${profile.currentChallenge ? profile.currentChallenge.dailyGoal : 'Nenhum'}
Pontuação Geral (Motivação): ${profile.points || 0} XP

HISTÓRICO RECENTE:
- Últimas refeições registradas: ${profile.intakeLogs?.slice(-3).map(l => l.recipeName).join(', ') || 'Nenhuma registrada recentemente'}
- Últimos pesos registrados: ${profile.progressLogs?.slice(-3).map(l => l.weight + 'kg').join(', ') || 'Nenhum'}

AÇÕES QUE VOCÊ PODE DISPARAR (Retorne no JSON no campo action):
- "NAVIGATE": Use quando quiser levar o usuário para uma tela específica. Envie no actionData: { tab: 'plan' | 'trainer' | 'market' | 'prediction' }
- "SHOW_RECIPE": Use quando sugerir que o usuário coma o que está na dieta agora.
- "UPDATE_PLAN": Use quando o usuário pedir para mudar ou gerar o plano/dieta.
- "SHOW_WORKOUT": Use quando sugerir ir treinar.
- "NONE": Para conversas normais ou para dar motivação/dicas diretas.

Lembre-se: Você é uma interface de VOZ superinteligente e humanizada. Responda APENAS o JSON validando o schema.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING },
      action: { type: Type.STRING, enum: ['NONE', 'NAVIGATE', 'SHOW_RECIPE', 'SHOW_WORKOUT', 'UPDATE_PLAN'] },
      actionData: {
        type: Type.OBJECT,
        nullable: true,
        properties: {
          tab: { type: Type.STRING },
          label: { type: Type.STRING }
        }
      }
    },
    required: ["text", "action"]
  };

  try {
    const chat = ai.chats.create({
      model: "gemini-3.1-pro-preview",
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.8,
      }
    });

    // Se history for suportado dessa forma simplificada no SDK... ou precisaremos fazer loop:
    // Porem o SDK do genai permite enviar history na criacao:
    // Mas não temos isso aqui, vamos mandar as mensagens manualmente.
    // Pra simplificar, eu vou mandar tudo concatenado no prompt:
    const stringifiedHistory = history.map(h => `${h.role === 'user' ? 'Usuário' : 'Você'}: ${h.text}`).join('\n');
    
    const finalPrompt = `HISTÓRICO DA CONVERSA:
${stringifiedHistory}

O usuário acabou de dizer: "${userMessage}"
RESPONDA EM JSON.`;

    const response = await chat.sendMessage({ message: finalPrompt });
    const text = response.text;
    if (!text) throw new Error("No response");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Chat Error:", error);
    return {
      text: "Poxa, minha internet falhou aqui. Me conta de novo? 💚",
      action: "NONE"
    };
  }
};

export const generateMasterStrategy = async (
  profile: UserProfile
): Promise<MasterPlanStrategy | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const prompt = `Você é um Nutricionista e Personal Trainer de Alta Performance.
Crie a estratégia nutricional e de treino mestra para este usuário.

DADOS:
Biotipo: ${profile.bodyType}
Metabolismo: ${profile.metabolism}
Objetivo: ${profile.goals}
Rotina: ${profile.routine}
Restrições: ${profile.restrictions?.join(', ')}

Sua tarefa é retornar o plano estratégico.
Responda APENAS em JSON validando o schema.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      dailyCalories: { type: Type.NUMBER },
      macros: {
        type: Type.OBJECT,
        properties: {
          protein: { type: Type.NUMBER },
          carbs: { type: Type.NUMBER },
          fat: { type: Type.NUMBER },
        },
        required: ["protein", "carbs", "fat"],
      },
      workoutFocus: { type: Type.STRING },
      nutritionFocus: { type: Type.STRING },
      adaptiveNotes: { type: Type.STRING },
    },
    required: ["dailyCalories", "macros", "workoutFocus", "nutritionFocus", "adaptiveNotes"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to generate master strategy:", error);
    return null;
  }
};

export const generateWorkout = async (
  profile: UserProfile | null
): Promise<WorkoutSession | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let profileContext = `
- Objetivo: ${profile?.goals || 'Emagrecimento'}
- Nível: ${profile?.activityLevel || 'Sedentário'}
- Limitações: ${profile?.restrictions?.join(", ") || 'Nenhuma informada'}
`;
  if (profile?.masterPlan) {
    profileContext += `- Foco Estratégico (IA): ${profile.masterPlan.workoutFocus}
- Biotipo: ${profile.bodyType}
- Rotina Diária: ${profile.routine}`;
  }

  const prompt = `Gere um treino de calistenia (peso do corpo) personalizado.
  
Perfil do Usuário:
${profileContext}

Regras:
1. Crie uma lista de 5 a 8 exercícios. Adeque o tempo do treino à rotina do usuário se informada.
2. Use nomes em português.
3. Defina 'primaryMuscles' (ex: 'quadriceps', 'chest', 'abs', 'triceps', 'back', 'glutes', 'shoulders') para o modelo 3D.
4. Para cada exercício, inclua um tutorial em 3 passos: Posição Inicial, Execução e Finalização. Em cada passo defina 'animationState' (idle, executing ou tutorial) e 'cameraView' (front, side ou detail).
5. Liste erros comuns e como corrigi-los.
6. Responda APENAS with JSON validando o schema.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      title: { type: Type.STRING },
      totalCalories: { type: Type.NUMBER },
      estimatedDuration: { type: Type.NUMBER },
      exercises: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            muscleGroups: { type: Type.ARRAY, items: { type: Type.STRING } },
            primaryMuscles: { type: Type.ARRAY, items: { type: Type.STRING } },
            reps: { type: Type.NUMBER },
            duration: { type: Type.NUMBER },
            instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
            benefits: { type: Type.STRING },
            tutorialSteps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  animationState: { type: Type.STRING },
                  cameraView: { type: Type.STRING }
                },
                required: ["title", "description", "animationState", "cameraView"]
              }
            },
            commonErrors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  error: { type: Type.STRING },
                  fix: { type: Type.STRING }
                },
                required: ["error", "fix"]
              }
            }
          },
          required: ["id", "name", "description", "difficulty", "muscleGroups", "primaryMuscles", "instructions", "benefits", "tutorialSteps", "commonErrors"],
        },
      },
    },
    required: ["id", "title", "exercises", "totalCalories", "estimatedDuration"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to generate workout:", error);
    return null;
  }
};

export const generateRecipe = async (
  ingredients: string = "",
  profile?: UserProfile | null,
  budgetMode: boolean = false,
  preferences: string = ""
): Promise<Omit<Recipe, "id"> | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let profileText = "Nenhuma restrição específica.";
  if (profile) {
    profileText = `
Restrições fixas: ${profile.restrictions.join(", ") || "Nenhuma"}
Alergias: ${profile.allergies.join(", ") || "Nenhuma"}
Objetivo: ${profile.goals || "Nenhum específico"}
Equipamentos disponíveis: ${profile.equipment.join(", ") || "Todos"}
`;
  }

  const preferencesContext = preferences 
    ? `\nPREFERÊNCIAS/RESTRIÇÕES ADICIONAIS: ${preferences}` 
    : "";

  const budgetContext = budgetMode 
    ? "\nMODO ECONOMIA ATIVADO: Sugira refeições saudáveis com BAIXO CUSTO e ingredientes simples e acessíveis (ex: ovo, aveia, feijão, vegetais de época)." 
    : "";

  const prompt = `Gere uma receita saudável com base nos seguintes parâmetros:
Ingredientes disponíveis: ${ingredients || "Qualquer ingrediente saudável comum"}
Perfil do Usuário: ${profileText}${preferencesContext}${budgetContext}
Certifique-se de priorizar os ingredientes disponíveis. A receita deve ser equilibrada.
Responda APENAS com um objeto JSON.`;

  const recipeSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      name: {
        type: Type.STRING,
        description: "Nome apetitoso da receita",
      },
      description: {
        type: Type.STRING,
        description: "Breve descrição da receita",
      },
      prepTime: {
        type: Type.STRING,
        description: "Tempo total de preparo (ex: 30 min)",
      },
      ingredients: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
        },
        description: "Lista de ingredientes com quantidades",
      },
      instructions: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
        },
        description: "Passo a passo do preparo",
      },
      nutrition: {
        type: Type.OBJECT,
        properties: {
          calories: { type: Type.NUMBER },
          protein: { type: Type.NUMBER },
          carbs: { type: Type.NUMBER },
          fat: { type: Type.NUMBER },
          fiber: { type: Type.NUMBER, description: "Fibras em gramas (opcional)" },
          sugar: { type: Type.NUMBER, description: "Açúcar em gramas (opcional)" },
          vitamins: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Principais vitaminas (ex: Vitamina C, Vitamina B12)" },
          minerals: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Principais minerais (ex: Ferro, Cálcio)" },
        },
        required: ["calories", "protein", "carbs", "fat"],
      },
    },
    required: ["name", "description", "prepTime", "ingredients", "instructions", "nutrition"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: recipeSchema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) return null;
    
    return JSON.parse(text) as Omit<Recipe, "id">;
  } catch (error) {
    console.error("Failed to generate recipe:", error);
    return null;
  }
};

export const scanIngredients = async (base64Image: string, mimeType: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompt = `Identifique todos os ingredientes alimentícios visíveis nesta imagem. \nRetorne APENAS um array JSON de strings, onde cada string é o nome do ingrediente identificado em português. Exemplo: ["maçã", "banana", "leite"]. Se não houver comida, retorne [].`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType
          }
        },
        prompt
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        temperature: 0.2
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as string[];
  } catch (error) {
    console.error("Failed to scan ingredients:", error);
    return [];
  }
};

export const generateMealSuggestions = async (
  profile: UserProfile | null,
  day: string
): Promise<Omit<Recipe, "id">[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let profileText = "Nenhuma restrição específica.";
  if (profile) {
    profileText = `
Biotipo: ${profile.bodyType || 'Não informado'}
Metabolismo: ${profile.metabolism || 'Não informado'}
Rotina: ${profile.routine || 'Não informada'}
Restrições: ${profile.restrictions?.join(", ") || "Nenhuma"}
Alergias: ${profile.allergies?.join(", ") || "Nenhuma"}
Objetivo: ${profile.goals || "Nenhum específico"}
`;

    if (profile.masterPlan) {
      profileText += `META DIÁRIA (Estratégia Exclusiva):
- Calorias totais (dividir no dia): ${profile.masterPlan.dailyCalories} kcal
- Proteína total: ${profile.masterPlan.macros.protein}g
- Carbo total: ${profile.masterPlan.macros.carbs}g
- Gordura total: ${profile.masterPlan.macros.fat}g
Foco nutricional: ${profile.masterPlan.nutritionFocus}
`;
    }
  }

  const prompt = `Sugira 3 ou 4 refeições (como café da manhã, almoço, lanche e jantar) para o dia ${day}, levando em consideração o seguinte PERFIL E ESTRATÉGIA do usuário:
${profileText}
O plano deve ser nutricionalmente equilibrado e atingir EXATAMENTE OU MUITO PRÓXIMO das macros totais caso informadas na estratégia. Adapte as sugestões à rotina informada.
Responda APENAS com um array JSON com os objetos de receita.`;

  const recipeSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        prepTime: { type: Type.STRING },
        ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
        instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
        nutrition: {
          type: Type.OBJECT,
          properties: {
            calories: { type: Type.NUMBER },
            protein: { type: Type.NUMBER },
            carbs: { type: Type.NUMBER },
            fat: { type: Type.NUMBER },
            fiber: { type: Type.NUMBER, description: "Fibras em gramas" },
            sugar: { type: Type.NUMBER, description: "Açúcar em gramas" },
            vitamins: { type: Type.ARRAY, items: { type: Type.STRING } },
            minerals: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["calories", "protein", "carbs", "fat"],
        },
      },
      required: ["name", "description", "prepTime", "ingredients", "instructions", "nutrition"],
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: recipeSchema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text) as Omit<Recipe, "id">[];
  } catch (error) {
    console.error("Failed to generate meal suggestions:", error);
    return [];
  }
};

export const textToSpeech = async (text: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      // The model returns raw PCM at 24kHz. We need to wrap it in a WAV header.
      const wavBytes = wrapPcmInWav(base64Audio, 24000);
      const blob = new Blob([wavBytes], { type: 'audio/wav' });
      return URL.createObjectURL(blob);
    }
  } catch (error) {
    console.error("TTS error:", error);
  }
  return null;
};

/**
 * Utility to wrap raw PCM data (base64) into a WAV container (base64).
 * PCM returned by Gemini TTS is 16-bit Mono at 24kHz.
 */
function wrapPcmInWav(pcmBase64: string, sampleRate: number): Uint8Array {
  const pcmBinaryString = atob(pcmBase64);
  const pcmLength = pcmBinaryString.length;
  const pcmBytes = new Uint8Array(pcmLength);
  for (let i = 0; i < pcmLength; i++) {
    pcmBytes[i] = pcmBinaryString.charCodeAt(i);
  }

  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* RIFF chunk length */
  view.setUint32(4, 36 + pcmLength, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, pcmLength, true);

  const combined = new Uint8Array(44 + pcmLength);
  combined.set(new Uint8Array(wavHeader), 0);
  combined.set(pcmBytes, 44);

  return combined;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export const generateAvatarImage = async (prompt: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [{ text: prompt }]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Failed to generate avatar image:", error);
    return null;
  }
};

export const analyzePlate = async (base64Image: string, mimeType: string): Promise<any | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompt = `Analise a imagem deste prato de comida e reconheça os alimentos presentes.
Calcule aproximadamente os valores nutricionais totais do prato (proteína em gramas, carboidratos em gramas, gorduras em gramas, calorias totais, e fibras em gramas).
Crie uma mensagem de voz muito humana e acolhedora na 'assistantMessage' com tom premium. Ex: "Deixei mais simples pra facilitar." ou "Isso aqui encaixa perfeito no seu dia hoje." Relate também brevemente os nutrientes. (Máx 2 ou 3 frases curtas).
Deixe também 2 ou 3 sugestões curingas curtas de melhoria da refeição.
Responda APENAS num json.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      foods: { type: Type.ARRAY, items: { type: Type.STRING } },
      nutrition: {
        type: Type.OBJECT,
        properties: {
          calories: { type: Type.NUMBER },
          protein: { type: Type.NUMBER },
          carbs: { type: Type.NUMBER },
          fat: { type: Type.NUMBER },
          fiber: { type: Type.NUMBER },
        },
        required: ["calories", "protein", "carbs", "fat", "fiber"],
      },
      assistantMessage: { type: Type.STRING },
      suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["foods", "nutrition", "assistantMessage", "suggestions"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType
          }
        },
        prompt
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.2
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to analyze plate:", error);
    return null;
  }
};

export const generateJourneyMessage = async (profile: UserProfile, period: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const systemInstruction = `Você é uma assistente virtual de saúde. Seu tom é altamente humano, acolhedor e premium, como uma mensagem de WhatsApp.
O usuário está visualizando a evolução do seu próprio corpo no período: ${period}.
Gere UMA frase curta e encorajadora (máximo 2 sentenças) como se estivesse conversando. Ex: "Olha essa evolução… já mudou 💚", "Tá ficando visível agora.", "Isso aqui é progresso real."`;

  try {
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    const promptText = `Dados do usuário: ${profile.weight}kg, ${profile.age} anos, objetivo: ${profile.goals}. Período visualizado: ${period}. Gera a frase agora.`;
    const response = await chat.sendMessage({ message: promptText });
    return response.text || "Continue focado, você vai longe!";
  } catch (error) {
    console.error("Journey message error:", error);
    return "Você está no caminho certo 💚";
  }
};

export const generateJuiceRecipe = async (
  profile: UserProfile | null,
  ingredients: string = "",
  budgetMode: boolean = false
): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let profileText = "Nenhum";
  if (profile) {
    profileText = `
Peso: ${profile.weight}kg
Altura: ${profile.height}m
Objetivo: ${profile.goals}
Restrições: ${profile.restrictions.join(", ")}
Alergias: ${profile.allergies.join(", ")}
`;
  }

  const budgetContext = budgetMode 
    ? "\nMODO ECONOMIA ATIVADO: Sugira sucos com ingredientes de BAIXO CUSTO e acessíveis (ex: limão, melancia, cenoura, hortelã quintal)." 
    : "";

  const prompt = `Gere uma receita de SUCO NATURAL focado no perfil e objetivo do usuário (ex: emagrecimento, reeducação alimentar).
  
Perfil do Usuário: ${profileText}${budgetContext}
Ingredientes sugeridos/disponíveis pelo usuário: ${ingredients || "O que for melhor para o objetivo, priorize frutas, vegetais e funcionais como chia ou gengibre."}

Regras:
1. Deve ser focado em: baixa caloria, alto teor de fibras, retenção de saciedade, ou controle de açúcar natural.
2. Seja criativo, delicioso e saudável.
3. Produza uma 'assistantMessage' (fala de IA em tom premium, curto, humano, acolhedor. Ex: "Deixei mais simples pra facilitar." ou "Separei algo rápido pra agora.").
4. Responda APENAS com JSON validando o schema exato.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      assistantMessage: { type: Type.STRING },
      ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
      instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
      nutrition: {
        type: Type.OBJECT,
        properties: {
          calories: { type: Type.NUMBER },
          carbs: { type: Type.NUMBER },
          fiber: { type: Type.NUMBER },
        },
        required: ["calories", "carbs", "fiber"],
      },
      benefits: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["name", "assistantMessage", "ingredients", "instructions", "nutrition", "benefits"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.8,
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to generate juice recipe:", error);
    return null;
  }
};

export const analyzeBarcodeProduct = async (
  productData: any,
  profile: UserProfile | null
): Promise<any | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let profileText = "Nenhum";
  if (profile) {
    profileText = `
Peso: ${profile.weight}kg
Objetivo: ${profile.goals}
Restrições: ${profile.restrictions.join(", ")}
Alergias: ${profile.allergies.join(", ")}
`;
  }

  const prompt = `Analise este produto industrializado com base nos dados nutricionais fornecidos e no perfil do usuário.
  
Perfil do Usuário: ${profileText}
Dados do Produto: ${JSON.stringify(productData)}

Regras:
1. Determine se o produto é "bom", "moderado" ou "ruim" para o objetivo do usuário.
2. Crie uma 'assistantMessage' com tom altamente humano e premium (Ex: "Achei opções melhores perto de você." ou "Dá pra economizar aqui.", focado na avaliação nutricional do produto). Mantenha curto e conversacional.
3. Extraia ou valide as calorias e macronutrientes principais (energia, proteínas, carboidratos, gorduras, fibras).
4. Responda APENAS com JSON validando o schema exato.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      verdict: { type: Type.STRING, enum: ["bom", "moderado", "ruim"] },
      assistantMessage: { type: Type.STRING },
      nutrition: {
        type: Type.OBJECT,
        properties: {
          calories: { type: Type.NUMBER },
          protein: { type: Type.NUMBER },
          carbs: { type: Type.NUMBER },
          fat: { type: Type.NUMBER },
          fiber: { type: Type.NUMBER },
        },
        required: ["calories", "protein", "carbs", "fat"],
      },
      warning: { type: Type.STRING, description: "Um alerta específico se for ruim/moderado ou um elogio se for bom." },
    },
    required: ["verdict", "assistantMessage", "nutrition", "warning"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.2,
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to analyze barcode product:", error);
    return null;
  }
};

export const analyzeEmotionalPatterns = async (
  logs: EmotionalLog[],
  profile: UserProfile | null
): Promise<{ insight: string; suggestion: string; assistantMessage: string } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const logsText = logs.slice(-10).map(l => `${l.date}: ${l.mood} (${l.trigger || 'sem gatilho'})`).join("\n");
  
  const prompt = `Analise os padrões emocionais alimentares do usuário com base nestes registros recentes:
${logsText}

Perfil: ${profile?.goals || 'Emagrecimento'}

Regras:
1. Identifique se há fome emocional, ansiedade ou padrões recorrentes (ex: comer à noite).
2. Forneça um 'insight' curto, uma 'suggestion' prática e uma 'assistantMessage' com tom premium, humano e acolhedor (Ex: "Ei… só volta hoje. Sem cobrança." ou "Você não perdeu nada, só continua.").
3. Responda APENAS com JSON.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      insight: { type: Type.STRING },
      suggestion: { type: Type.STRING },
      assistantMessage: { type: Type.STRING },
    },
    required: ["insight", "suggestion", "assistantMessage"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to analyze emotional patterns:", error);
    return null;
  }
};

export const generateChallengeFeedback = async (
  day: number,
  totalDays: number,
  profile: UserProfile | null
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const prompt = `Gere uma mensagem motivadora curta de uma assistente de voz feminina para o usuário que acabou de completar o Dia ${day} de um desafio de ${totalDays} dias.
  
Perfil do Usuário: ${profile?.goals || 'Emagrecimento'}

Regras:
1. Seja doce, motivadora e reconheça o esforço.
2. Mencione que o avatar está evoluindo/ficando mais saudável.
3. Responda APENAS com a mensagem de texto.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.8,
      },
    });

    return response.text.trim() || "Parabéns por completar mais um dia! Você está evoluindo! 🌟";
  } catch (error) {
    console.error("Failed to generate challenge feedback:", error);
    return "Dia completo! Você está cada vez mais perto do seu objetivo. 🔥";
  }
};

export const generateHydrationAdvice = async (
  current: number,
  goal: number,
  profile: UserProfile | null
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const percentage = (current / goal) * 100;
  const prompt = `Gere uma mensagem motivadora curta (fala feminina doce) sobre hidratação.
O usuário bebeu ${current}ml de uma meta de ${goal}ml (${percentage.toFixed(0)}%).
Objetivo do usuário: ${profile?.goals || 'Saúde'}

Regras:
1. Se o percentual for baixo, incentive a beber agora.
2. Se estiver no meio, elogie o progresso.
3. Se bateu a meta, parabenize com entusiasmo.
4. Responda APENAS com o texto da mensagem.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { temperature: 0.7 },
    });

    return response.text.trim() || "Beba um pouco de água para manter seu corpo funcionando bem! 💧";
  } catch (error) {
    return "Hidratar-se é fundamental para sua saúde. Beba um copo agora! 💧";
  }
};

export const analyzeDiningOut = async (
  description: string,
  profile: UserProfile | null
): Promise<DiningOutAnalysis | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const prompt = `Analise a seguinte refeição ou opções de cardápio de um restaurante: "${description}".
  
Perfil do Usuário: ${profile?.goals || 'Emagrecimento'}

Regras:
1. Estime as calorias totais e macros (proteínas, carbos, gorduras).
2. Dê um veredito: "Escolha Inteligente", "Moderado" ou "Excesso".
3. Forneça 3 dicas práticas para tornar essa refeição mais saudável.
4. Sugira uma alternativa melhor se o prato for pesado.
5. Inclua uma 'assistantMessage' (fala feminina curta e motivadora).
6. Responda APENAS com JSON validando o schema.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      dish: { type: Type.STRING },
      estimatedCalories: { type: Type.NUMBER },
      macros: {
        type: Type.OBJECT,
        properties: {
          protein: { type: Type.STRING },
          carbs: { type: Type.STRING },
          fats: { type: Type.STRING },
        },
        required: ["protein", "carbs", "fats"],
      },
      verdict: { type: Type.STRING },
      tips: { type: Type.ARRAY, items: { type: Type.STRING } },
      betterAlternative: { type: Type.STRING },
      assistantMessage: { type: Type.STRING },
    },
    required: ["dish", "estimatedCalories", "macros", "verdict", "tips", "assistantMessage"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to analyze dining out:", error);
    return null;
  }
};

export const generateSmartSwap = async (
  foodItem: string,
  profile: UserProfile | null
): Promise<SmartSwap | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const prompt = `Sugira uma substituição saudável for the alimento: "${foodItem}".
  
Perfil do Usuário: ${profile?.goals || 'Emagrecimento'}

Regras:
1. A substituição deve ser prática e saborosa.
2. Forneça o 'original', o 'substitute', a 'reason' (por que trocar), uma lista de 'benefits' e uma 'assistantMessage' (fala feminina suave e motivadora).
3. Responda APENAS com JSON validando o schema.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      original: { type: Type.STRING },
      substitute: { type: Type.STRING },
      reason: { type: Type.STRING },
      benefits: { type: Type.ARRAY, items: { type: Type.STRING } },
      assistantMessage: { type: Type.STRING },
    },
    required: ["original", "substitute", "reason", "benefits", "assistantMessage"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to generate smart swap:", error);
    return null;
  }
};

export const generateGoalPrediction = async (
  profile: UserProfile
): Promise<GoalPrediction | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const prompt = `Analise o perfil do usuário para prever o tempo necessário para atingir o objetivo de peso.
  
Perfil:
- Peso Atual: ${profile.weight}kg
- Peso Alvo: ${profile.targetWeight}kg
- Altura: ${profile.height}cm
- Nível de Atividade: ${profile.activityLevel}
- Gênero: ${profile.gender}
- Objetivos: ${profile.goals}

Regras:
1. Calcule uma estimativa REALISTA de dias baseado em uma perda saudável (0.5kg a 1kg por semana).
2. Se o usuário quer ganhar peso, use ganho saudável (0.25kg por semana).
3. 'estimatedDays' deve ser um número inteiro.
4. 'estimatedDate' deve ser a data de hoje + estimatedDays em formato ISO (YYYY-MM-DD).
5. 'confidenceScore' entre 0.1 e 1.0.
6. 'motivationalMessage' deve ser uma fala feminina doce e encorajadora.
7. Responda APENAS com JSON validando o schema.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      estimatedDays: { type: Type.NUMBER },
      estimatedDate: { type: Type.STRING },
      confidenceScore: { type: Type.NUMBER },
      motivationalMessage: { type: Type.STRING },
    },
    required: ["estimatedDays", "estimatedDate", "confidenceScore", "motivationalMessage"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to generate goal prediction:", error);
    return null;
  }
};

export const adjustMealPlan = async (
  profile: UserProfile,
  intakeLogs: IntakeLog[],
  nextMealType: 'Café da Manhã' | 'Almoço' | 'Lanche' | 'Jantar'
): Promise<Omit<Recipe, 'id'> | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const todayLogs = (intakeLogs || []).filter(log => {
    const logDate = new Date(log.date).toDateString();
    const today = new Date().toDateString();
    return logDate === today;
  });

  const totalActual = todayLogs.reduce((acc, log) => ({
    calories: acc.calories + log.actual.calories,
    protein: acc.protein + log.actual.protein,
    carbs: acc.carbs + log.actual.carbs,
    fat: acc.fat + log.actual.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const prompt = `Você é um Nutricionista IA adaptativo. O usuário já consumiu os seguintes nutrientes hoje:
- Calorias: ${totalActual.calories}kcal
- Proteínas: ${totalActual.protein}g
- Carboidratos: ${totalActual.carbs}g
- Gorduras: ${totalActual.fat}g

Perfil do Usuário:
- Objetivo: ${profile.goals}
- Biotipo: ${profile.bodyType || 'Não informado'}
- Metabolismo: ${profile.metabolism || 'Moderado'}
- Peso atual: ${profile.weight}kg

Sua tarefa: Gere uma sugestão de ${nextMealType} que compense ou ajuste o dia para atingir as metas nutricionais do usuário de forma otimizada para o biotipo ${profile.bodyType || 'informado'}.
Responda APENAS com JSON.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      description: { type: Type.STRING },
      prepTime: { type: Type.STRING },
      ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
      instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
      nutrition: {
        type: Type.OBJECT,
        properties: {
          calories: { type: Type.NUMBER },
          protein: { type: Type.NUMBER },
          carbs: { type: Type.NUMBER },
          fat: { type: Type.NUMBER },
        },
        required: ["calories", "protein", "carbs", "fat"],
      },
    },
    required: ["name", "description", "prepTime", "ingredients", "instructions", "nutrition"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to adjust meal plan:", error);
    return null;
  }
};

export interface BehavioralIntervention {
  voiceMessage: string;
  suggestedAction: {
      type: 'SIMPLIFY_MEALS' | 'REDUCE_WORKOUT' | 'INCREASE_WORKOUT' | 'ADJUST_MACROS';
      description: string;
  } | null;
  predictionText: string;
}

export const generateBehavioralIntervention = async (
  profile: UserProfile
): Promise<BehavioralIntervention | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const recentFoodLogs = (profile.intakeLogs || []).slice(-10);
  const recentWorkouts = (profile.workoutLogs || []).slice(-7);

  const prompt = `Analise o COMPORTAMENTO REAL do usuário:
Objetivo: ${profile.goals}
Rotina: ${profile.routine || 'Não informada'}
Treinos recentes: ${JSON.stringify(recentWorkouts)}
Refeições recentes: ${JSON.stringify(recentFoodLogs)}

Regras de Intervenção (MUITO IMPORTANTE - TOM DE VOZ PREMIUM E HUMANO):
A fala da IA ("voiceMessage") DEVE usar este tom:
- Acolhedor, curto, direto e empático. Sem robôs, parecendo uma mensagem no WhatsApp.
- Exemplos de frases dependendo da situação:
  - Se pula treino ou erra dieta: "Tá tudo bem… vamos ajustar pra algo mais fácil.", "Sem pressão. Só volta hoje, já é suficiente.", "Ei… só volta hoje. Sem cobrança.", "Quer que eu simplifique pra você?"
  - Ajuste feito: "Ajustei tudo com base no seu dia.", "Agora ficou mais fácil de seguir.", "Deixei mais prático pra sua rotina."
  - Se tá indo bem: "Dá pra ver que você tá consistente.", "Isso aqui já está funcionando pra você.", "Quer subir um nível?"
  - Convite: "Vamos fazer algo rápido agora?", "Tenho um treino leve que encaixa no seu tempo."

1. Se ele pula treinos, sugira 'REDUCE_WORKOUT' e crie uma fala acolhedora sugerindo algo mais rápido.
2. Se ele não bate proteína, sugira 'ADJUST_MACROS' ou 'SIMPLIFY_MEALS'.
3. Se ele está super consistente, sugira 'INCREASE_WORKOUT'.
4. "predictionText": Faça uma previsão baseada na consistência atual (ex: "Se continuar assim, esse é seu resultado em X dias.").
5. "voiceMessage": Use UMA frase curta e empática (inspirada nos exemplos acima), terminando com um emoji verde 💚 se couber.

Responda APENAS JSON validando o schema.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      voiceMessage: { type: Type.STRING },
      suggestedAction: {
        type: Type.OBJECT,
        nullable: true,
        properties: {
          type: { type: Type.STRING, enum: ['SIMPLIFY_MEALS', 'REDUCE_WORKOUT', 'INCREASE_WORKOUT', 'ADJUST_MACROS'] },
          description: { type: Type.STRING }
        },
        required: ["type", "description"]
      },
      predictionText: { type: Type.STRING }
    },
    required: ["voiceMessage", "predictionText", "suggestedAction"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to generate behavioral intervention:", error);
    return null;
  }
};

export const generateAdaptiveInsight = async (
  profile: UserProfile,
  intakeLogs: IntakeLog[],
  workoutLogs: WorkoutLog[]
): Promise<Omit<AdaptiveInsight, 'id' | 'status'> | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const recentFood = (intakeLogs || []).slice(-10);
  const recentWorkouts = (workoutLogs || []).slice(-5);

  const prompt = `Analise o perfil e o comportamento recente do usuário para gerar um insight adaptativo de ALTO VALOR.
  
PERFIL ATUAL:
Biotipo: ${profile.bodyType}
Objetivo: ${profile.goals}
Macros atuais: ${JSON.stringify(profile.masterPlan?.macros)}

REFEIÇÕES RECENTES:
${JSON.stringify(recentFood)}

TREINOS RECENTES:
${JSON.stringify(recentWorkouts)}

Sua tarefa é identificar se o plano atual precisa de um ajuste (macro_adjustment, workout_adaptation ou habit_nudge) baseado no que o usuário REALMENTE está fazendo.
- Se ele consome pouca proteína consistentemente, sugira ajuste de macros ou lembrete de hábito.
- Se pula treinos, sugira diminuir a complexidade.
- Se está indo muito bem, sugira subir o nível.

Responda APENAS em JSON validando o schema.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      date: { type: Type.STRING },
      type: { type: Type.STRING, enum: ['macro_adjustment', 'workout_adaptation', 'habit_nudge'] },
      recommendation: { type: Type.STRING },
      reasoning: { type: Type.STRING },
      changes: {
        type: Type.OBJECT,
        nullable: true,
        properties: {
          dailyCalories: { type: Type.NUMBER },
          macros: {
            type: Type.OBJECT,
            properties: {
              protein: { type: Type.NUMBER },
              carbs: { type: Type.NUMBER },
              fat: { type: Type.NUMBER }
            }
          }
        }
      }
    },
    required: ["date", "type", "recommendation", "reasoning"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to generate adaptive insight:", error);
    return null;
  }
};

export const generateWeeklyChallenges = async (
  profile: UserProfile
): Promise<WeeklyChallenge[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const prompt = `Gere 3 desafios semanais de gamificação personalizados para o usuário NutriAI.
OBJETIVO DO USUÁRIO: ${profile.goals}
RESTRIÇÕES: ${profile.restrictions?.join(", ") || 'Nenhuma'}

Cada desafio deve ter:
- id: crypto.randomUUID() ou identificador único curto
- title: Curto e impactante
- description: O que fazer
- target: Número inteiro (ex: 7 para dias, 5 para vezes)
- current: 0
- type: 'water' | 'protein' | 'workout' | 'steps'
- rewardPoints: Inteiro (ex: 50 a 200)
- completed: false
- expiresAt: ISO de 7 dias a partir de agora

Responda APENAS em JSON no formato Array de WeeklyChallenge.`;

  const schema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        target: { type: Type.NUMBER },
        current: { type: Type.NUMBER },
        type: { type: Type.STRING, enum: ['water', 'protein', 'workout', 'steps'] },
        rewardPoints: { type: Type.NUMBER },
        completed: { type: Type.BOOLEAN },
        expiresAt: { type: Type.STRING }
      },
      required: ["id", "title", "description", "target", "current", "type", "rewardPoints", "completed", "expiresAt"]
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      },
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Failed to generate weekly challenges:", error);
    return [];
  }
};
