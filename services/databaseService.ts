import { supabase } from '../supabaseClient';
import { EssayInput, CorrectionResult, SavedEssay, Assignment, School, ClassGroup, StudentDetail, BulkStudentRow } from '../types';

export const JOURNEY_TIERS = [
  { min: 0, max: 2, label: 'Aspirante', icon: 'edit', color: 'text-gray-400', bg: 'bg-gray-100', next: 3 },
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
  if (userId === 'demo' || userId === 'demo-user') {
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

  // MODO ONLINE: Salva no Supabase
  try {
    const dbPayload = {
      tema: topicTitle,
      conteudo: content,
      status: 'corrigida',
      data_envio: new Date().toISOString(),
      user_id: userId,
      total_score: result?.totalScore || 0,
      competencias_json: result ? JSON.stringify(result.competencies) : null,
      comentario_geral: result?.generalComment || "",
      user_metadata: userMetadata ? JSON.stringify(userMetadata) : null,
      student_name: userMetadata?.full_name || null,
      school_id: userMetadata?.school_id || null,
      class_id: userMetadata?.class_id || null
    };

    const { data, error } = await supabase
      .from('redacoes')
      .insert([dbPayload])
      .select();

    if (error) throw error;

    // Tenta incrementar contador, mas não bloqueia se falhar
    const { error: rpcError } = await supabase.rpc('increment_essay_count', { user_id: userId, score: result?.totalScore || 0 });
    if (rpcError) console.error(rpcError);

    return data;
  } catch (error: any) {
    console.error("Erro ao salvar no banco:", error);
    throw error; // Propaga erro para a UI tratar
  }
};

export const getSchoolData = async (schoolId?: string | null): Promise<School | null> => {
  // Modo demo explícito
  if (!schoolId || schoolId === 'demo-school') {
    if (schoolId === 'demo-school') {
      return { id: 'demo', name: "Escola Exemplo", city: "Demonstração" };
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
  const { data, error } = await supabase
    .from('classes')
    .insert([classData])
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    grade: data.grade,
    shift: data.shift as ClassGroup['shift'],
    studentCount: 0,
    averageScore: 0,
    school_id: data.school_id,
    trend: 'neutral'
  };
};

export const createProfessor = async (profData: { name: string; email: string; school_id: string; class_id: string }) => {
  // MODO DEMO
  if (profData.school_id === 'demo-school') {
    const mockProfessor = {
      id: generateUUID(),
      full_name: profData.name,
      email: profData.email,
      role: 'professor',
      school_id: profData.school_id,
      class_id: profData.class_id
    };
    const currentProfs = JSON.parse(localStorage.getItem('scritta_demo_professors') || '[]');
    localStorage.setItem('scritta_demo_professors', JSON.stringify([...currentProfs, mockProfessor]));
    return mockProfessor;
  }

  // MODO REAL
  const { data, error } = await supabase
    .from('profiles')
    .insert([{
      id: generateUUID(), // Nota: Idealmente seria o ID do Auth, mas para convite usamos placeholder
      full_name: profData.name,
      email: profData.email,
      role: 'professor',
      school_id: profData.school_id,
      class_id: profData.class_id,
      status: 'invited' // Marcado como convidado
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const createStudent = async (studentData: { name: string; email: string; school_id: string; class_id: string; registration_number?: string }): Promise<StudentDetail | null> => {
  // MODO DEMO
  if (studentData.school_id === 'demo-school') {
    const mockStudent: StudentDetail = {
      id: generateUUID(),
      name: studentData.name,
      email: studentData.email,
      averageScore: 0,
      essaysSubmitted: 0,
      lastActivity: "Novo",
      status: 'active',
      class_id: studentData.class_id,
      school_id: studentData.school_id,
      registration_number: studentData.registration_number
    };
    const currentStudents = JSON.parse(localStorage.getItem('scritta_demo_students') || '[]');
    localStorage.setItem('scritta_demo_students', JSON.stringify([...currentStudents, mockStudent]));
    return mockStudent;
  }

  // MODO REAL
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', studentData.email)
    .single();

  if (existingUser) {
    throw new Error("Este e-mail já está cadastrado no sistema.");
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert([{
      id: generateUUID(), // Placeholder ID
      full_name: studentData.name,
      email: studentData.email,
      role: 'student',
      school_id: studentData.school_id,
      class_id: studentData.class_id,
      // registration_number: studentData.registration_number, // Coluna ainda não existe no banco
      status: 'invited'
    }])
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.full_name,
    email: data.email,
    averageScore: 0,
    essaysSubmitted: 0,
    lastActivity: "Novo",
    status: 'active',
    class_id: data.class_id,
    school_id: data.school_id,
    registration_number: data.registration_number
  };
};

export const createStudentsBulk = async (students: { name: string; email: string; class_id: string; registration_number?: string }[], schoolId: string) => {
  const results = {
    success: [] as StudentDetail[],
    errors: [] as { email: string, reason: string }[]
  };

  for (const student of students) {
    try {
      const result = await createStudent({
        ...student,
        school_id: schoolId
      });
      if (result) {
        results.success.push(result);
      }
    } catch (err: any) {
      results.errors.push({
        email: student.email,
        reason: err.message || "Erro desconhecido"
      });
    }
  }

  return results;
};

export const getClassesBySchool = async (schoolId: string): Promise<ClassGroup[]> => {
  if (schoolId === 'demo-school') {
    return JSON.parse(localStorage.getItem('scritta_demo_classes') || '[]');
  }

  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('school_id', schoolId);

  if (error) throw error;

  return (data || []).map(c => ({
    id: c.id,
    name: c.name,
    grade: c.grade,
    shift: c.shift as ClassGroup['shift'],
    studentCount: c.student_count || 0,
    averageScore: c.average_score || 0,
    school_id: c.school_id,
    trend: 'neutral'
  }));
};

export const getStudentsByContext = async (schoolId: string, classId?: string): Promise<StudentDetail[]> => {
  if (schoolId === 'demo-school') {
    const allLocalStudents = JSON.parse(localStorage.getItem('scritta_demo_students') || '[]');
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
    status: s.status === 'invited' ? 'invited' : ((s.average_score || 0) < 500 ? 'risk' : 'active'),
    class_id: s.class_id,
    school_id: s.school_id,
    birth_date: s.birth_date,
    registration_number: s.registration_number
  }));
};

export const getProfessorsBySchool = async (schoolId: string) => {
  if (schoolId === 'demo-school') {
    return JSON.parse(localStorage.getItem('scritta_demo_professors') || '[]');
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'professor')
    .eq('school_id', schoolId);

  if (error) throw error;
  return data;
};

export const getAllInstitutionalEssays = async (schoolId: string, classId?: string) => {
  if (schoolId === 'demo-school') return [];

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
        aiDetected: false
      }
    };
  }) as SavedEssay[];
};

