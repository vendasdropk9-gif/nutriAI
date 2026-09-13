import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows, Float } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  Dumbbell,
  Activity,
  Layers,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Compass,
  Zap,
  Flame,
  ShieldCheck,
  Target
} from 'lucide-react';
import { speak, stopSpeech } from '../lib/speech';
import { playSfx, vibrate } from '../lib/sensory';
import { ErrorBoundary } from './ErrorBoundary';

// Types
export interface MuscleExercise {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  targetMuscle: string;
  secondaryMuscles: string[];
  equipment: 'dumbbells' | 'barbell' | 'cable' | 'bodyweight' | 'machine';
  position: 'seated' | 'standing' | 'lying' | 'incline';
  description: string;
  steps: string[];
  mistakes: string[];
  setsReps: {
    hypertrophy: string;
    strength: string;
    endurance: string;
  };
  audioCue: string;
}

export interface MuscleGroup {
  id: string;
  name: string;
  nameEn: string;
  shortLabel: string;
  iconType: 'delts' | 'chest' | 'biceps' | 'triceps' | 'back' | 'abs' | 'quads' | 'glutes' | 'calves';
  exercises: MuscleExercise[];
}

// Mini Anatomical Silhouette Vector Icon for each muscle group
function MuscleSilhouetteIcon({
  type,
  isSelected
}: {
  type: MuscleGroup['iconType'];
  isSelected: boolean;
}) {
  const baseColor = isSelected ? '#34d399' : '#64748b';
  const highlightColor = isSelected ? '#ff5500' : '#f97316';
  const glow = isSelected ? 'drop-shadow-[0_0_6px_rgba(255,100,0,0.8)]' : '';

  return (
    <div className={`w-9 h-9 relative flex items-center justify-center transition-transform ${isSelected ? 'scale-110' : 'opacity-80'}`}>
      <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" strokeWidth="1.5">
        {/* Head */}
        <circle cx="24" cy="7" r="4.5" fill={baseColor} opacity={0.7} />
        {/* Neck */}
        <rect x="22.5" y="11" width="3" height="3" rx="1" fill={baseColor} opacity={0.6} />

        {/* Torso Base */}
        <path
          d="M17 14 C17 14 24 16 31 14 C32 19 30 24 29 28 C28 29 20 29 19 28 C18 24 16 19 17 14 Z"
          fill={type === 'chest' || type === 'abs' || type === 'back' ? (type === 'back' ? highlightColor : baseColor) : baseColor}
          opacity={0.35}
        />

        {/* DELTS */}
        {type === 'delts' ? (
          <g className={glow}>
            <ellipse cx="14.5" cy="16" rx="3.8" ry="4.5" fill={highlightColor} />
            <ellipse cx="33.5" cy="16" rx="3.8" ry="4.5" fill={highlightColor} />
          </g>
        ) : (
          <g opacity={0.5}>
            <ellipse cx="14.5" cy="16" rx="3.2" ry="4" fill={baseColor} />
            <ellipse cx="33.5" cy="16" rx="3.2" ry="4" fill={baseColor} />
          </g>
        )}

        {/* CHEST */}
        {type === 'chest' ? (
          <g className={glow}>
            <path d="M17 16 C20 16 23 17 23.5 20 C20 21 17 20 17 16 Z" fill={highlightColor} />
            <path d="M31 16 C28 16 25 17 24.5 20 C28 21 31 20 31 16 Z" fill={highlightColor} />
          </g>
        ) : (
          <g opacity={0.4}>
            <path d="M18 16 C20 16 23 17 23.5 19 C20 20 18 19 18 16 Z" fill={baseColor} />
            <path d="M30 16 C28 16 25 17 24.5 19 C28 20 30 19 30 16 Z" fill={baseColor} />
          </g>
        )}

        {/* BICEPS */}
        {type === 'biceps' ? (
          <g className={glow}>
            <ellipse cx="12" cy="22" rx="2.8" ry="4.2" fill={highlightColor} />
            <ellipse cx="36" cy="22" rx="2.8" ry="4.2" fill={highlightColor} />
          </g>
        ) : (
          <g opacity={0.4}>
            <ellipse cx="12" cy="22" rx="2.2" ry="3.8" fill={baseColor} />
            <ellipse cx="36" cy="22" rx="2.2" ry="3.8" fill={baseColor} />
          </g>
        )}

        {/* TRICEPS */}
        {type === 'triceps' ? (
          <g className={glow}>
            <ellipse cx="11" cy="21.5" rx="3.2" ry="4.5" fill={highlightColor} />
            <ellipse cx="37" cy="21.5" rx="3.2" ry="4.5" fill={highlightColor} />
          </g>
        ) : null}

        {/* FOREARMS */}
        <ellipse cx="10" cy="29" rx="2.2" ry="4.2" fill={baseColor} opacity={0.4} />
        <ellipse cx="38" cy="29" rx="2.2" ry="4.2" fill={baseColor} opacity={0.4} />

        {/* ABS */}
        {type === 'abs' ? (
          <g className={glow}>
            <rect x="21" y="19.5" width="2.6" height="2.2" rx="0.5" fill={highlightColor} />
            <rect x="24.4" y="19.5" width="2.6" height="2.2" rx="0.5" fill={highlightColor} />
            <rect x="21" y="22.5" width="2.6" height="2.2" rx="0.5" fill={highlightColor} />
            <rect x="24.4" y="22.5" width="2.6" height="2.2" rx="0.5" fill={highlightColor} />
            <rect x="21" y="25.5" width="2.6" height="2.2" rx="0.5" fill={highlightColor} />
            <rect x="24.4" y="25.5" width="2.6" height="2.2" rx="0.5" fill={highlightColor} />
          </g>
        ) : null}

        {/* BACK / LATS */}
        {type === 'back' ? (
          <g className={glow}>
            <path d="M16 16 L22 24 L18 26 Z" fill={highlightColor} />
            <path d="M32 16 L26 24 L30 26 Z" fill={highlightColor} />
          </g>
        ) : null}

        {/* Pelvis / Shorts */}
        <path d="M18 28 L30 28 L31 32 L17 32 Z" fill={baseColor} opacity={0.6} />

        {/* QUADS */}
        {type === 'quads' ? (
          <g className={glow}>
            <ellipse cx="20" cy="36" rx="3.6" ry="5.5" fill={highlightColor} />
            <ellipse cx="28" cy="36" rx="3.6" ry="5.5" fill={highlightColor} />
          </g>
        ) : (
          <g opacity={0.4}>
            <ellipse cx="20" cy="36" rx="3" ry="5" fill={baseColor} />
            <ellipse cx="28" cy="36" rx="3" ry="5" fill={baseColor} />
          </g>
        )}

        {/* GLUTES */}
        {type === 'glutes' ? (
          <g className={glow}>
            <circle cx="19.5" cy="31" r="3.6" fill={highlightColor} />
            <circle cx="28.5" cy="31" r="3.6" fill={highlightColor} />
          </g>
        ) : null}

        {/* CALVES */}
        {type === 'calves' ? (
          <g className={glow}>
            <ellipse cx="20" cy="44" rx="2.8" ry="4" fill={highlightColor} />
            <ellipse cx="28" cy="44" rx="2.8" ry="4" fill={highlightColor} />
          </g>
        ) : (
          <g opacity={0.35}>
            <ellipse cx="20" cy="44" rx="2.2" ry="3.5" fill={baseColor} />
            <ellipse cx="28" cy="44" rx="2.2" ry="3.5" fill={baseColor} />
          </g>
        )}
      </svg>
    </div>
  );
}

