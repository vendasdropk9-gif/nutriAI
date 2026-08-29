export interface MedicinalHerbItem {
  id: string;
  popularName: string;
  scientificName: string;
  botanicalFamily: string;
  otherNames: string[];
  description: string;
  origin: string;
  biome: string;
  states: string[];
  harvestSeason: string;
  partUsed: string;
  properties: string[];
  indications: { name: string; evidence: string; badge: string }[];
  preparation: {
    amount: string;
    water: string;
    temperature: string;
    time: string;
    strain: string;
    dosage: string;
  };
  dosage: {
    traditional: string;
    limit: string;
    maxDuration: string;
  };
  contraindications: {
    warnings: string[];
  };
  compounds: string[];
  cultivation: {
    soil: string;
    luminosity: string;
    watering: string;
    climate: string;
  };
  curiosities: string[];
  sources: string[];
  photoURL: string;
  gallery: string[];
}

export const DEFAULT_MEDICINAL_HERBS: MedicinalHerbItem[] = [
  {
    id: "herb-alecrim",
    popularName: "Alecrim",
    scientificName: "Rosmarinus officinalis",
    botanicalFamily: "Lamiaceae",
    otherNames: ["Alecrim-do-jardim", "Alecrim-da-horta"],
    description: "Planta arbustiva perene com aroma característico forte, muito utilizada em infusões para cansaço mental, digestão e circulação sanguínea.",
    origin: "Região do Mediterrâneo (amplamente aclimatada no Brasil)",
    biome: "Mata Atlântica / Cerrado (Cultivado)",
    states: ["SP", "MG", "RJ", "RS", "PR", "SC"],
    harvestSeason: "Ano todo",
    partUsed: "Folhas e sumidades floridas",
    properties: ["Estimulante digestivo", "Antiespasmódico", "Antioxidante", "Tônico circulatório", "Anti-inflamatório leve"],
    indications: [
      { name: "Má digestão", evidence: "Forte evidência científica", badge: "🟢 Forte evidência científica" },
      { name: "Cansaço mental", evidence: "Evidência moderada", badge: "🟡 Evidência moderada" },
      { name: "Gases intestinais", evidence: "Uso tradicional", badge: "🟠 Uso tradicional" }
    ],
    preparation: {
      amount: "1 colher de sobremesa de folhas",
      water: "150ml (1 xícara de chá)",
      temperature: "Fervente (100°C)",
      time: "Abafar por 5 a 10 minutos (infusão)",
      strain: "Coar imediatamente após o tempo de infusão",
      dosage: "Tomar 1 xícara após as principais refeições"
    },
    dosage: {
      traditional: "2 a 3 xícaras por dia",
      limit: "Máximo de 10g de folhas secas ao dia",
      maxDuration: "Não usar continuamente por mais de 3 semanas"
    },
    contraindications: {
      warnings: [
        "Contraindicado para gestantes (risco de estimulação uterina)",
        "Lactantes e crianças menores de 12 anos devem evitar",
        "Pessoas com hipertensão ou epilepsia devem consumir com moderação e sob orientação.",
        "Pode causar insônia se tomado próximo ao horário de dormir."
      ]
    },
    compounds: ["Ácido rosmarínico", "Cânfora", "Alecrim-cineol", "Flavonoides", "Triterpenos"],
    cultivation: {
      soil: "Solo arenoso, bem drenado, de fertilidade média",
      luminosity: "Sol pleno (mínimo de 6 horas diárias)",
      watering: "Espaçada (evitar encharcamento a qualquer custo)",
      climate: "Ameno a quente, tolera frio moderado"
    },
    curiosities: [
      "Historicamente associado à memória e à amizade, na Grécia Antiga estudantes usavam ramos na cabeça durante exames.",
      "No Brasil, é consagrado no uso popular e em rituais tradicionais de bem-estar."
    ],
    sources: ["Farmacopeia Brasileira (Anvisa)", "Formulário de Fitoterápicos da Farmacopeia Brasileira, 2ª Edição", "Monografia da OMS sobre Plantas Medicinais."],
    photoURL: "https://images.unsplash.com/photo-1515543904379-3d757afe72e2?auto=format&fit=crop&q=80&w=600&h=600",
    gallery: [
      "https://images.unsplash.com/photo-1515543904379-3d757afe72e2?auto=format&fit=crop&q=80&w=600&h=600",
      "https://images.unsplash.com/photo-1594007654729-407ededc4963?auto=format&fit=crop&q=80&w=600&h=600"
    ]
  },
  {
    id: "herb-capim-limao",
    popularName: "Capim-Limão",
    scientificName: "Cymbopogon citratus",
    botanicalFamily: "Poaceae",
    otherNames: ["Capim-santo", "Capim-cidreira", "Chá-de-estrada"],
    description: "Gramínea perene nativa da Ásia tropical, extremamente popular no Brasil pela sua ação calmante, analgésica e espasmolítica.",
    origin: "Ásia tropical (amplamente cultivada e naturalizada no Brasil)",
    biome: "Cerrado / Amazônia / Mata Atlântica",
    states: ["SP", "MG", "RJ", "BA", "CE", "PR", "PE"],
    harvestSeason: "Ano todo (melhor antes da floração)",
    partUsed: "Folhas frescas ou secas",
    properties: ["Sedativo suave", "Ansiolítico leve", "Antiespasmódico", "Digestivo", "Diaforético"],
    indications: [
      { name: "Ansiedade leve", evidence: "Evidência moderada", badge: "🟡 Evidência moderada" },
      { name: "Cólicas abdominais", evidence: "Evidência moderada", badge: "🟡 Evidência moderada" },
      { name: "Insônia leve", evidence: "Uso tradicional", badge: "🟠 Uso tradicional" }
    ],
    preparation: {
      amount: "1 colher de sopa de folhas frescas picadas",
      water: "150ml (1 xícara de chá)",
      temperature: "Fervente (100°C)",
      time: "Abafar por 10 minutos (infusão)",
      strain: "Coar com peneira fina para remover microfarpas das folhas",
      dosage: "Tomar morno, preferencialmente à noite"
    },
    dosage: {
      traditional: "3 xícaras ao dia",
      limit: "Sem limite rígido definido na literatura para infusão padrão, mas evitar excesso",
      maxDuration: "Consumo diário seguro por até 4 semanas consecutivas"
    },
    contraindications: {
      warnings: [
        "Pode provocar hipotensão (redução da pressão arterial) em pessoas sensíveis",
        "Evitar o uso em casos de dor abdominal de causa desconhecida",
        "Não recomendado o uso do óleo essencial por via oral sem supervisão profissional",
        "Seguro para gestantes em doses alimentares típicas (chá fraco), mas evitar infusões altamente concentradas."
      ]
    },
    compounds: ["Citral", "Mirceno", "Geraniol", "Limoneno", "Ácidos fenólicos"],
    cultivation: {
      soil: "Solo fértil, úmido e bem drenado",
      luminosity: "Sol pleno",
      watering: "Regular (gosta de umidade constante sem encharcar)",
      climate: "Tropical e subtropical úmido"
    },
    curiosities: [
      "As folhas contêm cristais microscópicos de sílica que podem cortar a pele ao manusear, por isso o nome 'capim'.",
      "Muito utilizado na culinária tailandesa como capim-limão (lemongrass)."
    ],
    sources: ["Memento Fitoterápico da Farmacopeia Brasileira (Anvisa)", "Fitoterapia Baseada em Evidências, Fiocruz.", "European Medicines Agency (EMA) Monograph."],
    photoURL: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=600&h=600",
    gallery: [
      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=600&h=600"
    ]
  },
  {
    id: "herb-guaco",
    popularName: "Guaco",
    scientificName: "Mikania glomerata",
    botanicalFamily: "Asteraceae",
    otherNames: ["Erva-de-serpente", "Cipó-guaco", "Guaco-de-cheiro"],
    description: "Trepadeira lenhosa nativa do Brasil, consagrada cientificamente por sua potente ação broncodilatadora e expectorante contra tosses e afecções respiratórias.",
    origin: "Nativa do Sul e Sudeste do Brasil",
    biome: "Mata Atlântica",
    states: ["SP", "PR", "SC", "RS", "MG", "RJ"],
    harvestSeason: "Primavera e Verão",
    partUsed: "Folhas",
    properties: ["Broncodilatador", "Expectorante", "Antiasmático", "Anti-inflamatório respiratório"],
    indications: [
      { name: "Tosse produtiva", evidence: "Forte evidência científica", badge: "🟢 Forte evidência científica" },
      { name: "Bronquite", evidence: "Forte evidência científica", badge: "🟢 Forte evidência científica" },
      { name: "Resfriado comum", evidence: "Evidência moderada", badge: "🟡 Evidência moderada" }
    ],
    preparation: {
      amount: "3g (1 colher de sobremesa) de folhas picadas",
      water: "150ml (1 xícara de chá)",
      temperature: "Fervente (100°C)",
      time: "Abafar por 10 a 15 minutos (infusão)",
      strain: "Coar em seguida",
      dosage: "Tomar de 2 a 3 vezes ao dia, preferencialmente morno"
    },
    dosage: {
      traditional: "Xarope ou chá caseiro: 10ml a 15ml (xarope) até 3 vezes ao dia",
      limit: "Não exceder 5g de folha seca ao dia",
      maxDuration: "Não utilizar por mais de 14 dias seguidos"
    },
    contraindications: {
      warnings: [
        "Rico em cumarina, substância que inibe a coagulação. Contraindicado para quem usa anticoagulantes.",
        "Contraindicado para gestantes (risco de sangramentos uterinos) e lactantes.",
        "Não recomendado para crianças menores de 2 anos.",
        "O uso prolongado pode causar distúrbios de coagulação e diarreia."
      ]
    },
    compounds: ["Cumarina", "Ácido caurenóico", "Flavonoides", "Diterpenos"],
    cultivation: {
      soil: "Solo argilo-arenoso, rico em matéria orgânica",
      luminosity: "Meia-sombra a sol pleno (necessita de suporte para trepar)",
      watering: "Frequente (manter solo úmido)",
      climate: "Subtropical a tropical úmido"
    },
    curiosities: [
      "O guaco era originalmente usado pelas populações indígenas do Brasil como antídoto tradicional contra picadas de cobras venenosas devido à sua atividade enzimática.",
      "É um dos fitoterápicos mais distribuídos pelo SUS do Brasil."
    ],
    sources: ["Formulário de Fitoterápicos da Farmacopeia Brasileira", "ANVISA - RDC nº 26/2014", "Artigos de revisão Fiocruz."],
    photoURL: "https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&q=80&w=600&h=600",
    gallery: [
      "https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&q=80&w=600&h=600"
    ]
  },
  {
    id: "herb-espinheira-santa",
    popularName: "Espinheira-Santa",
    scientificName: "Monteverdia ilicifolia",
    botanicalFamily: "Celastraceae",
    otherNames: ["Salva-vidas", "Sombra-de-touro", "Espinho-de-deus"],
    description: "Pequena árvore nativa da região sul do Brasil, amplamente reconhecida pela medicina científica pela sua eficácia protetora gástrica equiparável ao omeprazol.",
    origin: "Nativa do Sul do Brasil e países vizinhos",
    biome: "Mata Atlântica / Pampa",
    states: ["RS", "SC", "PR", "SP", "MG"],
    harvestSeason: "Fim do verão",
    partUsed: "Folhas secas",
    properties: ["Antiulcerogênica", "Protetora da mucosa gástrica", "Antiácida", "Analgésica gástrica"],
    indications: [
      { name: "Gastrite", evidence: "Forte evidência científica", badge: "🟢 Forte evidência científica" },
      { name: "Úlcera gástrica", evidence: "Forte evidência científica", badge: "🟢 Forte evidência científica" },
      { name: "Azia e má digestão", evidence: "Forte evidência científica", badge: "🟢 Forte evidência científica" }
    ],
    preparation: {
      amount: "1 colher de sopa de folhas secas picadas",
      water: "150ml (1 xícara de chá)",
      temperature: "Fervente (100°C)",
      time: "Abafar por 10 minutos (infusão)",
      strain: "Coar bem",
      dosage: "Tomar morno em jejum ou 30 minutos antes das refeições principais"
    },
    dosage: {
      traditional: "3 xícaras de chá por dia",
      limit: "Equivalente a 9g de folhas secas por dia",
      maxDuration: "Pode ser utilizado por até 6 semanas consecutivas sob acompanhamento"
    },
    contraindications: {
      warnings: [
        "Contraindicado para gestantes (pode provocar contração uterina) e lactantes (pode diminuir a secreção de leite materno).",
        "Não recomendado para crianças menores de 12 anos.",
        "Pessoas com hipersensibilidade à planta devem suspender o uso imediatamente se houver reações alérgicas."
      ]
    },
    compounds: ["Taninos", "Fridelineol", "Maitenina", "Flavonoides (como a quercetina)", "Triterpenos"],
    cultivation: {
      soil: "Solo úmido, fértil e profundo",
      luminosity: "Meia-sombra a sol pleno (crescimento lento)",
      watering: "Regular e moderada",
      climate: "Fresco a subtropical, resistente a geadas fracas"
    },
    curiosities: [
      "Seu nome popular 'Espinheira-Santa' deve-se à presença de pequenos espinhos nas margens das folhas e ao seu poder terapêutico, antigamente considerado um milagre sagrado para dores estomacais indomáveis.",
      "Foi um dos primeiros fitoterápicos brasileiros a ter eficácia exaustivamente comprovada por testes farmacológicos nacionais na década de 1980."
    ],
    sources: ["Farmacopeia Brasileira", "Monografia de Plantas Medicinais do SUS - Ministério da Saúde", "Estudos clínicos da Central de Medicamentos (CEME)."],
    photoURL: "https://images.unsplash.com/photo-1563206767-5b18f218e8de?auto=format&fit=crop&q=80&w=600&h=600",
    gallery: [
      "https://images.unsplash.com/photo-1563206767-5b18f218e8de?auto=format&fit=crop&q=80&w=600&h=600"
    ]
  },
  {
    id: "herb-camomila",
    popularName: "Camomila",
    scientificName: "Matricaria chamomilla",
    botanicalFamily: "Asteraceae",
    otherNames: ["Camomila-comum", "Camomila-alemã", "Macela"],
    description: "Erva anual delicada de flores semelhantes a margaridas, famosa mundialmente e no Brasil por suas propriedades calmantes, ansiolíticas e anti-inflamatórias do trato digestivo.",
    origin: "Europa e Ásia ocidental (naturalizada e cultivada em larga escala no sul do Brasil)",
    biome: "Mata Atlântica / Pampa (Cultivado)",
    states: ["PR", "SC", "RS", "SP"],
    harvestSeason: "Primavera",
    partUsed: "Flores secas (capítulos florais)",
    properties: ["Calmante suave", "Ansiolítico", "Espasmolítico digestivo", "Carminativo", "Anti-inflamatório tópico e sistêmico"],
    indications: [
      { name: "Ansiedade e estresse", evidence: "Forte evidência científica", badge: "🟢 Forte evidência científica" },
      { name: "Insônia leve", evidence: "Forte evidência científica", badge: "🟢 Forte evidência científica" },
      { name: "Cólicas infantis (chá fraco)", evidence: "Evidência moderada", badge: "🟡 Evidência moderada" }
    ],
    preparation: {
      amount: "1 colher de sopa de flores secas",
      water: "150ml (1 xícara de chá)",
      temperature: "Fervente (100°C)",
      time: "Abafar imediatamente por 5 a 10 minutos (infusão)",
      strain: "Coar com cuidado para não esmagar os capítulos florais",
      dosage: "Tomar antes de dormir ou entre as refeições"
    },
    dosage: {
      traditional: "3 a 4 xícaras de chá por dia",
      limit: "Equivalente a 12g de flores secas ao dia",
      maxDuration: "Consumo diário seguro por longos períodos se em doses recomendadas"
    },
    contraindications: {
      warnings: [
        "Evitar em pessoas com alergia conhecida a plantas da família Asteraceae (como margaridas).",
        "Evitar o uso concomitante com sedativos sintéticos ou álcool pela potencialização do efeito ansiolítico.",
        "O chá altamente concentrado pode provocar náuseas em estômagos vazios."
      ]
    },
    compounds: ["Apigenina (flavonoide calmante)", "Bisabolol", "Chamazuleno", "Cumarinas", "Óleo essencial rico"],
    cultivation: {
      soil: "Solo leve, bem drenado, medianamente fértil",
      luminosity: "Sol pleno",
      watering: "Regular (evitar solo encharcado ou extremamente seco)",
      climate: "Ameno a frio (desenvolve-se melhor em temperaturas baixas de outono/inverno)"
    },
    curiosities: [
      "A apigenina presente na camomila liga-se aos mesmos receptores cerebrais que os ansiolíticos de farmácia (receptores benzodiazepínicos), gerando relaxamento muscular e redução de ansiedade sem causar dependência.",
      "No Egito Antigo, a camomila era dedicada ao Deus do Sol, Rá, devido ao seu poder de curar febres."
    ],
    sources: ["Farmacopeia Brasileira", "Monografias da Agência Europeia de Medicamentos (EMA)", "National Institutes of Health (NIH) Camomile reviews."],
    photoURL: "https://images.unsplash.com/photo-1595971294624-80bcfba88235?auto=format&fit=crop&q=80&w=600&h=600",
    gallery: [
      "https://images.unsplash.com/photo-1595971294624-80bcfba88235?auto=format&fit=crop&q=80&w=600&h=600",
      "https://images.unsplash.com/photo-1515543904379-3d757afe72e2?auto=format&fit=crop&q=80&w=600&h=600"
    ]
  }
];
