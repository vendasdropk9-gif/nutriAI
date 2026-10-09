import { DetailedExercise, EXERCISE_DATABASE, getExerciseById, MuscleGroupCategory } from '../data/exerciseDatabase';

// ============================================================================
// INTERFACES & TIPOS DO SERVIÇO DEMONSTRACAO INTELIGENTE
// ============================================================================

export type CameraViewpoint = 'front' | 'side' | 'detail';
export type GeneroAvatar = 'masculino' | 'feminino' | 'male' | 'female';
export type DificuldadeExercicio = 'beginner' | 'intermediate' | 'advanced' | 'iniciante' | 'intermediario' | 'avancado';

export interface CameraPositionConfig {
  viewpoint: CameraViewpoint;
  label: string;
  description: string;
  position: [number, number, number];
  lookAt: [number, number, number];
  fov: number;
  zoom?: number;
}

export interface AnimationAssetData {
  id: string;
  assetPath: string;
  clipName: string;
  variantesPorGenero?: {
    masculino: string;
    feminino: string;
  };
  duracaoSegundos: number;
  loop: boolean;
  velocidadePadrao: number;
  cadenciaTempo?: string; // ex: '2-1-2-0'
  fases?: {
    fase: 'concentric' | 'isometric' | 'eccentric' | 'reset';
    nome: string;
    proporcaoTempo: number;
    orientacao: string;
    respiracao: 'inhale' | 'exhale' | 'hold';
  }[];
}

export interface MusculoDetalhe {
  id: string;
  nome: string;
  tagAnatomica: string; // tag correspondente à malha 3D (ex: 'deltoid', 'chest', 'lat', 'quad', 'biceps', 'glute', 'core', 'triceps', 'trapezius', 'forearm', 'calf')
  papel: 'primario' | 'secundario' | 'estabilizador';
  intensidade: number; // 0.0 a 1.0 (brilho/ativação no shader)
  corGlow: string; // Código Hexadecimal de destaque
  frequenciaPulso: number; // Hz para pulsação
  descricao: string;
}

export interface ExercicioData {
  id: string;
  nome: string;
  nomeIngles?: string;
  grupoMuscular: MuscleGroupCategory;
  grupoMuscularLabel: string;
  equipamento: 'dumbbells' | 'barbell' | 'cable' | 'machine' | 'bench' | 'bodyweight' | 'kettlebell' | 'cardio_gear' | 'halteres' | 'barra' | 'polia' | 'maquina' | 'banco' | 'peso_corporal';
  equipamentoLabel: string;
  posicao: 'seated' | 'standing' | 'lying' | 'incline' | 'sentado' | 'em_pe' | 'deitado' | 'inclinado';
  dificuldade: DificuldadeExercicio;
  dificuldadeLabel: string;
  
  // Mapeamento Anatômico
  musculosPrimarios: string[];
  musculosPrimariosDetalhes: MusculoDetalhe[];
  musculosSecundarios: string[];
  musculosSecundariosDetalhes: MusculoDetalhe[];
  musculosEstabilizadores?: string[];
  
  // Assets de Animação 3D
  assetsAnimacao: AnimationAssetData;
  
  // Posições e Ângulos de Câmera para o AvatarAnatomico
  posicoesCamera: {
    front: CameraPositionConfig;
    side: CameraPositionConfig;
    detail: CameraPositionConfig;
    defaultView: CameraViewpoint;
    availableViews: CameraViewpoint[];
  };
  
  // Orientações Biomecânicas e de Segurança
  dicasBiomecanicas?: {
    titulo: string;
    descricao: string;
    pontoAtencao: string;
  }[];
  respiracao?: {
    inspirar: string;
    expirar: string;
    ritmo?: string;
  };
  sugestaoSeries?: number;
  sugestaoRepeticoes?: string;
  descansoSegundos?: number;
}

// ============================================================================
// GERADOR DE PRESETS DE CÂMERA
// ============================================================================

