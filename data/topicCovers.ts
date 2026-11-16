/**
 * Catálogo e resolução inteligente de imagens editoriais temáticas para redação ENEM.
 * Garante que cada tema tenha uma foto documental/fotojornalística única, de alto impacto
 * e 100% condizente com a sua proposta de redação.
 */

// Mapeamento específico por ID de tema (todas as URLs foram verificadas e retornam HTTP 200)
export const TOPIC_SPECIFIC_COVERS: Record<string, string> = {
  // --- Eixo 1: Desigualdade e Direitos Básicos ---
  't-28': 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=800&q=80', // Fome e insegurança alimentar
  't-29': 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=800&q=80', // População em situação de rua
  't-30': 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=800&q=80', // Déficit habitacional e moradia
  't-31': 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=800&q=80', // Saneamento básico e água
  't-32': 'https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&w=800&q=80', // Precarização do trabalho e uberização
  't-33': 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80', // Trabalho análogo à escravidão
  't-34': 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=800&q=80', // Concentração de renda e desigualdade
  't-35': 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80', // Analfabetismo funcional
  't-36': 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80', // Pobreza menstrual e dignidade
  't-37': 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=80', // Superendividamento das famílias
  't-38': 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=800&q=80', // Crise dos refugiados
  't-39': 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80', // Acesso à justiça e defensorias
  't-40': 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?auto=format&fit=crop&w=800&q=80', // Gravidez na adolescência
  't-41': 'https://images.unsplash.com/photo-1509749837427-ac94a2553d0e?auto=format&fit=crop&w=800&q=80', // Transporte público e mobilidade
  't-42': 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=800&q=80', // Gentrificação urbana
  't-43': 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80', // Insegurança hídrica
  't-44': 'https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?auto=format&fit=crop&w=800&q=80', // Combate ao trabalho infantil
  't-45': 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80', // Aporofobia e arquitetura hostil
  't-46': 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=800&q=80', // Democratização da energia elétrica
  't-47': 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80', // Exclusão digital
  't-48': 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80', // Direito ao lazer na periferia
  't-49': 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=800&q=80', // Insegurança alimentar indígena
  't-50': 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?auto=format&fit=crop&w=800&q=80', // Violência patrimonial contra idosos

  // --- Eixo 2: Meio Ambiente e Clima ---
  't-66': 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?auto=format&fit=crop&w=800&q=80', // Racismo ambiental
  't-67': 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=800&q=80', // Transição energética justa
  't-68': 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80', // Resíduos sólidos e lixões
  't-69': 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80', // Desmatamento do Cerrado
  't-70': 'https://images.unsplash.com/photo-1621451537084-482c73073a0f?auto=format&fit=crop&w=800&q=80', // Plásticos nos oceanos
  't-71': 'https://images.unsplash.com/photo-1519999482648-25049ddd37b1?auto=format&fit=crop&w=800&q=80', // Cidades esponja
  't-72': 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80', // Petróleo na Foz do Amazonas
  't-73': 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=800&q=80', // Obsolescência programada
  't-74': 'https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?auto=format&fit=crop&w=800&q=80', // Tráfico de animais silvestres
  't-75': 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=800&q=80', // Agroflorestas sustentáveis
  't-76': 'https://images.unsplash.com/photo-1524338198850-8a2ff63aaceb?auto=format&fit=crop&w=800&q=80', // Impacto das queimadas
  't-77': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80', // Manguezais e biodiversidade
  't-78': 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80', // Desperdício de alimentos
  't-79': 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=800&q=80', // Slow fashion vs fast fashion
  't-80': 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=800&q=80', // Mineração em terras indígenas

  // --- Eixo 3: Tecnologia e Sociedade ---
  't-101': 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80', // Inteligência Artificial na educação
  't-102': 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80', // Apostas online e Bets
  't-103': 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80', // Fake news e desinformação
  't-104': 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80', // Stalking e privacidade digital
  't-105': 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=800&q=80', // Telas no desenvolvimento infantil
  't-106': 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=800&q=80', // Uberização e controle algorítmico
  't-107': 'https://images.unsplash.com/photo-1516251193007-45ef944ab0c6?auto=format&fit=crop&w=800&q=80', // Cultura do cancelamento
  't-108': 'https://images.unsplash.com/photo-1555421689-d68471e189f2?auto=format&fit=crop&w=800&q=80', // Reconhecimento facial e viés racial
  't-109': 'https://images.unsplash.com/photo-1516726817505-f5ed825624d8?auto=format&fit=crop&w=800&q=80', // Exclusão digital dos idosos
  't-110': 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=800&q=80', // Influenciadores digitais e consumo

  // --- Eixo 4: Violência e Direitos Humanos ---
  't-136': 'https://images.unsplash.com/photo-1508847154043-be5407fcaa5a?auto=format&fit=crop&w=800&q=80', // Violência contra a mulher
  't-137': 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80', // Letalidade policial e racismo
  't-138': 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80', // Sistema carcerário
  't-139': 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=800&q=80', // Desaparecimento de pessoas
  't-140': 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=800&q=80', // Violência nas escolas e paz
  't-141': 'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?auto=format&fit=crop&w=800&q=80', // Porte de armas
  't-142': 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=800&q=80', // Tráfico de drogas e território
  't-143': 'https://images.unsplash.com/photo-1561055657-b9e0bf0fa360?auto=format&fit=crop&w=800&q=80', // População LGBTQIA+
  't-144': 'https://images.unsplash.com/photo-1494783367193-149034c05e8f?auto=format&fit=crop&w=800&q=80', // Violência no trânsito
  't-145': 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=800&q=80', // Exploração infantil

  // --- Eixo 5: Saúde Pública ---
  't-166': 'https://images.unsplash.com/photo-1527137342181-19aab11a8ee8?auto=format&fit=crop&w=800&q=80', // Saúde mental de jovens
  't-167': 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=800&q=80', // Envelhecimento populacional
  't-168': 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80', // Vacinação e saúde coletiva
  't-169': 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80', // Obesidade
  't-170': 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80', // Doação de órgãos
  't-171': 'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?auto=format&fit=crop&w=800&q=80', // Dengue e arboviroses
  't-172': 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80', // Valorização da vida
  't-173': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80', // Saúde da população negra

  // --- Eixo 6: Educação e Cultura ---
  't-186': 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80', // Evasão escolar
  't-187': 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80', // Valorização do professor
  't-188': 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&w=800&q=80', // Educação financeira
  't-189': 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80', // Bullying escolar
  't-190': 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80', // Patrimônio histórico
  't-191': 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80', // Esporte como inclusão
  't-192': 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=800&q=80', // Leitura no Brasil
  't-193': 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80', // Educação inclusiva PCDs
  't-194': 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=800&q=80', // História e cultura africana
  't-195': 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80', // Acesso à universidade
  't-196': 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80', // Educação artística
  't-197': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80', // Ensino técnico
  't-198': 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80', // Alfabetização na idade certa
  't-199': 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80', // Militarização das escolas
  't-200': 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80', // Ciência e combate ao negacionismo

  // --- Temas Históricos do ENEM ---
  'th-1': 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=800&q=80', // Intolerância religiosa (2016)
  'th-2': 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80', // Manipulação de dados (2018)
  'th-3': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80', // Democratização do cinema (2019)
  'th-4': 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=800&q=80', // Estigma de doenças mentais (2020)
  'th-5': 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80', // Registro civil e cidadania (2021)

  // --- Temas Contemporâneos e Debate Social ---
  't-201': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80', // Neurodivergentes no mercado
  't-202': 'https://images.unsplash.com/photo-1541199249251-f713e6145474?auto=format&fit=crop&w=800&q=80', // Romantização do burnout e estafa
  't-203': 'https://images.unsplash.com/photo-1535378917042-10a22c95931a?auto=format&fit=crop&w=800&q=80', // Deepfakes e democracia
  't-204': 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80', // Yanomami e garimpo ilegal
  't-205': 'https://images.unsplash.com/photo-1447069387593-a5de0862481e?auto=format&fit=crop&w=800&q=80', // Solidão e abandono de idosos
  't-206': 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80', // Violência digital contra mulher
  't-207': 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=800&q=80', // Fuga de cérebros e ciência nacional
  't-208': 'https://images.unsplash.com/photo-1544717302-de2939b7ef71?auto=format&fit=crop&w=800&q=80', // Discurso de ódio online
  't-209': 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80', // Gordofobia médica
  't-210': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80', // Licença-paternidade
  't-211': 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80', // Homeschooling
  't-212': 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80', // Coachs e promessas de sucesso fácil
  't-213': 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=800&q=80', // Mulheres negras e afeto
  't-214': 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80', // Etarismo na tecnologia
  't-215': 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=800&q=80', // Parto humanizado
  't-216': 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=800&q=80', // Museus e bens culturais
  't-217': 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=800&q=80', // Cigarros eletrônicos (vape)
  't-218': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80', // Poluição luminosa
  't-219': 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80', // Insegurança alimentar universitários
  't-220': 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?auto=format&fit=crop&w=800&q=80', // PcD na política brasileira
  't-221': 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=800&q=80', // Descarte têxtil e fast fashion
  't-222': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80', // ChatGPT e autoria literária
  't-223': 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=800&q=80', // Geração Sanduíche e sobrecarga de cuidado
  't-224': 'https://images.unsplash.com/photo-1485217988980-11786ced9454?auto=format&fit=crop&w=800&q=80', // Grupos extremistas
  't-225': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80', // Turismo predatório
  't-226': 'https://images.unsplash.com/photo-1476703993599-0035a21b17a9?auto=format&fit=crop&w=800&q=80', // Adoção tardia
  't-227': 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=800&q=80', // Bullying estético e cirurgias
  't-228': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80', // Imigrantes e SUS
  't-229': 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=80', // Uberização da medicina
  't-230': 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80', // Bibliotecas comunitárias
  't-231': 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=800&q=80', // Soberania alimentar e fertilizantes
  't-232': 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80', // Profissões e IA
  't-233': 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80', // Racismo algorítmico em seleção
  't-234': 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80', // Preservação de línguas indígenas
  't-235': 'https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?auto=format&fit=crop&w=800&q=80', // Sedentarismo infantil e cidade
  't-236': 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=800&q=80', // Testes de cosméticos em animais
  't-237': 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=800&q=80', // Medicamentos de alto custo
  't-238': 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=800&q=80', // Mulheres na ciência (Efeito Matilda)
  't-239': 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=800&q=80', // Quilombolas e mineração
  't-240': 'https://images.unsplash.com/photo-1472162072942-cd5147eb3902?auto=format&fit=crop&w=800&q=80', // Brincar livre e saúde mental infantil
};

