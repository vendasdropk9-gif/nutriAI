import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Recipe, UserProfile, MealPlanDay } from "../types";

export const generateRecipe = async (
  ingredients: string = "",
  profile?: UserProfile | null
): Promise<Omit<Recipe, "id"> | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let profileText = "Nenhuma restrição específica.";
  if (profile) {
    profileText = `
Restrições: ${profile.restrictions.join(", ") || "Nenhuma"}
Alergias: ${profile.allergies.join(", ") || "Nenhuma"}
Objetivo: ${profile.goals || "Nenhum específico"}
Equipamentos disponíveis: ${profile.equipment.join(", ") || "Todos"}
`;
  }

  const prompt = `Gere uma receita saudável com base nos seguintes parâmetros:
Ingredientes disponíveis: ${ingredients || "Qualquer ingrediente saudável comum"}
Perfil do Usuário: ${profileText}
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
Restrições: ${profile.restrictions.join(", ") || "Nenhuma"}
Alergias: ${profile.allergies.join(", ") || "Nenhuma"}
Objetivo: ${profile.goals || "Nenhum específico"}
Equipamentos disponíveis: ${profile.equipment.join(", ") || "Todos"}
`;
  }

  const prompt = `Sugira 3 receitas saudáveis (como café da manhã, almoço, jantar) para o dia ${day}, levando em consideração o seguinte perfil do usuário:
${profileText}
O plano deve ser nutricionalmente equilibrado ao longo do dia.
Responda APENAS com um array JSON com 3 objetos de receita.`;

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

export const chatWithAssistant = async (
  history: { role: "user" | "model"; parts: { text: string }[] }[],
  newMessage: string,
  profile: UserProfile | null
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  let profileContext = "";
  if (profile) {
    profileContext = `Perfil do Usuário:
Restrições: ${profile.restrictions?.join(", ") || 'Nenhuma'}
Alergias: ${profile.allergies?.join(", ") || 'Nenhuma'}
Objetivo: ${profile.goals || 'Nenhum'}`;
  }

  const systemInstruction = `Você é uma assistente de culinária saudável com IA. Seu nome é irrelevante, apenas aja como uma pessoa.
Seu tom é amigável, acolhedor, natural e feminino. Use uma linguagem simples, humana e conversacional. Seja curta, direta, educada e empática, com leve entusiasmo.
${profileContext}

Você deve apoiar o usuário dando dicas, sugerindo ingredientes ou receitas.
REGRA DE OURO: Responda SEMPRE de forma muito breve, como num chat de WhatsApp. Evite listas longas ou muito texto de uma vez. No máximo 2 a 3 frases curtas por resposta. Use emojis ocasionalmente.`;

  try {
    const chat = ai.chats.create({
      model: "gemini-3.1-pro-preview",
      config: {
        systemInstruction,
        temperature: 0.7,
      },
      history: history.length > 0 ? history : undefined,
    });

    const response = await chat.sendMessage({ message: newMessage });
    return response.text || "Desculpe, não consegui pensar em nada agora.";
  } catch (error) {
    console.error("Chat error:", error);
    return "Ops, tive um errinho aqui. Podemos tentar de novo?";
  }
};

export const textToSpeech = async (text: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  try {
    // We must use runtime import of Modality down here or add it to imports file.
    // Wait, the easiest is to just pass 'AUDIO' as string.
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Aoede' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return base64Audio;
    }
  } catch (error) {
    console.error("TTS error:", error);
  }
  return null;
};

export const generateAvatarImage = async (prompt: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
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
Crie uma mensagem de voz amigável para a assistente virtual (doce, acolhedora, natural) relatando de forma curta os nutrientes e algo encorajador. Ex: "Hmm, esse prato parece delicioso 😄 Você tem aproximadamente 32g de proteína, 45g de carboidratos..." (Máx 2 ou 3 frases curtas).
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
  
  const systemInstruction = `Você é uma assistente virtual de saúde. Seu tom é amigável, doce, feminino e motivador.
O usuário está visualizando a evolução do seu próprio corpo no período: ${period}.
Gere UMA frase curta e encorajadora (máximo 2 sentenças) como se estivesse conversando. Ex: "Esse é o seu ponto de partida 💚 Pequenas escolhas geram grandes resultados." ou "Olha só como seu corpo pode evoluir em 30 dias!"`;

  try {
    const chat = ai.chats.create({
      model: "gemini-3.1-flash-preview",
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