// Complete muscle catalog with high-fidelity biomechanical data
export const MUSCLE_GROUPS: MuscleGroup[] = [
  {
    id: 'side_delts',
    name: 'Deltoides Laterais',
    nameEn: 'SIDE DELTS',
    shortLabel: 'DELTS',
    iconType: 'delts',
    exercises: [
      {
        id: 'seated_lateral_raises',
        name: 'Elevação Lateral Sentado',
        nameEn: 'SEATED LATERAL RAISES',
        category: 'Ombros',
        targetMuscle: 'Deltoide Lateral (Cabeça Média)',
        secondaryMuscles: ['Deltoide Anterior', 'Trapézio Superior', 'Supraespinhal'],
        equipment: 'dumbbells',
        position: 'seated',
        description: 'O exercício padrão-ouro para expansão e largura dos ombros com foco isolado na cabeça lateral do deltoide.',
        steps: [
          'Sente-se na ponta do banco com a coluna ereta, pés firmes no chão e halteres ao lado do quadril.',
          'Mantenha uma leve flexão nos cotovelos (cerca de 15°) e projete os braços para fora, como se quisesse tocar as paredes.',
          'Eleve os halteres guiando pelo cotovelo até atingir a altura paralela aos ombros.',
          'Faça uma pausa de 1 segundo no pico de contração sem encolher o pescoço.',
          'Retorne controlando a descida em 2 a 3 segundos, mantendo a tensão constante.'
        ],
        mistakes: [
          'Balançar o tronco ou usar impulso do quadril.',
          'Subir as mãos mais alto do que os cotovelos, ativando excessivamente o trapézio.',
          'Travar os cotovelos em extensão completa de 180°.'
        ],
        setsReps: {
          hypertrophy: '4 séries de 12 a 15 repetições (RPE 8-9)',
          strength: '3 séries de 8 a 10 repetições com cadência controlada',
          endurance: '3 séries de 20 repetições com drop-set final'
        },
        audioCue: 'Na elevação lateral sentado, mantenha o peito aberto e pense em empurrar os halteres para os lados e não apenas para cima. Suba pelos cotovelos e controle a descida para máxima largura dos ombros.'
      },
      {
        id: 'standing_dumbbell_press',
        name: 'Desenvolvimento com Halteres',
        nameEn: 'DUMBBELL SHOULDER PRESS',
        category: 'Ombros',
        targetMuscle: 'Deltoide Anterior e Médio',
        secondaryMuscles: ['Tríceps Braquial', 'Trapézio Superior', 'Serrátil Anterior'],
        equipment: 'dumbbells',
        position: 'seated',
        description: 'Movimento composto fundamental para densidade, força e volume global dos deltoides.',
        steps: [
          'Ajuste o encosto a 80-85° e posicione os halteres na altura das orelhas.',
          'Empurre os pesos para cima em arco suave, sem encostar os halteres no topo.',
          'Mantenha o core contraído para evitar hiperlordose lombar.',
          'Desça lentamente até que os cotovelos cheguem na linha do queixo.'
        ],
        mistakes: [
          'Arquear excessivamente a coluna lombar afastando as costas do banco.',
          'Bater os halteres no topo do movimento perdendo a tensão muscular.',
          'Descer pouco os cotovelos (meia repetição).'
        ],
        setsReps: {
          hypertrophy: '4 séries de 8 a 12 repetições',
          strength: '4 séries de 5 a 6 repetições',
          endurance: '3 séries de 15 repetições'
        },
        audioCue: 'No desenvolvimento, mantenha as escápulas estáveis contra o encosto e empurre em direção ao teto com força controlada.'
      },
      {
        id: 'cable_lateral_raise',
        name: 'Elevação Lateral na Polia',
        nameEn: 'CABLE LATERAL RAISE',
        category: 'Ombros',
        targetMuscle: 'Deltoide Lateral',
        secondaryMuscles: ['Trapézio', 'Antebraço'],
        equipment: 'cable',
        position: 'standing',
        description: 'Proporciona curva de resistência constante em toda a amplitude, inclusive no ponto inicial.',
        steps: [
          'Posicione a polia na altura do joelho ou tornozelo.',
          'Segure o cabo cruzando o corpo e incline o tronco ligeiramente para o lado da polia.',
          'Eleve o braço lateralmente até a altura do ombro.',
          'Segure a contração por 1 segundo e desça resistindo ao cabo.'
        ],
        mistakes: [
          'Girar o punho durante o movimento.',
          'Deixar o cabo puxar o braço rapidamente na volta.'
        ],
        setsReps: {
          hypertrophy: '3 a 4 séries de 12 a 15 repetições por lado',
          strength: '3 séries de 10 repetições',
          endurance: '3 séries de 18 a 20 repetições'
        },
        audioCue: 'A polia garante tensão constante até embaixo. Mantenha o punho neutro e sinta o deltoide queimar durante toda a trajetória.'
      }
    ]
  },
  {
    id: 'chest',
    name: 'Peitoral',
    nameEn: 'CHEST',
    shortLabel: 'CHEST',
    iconType: 'chest',
    exercises: [
      {
        id: 'dumbbell_bench_press',
        name: 'Supino Reto com Halteres',
        nameEn: 'FLAT DUMBBELL BENCH PRESS',
        category: 'Peito',
        targetMuscle: 'Peitoral Maior (Fibras Médias e Inferiores)',
        secondaryMuscles: ['Deltoide Anterior', 'Tríceps Braquial', 'Serrátil'],
        equipment: 'dumbbells',
        position: 'lying',
        description: 'Exercício construtor de massa que permite maior amplitude de movimento e alinhamento articular comparado à barra.',
        steps: [
          'Deite-se no banco, apoie os pés com firmeza no solo e aduza as escápulas.',
          'Segure os halteres acima do peito com pegada pronada ou semi-pronada.',
          'Desça os halteres em arco abrindo os cotovelos em ângulo de 45° a 60° em relação ao tronco.',
          'Sinta o alongamento da fibra peitoral no fundo e empurre concentrando a força no peito.'
        ],
        mistakes: [
          'Abrir os cotovelos a 90°, sobrecarregando a cápsula articular do ombro.',
          'Tirar as escápulas do banco durante a subida (protusão excessiva).'
        ],
        setsReps: {
          hypertrophy: '4 séries de 8 a 12 repetições',
          strength: '5 séries de 5 repetições',
          endurance: '3 séries de 15 repetições'
        },
        audioCue: 'Mantenha as escápulas travadas para trás e para baixo. Pense em juntar os bíceps no peito no topo do movimento.'
      },
      {
        id: 'incline_dumbbell_press',
        name: 'Supino Inclinado com Halteres',
        nameEn: 'INCLINE DUMBBELL PRESS',
        category: 'Peito',
        targetMuscle: 'Peitoral Maior (Porção Clavicular Superior)',
        secondaryMuscles: ['Deltoide Anterior', 'Tríceps'],
        equipment: 'dumbbells',
        position: 'incline',
        description: 'Foco total no preenchimento do peitoral superior, criando aspecto cheio e atlético.',
        steps: [
          'Ajuste o banco em inclinação de 30° a 45°.',
          'Mantenha as escápulas retraídas e desça os halteres até a linha do peito superior.',
          'Empurre com força controlada convergindo suavemente no topo.'
        ],
        mistakes: [
          'Inclinar o banco em 60° ou mais, transformando o exercício em desenvolvimento de ombro.',
          'Fazer repetições curtas sem descer até a linha do peitoral.'
        ],
        setsReps: {
          hypertrophy: '4 séries de 10 a 12 repetições',
          strength: '4 séries de 6 a 8 repetições',
          endurance: '3 séries de 15 repetições'
        },
        audioCue: 'No supino inclinado a 30 graus, sinta o peitoral superior trabalhar a cada repetição mantendo o ritmo cadenciado.'
      }
    ]
  },
  {
    id: 'biceps',
    name: 'Bíceps',
    nameEn: 'BICEPS',
    shortLabel: 'BICEPS',
    iconType: 'biceps',
    exercises: [
      {
        id: 'incline_dumbbell_curl',
        name: 'Rosca Inclinada com Halteres',
        nameEn: 'INCLINE DUMBBELL CURL',
        category: 'Braços',
        targetMuscle: 'Bíceps Braquial (Cabeça Longa)',
        secondaryMuscles: ['Braquial', 'Braquiorradial'],
        equipment: 'dumbbells',
        position: 'incline',
        description: 'Coloca o bíceps em alongamento passivo extremo, estimulando hipertrofia máxima da cabeça longa e pico.',
        steps: [
          'Ajuste o banco em 45° a 60° e apoie totalmente as costas e cabeça.',
          'Deixe os braços caírem perpendicularmente ao solo segurando os halteres.',
          'Flexione os cotovelos supinando os punhos (palmas para cima) à medida que sobe.',
          'Contraia fortemente o bíceps no topo sem jogar os cotovelos para a frente.',
          'Desça lentamente até a extensão quase completa.'
        ],
        mistakes: [
          'Projetar os cotovelos para frente durante a subida.',
          'Descolar a cabeça ou o tronco do encosto do banco.'
        ],
        setsReps: {
          hypertrophy: '3 a 4 séries de 10 a 12 repetições',
          strength: '3 séries de 8 repetições',
          endurance: '3 séries de 15 repetições'
        },
        audioCue: 'Na rosca inclinada, mantenha os cotovelos fixos apontando para o chão. Supine o punho com força no final para espremer o bíceps.'
      },
      {
        id: 'standing_barbell_curl',
        name: 'Rosca Direta com Barra W',
        nameEn: 'STANDING EZ-BAR CURL',
        category: 'Braços',
        targetMuscle: 'Bíceps Braquial e Braquial',
        secondaryMuscles: ['Antebraço', 'Core'],
        equipment: 'barbell',
        position: 'standing',
        description: 'Clássico absoluto para volume global de braço e sobrecarga progressiva.',
        steps: [
          'Fique em pé com os pés na largura dos ombros e joelhos levemente destravados.',
          'Segure a barra W na curvatura anatômica confortável para seus punhos.',
          'Suba a barra em movimento fluído mantendo os cotovelos colados ao lado das costelas.',
          'Desça de maneira estrita resistindo à gravidade.'
        ],
        mistakes: [
          'Balançar o corpo para trás usando a lombar para levantar a carga.'
        ],
        setsReps: {
          hypertrophy: '4 séries de 8 a 10 repetições',
          strength: '4 séries de 6 repetições',
          endurance: '3 séries de 15 repetições'
        },
        audioCue: 'Na rosca direta, trave o abdômen e não balance a coluna. Faça toda a força com a flexão do bíceps.'
      }
    ]
  },
  {
    id: 'triceps',
    name: 'Tríceps',
    nameEn: 'TRICEPS',
    shortLabel: 'TRICEPS',
    iconType: 'triceps',
    exercises: [
      {
        id: 'cable_tricep_pushdown',
        name: 'Tríceps Corda na Polia',
        nameEn: 'ROPE TRICEP PUSHDOWN',
        category: 'Braços',
        targetMuscle: 'Tríceps Braquial (Cabeça Lateral e Medial)',
        secondaryMuscles: ['Cabeça Longa', 'Antebraço'],
        equipment: 'cable',
        position: 'standing',
        description: 'Excelente para definição e pico de contração com liberdade de abdução no final.',
        steps: [
          'Prenda a corda na polia alta e segure com pegada neutra.',
          'Incline o tronco levemente à frente e trave os cotovelos ao lado das costelas.',
          'Empurre a corda para baixo estendendo os cotovelos e abrindo as pontas no final do movimento.',
          'Retorne controlando até formar um ângulo de 90° nos cotovelos.'
        ],
        mistakes: [
          'Deixar os cotovelos subirem e descerem a cada repetição.',
          'Usar o peso do corpo para empurrar a polia.'
        ],
        setsReps: {
          hypertrophy: '4 séries de 12 a 15 repetições',
          strength: '3 séries de 8 a 10 repetições',
          endurance: '3 séries de 20 repetições'
        },
        audioCue: 'Mantenha os cotovelos travados como dobradiças e abra a corda no final para ativar a cabeça lateral do tríceps.'
      },
      {
        id: 'skull_crushers',
        name: 'Tríceps Testa com Barra W',
        nameEn: 'EZ-BAR SKULL CRUSHERS',
        category: 'Braços',
        targetMuscle: 'Tríceps Braquial (Cabeça Longa)',
        secondaryMuscles: ['Cabeça Medial e Lateral'],
        equipment: 'barbell',
        position: 'lying',
        description: 'Isola a cabeça longa do tríceps através da flexão do ombro combinada à extensão do cotovelo.',
        steps: [
          'Deite no banco segurando a barra com os braços inclinados levemente para trás.',
          'Flexione apenas os cotovelos descendo a barra em direção ao topo da cabeça.',
          'Estenda os cotovelos de volta à posição inicial sem movimentar os ombros.'
        ],
        mistakes: [
          'Abrir os cotovelos para os lados.',
          'Deixar a barra descer descontrolada.'
        ],
        setsReps: {
          hypertrophy: '3 a 4 séries de 10 a 12 repetições',
          strength: '3 séries de 6 a 8 repetições',
          endurance: '3 séries de 15 repetições'
        },
        audioCue: 'Incline os braços ligeiramente para trás para manter a tensão no tríceps durante todo o percurso.'
      }
    ]
  },
  {
    id: 'back',
    name: 'Costas & Dorsais',
    nameEn: 'LATS / BACK',
    shortLabel: 'LATS',
    iconType: 'back',
    exercises: [
      {
        id: 'seated_cable_row',
        name: 'Remada Baixa no Triângulo',
        nameEn: 'SEATED CABLE ROW',
        category: 'Costas',
        targetMuscle: 'Grande Dorsal, Rombóides e Trapézio Médio',
        secondaryMuscles: ['Bíceps Braquial', 'Deltoide Posterior', 'Eretores da Espinha'],
        equipment: 'cable',
        position: 'seated',
        description: 'Constrói densidade e espessura muscular nas costas com excelente suporte para a coluna.',
        steps: [
          'Sente-se com os pés firmes nos apoios e joelhos levemente flexionados.',
          'Segure o triângulo com a coluna neutra e o peito estufado.',
          'Puxe o acessório em direção à altura do umbigo, projetando os cotovelos para trás.',
          'Aperte as escápulas no final por 1 segundo e retorne alongando os dorsais.'
        ],
        mistakes: [
          'Balançar a lombar excessivamente para frente e para trás.',
          'Puxar com os braços em vez de iniciar o movimento retraindo as escápulas.'
        ],
        setsReps: {
          hypertrophy: '4 séries de 10 a 12 repetições',
          strength: '4 séries de 6 a 8 repetições',
          endurance: '3 séries de 15 repetições'
        },
        audioCue: 'Na remada baixa, puxe direcionando os cotovelos rente ao corpo e aperte as escápulas com vontade.'
      },
      {
        id: 'lat_pulldown',
        name: 'Puxada Alta Frontal',
        nameEn: 'WIDE-GRIP LAT PULLDOWN',
        category: 'Costas',
        targetMuscle: 'Grande Dorsal (Largura em V)',
        secondaryMuscles: ['Redondo Maior', 'Bíceps', 'Braquial'],
        equipment: 'machine',
        position: 'seated',
        description: 'Desenvolve a famosa silhueta em V, aumentando a largura do tronco.',
        steps: [
          'Ajuste o apoio das coxas e segure a barra com pegada aberta pronada.',
          'Incline o tronco cerca de 10-15° para trás com o peito aberto.',
          'Puxe a barra em direção à parte superior do peito puxando pelos cotovelos.',
          'Retorne controladamente sentindo os dorsais se expandirem.'
        ],
        mistakes: [
          'Puxar a barra por trás da nuca (risco lesivo cervical).',
          'Jogar o corpo excessivamente para trás transformando a puxada em remada.'
        ],
        setsReps: {
          hypertrophy: '4 séries de 10 a 12 repetições',
          strength: '4 séries de 6 a 8 repetições',
          endurance: '3 séries de 15 repetições'
        },
        audioCue: 'Puxe a barra levando os cotovelos para os bolsos de trás da calça, focando na expansão das asas dorsais.'
      }
    ]
  },
  {
    id: 'abs',
    name: 'Abdômen & Core',
    nameEn: 'ABS / CORE',
    shortLabel: 'ABS',
    iconType: 'abs',
    exercises: [
      {
        id: 'cable_crunch',
        name: 'Abdominal na Polia Alta',
        nameEn: 'KNEELING CABLE CRUNCH',
        category: 'Abdômen',
        targetMuscle: 'Reto Abdominal (Six-Pack)',
        secondaryMuscles: ['Oblíquos', 'Transverso do Abdômen'],
        equipment: 'cable',
        position: 'seated',
        description: 'Permite sobrecarga progressiva real no abdômen para hipertrofia dos gomos.',
        steps: [
          'Ajoelhe-se em frente à polia alta segurando a corda ao lado das orelhas.',
          'Fixe o quadril no lugar e flexione a coluna enrolando o tronco em direção ao quadril.',
          'Expire todo o ar no ponto de contração máxima.',
          'Retorne de forma controlada desenrolando a coluna.'
        ],
        mistakes: [
          'Sentar nos calcanhares movendo o quadril em vez de flexionar a coluna.',
          'Puxar a corda com os braços em vez de usar a musculatura abdominal.'
        ],
        setsReps: {
          hypertrophy: '4 séries de 12 a 15 repetições',
          strength: '3 séries de 10 repetições',
          endurance: '3 séries de 20 a 25 repetições'
        },
        audioCue: 'No abdominal na polia, mantenha o quadril fixo e enrole o tronco espremendo os gomos abdominais.'
      }
    ]
  },
  {
    id: 'quads',
    name: 'Quadríceps',
    nameEn: 'QUADRICEPS',
    shortLabel: 'QUADS',
    iconType: 'quads',
    exercises: [
      {
        id: 'leg_extension',
        name: 'Cadeira Extensora',
        nameEn: 'SEATED LEG EXTENSION',
        category: 'Pernas',
        targetMuscle: 'Quadríceps (Reto Femoral e Vastos)',
        secondaryMuscles: ['Tensor da Fáscia Lata'],
        equipment: 'machine',
        position: 'seated',
        description: 'Isolamento estrito dos quatro ventres musculares do quadríceps com foco no vasto medial e gota.',
        steps: [
          'Ajuste o encosto de modo que o joelho coincida exatamente com o eixo da máquina.',
          'Posicione a almofada sobre a parte inferior das canelas.',
          'Estenda os joelhos até a contração máxima sem dar tranco articular.',
          'Segure por 1 segundo no topo e desça controlando a descida.'
        ],
        mistakes: [
          'Tirar o quadril do banco durante a fase de esforço.',
          'Usar impulso para arremessar o peso.'
        ],
        setsReps: {
          hypertrophy: '4 séries de 12 a 15 repetições com pico de contração',
          strength: '4 séries de 8 a 10 repetições',
          endurance: '3 séries de 20 repetições'
        },
        audioCue: 'Na extensora, trave o quadril no banco e aperte as coxas no topo por um segundo inteiro antes de descer lento.'
      },
      {
        id: 'goblet_squat',
        name: 'Agachamento Goblet',
        nameEn: 'GOBLET SQUAT',
        category: 'Pernas',
        targetMuscle: 'Quadríceps e Glúteos',
        secondaryMuscles: ['Core', 'Adutores', 'Panturrilha'],
        equipment: 'dumbbells',
        position: 'standing',
        description: 'Excelente para mobilidade de quadril e ativação equilibrada de toda a cadeia inferior.',
        steps: [
          'Segure um halter verticalmente rente ao peito com as duas mãos.',
          'Pés afastados na largura dos ombros com as pontas levemente para fora.',
          'Agache projetando os joelhos na direção da ponta dos pés mantendo o tronco ereto.',
          'Desça até a profundidade segura e empurre o chão pelos calcanhares.'
        ],
        mistakes: [
          'Deixar os joelhos colapsarem para dentro (valgo dinâmico).',
          'Arredondar as costas e curvar o peito para frente.'
        ],
        setsReps: {
          hypertrophy: '4 séries de 10 a 12 repetições',
          strength: '4 séries de 6 a 8 repetições',
          endurance: '3 séries de 15 a 20 repetições'
        },
        audioCue: 'No agachamento goblet, mantenha o peito aberto e empurre os joelhos para fora na descida.'
      }
    ]
  },
  {
    id: 'hamstrings_glutes',
    name: 'Glúteos & Posterior',
    nameEn: 'HAMSTRINGS & GLUTES',
    shortLabel: 'GLUTES',
    iconType: 'glutes',
    exercises: [
      {
        id: 'romanian_deadlift',
        name: 'Stiff com Halteres (RDL)',
        nameEn: 'ROMANIAN DEADLIFT',
        category: 'Pernas',
        targetMuscle: 'Glúteo Máximo e Isquiotibiais',
        secondaryMuscles: ['Eretores da Espinha', 'Trapézio', 'Antebraço'],
        equipment: 'dumbbells',
        position: 'standing',
        description: 'Maior ativador de cadeia posterior através da flexão pura do quadril.',
        steps: [
          'Em pé, segure os halteres na frente das coxas com joelhos semiflexionados.',
          'Empurre o quadril para trás como se fosse fechar uma porta com o bumbum.',
          'Desça os halteres rentes às pernas sentindo o alongamento do posterior de coxa.',
          'Retorne contraindo fortemente os glúteos no topo.'
        ],
        mistakes: [
          'Arredondar a coluna lombar na descida.',
          'Flexionar excessivamente os joelhos transformando o stiff em agachamento.'
        ],
        setsReps: {
          hypertrophy: '4 séries de 10 a 12 repetições',
          strength: '4 séries de 6 a 8 repetições',
          endurance: '3 séries de 15 repetições'
        },
        audioCue: 'No stiff, empurre o quadril bem para trás e mantenha os halteres colados na canela para proteger a lombar.'
      }
    ]
  },
  {
    id: 'calves',
    name: 'Panturrilhas',
    nameEn: 'CALVES',
    shortLabel: 'CALVES',
    iconType: 'calves',
    exercises: [
      {
        id: 'standing_calf_raise',
        name: 'Elevação de Panturrilha em Pé',
        nameEn: 'STANDING CALF RAISE',
        category: 'Pernas',
        targetMuscle: 'Gastrocnêmio e Sóleo',
        secondaryMuscles: ['Tibial Posterior', 'Plantar'],
        equipment: 'dumbbells',
        position: 'standing',
        description: 'Essencial para volume e definição da famosa panturrilha em formato de diamante.',
        steps: [
          'Apoie a ponta dos pés em um degrau ou bloco.',
          'Desça os calcanhares sentindo o alongamento completo das fibras.',
          'Suba na ponta dos pés o mais alto possível, espremendo no ápice.',
          'Segure a contração por 2 segundos antes de descer lentamente.'
        ],
        mistakes: [
          'Fazer repetições rápidas quicando sem pausar no pico de contração.'
        ],
        setsReps: {
          hypertrophy: '4 séries de 15 a 20 repetições com pausa de 2s no topo',
          strength: '4 séries de 10 a 12 repetições pesadas',
          endurance: '3 séries de 25 repetições'
        },
        audioCue: 'Na panturrilha, faça uma pausa de dois segundos no ponto mais alto para eliminar a elasticidade do tendão de Aquiles.'
      }
    ]
  }
];