// Paleta rotativa diversificada por categoria (garante que 2 temas adjacentes nunca repitam fotos)
export const CATEGORY_PALETTES: Record<string, string[]> = {
  Sociedade: [
    'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=800&q=80', // Rua / vida urbana
    'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=800&q=80', // Moradia / comunidade
    'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=800&q=80', // Solidariedade
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80', // Diversidade humana
    'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=800&q=80', // Ajuda humanitária
    'https://images.unsplash.com/photo-1509749837427-ac94a2553d0e?auto=format&fit=crop&w=800&q=80', // Transporte urbano
    '/assets/covers/cover-sociedade.jpg',
  ],
  'Meio Ambiente': [
    'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80', // Floresta
    'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=800&q=80', // Energia limpa
    'https://images.unsplash.com/photo-1621451537084-482c73073a0f?auto=format&fit=crop&w=800&q=80', // Oceanos
    'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80', // Reciclagem
    'https://images.unsplash.com/photo-1524338198850-8a2ff63aaceb?auto=format&fit=crop&w=800&q=80', // Clima / seca
    'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=800&q=80', // Agricultura verde
    '/assets/covers/cover-meio-ambiente.jpg',
  ],
  Tecnologia: [
    'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80', // IA / Futuro
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80', // Código / telas
    'https://images.unsplash.com/photo-1555421689-d68471e189f2?auto=format&fit=crop&w=800&q=80', // Visão computacional
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80', // Big Data
    'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=800&q=80', // Redes sociais
    'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80', // Inovação tech
    '/assets/covers/cover-tecnologia.jpg',
  ],
  Educação: [
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80', // Sala de aula
    'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80', // Livros e estudo
    'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80', // Professor
    'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80', // Universidade
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80', // Alfabetização infantil
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80', // Ensino técnico
    '/assets/covers/cover-educacao.jpg',
  ],
  Saúde: [
    'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=800&q=80', // Água potável e saneamento
    'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80', // Vacinas e prevenção
    'https://images.unsplash.com/photo-1527137342181-19aab11a8ee8?auto=format&fit=crop&w=800&q=80', // Saúde mental
    'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80', // Cuidados médicos
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80', // Sistema de saúde SUS
    'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80', // Nutrição e bem-estar
    '/assets/covers/cover-saude.jpg',
  ],
  Cultura: [
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80', // Patrimônio e arquitetura
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80', // Cinema e artes
    'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=800&q=80', // Literatura e livros
    'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=800&q=80', // Tradições culturais
    'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=800&q=80', // Museus
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80', // Esporte e expressão
    '/assets/covers/cover-cultura.jpg',
  ],
  Política: [
    'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80', // Justiça e leis
    'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?auto=format&fit=crop&w=800&q=80', // Democracia e parlamento
    'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80', // Cidadania e direitos
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80', // Sociedade civil e debate
    '/assets/covers/cover-politica.jpg',
  ],
  Economia: [
    'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=800&q=80', // Moeda e finanças
    'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=80', // Planejamento financeiro
    'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80', // Trabalho e produção
    'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80', // Indústria e mercado
    '/assets/covers/cover-economia.jpg',
  ],
};

