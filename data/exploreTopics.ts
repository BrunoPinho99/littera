
export interface SupportText {
  id: string;
  title: string;
  content: string;
  icon: string;
}

export interface ExploreTopic {
  id: string;
  title: string;
  category: "Sociedade" | "Meio Ambiente" | "Tecnologia" | "Educação" | "Saúde" | "Cultura" | "Política" | "Economia";
  difficulty: "Fácil" | "Médio" | "Difícil";
  supportTexts: SupportText[];
}

export const exploreTopics: ExploreTopic[] = [
  // --- EIXO 1: DESIGUALDADE SOCIAL E DIREITOS BÁSICOS ---
  {
    id: "t-28",
    title: "A persistência da fome e da insegurança alimentar no Brasil contemporâneo",
    category: "Sociedade",
    difficulty: "Difícil",
    supportTexts: [
      {
        id: "st-28-1",
        title: "Dados da PNAD Contínua",
        content: "Apesar de uma queda recente, milhões de brasileiros ainda vivem com algum grau de insegurança alimentar, revelando a persistência da miséria estrutural.",
        icon: "analytics"
      },
      {
        id: "st-28-2",
        title: "O Paradoxo da Fome Oculta",
        content: "O Brasil enfrenta o paradoxo de ser o 'celeiro do mundo' enquanto parte da população sofre de 'Fome Oculta' (falta de nutrientes apesar da ingestão calórica).",
        icon: "restaurant"
      }
    ]
  },
  {
    id: "t-29",
    title: "A invisibilidade da população em situação de rua e o acesso à cidadania",
    category: "Sociedade",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-29-1",
        title: "Relatório MDHC",
        content: "Mais de 335 mil pessoas vivem nas ruas. Houve um aumento significativo na violência contra esse grupo no último ano.",
        icon: "groups"
      },
      {
        id: "st-29-2",
        title: "Aporofobia",
        content: "O conceito de 'Aporofobia' (aversão aos pobres) e a arquitetura hostil nas cidades (pedras sob viadutos) como barreira física à cidadania.",
        icon: "location_city"
      }
    ]
  },
  {
    id: "t-30",
    title: "O déficit habitacional e a luta pelo direito à moradia digna",
    category: "Sociedade",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-30-1",
        title: "Déficit Qualitativo",
        content: "O problema não é apenas a falta de casas, mas a precariedade das existentes (falta de banheiro, superlotação) e o ônus excessivo do aluguel.",
        icon: "home_work"
      },
      {
        id: "st-30-2",
        title: "Função Social",
        content: "A Constituição Federal garante a função social da propriedade, combatendo a especulação imobiliária em imóveis vazios.",
        icon: "gavel"
      }
    ]
  },
  {
    id: "t-31",
    title: "Saneamento básico: desigualdades regionais e saúde pública",
    category: "Saúde",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-31-1",
        title: "Discrepância Regional",
        content: "Enquanto o Sudeste avança, o Norte ainda depende majoritariamente de fossas rudimentares, afetando a saúde infantil.",
        icon: "water_drop"
      },
      {
        id: "st-31-2",
        title: "Doenças Evitáveis",
        content: "A falta de esgoto tratado está diretamente ligada à proliferação de doenças como leptospirose, dengue e diarreia.",
        icon: "healing"
      }
    ]
  },
  {
    id: "t-32",
    title: "A precarização do trabalho na era da 'uberização'",
    category: "Economia",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-32-1",
        title: "Informalidade Recorde",
        content: "O aumento de trabalhadores por conta própria sem proteção da CLT reflete a busca por sobrevivência em meio ao desemprego.",
        icon: "work_history"
      },
      {
        id: "st-32-2",
        title: "O Precariado",
        content: "Conceito sociológico que define a classe de trabalhadores sem garantias, férias ou seguridade social, dependentes de plataformas.",
        icon: "motorcycle"
      }
    ]
  },
  {
    id: "t-33",
    title: "Trabalho análogo à escravidão no século XXI: raízes e combates",
    category: "Sociedade",
    difficulty: "Difícil",
    supportTexts: [
      {
        id: "st-33-1",
        title: "Resgates Recentes",
        content: "Casos em vinícolas e plantações mostram que a escravidão moderna se baseia em dívidas impagáveis e condições degradantes.",
        icon: "newspaper"
      },
      {
        id: "st-33-2",
        title: "Lista Suja",
        content: "A 'Lista Suja' do trabalho escravo é uma ferramenta vital para punir economicamente empresas que violam direitos humanos.",
        icon: "gavel"
      }
    ]
  },
  {
    id: "t-34",
    title: "A concentração de renda e a imobilidade social",
    category: "Economia",
    difficulty: "Difícil",
    supportTexts: [
      {
        id: "st-34-1",
        title: "Abismo Social",
        content: "O 1% mais rico do Brasil detém riqueza equivalente à metade mais pobre da população, dificultando a ascensão social.",
        icon: "show_chart"
      },
      {
        id: "st-34-2",
        title: "Mito da Meritocracia",
        content: "A ideia de meritocracia falha quando as oportunidades iniciais (berço, educação, saúde) são drasticamente desiguais.",
        icon: "psychology"
      }
    ]
  },
  {
    id: "t-35",
    title: "O analfabetismo funcional e seus impactos na produtividade",
    category: "Educação",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-35-1",
        title: "Indicador INAF",
        content: "Grande parte da população economicamente ativa consegue ler palavras, mas não interpreta textos complexos ou instruções técnicas.",
        icon: "menu_book"
      },
      {
        id: "st-35-2",
        title: "Gargalo Econômico",
        content: "A baixa qualificação básica impede o aumento da produtividade nacional e a inovação nas empresas.",
        icon: "engineering"
      }
    ]
  },
  {
    id: "t-36",
    title: "A pobreza menstrual e o acesso à dignidade feminina",
    category: "Saúde",
    difficulty: "Fácil",
    supportTexts: [
      {
        id: "st-36-1",
        title: "Evasão Escolar",
        content: "Meninas perdem dias de aula mensalmente por falta de absorventes, prejudicando seu rendimento e futuro.",
        icon: "school"
      },
      {
        id: "st-36-2",
        title: "Questão de Saúde",
        content: "O acesso a itens de higiene é um direito básico de saúde pública, não um item cosmético ou supérfluo.",
        icon: "spa"
      }
    ]
  },
  {
    id: "t-37",
    title: "A inclusão financeira e o superendividamento das famílias",
    category: "Economia",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-37-1",
        title: "Inadimplência Básica",
        content: "Milhões de famílias estão negativadas por dívidas de sobrevivência (água, luz, comida), não por consumo de luxo.",
        icon: "credit_card_off"
      },
      {
        id: "st-37-2",
        title: "Educação Financeira",
        content: "A falta de letramento financeiro nas escolas torna os jovens presas fáceis de juros abusivos e cartões de crédito.",
        icon: "balance"
      }
    ]
  },
  {
    id: "t-38",
    title: "A crise dos refugiados e a acolhida humanitária no Brasil",
    category: "Sociedade",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-38-1",
        title: "Operação Acolhida",
        content: "O desafio de integrar venezuelanos, haitianos e afegãos ao mercado de trabalho e ao sistema educacional brasileiro.",
        icon: "flight_land"
      },
      {
        id: "st-38-2",
        title: "Nova Lei de Migração",
        content: "A legislação mudou o foco da segurança nacional para os direitos humanos, garantindo acesso a serviços públicos.",
        icon: "policy"
      }
    ]
  },
  {
    id: "t-39",
    title: "O acesso à justiça e o papel das defensorias públicas",
    category: "Sociedade",
    difficulty: "Difícil",
    supportTexts: [
      {
        id: "st-39-1",
        title: "Desertos Jurídicos",
        content: "Mapa das comarcas sem defensores públicos no interior do Brasil, dificultando o acesso dos pobres à justiça.",
        icon: "map"
      },
      {
        id: "st-39-2",
        title: "Inafastabilidade",
        content: "O princípio constitucional da inafastabilidade da jurisdição e a assistência jurídica gratuita como dever do Estado.",
        icon: "balance"
      }
    ]
  },
  {
    id: "t-40",
    title: "A gravidez na adolescência como perpetuadora da pobreza",
    category: "Saúde",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-40-1",
        title: "Ciclo da Pobreza",
        content: "Mães adolescentes têm maior taxa de evasão escolar, o que reduz sua renda futura e perpetua a vulnerabilidade.",
        icon: "baby_changing_station"
      },
      {
        id: "st-40-2",
        title: "Prevenção",
        content: "A necessidade de educação sexual nas escolas e acesso facilitado a métodos contraceptivos no SUS.",
        icon: "health_and_safety"
      }
    ]
  },
  {
    id: "t-41",
    title: "O transporte público como direito social e a mobilidade urbana",
    category: "Sociedade",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-41-1",
        title: "Tempo Perdido",
        content: "Dados sobre o tempo médio de deslocamento casa-trabalho nas metrópoles e o impacto na qualidade de vida.",
        icon: "directions_bus"
      },
      {
        id: "st-41-2",
        title: "Direito Constitucional",
        content: "A PEC do Transporte (Emenda Constitucional 90) incluiu o transporte no rol de direitos sociais.",
        icon: "gavel"
      }
    ]
  },
  {
    id: "t-42",
    title: "A gentrificação e a expulsão dos pobres dos centros urbanos",
    category: "Sociedade",
    difficulty: "Difícil",
    supportTexts: [
      {
        id: "st-42-1",
        title: "Revitalização Excludente",
        content: "Melhorias urbanas frequentemente encarecem o custo de vida, empurrando moradores antigos para periferias distantes.",
        icon: "apartment"
      },
      {
        id: "st-42-2",
        title: "Direito à Cidade",
        content: "O conceito de que a cidade deve ser um espaço democrático de convivência, não apenas um ativo imobiliário.",
        icon: "location_on"
      }
    ]
  },
  {
    id: "t-43",
    title: "A insegurança hídrica nas periferias urbanas",
    category: "Sociedade",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-43-1",
        title: "Racionamento Desigual",
        content: "O racionamento de água afeta desproporcionalmente favelas e bairros pobres, enquanto áreas nobres mantêm abastecimento.",
        icon: "water_off"
      },
      {
        id: "st-43-2",
        title: "Água como Bem Comum",
        content: "A água como bem comum versus a mercantilização dos serviços de saneamento.",
        icon: "public"
      }
    ]
  },
  {
    id: "t-44",
    title: "O combate ao trabalho infantil nas ruas e feiras",
    category: "Sociedade",
    difficulty: "Fácil",
    supportTexts: [
      {
        id: "st-44-1",
        title: "Invisibilidade",
        content: "Dados da PNAD sobre o trabalho infantil, destacando a invisibilidade das crianças que vendem balas ou trabalham em feiras livres.",
        icon: "visibility_off"
      },
      {
        id: "st-44-2",
        title: "Cultura do Trabalho",
        content: "A cultura popular de que 'é melhor trabalhar do que roubar' atua como obstáculo à erradicação e à escolarização plena.",
        icon: "work"
      }
    ]
  },
  {
    id: "t-45",
    title: "A aporofobia e a hostilidade contra a população de rua",
    category: "Sociedade",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-45-1",
        title: "Lei Padre Júlio Lancellotti",
        content: "Lei 14.489/2022 que proíbe a arquitetura hostil em espaços públicos (ex: pedras sob viadutos).",
        icon: "foundation"
      },
      {
        id: "st-45-2",
        title: "Ódio à Pobreza",
        content: "Relatos de violência física e moral contra sem-teto, evidenciando o ódio à pobreza e a exclusão social.",
        icon: "sentiment_very_dissatisfied"
      }
    ]
  },
  {
    id: "t-46",
    title: "A democratização do acesso à energia elétrica",
    category: "Sociedade",
    difficulty: "Fácil",
    supportTexts: [
      {
        id: "st-46-1",
        title: "Luz para Todos",
        content: "Os desafios das comunidades isoladas na Amazônia e a importância do programa de universalização.",
        icon: "lightbulb"
      },
      {
        id: "st-46-2",
        title: "Tarifa Social",
        content: "O peso da conta de luz no orçamento das famílias de baixa renda e a necessidade de subsídios.",
        icon: "request_quote"
      }
    ]
  },
  {
    id: "t-47",
    title: "A desigualdade no acesso à internet e a exclusão digital",
    category: "Tecnologia",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-47-1",
        title: "Qualidade do Acesso",
        content: "Pesquisa TIC Domicílios mostrando a diferença entre banda larga e dados móveis limitados entre classes sociais.",
        icon: "wifi_off"
      },
      {
        id: "st-47-2",
        title: "Cidadania Digital",
        content: "A internet como porta de entrada para serviços públicos (Gov.br, ENEM) e a exclusão de quem não tem conexão.",
        icon: "login"
      }
    ]
  },
  {
    id: "t-48",
    title: "O direito ao lazer nas comunidades periféricas",
    category: "Cultura",
    difficulty: "Fácil",
    supportTexts: [
      {
        id: "st-48-1",
        title: "Falta de Equipamentos",
        content: "Mapeamento de parques públicos e centros culturais mostra sua escassez em zonas periféricas.",
        icon: "park"
      },
      {
        id: "st-48-2",
        title: "Tempo Livre",
        content: "O lazer garantido na Constituição versus a realidade do 'tempo livre' usado apenas para transporte ou descanso.",
        icon: "schedule"
      }
    ]
  },
  {
    id: "t-49",
    title: "A insegurança alimentar nas comunidades indígenas",
    category: "Sociedade",
    difficulty: "Difícil",
    supportTexts: [
      {
        id: "st-49-1",
        title: "Desnutrição",
        content: "Casos de desnutrição em terras indígenas (ex: Yanomami) devido ao garimpo e degradação ambiental.",
        icon: "health_and_safety"
      },
      {
        id: "st-49-2",
        title: "Soberania Alimentar",
        content: "A relação intrínseca entre a preservação do território e a capacidade de produção de alimentos desses povos.",
        icon: "forest"
      }
    ]
  },
  {
    id: "t-50",
    title: "A violência patrimonial contra idosos de baixa renda",
    category: "Sociedade",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-50-1",
        title: "Apropriação Indébita",
        content: "Dados do Disque 100 sobre familiares que se apropriam das aposentadorias de idosos.",
        icon: "money_off"
      },
      {
        id: "st-50-2",
        title: "Arrimo de Família",
        content: "A vulnerabilidade financeira dessa população que muitas vezes sustenta a família inteira com o benefício.",
        icon: "family_restroom"
      }
    ]
  },

  // --- EIXO 2: AMBIENTAL E CLIMÁTICO ---
  {
    id: "t-66",
    title: "O racismo ambiental e a vulnerabilidade climática",
    category: "Meio Ambiente",
    difficulty: "Difícil",
    supportTexts: [
      {
        id: "st-66-1",
        title: "Geografia do Risco",
        content: "Populações periféricas e negras vivem desproporcionalmente em áreas de risco de deslizamento e enchentes.",
        icon: "flood"
      },
      {
        id: "st-66-2",
        title: "Justiça Climática",
        content: "O conceito de que os que menos contribuíram para o aquecimento global são os que mais sofrem suas consequências.",
        icon: "public_off"
      }
    ]
  },
  {
    id: "t-67",
    title: "Os desafios para a transição energética justa no Brasil",
    category: "Meio Ambiente",
    difficulty: "Difícil",
    supportTexts: [
      {
        id: "st-67-1",
        title: "Matriz de Transportes",
        content: "Apesar da eletricidade verde, o Brasil ainda depende excessivamente de combustíveis fósseis para transporte de carga.",
        icon: "bolt"
      },
      {
        id: "st-67-2",
        title: "Impacto Social",
        content: "Projetos de energia eólica e solar no Nordeste não podem repetir modelos colonialistas de exploração de terras.",
        icon: "solar_power"
      }
    ]
  },
  {
    id: "t-68",
    title: "A gestão de resíduos sólidos e o fim dos lixões",
    category: "Meio Ambiente",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-68-1",
        title: "PNRS Descumprida",
        content: "A Política Nacional de Resíduos Sólidos ainda não foi plenamente implementada, com milhares de lixões ativos.",
        icon: "delete_forever"
      },
      {
        id: "st-68-2",
        title: "Inclusão de Catadores",
        content: "A reciclagem no Brasil depende da força de trabalho informal dos catadores, que precisam de dignidade e remuneração.",
        icon: "recycling"
      }
    ]
  },
  {
    id: "t-69",
    title: "O desmatamento do Cerrado e a segurança hídrica",
    category: "Meio Ambiente",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-69-1",
        title: "Fronteira Agrícola",
        content: "O Cerrado sofre com desmatamento acelerado, muitas vezes superando a Amazônia, devido à expansão da soja.",
        icon: "forest"
      },
      {
        id: "st-69-2",
        title: "Berço das Águas",
        content: "A destruição do Cerrado ameaça as nascentes das principais bacias hidrográficas do Brasil e o abastecimento urbano.",
        icon: "water"
      }
    ]
  },
  {
    id: "t-70",
    title: "A poluição por plásticos nos oceanos e microplásticos",
    category: "Meio Ambiente",
    difficulty: "Fácil",
    supportTexts: [
      {
        id: "st-70-1",
        title: "Mar de Plástico",
        content: "Estudos indicam que haverá mais plástico do que peixes nos oceanos até 2050 se o consumo não mudar.",
        icon: "waves"
      },
      {
        id: "st-70-2",
        title: "Contaminação Humana",
        content: "Microplásticos já foram encontrados no sangue humano e no leite materno, com consequências desconhecidas.",
        icon: "set_meal"
      }
    ]
  },
  {
    id: "t-71",
    title: "Cidades esponja e adaptação urbana às mudanças climáticas",
    category: "Meio Ambiente",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-71-1",
        title: "Solo Impermeável",
        content: "O excesso de concreto nas cidades impede a absorção da água, agravando enchentes catastróficas.",
        icon: "location_city"
      },
      {
        id: "st-71-2",
        title: "Soluções Verdes",
        content: "Jardins de chuva e parques lineares (cidades esponja) são alternativas sustentáveis à drenagem tradicional.",
        icon: "park"
      }
    ]
  },
  {
    id: "t-72",
    title: "A exploração de petróleo na Foz do Amazonas",
    category: "Meio Ambiente",
    difficulty: "Difícil",
    supportTexts: [
      {
        id: "st-72-1",
        title: "Riqueza Econômica",
        content: "Argumentos sobre a 'Margem Equatorial' como nova fronteira de riqueza para o desenvolvimento nacional.",
        icon: "oil_barrel"
      },
      {
        id: "st-72-2",
        title: "Risco Ambiental",
        content: "Argumentos do IBAMA sobre a sensibilidade dos corais e mangues e o risco de vazamentos irreversíveis.",
        icon: "warning"
      }
    ]
  },
  {
    id: "t-73",
    title: "O consumismo e a obsolescência programada",
    category: "Meio Ambiente",
    difficulty: "Fácil",
    supportTexts: [
      {
        id: "st-73-1",
        title: "Lixo Eletrônico",
        content: "O Brasil é um dos maiores geradores de e-lixo do mundo, com pouca reciclagem de componentes tóxicos.",
        icon: "devices_other"
      },
      {
        id: "st-73-2",
        title: "Produtos Descartáveis",
        content: "A lógica industrial de criar produtos com vida útil curta força o consumo contínuo e esgota recursos naturais.",
        icon: "shopping_cart"
      }
    ]
  },
  {
    id: "t-74",
    title: "O combate ao tráfico de animais silvestres",
    category: "Meio Ambiente",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-74-1",
        title: "Biopirataria",
        content: "Dados do IBAMA sobre apreensões e a biodiversidade brasileira como alvo de biopirataria internacional.",
        icon: "pets"
      },
      {
        id: "st-74-2",
        title: "Zoonoses",
        content: "A relação entre o tráfico de fauna, o desequilíbrio ecológico e o surgimento de doenças transmitidas de animais para humanos.",
        icon: "coronavirus"
      }
    ]
  },
  {
    id: "t-75",
    title: "A agricultura sustentável e os sistemas agroflorestais",
    category: "Meio Ambiente",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-75-1",
        title: "Monocultura vs Agrofloresta",
        content: "Comparativo entre a monocultura extensiva (uso intensivo de solo) e a agrofloresta (consórcio de espécies).",
        icon: "agriculture"
      },
      {
        id: "st-75-2",
        title: "Agricultura Familiar",
        content: "A importância da agricultura familiar na produção de alimentos diversificados e na preservação do solo.",
        icon: "diversity_2"
      }
    ]
  },
  {
    id: "t-76",
    title: "O impacto das queimadas na saúde pública",
    category: "Meio Ambiente",
    difficulty: "Fácil",
    supportTexts: [
      {
        id: "st-76-1",
        title: "Doenças Respiratórias",
        content: "Dados de internações na Amazônia e Pantanal durante a temporada de fogo.",
        icon: "lungs"
      },
      {
        id: "st-76-2",
        title: "Rios Voadores de Fumaça",
        content: "A fumaça que viaja continentes e afeta a qualidade do ar em grandes centros urbanos distantes.",
        icon: "air"
      }
    ]
  },
  {
    id: "t-77",
    title: "A proteção dos manguezais e a biodiversidade costeira",
    category: "Meio Ambiente",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-77-1",
        title: "Berçários",
        content: "O papel dos mangues como 'berçários' da vida marinha e sequestradores de carbono eficientes.",
        icon: "water"
      },
      {
        id: "st-77-2",
        title: "Especulação",
        content: "Ameaças da especulação imobiliária e da carcinicultura em áreas de preservação permanente.",
        icon: "block"
      }
    ]
  },
  {
    id: "t-78",
    title: "O desperdício de alimentos e a sustentabilidade",
    category: "Meio Ambiente",
    difficulty: "Fácil",
    supportTexts: [
      {
        id: "st-78-1",
        title: "Perda na Cadeia",
        content: "Estatísticas da FAO sobre a perda de alimentos no transporte e armazenamento antes de chegar ao consumidor.",
        icon: "local_shipping"
      },
      {
        id: "st-78-2",
        title: "Contradição Ética",
        content: "A contradição de desperdiçar comida em um país que voltou ao Mapa da Fome.",
        icon: "restaurant_menu"
      }
    ]
  },
  {
    id: "t-79",
    title: "A moda sustentável (slow fashion) versus fast fashion",
    category: "Meio Ambiente",
    difficulty: "Fácil",
    supportTexts: [
      {
        id: "st-79-1",
        title: "Impacto Têxtil",
        content: "O impacto ambiental da indústria têxtil (água, tinturas tóxicas) e o descarte rápido de roupas baratas.",
        icon: "checkroom"
      },
      {
        id: "st-79-2",
        title: "Slow Fashion",
        content: "Movimento que valoriza a durabilidade, a produção ética e a reutilização de peças.",
        icon: "recycling"
      }
    ]
  },
  {
    id: "t-80",
    title: "A mineração em terras indígenas",
    category: "Meio Ambiente",
    difficulty: "Difícil",
    supportTexts: [
      {
        id: "st-80-1",
        title: "Mercúrio",
        content: "Dados sobre a contaminação por mercúrio em rios da Amazônia causada pelo garimpo, afetando a saúde.",
        icon: "science"
      },
      {
        id: "st-80-2",
        title: "Vedação Legal",
        content: "A Constituição de 1988 e a regulação estrita da exploração mineral em territórios demarcados.",
        icon: "gavel"
      }
    ]
  },

  // --- EIXO 3: TECNOLOGIA E INFORMAÇÃO ---
  {
    id: "t-101",
    title: "O uso da Inteligência Artificial na educação: plágio ou ferramenta?",
    category: "Tecnologia",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-101-1",
        title: "Novo Desafio Docente",
        content: "Professores enfrentam o desafio de avaliar alunos que usam IA para escrever redações e resolver problemas.",
        icon: "smart_toy"
      },
      {
        id: "st-101-2",
        title: "Potencial Personalizado",
        content: "Se bem usada, a IA pode personalizar o ensino para alunos com dificuldades, atuando como tutor individual.",
        icon: "psychology"
      }
    ]
  },
  {
    id: "t-102",
    title: "O vício em apostas online (Bets) e a saúde financeira",
    category: "Economia",
    difficulty: "Difícil",
    supportTexts: [
      {
        id: "st-102-1",
        title: "Impacto no Varejo",
        content: "O dinheiro que iria para alimentação e vestuário está sendo desviado para apostas, afetando a economia real.",
        icon: "trending_down"
      },
      {
        id: "st-102-2",
        title: "Ludopatia Digital",
        content: "A facilidade de acesso via celular torna o vício em jogos (ludopatia) uma epidemia silenciosa e rápida.",
        icon: "warning"
      }
    ]
  },
  {
    id: "t-103",
    title: "A desinformação (Fake News) como ameaça à saúde pública",
    category: "Saúde",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-103-1",
        title: "Hesitação Vacinal",
        content: "Mentiras espalhadas em redes sociais causaram a volta de doenças como sarampo e poliomielite.",
        icon: "vaccines"
      },
      {
        id: "st-103-2",
        title: "Infodemia",
        content: "O excesso de informações contraditórias gera ansiedade e paralisia na tomada de decisões de saúde.",
        icon: "info"
      }
    ]
  },
  {
    id: "t-104",
    title: "O 'stalking' e a privacidade na era da hiperconectividade",
    category: "Tecnologia",
    difficulty: "Fácil",
    supportTexts: [
      {
        id: "st-104-1",
        title: "Crime Tipificado",
        content: "A lei do stalking reconhece a perseguição (física ou digital) como crime que fere a liberdade individual.",
        icon: "visibility_off"
      },
      {
        id: "st-104-2",
        title: "Exposição Excessiva",
        content: "O hábito de compartilhar localização e rotina em tempo real facilita a ação de criminosos.",
        icon: "share"
      }
    ]
  },
  {
    id: "t-105",
    title: "O impacto das telas no desenvolvimento infantil",
    category: "Saúde",
    difficulty: "Fácil",
    supportTexts: [
      {
        id: "st-105-1",
        title: "Atrasos Cognitivos",
        content: "O uso precoce de telas está associado a atrasos na fala e dificuldades de interação social em bebês.",
        icon: "child_care"
      },
      {
        id: "st-105-2",
        title: "Sedentarismo",
        content: "Crianças trocam o brincar ativo por tablets, contribuindo para a epidemia de obesidade infantil.",
        icon: "tablet"
      }
    ]
  },
  {
    id: "t-106",
    title: "A 'uberização' e o controle algorítmico do trabalho",
    category: "Tecnologia",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-106-1",
        title: "Caixa Preta",
        content: "Relatos de trabalhadores de plataforma sobre como o algoritmo dita preços e punições sem transparência.",
        icon: "code"
      },
      {
        id: "st-106-2",
        title: "Subordinação",
        content: "A discussão sobre a subordinação algorítmica e a necessidade de regulação das plataformas.",
        icon: "work"
      }
    ]
  },
  {
    id: "t-107",
    title: "A cultura do cancelamento e o tribunal da internet",
    category: "Sociedade",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-107-1",
        title: "Justiça sem Juiz",
        content: "O cancelamento impõe penas sociais severas sem direito de defesa ou devido processo legal.",
        icon: "gavel"
      },
      {
        id: "st-107-2",
        title: "Intolerância",
        content: "A polarização digital elimina o espaço para o erro, o perdão e o diálogo construtivo.",
        icon: "groups"
      }
    ]
  },
  {
    id: "t-108",
    title: "O reconhecimento facial e o viés racial na segurança",
    category: "Tecnologia",
    difficulty: "Difícil",
    supportTexts: [
      {
        id: "st-108-1",
        title: "Erro Algorítmico",
        content: "Tecnologias de reconhecimento facial falham mais com rostos negros, levando a prisões injustas.",
        icon: "face"
      },
      {
        id: "st-108-2",
        title: "Vigilância Constante",
        content: "O uso massivo de câmeras levanta debates sobre o fim da privacidade em espaços públicos.",
        icon: "videocam"
      }
    ]
  },
  {
    id: "t-109",
    title: "A exclusão digital dos idosos",
    category: "Sociedade",
    difficulty: "Fácil",
    supportTexts: [
      {
        id: "st-109-1",
        title: "Cidadania Digital",
        content: "Serviços essenciais (banco, INSS) migraram para apps, excluindo idosos sem letramento digital.",
        icon: "elderly"
      },
      {
        id: "st-109-2",
        title: "Vulnerabilidade",
        content: "A falta de familiaridade com a tecnologia torna os idosos alvos preferenciais de golpes financeiros.",
        icon: "phonelink_lock"
      }
    ]
  },
  {
    id: "t-110",
    title: "O fenômeno dos influenciadores digitais e o consumo",
    category: "Tecnologia",
    difficulty: "Fácil",
    supportTexts: [
      {
        id: "st-110-1",
        title: "Influência Mundial",
        content: "O Brasil é um dos países que mais segue influenciadores no mundo, impactando decisões de compra.",
        icon: "public"
      },
      {
        id: "st-110-2",
        title: "Publicidade Velada",
        content: "A questão da publicidade não sinalizada e a responsabilidade ética dos criadores de conteúdo.",
        icon: "campaign"
      }
    ]
  },

  // --- EIXO 4: VIOLÊNCIA E SEGURANÇA ---
  {
    id: "t-136",
    title: "A violência contra a mulher e a eficácia das medidas protetivas",
    category: "Sociedade",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-136-1",
        title: "Feminicídio Persistente",
        content: "Mesmo com leis rígidas, o número de feminicídios continua alto, muitas vezes por falha na fiscalização das medidas.",
        icon: "security"
      },
      {
        id: "st-136-2",
        title: "Dependência",
        content: "A violência patrimonial e psicológica impede muitas mulheres de denunciarem seus agressores.",
        icon: "female"
      }
    ]
  },
  {
    id: "t-137",
    title: "A letalidade policial e o racismo na segurança",
    category: "Sociedade",
    difficulty: "Difícil",
    supportTexts: [
      {
        id: "st-137-1",
        title: "Perfil do Morto",
        content: "Jovens negros de periferia são a maioria absoluta das vítimas em intervenções policiais.",
        icon: "local_police"
      },
      {
        id: "st-137-2",
        title: "Tecnologia de Controle",
        content: "Câmeras corporais nas fardas têm se mostrado eficazes para reduzir a violência policial e proteger o bom policial.",
        icon: "videocam"
      }
    ]
  },
  {
    id: "t-138",
    title: "O sistema carcerário: falência da ressocialização?",
    category: "Sociedade",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-138-1",
        title: "Escola do Crime",
        content: "A superlotação e o domínio de facções transformam presídios em locais de recrutamento criminoso, não de recuperação.",
        icon: "prison"
      },
      {
        id: "st-138-2",
        title: "Estigma",
        content: "A falta de oportunidades de emprego para ex-detentos favorece a reincidência criminal.",
        icon: "menu_book"
      }
    ]
  },
  {
    id: "t-139",
    title: "O desaparecimento de pessoas no Brasil",
    category: "Sociedade",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-139-1",
        title: "Dados Alarmantes",
        content: "Milhares de desaparecimentos anuais e a falta de integração dos bancos de dados estaduais.",
        icon: "person_search"
      },
      {
        id: "st-139-2",
        title: "Morte sem Corpo",
        content: "O sofrimento das famílias que vivem a angústia da incerteza e a ausência de um luto formal.",
        icon: "sentiment_dissatisfied"
      }
    ]
  },
  {
    id: "t-140",
    title: "A violência nas escolas e a cultura de paz",
    category: "Educação",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-140-1",
        title: "Extremismo Online",
        content: "Ataques a escolas muitas vezes são planejados em fóruns de internet que incentivam o ódio e a misoginia.",
        icon: "school"
      },
      {
        id: "st-140-2",
        title: "Acolhimento",
        content: "A resposta não deve ser apenas policialesca, mas focar em psicólogos escolares e mediação de conflitos.",
        icon: "health_and_safety"
      }
    ]
  },
  {
    id: "t-141",
    title: "O porte de armas e a defesa pessoal",
    category: "Sociedade",
    difficulty: "Difícil",
    supportTexts: [
      {
        id: "st-141-1",
        title: "Armas em Circulação",
        content: "Estatísticas correlacionando o aumento de armas de fogo (CACs) com o aumento de feminicídios e acidentes.",
        icon: "dangerous"
      },
      {
        id: "st-141-2",
        title: "Dever do Estado",
        content: "Argumentos sobre o direito à legítima defesa versus o dever do Estado de garantir a segurança pública.",
        icon: "shield"
      }
    ]
  },
  {
    id: "t-142",
    title: "O tráfico de drogas e o domínio territorial",
    category: "Sociedade",
    difficulty: "Difícil",
    supportTexts: [
      {
        id: "st-142-1",
        title: "Estado Paralelo",
        content: "O impacto das facções na vida cotidiana das comunidades, impondo toques de recolher e monopólios.",
        icon: "map"
      },
      {
        id: "st-142-2",
        title: "Guerra às Drogas",
        content: "A discussão sobre a política de confronto e suas consequências sociais versus modelos de descriminalização.",
        icon: "gavel"
      }
    ]
  },
  {
    id: "t-143",
    title: "A violência contra a população LGBTQIA+",
    category: "Sociedade",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-143-1",
        title: "Triste Liderança",
        content: "O Brasil continua sendo um dos países que mais mata pessoas trans no mundo, reflexo de uma intolerância enraizada.",
        icon: "flag"
      },
      {
        id: "st-143-2",
        title: "Avanço Legal",
        content: "A criminalização da homofobia pelo STF foi um passo importante, mas a mudança cultural é lenta.",
        icon: "gavel"
      }
    ]
  },
  {
    id: "t-144",
    title: "A violência no trânsito e a impunidade",
    category: "Sociedade",
    difficulty: "Fácil",
    supportTexts: [
      {
        id: "st-144-1",
        title: "Mortes Evitáveis",
        content: "O alto número de mortes no trânsito brasileiro, muitas vezes associado ao álcool e uso de celular.",
        icon: "car_crash"
      },
      {
        id: "st-144-2",
        title: "Educação",
        content: "A educação para o trânsito como ferramenta essencial de mudança comportamental a longo prazo.",
        icon: "traffic"
      }
    ]
  },
  {
    id: "t-145",
    title: "A exploração sexual de crianças e adolescentes",
    category: "Sociedade",
    difficulty: "Difícil",
    supportTexts: [
      {
        id: "st-145-1",
        title: "Dentro de Casa",
        content: "Dados do Disque 100 mostram que a maioria dos abusadores são familiares ou conhecidos da vítima.",
        icon: "home_filled"
      },
      {
        id: "st-145-2",
        title: "Papel da Escola",
        content: "A importância da escola na identificação de sinais de abuso e na proteção da criança ('Maio Laranja').",
        icon: "school"
      }
    ]
  },

  // --- EIXO 5: SAÚDE E DEMOGRAFIA ---
  {
    id: "t-166",
    title: "A saúde mental e o aumento da ansiedade entre jovens",
    category: "Saúde",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-166-1",
        title: "Epidemia de Ansiedade",
        content: "O Brasil lidera rankings de ansiedade. Jovens sofrem com a pressão por sucesso e a incerteza do futuro.",
        icon: "sentiment_dissatisfied"
      },
      {
        id: "st-166-2",
        title: "Redes Sociais",
        content: "A comparação constante com vidas 'perfeitas' no Instagram e TikTok gera frustração e depressão.",
        icon: "notifications_active"
      }
    ]
  },
  {
    id: "t-167",
    title: "O envelhecimento populacional e os desafios do cuidado",
    category: "Sociedade",
    difficulty: "Fácil",
    supportTexts: [
      {
        id: "st-167-1",
        title: "Inversão da Pirâmide",
        content: "O Brasil envelhece rapidamente antes de enriquecer, pressionando o sistema previdenciário e de saúde.",
        icon: "elderly"
      },
      {
        id: "st-167-2",
        title: "Economia do Cuidado",
        content: "Quem cuidará dos idosos? A responsabilidade recai desproporcionalmente sobre as mulheres da família.",
        icon: "work_off"
      }
    ]
  },
  {
    id: "t-168",
    title: "A vacinação e o movimento antivacina",
    category: "Saúde",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-168-1",
        title: "Memória Curta",
        content: "O sucesso das vacinas fez as pessoas esquecerem a gravidade de doenças como pólio e sarampo.",
        icon: "vaccines"
      },
      {
        id: "st-168-2",
        title: "Fake News",
        content: "Teorias da conspiração minam a confiança na ciência e nas instituições de saúde pública.",
        icon: "campaign"
      }
    ]
  },
  {
    id: "t-169",
    title: "A obesidade como epidemia silenciosa",
    category: "Saúde",
    difficulty: "Fácil",
    supportTexts: [
      {
        id: "st-169-1",
        title: "Ultraprocessados",
        content: "O consumo excessivo de alimentos industrializados baratos é o principal motor da obesidade no Brasil.",
        icon: "fastfood"
      },
      {
        id: "st-169-2",
        title: "Informação Clara",
        content: "A nova rotulagem nutricional (lupas frontais) visa alertar o consumidor sobre excesso de açúcar e sódio.",
        icon: "info"
      }
    ]
  },
  {
    id: "t-170",
    title: "A doação de órgãos e a negativa familiar",
    category: "Saúde",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-170-1",
        title: "Fila de Espera",
        content: "O Brasil tem um grande sistema público de transplantes, mas a fila é grande devido à recusa familiar após a morte.",
        icon: "favorite"
      },
      {
        id: "st-170-2",
        title: "Conscientização",
        content: "A importância de comunicar o desejo de ser doador em vida para a família.",
        icon: "record_voice_over"
      }
    ]
  },
  {
    id: "t-171",
    title: "As arboviroses (Dengue) e o saneamento",
    category: "Saúde",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-171-1",
        title: "Crise Urbana",
        content: "A explosão de casos de Dengue reflete o crescimento desordenado das cidades e o acúmulo de lixo.",
        icon: "pest_control"
      },
      {
        id: "st-171-2",
        title: "Fator Climático",
        content: "O aquecimento global expande a área de atuação do mosquito Aedes aegypti para novas regiões.",
        icon: "thermostat"
      }
    ]
  },
  {
    id: "t-172",
    title: "O suicídio e a valorização da vida",
    category: "Saúde",
    difficulty: "Difícil",
    supportTexts: [
      {
        id: "st-172-1",
        title: "Jovens em Risco",
        content: "Dados sobre o aumento de suicídios entre jovens, sendo a segunda maior causa de morte nessa faixa etária.",
        icon: "heart_broken"
      },
      {
        id: "st-172-2",
        title: "Rede de Apoio",
        content: "A importância de serviços como o CVV e CAPS e a quebra do tabu em falar sobre o tema.",
        icon: "support_agent"
      }
    ]
  },
  {
    id: "t-173",
    title: "A saúde da população negra",
    category: "Saúde",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-173-1",
        title: "Desigualdade",
        content: "Indicadores mostram que negros morrem mais de causas evitáveis e têm pior acesso ao pré-natal.",
        icon: "bar_chart"
      },
      {
        id: "st-173-2",
        title: "Política Nacional",
        content: "A necessidade de combater o racismo institucional dentro do SUS para garantir atendimento equitativo.",
        icon: "policy"
      }
    ]
  },

  // --- EIXO 6: EDUCAÇÃO E CULTURA ---
  {
    id: "t-186",
    title: "A evasão escolar no Ensino Médio",
    category: "Educação",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-186-1",
        title: "Necessidade de Renda",
        content: "Muitos jovens abandonam a escola para trabalhar e ajudar no sustento da família.",
        icon: "person_off"
      },
      {
        id: "st-186-2",
        title: "Reforma do Ensino",
        content: "O Novo Ensino Médio busca tornar a escola mais atrativa, mas enfrenta críticas sobre a infraestrutura real.",
        icon: "savings"
      }
    ]
  },
  {
    id: "t-187",
    title: "A valorização do professor",
    category: "Educação",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-187-1",
        title: "Desestímulo",
        content: "Baixos salários, violência em sala e excesso de burocracia afastam jovens da carreira docente.",
        icon: "payments"
      },
      {
        id: "st-187-2",
        title: "Futuro em Risco",
        content: "Projeções indicam um 'apagão' de professores em disciplinas exatas nos próximos anos.",
        icon: "warning"
      }
    ]
  },
  {
    id: "t-188",
    title: "A educação financeira nas escolas",
    category: "Educação",
    difficulty: "Fácil",
    supportTexts: [
      {
        id: "st-188-1",
        title: "Jovens Endividados",
        content: "O alto nível de endividamento dos jovens adultos reflete a falta de preparo para lidar com crédito e juros.",
        icon: "credit_score"
      },
      {
        id: "st-188-2",
        title: "BNCC",
        content: "A inclusão da educação financeira na Base Nacional Comum Curricular como competência transversal.",
        icon: "school"
      }
    ]
  },
  {
    id: "t-189",
    title: "O bullying e a convivência escolar",
    category: "Educação",
    difficulty: "Fácil",
    supportTexts: [
      {
        id: "st-189-1",
        title: "Cicatrizes Invisíveis",
        content: "O bullying causa danos psicológicos duradouros, levando à depressão e evasão escolar.",
        icon: "gavel"
      },
      {
        id: "st-189-2",
        title: "Escola Cidadã",
        content: "A escola deve ser um espaço de aprendizado socioemocional, ensinando respeito e empatia.",
        icon: "handshake"
      }
    ]
  },
  {
    id: "t-190",
    title: "A preservação do patrimônio histórico",
    category: "Cultura",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-190-1",
        title: "Memória em Chamas",
        content: "Casos como o incêndio do Museu Nacional revelam o descaso com a manutenção da nossa história.",
        icon: "museum"
      },
      {
        id: "st-190-2",
        title: "Identidade",
        content: "A importância da memória preservada para a construção da identidade nacional e fomento do turismo.",
        icon: "history_edu"
      }
    ]
  },
  {
    id: "t-191",
    title: "O esporte como ferramenta de inclusão",
    category: "Cultura",
    difficulty: "Fácil",
    supportTexts: [
      {
        id: "st-191-1",
        title: "Superação",
        content: "Histórias de atletas olímpicos vindos de projetos sociais mostram o poder transformador do esporte.",
        icon: "sports_soccer"
      },
      {
        id: "st-191-2",
        title: "Disciplina",
        content: "O esporte escolar afasta jovens da criminalidade e ensina valores como disciplina e trabalho em equipe.",
        icon: "group"
      }
    ]
  },
  {
    id: "t-192",
    title: "A leitura no Brasil",
    category: "Cultura",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-192-1",
        title: "Retratos da Leitura",
        content: "Pesquisas mostram queda no número de leitores e o fechamento de livrarias físicas.",
        icon: "menu_book"
      },
      {
        id: "st-192-2",
        title: "Direito Humano",
        content: "A literatura como direito fundamental para a humanização e desenvolvimento crítico do cidadão.",
        icon: "auto_stories"
      }
    ]
  },
  {
    id: "t-193",
    title: "A educação inclusiva (PCDs)",
    category: "Educação",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-193-1",
        title: "Acesso Ampliado",
        content: "O aumento de matrículas de alunos com deficiência em classes regulares é uma vitória da inclusão.",
        icon: "accessible"
      },
      {
        id: "st-193-2",
        title: "Desafio Real",
        content: "A falta de preparo dos professores e de infraestrutura adequada ainda é barreira para a inclusão efetiva.",
        icon: "engineering"
      }
    ]
  },
  {
    id: "t-194",
    title: "A valorização da história e cultura africana",
    category: "Cultura",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-194-1",
        title: "Lei Não Cumprida",
        content: "A lei que obriga o ensino de história da África e cultura afro-brasileira ainda enfrenta resistência.",
        icon: "auto_stories"
      },
      {
        id: "st-194-2",
        title: "Identidade",
        content: "Conhecer a história negra é fundamental para a construção da autoestima de estudantes e combate ao racismo.",
        icon: "diversity_3"
      }
    ]
  },
  {
    id: "t-195",
    title: "A democratização do acesso à universidade",
    category: "Educação",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-195-1",
        title: "Lei de Cotas",
        content: "As cotas raciais e sociais transformaram o perfil da universidade brasileira, tornando-a mais plural.",
        icon: "school"
      },
      {
        id: "st-195-2",
        title: "Permanência",
        content: "O desafio atual é garantir que o aluno cotista consiga se manter financeiramente durante o curso.",
        icon: "home"
      }
    ]
  },
  {
    id: "t-196",
    title: "A importância da educação artística e criatividade",
    category: "Educação",
    difficulty: "Fácil",
    supportTexts: [
      {
        id: "st-196-1",
        title: "Pensamento Crítico",
        content: "A arte na escola desenvolve a sensibilidade e a capacidade de interpretar o mundo de formas não lineares.",
        icon: "palette"
      },
      {
        id: "st-196-2",
        title: "Marginalização",
        content: "A disciplina de artes é frequentemente desvalorizada em comparação com exatas e biológicas.",
        icon: "brush"
      }
    ]
  },
  {
    id: "t-197",
    title: "O ensino técnico e a qualificação profissional",
    category: "Educação",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-197-1",
        title: "Empregabilidade",
        content: "O ensino técnico oferece inserção rápida no mercado de trabalho, vital em tempos de desemprego.",
        icon: "engineering"
      },
      {
        id: "st-197-2",
        title: "Preconceito",
        content: "A visão equivocada de que o ensino técnico é 'inferior' à universidade precisa ser combatida.",
        icon: "school"
      }
    ]
  },
  {
    id: "t-198",
    title: "A alfabetização na idade certa",
    category: "Educação",
    difficulty: "Difícil",
    supportTexts: [
      {
        id: "st-198-1",
        title: "Base de Tudo",
        content: "Crianças que não se alfabetizam até o 2º ano do fundamental acumulam déficits de aprendizado irreversíveis.",
        icon: "abc"
      },
      {
        id: "st-198-2",
        title: "Efeito Pandemia",
        content: "O fechamento das escolas na pandemia agravou drasticamente os índices de analfabetismo infantil.",
        icon: "sentiment_dissatisfied"
      }
    ]
  },
  {
    id: "t-199",
    title: "A militarização das escolas públicas: debate",
    category: "Educação",
    difficulty: "Difícil",
    supportTexts: [
      {
        id: "st-199-1",
        title: "Disciplina",
        content: "Defensores argumentam que a gestão militar traz segurança e melhora o desempenho acadêmico.",
        icon: "shield"
      },
      {
        id: "st-199-2",
        title: "Liberdade",
        content: "Críticos apontam que o modelo pode inibir o pensamento crítico e a diversidade cultural no ambiente escolar.",
        icon: "lock"
      }
    ]
  },
  {
    id: "t-200",
    title: "A ciência e o combate ao negacionismo na escola",
    category: "Educação",
    difficulty: "Médio",
    supportTexts: [
      {
        id: "st-200-1",
        title: "Letramento Científico",
        content: "A escola deve ensinar não apenas fatos, mas o método científico para vacinar jovens contra fake news.",
        icon: "science"
      },
      {
        id: "st-200-2",
        title: "Terraplanismo",
        content: "O crescimento de teorias conspiratórias absurdas revela falhas na educação básica de ciências.",
        icon: "public_off"
      }
    ]
  },

  // --- TEMAS HISTÓRICOS SELECIONADOS ---
  {
    id: "th-1",
    title: "Caminhos para combater a intolerância religiosa (2016)",
    category: "Cultura",
    difficulty: "Médio",
    supportTexts: [
      { id: "sth-1-1", title: "Disque 100", content: "Religiões de matriz africana são as maiores vítimas de ataques e depredações.", icon: "temple_buddhist" },
      { id: "sth-1-2", title: "Estado Laico", content: "A laicidade do Estado garante a liberdade de crença e a proteção de todas as fés.", icon: "book" }
    ]
  },
  {
    id: "th-2",
    title: "Manipulação do comportamento pelo controle de dados (2018)",
    category: "Tecnologia",
    difficulty: "Difícil",
    supportTexts: [
      { id: "sth-2-1", title: "Bolhas Sociais", content: "Algoritmos filtram o que vemos, criando bolhas que reforçam opiniões e radicalizam.", icon: "bubble_chart" },
      { id: "sth-2-2", title: "Privacidade", content: "Nossos dados de navegação são vendidos para influenciar desde compras até votos.", icon: "ads_click" }
    ]
  },
  {
    id: "th-3",
    title: "Democratização do acesso ao cinema (2019)",
    category: "Cultura",
    difficulty: "Fácil",
    supportTexts: [
      { id: "sth-3-1", title: "Concentração", content: "A maioria das salas de cinema está em shoppings de grandes cidades, excluindo o interior.", icon: "movie" },
      { id: "sth-3-2", title: "Cultura é Direito", content: "O acesso à arte não é luxo, mas um direito constitucional de formação cidadã.", icon: "theaters" }
    ]
  },
  {
    id: "th-4",
    title: "O estigma associado às doenças mentais (2020)",
    category: "Saúde",
    difficulty: "Médio",
    supportTexts: [
      { id: "sth-4-1", title: "Psicofobia", content: "O preconceito faz com que muitas pessoas escondam seu sofrimento e evitem tratamento.", icon: "psychology" },
      { id: "sth-4-2", title: "Incapacidade", content: "A depressão é a principal causa de incapacidade laboral no mundo, segundo a OMS.", icon: "medical_services" }
    ]
  },
  {
    id: "th-5",
    title: "Invisibilidade e registro civil (2021)",
    category: "Sociedade",
    difficulty: "Médio",
    supportTexts: [
      { id: "sth-5-1", title: "Sem Nome", content: "Milhares de brasileiros não existem para o Estado por falta de certidão de nascimento.", icon: "badge" },
      { id: "sth-5-2", title: "Acesso Bloqueado", content: "Sem documentos, é impossível se vacinar, matricular na escola ou receber benefícios.", icon: "fingerprint" }
    ]
  },

  // --- NOVOS TEMAS INÉDITOS E ATUAIS (201-240) ---
  {
    id: "t-201",
    title: "O desafio da inclusão de neurodivergentes (Autismo/TDAH) no mercado de trabalho",
    category: "Sociedade",
    difficulty: "Difícil",
    supportTexts: [
      { id: "st-201-1", title: "Desemprego", content: "Estudos apontam que até 85% dos adultos autistas estão desempregados ou subempregados, apesar de suas qualificações.", icon: "work_off" },
      { id: "st-201-2", title: "Adaptação", content: "A inclusão real exige adaptação do ambiente sensorial e da comunicação nas empresas, não apenas cotas.", icon: "hearing" }
    ]
  },
  {
    id: "t-202",
    title: "A romantização do 'burnout' e a cultura da exaustão",
    category: "Saúde",
    difficulty: "Médio",
    supportTexts: [
      { id: "st-202-1", title: "Produtividade Tóxica", content: "A ideia de 'trabalhe enquanto eles dormem' gera uma geração de jovens exaustos e doentes.", icon: "battery_alert" },
      { id: "st-202-2", title: "Doença Ocupacional", content: "O Burnout foi oficializado pela OMS como síndrome resultante de estresse crônico no trabalho.", icon: "medication" }
    ]
  },
  {
    id: "t-203",
    title: "O impacto das 'Deepfakes' na integridade da democracia",
    category: "Tecnologia",
    difficulty: "Difícil",
    supportTexts: [
      { id: "st-203-1", title: "Verdade em Xeque", content: "Vídeos falsos hiper-realistas podem destruir reputações e manipular eleições antes que sejam desmentidos.", icon: "videocam_off" },
      { id: "st-203-2", title: "Regulação", content: "O desafio jurídico de punir criadores de conteúdo sintético sem ferir a liberdade de expressão.", icon: "gavel" }
    ]
  },
  {
    id: "t-204",
    title: "A crise humanitária Yanomami e o garimpo ilegal",
    category: "Meio Ambiente",
    difficulty: "Médio",
    supportTexts: [
      { id: "st-204-1", title: "Contaminação", content: "O uso de mercúrio no garimpo envenena rios e peixes, base da alimentação indígena.", icon: "water_drop" },
      { id: "st-204-2", title: "Soberania", content: "A invasão de terras demarcadas fere a Constituição e ameaça a sobrevivência física e cultural dos povos.", icon: "forest" }
    ]
  },
  {
    id: "t-205",
    title: "O abandono afetivo inverso e a solidão dos idosos",
    category: "Sociedade",
    difficulty: "Fácil",
    supportTexts: [
      { id: "st-205-1", title: "Dever de Cuidado", content: "A Constituição estabelece que os filhos maiores têm o dever de ajudar e amparar os pais na velhice.", icon: "family_restroom" },
      { id: "st-205-2", title: "Asilos Lotados", content: "O aumento da institucionalização de idosos reflete a falta de tempo e estrutura das famílias modernas.", icon: "home" }
    ]
  },
  {
    id: "t-206",
    title: "A pornografia de vingança e a violência digital contra a mulher",
    category: "Sociedade",
    difficulty: "Médio",
    supportTexts: [
      { id: "st-206-1", title: "Vazamento Íntimo", content: "A divulgação não consentida de imagens íntimas visa humilhar a vítima e perpetuar o controle machista.", icon: "smartphone" },
      { id: "st-206-2", title: "Lei Rose Leonel", content: "Legislação brasileira tipifica a prática como crime, mas a remoção do conteúdo da rede ainda é lenta.", icon: "lock" }
    ]
  },
  {
    id: "t-207",
    title: "A 'fuga de cérebros' (Brain Drain) e o impacto na ciência nacional",
    category: "Educação",
    difficulty: "Difícil",
    supportTexts: [
      { id: "st-207-1", title: "Investimento Perdido", content: "O Brasil investe na formação de doutores que acabam emigrando por falta de bolsas e laboratórios.", icon: "flight_takeoff" },
      { id: "st-207-2", title: "Soberania Tecnológica", content: "Sem cientistas de ponta, o país se torna dependente de tecnologia estrangeira para vacinas e inovação.", icon: "science" }
    ]
  },
  {
    id: "t-208",
    title: "O crescimento de grupos neonazistas e o discurso de ódio online",
    category: "Sociedade",
    difficulty: "Difícil",
    supportTexts: [
      { id: "st-208-1", title: "Submundo da Web", content: "Fóruns anônimos (chans) servem de incubadoras para ideologias extremistas e recrutamento de jovens.", icon: "computer" },
      { id: "st-208-2", title: "Lei Antirracismo", content: "A apologia ao nazismo é crime no Brasil, mas a fiscalização no ambiente digital é complexa.", icon: "policy" }
    ]
  },
  {
    id: "t-209",
    title: "A gordofobia médica e o acesso à saúde",
    category: "Saúde",
    difficulty: "Médio",
    supportTexts: [
      { id: "st-209-1", title: "Diagnóstico Enviesado", content: "Pacientes obesos relatam que médicos atribuem qualquer sintoma ao peso, negligenciando outras doenças.", icon: "medical_services" },
      { id: "st-209-2", title: "Infraestrutura", content: "Falta de macas e equipamentos adequados em hospitais humilha e exclui pacientes gordos.", icon: "chair" }
    ]
  },
  {
    id: "t-210",
    title: "A licença-paternidade estendida e a equidade de gênero",
    category: "Sociedade",
    difficulty: "Médio",
    supportTexts: [
      { id: "st-210-1", title: "Paternidade Ativa", content: "A licença de apenas 5 dias reforça a ideia de que o cuidado é tarefa exclusiva da mãe.", icon: "baby_changing_station" },
      { id: "st-210-2", title: "Mercado de Trabalho", content: "Igualar as licenças reduziria a discriminação na contratação de mulheres em idade fértil.", icon: "work" }
    ]
  },
  {
    id: "t-211",
    title: "O homeschooling (educação domiciliar) e a socialização",
    category: "Educação",
    difficulty: "Difícil",
    supportTexts: [
      { id: "st-211-1", title: "Bolha Social", content: "Críticos argumentam que a escola é vital para conviver com a diversidade e opiniões contrárias.", icon: "bubble_chart" },
      { id: "st-211-2", title: "Controle Parental", content: "Defensores alegam o direito da família de decidir a moral e o método pedagógico dos filhos.", icon: "home" }
    ]
  },
  {
    id: "t-212",
    title: "A influência dos 'Coachs' e a promessa de sucesso fácil",
    category: "Sociedade",
    difficulty: "Fácil",
    supportTexts: [
      { id: "st-212-1", title: "Venda de Ilusões", content: "A internet está cheia de promessas de riqueza rápida que exploram a vulnerabilidade emocional das pessoas.", icon: "attach_money" },
      { id: "st-212-2", title: "Saúde Mental", content: "A mensagem de que 'basta querer' gera culpa e frustração em quem não alcança o sucesso inatingível.", icon: "mood_bad" }
    ]
  },
  {
    id: "t-213",
    title: "A solidão da mulher negra e o mercado afetivo",
    category: "Sociedade",
    difficulty: "Difícil",
    supportTexts: [
      { id: "st-213-1", title: "Estatísticas", content: "Mulheres negras são as que menos se casam e as que mais chefiam famílias sozinhas no Brasil.", icon: "diversity_1" },
      { id: "st-213-2", title: "Preterimento", content: "O racismo estrutural influencia os padrões de beleza e escolha afetiva, invisibilizando a mulher negra.", icon: "favorite_border" }
    ]
  },
  {
    id: "t-214",
    title: "O etarismo na indústria da tecnologia",
    category: "Tecnologia",
    difficulty: "Médio",
    supportTexts: [
      { id: "st-214-1", title: "Culto à Juventude", content: "O Vale do Silício e startups valorizam a juventude, descartando a experiência de profissionais 50+.", icon: "developer_mode" },
      { id: "st-214-2", title: "Diversidade", content: "Equipes multigeracionais tendem a criar produtos mais inclusivos e robustos.", icon: "groups" }
    ]
  },
  {
    id: "t-215",
    title: "A violência obstétrica e o parto humanizado",
    category: "Saúde",
    difficulty: "Médio",
    supportTexts: [
      { id: "st-215-1", title: "Desrespeito", content: "Procedimentos dolorosos sem consentimento e xingamentos durante o parto são realidades comuns no SUS.", icon: "pregnant_woman" },
      { id: "st-215-2", title: "Episiotomia", content: "O corte no períneo, muitas vezes desnecessário, é um exemplo de intervenção médica abusiva.", icon: "healing" }
    ]
  },
  {
    id: "t-216",
    title: "A democratização do acesso a museus e bens culturais",
    category: "Cultura",
    difficulty: "Fácil",
    supportTexts: [
      { id: "st-216-1", title: "Elitização", content: "Muitos brasileiros nunca entraram em um museu por sentirem que aquele espaço 'não é para eles'.", icon: "museum" },
      { id: "st-216-2", title: "Gratuidade", content: "Políticas de entrada franca e exposições itinerantes são essenciais para formar novos públicos.", icon: "confirmation_number" }
    ]
  },
  {
    id: "t-217",
    title: "O impacto dos cigarros eletrônicos (vape) na juventude",
    category: "Saúde",
    difficulty: "Médio",
    supportTexts: [
      { id: "st-217-1", title: "Falsa Segurança", content: "Vendidos como menos nocivos, os vapes contêm altas doses de nicotina e causam novas doenças pulmonares.", icon: "smoking_rooms" },
      { id: "st-217-2", title: "Marketing", content: "Sabores doces e design tecnológico são estratégias da indústria para viciar uma nova geração.", icon: "candy" }
    ]
  },
  {
    id: "t-218",
    title: "A poluição luminosa e o impacto na biodiversidade",
    category: "Meio Ambiente",
    difficulty: "Difícil",
    supportTexts: [
      { id: "st-218-1", title: "Ciclo Circadiano", content: "O excesso de luz artificial à noite afeta o sono humano e desorienta animais migratórios.", icon: "lightbulb" },
      { id: "st-218-2", title: "Eficiência", content: "Iluminação pública mal planejada desperdiça energia e apaga as estrelas do céu urbano.", icon: "star_border" }
    ]
  },
  {
    id: "t-219",
    title: "A insegurança alimentar em estudantes universitários",
    category: "Educação",
    difficulty: "Médio",
    supportTexts: [
      { id: "st-219-1", title: "Fome no Campus", content: "Estudantes cotistas muitas vezes precisam escolher entre xerox e almoço devido ao baixo valor das bolsas.", icon: "restaurant_menu" },
      { id: "st-219-2", title: "Restaurante Universitário", content: "O 'Bandeijão' é a principal política de permanência estudantil para garantir nutrição adequada.", icon: "local_dining" }
    ]
  },
  {
    id: "t-220",
    title: "A representatividade PcD na política brasileira",
    category: "Política",
    difficulty: "Médio",
    supportTexts: [
      { id: "st-220-1", title: "Nada Sobre Nós", content: "O lema 'Nada sobre nós sem nós' reivindica que pessoas com deficiência participem das decisões que as afetam.", icon: "accessible" },
      { id: "st-220-2", title: "Acessibilidade", content: "Câmaras e assembleias muitas vezes não têm estrutura física para receber parlamentares cadeirantes.", icon: "stairs" }
    ]
  },
  {
    id: "t-221",
    title: "O descarte têxtil e o impacto da Fast Fashion",
    category: "Meio Ambiente",
    difficulty: "Fácil",
    supportTexts: [
      { id: "st-221-1", title: "Deserto do Atacama", content: "Montanhas de roupas não vendidas são descartadas em desertos, demorando séculos para decompor.", icon: "checkroom" },
      { id: "st-221-2", title: "Microplásticos", content: "Roupas sintéticas liberam microplásticos na lavagem, contaminando os oceanos.", icon: "local_laundry_service" }
    ]
  },
  {
    id: "t-222",
    title: "O ChatGPT e a questão da autoria literária",
    category: "Tecnologia",
    difficulty: "Médio",
    supportTexts: [
      { id: "st-222-1", title: "Direitos Autorais", content: "A IA é treinada com milhões de textos humanos sem permissão, gerando debate sobre propriedade intelectual.", icon: "copyright" },
      { id: "st-222-2", title: "Criatividade", content: "A máquina cria ou apenas combina estatisticamente o que já existe? O valor da arte humana em xeque.", icon: "brush" }
    ]
  },
  {
    id: "t-223",
    title: "A 'Geração Sanduíche' e a sobrecarga de cuidado",
    category: "Sociedade",
    difficulty: "Médio",
    supportTexts: [
      { id: "st-223-1", title: "Dupla Jornada", content: "Adultos que cuidam simultaneamente de filhos pequenos e pais idosos, sofrendo pressão financeira e emocional.", icon: "family_restroom" },
      { id: "st-223-2", title: "Saúde Mental", content: "O estresse crônico dessa geração afeta desproporcionalmente as mulheres, principais cuidadoras.", icon: "spa" }
    ]
  },
  {
    id: "t-224",
    title: "A crise de masculinidade e os grupos extremistas",
    category: "Sociedade",
    difficulty: "Difícil",
    supportTexts: [
      { id: "st-224-1", title: "Red Pill", content: "O crescimento de comunidades online que pregam misoginia como resposta ao avanço dos direitos femininos.", icon: "man" },
      { id: "st-224-2", title: "Saúde Emocional", content: "A repressão de sentimentos ('homem não chora') contribui para altas taxas de suicídio masculino.", icon: "sentiment_very_dissatisfied" }
    ]
  },
  {
    id: "t-225",
    title: "O turismo predatório em áreas de preservação",
    category: "Meio Ambiente",
    difficulty: "Fácil",
    supportTexts: [
      { id: "st-225-1", title: "Impacto Local", content: "O excesso de visitantes degrada trilhas, espanta a fauna e gera lixo em santuários ecológicos.", icon: "hiking" },
      { id: "st-225-2", title: "Consciência", content: "O desafio de equilibrar a renda do turismo com a capacidade de carga dos ecossistemas.", icon: "nature_people" }
    ]
  },
  {
    id: "t-226",
    title: "A dificuldade de adoção tardia no Brasil",
    category: "Sociedade",
    difficulty: "Médio",
    supportTexts: [
      { id: "st-226-1", title: "Perfil Buscado", content: "A maioria dos pretendentes busca bebês brancos, enquanto os abrigos estão cheios de crianças negras e adolescentes.", icon: "face" },
      { id: "st-226-2", title: "Conta que não fecha", content: "A exigência por um perfil específico faz com que crianças passem a infância inteira institucionalizadas.", icon: "calculate" }
    ]
  },
  {
    id: "t-227",
    title: "O bullying estético e a pressão por cirurgias em jovens",
    category: "Saúde",
    difficulty: "Fácil",
    supportTexts: [
      { id: "st-227-1", title: "Harmonização", content: "Jovens buscam procedimentos estéticos cada vez mais cedo para se parecerem com filtros de Instagram.", icon: "face_retouching_natural" },
      { id: "st-227-2", title: "Dismofia", content: "O transtorno dismórfico corporal leva à obsessão por defeitos imaginários e cirurgias desnecessárias.", icon: "mirror" }
    ]
  },
  {
    id: "t-228",
    title: "A barreira linguística no acesso de imigrantes ao SUS",
    category: "Saúde",
    difficulty: "Difícil",
    supportTexts: [
      { id: "st-228-1", title: "Comunicação", content: "Médicos têm dificuldade em atender refugiados que não falam português, gerando diagnósticos errados.", icon: "translate" },
      { id: "st-228-2", title: "Direito Universal", content: "O SUS é para todos, mas a falta de intérpretes cria uma barreira prática de acesso.", icon: "local_hospital" }
    ]
  },
  {
    id: "t-229",
    title: "A uberização da medicina e a relação médico-paciente",
    category: "Saúde",
    difficulty: "Difícil",
    supportTexts: [
      { id: "st-229-1", title: "Telemedicina de Massa", content: "Plataformas de consultas rápidas e baratas podem mercantilizar a saúde e reduzir a qualidade do diagnóstico.", icon: "monitor_heart" },
      { id: "st-229-2", title: "Vínculo", content: "A confiança e o conhecimento do histórico do paciente se perdem em atendimentos rotativos por app.", icon: "handshake" }
    ]
  },
  {
    id: "t-230",
    title: "O papel das bibliotecas comunitárias nas periferias",
    category: "Cultura",
    difficulty: "Fácil",
    supportTexts: [
      { id: "st-230-1", title: "Resistência", content: "Em locais onde o Estado não chega, bibliotecas geridas pela comunidade promovem leitura e eventos culturais.", icon: "local_library" },
      { id: "st-230-2", title: "Formação", content: "Esses espaços funcionam como centros de cidadania, oferecendo internet e apoio escolar.", icon: "school" }
    ]
  },
  {
    id: "t-231",
    title: "A crise dos fertilizantes e a soberania alimentar",
    category: "Economia",
    difficulty: "Difícil",
    supportTexts: [
      { id: "st-231-1", title: "Dependência Externa", content: "O agronegócio brasileiro depende da importação de fertilizantes, ficando vulnerável a guerras e preços globais.", icon: "agriculture" },
      { id: "st-231-2", title: "Bioinsumos", content: "O investimento em tecnologia nacional de biofertilizantes é questão de segurança nacional.", icon: "science" }
    ]
  },
  {
    id: "t-232",
    title: "A obsolescência das profissões tradicionais pela IA",
    category: "Economia",
    difficulty: "Médio",
    supportTexts: [
      { id: "st-232-1", title: "Automação Cognitiva", content: "Diferente da revolução industrial, a IA agora ameaça empregos intelectuais (advogados, designers, redatores).", icon: "smart_toy" },
      { id: "st-232-2", title: "Renda Básica", content: "O debate sobre a necessidade de uma renda básica universal em um futuro com menos emprego.", icon: "payments" }
    ]
  },
  {
    id: "t-233",
    title: "O racismo algorítmico em processos de seleção de emprego",
    category: "Tecnologia",
    difficulty: "Difícil",
    supportTexts: [
      { id: "st-233-1", title: "Filtro Invisível", content: "Softwares de RH podem descartar automaticamente currículos de certas regiões ou com certos nomes.", icon: "person_search" },
      { id: "st-233-2", title: "Auditoria", content: "A necessidade de abrir a 'caixa preta' dos algoritmos para verificar critérios discriminatórios.", icon: "fact_check" }
    ]
  },
  {
    id: "t-234",
    title: "A preservação das línguas indígenas em risco de extinção",
    category: "Cultura",
    difficulty: "Médio",
    supportTexts: [
      { id: "st-234-1", title: "Morte Cultural", content: "Quando uma língua morre, perde-se todo um sistema de conhecimento sobre a natureza e o mundo.", icon: "record_voice_over" },
      { id: "st-234-2", title: "Década das Línguas", content: "A UNESCO declarou a Década das Línguas Indígenas para incentivar o registro e ensino desses idiomas.", icon: "public" }
    ]
  },
  {
    id: "t-235",
    title: "O sedentarismo infantil e o design das cidades",
    category: "Saúde",
    difficulty: "Fácil",
    supportTexts: [
      { id: "st-235-1", title: "Falta de Espaço", content: "Cidades sem calçadas seguras e parques impedem que crianças brinquem ao ar livre.", icon: "directions_run" },
      { id: "st-235-2", title: "Segurança", content: "O medo da violência urbana confina as crianças em apartamentos, aumentando o tempo de tela.", icon: "lock" }
    ]
  },
  {
    id: "t-236",
    title: "A ética no uso de animais para testes cosméticos",
    category: "Meio Ambiente",
    difficulty: "Fácil",
    supportTexts: [
      { id: "st-236-1", title: "Cruelty Free", content: "A pressão do consumidor tem forçado marcas a abandonarem testes em animais, buscando métodos alternativos.", icon: "pets" },
      { id: "st-236-2", title: "Legislação", content: "Vários países já proibiram a venda de cosméticos testados em animais, mas o Brasil avança lentamente.", icon: "gavel" }
    ]
  },
  {
    id: "t-237",
    title: "A dificuldade de acesso a medicamentos de alto custo",
    category: "Saúde",
    difficulty: "Difícil",
    supportTexts: [
      { id: "st-237-1", title: "Judicialização", content: "Pacientes recorrem à justiça para obrigar o Estado a fornecer remédios para doenças raras.", icon: "gavel" },
      { id: "st-237-2", title: "Orçamento", content: "O dilema ético de gastar milhões com um único paciente versus investir na atenção básica para todos.", icon: "attach_money" }
    ]
  },
  {
    id: "t-238",
    title: "A participação da mulher na ciência (Efeito Matilda)",
    category: "Sociedade",
    difficulty: "Médio",
    supportTexts: [
      { id: "st-238-1", title: "Invisibilidade", content: "Historicamente, descobertas feitas por mulheres foram atribuídas a colegas homens.", icon: "science" },
      { id: "st-238-2", title: "Teto de Vidro", content: "Mulheres são maioria na graduação, mas minoria nos cargos de chefia e bolsas de produtividade em pesquisa.", icon: "stairs" }
    ]
  },
  {
    id: "t-239",
    title: "O impacto da mineração em comunidades quilombolas",
    category: "Sociedade",
    difficulty: "Difícil",
    supportTexts: [
      { id: "st-239-1", title: "Território", content: "A sobreposição de interesses minerários em terras ancestrais gera conflitos e poluição.", icon: "terrain" },
      { id: "st-239-2", title: "Direito de Consulta", content: "A Convenção 169 da OIT exige que comunidades sejam consultadas antes de empreendimentos em suas terras.", icon: "hearing" }
    ]
  },
  {
    id: "t-240",
    title: "A importância do brincar livre para a saúde mental infantil",
    category: "Saúde",
    difficulty: "Fácil",
    supportTexts: [
      { id: "st-240-1", title: "Agenda Cheia", content: "Crianças com agendas de executivo (inglês, ballet, judô) não têm tempo para o ócio criativo.", icon: "schedule" },
      { id: "st-240-2", title: "Criatividade", content: "O brincar não estruturado é essencial para desenvolver a resolução de problemas e regulação emocional.", icon: "toys" }
    ]
  }
];