function gerarPosicoesCamera(
  grupo: MuscleGroupCategory,
  posicao: 'seated' | 'standing' | 'lying' | 'incline'
): {
  front: CameraPositionConfig;
  side: CameraPositionConfig;
  detail: CameraPositionConfig;
  defaultView: CameraViewpoint;
  availableViews: CameraViewpoint[];
} {
  const isDeitado = posicao === 'lying';
  const isSentado = posicao === 'seated';

  const frontPos: [number, number, number] = isDeitado 
    ? [0, 1.3, 2.8] 
    : isSentado 
    ? [0, 0.78, 3.2] 
    : [0, 0.85, 3.4];
    
  const frontLook: [number, number, number] = isDeitado 
    ? [0, 0.5, 0] 
    : isSentado 
    ? [0, 0.75, 0] 
    : [0, 0.85, 0];

  const sidePos: [number, number, number] = isDeitado 
    ? [2.9, 1.1, 0.1] 
    : isSentado 
    ? [3.1, 0.78, 0.15] 
    : [3.2, 0.85, 0.2];
    
  const sideLook: [number, number, number] = isDeitado 
    ? [0, 0.5, 0] 
    : isSentado 
    ? [0, 0.75, 0] 
    : [0, 0.85, 0];

  let detailPos: [number, number, number];
  let detailLook: [number, number, number];
  let defaultView: CameraViewpoint = 'front';

  switch (grupo) {
    case 'shoulders':
      detailPos = [0, 1.25, 1.8];
      detailLook = [0, 1.25, 0];
      defaultView = 'front';
      break;
    case 'chest':
      detailPos = [0, isDeitado ? 1.0 : 1.15, isDeitado ? 1.7 : 1.9];
      detailLook = [0, isDeitado ? 0.6 : 1.1, 0];
      defaultView = isDeitado ? 'side' : 'front';
      break;
    case 'back':
      detailPos = [0, 1.1, -2.1];
      detailLook = [0, 1.05, 0];
      defaultView = 'side';
      break;
    case 'legs':
      detailPos = [0, 0.45, 2.2];
      detailLook = [0, 0.4, 0];
      defaultView = 'front';
      break;
    case 'glutes':
      detailPos = [0, 0.75, -2.0];
      detailLook = [0, 0.7, 0];
      defaultView = 'side';
      break;
    case 'biceps':
    case 'triceps':
      detailPos = [0.8, 1.0, 1.6];
      detailLook = [0.4, 0.95, 0];
      defaultView = 'front';
      break;
    case 'core':
      detailPos = [0, 0.8, 2.0];
      detailLook = [0, 0.75, 0];
      defaultView = 'front';
      break;
    default:
      detailPos = [0, 0.9, 2.3];
      detailLook = [0, 0.85, 0];
      defaultView = 'front';
  }

  return {
    front: {
      viewpoint: 'front',
      label: 'Visão Frontal',
      description: 'Ângulo frontal com visão ampla do alinhamento biomecânico e simetria',
      position: frontPos,
      lookAt: frontLook,
      fov: 38,
      zoom: 1
    },
    side: {
      viewpoint: 'side',
      label: 'Visão Lateral',
      description: 'Perspectiva lateral para análise de postura, curvatura da coluna e trajetória',
      position: sidePos,
      lookAt: sideLook,
      fov: 38,
      zoom: 1
    },
    detail: {
      viewpoint: 'detail',
      label: 'Foco Muscular',
      description: 'Zoom anatômico detalhado com destaque de contração nos músculos primários',
      position: detailPos,
      lookAt: detailLook,
      fov: 28,
      zoom: 1.35
    },
    defaultView,
    availableViews: ['front', 'side', 'detail']
  };
}

// ============================================================================
// GERADOR DE DETALHES MUSCULARES
// ============================================================================

function mapearTagAnatomica(nome: string): string {
  const n = nome.toLowerCase();
  if (n.includes('deltoide lateral') || n.includes('lateral')) return 'deltoid';
  if (n.includes('deltoide anterior')) return 'deltoid';
  if (n.includes('deltoide') || n.includes('ombro')) return 'deltoid';
  if (n.includes('peitoral') || n.includes('peito')) return 'chest';
  if (n.includes('latíssimo') || n.includes('dorsal') || n.includes('costas')) return 'lat';
  if (n.includes('quadríceps') || n.includes('quadriceps') || n.includes('coxa')) return 'quad';
  if (n.includes('isquiotibiais') || n.includes('posterior')) return 'hamstring';
  if (n.includes('glúteo') || n.includes('gluteo')) return 'glute';
  if (n.includes('bíceps') || n.includes('biceps')) return 'biceps';
  if (n.includes('tríceps') || n.includes('triceps')) return 'triceps';
  if (n.includes('antebraço') || n.includes('antebraco')) return 'forearm';
  if (n.includes('panturrilha') || n.includes('gastrocnêmio')) return 'calf';
  if (n.includes('abdômen') || n.includes('abdomen') || n.includes('core')) return 'abs';
  if (n.includes('trapézio') || n.includes('trapezio')) return 'trapezius';
  return 'core';
}

