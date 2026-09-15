import { BodyType } from '../types';

export interface AvatarCatalogItem {
  id: string;
  name: string;
  subtitle: string;
  category: 'hipertrofia' | 'atletico' | 'endurance' | 'biomecanico' | 'wellness' | 'crosstraining';
  categoryLabel: string;
  gender: 'female' | 'male' | 'unisex';
  bodyType: BodyType;
  description: string;
  highlights: string[];
  photoURL: string;
  modelConfig: {
    skinTone: string;
    skinColor: string;
    accentColor: string;
    secondaryAccentColor: string;
    apparelColor: string;
    headStyle: 'athletic' | 'visor' | 'minimal' | 'cyber';
    proportions: {
      shoulderScale: number;
      chestScale: number;
      armScale: number;
      legScale: number;
      waistScale: number;
    };
    isCyber: boolean;
  };
  dracoSpecs: {
    meshCompression: string;
    rawGeometryMemory: string;
    compressedMemory: string;
    memoryReductionPercent: string;
    vertexCount: string;
    targetFrameRate: string;
  };
}

export const CURATED_AVATARS: AvatarCatalogItem[] = [
  {
    id: 'athena-fit-pro',
    name: 'Athena Fit Pro',
    subtitle: 'Alta Performance & Definição Atlética',
    category: 'atletico',
    categoryLabel: 'Atlético Pro',
    gender: 'female',
    bodyType: 'Mesomorfo',
    description: 'Avatar atlético de alta precisão biométrica, com excelente tônus muscular, core definido e postura projetada para mobilidade e força.',
    highlights: ['Core Esculpido', 'Ombros Definidos', 'Passada Equilibrada', 'Biomecânica Dinâmica'],
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400&h=400',
    modelConfig: {
      skinTone: 'Bronzeado Atlético',
      skinColor: '#d4a373',
      accentColor: '#10b981', // Emerald glow
      secondaryAccentColor: '#06b6d4',
      apparelColor: '#0f172a',
      headStyle: 'visor',
      proportions: {
        shoulderScale: 1.05,
        chestScale: 1.0,
        armScale: 1.02,
        legScale: 1.08,
        waistScale: 0.92
      },
      isCyber: false
    },
    dracoSpecs: {
      meshCompression: 'DRACO v1.5.7 Quantized',
      rawGeometryMemory: '15.2 MB',
      compressedMemory: '1.8 MB',
      memoryReductionPercent: '-88%',
      vertexCount: '14.2k Vértices',
      targetFrameRate: '60 FPS (Mobile)'
    }
  },
  {
    id: 'titan-iron',
    name: 'Titan Iron',
    subtitle: 'Hipertrofia & Força Máxima',
    category: 'hipertrofia',
    categoryLabel: 'Hipertrofia',
    gender: 'male',
    bodyType: 'Mesomorfo',
    description: 'Projetado para treinos de alta carga e hipertrofia. Apresenta deltoides expandidos, peitoral denso e musculatura de costas dominante.',
    highlights: ['Densidade Peitoral', 'Dorsal em V', 'Quadríceps Potentes', 'Cintura Estética'],
    photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400&h=400',
    modelConfig: {
      skinTone: 'Moreno Dourado',
      skinColor: '#c68b59',
      accentColor: '#f59e0b', // Amber/Orange glow
      secondaryAccentColor: '#ef4444',
      apparelColor: '#18181b',
      headStyle: 'athletic',
      proportions: {
        shoulderScale: 1.25,
        chestScale: 1.22,
        armScale: 1.25,
        legScale: 1.2,
        waistScale: 0.95
      },
      isCyber: false
    },
    dracoSpecs: {
      meshCompression: 'DRACO v1.5.7 Quantized',
      rawGeometryMemory: '16.4 MB',
      compressedMemory: '2.0 MB',
      memoryReductionPercent: '-87%',
      vertexCount: '15.8k Vértices',
      targetFrameRate: '60 FPS (Mobile)'
    }
  },
  {
    id: 'valkyrie-cross',
    name: 'Valkyrie Prime',
    subtitle: 'Cross-Training & Força Funcional',
    category: 'crosstraining',
    categoryLabel: 'Cross-Training',
    gender: 'female',
    bodyType: 'Mesomorfo',
    description: 'Estrutura robusta e atlética para treinos intervalados de alta intensidade (HIIT), levantamento olímpico e calistenia avançada.',
    highlights: ['Glúteos & Isquiotibiais', 'Trapézio Ativo', 'Explosão Muscular', 'Resistência'],
    photoURL: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400&h=400',
    modelConfig: {
      skinTone: 'Claro Natural',
      skinColor: '#e0ac69',
      accentColor: '#ec4899', // Pink/Rose neon
      secondaryAccentColor: '#8b5cf6',
      apparelColor: '#312e81',
      headStyle: 'athletic',
      proportions: {
        shoulderScale: 1.08,
        chestScale: 1.02,
        armScale: 1.05,
        legScale: 1.15,
        waistScale: 0.9
      },
      isCyber: false
    },
    dracoSpecs: {
      meshCompression: 'DRACO v1.5.7 Quantized',
      rawGeometryMemory: '14.9 MB',
      compressedMemory: '1.7 MB',
      memoryReductionPercent: '-88%',
      vertexCount: '13.9k Vértices',
      targetFrameRate: '60 FPS (Mobile)'
    }
  },
  {
    id: 'marcus-runner',
    name: 'Marcus Runner',
    subtitle: 'Endurance, Cardio & Corrida',
    category: 'endurance',
    categoryLabel: 'Endurance',
    gender: 'male',
    bodyType: 'Ectomorfo',
    description: 'Perfil esguio, ágil e de alta eficiência aeróbica. Foco em flexibilidade articular, passadas longas e resistência cardiovascular.',
    highlights: ['Panturrilhas Ativas', 'Baixo Percentual de Gordura', 'Leveza Estrutural', 'Postura Elevada'],
    photoURL: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=400&h=400',
    modelConfig: {
      skinTone: 'Médio Quente',
      skinColor: '#bc804c',
      accentColor: '#0ea5e9', // Cyan/Sky blue
      secondaryAccentColor: '#0284c7',
      apparelColor: '#0369a1',
      headStyle: 'athletic',
      proportions: {
        shoulderScale: 0.96,
        chestScale: 0.94,
        armScale: 0.92,
        legScale: 1.02,
        waistScale: 0.88
      },
      isCyber: false
    },
    dracoSpecs: {
      meshCompression: 'DRACO v1.5.7 Quantized',
      rawGeometryMemory: '13.6 MB',
      compressedMemory: '1.5 MB',
      memoryReductionPercent: '-89%',
      vertexCount: '12.4k Vértices',
      targetFrameRate: '60 FPS (Mobile)'
    }
  },
  {
    id: 'cyberfit-biomechanic',
    name: 'CyberFit Biomechanic',
    subtitle: 'Scanner Biomecânico & Fibra de Carbono',
    category: 'biomecanico',
    categoryLabel: 'Biomecânico',
    gender: 'unisex',
    bodyType: 'Mesomorfo',
    description: 'Modelo anatômico futurista com nós de rastreamento de tensão muscular em tempo real e malha de fibra de carbono ultra-leve.',
    highlights: ['Varredura Holográfica', 'Nós de Tensão LED', 'Fibra de Carbono 3K', 'LOD Adaptativo'],
    photoURL: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=400&h=400',
    modelConfig: {
      skinTone: 'Grafite Metálico',
      skinColor: '#334155',
      accentColor: '#00f2fe', // Electric Cyan
      secondaryAccentColor: '#4facfe',
      apparelColor: '#090d16',
      headStyle: 'cyber',
      proportions: {
        shoulderScale: 1.1,
        chestScale: 1.05,
        armScale: 1.05,
        legScale: 1.05,
        waistScale: 0.92
      },
      isCyber: true
    },
    dracoSpecs: {
      meshCompression: 'DRACO v1.5.7 Quantized + Normals 16b',
      rawGeometryMemory: '17.8 MB',
      compressedMemory: '1.9 MB',
      memoryReductionPercent: '-89%',
      vertexCount: '16.5k Vértices',
      targetFrameRate: '60 FPS (Mobile)'
    }
  },
  {
    id: 'maya-zenflow',
    name: 'Maya ZenFlow',
    subtitle: 'Yoga, Flexibilidade & Equilíbrio',
    category: 'wellness',
    categoryLabel: 'Wellness & Yoga',
    gender: 'female',
    bodyType: 'Ectomorfo',
    description: 'Desenvolvido para práticas de respiração, ioga e mobilidade espinhal. Movimentos fluídos e alinhamento biomecânico suave.',
    highlights: ['Alinhamento de Coluna', 'Flexibilidade Total', 'Fluidez Muscular', 'Respiração Diafragmática'],
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400&h=400',
    modelConfig: {
      skinTone: 'Moreno Claro',
      skinColor: '#cb997e',
      accentColor: '#a855f7', // Violet glow
      secondaryAccentColor: '#f43f5e',
      apparelColor: '#581c87',
      headStyle: 'minimal',
      proportions: {
        shoulderScale: 0.95,
        chestScale: 0.95,
        armScale: 0.92,
        legScale: 1.04,
        waistScale: 0.88
      },
      isCyber: false
    },
    dracoSpecs: {
      meshCompression: 'DRACO v1.5.7 Quantized',
      rawGeometryMemory: '14.1 MB',
      compressedMemory: '1.6 MB',
      memoryReductionPercent: '-88%',
      vertexCount: '13.1k Vértices',
      targetFrameRate: '60 FPS (Mobile)'
    }
  },
  {
    id: 'leo-mesomorph',
    name: 'Leo Mesomorph',
    subtitle: 'Estética Clássica & Definição Natural',
    category: 'atletico',
    categoryLabel: 'Atlético Natural',
    gender: 'male',
    bodyType: 'Mesomorfo',
    description: 'Harmonia e proporções anatômicas naturais. Ideal para acompanhamento de evolução corporal e ganho gradual de massa magra.',
    highlights: ['Proporção Áurea', 'Definição Abdominal', 'Vascularização Leve', 'Harmonia'],
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400&h=400',
    modelConfig: {
      skinTone: 'Bronze Suave',
      skinColor: '#c58f62',
      accentColor: '#14b8a6', // Teal glow
      secondaryAccentColor: '#10b981',
      apparelColor: '#1e293b',
      headStyle: 'athletic',
      proportions: {
        shoulderScale: 1.12,
        chestScale: 1.1,
        armScale: 1.12,
        legScale: 1.1,
        waistScale: 0.92
      },
      isCyber: false
    },
    dracoSpecs: {
      meshCompression: 'DRACO v1.5.7 Quantized',
      rawGeometryMemory: '15.0 MB',
      compressedMemory: '1.7 MB',
      memoryReductionPercent: '-88%',
      vertexCount: '14.0k Vértices',
      targetFrameRate: '60 FPS (Mobile)'
    }
  },
  {
    id: 'elena-wellness',
    name: 'Elena Vitality',
    subtitle: 'Tonificação Funcional & Saúde Integral',
    category: 'wellness',
    categoryLabel: 'Tonificação',
    gender: 'female',
    bodyType: 'Mesomorfo',
    description: 'Projetada para quem busca perda de gordura, tonificação uniforme e melhora geral da postura e capacidade respiratória.',
    highlights: ['Tonificação Uniforme', 'Consciência Postural', 'Core Ativo', 'Equilíbrio'],
    photoURL: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=400&h=400',
    modelConfig: {
      skinTone: 'Claro Dourado',
      skinColor: '#ddb892',
      accentColor: '#f97316', // Coral/Orange
      secondaryAccentColor: '#e11d48',
      apparelColor: '#831843',
      headStyle: 'minimal',
      proportions: {
        shoulderScale: 0.98,
        chestScale: 0.98,
        armScale: 0.96,
        legScale: 1.06,
        waistScale: 0.9
      },
      isCyber: false
    },
    dracoSpecs: {
      meshCompression: 'DRACO v1.5.7 Quantized',
      rawGeometryMemory: '13.8 MB',
      compressedMemory: '1.6 MB',
      memoryReductionPercent: '-88%',
      vertexCount: '12.9k Vértices',
      targetFrameRate: '60 FPS (Mobile)'
    }
  }
];

export function getAvatarById(id?: string): AvatarCatalogItem {
  if (!id) return CURATED_AVATARS[0];
  const found = CURATED_AVATARS.find(a => a.id === id);
  return found || CURATED_AVATARS[0];
}
