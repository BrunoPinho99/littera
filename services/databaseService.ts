import { supabase } from '../supabaseClient';
import { EssayInput, CorrectionResult, SavedEssay, School, ClassGroup, StudentDetail, Assignment, Notification, RankUser } from '../types';

const isDemoUserId = (userId?: string | null): boolean =>
  Boolean(!userId || userId === 'demo' || userId === 'demo-user' || userId.startsWith('demo-'));

// ── Email de Convite via Edge Function ─────────────────────────────────────────
// Chama a Edge Function 'send-invite' que usa a service_role key no backend
export const sendInviteEmail = async (params: {
  email: string;
  name: string;
  role: 'student' | 'professor';
  school_id: string;
  school_name: string;
  class_id?: string;
}): Promise<{ success: boolean; alreadyExists?: boolean; userId?: string; message?: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke('send-invite', {
      body: params,
    });

    if (error) {
      console.error('[sendInviteEmail] Edge Function error:', error);
      // Não bloqueia o fluxo principal — o registro foi criado, só o email falhou
      return { success: false, message: error.message };
    }

    return data as { success: boolean; alreadyExists?: boolean; userId?: string; message?: string };
  } catch (err: any) {
    console.error('[sendInviteEmail] Unexpected error:', err);
    return { success: false, message: err.message };
  }
};

export const revokeInvite = async (email: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke('send-invite', {
      body: { action: 'revoke', email },
    });

    if (error) {
      console.error('[revokeInvite] Edge Function error:', error);
      return { success: false, message: error.message };
    }

    return data as { success: boolean; message?: string };
  } catch (err: any) {
    console.error('[revokeInvite] Unexpected error:', err);
    return { success: false, message: err.message };
  }
};

export const isSubscriptionActive = async (schoolId: string): Promise<boolean> => {
  if (schoolId === 'demo-school') return true;

  try {
    const { data, error } = await supabase
      .from('schools')
      .select('subscription_status')
      .eq('id', schoolId)
      .single();

    if (error) {
      console.warn("Failed to check subscription status:", error);
      return false;
    }

    const status = (data?.subscription_status || '').toLowerCase();
    return status === 'active' || status === 'trialing';
  } catch (err) {
    console.warn("Exception checking subscription status:", err);
    return false;
  }
};

export const checkSchoolSubscription = isSubscriptionActive;

export const updateStudentProfile = async (id: string, updates: { full_name?: string, class_id?: string, registration_number?: string }) => {
  if (!id || id === 'demo-school') return { success: true };
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
  return { success: true };
};

export const JOURNEY_TIERS = [
  { min: 0, max: 2, label: 'Aspirante', icon: 'local_library', color: 'text-gray-400', bg: 'bg-gray-100', next: 3 },
  { min: 3, max: 5, label: 'Escritor Bronze', icon: 'workspace_premium', color: 'text-amber-700', bg: 'bg-amber-100', next: 6 },
  { min: 6, max: 10, label: 'Escritor Prata', icon: 'military_tech', color: 'text-slate-400', bg: 'bg-slate-100', next: 11 },
  { min: 11, max: 20, label: 'Escritor Ouro', icon: 'stars', color: 'text-amber-500', bg: 'bg-amber-100', next: 21 },
  { min: 21, max: 40, label: 'Escritor Platina', icon: 'diamond', color: 'text-cyan-400', bg: 'bg-cyan-100', next: 41 },
  { min: 41, max: 70, label: 'Escritor Diamante', icon: 'auto_awesome', color: 'text-blue-500', bg: 'bg-blue-100', next: 71 },
  { min: 71, max: 1000, label: 'Mestre Elite', icon: 'shield', color: 'text-primary', bg: 'bg-primary/10', next: null },
];

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback para UUID v4 válido
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const calculateUserRank = (essayCount: number) => {
  return JOURNEY_TIERS.find(tier => essayCount >= tier.min && essayCount <= tier.max) || JOURNEY_TIERS[0];
};



export const saveEssayToDatabase = async (topicTitle: string, input: EssayInput, userId: string, result?: CorrectionResult, userMetadata?: any) => {
  const content = input.type === 'text' ? input.content : 'Redação enviada via imagem';

  // MODO DEMO: Salva apenas localmente
  if (isDemoUserId(userId)) {
    const newEssay: SavedEssay = {
      id: generateUUID(),
      tema: topicTitle,
      conteudo: content,
      score: result?.totalScore || 0,
      data_envio: new Date().toISOString(),
      status: 'corrigida',
      student_name: userMetadata?.full_name || "Visitante",
      result: result
    };

    const localKey = `scritta_history_${userId}`;
    const currentHistory = JSON.parse(localStorage.getItem(localKey) || '[]');
    localStorage.setItem(localKey, JSON.stringify([...currentHistory, newEssay]));
    return [newEssay];
  }

  // MODO ONLINE: A Edge Function correct-essay / process-essay já persiste a redação na tabela 'redacoes'.
  return [];
};

export const getSchoolData = async (schoolId?: string | null): Promise<School | null> => {
  // Modo demo explícito
  if (!schoolId || schoolId === 'demo-school') {
    if (schoolId === 'demo-school') {
      return {
        id: 'demo-school',
        name: "Colégio Littera (Demo)",
        city: "São Paulo, SP",
        subscription_status: 'active',
        student_count: 120,
        credits_per_student: 10,
        billing_cycle: 'anual',
        plano_ativado_em: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      };
    }
    return null; // Sem school_id real, retorna null sem entrar em demo
  }

  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .eq('id', schoolId)
    .single();

  if (error) throw error;
  return data;
};

