import { CulinaryChallenge, UserProfile } from '../types';

export const DEFAULT_CULINARY_CHALLENGES: CulinaryChallenge[] = [
  {
    id: 'desafio-sem-carne-processada',
    title: 'Semana Sem Carne Processada',
    period: 'weekly',
    totalDays: 7,
    category: 'Zero Processados',
    tagline: 'Elimine presuntos, salsichas e embutidos; descubra proteínas limpas, saborosas e naturais.',
    description: 'Um desafio de 7 dias criado para desintoxicar seu corpo dos conservantes químicos, nitritos e sódio excessivo das carnes embutidas. Aprenda a preparar substituições práticas, proteicas e deliciosas com cogumelos, ovos caipiras, leguminosas e carnes brancas marinadas.',
    goal: 'Passar 7 dias sem consumir nenhum tipo de embutido ou carne ultraprocessada.',
    badgeName: 'Mestre Proteína Limpa',
    badgeIcon: '🥩✨',
    rewardPoints: 350,
    dietarySuitability: ['Geral', 'Sem glúten', 'Sem lactose', 'Low carb', 'Hipertensão'],
    recipes: [
      {
        id: 'rec-clean-1',
        name: 'Omelete Cremosa de Cogumelos Paris e Espinafre',
        description: 'Substituto perfeito para o presunto matinal: ovos frescos com cogumelos salteados no azeite, alho e folhas tenras de espinafre.',
        prepTime: '12 min',
        calories: 240,
        macros: { protein: 18, carbs: 4, fat: 16 },
        ingredients: [
          '3 ovos caipiras',
          '1 xícara de cogumelos Paris frescos fatiados',
          '1 xícara de espinafre fresco picado',
          '1 dente de alho picado',
          '1 colher de chá de azeite de oliva extra virgem',
          'Páprica defumada, sal marinho e pimenta-do-reino a gosto'
        ],
        instructions: [
          'Aqueça o azeite em frigideira antiaderente e doure o alho levemente.',
          'Adicione os cogumelos e refogue por 3 minutos até dourarem; junte o espinafre até murchar.',
          'Bata os ovos com uma pitada de sal, páprica e pimenta.',
          'Despeje sobre os cogumelos em fogo baixo, tampe e deixe cozinhar até firmar mantendo o centro cremoso.'
        ],
        tips: 'A páprica defumada confere o sabor rústico e aromático que substitui o bacon sem nenhum aditivo.',
        dietTags: ['Sem glúten', 'Sem lactose', 'Vegetariano', 'Low carb', 'Hipertensão'],
        difficulty: 'Fácil',
        imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&q=80&w=600'
      },
      {
        id: 'rec-clean-2',
        name: 'Hambúrguer Artesanal de Grão-de-Bico e Ervas',
        description: 'Hambúrguer caseiro suculento e dourado, feito com grão-de-bico, aveia e especiarias frescas.',
        prepTime: '25 min',
        calories: 310,
        macros: { protein: 14, carbs: 42, fat: 8 },
        ingredients: [
          '2 xícaras de grão-de-bico cozido e escorrido',
          '1/2 cebola roxa bem picada',
          '2 dentes de alho amassados',
          '3 colheres de sopa de farelo de aveia (ou farinha de grão-de-bico)',
          '1 colher de chá de cominho em pó',
          '1 colher de sopa de salsinha e cebolinha picadas',
          '1 colher de sopa de azeite'
        ],
        instructions: [
          'Amasse o grão-de-bico em uma tigela com um garfo até obter uma pasta rústica.',
          'Misture a cebola, alho, cominho, sal, azeite e as ervas frescas.',
          'Adicione o farelo de aveia aos poucos até dar o ponto de moldar.',
          'Molde 4 hambúrgueres e doure em frigideira quente untada com azeite por 4 minutos de cada lado.'
        ],
        tips: 'Rico em fibras solúveis que promovem saciedade prolongada e controlam a glicemia.',
        dietTags: ['Vegano', 'Vegetariano', 'Sem lactose', 'Sem glúten'],
        difficulty: 'Fácil',
        imageUrl: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&q=80&w=600'
      },
      {
        id: 'rec-clean-3',
        name: 'Bowl de Quinoa com Frango Desfiado na Cúrcuma & Abacate',
        description: 'Almoço nutritivo com peito de frango cozido e desfiado temperado com cúrcuma, servido com quinoa e fatias de abacate.',
        prepTime: '20 min',
        calories: 390,
        macros: { protein: 32, carbs: 36, fat: 12 },
        ingredients: [
          '150g de peito de frango cozido e desfiado',
          '1 xícara de quinoa cozida',
          '1/2 abacate maduro em fatias',
          '1 xícara de tomatinhos-cereja cortados ao meio',
          '1 colher de café de cúrcuma em pó (açafrão-da-terra)',
          'Suco de 1/2 limão e 1 colher de sopa de azeite'
        ],
        instructions: [
          'Aqueça uma frigideira com um fio de azeite e salteie o frango desfiado com cúrcuma e sal marinho.',
          'Em uma tigela bonita, monte a base com a quinoa cozida.',
          'Disponha o frango temperado, as fatias de abacate e os tomatinhos.',
          'Regue com suco de limão e azeite extra virgem.'
        ],
        tips: 'A cúrcuma tem ação anti-inflamatória potente potencializada pela gordura boa do abacate.',
        dietTags: ['Sem glúten', 'Sem lactose', 'Ganho de massa', 'Hipertensão'],
        difficulty: 'Fácil',
        imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600'
      },
      {
        id: 'rec-clean-4',
        name: 'Wrap de Folhas de Couve com Tofu Grelhado ao Lemon Pepper',
        description: 'Wrap 100% natural utilizando folhas frescas de couve manteiga recheadas com tofu crocante e cenoura ralada.',
        prepTime: '15 min',
        calories: 190,
        macros: { protein: 15, carbs: 8, fat: 9 },
        ingredients: [
          '2 folhas grandes de couve manteiga higienizadas',
          '150g de tofu firme cortado em tiras',
          '1 colher de chá de lemon pepper sem sal',
          '1 cenoura média ralada',
          '1/2 pepino japonês em tiras finas',
          '1 colher de sopa de molho tahine com gotas de limão'
        ],
        instructions: [
          'Tempere as tiras de tofu com lemon pepper, azeite e uma pitada de sal.',
          'Grelhe o tofu em frigideira quente até dourar todos os lados.',
          'Mergulhe as folhas de couve por 15 segundos em água fervente para amaciar o talo (ou retire a parte mais grossa).',
          'Distribua o tofu, a cenoura e o pepino sobre a folha, regue com o tahine e enrole firmemente como um burrito.'
        ],
        tips: 'Excelente opção de lanche da tarde ou jantar leve com alta densidade de cálcio e magnésio.',
        dietTags: ['Vegano', 'Sem glúten', 'Sem lactose', 'Low carb', 'Emagrecimento'],
        difficulty: 'Fácil',
        imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=600'
      }
    ],
    tips: [
      {
        title: 'Troca inteligente no café da manhã',
        content: 'Substitua peito de peru ou presunto por ovos caipiras mexidos, homus de grão-de-bico ou tofu marinado com páprica.',
        category: 'substituição'
      },
      {
        title: 'Como dar sabor defumado sem nitritos',
        content: 'Use páprica defumada, cominho tostado na panela e algumas gotas de fumaça líquida pura nos seus cogumelos e feijões.',
        category: 'técnica'
      },
      {
        title: 'Proteína limpa pronta na geladeira',
        content: 'Cozinhe 500g de peito de frango com ervas ou 2 xícaras de lentilha no domingo e guarde em potes de vidro para a semana inteira.',
        category: 'organização'
      },
      {
        title: 'Por que eliminar embutidos?',
        content: 'Carnes ultraprocessadas contêm nitratos e excesso de sódio associados a picos pressóricos e inflamação celular.',
        category: 'nutrição'
      }
    ],
    dailyMissions: [
      { day: 1, title: 'Check-in da Geladeira', description: 'Identifique embutidos na sua geladeira e separe alternativas naturais (ovos, queijo branco, sementes).', completed: false },
      { day: 2, title: 'Café da Manhã Livre de Embutidos', description: 'Prepare uma refeição matinal rica em proteínas limpas (ex: Omelete de Cogumelos).', targetRecipeName: 'Omelete Cremosa de Cogumelos Paris e Espinafre', completed: false },
      { day: 3, title: 'Almoço com Proteína Vegetal ou Branca', description: 'Experimente o Hambúrguer Artesanal ou Frango na Cúrcuma no almoço.', targetRecipeName: 'Hambúrguer Artesanal de Grão-de-Bico e Ervas', completed: false },
      { day: 4, title: 'Lanche Rápido Sem Frios', description: 'Substitua o sanduíche com presunto por wrap verde ou frutas com sementes de abóbora.', completed: false },
      { day: 5, title: 'Jantar Leve e Revitalizante', description: 'Prepare o Wrap de Couve com Tofu ou Bowl de Quinoa.', targetRecipeName: 'Wrap de Folhas de Couve com Tofu Grelhado ao Lemon Pepper', completed: false },
      { day: 6, title: 'Exploração de Novos Temperos', description: 'Use páprica defumada, orégano fresco e azeite para criar sabores intensos e naturais.', completed: false },
      { day: 7, title: 'Vitória Sem Processados!', description: 'Complete 7 dias inteiros sem carnes embutidas e sinta a redução de retenção líquida e inchaço.', completed: false }
    ]
  },
  {
    id: 'desafio-vegetais-de-raiz',
    title: 'Descubra Vegetais de Raiz & Tubérculos',
    period: 'weekly',
    totalDays: 7,
    category: 'Vegetais & Fibras',
    tagline: 'Mergulhe nos sabores terrosos e fitoquímicos da mandioquinha, beterraba, inhame, cenoura e batata-doce.',
    description: 'Um desafio vibrante para transformar a forma como você consome tubérculos e raízes. Ricas em amido resistente prebiótico, minerais e betacaroteno, as raízes proporcionam energia estável, digestão equilibrada e pratos surpreendentemente coloridos.',
    goal: 'Consumir pelo menos 4 variedades diferentes de raízes ou tubérculos ao longo da semana.',
    badgeName: 'Explorador da Terra',
    badgeIcon: '🍠🥕',
    rewardPoints: 350,
    dietarySuitability: ['Vegano', 'Vegetariano', 'Sem glúten', 'Sem lactose', 'Geral'],
    recipes: [
      {
        id: 'rec-raiz-1',
        name: 'Creme Aveludado de Mandioquinha com Gengibre e Castanhas',
        description: 'Sopa aveludada reconfortante de batata-baroa aromatizada com gengibre fresco ralado e lâminas crocantes de castanha-do-pará.',
        prepTime: '20 min',
        calories: 220,
        macros: { protein: 4, carbs: 32, fat: 8 },
        ingredients: [
          '400g de mandioquinha (batata-baroa) descascada e picada',
          '1 colher de chá de gengibre fresco ralado',
          '1/2 cebola média picadinha',
          '1 colher de sopa de azeite de oliva',
          '500ml de caldo caseiro de legumes ou água',
          '3 castanhas-do-pará laminadas para finalizar',
          'Cebolinha fresca e sal a gosto'
        ],
        instructions: [
          'Refogue a cebola e o gengibre no azeite até murcharem suavemente.',
          'Adicione a mandioquinha picada e o caldo quente. Cozinhe por 12 minutos até amaciar.',
          'Bata no liquidificador ou mixer até obter textura sedosa.',
          'Ajuste o sal e sirva decorado com lâminas de castanha-do-pará e cebolinha.'
        ],
        tips: 'O gengibre equilibra o dulçor natural da mandioquinha e acelera a digestão.',
        dietTags: ['Vegano', 'Sem glúten', 'Sem lactose', 'Vegetariano'],
        difficulty: 'Fácil',
        imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&q=80&w=600'
      },
      {
        id: 'rec-raiz-2',
        name: 'Chips Crocantes de Beterraba e Batata-Doce ao Alecrim',
        description: 'Snack crocante e assado no forno com azeite, flor de sal e alecrim fresco da horta.',
        prepTime: '25 min',
        calories: 160,
        macros: { protein: 3, carbs: 28, fat: 5 },
        ingredients: [
          '1 beterraba grande cortada em fatias ultrafinas no mandolim',
          '1 batata-doce média cortada em fatias ultrafinas',
          '1 colher de sopa de azeite de oliva extra virgem',
          '1 colher de chá de alecrim fresco picado',
          'Flor de sal e pimenta-do-reino moída a gosto'
        ],
        instructions: [
          'Seque bem as fatias de beterraba e batata-doce com papel toalha.',
          'Em uma tigela, envolva as fatias delicadamente com o azeite e alecrim.',
          'Distribua em assadeira com papel manteiga sem sobrepor as fatias.',
          'Asse em forno pré-aquecido a 180°C por 18-22 minutos até ficarem sequinhas e crocantes. Salpique flor de sal.'
        ],
        tips: 'A beterraba é rica em óxido nítrico natural, que melhora a circulação e oxigenação muscular.',
        dietTags: ['Vegano', 'Sem glúten', 'Sem lactose', 'Snack saudável'],
        difficulty: 'Fácil',
        imageUrl: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&q=80&w=600'
      },
      {
        id: 'rec-raiz-3',
        name: 'Inhame Dourado Assado com Ervas Finas e Alho Confit',
        description: 'Cubos de inhame macios por dentro e dourados por fora, perfumados com tomilho e dentes de alho assados com casca.',
        prepTime: '30 min',
        calories: 210,
        macros: { protein: 3, carbs: 38, fat: 5 },
        ingredients: [
          '500g de inhame descascado e cortado em cubos médios',
          '4 dentes de alho inteiros com casca',
          '1 ramo de tomilho e 1 de orégano fresco',
          '1 colher de sopa de azeite de oliva',
          'Sal marinho e cúrcuma em pó a gosto'
        ],
        instructions: [
          'Cozinhe os cubos de inhame em água fervente com sal por 6 minutos (apenas para pré-cozinhar) e escorra bem.',
          'Coloque em uma assadeira, junte os dentes de alho, as ervas, cúrcuma e regue com azeite.',
          'Asse a 200°C por 20 minutos mexendo na metade do tempo até dourar.'
        ],
        tips: 'O inhame é um dos tubérculos mais indicados para fortalecimento imunológico e saúde da mulher.',
        dietTags: ['Vegano', 'Sem glúten', 'Sem lactose', 'Vegetariano'],
        difficulty: 'Fácil',
        imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=600'
      },
      {
        id: 'rec-raiz-4',
        name: 'Salada Quente de Cenouras Assadas com Laranja e Nozes',
        description: 'Cenouras inteiras assadas até caramelizarem, servidas com raspas de laranja, folhas de rúcula e nozes tostadas.',
        prepTime: '25 min',
        calories: 180,
        macros: { protein: 4, carbs: 22, fat: 9 },
        ingredients: [
          '4 cenouras médias cortadas em metades longitudinais',
          'Suco e raspas de 1/2 laranja',
          '2 colheres de sopa de nozes picadas tostadas',
          '1 xícara de folhas de rúcula',
          '1 colher de sobremesa de azeite e sal a gosto'
        ],
        instructions: [
          'Disponha as cenouras na assadeira, regue com azeite, suco de laranja e sal.',
          'Asse a 200°C por 20 minutos até ficarem macias com pontas douradas.',
          'Sirva sobre a cama de rúcula fresca e finalize com as nozes e raspas de laranja.'
        ],
        tips: 'O calor do forno quebra as paredes celulares da cenoura, triplicando a absorção de betacaroteno.',
        dietTags: ['Vegano', 'Sem glúten', 'Sem lactose', 'Vegetariano', 'Emagrecimento'],
        difficulty: 'Fácil',
        imageUrl: 'https://images.unsplash.com/photo-1447175008436-054170c2e979?auto=format&fit=crop&q=80&w=600'
      }
    ],
    tips: [
      {
        title: 'Cozimento para digestão máxima',
        content: 'Cozinhar raízes e deixar esfriar na geladeira antes de reaquecer cria amido resistente que age como fibra prebiótica pura.',
        category: 'nutrição'
      },
      {
        title: 'Inhame como espessante mágico',
        content: 'Bata 1 inhame cozido no liquidificador para deixar molhos, sopas e cremes aveludados sem glúten e sem lactose.',
        category: 'técnica'
      },
      {
        title: 'Aproveitamento integral',
        content: 'As folhas da beterraba e da cenoura podem ser refogadas como couve ou adicionadas a sucos verdes ricos em ferro.',
        category: 'organização'
      }
    ],
    dailyMissions: [
      { day: 1, title: 'Dia da Mandioquinha', description: 'Prepare uma receita com mandioquinha ou batata-baroa (ex: Creme Aveludado).', targetRecipeName: 'Creme Aveludado de Mandioquinha com Gengibre e Castanhas', completed: false },
      { day: 2, title: 'Dia da Beterraba', description: 'Experimente beterraba assada ou chips crocantes no forno.', targetRecipeName: 'Chips Crocantes de Beterraba e Batata-Doce ao Alecrim', completed: false },
      { day: 3, title: 'Dia da Batata-Doce', description: 'Inclua batata-doce roxa ou alaranjada no almoço como carboidrato de baixo índice glicêmico.', completed: false },
      { day: 4, title: 'Dia do Inhame Poderoso', description: 'Cozinhe inhame com ervas finas ou use como base cremosa para seu almoço.', targetRecipeName: 'Inhame Dourado Assado com Ervas Finas e Alho Confit', completed: false },
      { day: 5, title: 'Dia da Cenoura Caramelizada', description: 'Prepare as cenouras assadas com laranja e nozes para o jantar.', targetRecipeName: 'Salada Quente de Cenouras Assadas com Laranja e Nozes', completed: false },
      { day: 6, title: 'Combinação de Duas Raízes', description: 'Faça um purê ou assado combinando duas raízes diferentes no mesmo prato.', completed: false },
      { day: 7, title: 'Banquete dos Tubérculos', description: 'Comemore 7 dias de variedade e anote qual vegetal de raiz foi sua maior surpresa.', completed: false }
    ]
  },
  {
    id: 'desafio-mes-das-fibras',
    title: 'Mês das Fibras & Super Leguminosas',
    period: 'monthly',
    totalDays: 30,
    category: 'Saúde Intestinal',
    tagline: '30 dias elevando suas fibras diárias com feijões coloridos, lentilhas, grão-de-bico, sementes e aveia.',
    description: 'Um desafio mensal completo para restaurar sua saúde metabólica e intestinal. Aprenda a cozinhar leguminosas sem causar gases através do método correto de remolho e incorpore 30g+ de fibras diárias de forma saborosa e descomplicada.',
    goal: 'Atingir a meta de fibras em 25 dos 30 dias com leguminosas e cereais integrais.',
    badgeName: 'Guardião da Microbiota',
    badgeIcon: '🌾✨',
    rewardPoints: 1000,
    dietarySuitability: ['Vegano', 'Vegetariano', 'Sem glúten', 'Sem lactose', 'Diabetes'],
    recipes: [
      {
        id: 'rec-fibras-1',
        name: 'Dhal Cremoso de Lentilha Vermelha com Leite de Coco',
        description: 'Prato aromático indiano com lentilhas vermelhas que cozinham em 15 minutos, perfumadas com gengibre, cominho e coentro.',
        prepTime: '20 min',
        calories: 280,
        macros: { protein: 16, carbs: 38, fat: 6 },
        ingredients: [
          '1 xícara de lentilha vermelha lavada',
          '1/2 xícara de leite de coco leve',
          '1 colher de sobremesa de curry ou garam masala',
          '1 dente de alho ralado e 1 pedaço pequeno de gengibre',
          '1 tomate picado sem sementes',
          'Folhas de coentro fresco e sal a gosto'
        ],
        instructions: [
          'Refogue o alho, gengibre e o curry em 1 colher de azeite até liberar aroma.',
          'Junte o tomate, a lentilha vermelha e 2 xícaras de água.',
          'Cozinhe em fogo médio por 12 minutos até a lentilha desmanchar.',
          'Acrescente o leite de coco, acerte o sal e finalize com coentro fresco.'
        ],
        tips: 'A lentilha vermelha é de facílima digestão e não necessita de remolho longo.',
        dietTags: ['Vegano', 'Sem glúten', 'Sem lactose', 'Vegetariano'],
        difficulty: 'Fácil',
        imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=600'
      },
      {
        id: 'rec-fibras-2',
        name: 'Salada Refrescante de Feijão Fradinho com Vinagrete de Manga',
        description: 'Combinação perfeita e tropical de feijão fradinho al dente com cubinhos de manga, pimentão amarelo e cebola roxa.',
        prepTime: '15 min',
        calories: 230,
        macros: { protein: 11, carbs: 39, fat: 3 },
        ingredients: [
          '1 xícara e meia de feijão fradinho cozido e frio',
          '1/2 manga madura e firme cortada em cubos',
          '1/2 cebola roxa bem picada',
          '1/2 pimentão amarelo em cubinhos',
          'Suco de 1 limão tahiti e 1 colher de azeite',
          'Cheiro-verde picadinho e sal a gosto'
        ],
        instructions: [
          'Em uma saladeira, misture o feijão fradinho escorrido e frio com a manga, cebola e pimentão.',
          'Em um pote pequeno, emulsione o suco de limão, azeite e sal.',
          'Despeje sobre o feijão, misture bem e deixe na geladeira por 10 minutos antes de servir.'
        ],
        tips: 'Excelente fonte de amido resistente, zinco e magnésio para dias quentes.',
        dietTags: ['Vegano', 'Sem glúten', 'Sem lactose', 'Vegetariano'],
        difficulty: 'Fácil',
        imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=600'
      }
    ],
    tips: [
      {
        title: 'O segredo do remolho sem gases',
        content: 'Deixe feijões e grão-de-bico de molho por 12 a 24 horas em água com algumas gotas de limão, trocando a água 2 a 3 vezes antes de cozinhar.',
        category: 'técnica'
      },
      {
        title: 'Louro e cominho na panela de pressão',
        content: 'Cozinhe suas leguminosas sempre com folhas de louro e uma pitada de cominho para neutralizar os oligossacarídeos fermentáveis.',
        category: 'substituição'
      }
    ],
    dailyMissions: [
      { day: 1, title: 'Início da Jornada das Fibras', description: 'Adicione 1 colher de semente de chia ou linhaça ao seu café da manhã.', completed: false },
      { day: 7, title: 'Semana 1 Concluída', description: 'Consuma leguminosas em 5 dos 7 primeiros dias.', completed: false },
      { day: 15, title: 'Metade do Mês: Microbiota Fortalecida', description: 'Prepare o Dhal de Lentilha Vermelha para o jantar.', targetRecipeName: 'Dhal Cremoso de Lentilha Vermelha com Leite de Coco', completed: false },
      { day: 21, title: 'Semana 3: Variedade Máxima', description: 'Experimente uma leguminosa que você não comia há mais de 1 mês.', completed: false },
      { day: 30, title: 'Consagração do Mestre das Fibras!', description: 'Celebre 30 dias de saúde intestinal e ganhe sua medalha de ouro!', completed: false }
    ]
  },
  {
    id: 'desafio-zero-acucar-refinado',
    title: 'Semana Zero Açúcar Refinado',
    period: 'weekly',
    totalDays: 7,
    category: 'Detox & Glicemia',
    tagline: '7 dias desligando a compulsão por doces e redescobrindo o dulçor das frutas, canela e cacau 100%.',
    description: 'Desafio focado em estabilizar os níveis de insulina e recuperar a sensibilidade das suas papilas gustativas. Elimine açúcar branco, xaropes e refrigerantes usando sobremesas funcionais baseadas em frutas maduras e especiarias.',
    goal: '7 dias consecutivos sem nenhum açúcar refinado ou adoçante artificial.',
    badgeName: 'Doçura Natural',
    badgeIcon: '🍓🍫',
    rewardPoints: 400,
    dietarySuitability: ['Diabetes', 'Vegetariano', 'Sem glúten', 'Sem lactose', 'Geral'],
    recipes: [
      {
        id: 'rec-doce-1',
        name: 'Mousse Aveludada de Cacau 100% com Abacate e Canela',
        description: 'Sobremesa cremosa e rica em gorduras nobres que sacia o desejo por doce sem levar 1 grama sequer de açúcar refinado.',
        prepTime: '10 min',
        calories: 195,
        macros: { protein: 4, carbs: 14, fat: 15 },
        ingredients: [
          '1 abacate maduro pequeno',
          '3 colheres de sopa de cacau em pó 100%',
          '2 tâmaras sem caroço hidratadas em água morna (ou 1 banana bem madura)',
          '1/2 colher de café de canela em pó',
          '1 pitadinha de sal marinho para realçar o chocolate'
        ],
        instructions: [
          'Coloque a polpa do abacate, o cacau, as tâmaras e a canela no processador ou mixer.',
          'Bata em potência alta até formar um creme denso e sedoso.',
          'Leve à geladeira por 30 minutos e sirva com nibs de cacau ou morango fresco.'
        ],
        tips: 'O magnésio do cacau puro diminui a ansiedade e estabiliza o humor.',
        dietTags: ['Vegano', 'Sem glúten', 'Sem lactose', 'Diabetes'],
        difficulty: 'Fácil',
        imageUrl: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&q=80&w=600'
      }
    ],
    tips: [
      {
        title: 'Canela como aliada da insulina',
        content: 'A canela do Ceilão ajuda a sensibilizar os receptores de insulina e ameniza o pico de glicose pós-prandial.',
        category: 'nutrição'
      },
      {
        title: 'Como matar a vontade súbita de doce',
        content: 'Tome um copo de água morna com limão ou coma 2 quadradinhos de chocolate 85% cacau com algumas castanhas.',
        category: 'técnica'
      }
    ],
    dailyMissions: [
      { day: 1, title: 'Banir o Açúcar do Café', description: 'Aprecie o café puro ou aromatizado com canela em pó.', completed: false },
      { day: 2, title: 'Fruta no Lugar da Sobremesa', description: 'Consuma morangos, maçã com canela ou abacaxi com hortelã após o almoço.', completed: false },
      { day: 3, title: 'Sobremesa Mágica de Cacau', description: 'Prepare a Mousse de Cacau com Abacate.', targetRecipeName: 'Mousse Aveludada de Cacau 100% com Abacate e Canela', completed: false },
      { day: 4, title: 'Leitura de Rótulos', description: 'Verifique se há maltodextrina, xarope de milho ou sacarose oculta nos seus produtos.', completed: false },
      { day: 5, title: 'Lanche com Oleaginosas', description: 'Substitua biscoitos por mix de castanhas com sementes.', completed: false },
      { day: 6, title: 'Paladar Renovado', description: 'Note como frutas simples agora parecem naturalmente muito mais doces.', completed: false },
      { day: 7, title: 'Vitória Sem Açúcar!', description: 'Conclua a semana com energia constante e sem quedas de disposição.', completed: false }
    ]
  }
];