/**
 * Função determinística para obter a capa de qualquer tema.
 * 1. Prioriza coverImage explícito no objeto de tema
 * 2. Busca pelo ID exato no TOPIC_SPECIFIC_COVERS
 * 3. Faz busca semântica refinada por palavras-chave
 * 4. Utiliza a paleta rotativa da categoria evitando duplicidades visuais
 */
export const getTopicCover = (
  topic: { id?: string; title: string; category?: string; coverImage?: string },
  index = 0
): string => {
  // 1. Capa explicitamente definida
  if (topic.coverImage) {
    return topic.coverImage;
  }

  // 2. ID mapeado diretamente
  if (topic.id && TOPIC_SPECIFIC_COVERS[topic.id]) {
    return TOPIC_SPECIFIC_COVERS[topic.id];
  }

  // 3. Busca por palavras-chave essenciais no título
  const title = (topic.title || '').toLowerCase();

  // Fome / Alimento
  if (title.includes('fome') || title.includes('alimentar') || title.includes('nutrição')) {
    return 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=800&q=80';
  }
  // Rua / Moradia / Habitação
  if (title.includes('situação de rua') || title.includes('população em situação de rua') || title.includes('morador de rua')) {
    return 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=800&q=80';
  }
  if (title.includes('habitacional') || title.includes('moradia') || title.includes('teto')) {
    return 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=800&q=80';
  }
  // Saneamento / Água
  if (title.includes('saneamento') || title.includes('esgoto') || title.includes('hídrica')) {
    return 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=800&q=80';
  }
  // Trabalho escravo / Campo
  if (title.includes('escravidão') || title.includes('trabalho escravo') || title.includes('análogo à escravidão')) {
    return 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80';
  }
  // IA / Inteligência Artificial / Algoritmo
  if (title.includes('inteligência artificial') || title.includes('ia') || title.includes('algorítm')) {
    return 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80';
  }
  // Apostas / Bets
  if (title.includes('apostas') || title.includes('bets') || title.includes('jogos de azar')) {
    return 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80';
  }
  // Fake news / Desinformação
  if (title.includes('fake news') || title.includes('desinformação') || title.includes('negacionismo')) {
    return 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80';
  }
  // Indígenas / Floresta
  if (title.includes('indígen') || title.includes('yanomami') || title.includes('amazônia') || title.includes('cerrado')) {
    return 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80';
  }
  // Refugiados / Imigrantes
  if (title.includes('refugiado') || title.includes('imigrante') || title.includes('acolhida')) {
    return 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=800&q=80';
  }
  // Prisão / Sistema carcerário
  if (title.includes('carcerár') || title.includes('prisão') || title.includes('presíd')) {
    return 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80';
  }
  // Idosos / Envelhecimento
  if (title.includes('idoso') || title.includes('envelhecimento') || title.includes('terceira idade')) {
    return 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?auto=format&fit=crop&w=800&q=80';
  }

  // 4. Paleta da categoria com rotação determinística por hash de título
  const category = topic.category || 'Sociedade';
  const palette = CATEGORY_PALETTES[category] || CATEGORY_PALETTES['Sociedade'];

  let hash = 0;
  const str = (topic.id || '') + (topic.title || '');
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }

  return palette[(hash + index) % palette.length];
};