export const createClass = async (classData: { name: string; grade: string; shift: string; school_id: string }): Promise<ClassGroup | null> => {
  // MODO DEMO
  if (classData.school_id === 'demo-school') {
    const mockClass: ClassGroup = {
      id: generateUUID(),
      ...classData,
      shift: classData.shift as ClassGroup['shift'],
      studentCount: 0,
      averageScore: 0,
      school_id: classData.school_id,
      trend: 'neutral'
    };
    const currentClasses = JSON.parse(localStorage.getItem('scritta_demo_classes') || '[]');
    localStorage.setItem('scritta_demo_classes', JSON.stringify([...currentClasses, mockClass]));
    return mockClass;
  }

  // MODO REAL
  const inviteCode = `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const dbPayload: any = {
    name: classData.name,
    year: parseInt(classData.grade) || null,
    school_id: classData.school_id,
    invite_code: inviteCode
  };

  let data;
  let error;

  // Tentativa 1: Inserir com a coluna 'shift' (se ela existir no banco)
  const resWithShift = await supabase
    .from('classes')
    .insert([{ ...dbPayload, shift: classData.shift }])
    .select()
    .single();
    
  if (resWithShift.error && resWithShift.error.message.includes('shift')) {
    // Tentativa 2: Fallback inserindo sem a coluna 'shift'
    console.warn("[Littera] Coluna 'shift' não encontrada. Inserindo turma sem o turno.");
    const resWithoutShift = await supabase
      .from('classes')
      .insert([dbPayload])
      .select()
      .single();
      
    data = resWithoutShift.data;
    error = resWithoutShift.error;
  } else {
    data = resWithShift.data;
    error = resWithShift.error;
  }

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    grade: data.year ? data.year.toString() : '',
    shift: (data.shift || classData.shift) as ClassGroup['shift'],
    studentCount: 0,
    averageScore: 0,
    school_id: data.school_id,
    trend: 'neutral',
    invite_code: data.invite_code || inviteCode
  };
};

export const createProfessor = async (profData: { name: string; email: string; school_id: string; class_id: string }) => {
  // MODO DEMO
  if (profData.school_id === 'demo-school') {
    const mockProfessor = {
      id: generateUUID(),
      full_name: profData.name,
      email: profData.email,
      role: 'teacher',
      school_id: profData.school_id,
      class_id: profData.class_id
    };
    const currentProfs = JSON.parse(localStorage.getItem('scritta_demo_professors') || '[]');
    localStorage.setItem('scritta_demo_professors', JSON.stringify([...currentProfs, mockProfessor]));
    return { ...mockProfessor, _inviteEmailSent: false };
  }

  // MODO REAL — Busca dados da escola para personalizar o email
  const schoolData = await getSchoolData(profData.school_id).catch(() => null);
  const schoolName = schoolData?.name || 'sua escola';

  // Verifica se o e-mail já existe com conta ativa
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id, status')
    .eq('email', profData.email)
    .maybeSingle();

  if (existingUser && existingUser.status !== 'invited') {
    throw new Error("Este e-mail já está cadastrado com uma conta ativa no sistema.");
  }

  // Envia email de convite via Edge Function (que cria o auth.users e o perfil no banco sem erro de fkey)
  const inviteResult = await sendInviteEmail({
    email: profData.email,
    name: profData.name,
    role: 'professor',
    school_id: profData.school_id,
    school_name: schoolName,
    class_id: profData.class_id,
  });

  if (!inviteResult.success && !inviteResult.alreadyExists) {
    throw new Error(inviteResult.message || "Erro ao enviar convite e cadastrar professor.");
  }

  const profObj = {
    id: inviteResult.userId || generateUUID(),
    full_name: profData.name,
    email: profData.email,
    role: 'teacher',
    school_id: profData.school_id,
    class_id: profData.class_id,
    status: 'invited',
    _inviteEmailSent: inviteResult.success,
    _inviteAlreadyExists: inviteResult.alreadyExists
  };

  return profObj;
};

export const createStudent = async (
  studentData: { name: string; email: string; school_id: string; class_id?: string; registration_number?: string },
  _schoolName?: string // opcional: nome da escola para personalizar o email
): Promise<StudentDetail | null> => {
  // MODO DEMO
  if (studentData.school_id === 'demo-school') {
    const mockStudent: StudentDetail = {
      id: generateUUID(),
      name: studentData.name,
      email: studentData.email,
      averageScore: 0,
      essaysSubmitted: 0,
      lastActivity: "Novo",
      status: 'invited',
      class_id: studentData.class_id,
      school_id: studentData.school_id,
      registration_number: studentData.registration_number
    };
    const currentStudents = JSON.parse(localStorage.getItem('scritta_demo_students') || '[]');
    localStorage.setItem('scritta_demo_students', JSON.stringify([...currentStudents, mockStudent]));
    return mockStudent;
  }

  // MODO REAL — Verifica se email já existe com conta ativa (permite reenvio se for apenas convite pendente)
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id, status')
    .eq('email', studentData.email)
    .maybeSingle();

  if (existingUser && existingUser.status !== 'invited') {
    throw new Error("Este e-mail já está cadastrado com uma conta ativa no sistema.");
  }

  // Busca dados da escola para checar trava de vagas e personalizar o email
  const schoolData = await getSchoolData(studentData.school_id).catch(() => null);
  const schoolName = _schoolName || schoolData?.name || 'sua escola';

  if (!existingUser) {
    const { count: currentStudentCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', studentData.school_id)
      .eq('role', 'student');

    const maxStudents = schoolData?.student_count ?? 0;
    if (maxStudents > 0 && (currentStudentCount || 0) >= maxStudents) {
      throw new Error("Limite de alunos do plano atingido. Aumente o número de alunos na aba Assinatura.");
    }
  }

  // Envia email de convite via Edge Function (que cria o auth.users e o perfil)
  const inviteResult = await sendInviteEmail({
    email: studentData.email,
    name: studentData.name,
    role: 'student',
    school_id: studentData.school_id,
    school_name: schoolName,
    class_id: studentData.class_id,
  });

  if (!inviteResult.success && !inviteResult.alreadyExists) {
    throw new Error(inviteResult.message || "Erro ao enviar convite e cadastrar aluno.");
  }

  return {
    id: inviteResult.userId || generateUUID(),
    name: studentData.name,
    email: studentData.email,
    averageScore: 0,
    essaysSubmitted: 0,
    lastActivity: "Novo",
    status: 'invited',
    class_id: studentData.class_id,
    school_id: studentData.school_id,
    registration_number: studentData.registration_number,
    _inviteEmailSent: inviteResult.success,
    _inviteAlreadyExists: inviteResult.alreadyExists
  } as any;
};

export const createStudentsBulk = async (students: { name: string; email: string; class_id?: string; registration_number?: string }[], schoolId: string) => {
  const results = {
    success: [] as StudentDetail[],
    errors: [] as { email: string, reason: string }[]
  };

  if (schoolId === 'demo-school') {
    // MODO DEMO - mantém fluxo sequencial simulado
    const schoolName = 'Escola Demonstração';
    for (const student of students) {
      try {
        const result = await createStudent({ ...student, school_id: schoolId }, schoolName);
        if (result) results.success.push(result);
      } catch (err: any) {
        results.errors.push({ email: student.email, reason: err.message || "Erro desconhecido" });
      }
    }
    return results;
  }

  // Busca nome da escola uma única vez
  const schoolData = await getSchoolData(schoolId).catch(() => null);
  const schoolName = schoolData?.name || 'sua escola';

  // Verifica trava de vagas da escola antes de processar o lote
  const { count: currentStudentCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .eq('role', 'student');

  const maxStudents = schoolData?.student_count ?? 0;
  if (maxStudents > 0 && (currentStudentCount || 0) >= maxStudents) {
    throw new Error("Limite de alunos do plano atingido. Aumente o número de alunos na aba Assinatura.");
  }

  // 1. Filtrar emails já existentes ativos para evitar erro de constraint (mas permite reenvio se status for 'invited')
  const emails = students.map(s => s.email);
  const { data: existingProfiles } = await supabase
    .from('profiles')
    .select('email, status')
    .in('email', emails);
  
  const existingActiveEmails = new Set((existingProfiles || []).filter(p => p.status !== 'invited').map(p => p.email));
  
  const validStudents = students.filter(s => {
    if (existingActiveEmails.has(s.email)) {
      results.errors.push({ email: s.email, reason: "Este e-mail já está cadastrado com uma conta ativa no sistema." });
      return false;
    }
    return true;
  });

  if (validStudents.length === 0) return results;

  // 2. Convidar e cadastrar estudantes concorrentemente via Edge Function em lotes de 5
  const BATCH_SIZE = 5;
  for (let i = 0; i < validStudents.length; i += BATCH_SIZE) {
    const batch = validStudents.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(async (student) => {
      try {
        const inviteResult = await sendInviteEmail({
          email: student.email,
          name: student.name,
          role: 'student',
          school_id: schoolId,
          school_name: schoolName,
          class_id: student.class_id,
        });

        if (inviteResult.success || inviteResult.alreadyExists) {
          results.success.push({
            id: inviteResult.userId || generateUUID(),
            name: student.name,
            email: student.email,
            averageScore: 0,
            essaysSubmitted: 0,
            lastActivity: "Novo",
            status: 'invited',
            class_id: student.class_id,
            school_id: schoolId,
            registration_number: student.registration_number
          });
        } else {
          results.errors.push({ email: student.email, reason: inviteResult.message || "Erro ao convidar" });
        }
      } catch (err: any) {
        results.errors.push({ email: student.email, reason: err.message || "Erro desconhecido" });
      }
    }));
  }

  return results;
};

export const DEFAULT_DEMO_CLASSES: ClassGroup[] = [
  {
    id: 'turma-demo-1',
    name: '3º Ano A - Ensino Médio',
    grade: '3º Ano EM',
    shift: 'Matutino',
    studentCount: 32,
    averageScore: 840,
    school_id: 'demo-school',
    trend: 'up',
    invite_code: 'DEMO3A'
  },
  {
    id: 'turma-demo-2',
    name: '3º Ano B - Ensino Médio',
    grade: '3º Ano EM',
    shift: 'Vespertino',
    studentCount: 28,
    averageScore: 790,
    school_id: 'demo-school',
    trend: 'neutral',
    invite_code: 'DEMO3B'
  },
  {
    id: 'turma-demo-3',
    name: '2º Ano A - Ensino Médio',
    grade: '2º Ano EM',
    shift: 'Matutino',
    studentCount: 30,
    averageScore: 730,
    school_id: 'demo-school',
    trend: 'up',
    invite_code: 'DEMO2A'
  }
];

export const DEFAULT_DEMO_PROFESSORS = [
  {
    id: 'prof-demo-1',
    full_name: 'Prof. Carlos Eduardo',
    name: 'Prof. Carlos Eduardo',
    email: 'carlos.eduardo@demo.com',
    role: 'teacher',
    class_id: 'turma-demo-1',
    school_id: 'demo-school',
    status: 'active'
  },
  {
    id: 'prof-demo-2',
    full_name: 'Profa. Ana Carolina Mendes',
    name: 'Profa. Ana Carolina Mendes',
    email: 'ana.carolina@demo.com',
    role: 'teacher',
    class_id: 'turma-demo-2',
    school_id: 'demo-school',
    status: 'active'
  },
  {
    id: 'prof-demo-3',
    full_name: 'Prof. Roberto Vasconcelos',
    name: 'Prof. Roberto Vasconcelos',
    email: 'roberto.v@demo.com',
    role: 'teacher',
    class_id: 'turma-demo-3',
    school_id: 'demo-school',
    status: 'active'
  }
];

export const DEFAULT_DEMO_STUDENTS: StudentDetail[] = [
  {
    id: 'student-demo-1',
    name: 'Mariana Souza Silva',
    email: 'mariana.silva@demo.com',
    averageScore: 920,
    essaysSubmitted: 6,
    lastActivity: 'Hoje',
    status: 'active',
    class_id: 'turma-demo-1',
    school_id: 'demo-school',
    registration_number: '202401'
  },
  {
    id: 'student-demo-2',
    name: 'Lucas Gabriel Santos',
    email: 'lucas.santos@demo.com',
    averageScore: 860,
    essaysSubmitted: 5,
    lastActivity: 'Ontem',
    status: 'active',
    class_id: 'turma-demo-1',
    school_id: 'demo-school',
    registration_number: '202402'
  },
  {
    id: 'student-demo-3',
    name: 'Beatriz Costa Oliveira',
    email: 'beatriz.costa@demo.com',
    averageScore: 780,
    essaysSubmitted: 4,
    lastActivity: 'Há 2 dias',
    status: 'active',
    class_id: 'turma-demo-1',
    school_id: 'demo-school',
    registration_number: '202403'
  },
  {
    id: 'student-demo-4',
    name: 'Enzo Ferreira Lima',
    email: 'enzo.ferreira@demo.com',
    averageScore: 480,
    essaysSubmitted: 2,
    lastActivity: 'Há 5 dias',
    status: 'risk',
    class_id: 'turma-demo-1',
    school_id: 'demo-school',
    registration_number: '202404'
  },
  {
    id: 'student-demo-5',
    name: 'Camila Rodrigues Lima',
    email: 'camila.lima@demo.com',
    averageScore: 960,
    essaysSubmitted: 7,
    lastActivity: 'Hoje',
    status: 'active',
    class_id: 'turma-demo-2',
    school_id: 'demo-school',
    registration_number: '202405'
  },
  {
    id: 'student-demo-6',
    name: 'Rafael Alves Pereira',
    email: 'rafael.pereira@demo.com',
    averageScore: 820,
    essaysSubmitted: 5,
    lastActivity: 'Há 3 dias',
    status: 'active',
    class_id: 'turma-demo-2',
    school_id: 'demo-school',
    registration_number: '202406'
  },
  {
    id: 'student-demo-7',
    name: 'Isabela Martins Rocha',
    email: 'isabela.rocha@demo.com',
    averageScore: 0,
    essaysSubmitted: 0,
    lastActivity: 'Pendente',
    status: 'invited',
    class_id: 'turma-demo-2',
    school_id: 'demo-school',
    registration_number: '202407'
  },
  {
    id: 'student-demo-8',
    name: 'Guilherme Santos Ribeiro',
    email: 'guilherme.santos@demo.com',
    averageScore: 740,
    essaysSubmitted: 4,
    lastActivity: 'Há 4 dias',
    status: 'active',
    class_id: 'turma-demo-3',
    school_id: 'demo-school',
    registration_number: '202408'
  }
];

export const DEFAULT_DEMO_ESSAYS: SavedEssay[] = [
  {
    id: 'essay-demo-1',
    tema: 'Desafios para o enfrentamento da invisibilidade do trabalho de cuidado no Brasil',
    conteudo: 'Na obra modernista "Vidas Secas", de Graciliano Ramos, a personagem Sinhá Vitória sintetiza a rotina extenuante de afazeres domésticos e de cuidado desvalorizados. Analogamente à ficção, na realidade brasileira contemporânea, o trabalho reprodutivo desempenhado majoritariamente por mulheres permanece invisibilizado, configurando um grave obstáculo ao pleno exercício da cidadania e à equidade de gênero. Torna-se imperativo, portanto, analisar as raízes socioculturais dessa opressão e a ineficiência do amparo estatal para mitigar o problema.\n\nEm primeiro lugar, convém destacar a persistência de um patriarcado estrutural que naturaliza o trabalho de assistência como atributo exclusivamente feminino. Consoante a filósofa Simone de Beauvoir, "não se nasce mulher, torna-se mulher", o que evidencia a construção social das atribuições de gênero. Nessa perspectiva, desde a infância, inculca-se a responsabilidade do cuidado familiar às meninas, perpetuando uma dupla jornada exaustiva que compromete a ascensão acadêmica e profissional dessas cidadãs.\n\nAdemais, nota-se a carência de políticas públicas eficazes direcionadas à redistribuição dessas tarefas. O Estado falha em oferecer uma rede suficiente de creches e centros de convivência comunitários. Dessa forma, sem suportes institucionais universais, a obrigação do cuidado recai compulsoriamente no âmbito privado, penalizando principalmente mulheres das classes populares.\n\nInfere-se, portanto, a urgência de medidas concretas para sanar essa conjuntura. Cabe ao Ministério do Desenvolvimento e Assistência Social, em parceria com o Ministério da Educação, instituir o Plano Nacional de Fortalecimento do Cuidado. Essa ação deve ocorrer mediante ampliação do orçamento para creches em período integral e campanhas educativas de conscientização comunitária, com o objetivo de desmistificar a feminização do cuidado e assegurar a dignidade das trabalhadoras.',
    score: 960,
    data_envio: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    student_name: 'Camila Rodrigues Lima',
    student_id: 'student-demo-5',
    class_id: 'turma-demo-2',
    school_id: 'demo-school',
    result: {
      totalScore: 960,
      competencies: [
        { name: 'C1 - Domínio da Norma Culta', score: 200, feedback: 'Excelente domínio gramatical, concordância e regência exemplares sem desvios significativos.' },
        { name: 'C2 - Compreensão da Proposta', score: 200, feedback: 'Repertório sociocultural produtivo e legítimo com citação de Simone de Beauvoir e Graciliano Ramos.' },
        { name: 'C3 - Seleção e Organização', score: 180, feedback: 'Projeto de texto muito consistente com argumentos bem articulados e encadeados.' },
        { name: 'C4 - Coesão e Coerência', score: 200, feedback: 'Uso diversificado e produtivo de operadores argumentativos inter e intraparágrafos.' },
        { name: 'C5 - Proposta de Intervenção', score: 180, feedback: 'Proposta detalhada contendo agente, ação, meio, efeito e detalhamento do meio.' }
      ],
      generalComment: 'Redação exemplar! Projeto de texto maduro, vocabulário refinado e repertório perfeitamente integrado à argumentação.',
      aiDetected: false,
      zeroReason: null,
      strengths: ['Repertório sociocultural altamente produtivo', 'Coesão referencial fluida', 'Projeto de texto claro'],
      priorityImprovements: ['Aprofundar ainda mais o detalhamento do efeito esperado na proposta']
    }
  },
  {
    id: 'essay-demo-2',
    tema: 'Desafios para o enfrentamento da invisibilidade do trabalho de cuidado no Brasil',
    conteudo: 'Historicamente, a divisão sexual do trabalho relegou às mulheres as funções reprodutivas e de cuidado, invisibilizando sua importância para a engrenagem econômica nacional. No Brasil hodierno, esse panorama arcaico ainda se sustenta, impondo barreiras severas ao desenvolvimento socioeconômico de milhões de indivíduos.\n\nDe início, cabe salientar o papel da negligência governamental na perpetuação desse quadro. Segundo o sociólogo Zygmunt Bauman, as instituições modernas passam por um processo de enfraquecimento em suas funções protetivas. Paralelamente, no Brasil, a defasagem no atendimento público de creches e asilos sobrecarrega os lares, exigindo sacrifícios desmedidos das famílias e, sobretudo, das mulheres.\n\nPor conseguinte, urge que o Governo Federal implemente medidas de proteção social e desoneração do cuidado doméstico, garantindo amparo estrutural e dignidade a todas as famílias.',
    score: 920,
    data_envio: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    student_name: 'Mariana Souza Silva',
    student_id: 'student-demo-1',
    class_id: 'turma-demo-1',
    school_id: 'demo-school',
    result: {
      totalScore: 920,
      competencies: [
        { name: 'C1 - Domínio da Norma Culta', score: 180, feedback: 'Estrutura sintática correta com apenas um desvio de pontuação em oração intercalada.' },
        { name: 'C2 - Compreensão da Proposta', score: 200, feedback: 'Compreensão ampla do recorte com aplicação produtiva de Zygmunt Bauman.' },
        { name: 'C3 - Seleção e Organização', score: 180, feedback: 'Boa progressão de ideias e justificativas coerentes.' },
        { name: 'C4 - Coesão e Coerência', score: 180, feedback: 'Bons conectivos e transições bem delimitadas.' },
        { name: 'C5 - Proposta de Intervenção', score: 180, feedback: 'Intervenção consistente e viável.' }
      ],
      generalComment: 'Ótima dissertação com bom vocabulário e argumentação coerente.',
      aiDetected: false,
      zeroReason: null,
      strengths: ['Boa fundamentação sociológica', 'Clareza na tese'],
      priorityImprovements: ['Revisão atenta do emprego da vírgula antes de conectivos adversativos']
    }
  },
  {
    id: 'essay-demo-3',
    tema: 'Caminhos para combater o estigma associado às doenças mentais no Brasil',
    conteudo: 'Na obra "O Alienista", de Machado de Assis, a loucura é tratada sob o viés do isolamento e do julgamento social arbitrário. Embora ficcional, a narrativa machadiana ilustra a histórica estigmatização das doenças psíquicas que, lamentavelmente, ainda reverbera na sociedade brasileira atual, alimentada pela desinformação e pelo silenciamento institucional.',
    score: 860,
    data_envio: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    student_name: 'Lucas Gabriel Santos',
    student_id: 'student-demo-2',
    class_id: 'turma-demo-1',
    school_id: 'demo-school',
    result: {
      totalScore: 860,
      competencies: [
        { name: 'C1 - Domínio da Norma Culta', score: 160, feedback: 'Linguagem adequada com pequenos desvios de regência verbal.' },
        { name: 'C2 - Compreensão da Proposta', score: 180, feedback: 'Referência literária bem aplicada ao contexto temático.' },
        { name: 'C3 - Seleção e Organização', score: 160, feedback: 'Argumentos convincentes, com necessidade de maior aprofundamento factual.' },
        { name: 'C4 - Coesão e Coerência', score: 180, feedback: 'Articulação lógica adequada entre os tópicos frasais.' },
        { name: 'C5 - Proposta de Intervenção', score: 180, feedback: 'Proposta bem direcionada ao Ministério da Saúde.' }
      ],
      generalComment: 'Texto bem escrito com excelente paralelo literário com Machado de Assis.',
      aiDetected: false,
      zeroReason: null,
      strengths: ['Repertório literário brasileiro pertinente', 'Tese formulada com clareza'],
      priorityImprovements: ['Aprofundar a argumentação no segundo parágrafo de desenvolvimento']
    }
  },
  {
    id: 'essay-demo-4',
    tema: 'Caminhos para combater o estigma associado às doenças mentais no Brasil',
    conteudo: 'A saúde mental é um tema muito sério que necessita de atenção de todas as escolas e famílias no país. Muitas pessoas sofrem com preconceito no ambiente de trabalho e deixam de procurar ajuda psicológica por vergonha...',
    score: 780,
    data_envio: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    student_name: 'Beatriz Costa Oliveira',
    student_id: 'student-demo-3',
    class_id: 'turma-demo-1',
    school_id: 'demo-school',
    result: {
      totalScore: 780,
      competencies: [
        { name: 'C1 - Domínio da Norma Culta', score: 160, feedback: 'Estruturas diretas e de fácil compreensão.' },
        { name: 'C2 - Compreensão da Proposta', score: 160, feedback: 'Tema abordado, contudo sem repertório externo formal legitimado.' },
        { name: 'C3 - Seleção e Organização', score: 140, feedback: 'Argumentos previsíveis que se beneficiariam de dados e citações.' },
        { name: 'C4 - Coesão e Coerência', score: 160, feedback: 'Emprego correto dos conectivos essenciais.' },
        { name: 'C5 - Proposta de Intervenção', score: 160, feedback: 'Proposta razoável, porém com detalhamento genérico.' }
      ],
      generalComment: 'Bom texto dissertativo! Com a adição de repertórios socioculturais, a nota subirá significativamente.',
      aiDetected: false,
      zeroReason: null,
      strengths: ['Boa estrutura dissertativa', 'Clareza comunicativa'],
      priorityImprovements: ['Incorporar dados estatísticos ou conceitos de pensadores para validar a tese']
    }
  },
  {
    id: 'essay-demo-5',
    tema: 'Os Desafios da Inteligência Artificial no Século XXI',
    conteudo: 'A inteligência artificial tem avançado bastante e mudando muito o mercado de trabalho. Isso traz riscos de desemprego e fake news que precisam ser combatidos urgentemente pelas autoridades...',
    score: 480,
    data_envio: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
    student_name: 'Enzo Ferreira Lima',
    student_id: 'student-demo-4',
    class_id: 'turma-demo-1',
    school_id: 'demo-school',
    result: {
      totalScore: 480,
      competencies: [
        { name: 'C1 - Domínio da Norma Culta', score: 100, feedback: 'Desvios recorrentes de concordância, pontuação e marcas de oralidade.' },
        { name: 'C2 - Compreensão da Proposta', score: 100, feedback: 'Tangenciamento parcial com reflexão rasa sobre o tema.' },
        { name: 'C3 - Seleção e Organização', score: 100, feedback: 'Ideias truncadas e falta de progressão argumentativa.' },
        { name: 'C4 - Coesão e Coerência', score: 100, feedback: 'Repetição constante dos mesmos conectivos.' },
        { name: 'C5 - Proposta de Intervenção', score: 80, feedback: 'Proposta embrionária sem especificação de agente ou meio.' }
      ],
      generalComment: 'Requer acompanhamento individual de redação com foco em planejamento de texto e gramática.',
      aiDetected: false,
      zeroReason: null,
      strengths: ['Demonstra interesse no assunto da atualidade'],
      priorityImprovements: ['Revisão das regras básicas de concordância', 'Elaboração de rascunho com introdução, 2 desenvolvimentos e conclusão']
    }
  }
];

export const getClassesBySchool = async (schoolId: string): Promise<ClassGroup[]> => {
  if (schoolId === 'demo-school') {
    const stored = localStorage.getItem('scritta_demo_classes');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    localStorage.setItem('scritta_demo_classes', JSON.stringify(DEFAULT_DEMO_CLASSES));
    return DEFAULT_DEMO_CLASSES;
  }

  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('school_id', schoolId);

  if (error) throw error;

  return (data || []).map(c => ({
    id: c.id,
    name: c.name,
    grade: c.year ? c.year.toString() : '',
    shift: (c.shift || 'Matutino') as ClassGroup['shift'],
    studentCount: c.student_count || 0,
    averageScore: c.average_score || 0,
    school_id: c.school_id,
    trend: c.trend || 'neutral',
    invite_code: c.invite_code
  }));
};

export const getStudentsByContext = async (schoolId: string, classId?: string): Promise<StudentDetail[]> => {
  if (schoolId === 'demo-school') {
    let allLocalStudents: StudentDetail[] = [];
    const stored = localStorage.getItem('scritta_demo_students');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) allLocalStudents = parsed;
      } catch {}
    }
    if (allLocalStudents.length === 0) {
      allLocalStudents = DEFAULT_DEMO_STUDENTS;
      localStorage.setItem('scritta_demo_students', JSON.stringify(DEFAULT_DEMO_STUDENTS));
    }
    return (classId && classId !== 'Todas')
      ? allLocalStudents.filter((s: StudentDetail) => s.class_id === classId)
      : allLocalStudents;
  }

  let query = supabase
    .from('profiles')
    .select('*')
    .eq('role', 'student')
    .eq('school_id', schoolId);

  if (classId && classId !== 'Todas') {
    query = query.eq('class_id', classId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(s => ({
    id: s.id,
    name: s.full_name,
    email: s.email,
    averageScore: s.average_score || 0,
    essaysSubmitted: s.essays_count || 0,
    lastActivity: "Recente",
    status: s.status === 'invited' ? 'invited' : ((s.essays_count || 0) > 0 && (s.average_score || 0) < 500 ? 'risk' : (s.status || 'active')),
    class_id: s.class_id,
    school_id: s.school_id,
    birth_date: s.birth_date,
    registration_number: s.registration_number
  }));
};

export const getProfessorsBySchool = async (schoolId: string) => {
  if (schoolId === 'demo-school') {
    const stored = localStorage.getItem('scritta_demo_professors');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    localStorage.setItem('scritta_demo_professors', JSON.stringify(DEFAULT_DEMO_PROFESSORS));
    return DEFAULT_DEMO_PROFESSORS;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['teacher', 'professor'])
    .eq('school_id', schoolId);

  if (error) throw error;
  return data;
};

export const getAllInstitutionalEssays = async (schoolId: string, classId?: string) => {
  if (schoolId === 'demo-school') {
    const stored = localStorage.getItem('scritta_demo_institutional_essays');
    let allEssays = DEFAULT_DEMO_ESSAYS;
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) allEssays = parsed;
      } catch {}
    }
    return (classId && classId !== 'Todas')
      ? allEssays.filter(e => e.class_id === classId)
      : allEssays;
  }

  let query = supabase
    .from('redacoes')
    .select('*')
    .eq('school_id', schoolId);

  if (classId && classId !== 'Todas') {
    query = query.eq('class_id', classId);
  }

  const { data, error } = await query.order('data_envio', { ascending: false });

  if (error) throw error;

  return (data || []).map(item => {
    const metadata = typeof item.user_metadata === 'string' ? JSON.parse(item.user_metadata) : item.user_metadata;
    return {
      id: item.id,
      tema: item.tema,
      conteudo: item.conteudo,
      score: item.total_score,
      data_envio: item.data_envio,
      student_name: metadata?.full_name || item.student_name || "Aluno Externo",
      student_id: item.user_id,
      class_id: item.class_id,
      school_id: item.school_id,
      result: {
        totalScore: item.total_score,
        competencies: item.competencias_json ? (typeof item.competencias_json === 'string' ? JSON.parse(item.competencias_json) : item.competencias_json) : [],
        generalComment: item.comentario_geral || "",
        aiDetected: false,
        zeroReason: item.zero_reason || null,
        strengths: item.strengths_json ? (typeof item.strengths_json === 'string' ? JSON.parse(item.strengths_json) : item.strengths_json) : [],
        priorityImprovements: item.improvements_json ? (typeof item.improvements_json === 'string' ? JSON.parse(item.improvements_json) : item.improvements_json) : [],
        annotations: item.annotations_json ? (typeof item.annotations_json === 'string' ? JSON.parse(item.annotations_json) : item.annotations_json) : [],
      }
    };
  }) as SavedEssay[];
};

export const getUserStats = async (userId: string) => {
  // MODO DEMO
  if (isDemoUserId(userId)) {
    const localKey = `scritta_history_${userId}`;
    const history = JSON.parse(localStorage.getItem(localKey) || '[]');
    return calculateDetailedMetrics(history);
  }

  // MODO ONLINE
  const { data, error } = await supabase
    .from('redacoes')
    .select('*')
    .eq('user_id', userId)
    .order('data_envio', { ascending: false });

  if (error) {
    console.error("Erro ao buscar histórico:", error);
    // Retorna vazio em caso de erro, sem fallback para local storage de usuário real
    return calculateDetailedMetrics([]);
  }

  const history = data.map(item => ({
    id: item.id,
    tema: item.tema,
    conteudo: item.conteudo,
    score: item.total_score || 0,
    data_envio: item.data_envio,
    result: item.competencias_json ? {
      totalScore: item.total_score,
      competencies: typeof item.competencias_json === 'string' ? JSON.parse(item.competencias_json) : item.competencias_json,
      generalComment: item.comentario_geral || "",
      aiDetected: false,
      zeroReason: item.zero_reason || null,
      strengths: item.strengths_json ? (typeof item.strengths_json === 'string' ? JSON.parse(item.strengths_json) : item.strengths_json) : [],
      priorityImprovements: item.improvements_json ? (typeof item.improvements_json === 'string' ? JSON.parse(item.improvements_json) : item.improvements_json) : [],
      annotations: item.annotations_json ? (typeof item.annotations_json === 'string' ? JSON.parse(item.annotations_json) : item.annotations_json) : [],
    } : undefined
  }));

  return calculateDetailedMetrics(history);
};

export const getSchoolPeerRankings = async (
  schoolId?: string | null,
  classId?: string | null
): Promise<RankUser[]> => {
  if (!schoolId || schoolId === 'demo-school' || schoolId === 'demo') {
    return [];
  }

  try {
    // 1. Preferencia pela RPC SECURITY DEFINER (agrega notas sem expor redacoes de colegas)
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_school_peer_rankings', {
      p_school_id: schoolId,
    });

    if (!rpcError && Array.isArray(rpcData)) {
      const mapped = rpcData.map((row: any) => {
        const name = row.full_name || 'Estudante';
        return {
          id: row.id,
          name,
          avatar:
            row.avatar_url ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563eb&color=fff`,
          points: Number(row.points || 0),
          essaysCount: Number(row.essays_count || 0),
          school: row.school_name || 'Minha Escola',
          school_id: schoolId,
          className: row.class_name || 'Sem Turma',
          class_id: row.class_id || undefined,
          isCurrentUser: false,
          trend: 'neutral',
        } as RankUser;
      });
      return classId && classId !== 'Todas'
        ? mapped.filter((u) => u.class_id === classId)
        : mapped;
    }

    // 2. Fallback caso a migration da RPC ainda nao tenha sido aplicada
    let profilesQuery = supabase
      .from('profiles')
      .select('id, full_name, avatar_url, class_id, school_id, essays_count, average_score')
      .eq('school_id', schoolId)
      .eq('role', 'student');

    if (classId && classId !== 'Todas') {
      profilesQuery = profilesQuery.eq('class_id', classId);
    }

    const [profilesRes, classesRes, schoolRes, essaysRes] = await Promise.all([
      profilesQuery,
      supabase.from('classes').select('id, name').eq('school_id', schoolId),
      supabase.from('schools').select('id, name').eq('id', schoolId).maybeSingle(),
      supabase
        .from('redacoes')
        .select('user_id, total_score, status')
        .eq('school_id', schoolId)
        .eq('status', 'corrigida'),
    ]);

    if (profilesRes.error || !profilesRes.data) {
      return [];
    }

    const classMap = new Map<string, string>();
    (classesRes.data || []).forEach((c: any) => {
      if (c?.id) classMap.set(c.id, c.name || 'Sem Turma');
    });

    const essayTotals = new Map<string, { points: number; count: number }>();
    if (!essaysRes.error && Array.isArray(essaysRes.data)) {
      essaysRes.data.forEach((r: any) => {
        if (!r?.user_id) return;
        const curr = essayTotals.get(r.user_id) || { points: 0, count: 0 };
        curr.points += Number(r.total_score || 0);
        curr.count += 1;
        essayTotals.set(r.user_id, curr);
      });
    }

    const schoolName = schoolRes.data?.name || 'Minha Escola';

    return profilesRes.data
      .map((p: any) => {
        const fromEssays = essayTotals.get(p.id);
        const essaysCount = fromEssays ? fromEssays.count : Number(p.essays_count || 0);
        const points = fromEssays
          ? fromEssays.points
          : Math.round(Number(p.average_score || 0) * Number(p.essays_count || 0));
        const name = p.full_name || 'Estudante';

        return {
          id: p.id,
          name,
          avatar:
            p.avatar_url ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563eb&color=fff`,
          points,
          essaysCount,
          school: schoolName,
          school_id: p.school_id,
          className: (p.class_id && classMap.get(p.class_id)) || 'Sem Turma',
          class_id: p.class_id,
          isCurrentUser: false,
          trend: 'neutral',
        } as RankUser;
      })
      .sort((a, b) => b.points - a.points);
  } catch (err) {
    console.warn('[getSchoolPeerRankings] Erro ao buscar ranking escolar:', err);
    return [];
  }
};

// --- ASSIGNMENTS ---
export const notifyStudentsAboutAssignment = async (assignment: { id: string; title: string; base_text?: string; description?: string; class_id: string; school_id?: string; due_date?: string }, schoolId: string) => {
  try {
    const students = await getStudentsByContext(schoolId, assignment.class_id);
    const textBase = assignment.base_text || assignment.description || 'Tema de redação.';
    const dueDateStr = assignment.due_date ? new Date(assignment.due_date).toLocaleDateString('pt-BR') : 'Sem prazo definido';

    // Disparar e-mails para alunos encontrados via Edge Function
    for (const student of students) {
      if (student.email) {
        supabase.functions.invoke('send-notification', {
          body: {
            email: student.email,
            subject: `[Littera] Novo Desafio de Redação: ${assignment.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9fb; border-radius: 12px;">
                <h2 style="color: #4F46E5;">🎯 Novo Desafio Atribuído!</h2>
                <p>Olá, <strong>${student.name}</strong>!</p>
                <p>O seu professor lançou um novo desafio de redação no Littera:</p>
                <div style="background-color: #ffffff; padding: 15px; border-left: 4px solid #4F46E5; border-radius: 8px; margin: 15px 0;">
                  <h3 style="margin: 0 0 10px 0; color: #1e293b;">${assignment.title}</h3>
                  <p style="margin: 0; color: #64748b; font-size: 14px;">${textBase}</p>
                </div>
                <p><strong>⏳ Prazo de entrega:</strong> ${dueDateStr}</p>
                <div style="text-align: center; margin: 25px 0;">
                  <a href="https://www.littera.app.br" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Escrever Redação Agora</a>
                </div>
                <p style="color: #94a3b8; font-size: 12px; text-align: center;">Você recebeu este e-mail porque é um aluno cadastrado no Littera.</p>
              </div>
            `
          }
        }).catch(err => console.log('Envio de e-mail (modo demo/offline):', err));
      }
    }

    // Salvar notificação in-app (Supabase Bulk Insert)
    const newNotifications = students.map(student => ({
      user_id: student.id,
      type: 'assignment',
      title: '🎯 ' + assignment.title,
      message: `Novo desafio de redação! Prazo: ${dueDateStr}. ${textBase.slice(0, 80)}...`,
    }));

    if (newNotifications.length > 0 && schoolId !== 'demo-school') {
      const { error: notifError } = await supabase.from('notifications').insert(newNotifications);
      if (notifError) console.error('Error inserting notifications:', notifError);
    }

    // Demo compatibility somente no modo demo
    if (schoolId === 'demo-school') {
      const customNotifs = JSON.parse(localStorage.getItem('scritta_custom_notifications') || '[]');
      const newNotif = {
        id: generateUUID(),
        type: 'assignment',
        title: '🎯 ' + assignment.title,
        message: `Novo desafio de redação! Prazo: ${dueDateStr}. ${textBase.slice(0, 80)}...`,
        timestamp: 'Agora',
        read: false,
      };
      localStorage.setItem('scritta_custom_notifications', JSON.stringify([newNotif, ...customNotifs]));
    }
  } catch (error) {
    console.error('Falha ao notificar alunos:', error);
  }
};

export const createAssignment = async (assignmentData: { title: string; base_text: string; class_id: string; school_id: string; due_date?: string }) => {
  const { data: { session } } = await supabase.auth.getSession();
  const isDemo =
    !session ||
    isDemoUserId(session.user.id) ||
    assignmentData.school_id === 'demo-school';
  const schoolId = isDemo ? 'demo-school' : assignmentData.school_id;

  const newAssignment = {
    id: generateUUID(),
    title: assignmentData.title,
    base_text: assignmentData.base_text,
    description: assignmentData.base_text,
    class_id: assignmentData.class_id,
    school_id: schoolId,
    due_date: assignmentData.due_date || '',
    created_at: new Date().toISOString()
  };

  if (isDemo) {
    const currentDemoAssignments = JSON.parse(localStorage.getItem('scritta_demo_assignments') || '[]');
    localStorage.setItem('scritta_demo_assignments', JSON.stringify([newAssignment, ...currentDemoAssignments]));
    notifyStudentsAboutAssignment(newAssignment, 'demo-school');
    return newAssignment;
  }

  // Real Mode
  const { data, error } = await supabase
    .from('assignments')
    .insert([{
      title: assignmentData.title,
      description: assignmentData.base_text,
      class_id: assignmentData.class_id,
      school_id: schoolId,
      due_date: assignmentData.due_date || null,
      created_by: session.user.id
    }])
    .select()
    .single();

  if (error) {
    throw error;
  }

  notifyStudentsAboutAssignment(
    {
      ...newAssignment,
      id: data?.id || newAssignment.id,
    },
    schoolId
  );

  return data;
};

export const getStudentAssignments = async (schoolId?: string, classId?: string): Promise<Assignment[]> => {
  if (schoolId === 'demo-school' || schoolId === 'demo') {
    const localAssignments = JSON.parse(localStorage.getItem('scritta_demo_assignments') || '[]');
    if (localAssignments.length === 0) {
      const defaultDemoAssignment: Assignment = {
        id: 'demo-challenge-1',
        title: 'Os Desafios da Inteligência Artificial no Século XXI',
        base_text: 'A IA está transformando o mercado de trabalho, a educação e a sociedade. Escreva uma redação dissertativa-argumentativa propondo caminhos para uma adoção ética e sustentável dessa tecnologia.',
        description: 'A IA está transformando o mercado de trabalho, a educação e a sociedade. Escreva uma redação dissertativa-argumentativa propondo caminhos para uma adoção ética e sustentável dessa tecnologia.',
        class_id: classId || 'Turma A',
        school_id: 'demo-school',
        due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      };
      return [defaultDemoAssignment];
    }
    return localAssignments;
  }

  if (!schoolId) {
    return [];
  }

  try {
    let query = supabase.from('assignments').select('*').eq('school_id', schoolId);
    if (classId && classId !== 'Todas') {
      query = query.eq('class_id', classId);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('Erro ao buscar assignments do Supabase:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('Erro inesperado em getStudentAssignments:', err);
    return [];
  }
};

const calculateDetailedMetrics = (history: SavedEssay[]) => {
  const totalEssays = history.length;
  if (totalEssays === 0) return { totalEssays: 0, averageScore: 0, totalPoints: 0, history: [], competencyAverages: [] };
  const totalPoints = history.reduce((acc, curr) => acc + curr.score, 0);
  const compTotals: Record<string, { sum: number, count: number }> = {};
  history.forEach(essay => {
    if (essay.result?.competencies) {
      essay.result.competencies.forEach(c => {
        if (!compTotals[c.name]) compTotals[c.name] = { sum: 0, count: 0 };
        compTotals[c.name].sum += c.score;
        compTotals[c.name].count += 1;
      });
    }
  });
  const competencyAverages = Object.entries(compTotals).map(([name, data]) => ({ name, average: Math.round(data.sum / data.count) }));
  return { totalEssays, averageScore: Math.round(totalPoints / totalEssays), totalPoints, history, competencyAverages };
};

// --- RECOVERY & CUSTOM NOTIFICATIONS MODE ---
export const getNotifications = async (userId: string): Promise<Notification[]> => {
  if (isDemoUserId(userId)) {
    return JSON.parse(localStorage.getItem('scritta_custom_notifications') || '[]');
  }
  
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });
    
  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
  return data || [];
};

export const markNotificationAsRead = async (id: string, userId?: string) => {
  if (isDemoUserId(userId) || id.startsWith('demo-')) {
    const customNotifs = JSON.parse(localStorage.getItem('scritta_custom_notifications') || '[]');
    const updated = customNotifs.map((n: any) => n.id === id ? { ...n, read: true } : n);
    localStorage.setItem('scritta_custom_notifications', JSON.stringify(updated));
    return;
  }
  
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id);
    
  if (error) console.error('Error marking notification as read:', error);
};

export const markAllNotificationsRead = async (userId: string) => {
  if (isDemoUserId(userId)) {
    const customNotifs = JSON.parse(localStorage.getItem('scritta_custom_notifications') || '[]');
    const updated = customNotifs.map((n: any) => ({ ...n, read: true }));
    localStorage.setItem('scritta_custom_notifications', JSON.stringify(updated));
    return;
  }
  
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
    
  if (error) console.error('Error marking all notifications as read:', error);
};