export function getFilteredCulinaryChallenges(profile: UserProfile | null): CulinaryChallenge[] {
  if (!profile) return DEFAULT_CULINARY_CHALLENGES;

  const restrictions = profile.restrictions || [];
  const allergies = profile.allergies || [];
  const allUserConstraints = [...restrictions, ...allergies].map(s => s.toLowerCase());

  return DEFAULT_CULINARY_CHALLENGES.map(challenge => {
    // Adapt recipes based on restrictions
    const adaptedRecipes = challenge.recipes.map(recipe => {
      // If user is vegan, warn or swap if recipe is not vegan
      const isVegan = allUserConstraints.some(c => c.includes('vegan'));
      const isGlutenFree = allUserConstraints.some(c => c.includes('glúten') || c.includes('gluten'));
      const isLactoseFree = allUserConstraints.some(c => c.includes('lactose') || c.includes('leite'));

      let adaptedTips = recipe.tips;
      if (isVegan && !recipe.dietTags.includes('Vegano')) {
        adaptedTips += ' (Dica Vegana: substitua ovos por aquafaba ou tofu amassado).';
      }
      if (isGlutenFree && !recipe.dietTags.includes('Sem glúten')) {
        adaptedTips += ' (Dica Sem Glúten: utilize farinha de aveia certificada sem glúten).';
      }
      if (isLactoseFree && !recipe.dietTags.includes('Sem lactose')) {
        adaptedTips += ' (Dica Sem Lactose: use bebida vegetal de amêndoas ou coco).';
      }

      return {
        ...recipe,
        tips: adaptedTips
      };
    });

    return {
      ...challenge,
      recipes: adaptedRecipes
    };
  });
}