function criarDetalhesMusculares(
  nomes: string[],
  papel: 'primario' | 'secundario' | 'estabilizador'
): MusculoDetalhe[] {
  const isPrimario = papel === 'primario';
  return nomes.map((nome, idx) => ({
    id: `${papel}-${idx}-${nome.toLowerCase().replace(/\s+/g, '-')}`,
    nome,
    tagAnatomica: mapearTagAnatomica(nome),
    papel,
    intensidade: isPrimario ? 0.95 : papel === 'secundario' ? 0.65 : 0.4,
    corGlow: isPrimario ? '#FF0033' : papel === 'secundario' ? '#E11D48' : '#38BDF8',
    frequenciaPulso: isPrimario ? 1.6 : 1.0,
    descricao: isPrimario
      ? `Principal motor de força com pico de ativação mecânica.`
      : `Músculo sinergista para suporte e equilíbrio do movimento.`
  }));
}

// ============================================================================
// REGISTRO GERAL DE EXERCÍCIOS
// ============================================================================

function construirRegistroExercicios(): Record<string, ExercicioData> {
  const registro: Record<string, ExercicioData> = {};

  EXERCISE_DATABASE.forEach(ex => {
    const posicoesCamera = gerarPosicoesCamera(ex.category, ex.position);
    const primariosDetalhes = criarDetalhesMusculares(ex.primaryMuscles, 'primario');
    const secundariosDetalhes = criarDetalhesMusculares(ex.secondaryMuscles, 'secundario');

    const assetsAnimacao: AnimationAssetData = {
      id: `anim-${ex.id}`,
      assetPath: `/models/animations/${ex.id}.glb`,
      clipName: ex.id,
      variantesPorGenero: {
        masculino: `/models/avatar_male.glb`,
        feminino: `/models/avatar_female.glb`
      },
      duracaoSegundos: 3.2,
      loop: true,
      velocidadePadrao: 1.0,
      cadenciaTempo: '2-1-2-0',
      fases: [
        {
          fase: 'concentric',
          nome: 'Fase Concêntrica (Contração)',
          proporcaoTempo: 0.45,
          orientacao: 'Eleve o peso com cadência controlada focando no músculo alvo.',
          respiracao: 'exhale'
        },
        {
          fase: 'isometric',
          nome: 'Pico de Contração',
          proporcaoTempo: 0.1,
          orientacao: 'Sustente por 1 segundo na contração máxima.',
          respiracao: 'hold'
        },
        {
          fase: 'eccentric',
          nome: 'Fase Excêntrica (Alongamento)',
          proporcaoTempo: 0.45,
          orientacao: 'Retorne resistindo à gravidade em 2 a 3 segundos.',
          respiracao: 'inhale'
        }
      ]
    };

    registro[ex.id] = {
      id: ex.id,
      nome: ex.name,
      nomeIngles: ex.englishName,
      grupoMuscular: ex.category,
      grupoMuscularLabel: ex.categoryLabel,
      equipamento: ex.equipment,
      equipamentoLabel: ex.equipmentLabel,
      posicao: ex.position,
      dificuldade: ex.difficulty,
      dificuldadeLabel: ex.difficultyLabel,
      musculosPrimarios: ex.primaryMuscles,
      musculosPrimariosDetalhes: primariosDetalhes,
      musculosSecundarios: ex.secondaryMuscles,
      musculosSecundariosDetalhes: secundariosDetalhes,
      assetsAnimacao,
      posicoesCamera,
      dicasBiomecanicas: [
        {
          titulo: 'Alinhamento Articular',
          descricao: ex.initialPosition || 'Mantenha a postura anatômica neutra e estabilize as escápulas.',
          pontoAtencao: ex.commonMistakes?.[0]?.mistake || 'Evite compensar o movimento com balanço do tronco.'
        },
        {
          titulo: 'Conexão Mente-Músculo',
          descricao: ex.movement || `Concentre a tensão exclusivamente no grupo ${ex.primaryMuscles.join(', ')}.`,
          pontoAtencao: ex.proTips?.[0] || 'Não relaxe o músculo no início ou no fim de cada repetição.'
        }
      ],
      respiracao: {
        inspirar: ex.breathing?.inhale || 'Inspire na fase excêntrica (retorno)',
        expirar: ex.breathing?.exhale || 'Expire na fase concêntrica (esforço)',
        ritmo: ex.breathing?.rhythmNote || 'Cadência cadenciada 2-0-2'
      },
      sugestaoSeries: ex.suggestedSets || 4,
      sugestaoRepeticoes: ex.suggestedReps || '8 a 12 reps',
      descansoSegundos: 60
    };
  });

  return registro;
}