// 3D Gym Bench & Dumbbells Prop Model
function GymEquipmentProps({ 
  position = 'seated',
  exerciseId 
}: { 
  position: 'seated' | 'standing' | 'lying' | 'incline';
  exerciseId: string;
}) {
  const benchMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0f172a',
    roughness: 0.4,
    metalness: 0.6,
  }), []);

  const leatherMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.8,
    metalness: 0.1,
  }), []);

  const chromeMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#94a3b8',
    roughness: 0.15,
    metalness: 0.95,
  }), []);

  const weightMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#090d16',
    roughness: 0.3,
    metalness: 0.8,
  }), []);

  return (
    <group>
      {/* Seated Gym Bench */}
      {position === 'seated' && (
        <group position={[0, -0.32, -0.05]}>
          {/* Seat Cushion */}
          <mesh material={leatherMat} position={[0, 0.46, 0.05]} castShadow receiveShadow>
            <boxGeometry args={[0.34, 0.08, 0.38]} />
          </mesh>
          {/* Backrest Cushion */}
          <mesh material={leatherMat} position={[0, 0.85, -0.15]} rotation={[0.08, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.3, 0.72, 0.07]} />
          </mesh>
          {/* Steel Frame Pillars */}
          <mesh material={benchMat} position={[0, 0.22, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.44, 16]} />
          </mesh>
          {/* Base Stabilizer Tubes */}
          <mesh material={benchMat} position={[0, 0.02, 0.22]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.035, 0.035, 0.52, 16]} />
          </mesh>
          <mesh material={benchMat} position={[0, 0.02, -0.25]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.035, 0.035, 0.52, 16]} />
          </mesh>
        </group>
      )}

      {/* Incline / Flat Bench */}
      {position === 'incline' && (
        <group position={[0, -0.32, -0.1]}>
          <mesh material={leatherMat} position={[0, 0.42, 0.1]} castShadow receiveShadow>
            <boxGeometry args={[0.34, 0.08, 0.35]} />
          </mesh>
          <mesh material={leatherMat} position={[0, 0.72, -0.22]} rotation={[-Math.PI / 6, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.3, 0.78, 0.07]} />
          </mesh>
          <mesh material={benchMat} position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.4, 16]} />
          </mesh>
        </group>
      )}
    </group>
  );
}

