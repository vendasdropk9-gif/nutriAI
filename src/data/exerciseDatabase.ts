export interface ExerciseReference {
  id: string;
  name: string;
  englishName: string;
  category: 'strength' | 'hypertrophy' | 'endurance' | 'mobility' | 'cardio';
  equipment: string;
  referenceImage: string;
  initialPosition: string;
  movementDescription: string;
  finalPosition: string;
  muscles: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  animation: 'idle' | 'executing' | 'tutorial';
  cameraAngle: 'front' | 'side' | 'diagonal' | 'back';
  instructions: string[];
  proTip?: string;
  gltfUrl?: string; // Optional URL for the DRACO compressed GLB file
}

export const EXERCISE_DATABASE: ExerciseReference[] = [
  {
    id: 'seated-lateral-raises',
    name: 'Elevação Lateral Sentado',
    englishName: 'Seated Lateral Raises',
    category: 'hypertrophy',
    equipment: 'Halteres',
    referenceImage: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=2940&auto=format&fit=crop',
    initialPosition: 'Sentado no banco, coluna reta, braços ao longo do corpo segurando halteres.',
    movementDescription: 'Elevar os braços lateralmente mantendo leve flexão nos cotovelos até a linha dos ombros.',
    finalPosition: 'Braços estendidos lateralmente na altura dos ombros, punhos neutros.',
    muscles: ['Deltoide Lateral', 'Deltoide Anterior', 'Trapézio'],
    difficulty: 'intermediate',
    animation: 'executing',
    cameraAngle: 'diagonal',
    proTip: 'Incline levemente o tronco para a frente (~15°) e projete os cotovelos como se estivesse empurrando as paredes para os lados. Isso maximiza o recrutamento das fibras do deltoide lateral reduzindo a compensação do trapézio.',
    instructions: [
      'Sente-se com as costas retas e abdômen contraído.',
      'Segure os halteres com as palmas voltadas para dentro.',
      'Eleve os braços controladamente até a altura dos ombros.',
      'Mantenha uma leve flexão nos cotovelos para evitar sobrecarga articular.',
      'Retorne lentamente à posição inicial.'
    ]
  },
  {
    id: 'barbell-squat',
    name: 'Agachamento com Barra',
    englishName: 'Barbell Squat',
    category: 'strength',
    equipment: 'Barra e Anilhas',
    referenceImage: 'https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?q=80&w=3116&auto=format&fit=crop',
    initialPosition: 'Em pé, pés na largura dos ombros, barra apoiada no trapézio.',
    movementDescription: 'Flexão de quadril e joelhos simulando o movimento de sentar.',
    finalPosition: 'Coxas paralelas ao chão ou mais abaixo, coluna neutra.',
    muscles: ['Quadríceps', 'Glúteos', 'Isquiotibiais', 'Core'],
    difficulty: 'advanced',
    animation: 'executing',
    cameraAngle: 'side',
    proTip: 'Distribua o peso no "tríplice apoio" do pé (calcanhar, base do hálux e base do 5º dedo) e empurre os joelhos levemente para fora em direção à ponta dos pés durante a subida para proteger o ligamento cruzado anterior.',
    instructions: [
      'Posicione a barra confortavelmente sobre os trapézios.',
      'Afaste os pés na largura dos ombros, pontas levemente para fora.',
      'Inicie o movimento projetando o quadril para trás e para baixo.',
      'Mantenha o peito aberto e a coluna neutra durante toda a descida.',
      'Empurre o chão com os calcanhares para retornar à posição inicial.'
    ]
  },
  {
    id: 'push-up',
    name: 'Flexão de Braços',
    englishName: 'Push-Up',
    category: 'endurance',
    equipment: 'Peso Corporal',
    referenceImage: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?q=80&w=3062&auto=format&fit=crop',
    initialPosition: 'Posição de prancha alta, mãos alinhadas com o peitoral.',
    movementDescription: 'Flexão dos cotovelos descendo o corpo em bloco.',
    finalPosition: 'Peitoral próximo ao chão, cotovelos em ângulo de ~45 graus.',
    muscles: ['Peitoral Maior', 'Tríceps', 'Deltoide Anterior', 'Core'],
    difficulty: 'beginner',
    animation: 'executing',
    cameraAngle: 'diagonal',
    proTip: 'Gire internamente as palmas contra o solo gerando torque para fora (como se tentasse "rasgar o chão" para fora). Isso ativa o denteado anterior, estabiliza as escápulas e protege os manguitos rotadores.',
    instructions: [
      'Inicie na posição de prancha com as mãos na largura dos ombros.',
      'Contraia o abdômen e os glúteos para manter o corpo alinhado.',
      'Desça o corpo dobrando os cotovelos até o peito quase tocar o chão.',
      'Mantenha os cotovelos apontando levemente para trás.',
      'Empurre o chão com força para retornar à posição inicial.'
    ]
  }
];