// ============================================================================
// CLASSE E SERVIÇO DEMONSTRACAO INTELIGENTE
// ============================================================================

export class DemonstracaoInteligenteService {
  private registry: Record<string, ExercicioData>;

  constructor() {
    this.registry = construirRegistroExercicios();
  }

  /**
   * Recupera a estrutura completa de dados do exercício pelo ID.
   */
  public getExercicioData(exerciseId: string): ExercicioData | undefined {
    if (!exerciseId) return undefined;
    const cleanId = exerciseId.toLowerCase().trim();
    if (this.registry[cleanId]) {
      return this.registry[cleanId];
    }
    const foundKey = Object.keys(this.registry).find(
      k => k === cleanId || k.replace(/-/g, '_') === cleanId.replace(/-/g, '_')
    );
    return foundKey ? this.registry[foundKey] : undefined;
  }

  /**
   * Alias compatível: recupera a estrutura pelo ID do exercício.
   */
  public getExercicio(exerciseId: string): ExercicioData | undefined {
    return this.getExercicioData(exerciseId);
  }

  /**
   * Alias para getDemonstration
   */
  public getDemonstration(exerciseId: string): ExercicioData | undefined {
    return this.getExercicioData(exerciseId);
  }

  /**
   * Retorna a lista completa de todos os exercícios mapeados.
   */
  public getAllExercicios(): ExercicioData[] {
    return Object.values(this.registry);
  }

  /**
   * Retorna os exercícios filtrados por grupo muscular.
   */
  public getExerciciosPorGrupo(grupo: MuscleGroupCategory | string): ExercicioData[] {
    const g = grupo.toLowerCase().trim();
    return Object.values(this.registry).filter(ex => ex.grupoMuscular.toLowerCase() === g);
  }

  /**
   * Recupera os assets de animação 3D correspondentes a um exercício,
   * permitindo selecionar a variante de modelo pelo gênero do avatar.
   */
  public getAnimationAsset(
    exerciseId: string,
    gender: GeneroAvatar = 'masculino'
  ): {
    assetPath: string;
    clipName: string;
    duracaoSegundos: number;
    loop: boolean;
    velocidadePadrao: number;
    modelVariantPath: string;
  } | null {
    const data = this.getExercicioData(exerciseId);
    if (!data) return null;

    const isFeminino = gender === 'feminino' || gender === 'female';
    const modelVariantPath = isFeminino
      ? (data.assetsAnimacao.variantesPorGenero?.feminino || '/models/avatar_female.glb')
      : (data.assetsAnimacao.variantesPorGenero?.masculino || '/models/avatar_male.glb');

    return {
      assetPath: data.assetsAnimacao.assetPath,
      clipName: data.assetsAnimacao.clipName,
      duracaoSegundos: data.assetsAnimacao.duracaoSegundos,
      loop: data.assetsAnimacao.loop,
      velocidadePadrao: data.assetsAnimacao.velocidadePadrao,
      modelVariantPath
    };
  }