export const getUserStats = async (userId: string) => {
  // MODO DEMO
  if (userId === 'demo' || userId === 'demo-user') {
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
      aiDetected: false
    } : undefined
  }));

  return calculateDetailedMetrics(history);
};

// --- ASSIGNMENTS ---
export const createAssignment = async (assignmentData: { title: string; base_text: string; class_id: string; school_id: string; due_date?: string }) => {
  const { data: { session } } = await supabase.auth.getSession();

  // Demo / Local Mode
  if (!session || session.user.id === 'demo' || session.user.user_metadata?.school_id === 'demo-school') {
    const newAssignment = {
      id: generateUUID(),
      ...assignmentData,
      created_at: new Date().toISOString()
    };
    // Simulate success
    return newAssignment;
  }

  // Real Mode
  const { data, error } = await supabase
    .from('assignments')
    .insert([{
      title: assignmentData.title,
      description: assignmentData.base_text,
      class_id: assignmentData.class_id,
      school_id: assignmentData.school_id,
      due_date: assignmentData.due_date,
      created_by: session.user.id
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating assignment:', error);
    // If the table doesn't exist or other error
    throw error;
  }
  return data;
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

// --- STUBS FOR RECOVERY MODE ---
export const getNotifications = async (userId: string) => [];
export const markNotificationAsRead = async (id: string) => { };
export const markAllNotificationsRead = async (userId: string) => { };