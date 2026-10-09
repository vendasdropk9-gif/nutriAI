export type MuscleGroupCategory = 
  | 'shoulders'
  | 'chest'
  | 'back'
  | 'biceps'
  | 'triceps'
  | 'legs'
  | 'glutes'
  | 'core'
  | 'cardio'
  | 'mobility';

export interface ExerciseMistake {
  mistake: string;
  fix: string;
}

export interface DetailedExercise {
  id: string;
  name: string;
  englishName: string;
  category: MuscleGroupCategory;
  categoryLabel: string;
  equipment: 'dumbbells' | 'barbell' | 'cable' | 'machine' | 'bench' | 'bodyweight' | 'kettlebell' | 'cardio_gear';
  equipmentLabel: string;
  position: 'seated' | 'standing' | 'lying' | 'incline';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  difficultyLabel: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  /** Custom dynamic highlight color for primary muscles (e.g. '#ff0033' or '#ff1744') */
  highlightColorPrimary?: string;
  /** Custom dynamic highlight color for secondary muscles (e.g. '#ff6a00' or '#f97316') */
  highlightColorSecondary?: string;
  referenceImage: string;
  initialPosition: string;
  movement: string;
  finalPosition: string;
  breathing: {
    inhale: string;
    exhale: string;
    rhythmNote?: string;
  };
  commonMistakes: ExerciseMistake[];
  proTips: string[];
  audioExplanation: string;
  cameraViews: ('front' | 'side' | 'detail')[];
  suggestedSets: number;
  suggestedReps: string;
  restSeconds: number;
  /** Optional GLTF animation asset path or identifier for 3D avatar biomechanical animation */
  animationAsset?: string;
}