// 3D Dumbbells attached to hands
function HandDumbbell({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  const chromeMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    roughness: 0.2,
    metalness: 0.95
  }), []);

  const plateMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0f172a',
    roughness: 0.35,
    metalness: 0.8
  }), []);

  return (
    <group position={position} rotation={rotation || [0, 0, 0]}>
      {/* Central Handle Grip */}
      <mesh material={chromeMat} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.018, 0.018, 0.22, 16]} />
      </mesh>
      {/* Left Weight Plates */}
      <mesh material={plateMat} position={[-0.09, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.03, 24]} />
      </mesh>
      <mesh material={plateMat} position={[-0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.075, 0.075, 0.025, 24]} />
      </mesh>
      {/* Right Weight Plates */}
      <mesh material={plateMat} position={[0.09, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.03, 24]} />
      </mesh>
      <mesh material={plateMat} position={[0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.075, 0.075, 0.025, 24]} />
      </mesh>
    </group>
  );
}

// 3D Mannequin Anatomy Muscle Part with Glowing Highlight
function AnatomicalMuscleMesh({
  geometry,
  position,
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  muscleGroupKey,
  selectedMuscleKey,
  isSecondary = false,
  isPlaying = false,
  colorOverride
}: {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  muscleGroupKey: string;
  selectedMuscleKey: string;
  isSecondary?: boolean;
  isPlaying?: boolean;
  colorOverride?: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const isTarget = muscleGroupKey === selectedMuscleKey;

  const mat = useMemo(() => {
    if (colorOverride) {
      return new THREE.MeshStandardMaterial({
        color: colorOverride,
        roughness: 0.3,
        metalness: 0.15,
      });
    }

    if (isTarget) {
      // Vibrant Neon Orange / Amber matching user's screenshot
      return new THREE.MeshPhysicalMaterial({
        color: '#ff6a00',
        emissive: '#ff5500',
        emissiveIntensity: 2.8,
        roughness: 0.2,
        metalness: 0.1,
        clearcoat: 0.5,
        clearcoatRoughness: 0.2,
      });
    }

    if (isSecondary) {
      return new THREE.MeshPhysicalMaterial({
        color: '#f97316',
        emissive: '#ea580c',
        emissiveIntensity: 1.2,
        roughness: 0.3,
        metalness: 0.2,
        clearcoat: 0.3,
        clearcoatRoughness: 0.2,
      });
    }

    // Default Mannequin Skin (Sculpted anatomical clay/muscle aesthetic)
    return new THREE.MeshPhysicalMaterial({
      color: '#8b93a0',
      roughness: 0.45,
      metalness: 0.2,
      clearcoat: 0.15,
      clearcoatRoughness: 0.3,
    });
  }, [isTarget, isSecondary, colorOverride]);

  useFrame((state) => {
    if (!meshRef.current || !isTarget) return;
    if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
      const t = state.clock.getElapsedTime();
      const pulse = Math.sin(t * (isPlaying ? 5 : 2.5)) * 0.5 + 2.6;
      meshRef.current.material.emissiveIntensity = pulse;
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={mat}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow
      receiveShadow
    />
  );
}

// Full 3D Athletic Mannequin performing the selected exercise
function AnimatedMannequin3D({
  exercise,
  selectedMuscleKey,
  isPlaying,
  playbackSpeed,
  onProgressUpdate
}: {
  exercise: MuscleExercise;
  selectedMuscleKey: string;
  isPlaying: boolean;
  playbackSpeed: number;
  onProgressUpdate?: (progress: number) => void;
}) {
  const rootGroup = useRef<THREE.Group>(null);
  const spineGroup = useRef<THREE.Group>(null);
  const leftShoulderGroup = useRef<THREE.Group>(null);
  const rightShoulderGroup = useRef<THREE.Group>(null);
  const leftElbowGroup = useRef<THREE.Group>(null);
  const rightElbowGroup = useRef<THREE.Group>(null);
  const leftLegGroup = useRef<THREE.Group>(null);
  const rightLegGroup = useRef<THREE.Group>(null);
  const leftKneeGroup = useRef<THREE.Group>(null);
  const rightKneeGroup = useRef<THREE.Group>(null);

  // Smooth reusable anatomical geometries (Bodybuilder Proportions)
  const geo = useMemo(() => ({
    head: new THREE.SphereGeometry(0.18, 32, 32),
    neck: new THREE.CylinderGeometry(0.1, 0.13, 0.18, 24),
    chest: new THREE.CapsuleGeometry(0.16, 0.28, 24, 24), // Wider, thicker chest
    deltoid: new THREE.SphereGeometry(0.14, 24, 24), // Larger shoulders
    sideDeltCap: new THREE.CapsuleGeometry(0.08, 0.14, 16, 16),
    bicep: new THREE.CapsuleGeometry(0.085, 0.2, 16, 16), // Thicker arms
    tricep: new THREE.CapsuleGeometry(0.08, 0.18, 16, 16),
    forearm: new THREE.CapsuleGeometry(0.07, 0.22, 16, 16),
    hand: new THREE.CapsuleGeometry(0.045, 0.09, 12, 12),
    absUpper: new THREE.CapsuleGeometry(0.06, 0.1, 16, 16),
    absMid: new THREE.CapsuleGeometry(0.06, 0.09, 16, 16),
    absLower: new THREE.CapsuleGeometry(0.06, 0.08, 16, 16),
    oblique: new THREE.CapsuleGeometry(0.065, 0.18, 16, 16),
    lat: new THREE.CapsuleGeometry(0.1, 0.26, 24, 24), // Wider back (V-taper)
    shorts: new THREE.CapsuleGeometry(0.17, 0.28, 24, 24),
    quadMain: new THREE.CapsuleGeometry(0.12, 0.36, 24, 24), // Huge quads
    quadTear: new THREE.CapsuleGeometry(0.07, 0.16, 16, 16),
    hamstring: new THREE.CapsuleGeometry(0.1, 0.32, 24, 24),
    glute: new THREE.SphereGeometry(0.15, 24, 24),
    knee: new THREE.SphereGeometry(0.06, 16, 16),
    calf: new THREE.CapsuleGeometry(0.09, 0.3, 24, 24), // Bigger calves
    foot: new THREE.CapsuleGeometry(0.06, 0.18, 16, 16),
  }), []);

  // Shorts material (Dark fitness shorts matching user screenshot)
  const shortsMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0b1120',
    roughness: 0.8,
    metalness: 0.1
  }), []);

  useFrame((state) => {
    if (!rootGroup.current) return;
    const time = state.clock.getElapsedTime() * playbackSpeed;
    const cycle = (Math.sin(time * 2.2) + 1) / 2; // 0 to 1
    
    if (onProgressUpdate) {
      onProgressUpdate(cycle);
    }

    const isSeated = exercise.position === 'seated';
    const isLying = exercise.position === 'lying';
    const isStanding = exercise.position === 'standing';

    // Position root for Seated vs Standing
    if (isSeated) {
      rootGroup.current.position.set(0, 0.1, 0.02);
      // Seated hips & thighs forward
      if (leftLegGroup.current) {
        leftLegGroup.current.position.set(-0.16, 0.08, 0.05);
        leftLegGroup.current.rotation.set(-1.45, 0, -0.15);
      }
      if (rightLegGroup.current) {
        rightLegGroup.current.position.set(0.16, 0.08, 0.05);
        rightLegGroup.current.rotation.set(-1.45, 0, 0.15);
      }
      if (leftKneeGroup.current) leftKneeGroup.current.rotation.set(1.48, 0, 0);
      if (rightKneeGroup.current) rightKneeGroup.current.rotation.set(1.48, 0, 0);
    } else {
      rootGroup.current.position.set(0, 0.35, 0);
      if (leftLegGroup.current) {
        leftLegGroup.current.position.set(-0.15, 0.08, 0);
        leftLegGroup.current.rotation.set(0, 0, -0.05);
      }
      if (rightLegGroup.current) {
        rightLegGroup.current.position.set(0.15, 0.08, 0);
        rightLegGroup.current.rotation.set(0, 0, 0.05);
      }
      if (leftKneeGroup.current) leftKneeGroup.current.rotation.set(0, 0, 0);
      if (rightKneeGroup.current) rightKneeGroup.current.rotation.set(0, 0, 0);
    }

    // Exercise Biomechanical Movements
    if (exercise.id === 'seated_lateral_raises' || exercise.id === 'cable_lateral_raise') {
      // SEATED LATERAL RAISES: Exact pose from user's image!
      const raiseAngle = cycle * 1.35; // 0 to ~78 degrees abduction
      
      if (leftShoulderGroup.current) {
        leftShoulderGroup.current.rotation.set(0.15, 0, raiseAngle);
      }
      if (rightShoulderGroup.current) {
        rightShoulderGroup.current.rotation.set(0.15, 0, -raiseAngle);
      }
      if (leftElbowGroup.current) {
        leftElbowGroup.current.rotation.set(-0.35, 0.2, 0.25);
      }
      if (rightElbowGroup.current) {
        rightElbowGroup.current.rotation.set(-0.35, -0.2, -0.25);
      }
      if (spineGroup.current) {
        spineGroup.current.rotation.set(0.04, 0, 0);
      }
    } else if (exercise.id === 'standing_dumbbell_press') {
      // SHOULDER PRESS
      const pressAngle = cycle * 1.1;
      if (leftShoulderGroup.current) {
        leftShoulderGroup.current.rotation.set(0.8 - pressAngle * 0.4, 0, 0.8 + pressAngle * 0.5);
      }
      if (rightShoulderGroup.current) {
        rightShoulderGroup.current.rotation.set(0.8 - pressAngle * 0.4, 0, -0.8 - pressAngle * 0.5);
      }
      if (leftElbowGroup.current) {
        leftElbowGroup.current.rotation.set(-1.4 + pressAngle * 1.2, 0, 0);
      }
      if (rightElbowGroup.current) {
        rightElbowGroup.current.rotation.set(-1.4 + pressAngle * 1.2, 0, 0);
      }
    } else if (exercise.id.includes('curl')) {
      // BICEPS CURL
      const curlAngle = cycle * 1.55;
      if (leftShoulderGroup.current) leftShoulderGroup.current.rotation.set(0.15, 0, 0.1);
      if (rightShoulderGroup.current) rightShoulderGroup.current.rotation.set(0.15, 0, -0.1);
      if (leftElbowGroup.current) leftElbowGroup.current.rotation.set(curlAngle, 0, 0);
      if (rightElbowGroup.current) rightElbowGroup.current.rotation.set(curlAngle, 0, 0);
    } else if (exercise.id.includes('bench_press')) {
      // BENCH PRESS
      const pressDepth = cycle * 0.9;
      if (leftShoulderGroup.current) leftShoulderGroup.current.rotation.set(1.2 - pressDepth * 0.3, 0, 0.4 + pressDepth * 0.4);
      if (rightShoulderGroup.current) rightShoulderGroup.current.rotation.set(1.2 - pressDepth * 0.3, 0, -0.4 - pressDepth * 0.4);
      if (leftElbowGroup.current) leftElbowGroup.current.rotation.set(-pressDepth * 1.2, 0, 0);
      if (rightElbowGroup.current) rightElbowGroup.current.rotation.set(-pressDepth * 1.2, 0, 0);
    } else if (exercise.id.includes('squat')) {
      // SQUAT
      const squatDepth = cycle * 0.8;
      if (leftLegGroup.current) leftLegGroup.current.rotation.set(-squatDepth * 1.1, 0, -0.1);
      if (rightLegGroup.current) rightLegGroup.current.rotation.set(-squatDepth * 1.1, 0, 0.1);
      if (leftKneeGroup.current) leftKneeGroup.current.rotation.set(squatDepth * 1.3, 0, 0);
      if (rightKneeGroup.current) rightKneeGroup.current.rotation.set(squatDepth * 1.3, 0, 0);
    } else {
      // Standard rhythmic execution
      const genRaise = cycle * 0.6;
      if (leftShoulderGroup.current) leftShoulderGroup.current.rotation.set(0, 0, genRaise);
      if (rightShoulderGroup.current) rightShoulderGroup.current.rotation.set(0, 0, -genRaise);
    }
  });

  return (
    <group ref={rootGroup}>
      {/* Torso & Head */}
      <group ref={spineGroup} position={[0, 0.52, 0]}>
        {/* Head */}
        <group position={[0, 0.58, 0]}>
          <AnatomicalMuscleMesh
            geometry={geo.head}
            position={[0, 0.08, 0]}
            scale={[0.85, 1.0, 0.92]}
            muscleGroupKey="head"
            selectedMuscleKey={selectedMuscleKey}
          />
          <AnatomicalMuscleMesh
            geometry={geo.neck}
            position={[0, -0.1, 0]}
            scale={[1, 1, 0.95]}
            muscleGroupKey="neck"
            selectedMuscleKey={selectedMuscleKey}
          />
        </group>

        {/* Chest (Pectorals) */}
        <AnatomicalMuscleMesh
          geometry={geo.chest}
          position={[0, 0.34, 0.05]}
          rotation={[0, 0, Math.PI / 2]}
          scale={[1.15, 1.3, 0.9]}
          muscleGroupKey="chest"
          selectedMuscleKey={selectedMuscleKey}
        />

        {/* Lats (Back) */}
        <AnatomicalMuscleMesh
          geometry={geo.lat}
          position={[-0.17, 0.28, -0.07]}
          rotation={[0, 0.2, 0.2]}
          muscleGroupKey="back"
          selectedMuscleKey={selectedMuscleKey}
        />
        <AnatomicalMuscleMesh
          geometry={geo.lat}
          position={[0.17, 0.28, -0.07]}
          rotation={[0, -0.2, -0.2]}
          muscleGroupKey="back"
          selectedMuscleKey={selectedMuscleKey}
        />

        {/* Abdominals (Core) */}
        <group position={[0, 0.18, 0.09]}>
          <AnatomicalMuscleMesh
            geometry={geo.absUpper}
            position={[0, 0.09, 0]}
            rotation={[0, 0, Math.PI / 2]}
            scale={[1.4, 1.5, 0.9]}
            muscleGroupKey="abs"
            selectedMuscleKey={selectedMuscleKey}
          />
          <AnatomicalMuscleMesh
            geometry={geo.absMid}
            position={[0, -0.02, 0]}
            rotation={[0, 0, Math.PI / 2]}
            scale={[1.3, 1.4, 0.9]}
            muscleGroupKey="abs"
            selectedMuscleKey={selectedMuscleKey}
          />
          <AnatomicalMuscleMesh
            geometry={geo.absLower}
            position={[0, -0.12, 0]}
            rotation={[0, 0, Math.PI / 2]}
            scale={[1.2, 1.3, 0.9]}
            muscleGroupKey="abs"
            selectedMuscleKey={selectedMuscleKey}
          />
        </group>

        {/* Obliques */}
        <AnatomicalMuscleMesh
          geometry={geo.oblique}
          position={[-0.13, 0.12, 0.04]}
          rotation={[0, 0, 0.18]}
          muscleGroupKey="abs"
          selectedMuscleKey={selectedMuscleKey}
        />
        <AnatomicalMuscleMesh
          geometry={geo.oblique}
          position={[0.13, 0.12, 0.04]}
          rotation={[0, 0, -0.18]}
          muscleGroupKey="abs"
          selectedMuscleKey={selectedMuscleKey}
        />

        {/* Left Arm & Deltoid */}
        <group ref={leftShoulderGroup} position={[-0.30, 0.43, 0]}>
          {/* Deltoid Ball / Side Delts (Glowing Orange if side_delts selected!) */}
          <AnatomicalMuscleMesh
            geometry={geo.deltoid}
            position={[0, 0.02, 0]}
            scale={[1.2, 1.35, 1.1]}
            muscleGroupKey="side_delts"
            selectedMuscleKey={selectedMuscleKey}
            isPlaying={isPlaying}
          />
          {/* Bicep */}
          <AnatomicalMuscleMesh
            geometry={geo.bicep}
            position={[0, -0.16, 0.02]}
            muscleGroupKey="biceps"
            selectedMuscleKey={selectedMuscleKey}
          />
          {/* Tricep */}
          <AnatomicalMuscleMesh
            geometry={geo.tricep}
            position={[0, -0.16, -0.03]}
            muscleGroupKey="triceps"
            selectedMuscleKey={selectedMuscleKey}
          />
          {/* Forearm & Hand */}
          <group ref={leftElbowGroup} position={[0, -0.3, 0]}>
            <AnatomicalMuscleMesh
              geometry={geo.forearm}
              position={[0, -0.14, 0]}
              muscleGroupKey="arms"
              selectedMuscleKey={selectedMuscleKey}
            />
            <AnatomicalMuscleMesh
              geometry={geo.hand}
              position={[0, -0.28, 0]}
              muscleGroupKey="none"
              selectedMuscleKey={selectedMuscleKey}
            />
            {/* Dumbbell in Left Hand */}
            {exercise.equipment === 'dumbbells' && (
              <HandDumbbell position={[0, -0.28, 0]} />
            )}
          </group>
        </group>

        {/* Right Arm & Deltoid */}
        <group ref={rightShoulderGroup} position={[0.30, 0.43, 0]}>
          {/* Deltoid Ball / Side Delts (Glowing Orange if side_delts selected!) */}
          <AnatomicalMuscleMesh
            geometry={geo.deltoid}
            position={[0, 0.02, 0]}
            scale={[1.2, 1.35, 1.1]}
            muscleGroupKey="side_delts"
            selectedMuscleKey={selectedMuscleKey}
            isPlaying={isPlaying}
          />
          {/* Bicep */}
          <AnatomicalMuscleMesh
            geometry={geo.bicep}
            position={[0, -0.16, 0.02]}
            muscleGroupKey="biceps"
            selectedMuscleKey={selectedMuscleKey}
          />
          {/* Tricep */}
          <AnatomicalMuscleMesh
            geometry={geo.tricep}
            position={[0, -0.16, -0.03]}
            muscleGroupKey="triceps"
            selectedMuscleKey={selectedMuscleKey}
          />
          {/* Forearm & Hand */}
          <group ref={rightElbowGroup} position={[0, -0.3, 0]}>
            <AnatomicalMuscleMesh
              geometry={geo.forearm}
              position={[0, -0.14, 0]}
              muscleGroupKey="arms"
              selectedMuscleKey={selectedMuscleKey}
            />
            <AnatomicalMuscleMesh
              geometry={geo.hand}
              position={[0, -0.28, 0]}
              muscleGroupKey="none"
              selectedMuscleKey={selectedMuscleKey}
            />
            {/* Dumbbell in Right Hand */}
            {exercise.equipment === 'dumbbells' && (
              <HandDumbbell position={[0, -0.28, 0]} />
            )}
          </group>
        </group>
      </group>

      {/* Pelvis & Shorts */}
      <mesh geometry={geo.shorts} material={shortsMat} position={[0, 0.44, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1.2, 1.3, 1.1]} castShadow receiveShadow />

      {/* Left Leg */}
      <group ref={leftLegGroup} position={[-0.16, 0.4, 0]}>
        <AnatomicalMuscleMesh
          geometry={geo.quadMain}
          position={[0, -0.2, 0.02]}
          muscleGroupKey="quads"
          selectedMuscleKey={selectedMuscleKey}
        />
        <AnatomicalMuscleMesh
          geometry={geo.hamstring}
          position={[0, -0.2, -0.04]}
          muscleGroupKey="hamstrings_glutes"
          selectedMuscleKey={selectedMuscleKey}
        />
        <group ref={leftKneeGroup} position={[0, -0.42, 0]}>
          <AnatomicalMuscleMesh
            geometry={geo.knee}
            position={[0, 0, 0.02]}
            muscleGroupKey="none"
            selectedMuscleKey={selectedMuscleKey}
          />
          <AnatomicalMuscleMesh
            geometry={geo.calf}
            position={[0, -0.18, -0.02]}
            muscleGroupKey="calves"
            selectedMuscleKey={selectedMuscleKey}
          />
          <AnatomicalMuscleMesh
            geometry={geo.foot}
            position={[0, -0.36, 0.08]}
            rotation={[Math.PI / 2, 0, 0]}
            muscleGroupKey="none"
            selectedMuscleKey={selectedMuscleKey}
          />
        </group>
      </group>

      {/* Right Leg */}
      <group ref={rightLegGroup} position={[0.16, 0.4, 0]}>
        <AnatomicalMuscleMesh
          geometry={geo.quadMain}
          position={[0, -0.2, 0.02]}
          muscleGroupKey="quads"
          selectedMuscleKey={selectedMuscleKey}
        />
        <AnatomicalMuscleMesh
          geometry={geo.hamstring}
          position={[0, -0.2, -0.04]}
          muscleGroupKey="hamstrings_glutes"
          selectedMuscleKey={selectedMuscleKey}
        />
        <group ref={rightKneeGroup} position={[0, -0.42, 0]}>
          <AnatomicalMuscleMesh
            geometry={geo.knee}
            position={[0, 0, 0.02]}
            muscleGroupKey="none"
            selectedMuscleKey={selectedMuscleKey}
          />
          <AnatomicalMuscleMesh
            geometry={geo.calf}
            position={[0, -0.18, -0.02]}
            muscleGroupKey="calves"
            selectedMuscleKey={selectedMuscleKey}
          />
          <AnatomicalMuscleMesh
            geometry={geo.foot}
            position={[0, -0.36, 0.08]}
            rotation={[Math.PI / 2, 0, 0]}
            muscleGroupKey="none"
            selectedMuscleKey={selectedMuscleKey}
          />
        </group>
      </group>
    </group>
  );
}