  /**
   * Retorna a configuração de posição de câmera para um ponto de vista específico ('front' | 'side' | 'detail').
   */
  public getCameraPositions(
    exerciseId: string,
    viewpoint: CameraViewpoint = 'front'
  ): CameraPositionConfig {
    const data = this.getExercicioData(exerciseId);
    if (data && data.posicoesCamera[viewpoint]) {
      return data.posicoesCamera[viewpoint];
    }
    // Preset padrão genérico se o exercício não for encontrado
    return {
      viewpoint,
      label: 'Visão Padrão',
      description: 'Posicionamento biomecânico padrão do avatar',
      position: [0, 0.85, 3.4],
      lookAt: [0, 0.85, 0],
      fov: 38,
      zoom: 1
    };
  }

  /**
   * Retorna a lista de nomes dos músculos primários do exercício.
   */
  public getPrimaryMuscles(exerciseId: string): string[] {
    const data = this.getExercicioData(exerciseId);
    return data ? data.musculosPrimarios : [];
  }

  /**
   * Retorna a lista de nomes dos músculos secundários do exercício.
   */
  public getSecondaryMuscles(exerciseId: string): string[] {
    const data = this.getExercicioData(exerciseId);
    return data ? data.musculosSecundarios : [];
  }

  /**
   * Gera a sequência temporizada de contração muscular para ser executada no AvatarAnatomico.
   */
  public getMuscleSequenceForExercise(exerciseId: string): {
    muscle: string;
    durationMs: number;
    intensity: number;
  }[] {
    const data = this.getExercicioData(exerciseId);
    if (!data) return [];

    const sequence: { muscle: string; durationMs: number; intensity: number }[] = [];

    // Passo 1: Músculos Primários
    data.musculosPrimariosDetalhes.forEach(m => {
      sequence.push({
        muscle: m.tagAnatomica,
        durationMs: 1600,
        intensity: m.intensidade
      });
    });

    // Passo 2: Músculos Secundários
    data.musculosSecundariosDetalhes.forEach(m => {
      sequence.push({
        muscle: m.tagAnatomica,
        durationMs: 1200,
        intensity: m.intensidade
      });
    });

    return sequence;
  }

  /**
   * Constrói props prontas para o componente AvatarAnatomico.
   */
  public buildAvatarProps(
    exerciseId: string,
    gender: GeneroAvatar = 'masculino',
    overrides?: {
      cameraView?: CameraViewpoint;
      isPlaying?: boolean;
      playbackSpeed?: number;
    }
  ) {
    const data = this.getExercicioData(exerciseId);
    if (!data) return {};

    const asset = this.getAnimationAsset(exerciseId, gender);

    return {
      exerciseId: data.id,
      primaryMuscles: data.musculosPrimarios,
      secondaryMuscles: data.musculosSecundarios,
      cameraView: overrides?.cameraView || data.posicoesCamera.defaultView,
      isPlaying: overrides?.isPlaying ?? true,
      playbackSpeed: overrides?.playbackSpeed ?? data.assetsAnimacao.velocidadePadrao,
      gender,
      modelUrl: asset?.modelVariantPath
    };
  }
}

// Instância Singleton exportada por padrão
export const demonstracaoInteligente = new DemonstracaoInteligenteService();

// Funções utilitárias exportadas diretamente
export const getExercicioData = (exerciseId: string): ExercicioData | undefined =>
  demonstracaoInteligente.getExercicioData(exerciseId);

export const getExercicio = (exerciseId: string): ExercicioData | undefined =>
  demonstracaoInteligente.getExercicio(exerciseId);

export const getDemonstration = (exerciseId: string): ExercicioData | undefined =>
  demonstracaoInteligente.getDemonstration(exerciseId);

export const getAnimationAsset = (exerciseId: string, gender: GeneroAvatar = 'masculino') =>
  demonstracaoInteligente.getAnimationAsset(exerciseId, gender);

export const getCameraPositions = (exerciseId: string, viewpoint: CameraViewpoint = 'front') =>
  demonstracaoInteligente.getCameraPositions(exerciseId, viewpoint);

export const getPrimaryMuscles = (exerciseId: string): string[] =>
  demonstracaoInteligente.getPrimaryMuscles(exerciseId);

export const getSecondaryMuscles = (exerciseId: string): string[] =>
  demonstracaoInteligente.getSecondaryMuscles(exerciseId);

export const getAllExercicios = (): ExercicioData[] =>
  demonstracaoInteligente.getAllExercicios();

export default demonstracaoInteligente;