export const EXERCISE_DATABASE: DetailedExercise[] = [
  // ==========================================
  // OMBROS (SHOULDERS)
  // ==========================================
  {
    id: 'seated-lateral-raises',
    name: 'Elevação Lateral Sentado',
    englishName: 'Seated Lateral Raises',
    category: 'shoulders',
    categoryLabel: 'Ombros',
    equipment: 'dumbbells',
    equipmentLabel: 'Halteres & Banco',
    position: 'seated',
    difficulty: 'intermediate',
    difficultyLabel: 'Intermediário',
    primaryMuscles: ['Deltoide Lateral'],
    secondaryMuscles: ['Trapézio Superior', 'Supraespinhal', 'Deltoide Anterior'],
    highlightColorPrimary: '#ff0033',
    highlightColorSecondary: '#ff6a00',
    referenceImage: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Sente-se ereto no banco, pés firmes no chão, halteres apoiados lateralmente ao longo do corpo com pegada neutra e escápulas travadas.',
    movement: 'Eleve os braços lateralmente mantendo leve flexão nos cotovelos (~15°) até a linha paralela aos ombros, guiando a subida pelos cotovelos sem impulso corporal.',
    finalPosition: 'Braços paralelos ao solo na altura dos ombros, cotovelos levemente flexionados e punhos alinhados sem ultrapassar a linha articular.',
    breathing: {
      inhale: 'Inspire durante a descida excêntrica controlada (2 a 3 segundos).',
      exhale: 'Expire no esforço concêntrico de subida até a altura dos ombros.',
      rhythmNote: 'Subida em 1s, pausa isométrica no topo de 1s, descida em 2s.'
    },
    commonMistakes: [
      {
        mistake: 'Balançar o tronco ou arquear a lombar para impulsionar a carga.',
        fix: 'Mantenha as costas firmes contra o encosto e reduza a carga se necessário.'
      },
      {
        mistake: 'Subir as mãos mais alto do que os cotovelos.',
        fix: 'Pense em "derramar uma jarra de água": cotovelos sobem na mesma altura ou levemente acima dos punhos.'
      },
      {
        mistake: 'Encolher os ombros ativando excessivamente o trapézio.',
        fix: 'Deprima as escápulas e empurre os halteres para longe do corpo, em direção às paredes.'
      }
    ],
    proTips: [
      'Incline o tronco levemente para frente (~10°) para alinhar o deltoide lateral no plano escapular ideal.',
      'Mantenha a tensão constante: não deixe os halteres tocarem nas pernas no ponto inferior.'
    ],
    audioExplanation: 'Sente-se no banco com a coluna ereta e abdômen contraído. Agora, eleve os braços lateralmente de forma controlada até a altura dos ombros. O principal músculo trabalhado é o deltoide lateral, com apoio do trapézio e supraespinhal. Controle a descida.',
    cameraViews: ['front', 'side', 'detail'],
    suggestedSets: 4,
    suggestedReps: '12-15 reps',
    restSeconds: 60
  },
  {
    id: 'dumbbell-shoulder-press',
    name: 'Desenvolvimento com Halteres',
    englishName: 'Seated Dumbbell Shoulder Press',
    category: 'shoulders',
    categoryLabel: 'Ombros',
    equipment: 'dumbbells',
    equipmentLabel: 'Halteres & Banco 80°',
    position: 'seated',
    difficulty: 'intermediate',
    difficultyLabel: 'Intermediário',
    primaryMuscles: ['Deltoide Anterior', 'Deltoide Lateral'],
    secondaryMuscles: ['Tríceps Braquial', 'Trapézio Superior', 'Peitoral Superior'],
    referenceImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Sentado com banco inclinado a 80°, halteres posicionados na altura das orelhas, cotovelos apontados levemente à frente no plano escapular.',
    movement: 'Empurre os halteres verticalmente para cima até quase estender os cotovelos, sem bater os pesos no topo.',
    finalPosition: 'Halteres acima da cabeça alinhados com os ombros, cotovelos estendidos sem hiperextensão articular.',
    breathing: {
      inhale: 'Inspire ao descer os halteres até a linha das orelhas de forma controlada.',
      exhale: 'Expire com força ao empurrar a carga para o alto.'
    },
    commonMistakes: [
      {
        mistake: 'Arquear excessivamente a lombar descolando o quadril do banco.',
        fix: 'Mantenha os pés firmes e o core ativado pressionando a lombar no encosto.'
      },
      {
        mistake: 'Abrir excessivamente os cotovelos para trás na linha coronal.',
        fix: 'Mantenha os cotovelos ~30° à frente no plano escapular para preservar o manguito rotador.'
      }
    ],
    proTips: [
      'Não bloqueie os cotovelos no topo para manter tensão mecânica contínua nas fibras do deltoide.'
    ],
    audioExplanation: 'Posicione os halteres na altura das orelhas. Empurre os pesos para o alto de forma controlada, focando a força no deltoide anterior e lateral. Desça devagar até o nível dos ombros.',
    cameraViews: ['front', 'side', 'detail'],
    suggestedSets: 4,
    suggestedReps: '8-12 reps',
    restSeconds: 90
  },
  {
    id: 'front-raise',
    name: 'Elevação Frontal',
    englishName: 'Dumbbell Front Raise',
    category: 'shoulders',
    categoryLabel: 'Ombros',
    equipment: 'dumbbells',
    equipmentLabel: 'Halteres',
    position: 'standing',
    difficulty: 'beginner',
    difficultyLabel: 'Iniciante',
    primaryMuscles: ['Deltoide Anterior'],
    secondaryMuscles: ['Peitoral Superior', 'Trapézio', 'Serrátil Anterior'],
    referenceImage: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Em pé, pés na largura dos ombros, segurando os halteres à frente das coxas com pegada pronada.',
    movement: 'Eleve os halteres à frente do corpo com braços estendidos até a altura dos olhos sem balançar o tronco.',
    finalPosition: 'Halteres na linha dos olhos paralelos ao chão com contração de pico no deltoide anterior.',
    breathing: {
      inhale: 'Inspire durante a descida suave e ritmada.',
      exhale: 'Expire durante a subida frontal.'
    },
    commonMistakes: [
      { mistake: 'Usar impulso lombar balançando o corpo para trás.', fix: 'Contraia os glúteos e abdômen mantendo o corpo imóvel.' }
    ],
    proTips: ['Use uma pegada neutra ou pronada para variar a ênfase no feixe clavicular.'],
    audioExplanation: 'Mantenha a postura ereta e eleve os halteres à frente até a linha dos olhos. Sinta o deltoide anterior trabalhar de forma isolada e controle o retorno.',
    cameraViews: ['front', 'side', 'detail'],
    suggestedSets: 3,
    suggestedReps: '12-15 reps',
    restSeconds: 60
  },
  {
    id: 'reverse-fly',
    name: 'Crucifixo Inverso',
    englishName: 'Bent-Over Reverse Fly',
    category: 'shoulders',
    categoryLabel: 'Ombros',
    equipment: 'dumbbells',
    equipmentLabel: 'Halteres',
    position: 'standing',
    difficulty: 'intermediate',
    difficultyLabel: 'Intermediário',
    primaryMuscles: ['Deltoide Posterior'],
    secondaryMuscles: ['Romboides', 'Trapézio Médio', 'Infraespinhal'],
    referenceImage: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Tronco inclinado à frente em 45°, coluna neutra, joelhos levemente flexionados, halteres abaixo do peito.',
    movement: 'Abra os braços para os lados em arco, mantendo cotovelos semi-flexionados e focando no deltoide posterior.',
    finalPosition: 'Braços alinhados na altura do dorso, cotovelos apontando para o teto.',
    breathing: {
      inhale: 'Inspire ao retornar os pesos ao centro.',
      exhale: 'Expire ao abrir os braços contraindo a parte de trás dos ombros.'
    },
    commonMistakes: [
      { mistake: 'Juntar excessivamente as escápulas antes de ativar o ombro.', fix: 'Inicie o movimento afastando os braços pelo deltoide posterior.' }
    ],
    proTips: ['Gire os polegares levemente para baixo no topo para máxima ativação do deltoide posterior.'],
    audioExplanation: 'Incline o tronco para a frente e abra os braços em arco. Foque toda a força na parte posterior dos ombros e controle o peso na volta.',
    cameraViews: ['side', 'front', 'detail'],
    suggestedSets: 4,
    suggestedReps: '12-15 reps',
    restSeconds: 60
  },
  {
    id: 'arnold-press',
    name: 'Arnold Press',
    englishName: 'Arnold Dumbbell Press',
    category: 'shoulders',
    categoryLabel: 'Ombros',
    equipment: 'dumbbells',
    equipmentLabel: 'Halteres & Banco',
    position: 'seated',
    difficulty: 'advanced',
    difficultyLabel: 'Avançado',
    primaryMuscles: ['Deltoide Anterior', 'Deltoide Lateral'],
    secondaryMuscles: ['Tríceps Braquial', 'Trapézio', 'Deltoide Posterior'],
    referenceImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Sentado com halteres à frente do peito, palmas das mãos voltadas para você em pegada supinada.',
    movement: 'Pressione os pesos para cima enquanto gira os punhos em 180°, terminando com palmas viradas para a frente.',
    finalPosition: 'Halteres acima da cabeça com extensão completa e palmas viradas para a frente.',
    breathing: {
      inhale: 'Inspire na descida com rotação inversa até a posição supinada inicial.',
      exhale: 'Expire durante a subida e rotação sincronizada.'
    },
    commonMistakes: [
      { mistake: 'Girar os punhos com pressa desarticulando a fluidez do movimento.', fix: 'Sincronize a rotação do início ao fim da subida contínua.' }
    ],
    proTips: ['Excelente exercício para recrutar as três porções do deltoide em uma única repetição.'],
    audioExplanation: 'Inicie com as palmas voltadas para você. Ao empurrar os halteres para cima, gire os punhos até que as palmas fiquem para a frente. O Arnold Press trabalha todos os feixes do ombro.',
    cameraViews: ['front', 'side', 'detail'],
    suggestedSets: 4,
    suggestedReps: '10-12 reps',
    restSeconds: 75
  },

  // ==========================================
  // PEITO (CHEST)
  // ==========================================
  {
    id: 'bench-press',
    name: 'Supino Reto',
    englishName: 'Barbell Bench Press',
    category: 'chest',
    categoryLabel: 'Peito',
    equipment: 'barbell',
    equipmentLabel: 'Barra Olímpica & Banco Reto',
    position: 'lying',
    difficulty: 'intermediate',
    difficultyLabel: 'Intermediário',
    primaryMuscles: ['Peitoral Maior (Fibras Esternais)'],
    secondaryMuscles: ['Deltoide Anterior', 'Tríceps Braquial', 'Serrátil Anterior'],
    referenceImage: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Deitado no banco reto, 5 pontos de contato firmes (pés, glúteos, dorso superior, cabeça e mãos na barra), escápulas em retração.',
    movement: 'Destrave a barra e desça de forma controlada até tocar suavemente a linha média do esterno com cotovelos em ~45-70°.',
    finalPosition: 'Empurre a barra em linha ligeiramente diagonal de volta à vertical sobre os ombros com extensão controlada.',
    breathing: {
      inhale: 'Inspire profundamente expandindo a caixa torácica durante a descida da barra.',
      exhale: 'Expire após passar o ponto de transição no impulso de subida.'
    },
    commonMistakes: [
      { mistake: 'Bater a barra no peito usando o impacto para subir.', fix: 'Toque suavemente no esterno e inverta a força de forma ativa.' },
      { mistake: 'Abrir cotovelos em 90° alinhados aos ombros.', fix: 'Mantenha os cotovelos em ângulo de ponta de flecha (~45-70°).' }
    ],
    proTips: ['Mantenha a retração e depressão escapular durante toda a série para proteger os ombros.'],
    audioExplanation: 'Deite-se no banco, apoie bem os pés no chão e retraia as escápulas. Desça a barra suavemente até tocar o centro do peito e empurre com explosão controlada.',
    cameraViews: ['front', 'side', 'detail'],
    suggestedSets: 4,
    suggestedReps: '8-10 reps',
    restSeconds: 90
  },
  {
    id: 'incline-dumbbell-press',
    name: 'Supino Inclinado com Halteres',
    englishName: 'Incline Dumbbell Press',
    category: 'chest',
    categoryLabel: 'Peito',
    equipment: 'dumbbells',
    equipmentLabel: 'Halteres & Banco 30°',
    position: 'incline',
    difficulty: 'intermediate',
    difficultyLabel: 'Intermediário',
    primaryMuscles: ['Peitoral Superior (Porção Clavicular)'],
    secondaryMuscles: ['Deltoide Anterior', 'Tríceps Braquial'],
    referenceImage: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Banco a 30-45°, halteres na linha do peito superior, cotovelos flexionados a 90° e escápulas aduzidas.',
    movement: 'Empurre os halteres para cima e para dentro convergindo suavemente no topo sem tocar os pesos.',
    finalPosition: 'Halteres alinhados sobre o peito superior com máxima contração das fibras claviculares.',
    breathing: {
      inhale: 'Inspire na descida sentindo o alongamento do peitoral superior.',
      exhale: 'Expire ao empurrar os halteres convergindo para o centro.'
    },
    commonMistakes: [
      { mistake: 'Inclinar o banco a mais de 45°, transferindo a carga para os deltoides.', fix: 'Mantenha o banco entre 30° e 45° para isolar o peitoral superior.' }
    ],
    proTips: ['Convergência suave no topo maximiza o encurtamento do peitoral clavicular.'],
    audioExplanation: 'No banco inclinado a 30 graus, empurre os halteres convergindo para o centro. Sinta a porção superior do peitoral contrair com máxima intensidade.',
    cameraViews: ['front', 'side', 'detail'],
    suggestedSets: 4,
    suggestedReps: '10-12 reps',
    restSeconds: 75
  },
  {
    id: 'decline-bench-press',
    name: 'Supino Declinado',
    englishName: 'Decline Barbell Bench Press',
    category: 'chest',
    categoryLabel: 'Peito',
    equipment: 'barbell',
    equipmentLabel: 'Barra & Banco Declinado',
    position: 'lying',
    difficulty: 'intermediate',
    difficultyLabel: 'Intermediário',
    primaryMuscles: ['Peitoral Inferior (Porção Costal)'],
    secondaryMuscles: ['Tríceps Braquial', 'Deltoide Anterior'],
    referenceImage: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Posicionado no banco declinado com tornozelos travados, segurando a barra com pegada ligeiramente mais larga que os ombros.',
    movement: 'Desça a barra controladamente em direção à parte inferior dos peitorais logo abaixo dos mamilos.',
    finalPosition: 'Empurre a barra verticalmente até extensão completa com pico de contração na porção inferior.',
    breathing: {
      inhale: 'Inspire na descida até o peito inferior.',
      exhale: 'Expire ao estender os braços.'
    },
    commonMistakes: [
      { mistake: 'Descer a barra muito acima perto da garganta.', fix: 'Mire a linha inferior do peitoral para biomecânica segura.' }
    ],
    proTips: ['Menor estresse nos ombros em comparação com o supino reto tradicional.'],
    audioExplanation: 'Com os pés presos no banco declinado, desça a barra até a linha inferior do peitoral e empurre com força. Ideal para desenhar o contorno inferior do peito.',
    cameraViews: ['side', 'front', 'detail'],
    suggestedSets: 4,
    suggestedReps: '10-12 reps',
    restSeconds: 75
  },
  {
    id: 'dumbbell-flyes',
    name: 'Crucifixo com Halteres',
    englishName: 'Flat Dumbbell Flyes',
    category: 'chest',
    categoryLabel: 'Peito',
    equipment: 'dumbbells',
    equipmentLabel: 'Halteres & Banco',
    position: 'lying',
    difficulty: 'intermediate',
    difficultyLabel: 'Intermediário',
    primaryMuscles: ['Peitoral Maior (Fibras Esternais)'],
    secondaryMuscles: ['Deltoide Anterior', 'Bíceps Braquial (Cabeça Curta)'],
    referenceImage: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Deitado no banco reto segurando os halteres sobre o peito com pegada neutra e cotovelos com leve flexão fixa.',
    movement: 'Abra os braços lateralmente em arco amplo sentindo o peitoral esticar ao máximo.',
    finalPosition: 'Halteres no nível do tórax com grande alongamento, retornando em abraço ao topo.',
    breathing: {
      inhale: 'Inspire profundamente durante o arco de abertura.',
      exhale: 'Expire fechando os braços em abraço.'
    },
    commonMistakes: [
      { mistake: 'Transformar o crucifixo em um supino dobrando os cotovelos.', fix: 'Mantenha o ângulo dos cotovelos congelado durante todo o arco.' }
    ],
    proTips: ['Imagine estar abraçando uma árvore no movimento de subida.'],
    audioExplanation: 'Abra os braços em arco mantendo os cotovelos levemente flexionados. Ao fechar, contraia o peitoral como se estivesse dando um abraço firme.',
    cameraViews: ['front', 'side', 'detail'],
    suggestedSets: 3,
    suggestedReps: '12-15 reps',
    restSeconds: 60
  },
  {
    id: 'cable-crossover',
    name: 'Crossover no Cabo',
    englishName: 'Cable Crossover',
    category: 'chest',
    categoryLabel: 'Peito',
    equipment: 'cable',
    equipmentLabel: 'Polia Dupla',
    position: 'standing',
    difficulty: 'intermediate',
    difficultyLabel: 'Intermediário',
    primaryMuscles: ['Peitoral Maior (Fibras Esternais e Inferiores)'],
    secondaryMuscles: ['Deltoide Anterior', 'Serrátil Anterior'],
    referenceImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Em pé no centro do cross com um pé à frente para estabilidade, cabos nas mãos com leve inclinação do tronco.',
    movement: 'Puxe as alças para baixo e para frente cruzando levemente as mãos à frente do quadril com contração máxima.',
    finalPosition: 'Mãos unidas à frente do corpo com peitoral espremido por 1 segundo.',
    breathing: {
      inhale: 'Inspire ao deixar os cabos abrirem suavemente.',
      exhale: 'Expire ao fechar e cruzar as mãos.'
    },
    commonMistakes: [
      { mistake: 'Balançar o corpo para empurrar o peso com impulso.', fix: 'Mantenha o tronco estável e faça o movimento apenas pelos ombros.' }
    ],
    proTips: ['Excelente tensão contínua em todo o percurso devido aos cabos.'],
    audioExplanation: 'Traga os cabos em arco fechando à frente do tronco. Esprema os peitorais no ponto final para recrutar o máximo de fibras musculares.',
    cameraViews: ['front', 'side', 'detail'],
    suggestedSets: 4,
    suggestedReps: '12-15 reps',
    restSeconds: 60
  },
  {
    id: 'push-up',
    name: 'Flexão de Braço',
    englishName: 'Classic Push-Up',
    category: 'chest',
    categoryLabel: 'Peito',
    equipment: 'bodyweight',
    equipmentLabel: 'Peso Corporal',
    position: 'lying',
    difficulty: 'beginner',
    difficultyLabel: 'Iniciante',
    primaryMuscles: ['Peitoral Maior'],
    secondaryMuscles: ['Tríceps Braquial', 'Deltoide Anterior', 'Core / Abdômen'],
    referenceImage: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Posição de prancha alta com as mãos apoiadas no chão na largura dos ombros e corpo formando uma linha reta.',
    movement: 'Flexione os cotovelos descendo o peito até ficar a 2 cm do chão, mantendo o core firme e glúteos ativados.',
    finalPosition: 'Empurre o chão com força até estender os braços, retornando à prancha.',
    breathing: {
      inhale: 'Inspire na descida controlada em direção ao solo.',
      exhale: 'Expire ao empurrar o chão de volta para cima.'
    },
    commonMistakes: [
      { mistake: 'Deixar o quadril ceder curvando a coluna lombar.', fix: 'Mantenha o abdômen e glúteos travados em prancha o tempo todo.' }
    ],
    proTips: ['Para maior conforto articular, aponte os dedos levemente para fora em ~10°.'],
    audioExplanation: 'Mantenha o corpo reto como uma prancha. Desça o peito próximo ao chão e empurre com força pelos peitorais e tríceps.',
    cameraViews: ['front', 'side', 'detail'],
    suggestedSets: 3,
    suggestedReps: '15-20 reps',
    restSeconds: 60
  },

  // ==========================================
  // COSTAS (BACK)
  // ==========================================
  {
    id: 'lat-pulldown',
    name: 'Puxada Frontal',
    englishName: 'Wide-Grip Lat Pulldown',
    category: 'back',
    categoryLabel: 'Costas',
    equipment: 'machine',
    equipmentLabel: 'Polia Alta & Barra Reta',
    position: 'seated',
    difficulty: 'beginner',
    difficultyLabel: 'Iniciante',
    primaryMuscles: ['Grande Dorsal (Latissimus Dorsi)'],
    secondaryMuscles: ['Bíceps Braquial', 'Romboides', 'Redondo Maior', 'Braquial'],
    referenceImage: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Sentado com coxas travadas sob os rolos de apoio, segurando a barra com pegada pronada aberta, tronco ereto.',
    movement: 'Inicie deprimindo as escápulas e puxe a barra verticalmente em direção ao peito superior, levando os cotovelos para baixo e para trás.',
    finalPosition: 'Barra tocando a linha da clavícula, peito estufado e dorsais completamente contraídos.',
    breathing: {
      inhale: 'Inspire durante a subida controlada da barra até o alongamento total das dorsais.',
      exhale: 'Expire com energia ao puxar a barra em direção ao peitoral.'
    },
    commonMistakes: [
      { mistake: 'Inclinar o tronco excessivamente para trás transformando em remada.', fix: 'Mantenha o tronco com leve inclinação de apenas ~10-15°.' },
      { mistake: 'Puxar a barra por trás do pescoço comprimindo a coluna cervical.', fix: 'Sempre puxe pela frente até a linha da clavícula.' }
    ],
    proTips: ['Imagine os dedos como meros ganchos e puxe o peso liderando pelos cotovelos.'],
    audioExplanation: 'Segure a barra com pegada aberta e sente-se com a coluna alinhada. Puxe a barra em direção ao peito superior guiando pelos cotovelos. Sinta as dorsais se contraírem com firmeza.',
    cameraViews: ['front', 'side', 'detail'],
    suggestedSets: 4,
    suggestedReps: '10-12 reps',
    restSeconds: 75
  },
  {
    id: 'pull-up',
    name: 'Barra Fixa',
    englishName: 'Pull-Up',
    category: 'back',
    categoryLabel: 'Costas',
    equipment: 'bodyweight',
    equipmentLabel: 'Barra Fixa',
    position: 'standing',
    difficulty: 'advanced',
    difficultyLabel: 'Avançado',
    primaryMuscles: ['Grande Dorsal'],
    secondaryMuscles: ['Bíceps Braquial', 'Braquiorradial', 'Romboides', 'Trapézio Inferior'],
    referenceImage: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Suspenso na barra com pegada pronada mais larga que os ombros e braços estendidos.',
    movement: 'Puxe o corpo para cima até que o queixo ultrapasse a linha da barra, deprimindo escápulas.',
    finalPosition: 'Queixo acima da barra com dorsais espremidas e peito aberto.',
    breathing: {
      inhale: 'Inspire na descida lenta e controlada até extensão completa.',
      exhale: 'Expire na puxada explosiva para cima.'
    },
    commonMistakes: [
      { mistake: 'Fazer "kipping" balançando as pernas para subir.', fix: 'Mantenha o corpo firme e imóvel usando pura força muscular.' }
    ],
    proTips: ['Cruze os tornozelos e contraia os glúteos para maior rigidez corporal.'],
    audioExplanation: 'Segure firme na barra e puxe o corpo até o queixo passar da barra. Controle a descida para maximizar o ganho de força e volume nas costas.',
    cameraViews: ['front', 'side', 'detail'],
    suggestedSets: 4,
    suggestedReps: '6-10 reps',
    restSeconds: 90
  },
  {
    id: 'seated-cable-row',
    name: 'Remada Baixa no Triângulo',
    englishName: 'Seated Cable Row',
    category: 'back',
    categoryLabel: 'Costas',
    equipment: 'cable',
    equipmentLabel: 'Polia Baixa & Puxador Triângulo',
    position: 'seated',
    difficulty: 'intermediate',
    difficultyLabel: 'Intermediário',
    primaryMuscles: ['Romboides', 'Grande Dorsal', 'Trapézio Médio'],
    secondaryMuscles: ['Bíceps Braquial', 'Braquial', 'Eretores da Espinha'],
    referenceImage: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Sentado com joelhos levemente flexionados, pés apoiados na plataforma, coluna ereta e braços estendidos segurando o triângulo.',
    movement: 'Puxe o triângulo em direção ao abdômen inferior retraindo as escápulas com cotovelos rente às costelas.',
    finalPosition: 'Triângulo junto ao umbigo, peito estufado e escápulas totalmente aduzidas.',
    breathing: {
      inhale: 'Inspire ao permitir que os braços estendam suavemente com dorsais alongadas.',
      exhale: 'Expire ao puxar o triângulo contraindo a musculatura das costas.'
    },
    commonMistakes: [
      { mistake: 'Balançar o tronco para trás e para frente usando impulso lombar.', fix: 'Mantenha o tronco firme a 90° e mova apenas os braços e escápulas.' }
    ],
    proTips: ['No ponto final, segure 1 segundo espremendo o meio das costas como se segurasse uma caneta entre as escápulas.'],
    audioExplanation: 'Sente-se com as costas eretas e puxe o triângulo em direção ao abdômen. Aperte as escápulas no final e controle a volta sem curvar a coluna.',
    cameraViews: ['side', 'front', 'detail'],
    suggestedSets: 4,
    suggestedReps: '10-12 reps',
    restSeconds: 75
  },
  {
    id: 'bent-over-row',
    name: 'Remada Curvada com Barra',
    englishName: 'Barbell Bent-Over Row',
    category: 'back',
    categoryLabel: 'Costas',
    equipment: 'barbell',
    equipmentLabel: 'Barra Olímpica',
    position: 'standing',
    difficulty: 'advanced',
    difficultyLabel: 'Avançado',
    primaryMuscles: ['Grande Dorsal', 'Romboides', 'Trapézio Médio'],
    secondaryMuscles: ['Bíceps Braquial', 'Eretores da Espinha', 'Posteriores da Coxa'],
    referenceImage: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Em pé com barra na mão, tronco inclinado a 45°, coluna neutra, joelhos levemente flexionados.',
    movement: 'Puxe a barra em direção ao umbigo mantendo os cotovelos próximos ao corpo.',
    finalPosition: 'Barra tocando o abdômen com retração escapular profunda.',
    breathing: {
      inhale: 'Inspire na descida controlada da barra.',
      exhale: 'Expire ao puxar a barra contraindo o dorso.'
    },
    commonMistakes: [
      { mistake: 'Curvar a coluna lombar durante o movimento.', fix: 'Mantenha o peito aberto e a lombar rigorosamente travada e neutra.' }
    ],
    proTips: ['Um dos melhores construtores de densidade e espessura para as costas.'],
    audioExplanation: 'Com a coluna neutra e inclinada, puxe a barra rente às pernas até encostar no abdômen. Sinta a musculatura das costas trabalhar pesado.',
    cameraViews: ['side', 'front', 'detail'],
    suggestedSets: 4,
    suggestedReps: '8-10 reps',
    restSeconds: 90
  },
  {
    id: 'single-arm-dumbbell-row',
    name: 'Remada Unilateral com Halter',
    englishName: 'Single-Arm Dumbbell Row (Saw)',
    category: 'back',
    categoryLabel: 'Costas',
    equipment: 'dumbbells',
    equipmentLabel: 'Halter & Banco Plano',
    position: 'standing',
    difficulty: 'intermediate',
    difficultyLabel: 'Intermediário',
    primaryMuscles: ['Grande Dorsal'],
    secondaryMuscles: ['Romboides', 'Bíceps Braquial', 'Deltoide Posterior'],
    referenceImage: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Um joelho e mão apoiados no banco, outro pé firme no solo, segurando o halter com braço estendido.',
    movement: 'Puxe o halter em direção ao quadril desenhando um arco com o cotovelo apontando para trás e para cima.',
    finalPosition: 'Halter na altura da cintura com contração concentrada do dorsal.',
    breathing: {
      inhale: 'Inspire descendo o halter até o alongamento da dorsal.',
      exhale: 'Expire puxando o halter em direção ao quadril.'
    },
    commonMistakes: [
      { mistake: 'Girar o tronco para levantar o peso.', fix: 'Mantenha os ombros paralelos ao chão durante todo o percurso.' }
    ],
    proTips: ['Puxe em direção ao quadril e não ao peito para isolar a porção inferior da dorsal.'],
    audioExplanation: 'Apoie o joelho no banco e puxe o halter em direção ao quadril. Mantenha os ombros alinhados e aperte o dorsal no topo.',
    cameraViews: ['side', 'front', 'detail'],
    suggestedSets: 3,
    suggestedReps: '10-12 reps cada lado',
    restSeconds: 60
  },
  {
    id: 'straight-arm-pulldown',
    name: 'Pulldown no Cabo',
    englishName: 'Straight-Arm Cable Pulldown',
    category: 'back',
    categoryLabel: 'Costas',
    equipment: 'cable',
    equipmentLabel: 'Polia Alta & Barra Reta',
    position: 'standing',
    difficulty: 'intermediate',
    difficultyLabel: 'Intermediário',
    primaryMuscles: ['Grande Dorsal (Porção Inferior)'],
    secondaryMuscles: ['Redondo Maior', 'Tríceps (Cabeça Longa)', 'Peitoral Maior'],
    referenceImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Em pé em frente à polia alta, segurando a barra com braços estendidos e leve flexão no quadril.',
    movement: 'Empurre a barra para baixo em arco amplo com braços quase retos até tocar as coxas.',
    finalPosition: 'Barra encostada nas coxas com contração violenta das dorsais.',
    breathing: {
      inhale: 'Inspire deixando a barra subir suavemente até a linha dos olhos.',
      exhale: 'Expire abaixando a barra em arco contínuo.'
    },
    commonMistakes: [
      { mistake: 'Flexionar os cotovelos transformando em extensão de tríceps.', fix: 'Mantenha os cotovelos quase travados com flexão mínima.' }
    ],
    proTips: ['Excelente para isolar o dorsal sem fadiga antecipada do bíceps.'],
    audioExplanation: 'Com os braços quase retos, empurre a barra para baixo em direção às coxas. Sinta o grande dorsal trabalhar isolado do início ao fim.',
    cameraViews: ['side', 'front', 'detail'],
    suggestedSets: 4,
    suggestedReps: '12-15 reps',
    restSeconds: 60
  },

  // ==========================================
  // BÍCEPS (BICEPS)
  // ==========================================
  {
    id: 'barbell-curl',
    name: 'Rosca Direta com Barra',
    englishName: 'Standing Barbell Bicep Curl',
    category: 'biceps',
    categoryLabel: 'Bíceps',
    equipment: 'barbell',
    equipmentLabel: 'Barra W / Reta',
    position: 'standing',
    difficulty: 'intermediate',
    difficultyLabel: 'Intermediário',
    primaryMuscles: ['Bíceps Braquial (Cabeça Curta e Longa)'],
    secondaryMuscles: ['Braquial Anterior', 'Braquiorradial', 'Flexores do Punho'],
    referenceImage: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Em pé, pés na largura dos ombros, segurando a barra com pegada supinada na largura dos ombros, cotovelos colados ao tronco.',
    movement: 'Flexione os cotovelos elevando a barra em arco até o peito superior, mantendo os cotovelos fixos e imóveis.',
    finalPosition: 'Barra próxima ao peito superior com bíceps sob contração máxima de pico.',
    breathing: {
      inhale: 'Inspire na descida lenta e controlada estendendo os braços.',
      exhale: 'Expire ao flexionar os cotovelos subindo a barra.'
    },
    commonMistakes: [
      { mistake: 'Projetar os cotovelos para frente aliviando a tensão do bíceps.', fix: 'Mantenha os cotovelos fixos ao lado do corpo como dobradiças.' },
      { mistake: 'Jogar o tronco para trás usando impulso lombar.', fix: 'Contraia o abdômen e glúteos mantendo o corpo imóvel.' }
    ],
    proTips: ['Use a barra W se sentir desconforto nos punhos com a barra reta.'],
    audioExplanation: 'Segure a barra com as palmas voltadas para cima e cotovelos colados ao tronco. Flexione os braços até o topo e aperte o bíceps com firmeza.',
    cameraViews: ['front', 'side', 'detail'],
    suggestedSets: 4,
    suggestedReps: '10-12 reps',
    restSeconds: 60
  },
  {
    id: 'alternate-dumbbell-curl',
    name: 'Rosca Alternada com Halteres',
    englishName: 'Alternate Dumbbell Curl',
    category: 'biceps',
    categoryLabel: 'Bíceps',
    equipment: 'dumbbells',
    equipmentLabel: 'Halteres',
    position: 'standing',
    difficulty: 'beginner',
    difficultyLabel: 'Iniciante',
    primaryMuscles: ['Bíceps Braquial'],
    secondaryMuscles: ['Braquial', 'Braquiorradial'],
    referenceImage: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Em pé, halteres ao lado do corpo com pegada neutra.',
    movement: 'Eleve um braço por vez girando o punho para pegada supinada conforme sobe o peso.',
    finalPosition: 'Halter no topo com rotação total do punho e bíceps no pico.',
    breathing: {
      inhale: 'Inspire ao descer o halter.',
      exhale: 'Expire ao subir e supinar o braço.'
    },
    commonMistakes: [
      { mistake: 'Balançar o corpo para cada lado alternando o peso.', fix: 'Mantenha a postura ereta e execute cada braço de forma limpa.' }
    ],
    proTips: ['A supinação do punho recruta a cabeça curta do bíceps em sua plenitude.'],
    audioExplanation: 'Suba um braço de cada vez girando o punho para cima. Sinta a rotação e a contração do bíceps em cada repetição.',
    cameraViews: ['front', 'side', 'detail'],
    suggestedSets: 3,
    suggestedReps: '10-12 reps cada braço',
    restSeconds: 60
  },
  {
    id: 'hammer-curl',
    name: 'Rosca Martelo',
    englishName: 'Dumbbell Hammer Curl',
    category: 'biceps',
    categoryLabel: 'Bíceps',
    equipment: 'dumbbells',
    equipmentLabel: 'Halteres',
    position: 'standing',
    difficulty: 'beginner',
    difficultyLabel: 'Iniciante',
    primaryMuscles: ['Braquial Anterior', 'Braquiorradial'],
    secondaryMuscles: ['Bíceps Braquial (Cabeça Longa)'],
    referenceImage: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Em pé segurando os halteres com palmas das mãos voltadas uma para a outra (pegada neutra).',
    movement: 'Flexione os cotovelos mantendo a pegada neutra durante todo o trajeto.',
    finalPosition: 'Halteres no topo com foco no músculo braquial e antebraço.',
    breathing: {
      inhale: 'Inspire na descida lenta e controlada.',
      exhale: 'Expire ao subir os halteres em pegada neutra.'
    },
    commonMistakes: [
      { mistake: 'Girar os punhos durante o movimento.', fix: 'Mantenha a pegada neutra fixa do início ao fim.' }
    ],
    proTips: ['Fundamental para aumentar a largura do braço empurrando o bíceps para cima.'],
    audioExplanation: 'Mantenha as palmas voltadas uma para a outra na pegada neutra. Suba os pesos controlando o movimento para focar no braquial e antebraço.',
    cameraViews: ['front', 'side', 'detail'],
    suggestedSets: 4,
    suggestedReps: '10-12 reps',
    restSeconds: 60
  },
  {
    id: 'preacher-curl',
    name: 'Rosca Scott',
    englishName: 'Preacher Curl',
    category: 'biceps',
    categoryLabel: 'Bíceps',
    equipment: 'barbell',
    equipmentLabel: 'Barra W & Banco Scott',
    position: 'seated',
    difficulty: 'intermediate',
    difficultyLabel: 'Intermediário',
    primaryMuscles: ['Bíceps Braquial (Cabeça Curta)'],
    secondaryMuscles: ['Braquial Anterior', 'Braquiorradial'],
    referenceImage: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Sentado no banco Scott com os braços apoiados na almofada inclinada, segurando a barra W.',
    movement: 'Flexione os cotovelos elevando a barra em direção ao queixo sem descolar os braços do apoio.',
    finalPosition: 'Barra no topo com bíceps completamente encurtado.',
    breathing: {
      inhale: 'Inspire descendo até estender quase completamente os cotovelos.',
      exhale: 'Expire subindo a barra.'
    },
    commonMistakes: [
      { mistake: 'Hiperextender bruscamente os cotovelos no fundo.', fix: 'Pare um pouco antes da extensão total para proteger os tendões.' }
    ],
    proTips: ['Excelente isolamento mecânico eliminando qualquer tipo de roubo corporal.'],
    audioExplanation: 'Apoie os braços no banco Scott e eleve a barra com foco no bíceps. Não hiperestenda os cotovelos no fundo para proteger as articulações.',
    cameraViews: ['side', 'front', 'detail'],
    suggestedSets: 3,
    suggestedReps: '10-12 reps',
    restSeconds: 60
  },
  {
    id: 'concentration-curl',
    name: 'Rosca Concentrada',
    englishName: 'Concentration Curl',
    category: 'biceps',
    categoryLabel: 'Bíceps',
    equipment: 'dumbbells',
    equipmentLabel: 'Halter & Banco',
    position: 'seated',
    difficulty: 'intermediate',
    difficultyLabel: 'Intermediário',
    primaryMuscles: ['Bíceps Braquial (Pico da Cabeça Longa)'],
    secondaryMuscles: ['Braquial Anterior'],
    referenceImage: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Sentado na ponta do banco com o cotovelo apoiado na parte interna da coxa.',
    movement: 'Flexione o cotovelo levando o halter em direção ao ombro com isolamento absoluto.',
    finalPosition: 'Halter no topo com pico máximo de contração do bíceps.',
    breathing: {
      inhale: 'Inspire descendo lentamente.',
      exhale: 'Expire subindo o halter.'
    },
    commonMistakes: [
      { mistake: 'Balançar o tronco para puxar o peso.', fix: 'Mantenha o cotovelo cravado na coxa sem mexer o corpo.' }
    ],
    proTips: ['O maior construtor do "pico" do bíceps segundo estudos de eletromiografia.'],
    audioExplanation: 'Apoie o cotovelo na parte interna da coxa e suba o halter concentrando toda a força no bíceps. Aperte o músculo no topo.',
    cameraViews: ['front', 'side', 'detail'],
    suggestedSets: 3,
    suggestedReps: '12 reps cada braço',
    restSeconds: 45
  },

  // ==========================================
  // TRÍCEPS (TRICEPS)
  // ==========================================
  {
    id: 'tricep-rope-pushdown',
    name: 'Tríceps Pulley com Corda',
    englishName: 'Cable Tricep Rope Pushdown',
    category: 'triceps',
    categoryLabel: 'Tríceps',
    equipment: 'cable',
    equipmentLabel: 'Polia Alta & Corda',
    position: 'standing',
    difficulty: 'beginner',
    difficultyLabel: 'Iniciante',
    primaryMuscles: ['Tríceps Braquial (Cabeça Lateral e Medial)'],
    secondaryMuscles: ['Tríceps (Cabeça Longa)', 'Ancôneo'],
    referenceImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Em pé, pés na largura dos ombros, leve inclinação do tronco, segurando a corda com cotovelos colados às costelas.',
    movement: 'Estenda os cotovelos empurrando a corda para baixo e abrindo as pontas para fora no final do movimento.',
    finalPosition: 'Braços completamente estendidos ao lado das coxas com a corda aberta e tríceps espremido.',
    breathing: {
      inhale: 'Inspire permitindo que os antebraços subam até o ângulo de 90° com cotovelos imóveis.',
      exhale: 'Expire no impulso de extensão empurrando a corda para baixo.'
    },
    commonMistakes: [
      { mistake: 'Mover os cotovelos para frente e para trás durante a repetição.', fix: 'Trave os cotovelos como dobradiças fixas ao lado das costelas.' }
    ],
    proTips: ['Abrir as pontas da corda no final recruta intensamente a cabeça lateral do tríceps.'],
    audioExplanation: 'Segure a corda com os cotovelos colados ao corpo. Empurre para baixo e abra as pontas no final do movimento para contrair o tríceps ao máximo.',
    cameraViews: ['front', 'side', 'detail'],
    suggestedSets: 4,
    suggestedReps: '12-15 reps',
    restSeconds: 60
  },
  {
    id: 'overhead-tricep-extension',
    name: 'Tríceps Francês com Halter',
    englishName: 'Overhead Tricep Extension',
    category: 'triceps',
    categoryLabel: 'Tríceps',
    equipment: 'dumbbells',
    equipmentLabel: 'Halter & Banco',
    position: 'seated',
    difficulty: 'intermediate',
    difficultyLabel: 'Intermediário',
    primaryMuscles: ['Tríceps Braquial (Cabeça Longa)'],
    secondaryMuscles: ['Tríceps (Cabeça Lateral)', 'Ancôneo'],
    referenceImage: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Sentado com as duas mãos segurando um halter acima da cabeça com braços estendidos.',
    movement: 'Flexione os cotovelos descendo o halter por trás da cabeça mantendo os cotovelos apontados para o teto.',
    finalPosition: 'Halter atrás da nuca com grande alongamento da cabeça longa do tríceps, retornando ao topo.',
    breathing: {
      inhale: 'Inspire descendo o peso por trás da cabeça.',
      exhale: 'Expire empurrando o halter de volta acima da cabeça.'
    },
    commonMistakes: [
      { mistake: 'Abrir demais os cotovelos para os lados.', fix: 'Mantenha os cotovelos próximos às orelhas apontando para cima.' }
    ],
    proTips: ['A posição elevada acima da cabeça é a única que alonga completamente a cabeça longa do tríceps.'],
    audioExplanation: 'Com o halter acima da cabeça, desça o peso por trás da nuca mantendo os cotovelos apontando para o teto. Empurre para cima com força no tríceps.',
    cameraViews: ['side', 'front', 'detail'],
    suggestedSets: 4,
    suggestedReps: '10-12 reps',
    restSeconds: 60
  },
  {
    id: 'skull-crusher',
    name: 'Tríceps Testa',
    englishName: 'Barbell Skull Crusher',
    category: 'triceps',
    categoryLabel: 'Tríceps',
    equipment: 'barbell',
    equipmentLabel: 'Barra W & Banco Reto',
    position: 'lying',
    difficulty: 'advanced',
    difficultyLabel: 'Avançado',
    primaryMuscles: ['Tríceps Braquial (Cabeça Medial e Longa)'],
    secondaryMuscles: ['Tríceps (Cabeça Lateral)', 'Ancôneo'],
    referenceImage: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Deitado no banco reto segurando a barra W com braços estendidos e leve inclinação para trás.',
    movement: 'Flexione os cotovelos descendo a barra controladamente em direção à testa ou topo da cabeça.',
    finalPosition: 'Barra rente à testa com cotovelos estáveis, empurrando de volta à extensão.',
    breathing: {
      inhale: 'Inspire ao descer a barra com controle milimétrico.',
      exhale: 'Expire ao estender os braços de volta ao alto.'
    },
    commonMistakes: [
      { mistake: 'Abrir os cotovelos lateralmente durante a descida.', fix: 'Mantenha os cotovelos paralelos e firmes apontados para o teto.' }
    ],
    proTips: ['Incline os braços levemente para trás em vez de 90° perfeitos para manter tensão contínua no topo.'],
    audioExplanation: 'Deite-se no banco com a barra W acima do peito. Desça a barra devagar em direção à testa e estenda os braços usando o tríceps.',
    cameraViews: ['side', 'front', 'detail'],
    suggestedSets: 4,
    suggestedReps: '10-12 reps',
    restSeconds: 75
  },
  {
    id: 'tricep-dips',
    name: 'Mergulho no Banco / Paralelas',
    englishName: 'Bench Dips / Parallel Dips',
    category: 'triceps',
    categoryLabel: 'Tríceps',
    equipment: 'bodyweight',
    equipmentLabel: 'Banco ou Barras Paralelas',
    position: 'standing',
    difficulty: 'intermediate',
    difficultyLabel: 'Intermediário',
    primaryMuscles: ['Tríceps Braquial'],
    secondaryMuscles: ['Peitoral Inferior', 'Deltoide Anterior'],
    referenceImage: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Apoiado nas paralelas ou borda do banco com braços estendidos e corpo suspenso.',
    movement: 'Flexione os cotovelos descendo o corpo até formar um ângulo de 90° nos cotovelos.',
    finalPosition: 'Empurre com força estendendo os braços e travando o corpo no topo.',
    breathing: {
      inhale: 'Inspire descendo o corpo em direção ao solo.',
      exhale: 'Expire empurrando para cima até a extensão.'
    },
    commonMistakes: [
      { mistake: 'Descer excessivamente sobrecarregando a cápsula anterior do ombro.', fix: 'Desça apenas até os cotovelos atingirem 90 graus.' }
    ],
    proTips: ['Mantenha o tronco ereto para foco no tríceps, ou incline para frente para dividir com peitoral.'],
    audioExplanation: 'Apoie as mãos com segurança e desça o corpo até os cotovelos dobrarem em 90 graus. Empurre com o tríceps para voltar ao topo.',
    cameraViews: ['side', 'front', 'detail'],
    suggestedSets: 3,
    suggestedReps: '12-15 reps',
    restSeconds: 60
  },

  // ==========================================
  // PERNAS (LEGS)
  // ==========================================
  {
    id: 'barbell-squat',
    name: 'Agachamento Livre com Barra',
    englishName: 'Barbell Back Squat',
    category: 'legs',
    categoryLabel: 'Pernas',
    equipment: 'barbell',
    equipmentLabel: 'Barra Olímpica & Gaiola',
    position: 'standing',
    difficulty: 'advanced',
    difficultyLabel: 'Avançado',
    primaryMuscles: ['Quadríceps Femoral (Vasto Lateral, Medial e Intermédio)'],
    secondaryMuscles: ['Glúteo Máximo', 'Isquiotibiais', 'Eretores da Espinha', 'Core'],
    referenceImage: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Barra apoiada firmemente no trapézio superior, pés ligeiramente mais largos que os ombros com pontas apontadas ~20-30° para fora.',
    movement: 'Inicie com flexão simultânea de quadril e joelhos, descendo o quadril para trás e para baixo até as coxas quebrarem a linha paralela.',
    finalPosition: 'Ponto mais baixo com coxas paralelas ou abaixo do solo, coluna neutra e joelhos alinhados com as pontas dos pés.',
    breathing: {
      inhale: 'Inspire profundamente no topo expandindo o abdômen e segure na manobra de Valsalva na descida.',
      exhale: 'Expire com força após passar o ponto de maior esforço na subida.'
    },
    commonMistakes: [
      { mistake: 'Valgo dinâmico: joelhos cedendo para dentro durante a subida.', fix: 'Empurre os joelhos ativamente para fora na direção do dedinho do pé.' },
      { mistake: 'Perder a lordose fisiológica curvando a lombar no fundo (butt wink).', fix: 'Mantenha o core rígido e desça até a amplitude em que a lombar permaneça neutra.' }
    ],
    proTips: ['Mantenha o peso distribuído uniformemente em três pontos no pé: calcanhar, base do dedão e base do dedinho.'],
    audioExplanation: 'Posicione a barra sobre o trapézio e afaste os pés na largura dos ombros. Agache mantendo a coluna firme até as coxas ficarem paralelas ao chão. Suba empurrando o chão com força.',
    cameraViews: ['front', 'side', 'detail'],
    suggestedSets: 4,
    suggestedReps: '8-10 reps',
    restSeconds: 120
  },
  {
    id: 'leg-press',
    name: 'Leg Press 45°',
    englishName: '45-Degree Leg Press',
    category: 'legs',
    categoryLabel: 'Pernas',
    equipment: 'machine',
    equipmentLabel: 'Aparelho Leg Press 45°',
    position: 'seated',
    difficulty: 'intermediate',
    difficultyLabel: 'Intermediário',
    primaryMuscles: ['Quadríceps Femoral'],
    secondaryMuscles: ['Glúteo Máximo', 'Isquiotibiais', 'Panturrilhas'],
    referenceImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Sentado com as costas e lombar firmemente coladas ao encosto, pés na plataforma na largura dos ombros.',
    movement: 'Destrave a plataforma e flexione os joelhos trazendo a carga até formar 90 graus nas pernas.',
    finalPosition: 'Empurre a plataforma pelos calcanhares até quase estender as pernas, sem travar os joelhos.',
    breathing: {
      inhale: 'Inspire descendo a plataforma controladamente.',
      exhale: 'Expire empurrando a carga para longe.'
    },
    commonMistakes: [
      { mistake: 'Travar os joelhos em hiperextensão no topo.', fix: 'Pare um pouco antes da extensão total para não transferir carga para a articulação.' },
      { mistake: 'Descolar a lombar do encosto no ponto mais baixo.', fix: 'Mantenha o quadril pressionado firmemente contra o banco.' }
    ],
    proTips: ['Pés posicionados mais abaixo enfatizam quadríceps; mais acima enfatizam glúteos e posteriores.'],
    audioExplanation: 'Apoie os pés na plataforma na largura dos ombros. Desça até dobrar os joelhos em 90 graus e empurre sem travar as articulações no topo.',
    cameraViews: ['side', 'front', 'detail'],
    suggestedSets: 4,
    suggestedReps: '10-12 reps',
    restSeconds: 90
  },
  {
    id: 'leg-extension',
    name: 'Cadeira Extensora',
    englishName: 'Leg Extension Machine',
    category: 'legs',
    categoryLabel: 'Pernas',
    equipment: 'machine',
    equipmentLabel: 'Cadeira Extensora',
    position: 'seated',
    difficulty: 'beginner',
    difficultyLabel: 'Iniciante',
    primaryMuscles: ['Reto Femoral', 'Quadríceps'],
    secondaryMuscles: ['Vasto Medial', 'Vasto Lateral'],
    referenceImage: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Sentado com as costas apoiadas, joelhos alinhados com o eixo da máquina e rolo posicionado sobre os tornozelos.',
    movement: 'Estenda os joelhos elevando o rolo até que as pernas fiquem totalmente estendidas à frente.',
    finalPosition: 'Extensão completa com pausa isométrica de 1 segundo espremendo o quadríceps.',
    breathing: {
      inhale: 'Inspire na descida lenta e controlada da carga.',
      exhale: 'Expire ao estender as pernas para cima.'
    },
    commonMistakes: [
      { mistake: 'Usar impulso chutando o peso com velocidade excessiva.', fix: 'Mantenha o movimento cadenciado com controle em ambas as fases.' }
    ],
    proTips: ['Único exercício da musculação que isola o quadríceps sem participação de glúteos ou posteriores.'],
    audioExplanation: 'Sente-se com as costas apoiadas e estenda as pernas até a linha horizontal. Segure um segundo no topo e sinta o quadríceps queimar.',
    cameraViews: ['side', 'front', 'detail'],
    suggestedSets: 4,
    suggestedReps: '12-15 reps',
    restSeconds: 60
  },
  {
    id: 'lying-leg-curl',
    name: 'Mesa Flexora',
    englishName: 'Lying Leg Curl',
    category: 'legs',
    categoryLabel: 'Pernas',
    equipment: 'machine',
    equipmentLabel: 'Mesa Flexora',
    position: 'lying',
    difficulty: 'beginner',
    difficultyLabel: 'Iniciante',
    primaryMuscles: ['Isquiotibiais (Bíceps Femoral, Semitendíneo)'],
    secondaryMuscles: ['Panturrilhas (Gastrocnêmio)', 'Glúteos'],
    referenceImage: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Deitado de bruços na máquina com o rolo posicionado logo abaixo das panturrilhas, joelhos alinhados ao eixo.',
    movement: 'Flexione os joelhos puxando os calcanhares em direção aos glúteos mantendo o quadril colado ao banco.',
    finalPosition: 'Calcanhares próximos aos glúteos com contração máxima dos posteriores da coxa.',
    breathing: {
      inhale: 'Inspire descendo o peso de forma controlada.',
      exhale: 'Expire puxando o rolo em direção aos glúteos.'
    },
    commonMistakes: [
      { mistake: 'Levantar o quadril do banco durante o esforço.', fix: 'Segure firme nas alças e pressione o quadril contra o estofado.' }
    ],
    proTips: ['Mantenha os pés em dorsiflexão (pontas apontadas para a canela) para maior ativação dos posteriores.'],
    audioExplanation: 'Deite-se de barriga para baixo e puxe os calcanhares em direção aos glúteos. Foque a força atrás da coxa e desça com controle.',
    cameraViews: ['side', 'front', 'detail'],
    suggestedSets: 4,
    suggestedReps: '10-12 reps',
    restSeconds: 60
  },
  {
    id: 'lunges',
    name: 'Afundo com Halteres',
    englishName: 'Dumbbell Lunges',
    category: 'legs',
    categoryLabel: 'Pernas',
    equipment: 'dumbbells',
    equipmentLabel: 'Halteres',
    position: 'standing',
    difficulty: 'intermediate',
    difficultyLabel: 'Intermediário',
    primaryMuscles: ['Quadríceps', 'Glúteo Máximo'],
    secondaryMuscles: ['Isquiotibiais', 'Adutores', 'Panturrilhas'],
    referenceImage: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Em pé, pés na largura do quadril, segurando um halter em cada mão ao lado do corpo.',
    movement: 'Dê um passo à frente e desça o quadril até que ambos os joelhos formem ângulos de 90 graus.',
    finalPosition: 'Joelho de trás próximo ao chão sem bater, coxa da frente paralela ao solo.',
    breathing: {
      inhale: 'Inspire durante o passo e descida.',
      exhale: 'Expire empurrando o calcanhar da frente para retornar.'
    },
    commonMistakes: [
      { mistake: 'Deixar o joelho da frente colapsar para dentro.', fix: 'Mantenha o joelho apontado na mesma direção dos dedos do pé.' }
    ],
    proTips: ['Exercício unilateral excelente para corrigir assimetrias de força entre as pernas.'],
    audioExplanation: 'Dê um passo à frente e desça até os dois joelhos dobrarem em 90 graus. Empurre o chão com a perna da frente para voltar à posição inicial.',
    cameraViews: ['front', 'side', 'detail'],
    suggestedSets: 3,
    suggestedReps: '10-12 reps cada perna',
    restSeconds: 60
  },
  {
    id: 'stiff-leg-deadlift',
    name: 'Stiff com Barra',
    englishName: 'Stiff-Legged Deadlift',
    category: 'legs',
    categoryLabel: 'Pernas',
    equipment: 'barbell',
    equipmentLabel: 'Barra Olímpica',
    position: 'standing',
    difficulty: 'advanced',
    difficultyLabel: 'Avançado',
    primaryMuscles: ['Isquiotibiais', 'Glúteo Máximo'],
    secondaryMuscles: ['Eretores da Espinha', 'Lombar'],
    referenceImage: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Em pé segurando a barra na frente das coxas, pés na largura do quadril e joelhos semi-flexionados quase retos.',
    movement: 'Incline o tronco para frente jogando o quadril para trás enquanto a barra desce rente às pernas.',
    finalPosition: 'Tronco paralelo ao chão com enorme alongamento nos posteriores, coluna perfeitamente neutra.',
    breathing: {
      inhale: 'Inspire descendo a barra rente às canelas.',
      exhale: 'Expire subindo e contraindo os glúteos e posteriores no topo.'
    },
    commonMistakes: [
      { mistake: 'Arredondar a coluna lombar para tentar descer mais.', fix: 'Mantenha as escápulas travadas e pare quando sentir o limite dos posteriores.' }
    ],
    proTips: ['Pense em empurrar uma porta com o bumbum para trás em vez de focar em descer a barra.'],
    audioExplanation: 'Com a coluna reta e joelhos semi-flexionados, empurre o quadril para trás descendo a barra rente às pernas. Sinta os posteriores alongarem e suba contraindo os glúteos.',
    cameraViews: ['side', 'front', 'detail'],
    suggestedSets: 4,
    suggestedReps: '10-12 reps',
    restSeconds: 90
  },
  {
    id: 'calf-raises',
    name: 'Panturrilha em Pé',
    englishName: 'Standing Calf Raise',
    category: 'legs',
    categoryLabel: 'Pernas',
    equipment: 'machine',
    equipmentLabel: 'Aparelho de Panturrilha / Step',
    position: 'standing',
    difficulty: 'beginner',
    difficultyLabel: 'Iniciante',
    primaryMuscles: ['Gastrocnêmio', 'Sóleo'],
    secondaryMuscles: ['Tibial Posterior'],
    referenceImage: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Pontas dos pés apoiadas no step, calcanhares livres no ar, corpo ereto.',
    movement: 'Empurre a ponta dos pés para baixo elevando o corpo o mais alto possível.',
    finalPosition: 'Pico máximo de elevação na ponta dos pés com contração de 1 segundo.',
    breathing: {
      inhale: 'Inspire descendo os calcanhares abaixo da linha do degrau para alongar.',
      exhale: 'Expire subindo com explosão até o ponto mais alto.'
    },
    commonMistakes: [
      { mistake: 'Fazer repetições rápidas quicando no fundo.', fix: 'Elimine o reflexo miotático parando 1 segundo no ponto mais baixo.' }
    ],
    proTips: ['O gastrocnêmio responde muito bem a pausas isométricas no topo e no fundo.'],
    audioExplanation: 'Suba na ponta dos pés o mais alto possível, segure um segundo no topo e desça sentindo a panturrilha esticar completamente.',
    cameraViews: ['side', 'front', 'detail'],
    suggestedSets: 4,
    suggestedReps: '15-20 reps',
    restSeconds: 45
  },

  // ==========================================
  // GLÚTEOS (GLUTES)
  // ==========================================
  {
    id: 'hip-thrust',
    name: 'Hip Thrust (Elevação Pélvica com Barra)',
    englishName: 'Barbell Hip Thrust',
    category: 'glutes',
    categoryLabel: 'Glúteos',
    equipment: 'barbell',
    equipmentLabel: 'Barra Olímpica & Banco Reto',
    position: 'seated',
    difficulty: 'intermediate',
    difficultyLabel: 'Intermediário',
    primaryMuscles: ['Glúteo Máximo'],
    secondaryMuscles: ['Isquiotibiais', 'Quadríceps', 'Adutores'],
    referenceImage: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Dorso superior apoiado na borda do banco, pés firmes no chão na largura dos ombros, barra com almofada apoiada sobre o quadril.',
    movement: 'Estenda o quadril empurrando pelos calcanhares até o tronco e coxas formarem uma linha reta paralela ao solo.',
    finalPosition: 'Quadril em extensão total, glúteos contraídos ao máximo por 1 segundo, queixo encaixado olhando para frente.',
    breathing: {
      inhale: 'Inspire descendo o quadril de forma controlada até quase tocar o chão.',
      exhale: 'Expire com força na extensão pélvica empurrando o peso para cima.'
    },
    commonMistakes: [
      { mistake: 'Hiperextender a lombar jogando a cabeça para trás no topo.', fix: 'Mantenha o queixo no peito e faça a extensão exclusivamente pelo quadril.' }
    ],
    proTips: ['O exercício número um para hipertrofia do glúteo máximo com pico de tensão na contração máxima.'],
    audioExplanation: 'Apoie as costas no banco e a barra sobre o quadril. Empurre pelos calcanhares até alinhar o corpo e esprema os glúteos com força no topo.',
    cameraViews: ['side', 'front', 'detail'],
    suggestedSets: 4,
    suggestedReps: '10-12 reps',
    restSeconds: 90
  },
  {
    id: 'glute-bridge',
    name: 'Elevação Pélvica no Solo',
    englishName: 'Glute Bridge',
    category: 'glutes',
    categoryLabel: 'Glúteos',
    equipment: 'bodyweight',
    equipmentLabel: 'Solo / Tapete',
    position: 'lying',
    difficulty: 'beginner',
    difficultyLabel: 'Iniciante',
    primaryMuscles: ['Glúteo Máximo'],
    secondaryMuscles: ['Isquiotibiais', 'Core'],
    referenceImage: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Deitado de costas no chão com joelhos dobrados e pés apoiados no chão na largura dos quadris.',
    movement: 'Empurre os calcanhares contra o chão e levante o quadril até formar uma linha reta dos joelhos aos ombros.',
    finalPosition: 'Quadril elevado com glúteos contraídos ao máximo no topo.',
    breathing: {
      inhale: 'Inspire descendo o quadril até quase tocar o solo.',
      exhale: 'Expire ao elevar o quadril contraindo os glúteos.'
    },
    commonMistakes: [
      { mistake: 'Arquear a lombar em vez de contrair os glúteos.', fix: 'Mantenha as costelas abaixadas e foque na contração glútea.' }
    ],
    proTips: ['Excelente como aquecimento ativador ou para treinos em casa sem equipamento.'],
    audioExplanation: 'Deite-se de costas e empurre os calcanhares para elevar o quadril. Aperte os glúteos no alto por dois segundos antes de descer.',
    cameraViews: ['side', 'front', 'detail'],
    suggestedSets: 3,
    suggestedReps: '15-20 reps',
    restSeconds: 45
  },
  {
    id: 'seated-hip-abduction',
    name: 'Cadeira Abdutora',
    englishName: 'Seated Hip Abduction',
    category: 'glutes',
    categoryLabel: 'Glúteos',
    equipment: 'machine',
    equipmentLabel: 'Cadeira Abdutora',
    position: 'seated',
    difficulty: 'beginner',
    difficultyLabel: 'Iniciante',
    primaryMuscles: ['Glúteo Médio', 'Glúteo Mínimo'],
    secondaryMuscles: ['Tensor da Fáscia Lata'],
    referenceImage: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Sentado na máquina com os joelhos encostados nos apoios laterais e pernas fechadas.',
    movement: 'Afaste as pernas para fora contraindo a lateral dos glúteos.',
    finalPosition: 'Abertura máxima com pausa de 1 segundo espremendo o glúteo médio.',
    breathing: {
      inhale: 'Inspire fechando as pernas de forma lenta.',
      exhale: 'Expire abrindo as pernas contra a resistência.'
    },
    commonMistakes: [
      { mistake: 'Deixar as pernas baterem fechando rápido demais.', fix: 'Controle a fase excêntrica sentindo a queimação na lateral.' }
    ],
    proTips: ['Inclinar o tronco levemente para frente aumenta a ativação das fibras superiores do glúteo.'],
    audioExplanation: 'Sente-se no aparelho e abra as pernas para os lados. Sinta a lateral dos glúteos contrair com intensidade e feche devagar.',
    cameraViews: ['front', 'side', 'detail'],
    suggestedSets: 4,
    suggestedReps: '15-20 reps',
    restSeconds: 45
  },

  // ==========================================
  // CORE (ABDOMINALS)
  // ==========================================
  {
    id: 'plank',
    name: 'Prancha Isométrica',
    englishName: 'Isometric Plank',
    category: 'core',
    categoryLabel: 'Core / Abdômen',
    equipment: 'bodyweight',
    equipmentLabel: 'Solo / Tapete',
    position: 'lying',
    difficulty: 'beginner',
    difficultyLabel: 'Iniciante',
    primaryMuscles: ['Transverso do Abdômen', 'Reto Abdominal'],
    secondaryMuscles: ['Oblíquos', 'Glúteos', 'Deltoides'],
    referenceImage: 'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Apoiado nos antebraços e pontas dos pés, cotovelos sob os ombros e corpo em linha reta da cabeça aos calcanhares.',
    movement: 'Sustente a posição isométrica contraindo ativamente o abdômen, puxando o umbigo para dentro e travando os glúteos.',
    finalPosition: 'Manutenção rigorosa da linha neutra da coluna com respiração diafragmática fluida.',
    breathing: {
      inhale: 'Inspire pelo nariz mantendo a parede abdominal pressurizada.',
      exhale: 'Expire pela boca sem deixar a pelve cair.'
    },
    commonMistakes: [
      { mistake: 'Deixar o quadril ceder sobrecarregando a coluna lombar.', fix: 'Mantenha os glúteos travados e a pelve em leve retroversão.' }
    ],
    proTips: ['Pense em "puxar os cotovelos em direção aos dedos dos pés" para multiplicar a ativação do core.'],
    audioExplanation: 'Apoie os antebraços no chão e mantenha o corpo alinhado da cabeça aos pés. Contraia o abdômen e respire de forma controlada.',
    cameraViews: ['side', 'front', 'detail'],
    suggestedSets: 3,
    suggestedReps: '45-60 segundos',
    restSeconds: 45
  },
  {
    id: 'cable-crunch',
    name: 'Abdominal no Cabo (Polia Alta)',
    englishName: 'Kneeling Cable Crunch',
    category: 'core',
    categoryLabel: 'Core / Abdômen',
    equipment: 'cable',
    equipmentLabel: 'Polia Alta & Corda',
    position: 'seated',
    difficulty: 'intermediate',
    difficultyLabel: 'Intermediário',
    primaryMuscles: ['Reto Abdominal'],
    secondaryMuscles: ['Oblíquos Internos e Externos'],
    referenceImage: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Ajoelhado em frente à polia alta, segurando a corda ao lado das orelhas, quadril travado para trás.',
    movement: 'Flexione a coluna torácica e lombar levando os cotovelos em direção aos joelhos exclusivamente pela contração do abdômen.',
    finalPosition: 'Coluna arredondada com reto abdominal encurtado ao limite, retornando de forma controlada.',
    breathing: {
      inhale: 'Inspire ao retornar com a coluna estendida.',
      exhale: 'Expire todo o ar durante o enrolamento do tronco espremendo o abdômen.'
    },
    commonMistakes: [
      { mistake: 'Sentar nos calcanhares mexendo o quadril em vez de enrolar a coluna.', fix: 'Trave o quadril imóvel e mova apenas a coluna vertebral.' }
    ],
    proTips: ['Excelente exercício para sobrecarga progressiva no abdômen com peso ajustável.'],
    audioExplanation: 'Ajoelhe-se e segure a corda ao lado das orelhas. Enrole o tronco trazendo os cotovelos em direção aos joelhos e esprema o abdômen.',
    cameraViews: ['side', 'front', 'detail'],
    suggestedSets: 4,
    suggestedReps: '12-15 reps',
    restSeconds: 60
  },
  {
    id: 'bicycle-crunch',
    name: 'Abdominal Bicicleta',
    englishName: 'Bicycle Crunch',
    category: 'core',
    categoryLabel: 'Core / Abdômen',
    equipment: 'bodyweight',
    equipmentLabel: 'Solo / Tapete',
    position: 'lying',
    difficulty: 'beginner',
    difficultyLabel: 'Iniciante',
    primaryMuscles: ['Oblíquos Externos e Internos', 'Reto Abdominal'],
    secondaryMuscles: ['Flexores do Quadril'],
    referenceImage: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Deitado de costas no chão, mãos atrás da cabeça, pernas elevadas em 90°.',
    movement: 'Pedale com as pernas enquanto gira o tronco trazendo o cotovelo oposto em direção ao joelho flexionado.',
    finalPosition: 'Rotação máxima do tronco com contração diagonal dos oblíquos.',
    breathing: {
      inhale: 'Inspire na transição central.',
      exhale: 'Expire a cada toque diagonal cotovelo-joelho.'
    },
    commonMistakes: [
      { mistake: 'Puxar o pescoço com as mãos.', fix: 'Mantenha os cotovelos abertos e faça o giro pela força do abdômen.' }
    ],
    proTips: ['Um dos exercícios com maior ativação combinada de reto e oblíquos segundo estudos científicos.'],
    audioExplanation: 'Pedale com as pernas e gire o tronco levando o cotovelo em direção ao joelho oposto. Mantenha o movimento fluido e contínuo.',
    cameraViews: ['front', 'side', 'detail'],
    suggestedSets: 3,
    suggestedReps: '20 repetições alternadas',
    restSeconds: 45
  },

  // ==========================================
  // CARDIO
  // ==========================================
  {
    id: 'jumping-jacks',
    name: 'Polichinelos',
    englishName: 'Jumping Jacks',
    category: 'cardio',
    categoryLabel: 'Cardio',
    equipment: 'bodyweight',
    equipmentLabel: 'Peso Corporal',
    position: 'standing',
    difficulty: 'beginner',
    difficultyLabel: 'Iniciante',
    primaryMuscles: ['Sistema Cardiovascular'],
    secondaryMuscles: ['Panturrilhas', 'Deltoides', 'Adutores'],
    referenceImage: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Em pé com braços ao lado do corpo e pés juntos.',
    movement: 'Salte abrindo pernas e braços simultaneamente acima da cabeça e retorne em ritmo contínuo.',
    finalPosition: 'Pés afastados na largura dos ombros com palmas se aproximando acima da cabeça.',
    breathing: {
      inhale: 'Inspire ao fechar os braços.',
      exhale: 'Expire ao saltar e abrir.'
    },
    commonMistakes: [
      { mistake: 'Aterrissar com os calcanhares pesados.', fix: 'Aterrissa suavemente sobre a ponta dos pés amortecendo com os joelhos.' }
    ],
    proTips: ['Excelente para aquecimento sistêmico e elevação rápida da frequência cardíaca.'],
    audioExplanation: 'Salte abrindo pernas e braços simultaneamente e retorne ao centro em ritmo ritmado. Mantenha a respiração constante para queimar calorias.',
    cameraViews: ['front', 'side', 'detail'],
    suggestedSets: 3,
    suggestedReps: '45-60 segundos',
    restSeconds: 30
  },
  {
    id: 'treadmill-running',
    name: 'Corrida',
    englishName: 'Running / Treadmill',
    category: 'cardio',
    categoryLabel: 'Cardio',
    equipment: 'cardio_gear',
    equipmentLabel: 'Esteira / Pista',
    position: 'standing',
    difficulty: 'intermediate',
    difficultyLabel: 'Intermediário',
    primaryMuscles: ['Sistema Cardiovascular e Pulmonar'],
    secondaryMuscles: ['Quadríceps', 'Panturrilhas', 'Glúteos', 'Core'],
    referenceImage: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Postura ereta, ombros relaxados, olhar para o horizonte.',
    movement: 'Passadas cadenciadas com aterrissagem pelo meio do pé e balanço sincronizado de braços.',
    finalPosition: 'Ritmo aeróbico contínuo na zona alvo de treino.',
    breathing: {
      inhale: 'Inspire pelo nariz e boca em padrão ritmado 2:2.',
      exhale: 'Expire profundamente liberando CO2.'
    },
    commonMistakes: [
      { mistake: 'Correr pisando pesado com o calcanhar (overstriding).', fix: 'Mantenha a passada sob o centro de gravidade com cadência mais alta (~170-180 spm).' }
    ],
    proTips: ['Mantenha os cotovelos em 90° e relaxe as mãos.'],
    audioExplanation: 'Mantenha a postura ereta e aterrissagem suave. A corrida acelera o metabolismo e fortalece o sistema cardiorrespiratório.',
    cameraViews: ['side', 'front', 'detail'],
    suggestedSets: 1,
    suggestedReps: '20-30 minutos',
    restSeconds: 60
  },

  // ==========================================
  // MOBILIDADE E FLEXIBILIDADE
  // ==========================================
  {
    id: 'hip-mobility',
    name: 'Mobilidade de Quadril 90/90',
    englishName: '90/90 Hip Mobility',
    category: 'mobility',
    categoryLabel: 'Mobilidade',
    equipment: 'bodyweight',
    equipmentLabel: 'Solo / Tapete',
    position: 'seated',
    difficulty: 'beginner',
    difficultyLabel: 'Iniciante',
    primaryMuscles: ['Rotadores Internos e Externos do Quadril'],
    secondaryMuscles: ['Glúteo Médio', 'Psoas', 'Lombar'],
    referenceImage: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Sentado no chão com as duas pernas dobradas em ângulos de 90 graus.',
    movement: 'Gire suavemente os joelhos de um lado para o outro sem descolar as mãos do apoio.',
    finalPosition: 'Transição suave entre rotação interna e externa de ambos os quadris.',
    breathing: {
      inhale: 'Inspire no centro da transição.',
      exhale: 'Expire soltando a musculatura no ponto de alongamento.'
    },
    commonMistakes: [
      { mistake: 'Forçar o movimento com dor pontual.', fix: 'Respeite a amplitude natural sem forçar o joelho.' }
    ],
    proTips: ['Pratique antes de agachamentos pesados para liberar a mobilidade do quadril.'],
    audioExplanation: 'Na mobilidade 90/90, respire fundo e faça a rotação suave do quadril de um lado para o outro. Essencial para preparar o corpo para o treino.',
    cameraViews: ['front', 'side', 'detail'],
    suggestedSets: 2,
    suggestedReps: '10 repetições por lado',
    restSeconds: 30
  },
  {
    id: 'shoulder-mobility',
    name: 'Mobilidade de Ombros',
    englishName: 'Shoulder Dislocates & Mobility',
    category: 'mobility',
    categoryLabel: 'Mobilidade',
    equipment: 'bodyweight',
    equipmentLabel: 'Bastão / Elástico',
    position: 'standing',
    difficulty: 'beginner',
    difficultyLabel: 'Iniciante',
    primaryMuscles: ['Manguito Rotador', 'Deltoides'],
    secondaryMuscles: ['Peitorais', 'Trapézio Superior'],
    referenceImage: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Em pé segurando o bastão com pegada aberta à frente do corpo com braços estendidos.',
    movement: 'Passe o bastão por cima da cabeça até as costas sem dobrar os cotovelos.',
    finalPosition: 'Bastão encostado nas costas com peito aberto e ombros alongados.',
    breathing: {
      inhale: 'Inspire ao subir o bastão.',
      exhale: 'Expire ao passar para trás com controle.'
    },
    commonMistakes: [
      { mistake: 'Dobrar os cotovelos para forçar a passagem.', fix: 'Abra mais a pegada no bastão para passar com braços estendidos.' }
    ],
    proTips: ['Fundamental antes de supinos e desenvolvimentos pesados.'],
    audioExplanation: 'Segure o bastão com pegada aberta e passe por cima da cabeça com os braços estendidos. Isso lubrifica a articulação dos ombros e previne lesões.',
    cameraViews: ['front', 'side', 'detail'],
    suggestedSets: 2,
    suggestedReps: '10 repetições',
    restSeconds: 30
  }
];