// Interactive 3D Anatomy Guide Tab Component
export function AnatomyWorkoutGuide() {
  const [selectedMuscleId, setSelectedMuscleId] = useState<string>('side_delts');
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [cameraView, setCameraView] = useState<'front' | 'side' | 'top' | 'close'>('front');
  const [progress, setProgress] = useState<number>(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [activeTabSection, setActiveTabSection] = useState<'guide' | 'mistakes' | 'sets'>('guide');

  // Automatic Mode (Carrossel Automático de Músculos)
  const [isAutoCycle, setIsAutoCycle] = useState<boolean>(true);
  const [autoCycleSeconds, setAutoCycleSeconds] = useState<number>(4.5);
  const [autoTimerProgress, setAutoTimerProgress] = useState<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const selectedGroup = useMemo(() => {
    return MUSCLE_GROUPS.find(g => g.id === selectedMuscleId) || MUSCLE_GROUPS[0];
  }, [selectedMuscleId]);

  const currentExercise = useMemo(() => {
    return selectedGroup.exercises[selectedExerciseIndex] || selectedGroup.exercises[0];
  }, [selectedGroup, selectedExerciseIndex]);

  // Smooth Auto-Centering on active muscle change
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeEl = document.getElementById(`muscle-group-btn-${selectedMuscleId}`);
      if (activeEl) {
        const container = scrollContainerRef.current;
        const targetLeft = activeEl.offsetLeft - (container.offsetWidth / 2) + (activeEl.offsetWidth / 2);
        container.scrollTo({
          left: Math.max(0, targetLeft),
          behavior: 'smooth'
        });
      }
    }
  }, [selectedMuscleId]);

  // Auto-Cycle Engine (Passa automaticamente de músculo em músculo)
  useEffect(() => {
    if (!isAutoCycle) {
      setAutoTimerProgress(0);
      return;
    }

    const intervalMs = 100;
    const totalMs = autoCycleSeconds * 1000;
    const stepIncrement = (intervalMs / totalMs) * 100;

    const timer = setInterval(() => {
      setAutoTimerProgress((prev) => {
        if (prev >= 100) {
          // Switch to next muscle group
          const currentIndex = MUSCLE_GROUPS.findIndex(g => g.id === selectedMuscleId);
          const nextIndex = (currentIndex + 1) % MUSCLE_GROUPS.length;
          setSelectedMuscleId(MUSCLE_GROUPS[nextIndex].id);
          setSelectedExerciseIndex(0);
          return 0;
        }
        return prev + stepIncrement;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isAutoCycle, autoCycleSeconds, selectedMuscleId]);

  // Manual Previous/Next Muscle Controls
  const handlePrevMuscle = () => {
    const currentIndex = MUSCLE_GROUPS.findIndex(g => g.id === selectedMuscleId);
    const prevIndex = (currentIndex - 1 + MUSCLE_GROUPS.length) % MUSCLE_GROUPS.length;
    setSelectedMuscleId(MUSCLE_GROUPS[prevIndex].id);
    setSelectedExerciseIndex(0);
    setAutoTimerProgress(0);
    playSfx('tap');
    vibrate(10);
  };

  const handleNextMuscle = () => {
    const currentIndex = MUSCLE_GROUPS.findIndex(g => g.id === selectedMuscleId);
    const nextIndex = (currentIndex + 1) % MUSCLE_GROUPS.length;
    setSelectedMuscleId(MUSCLE_GROUPS[nextIndex].id);
    setSelectedExerciseIndex(0);
    setAutoTimerProgress(0);
    playSfx('tap');
    vibrate(10);
  };

  // Handle Voice Malu
  const handlePlayAudioCue = async () => {
    if (isAudioPlaying) {
      stopSpeech();
      setIsAudioPlaying(false);
      return;
    }

    try {
      setIsAudioPlaying(true);
      await speak(currentExercise.audioCue, {
        onEnded: () => setIsAudioPlaying(false)
      });
    } catch (e) {
      setIsAudioPlaying(false);
    }
  };

  const handleSelectMuscle = (groupId: string) => {
    setSelectedMuscleId(groupId);
    setSelectedExerciseIndex(0);
    setAutoTimerProgress(0);
    playSfx('tap');
    vibrate(12);
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 px-3 sm:px-4 md:px-6">
      
      {/* Centered Main Header */}
      <div className="flex flex-col items-center justify-center text-center space-y-3 mb-6 px-2 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-400/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm font-bold tracking-wide">
          <Zap className="w-4 h-4 text-emerald-500 animate-pulse" />
          <span>Instrutor Biomecânico 3D</span>
        </div>
        
        <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-emerald-800 dark:text-emerald-400 flex items-center justify-center gap-3">
          Guia de Execução 3D
        </h2>
        
        <p className="font-sans text-slate-600 dark:text-slate-300 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
          Selecione o grupo muscular para visualizar a anatomia, o movimento 3D biomecânico em tempo real com iluminação muscular e as orientações da Malu.
        </p>
      </div>

      {/* TOP MUSCLE SELECTOR CAROUSEL - COM MODO AUTOMÁTICO & AUTO-SCROLL */}
      <div className="w-full max-w-3xl mb-6 relative">
        
        {/* Header with Title and Auto-Play Switch */}
        <div className="flex items-center justify-between px-2 mb-3">
          {/* Active Muscle Title */}
          <div className="flex items-center gap-2 text-left">
            <span className="text-xs sm:text-sm font-black tracking-widest text-emerald-600 dark:text-emerald-400 uppercase">
              {selectedGroup.nameEn}
            </span>
            <span className="text-[11px] font-bold text-slate-400">
              • {selectedGroup.name}
            </span>
          </div>

          {/* Automatic Mode Toggle Badge with Progress Bar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsAutoCycle(!isAutoCycle);
                setAutoTimerProgress(0);
                playSfx('tap');
                vibrate(10);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer select-none border shadow-sm ${
                isAutoCycle
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 shadow-emerald-500/10'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
              }`}
              title="Alternar rotação automática da barra de músculos"
            >
              <Zap className={`w-3.5 h-3.5 ${isAutoCycle ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">Automático:</span>
              <span>{isAutoCycle ? 'LIGADO' : 'PAUSADO'}</span>
              
              {/* Mini Circular / Linear Progress indicator in Auto Mode */}
              {isAutoCycle && (
                <div className="w-3.5 h-3.5 relative flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-emerald-500/30"
                      strokeWidth="4"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-emerald-500"
                      strokeDasharray={`${autoTimerProgress}, 100`}
                      strokeWidth="4"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Carousel Container with Left/Right Arrows */}
        <div className="relative flex items-center group">
          
          {/* Left Arrow Button */}
          <button
            onClick={handlePrevMuscle}
            className="absolute -left-2 sm:-left-4 z-20 w-8 h-8 rounded-full bg-slate-900/90 border border-slate-700 text-slate-200 hover:text-emerald-400 hover:border-emerald-500/60 shadow-lg flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95"
            title="Músculo Anterior"
            aria-label="Músculo Anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Smooth Scrollable Muscle Cards Container */}
          <div
            ref={scrollContainerRef}
            className="w-full flex items-center gap-2.5 sm:gap-3 overflow-x-auto py-2.5 px-6 sm:px-8 no-scrollbar scroll-smooth snap-x snap-mandatory"
          >
            {MUSCLE_GROUPS.map((group) => {
              const isSelected = group.id === selectedMuscleId;
              return (
                <motion.button
                  key={group.id}
                  id={`muscle-group-btn-${group.id}`}
                  onClick={() => handleSelectMuscle(group.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`relative flex flex-col items-center justify-between p-2 sm:p-2.5 rounded-2xl min-w-[80px] sm:min-w-[92px] h-[96px] sm:h-[106px] transition-all duration-300 cursor-pointer select-none shrink-0 snap-center ${
                    isSelected
                      ? 'bg-slate-900/95 border-2 border-emerald-400 shadow-[0_0_22px_rgba(52,211,153,0.55)] ring-2 ring-emerald-400/50 scale-105'
                      : 'bg-slate-900/70 border border-slate-700/60 hover:border-slate-500 text-slate-400 opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* Anatomical Mini Silhouette Vector */}
                  <div className="w-10 h-10 sm:w-12 sm:h-12 relative flex items-center justify-center mt-0.5">
                    <MuscleSilhouetteIcon type={group.iconType} isSelected={isSelected} />
                  </div>

                  {/* Muscle Label (Short & Clear) */}
                  <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-tight text-center leading-tight whitespace-nowrap mb-0.5 ${
                    isSelected ? 'text-white' : 'text-slate-400'
                  }`}>
                    {group.shortLabel}
                  </span>

                  {/* Glowing Active Ring Effect */}
                  {isSelected && (
                    <motion.div
                      layoutId="activeGreenBox"
                      className="absolute -inset-0.5 rounded-2xl border-2 border-emerald-400 pointer-events-none"
                      transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Right Arrow Button */}
          <button
            onClick={handleNextMuscle}
            className="absolute -right-2 sm:-right-4 z-20 w-8 h-8 rounded-full bg-slate-900/90 border border-slate-700 text-slate-200 hover:text-emerald-400 hover:border-emerald-500/60 shadow-lg flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95"
            title="Próximo Músculo"
            aria-label="Próximo Músculo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Auto-Cycle Progress Line underneath bar */}
        {isAutoCycle && (
          <div className="w-full bg-slate-800/60 h-1 rounded-full overflow-hidden mt-2 max-w-xs mx-auto">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(52,211,153,0.8)]"
              style={{ width: `${autoTimerProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* MAIN 3D MANNEQUIN STAGE (Dark Gym Studio matching reference) */}
      <div className="w-full max-w-3xl bg-gradient-to-b from-[#0e1626] via-[#09101d] to-[#040810] rounded-[32px] sm:rounded-[40px] shadow-2xl border border-emerald-500/20 overflow-hidden relative flex flex-col items-center justify-center p-3 sm:p-5">
        
        {/* Top Floating Badge & Angle Selectors */}
        <div className="w-full flex items-center justify-between px-3 pt-2 z-10">
          <div className="px-3.5 py-1.5 bg-slate-950/80 backdrop-blur-md rounded-full border border-emerald-500/30 text-[11px] sm:text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{selectedGroup.name}</span>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 backdrop-blur-md rounded-full border border-slate-700/60 text-xs text-white">
            <button
              onClick={() => setCameraView('front')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all ${cameraView === 'front' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Frente
            </button>
            <button
              onClick={() => setCameraView('side')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all ${cameraView === 'side' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Perfil
            </button>
            <button
              onClick={() => setCameraView('close')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all ${cameraView === 'close' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Zoom
            </button>
          </div>
        </div>

        {/* 3D Three.js Canvas Stage */}
        <div className="w-full h-[400px] sm:h-[480px] relative flex items-center justify-center cursor-grab active:cursor-grabbing">
          <Canvas
            shadows
            dpr={[1, 2]}
            gl={{ antialias: true, alpha: true }}
            className="w-full h-full"
          >
            <PerspectiveCamera
              makeDefault
              position={
                cameraView === 'side'
                  ? [2.8, 0.7, 0.8]
                  : cameraView === 'close'
                  ? [0, 0.95, 1.8]
                  : [0, 0.75, 3.2]
              }
              fov={38}
            />

            <OrbitControls
              enablePan={false}
              target={[0, 0.65, 0]}
              minDistance={1.6}
              maxDistance={4.8}
              minPolarAngle={Math.PI / 6}
              maxPolarAngle={Math.PI / 1.8}
              dampingFactor={0.08}
              enableDamping
            />

            {/* Cinematic Studio Lighting with Strong Cool Rim Highlights */}
            <ambientLight intensity={0.4} color="#e2e8f0" />
            
            {/* Key Light (Front Right) */}
            <directionalLight position={[2, 3, 4]} intensity={2.0} color="#f8fafc" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.001} />
            
            {/* Fill Light (Front Left, softer) */}
            <directionalLight position={[-3, 1.5, 3]} intensity={1.2} color="#94a3b8" />
            
            {/* Strong Rim Light (Top Back) - Creates the glowing edge in the reference */}
            <spotLight position={[0, 4.5, -3]} intensity={8.0} color="#60a5fa" angle={Math.PI / 3} penumbra={0.5} />
            
            {/* Edge Light (Side Left) */}
            <directionalLight position={[-4, 2, -1]} intensity={2.5} color="#818cf8" />

            <Float speed={0} rotationIntensity={0} floatIntensity={0}>
              <AnimatedMannequin3D
                exercise={currentExercise}
                selectedMuscleKey={selectedMuscleId}
                isPlaying={isPlaying}
                playbackSpeed={playbackSpeed}
                onProgressUpdate={setProgress}
              />
              <GymEquipmentProps
                position={currentExercise.position}
                exerciseId={currentExercise.id}
              />
            </Float>

            <ContactShadows position={[0, -0.32, 0]} opacity={0.7} scale={3.5} blur={2.0} far={2.5} />
          </Canvas>

          {/* Exercise Name Overlay at the bottom of the 3D Stage (Matching user reference) */}
          <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center justify-center pointer-events-none px-4">
            <h3 className="text-white text-base sm:text-lg md:text-xl font-black uppercase tracking-wider drop-shadow-md text-center">
              {currentExercise.nameEn}
            </h3>
            <p className="text-emerald-400 text-xs sm:text-sm font-bold tracking-wide">
              {currentExercise.name}
            </p>
          </div>
        </div>

        {/* BOTTOM INTERACTIVE PLAYER CONTROLS (Matching user reference) */}
        <div className="w-full bg-slate-950/90 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-slate-800/80 flex flex-col gap-3">
          
          {/* Animated Timeline Scrubber */}
          <div className="w-full flex items-center gap-3">
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden relative">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-75"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <span className="text-[11px] font-mono text-emerald-400 font-bold shrink-0">
              {Math.round(progress * 100)}%
            </span>
          </div>

          {/* Player Buttons Bar */}
          <div className="flex items-center justify-between gap-2">
            {/* Speed Selector */}
            <div className="flex items-center gap-1 bg-slate-900 rounded-full p-1 border border-slate-800 text-xs">
              <button
                onClick={() => setPlaybackSpeed(0.5)}
                className={`px-2 py-0.5 rounded-full font-bold cursor-pointer ${playbackSpeed === 0.5 ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
              >
                0.5x
              </button>
              <button
                onClick={() => setPlaybackSpeed(1)}
                className={`px-2 py-0.5 rounded-full font-bold cursor-pointer ${playbackSpeed === 1 ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
              >
                1x
              </button>
              <button
                onClick={() => setPlaybackSpeed(1.5)}
                className={`px-2 py-0.5 rounded-full font-bold cursor-pointer ${playbackSpeed === 1.5 ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
              >
                1.5x
              </button>
            </div>

            {/* Center Play/Pause button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/40 cursor-pointer"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </motion.button>

            {/* Audio Explanation Button (Malu Aoede) */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePlayAudioCue}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                isAudioPlaying
                  ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-300 animate-pulse'
                  : 'bg-slate-900 text-emerald-400 border border-emerald-500/30 hover:bg-slate-800'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              <span>Voz Malu</span>
            </motion.button>
          </div>
        </div>

      </div>

      {/* EXERCISE VARIATIONS SELECTOR (If multiple exercises for muscle) */}
      {selectedGroup.exercises.length > 1 && (
        <div className="w-full max-w-3xl flex items-center justify-center gap-2 mt-4 overflow-x-auto pb-2">
          {selectedGroup.exercises.map((ex, idx) => (
            <button
              key={ex.id}
              onClick={() => {
                setSelectedExerciseIndex(idx);
                playSfx('tap');
              }}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedExerciseIndex === idx
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-500'
              }`}
            >
              {ex.name}
            </button>
          ))}
        </div>
      )}

      {/* TEACHING BREAKDOWN CARDS (Step by Step, Mistakes & Sets) */}
      <div className="w-full max-w-3xl mt-6 bg-white dark:bg-[#0F172A] rounded-[28px] sm:rounded-[36px] p-5 sm:p-7 shadow-xl border border-slate-200/80 dark:border-slate-800 text-left">
        
        {/* Navigation Tabs for Details */}
        <div className="flex items-center justify-center gap-2 mb-6 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-full max-w-md mx-auto">
          <button
            onClick={() => setActiveTabSection('guide')}
            className={`flex-1 py-2 px-3 rounded-full text-xs font-bold transition-all cursor-pointer text-center ${
              activeTabSection === 'guide'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Execução Correta
          </button>
          <button
            onClick={() => setActiveTabSection('mistakes')}
            className={`flex-1 py-2 px-3 rounded-full text-xs font-bold transition-all cursor-pointer text-center ${
              activeTabSection === 'mistakes'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Erros Fatais
          </button>
          <button
            onClick={() => setActiveTabSection('sets')}
            className={`flex-1 py-2 px-3 rounded-full text-xs font-bold transition-all cursor-pointer text-center ${
              activeTabSection === 'sets'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Séries & Carga
          </button>
        </div>

        {/* Section 1: Step by Step Guide */}
        {activeTabSection === 'guide' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Target className="w-5 h-5 shrink-0" />
              <h4 className="font-bold text-base sm:text-lg">Biomecânica & Músculo Alvo</h4>
            </div>
            
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {currentExercise.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/40">
                <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Músculo Alvo Primário</span>
                <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200 mt-0.5">{currentExercise.targetMuscle}</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Sinérgicos / Auxiliares</span>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-0.5">{currentExercise.secondaryMuscles.join(', ')}</p>
              </div>
            </div>

            <h5 className="font-bold text-sm text-slate-800 dark:text-slate-100 pt-3">Passo a Passo da Repetição Perfeita:</h5>
            <div className="space-y-2.5">
              {currentExercise.steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 2: Critical Mistakes */}
        {activeTabSection === 'mistakes' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h4 className="font-bold text-base sm:text-lg">Erros Comuns a Evitar</h4>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              Evite estes erros posturais e de compensação muscular para proteger as articulações e garantir estímulo hipertrófico direto no músculo correto:
            </p>

            <div className="space-y-3 pt-2">
              {currentExercise.mistakes.map((mistake, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3.5 bg-rose-50/70 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900/40">
                  <span className="text-rose-500 font-black text-sm shrink-0">✕</span>
                  <p className="text-xs sm:text-sm text-rose-900 dark:text-rose-200 leading-relaxed font-medium">{mistake}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 3: Sets & Reps */}
        {activeTabSection === 'sets' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Activity className="w-5 h-5 shrink-0" />
              <h4 className="font-bold text-base sm:text-lg">Protocolo de Séries e Repetições</h4>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-2">
              <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Hipertrofia & Ganho Muscular</span>
                  <Flame className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{currentExercise.setsReps.hypertrophy}</p>
              </div>

              <div className="p-4 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Força & Sobrecarga</span>
                  <ShieldCheck className="w-4 h-4 text-indigo-500" />
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{currentExercise.setsReps.strength}</p>
              </div>

              <div className="p-4 bg-amber-50/80 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">Resistência & Pump</span>
                  <Zap className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{currentExercise.setsReps.endurance}</p>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