export const MUSCLE_GROUPS_CONFIG = [
  { id: 'shoulders', label: 'Ombros', shortLabel: 'DELTS', icon: 'delts', color: '#ff6a00' },
  { id: 'chest', label: 'Peito', shortLabel: 'CHEST', icon: 'chest', color: '#10b981' },
  { id: 'back', label: 'Costas', shortLabel: 'BACK', icon: 'back', color: '#06b6d4' },
  { id: 'biceps', label: 'Bíceps', shortLabel: 'BICEPS', icon: 'biceps', color: '#8b5cf6' },
  { id: 'triceps', label: 'Tríceps', shortLabel: 'TRICEPS', icon: 'triceps', color: '#ec4899' },
  { id: 'legs', label: 'Pernas', shortLabel: 'LEGS', icon: 'quads', color: '#f59e0b' },
  { id: 'glutes', label: 'Glúteos', shortLabel: 'GLUTES', icon: 'glutes', color: '#f97316' },
  { id: 'core', label: 'Core / Abdômen', shortLabel: 'CORE', icon: 'abs', color: '#3b82f6' },
  { id: 'cardio', label: 'Cardio', shortLabel: 'CARDIO', icon: 'cardio', color: '#ef4444' },
  { id: 'mobility', label: 'Mobilidade', shortLabel: 'MOBILITY', icon: 'mobility', color: '#14b8a6' },
] as const;

export function getExercisesByCategory(cat: MuscleGroupCategory): DetailedExercise[] {
  return EXERCISE_DATABASE.filter(ex => ex.category === cat);
}

export function getExerciseById(id: string): DetailedExercise | undefined {
  const ex = EXERCISE_DATABASE.find(ex => ex.id === id);
  if (!ex) return undefined;
  return {
    ...ex,
    highlightColorPrimary: ex.highlightColorPrimary || '#ff0033',
    highlightColorSecondary: ex.highlightColorSecondary || '#ff6a00',
  };
}

export function searchExercises(query: string): DetailedExercise[] {
  const q = query.toLowerCase().trim();
  if (!q) return EXERCISE_DATABASE;
  return EXERCISE_DATABASE.filter(ex => 
    ex.name.toLowerCase().includes(q) ||
    ex.englishName.toLowerCase().includes(q) ||
    ex.primaryMuscles.some(m => m.toLowerCase().includes(q)) ||
    ex.category.toLowerCase().includes(q)
  );
}
