
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { StudentDetail, ClassGroup, SavedEssay, School, RankUser } from '../types';
import {
  getAllInstitutionalEssays,
  getClassesBySchool,
  getStudentsByContext,
  getSchoolData,
  getProfessorsBySchool,
  createClass,
  createProfessor,
  createStudent,
  createAssignment,
  revokeInvite
} from '../services/databaseService';
import { generateAssignmentTheme } from '../services/geminiService';
import RankingView from './RankingView';

interface InstitutionDashboardProps {
  initialTab?: 'overview' | 'students' | 'essays' | 'ranking' | 'classes' | 'staff' | 'settings' | 'subscription';
  userType?: 'teacher' | 'school_admin';
}

const ITEMS_PER_PAGE = 8;

const InstitutionDashboard: React.FC<InstitutionDashboardProps> = ({ initialTab = 'overview', userType = 'school_admin' }) => {
  const navigate = useNavigate();

  // Helper: busca o school_id real do usuário (metadados ou tabela profiles)
  const getResolvedSchoolId = async (session: any): Promise<string> => {
    const fromMeta = session?.user?.user_metadata?.school_id;
    if (fromMeta) return fromMeta;
    if (session?.user?.id) {
      const { data } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', session.user.id)
        .single();
      if (data?.school_id) return data.school_id;
    }
    return 'demo-school';
  };
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // ── Toast Notification ──
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; title: string; message: string } | null>(null);
  const showToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 6000);
  };

  const [school, setSchool] = useState<School | null>(null);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [students, setStudents] = useState<StudentDetail[]>([]);
  const [essays, setEssays] = useState<SavedEssay[]>([]);
  const [professors, setProfessors] = useState<any[]>([]);

  const [currentPage, setCurrentPage] = useState(1);

  // States for Class Modal
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [newClass, setNewClass] = useState({ name: '', grade: '', shift: 'Matutino' });
  const [isSavingClass, setIsSavingClass] = useState(false);

  // States for Professor Modal
  const [isProfessorModalOpen, setIsProfessorModalOpen] = useState(false);
  const [newProfessor, setNewProfessor] = useState({ name: '', email: '', class_id: '' });
  const [isSavingProfessor, setIsSavingProfessor] = useState(false);

  // States for Student Modal
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: '', email: '', class_id: '', registration_number: '' });
  const [isSavingStudent, setIsSavingStudent] = useState(false);
  
  // States for Edit Student Modal
  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentDetail | null>(null);
  const [isSavingEditStudent, setIsSavingEditStudent] = useState(false);
  
  // States for Bulk Registration
  const [studentModalTab, setStudentModalTab] = useState<'single' | 'bulk'>('single');
  const [bulkEmails, setBulkEmails] = useState('');
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  // States for Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'invited'>('all');

  // States for Assignment Modal
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [newAssignment, setNewAssignment] = useState({ title: '', baseText: '', class_id: '', due_date: '' });
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Sync activeTab with prop when it changes (navigation from sidebar/navbar)
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Reset page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  useEffect(() => {
    const fetchBaseData = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          setUserEmail(session.user.email);
        }
        const userMetadata = session?.user?.user_metadata;
        const userRole = userMetadata?.user_type || 'student';
        const classId = userRole === 'teacher' ? userMetadata?.class_id : undefined;

        // Busca o school_id dos metadados OU direto da tabela profiles (fallback para novos usuários)
        let schoolId = userMetadata?.school_id;

        // Fallback 1: localStorage (logo após o cadastro, antes do metadata propagar)
        if (!schoolId) {
          schoolId = localStorage.getItem('checkout_schoolId') || undefined;
        }

        // Fallback 2: tabela profiles
        if (!schoolId && session?.user?.id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('school_id')
            .eq('id', session.user.id)
            .single();
          schoolId = profileData?.school_id;
        }

        // Só usa 'demo-school' se não houver sessão real
        if (!schoolId) schoolId = session ? null : 'demo-school';

        // Se ainda não temos school_id com sessão real, forçar refresh da sessão e tentar novamente
        if (!schoolId && session) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          schoolId = refreshed?.session?.user?.user_metadata?.school_id;
        }

        if (!schoolId) {
          console.warn('[InstitutionDashboard] school_id não encontrado. Aguardando...');
          setLoading(false);
          return;
        }

        const [schoolData, classesData, professorsData, studentsData, essaysData] = await Promise.all([
          getSchoolData(schoolId),
          getClassesBySchool(schoolId),
          getProfessorsBySchool(schoolId),
          getStudentsByContext(schoolId, classId), // Pass classId if teacher
          getAllInstitutionalEssays(schoolId, classId) // Pass classId if teacher
        ]);

        // Prioritize metadata name if available (fixes issue where DB has email as name)
        if (schoolData) {
          if (userMetadata?.school) schoolData.name = userMetadata.school;
          if (userMetadata?.school_name) schoolData.name = userMetadata.school_name;
        }

        setSchool(schoolData);
        setClasses(classesData);
        setProfessors(professorsData);
        setStudents(studentsData);
        setEssays(essaysData);
      } catch (err) {
        console.error('[InstitutionDashboard] Erro ao carregar dados:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBaseData();
  }, [userType]); // Re-run if userType changes

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClass.name || !newClass.grade) return;

    setIsSavingClass(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const schoolId = await getResolvedSchoolId(session);

      const createdClass = await createClass({
        name: newClass.name,
        grade: newClass.grade,
        shift: newClass.shift,
        school_id: schoolId
      });

      if (createdClass) {
        setClasses(prev => [...prev, createdClass]);
        setIsClassModalOpen(false);
        setNewClass({ name: '', grade: '', shift: 'Matutino' });
        if (activeTab !== 'classes') setActiveTab('classes');
      }
    } catch (error: any) {
      const msg = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
      alert("Erro ao criar turma: " + msg);
    } finally {
      setIsSavingClass(false);
    }
  };

  const handleCreateProfessor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userType !== 'school_admin') return;
    if (!newProfessor.name || !newProfessor.email || !newProfessor.class_id) {
      showToast('error', 'Campos incompletos', 'Por favor, preencha todos os campos e selecione uma turma.');
      return;
    }

    setIsSavingProfessor(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const schoolId = await getResolvedSchoolId(session);

      const createdProf = await createProfessor({
        name: newProfessor.name,
        email: newProfessor.email,
        class_id: newProfessor.class_id,
        school_id: schoolId
      });

      if (createdProf) {
        setProfessors(prev => [...prev, createdProf]);
        setIsProfessorModalOpen(false);
        const savedEmail = newProfessor.email;
        setNewProfessor({ name: '', email: '', class_id: '' });

        if ((createdProf as any)._inviteEmailSent) {
          showToast('success', '✉️ Convite enviado!', `Um email foi enviado para ${savedEmail} com o link de ativação da conta.`);
        } else if ((createdProf as any)._inviteAlreadyExists) {
          showToast('info', 'Professor já cadastrado', `O email ${savedEmail} já possui uma conta ativa na plataforma.`);
        } else {
          showToast('info', 'Professor adicionado', `Registro criado para ${savedEmail}. O envio de email pode ter falhado — verifique a configuração da Edge Function.`);
        }
      }
    } catch (error: any) {
      const msg = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
      showToast('error', 'Erro ao cadastrar professor', msg);
    } finally {
      setIsSavingProfessor(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userType !== 'school_admin') return;
    if (!newStudent.name || !newStudent.email) {
      showToast('error', 'Campos incompletos', 'Por favor, preencha os campos obrigatórios.');
      return;
    }

    setIsSavingStudent(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const schoolId = await getResolvedSchoolId(session);

      const createdStudent = await createStudent({
        name: newStudent.name,
        email: newStudent.email,
        class_id: newStudent.class_id || undefined,
        school_id: schoolId,
        registration_number: newStudent.registration_number
      });

      if (createdStudent) {
        setStudents(prev => [createdStudent, ...prev]);
        setIsStudentModalOpen(false);
        const savedEmail = newStudent.email;
        const savedName = newStudent.name;
        setNewStudent({ name: '', email: '', class_id: '', registration_number: '' });
        if (activeTab !== 'students') setActiveTab('students');
        showToast('success', '✉️ Convite enviado!', `Email de ativação enviado para ${savedEmail}. ${savedName} receberá um link para criar a senha e acessar a plataforma.`);
      }
    } catch (error: any) {
      const msg = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
      showToast('error', 'Erro ao cadastrar aluno', msg || 'Verifique se o e-mail já existe.');
    } finally {
      setIsSavingStudent(false);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userType !== 'school_admin' || !editingStudent) return;
    
    setIsSavingEditStudent(true);
    try {
      // Import updateStudentProfile dynamically if not imported, or since we exported it in databaseService, we need to make sure we import it.
      // Wait, we can import it above. Let's assume it's imported (will add it to imports later).
      const updates = {
        full_name: editingStudent.name,
        class_id: editingStudent.class_id,
        registration_number: editingStudent.registration_number
      };
      
      const { updateStudentProfile } = await import('../services/databaseService');
      await updateStudentProfile(editingStudent.id, updates);
      
      setStudents(prev => prev.map(s => s.id === editingStudent.id ? { ...s, ...updates } : s));
      setIsEditStudentModalOpen(false);
      setEditingStudent(null);
      showToast('success', '✅ Aluno atualizado!', `Os dados de ${editingStudent.name} foram atualizados com sucesso.`);
    } catch (error: any) {
      showToast('error', 'Erro ao atualizar aluno', error?.message || 'Tente novamente.');
    } finally {
      setIsSavingEditStudent(false);
    }
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n');
    const result: { name: string, email: string, role: 'student' }[] = [];
    // Pula cabeçalho
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(',');
      if (parts.length >= 2) {
        result.push({ name: parts[0].trim(), email: parts[1].trim(), role: 'student' });
      } else if (parts.length === 1 && parts[0].includes('@')) {
        result.push({ name: '', email: parts[0].trim(), role: 'student' });
      }
    }
    return result;
  };

  const parseXML = (xmlText: string) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    const alunos = xmlDoc.getElementsByTagName('aluno');
    const result: { name: string, email: string, role: 'student' }[] = [];
    for (let i = 0; i < alunos.length; i++) {
      const name = alunos[i].getElementsByTagName('nome')[0]?.textContent || '';
      const email = alunos[i].getElementsByTagName('email')[0]?.textContent || '';
      if (email) {
        result.push({ name: name.trim(), email: email.trim(), role: 'student' });
      }
    }
    return result;
  };

  const handleBulkRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingBulk(true);
    
    let usersToRegister: { name: string, email: string, role: 'student' }[] = [];

    // Tenta ler os e-mails colados
    if (bulkEmails.trim()) {
      const emails = bulkEmails.split(/[,;\n]+/).map(e => e.trim()).filter(e => e.includes('@'));
      emails.forEach(email => {
        usersToRegister.push({ name: '', email, role: 'student' });
      });
    }

    // Tenta ler o arquivo
    if (bulkFile) {
      try {
        const text = await bulkFile.text();
        if (bulkFile.name.endsWith('.xml')) {
          usersToRegister = usersToRegister.concat(parseXML(text));
        } else if (bulkFile.name.endsWith('.csv')) {
          usersToRegister = usersToRegister.concat(parseCSV(text));
        }
      } catch (err) {
        showToast('error', 'Erro ao ler arquivo', 'Verifique a formatação do arquivo XML/CSV.');
        setIsProcessingBulk(false);
        return;
      }
    }

    if (usersToRegister.length === 0) {
      showToast('error', 'Nenhum aluno encontrado', 'Adicione e-mails na caixa de texto ou envie um arquivo válido.');
      setIsProcessingBulk(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const schoolId = await getResolvedSchoolId(session);
      
      const { data, error } = await supabase.functions.invoke('bulk-register', {
        body: {
          users: usersToRegister,
          school_id: schoolId,
          class_id: newStudent.class_id || undefined
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const updatedStudents = await getStudentsByContext(schoolId);
      setStudents(updatedStudents);

      showToast('success', '✅ Lote Processado!', `${data.success} alunos convidados com sucesso. ${data.failed} falhas.`);
      
      setIsStudentModalOpen(false);
      setBulkEmails('');
      setBulkFile(null);
      setNewStudent({ name: '', email: '', class_id: '', registration_number: '' });
      if (activeTab !== 'students') setActiveTab('students');
      
    } catch (error: any) {
      const msg = error?.message || 'Falha ao processar o lote no servidor.';
      showToast('error', 'Erro no cadastro em lote', msg);
    } finally {
      setIsProcessingBulk(false);
    }
  };


  const [resendingEmail, setResendingEmail] = useState<string | null>(null);
  const [revokingEmail, setRevokingEmail] = useState<string | null>(null);

  const handleResendInvite = async (person: { name: string; email: string; class_id?: string }, role: 'student' | 'professor') => {
    if (userType !== 'school_admin') return;
    setResendingEmail(person.email);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const schoolId = await getResolvedSchoolId(session);
      if (role === 'professor') {
        await createProfessor({
          name: person.name,
          email: person.email,
          class_id: person.class_id || '',
          school_id: schoolId
        });
      } else {
        await createStudent({
          name: person.name,
          email: person.email,
          class_id: person.class_id || '',
          school_id: schoolId
        });
      }
      showToast('success', '✉️ Convite reenviado!', `Um novo e-mail de ativação foi enviado para ${person.email}.`);
    } catch (error: any) {
      const msg = error?.message || String(error);
      showToast('error', 'Erro ao reenviar convite', msg);
    } finally {
      setResendingEmail(null);
    }
  };

  const handleRevokeInvite = async (email: string, role: 'student' | 'professor') => {
    if (userType !== 'school_admin') return;
    if (!window.confirm(`Tem certeza que deseja revogar e remover o convite para ${email}?`)) return;
    setRevokingEmail(email);
    try {
      const res = await revokeInvite(email);
      if (res.success) {
        if (role === 'professor') {
          setProfessors(prev => prev.filter(p => p.email !== email));
        } else {
          setStudents(prev => prev.filter(s => s.email !== email));
        }
        showToast('success', '🗑️ Convite revogado', `O convite para ${email} foi revogado e removido com sucesso.`);
      } else {
        throw new Error(res.message || 'Falha ao revogar');
      }
    } catch (error: any) {
      const msg = error?.message || String(error);
      showToast('error', 'Erro ao revogar convite', msg);
    } finally {
      setRevokingEmail(null);
    }
  };

  const handleGenerateAI = async () => {
    if (!newAssignment.title && !newAssignment.baseText) {
      alert("Digite pelo menos um título ou assunto para gerar o tema.");
      return;
    }

    setIsGeneratingAI(true);
    try {
      // Use the title as prompt
      const prompt = newAssignment.title || "Tema de redação atual e relevante";
      const result = await generateAssignmentTheme(prompt);

      setNewAssignment(prev => ({
        ...prev,
        title: result.title,
        baseText: result.baseText
      }));
    } catch (_error) {
      alert("Erro ao gerar tema com IA. Tente novamente.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssignment.title || !newAssignment.class_id) {
      alert("Título e Turma são obrigatórios.");
      return;
    }

    setIsSavingAssignment(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const schoolId = await getResolvedSchoolId(session);

      await createAssignment({
        title: newAssignment.title,
        base_text: newAssignment.baseText,
        class_id: newAssignment.class_id,
        school_id: schoolId,
        due_date: newAssignment.due_date
      });

      setIsAssignmentModalOpen(false);
      setNewAssignment({ title: '', baseText: '', class_id: '', due_date: '' });
      alert("🎯 Desafio de Redação criado e enviado com sucesso!\n\n📧 Os alunos da turma foram notificados por e-mail com as instruções e prazo do desafio.\n🔔 O aviso interativo com relógio regressivo já está visível na barra superior e na central de notificações do painel do aluno.");
    } catch (error: any) {
      const msg = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
      alert("Erro ao criar atividade: " + msg);
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const stats = useMemo(() => {
    if (userType === 'teacher') {
      return [
        { label: 'Meus Alunos', value: students.length, icon: 'group', color: 'bg-blue-500' },
        { label: 'Redações Entregues', value: essays.length, icon: 'edit_note', color: 'bg-primary' },
        { label: 'Média da Turma', value: Math.round(essays.reduce((acc, curr) => acc + curr.score, 0) / (essays.length || 1)), icon: 'insights', color: 'bg-emerald-500' },
      ];
    }
    return [
      { label: 'Matrículas', value: students.length, icon: 'group', color: 'bg-blue-500' },
      { label: 'Turmas', value: classes.length, icon: 'layers', color: 'bg-primary' },
      { label: 'Correções', value: essays.length, icon: 'edit_note', color: 'bg-emerald-500' },
      { label: 'Docentes', value: professors.length, icon: 'school', color: 'bg-violet-500' },
    ];
  }, [students, classes, essays, professors, userType]);

  const { monthlyCorrectionsUsed, monthlyCorrectionsQuota, monthlyQuotaPercentage } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const used = essays.filter(e => {
      if (!e.data_envio) return false;
      const d = new Date(e.data_envio);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const studentCount = school?.student_count || 0;
    const creditsPerStudent = school?.credits_per_student || 12;
    const extraCredits = school?.extra_credits || 0;
    const quota = studentCount * creditsPerStudent + extraCredits;
    const pct = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;

    return {
      monthlyCorrectionsUsed: used,
      monthlyCorrectionsQuota: quota,
      monthlyQuotaPercentage: pct,
    };
  }, [essays, school]);
  const availableTabs = useMemo(() => {
    const baseTabs = [
      { id: 'overview', label: 'Visão Geral', icon: 'dashboard' },
      { id: 'students', label: userType === 'teacher' ? 'Meus Alunos' : 'Alunos', icon: 'manage_accounts' },
      { id: 'essays', label: 'Correções', icon: 'history_edu' },
      { id: 'ranking', label: 'Rankings', icon: 'emoji_events' },
    ];

    if (userType === 'school_admin') {
      baseTabs.splice(2, 0, { id: 'classes', label: 'Turmas', icon: 'meeting_room' });
      baseTabs.splice(3, 0, { id: 'staff', label: 'Professores', icon: 'school' });
      baseTabs.push({ id: 'subscription', label: 'Assinatura', icon: 'credit_card' });
    }

    return baseTabs;
  }, [userType, userEmail]);

  const currentStudents = useMemo(() => {
    let filtered = students;

    if (statusFilter === 'active') {
      filtered = students.filter(s => s.status === 'active' || s.status === 'risk');
    } else if (statusFilter === 'invited') {
      filtered = students.filter(s => s.status === 'invited');
    }

    return filtered.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
  }, [students, currentPage, statusFilter]);

  const studentTotalPages = Math.ceil(students.length / ITEMS_PER_PAGE);

  const rankingData = useMemo(() => {
    return students.map(s => {
      const studentClass = classes.find(c => c.id === s.class_id);
      return {
        id: s.id,
        name: s.name,
        avatar: `https://ui-avatars.com/api/?name=${s.name}&background=random`,
        points: (s.averageScore || 0) * (s.essaysSubmitted || 0), // Pontos = Média * Entregas (exemplo simples)
        essaysCount: s.essaysSubmitted || 0,
        school: school?.name || "Minha Escola",
        school_id: s.school_id,
        className: studentClass?.name || "Sem Turma",
        class_id: s.class_id,
        isCurrentUser: false,
        trend: 'neutral'
      } as RankUser;
    }).sort((a, b) => b.points - a.points);
  }, [students, classes, school]);

  const toastColors = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300',
    error: 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300',
    info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300',
  };
  const toastIcons = { success: 'check_circle', error: 'error', info: 'info' };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500 font-medium">Carregando painel...</p>
      </div>
    );
  }

  if (school?.subscription_status === 'unpaid') {
    const checkoutUrl = localStorage.getItem('littera_checkout_url');
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white dark:bg-surface-dark rounded-[3rem] shadow-premium shadow-ambient border-none p-8 text-center animate-fade-in mt-8">
        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 text-amber-500 rounded-full flex items-center justify-center mb-6">
          <span className="material-icons-outlined text-4xl">hourglass_empty</span>
        </div>
        <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Aguardando Pagamento</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8">
          Sua escola foi cadastrada com sucesso! Para liberar o acesso completo, realize o pagamento no ambiente seguro do Asaas. Assim que confirmado, seu painel será desbloqueado automaticamente.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {checkoutUrl && (
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary-dark transition-colors flex items-center gap-2 shadow-lg shadow-primary/30"
            >
              <span className="material-icons-outlined">payment</span>
              Realizar Pagamento
            </a>
          )}
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"
          >
            <span className="material-icons-outlined">refresh</span>
            Já paguei, atualizar
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-6">O Asaas também enviará instruções de pagamento para o e-mail cadastrado.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up space-y-12">

      {/* ── Toast Notification ───────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[200] max-w-sm w-full animate-fade-in-up`}>
          <div className={`flex items-start gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-sm ${toastColors[toast.type]}`}>
            <span className="material-icons-outlined text-xl flex-shrink-0 mt-0.5">
              {toastIcons[toast.type]}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm">{toast.title}</p>
              <p className="text-xs mt-0.5 opacity-80 leading-relaxed">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity">
              <span className="material-icons-outlined text-lg">close</span>
            </button>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] block mb-2">
            {userType === 'teacher' ? 'Área do Docente' : 'Painel de Controle'}
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tighter font-display">
            {userType === 'school_admin' 
              ? `Seja bem-vindo(a), ${school?.name || "Escola"}` 
              : (school?.name || "Minha Instituição")}
          </h1>
        </div>

        {userType === 'teacher' && (
          <div className="flex gap-4">
            <button
              onClick={() => setIsAssignmentModalOpen(true)}
              className="px-6 py-3 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 transition-all hover:scale-105 flex items-center gap-2"
            >
              <span className="material-icons-outlined text-lg">add_task</span>
              Nova Atividade
            </button>
          </div>
        )}

        {userType === 'school_admin' && (
          <div className="flex gap-4">
            <button
              onClick={() => setIsClassModalOpen(true)}
              className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all hover:scale-105"
            >
              Criar Turma
            </button>
            <button
              onClick={() => setIsProfessorModalOpen(true)}
              className="px-6 py-3 bg-white dark:bg-surface-dark text-gray-900 dark:text-white shadow-sm border-none rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm transition-all hover:scale-105 hover:bg-gray-50 dark:hover:bg-white/5"
            >
              + Professor
            </button>
            <button
              onClick={() => setIsStudentModalOpen(true)}
              className="px-6 py-3 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 transition-all hover:scale-105"
            >
              + Aluno
            </button>
          </div>
        )}
      </header>

      {/* Grid de Métricas */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${userType === 'teacher' ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-6`}>
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-surface-dark p-8 rounded-[2.5rem] shadow-sm shadow-ambient border-none flex items-center gap-6">
            <div className={`w-14 h-14 rounded-2xl ${stat.color} flex items-center justify-center text-white shadow-lg`}>
              <span className="material-icons-outlined text-2xl">{stat.icon}</span>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-3xl font-black text-gray-900 dark:text-white font-display">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-2xl font-black text-gray-900 dark:text-white mt-8 mb-4 font-display">Painel de Controle</h2>
      <div className={`grid grid-cols-2 md:grid-cols-3 ${userType === 'teacher' ? 'lg:grid-cols-4' : 'lg:grid-cols-6'} gap-4 mb-8`}>
        {availableTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id.startsWith('admin/')) {
                navigate(`/app/${tab.id}`);
              } else {
                setActiveTab(tab.id as any);
              }
            }}
            className={`flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 outline-none focus-visible:ring-4 focus-visible:ring-primary/40 focus-visible:border-primary transition-all duration-300 group ${
              activeTab === tab.id 
              ? 'bg-primary border-primary text-white shadow-xl shadow-primary/30 scale-105 z-10' 
              : 'bg-white dark:bg-surface-dark border-transparent dark:border-white/5 text-gray-600 dark:text-gray-400 hover:border-primary/30 hover:text-gray-900 dark:hover:text-white hover:shadow-lg'
            }`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:-translate-y-1 ${
              activeTab === tab.id ? 'bg-white/20' : 'bg-gray-50 dark:bg-white/5 text-primary'
            }`}>
              <span className={`material-icons-outlined text-3xl ${activeTab === tab.id ? 'text-white' : ''}`}>
                {tab.icon}
              </span>
            </div>
            <span className="text-sm sm:text-base font-bold text-center leading-tight">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-surface-dark rounded-[3rem] shadow-premium shadow-ambient border-none overflow-hidden">


        <div className="p-10">
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fade-in">
              {/* Guia de Primeiros Passos (Empty State Conectado) */}
              {userType === 'school_admin' && (classes.length === 0 || professors.length === 0 || students.length === 0) && (
                <div className="relative overflow-hidden bg-gradient-to-br from-primary to-blue-700 rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl shadow-primary/30">
                  <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/15 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/4 pointer-events-none" />

                  <div className="relative z-10 flex flex-col gap-6">
                    <div className="flex items-start gap-5">
                      <div className="flex-shrink-0 w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                        <span className="material-icons-outlined text-white text-2xl">rocket_launch</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70 mb-1">Configuração Inicial da Escola</p>
                        <h3 className="text-2xl md:text-3xl font-black tracking-tight mb-2 font-display">
                          Complete os primeiros passos da sua instituição
                        </h3>
                        <p className="text-white/80 font-medium text-sm leading-relaxed max-w-2xl">
                          Sua assinatura está ativa! Siga as etapas abaixo para estruturar suas turmas, convidar o corpo docente e matricular os alunos.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      <button
                        onClick={() => setIsClassModalOpen(true)}
                        className={`flex items-center justify-between p-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all text-left ${
                          classes.length === 0
                            ? 'bg-white text-primary shadow-xl hover:scale-[1.02]'
                            : 'bg-white/15 text-white hover:bg-white/25'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span className="material-icons-outlined text-xl">
                            {classes.length > 0 ? 'check_circle' : 'meeting_room'}
                          </span>
                          1. Criar Primeira Turma
                        </span>
                        <span className="material-icons-outlined text-base">arrow_forward</span>
                      </button>

                      <button
                        onClick={() => setIsProfessorModalOpen(true)}
                        className={`flex items-center justify-between p-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all text-left ${
                          classes.length > 0 && professors.length === 0
                            ? 'bg-white text-primary shadow-xl hover:scale-[1.02]'
                            : 'bg-white/15 text-white hover:bg-white/25'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span className="material-icons-outlined text-xl">
                            {professors.length > 0 ? 'check_circle' : 'school'}
                          </span>
                          2. Cadastrar Professores
                        </span>
                        <span className="material-icons-outlined text-base">arrow_forward</span>
                      </button>

                      <button
                        onClick={() => setIsStudentModalOpen(true)}
                        className={`flex items-center justify-between p-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all text-left ${
                          classes.length > 0 && students.length === 0
                            ? 'bg-white text-primary shadow-xl hover:scale-[1.02]'
                            : 'bg-white/15 text-white hover:bg-white/25'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span className="material-icons-outlined text-xl">
                            {students.length > 0 ? 'check_circle' : 'group_add'}
                          </span>
                          3. Cadastrar / Importar Alunos
                        </span>
                        <span className="material-icons-outlined text-base">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ROI and General Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-surface-dark p-8 rounded-[2rem] shadow-ambient border-none relative overflow-hidden">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2">Média da Escola</p>
                  <div className="flex items-end gap-2">
                    <h3 className="text-5xl font-black text-gray-900 dark:text-white">
                      {essays.length ? Math.round(essays.reduce((a,c)=>a+c.score,0)/essays.length) : 0}
                    </h3>
                    <span className="text-xl font-bold text-gray-400 mb-1">/ 1000</span>
                  </div>
                  <div className="mt-4 w-full h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full" 
                      style={{ width: `${Math.min(100, (essays.length ? Math.round(essays.reduce((a,c)=>a+c.score,0)/essays.length) : 0) / 10)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 font-medium mt-3">Nota média calculada em todas as submissões deste ano.</p>
                </div>

                <div className="bg-white dark:bg-surface-dark p-8 rounded-[2rem] shadow-ambient border-none relative overflow-hidden">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2">Engajamento</p>
                  <div className="flex items-end gap-2">
                    <h3 className="text-5xl font-black text-gray-900 dark:text-white">
                      {students.length ? Math.round((students.filter(s => s.essaysSubmitted > 0).length / students.length) * 100) : 0}
                    </h3>
                    <span className="text-xl font-bold text-gray-400 mb-1">%</span>
                  </div>
                  <p className="text-xs text-gray-400 font-medium mt-4">Percentual de alunos que já submeteram ao menos uma redação na plataforma.</p>
                </div>

                <div className="bg-white dark:bg-surface-dark p-8 rounded-[2rem] shadow-ambient border-none relative overflow-hidden">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Franquia Mensal</p>
                  <p className="text-sm font-black text-gray-900 dark:text-white">
                    Correções no mês: {monthlyCorrectionsUsed} / {monthlyCorrectionsQuota} disponíveis
                  </p>
                  <div className="mt-4 w-full h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        monthlyQuotaPercentage >= 90 ? 'bg-rose-500' : monthlyQuotaPercentage >= 75 ? 'bg-amber-500' : 'bg-primary'
                      }`}
                      style={{ width: `${monthlyQuotaPercentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 font-medium mt-3">
                    Pool compartilhado ({school?.credits_per_student || 12} créditos/aluno contratado{school?.extra_credits ? ` + ${school.extra_credits} extras` : ''}).
                  </p>
                </div>
              </div>

              {/* Advanced Highlights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Ranking de Alunos Simplificado */}
                <div className="bg-white dark:bg-surface-dark rounded-[2rem] shadow-ambient border-none p-8 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-lg font-black text-gray-900 dark:text-white">Alunos Destaque</h4>
                    <span className="p-2 rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-500/10"><span className="material-icons-outlined text-sm">stars</span></span>
                  </div>
                  <div className="space-y-4">
                    {[...students]
                      .filter(s => s.averageScore > 0)
                      .sort((a,b) => b.averageScore - a.averageScore)
                      .slice(0, 4)
                      .map((s, idx) => {
                        const sClass = classes.find(c => c.id === s.class_id);
                        return (
                          <div key={s.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center font-bold text-gray-500 dark:text-gray-300">
                                {idx + 1}º
                              </div>
                              <div>
                                <p className="font-bold text-sm text-gray-900 dark:text-white">{s.name}</p>
                                <p className="text-xs text-gray-400">{sClass ? sClass.name : 'Ensino Médio'}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-primary">{s.averageScore}</p>
                            </div>
                          </div>
                        )
                      })}
                    {students.filter(s => s.averageScore > 0).length === 0 && (
                      <p className="text-sm text-gray-400 font-medium text-center py-6">Nenhum aluno com nota registrada ainda.</p>
                    )}
                  </div>
                </div>

                {/* Ranking de Turmas */}
                <div className="bg-white dark:bg-surface-dark rounded-[2rem] shadow-ambient border-none p-8 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-lg font-black text-gray-900 dark:text-white">Top Turmas por Média</h4>
                    <span className="p-2 rounded-xl bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10"><span className="material-icons-outlined text-sm">equalizer</span></span>
                  </div>
                  <div className="space-y-4">
                    {[...classes]
                      .sort((a,b) => (b.averageScore || 0) - (a.averageScore || 0))
                      .slice(0, 4)
                      .map((c, idx) => (
                        <div key={c.id} className="flex items-center gap-4 p-3">
                          <div className="w-8 flex-shrink-0 text-center font-bold text-gray-400">#{idx + 1}</div>
                          <div className="flex-1 w-full">
                            <div className="flex justify-between items-end mb-1">
                              <p className="font-bold text-sm text-gray-900 dark:text-white">{c.name}</p>
                              <p className="font-black text-xs text-gray-500">{c.averageScore || 0} pts</p>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full transition-all duration-1000" 
                                style={{ width: `${Math.min(100, (c.averageScore || 0) / 10)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    {classes.length === 0 && (
                      <p className="text-sm text-gray-400 font-medium text-center py-6">Nenhuma turma cadastrada no momento.</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'students' && (
            <>
              <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <div className="flex gap-2">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${statusFilter === 'all' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10'}`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setStatusFilter('active')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${statusFilter === 'active' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-gray-100 text-gray-400 hover:bg-emerald-50 hover:text-emerald-500 dark:bg-white/5'}`}
                  >
                    Alunos Ativos
                  </button>
                  <button
                    onClick={() => setStatusFilter('invited')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${statusFilter === 'invited' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-gray-100 text-gray-400 hover:bg-amber-50 hover:text-amber-500 dark:bg-white/5'}`}
                  >
                    Convites Pendentes
                  </button>
                </div>

                {userType === 'school_admin' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsStudentModalOpen(true)}
                      className="px-5 py-2.5 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md shadow-primary/20 transition-all hover:scale-105 flex items-center gap-2"
                    >
                      <span className="material-icons-outlined text-base">person_add</span>
                      Convidar Aluno
                    </button>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto mb-6">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] border-b border-gray-50 dark:border-white/5">
                      <th className="px-6 py-4">Nome do Aluno</th>
                      <th className="px-6 py-4">Média Geral</th>
                      <th className="px-6 py-4">Entregas</th>
                      <th className="px-6 py-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                    {currentStudents.map(s => (
                      <tr key={s.id} className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-6 font-black text-sm text-gray-900 dark:text-white">{s.name}</td>
                        <td className="px-6 py-6 font-black text-primary">{s.averageScore}</td>
                        <td className="px-6 py-6 text-sm font-bold text-gray-400">{s.essaysSubmitted}</td>
                        <td className="px-6 py-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {s.status === 'invited' ? (
                              <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                                Convite Pendente
                              </span>
                            ) : s.essaysSubmitted === 0 ? (
                              <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                                Novo Aluno
                              </span>
                            ) : (
                              <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${s.averageScore > 700 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                {s.averageScore > 700 ? 'Alta Prod.' : 'Atenção'}
                              </span>
                            )}
                            
                            {userType === 'school_admin' && s.status === 'invited' && (
                              <>
                                <button
                                  onClick={() => handleResendInvite({ name: s.name, email: s.email, class_id: s.class_id }, 'student')}
                                  disabled={resendingEmail === s.email}
                                  title="Reenviar convite por e-mail"
                                  className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all flex items-center justify-center disabled:opacity-50"
                                >
                                  <span className="material-icons-outlined text-sm">{resendingEmail === s.email ? 'sync' : 'forward_to_inbox'}</span>
                                </button>
                                <button
                                  onClick={() => handleRevokeInvite(s.email, 'student')}
                                  disabled={revokingEmail === s.email}
                                  title="Revogar e remover convite"
                                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 transition-all flex items-center justify-center disabled:opacity-50"
                                >
                                  <span className="material-icons-outlined text-sm">{revokingEmail === s.email ? 'sync' : 'person_remove'}</span>
                                </button>
                              </>
                            )}

                            {userType === 'school_admin' && (
                              <button
                                onClick={() => { setEditingStudent(s); setIsEditStudentModalOpen(true); }}
                                title="Editar Perfil do Aluno"
                                className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-white/10 dark:hover:bg-white/20 transition-all flex items-center justify-center"
                              >
                                <span className="material-icons-outlined text-sm">edit</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {currentStudents.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-bold">Nenhum aluno encontrado para sua turma.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls for Students */}
              {studentTotalPages > 1 && (
                <div className="flex justify-center items-center gap-4">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-xl border hover:bg-gray-50 disabled:opacity-30 transition-all text-gray-500"
                  >
                    <span className="material-icons-outlined">chevron_left</span>
                  </button>
                  <span className="text-xs font-bold text-gray-500">
                    Página {currentPage} de {studentTotalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(studentTotalPages, p + 1))}
                    disabled={currentPage === studentTotalPages}
                    className="p-2 rounded-xl border hover:bg-gray-50 disabled:opacity-30 transition-all text-gray-500"
                  >
                    <span className="material-icons-outlined">chevron_right</span>
                  </button>
                </div>
              )}
            </>
          )}
          {activeTab === 'classes' && userType === 'school_admin' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map(cls => (
                <div key={cls.id} className="bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-ambient border-none shadow-sm hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <span className="material-icons-outlined">class</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${cls.shift === 'Noturno' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                      {cls.shift}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{cls.name}</h3>
                  <p className="text-sm text-gray-400 font-medium mb-4">{cls.grade}</p>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-50 dark:border-white/5">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Alunos</p>
                      <p className="font-bold text-gray-900 dark:text-white">{cls.studentCount}</p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      {cls.invite_code ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const link = `${window.location.origin}/invite/${cls.invite_code}`;
                              const text = `Olá! Você foi convidado para a turma ${cls.name} no Littera. Clique no link para criar sua conta de aluno: ${link}`;
                              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                            }}
                            className="flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-bold text-xs bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                            title="Compartilhar no WhatsApp"
                          >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                            </svg>
                            WhatsApp
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(`${window.location.origin}/invite/${cls.invite_code}`);
                              showToast('success', 'Link copiado!', 'Envie este link para os alunos se cadastrarem.');
                            }}
                            className="flex items-center gap-1 text-primary hover:text-blue-700 font-bold text-xs bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                            title="Copiar link de convite"
                          >
                            <span className="material-icons-outlined text-[14px]">link</span>
                          </button>
                        </>
                      ) : (
                        <div className="text-right">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Média</p>
                          <p className="font-bold text-primary">{cls.averageScore}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {classes.length === 0 && (
                <div className="col-span-full py-20 text-center text-gray-400 font-bold flex flex-col items-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-400 mb-4">
                    <span className="material-icons-outlined text-2xl">layers_clear</span>
                  </div>
                  <p>Nenhuma turma cadastrada. Crie a primeira acima.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'staff' && userType === 'school_admin' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] border-b border-gray-50 dark:border-white/5">
                    <th className="px-6 py-4">Nome</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Turma Vinculada</th>
                    <th className="px-6 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                  {professors.map(p => {
                    const linkedClass = classes.find(c => c.id === p.class_id);
                    return (
                      <tr key={p.id} className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-6 font-black text-sm text-gray-900 dark:text-white flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs">
                            {p.full_name?.charAt(0) || p.name?.charAt(0) || '?'}
                          </div>
                          {p.full_name || p.name}
                        </td>
                        <td className="px-6 py-6 text-sm text-gray-500">{p.email}</td>
                        <td className="px-6 py-6 text-sm font-bold text-gray-700 dark:text-gray-300">
                          {linkedClass ? `${linkedClass.name} (${linkedClass.shift})` : 'Sem vínculo'}
                        </td>
                        <td className="px-6 py-6 text-right">
                          {p.status === 'active' ? (
                            <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                              Ativo
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                                Convidado
                              </span>
                              {userType === 'school_admin' && (
                                <>
                                  <button
                                    onClick={() => handleResendInvite({ name: p.full_name || p.name, email: p.email, class_id: p.class_id }, 'professor')}
                                    disabled={resendingEmail === p.email}
                                    title="Reenviar convite por e-mail"
                                    className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all flex items-center justify-center disabled:opacity-50"
                                  >
                                    <span className="material-icons-outlined text-sm">{resendingEmail === p.email ? 'sync' : 'forward_to_inbox'}</span>
                                  </button>
                                  <button
                                    onClick={() => handleRevokeInvite(p.email, 'professor')}
                                    disabled={revokingEmail === p.email}
                                    title="Revogar e remover convite"
                                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 transition-all flex items-center justify-center disabled:opacity-50"
                                  >
                                    <span className="material-icons-outlined text-sm">{revokingEmail === p.email ? 'sync' : 'person_remove'}</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {professors.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-bold">Nenhum professor cadastrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === 'ranking' && <RankingView showAllEntries={true} manualData={rankingData} />}

          {/* ── SUBSCRIPTION TAB ── */}
          {activeTab === 'subscription' && userType === 'school_admin' && (
            <div className="space-y-10 animate-fade-in">

              {/* Subscription Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-gradient-to-br from-[#131b2e] to-[#1e293b] p-8 rounded-[2rem] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 rounded-full blur-[80px] pointer-events-none"></div>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        school?.subscription_status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {school?.subscription_status === 'active' ? 'Assinatura Ativa' : `Status: ${school?.subscription_status || 'Inativa'}`}
                      </span>
                      <h3 className="text-2xl font-black text-white mt-3">Plano Institucional Littera</h3>
                      <p className="text-gray-400 text-sm mt-1">
                        {school?.plano_ativado_em
                          ? `Ativado em ${new Date(school.plano_ativado_em).toLocaleDateString('pt-BR')}`
                          : 'Cobrança gerenciada com segurança via Asaas'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Alunos Contratados</p>
                      <p className="text-4xl font-black text-white mt-1">
                        {school?.student_count || students.length || 0}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-8">
                    <div className="bg-white/5 rounded-2xl p-4">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Alunos Cadastrados</p>
                      <p className="text-xl font-black text-white">{students.length}</p>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-4">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Licenças Contratadas</p>
                      <p className="text-xl font-black text-primary">{school?.student_count || students.length || 0}</p>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-4">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Status no Asaas</p>
                      <p className="text-xl font-black text-emerald-400 uppercase">{school?.subscription_status || 'inactive'}</p>
                    </div>
                  </div>

                  {/* Medidor de Consumo Mensal da Franquia */}
                  <div className="mt-6 bg-white/5 rounded-2xl p-5 border border-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-black text-white uppercase tracking-wider">
                        Correções no mês: {monthlyCorrectionsUsed} / {monthlyCorrectionsQuota} disponíveis
                      </span>
                      <span className="text-xs font-bold text-gray-400">
                        {monthlyQuotaPercentage}% utilizado
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          monthlyQuotaPercentage >= 90 ? 'bg-rose-500' : monthlyQuotaPercentage >= 75 ? 'bg-amber-500' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${monthlyQuotaPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-surface-dark rounded-[2rem] shadow-ambient border-none p-8 flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                      <span className="material-icons-outlined text-2xl">verified_user</span>
                    </div>
                    <h4 className="text-lg font-black text-gray-900 dark:text-white mb-2">Gestão Financeira Asaas</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      Para sua segurança, o Littera não armazena dados de cartão de crédito. Todas as faturas, segunda via de boletos/PIX e alterações de plano são processadas diretamente pelo Asaas.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        const resolvedSchoolId = school?.id || await getResolvedSchoolId(session);
                        const { data, error } = await supabase.functions.invoke('update-credit-card', {
                          body: { schoolId: resolvedSchoolId },
                          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
                        });
                        if (!error && data?.invoiceUrl) {
                          localStorage.setItem('checkout_invoiceUrl', data.invoiceUrl);
                          window.open(data.invoiceUrl, '_blank', 'noopener,noreferrer');
                          return;
                        }
                        const savedUrl = localStorage.getItem('checkout_invoiceUrl');
                        if (savedUrl) {
                          window.open(savedUrl, '_blank', 'noopener,noreferrer');
                          return;
                        }
                        navigate('/checkout');
                      } catch {
                        navigate('/checkout');
                      }
                    }}
                    className="w-full mt-6 py-4 rounded-xl bg-primary text-white font-black text-xs uppercase tracking-widest hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-icons-outlined text-sm">open_in_new</span>
                    Gerenciar Cartão e Faturas no Asaas
                  </button>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'essays' && (
            <div className="space-y-4">
              {essays.length > 0 ? essays.map(essay => (
                <div key={essay.id} className="bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-ambient border-none shadow-sm hover:shadow-md transition-all flex justify-between items-center group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-white ${essay.score >= 800 ? 'bg-green-500' : essay.score >= 600 ? 'bg-primary' : 'bg-amber-500'}`}>
                      {essay.score}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{essay.tema}</h4>
                      <p className="text-xs text-gray-500 font-medium mt-1">
                        {essay.student_name} • {new Date(essay.data_envio).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button className="px-4 py-2 text-primary font-bold text-xs uppercase tracking-widest bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors">
                    Ver Correção
                  </button>
                </div>
              )) : (
                <div className="text-center py-20 text-gray-400 font-bold flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-400">
                    <span className="material-icons-outlined text-2xl">assignment_late</span>
                  </div>
                  <p>Nenhuma redação corrigida encontrada no sistema.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL EDITAR ALUNO */}
      {isEditStudentModalOpen && editingStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsEditStudentModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-surface-dark rounded-[2rem] shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-5 sm:p-8 space-y-5">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <span className="material-icons-outlined text-primary text-2xl">edit</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Editar Aluno</h3>
                  <p className="text-xs font-bold text-gray-500">Atualize os dados de perfil do aluno.</p>
                </div>
              </div>

              <form onSubmit={handleUpdateStudent} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input
                    type="text"
                    value={editingStudent.name}
                    onChange={e => setEditingStudent({ ...editingStudent, name: e.target.value })}
                    className="w-full px-5 py-3 rounded-2xl bg-gray-50 dark:bg-white/5 border-none focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Matrícula (Opcional)</label>
                  <input
                    type="text"
                    value={editingStudent.registration_number || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, registration_number: e.target.value })}
                    className="w-full px-5 py-3 rounded-2xl bg-gray-50 dark:bg-white/5 border-none focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Vincular Turma</label>
                  <select
                    value={editingStudent.class_id || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, class_id: e.target.value })}
                    className="w-full px-5 py-3 rounded-2xl bg-gray-50 dark:bg-white/5 border-none focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all appearance-none"
                  >
                    <option value="">Nenhuma turma</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.name} ({cls.shift})</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setIsEditStudentModalOpen(false)}
                    className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEditStudent}
                    className="flex-1 py-3 rounded-xl font-bold text-white bg-primary hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {isSavingEditStudent ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      "Salvar"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CADASTRAR TURMA */}
      {
        isClassModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"></div>
            <div className="relative bg-white dark:bg-surface-dark w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden overflow-y-auto max-h-[85vh] animate-scale-in border border-gray-100 dark:border-white/10">
              <div className="p-5 sm:p-8 border-b border-gray-100 dark:border-white/5">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Nova Turma</h3>
                <p className="text-gray-500 text-sm mt-1">Defina os detalhes da classe para organizar seus alunos.</p>
              </div>

              <form onSubmit={handleCreateClass} className="p-5 sm:p-8 space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome da Turma</label>
                  <input
                    type="text"
                    value={newClass.name}
                    onChange={e => setNewClass({ ...newClass, name: e.target.value })}
                    placeholder="Ex: 3º Ano A - Ensino Médio"
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-white/5 border-none focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Série/Ano</label>
                    <input
                      type="text"
                      value={newClass.grade}
                      onChange={e => setNewClass({ ...newClass, grade: e.target.value })}
                      placeholder="Ex: 3º Ano"
                      className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-white/5 border-none focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Turno</label>
                    <select
                      value={newClass.shift}
                      onChange={e => setNewClass({ ...newClass, shift: e.target.value })}
                      className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-white/5 border-none focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all appearance-none"
                    >
                      <option value="Matutino">Matutino</option>
                      <option value="Vespertino">Vespertino</option>
                      <option value="Noturno">Noturno</option>
                      <option value="Integral">Integral</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setIsClassModalOpen(false)}
                    className="flex-1 py-4 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingClass}
                    className="flex-1 py-4 rounded-xl font-bold text-white bg-primary hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {isSavingClass ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      "Criar Turma"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Modal Adicionar Professor */}
      {
        isProfessorModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"></div>
            <div className="relative bg-white dark:bg-surface-dark w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden overflow-y-auto max-h-[85vh] animate-scale-in border border-gray-100 dark:border-white/10">
              <div className="p-5 sm:p-8 border-b border-gray-100 dark:border-white/5">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Novo Docente</h3>
                <p className="text-gray-500 text-sm mt-1">Cadastre um professor e vincule-o a uma turma para iniciar.</p>
              </div>

              <form onSubmit={handleCreateProfessor} className="p-5 sm:p-8 space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input
                    type="text"
                    value={newProfessor.name}
                    onChange={e => setNewProfessor({ ...newProfessor, name: e.target.value })}
                    placeholder="Ex: João da Silva"
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-white/5 border-none focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-mail Profissional</label>
                  <input
                    type="email"
                    value={newProfessor.email}
                    onChange={e => setNewProfessor({ ...newProfessor, email: e.target.value })}
                    placeholder="Ex: professor@escola.com"
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-white/5 border-none focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Vincular Turma</label>
                  <select
                    value={newProfessor.class_id}
                    onChange={e => setNewProfessor({ ...newProfessor, class_id: e.target.value })}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-white/5 border-none focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all appearance-none"
                    required
                  >
                    <option value="">Selecione uma turma...</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.name} ({cls.shift})</option>
                    ))}
                  </select>
                  {classes.length === 0 && (
                    <p className="text-xs text-rose-500 font-bold mt-1">Você precisa criar uma turma antes de adicionar professores.</p>
                  )}
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setIsProfessorModalOpen(false)}
                    className="flex-1 py-4 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProfessor || classes.length === 0}
                    className="flex-1 py-4 rounded-xl font-bold text-white bg-primary hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {isSavingProfessor ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      "Cadastrar"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Modal Adicionar Aluno */}
      {
        isStudentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"></div>
            <div className="relative bg-white dark:bg-surface-dark w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden overflow-y-auto max-h-[85vh] animate-scale-in border border-gray-100 dark:border-white/10">
              <div className="p-5 sm:p-8 border-b border-gray-100 dark:border-white/5">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Nova Matrícula</h3>
                <p className="text-gray-500 text-sm mt-1">Cadastre um aluno e vincule-o a uma turma ativa.</p>

                <div className="flex gap-4 mt-6">
                  <button
                    onClick={() => setStudentModalTab('single')}
                    className={`flex-1 py-2 font-bold text-xs uppercase tracking-widest border-b-2 transition-colors ${studentModalTab === 'single' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                  >
                    Cadastro Único
                  </button>
                  <button
                    onClick={() => setStudentModalTab('bulk')}
                    className={`flex-1 py-2 font-bold text-xs uppercase tracking-widest border-b-2 transition-colors ${studentModalTab === 'bulk' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                  >
                    Em Lote (Vários)
                  </button>
                </div>
              </div>

              {studentModalTab === 'single' ? (
                <form onSubmit={handleCreateStudent} className="p-5 sm:p-8 space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
                    <input
                      type="text"
                      value={newStudent.name}
                      onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
                      placeholder="Ex: Maria Oliveira"
                      className="w-full px-5 py-3 rounded-2xl bg-gray-50 dark:bg-white/5 border-none focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-mail do Aluno</label>
                    <input
                      type="email"
                      value={newStudent.email}
                      onChange={e => setNewStudent({ ...newStudent, email: e.target.value })}
                      placeholder="Ex: aluno@escola.com"
                      className="w-full px-5 py-3 rounded-2xl bg-gray-50 dark:bg-white/5 border-none focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Vincular Turma</label>
                    <select
                      value={newStudent.class_id}
                      onChange={e => setNewStudent({ ...newStudent, class_id: e.target.value })}
                      className="w-full px-5 py-3 rounded-2xl bg-gray-50 dark:bg-white/5 border-none focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all appearance-none"
                      required
                    >
                      <option value="">Selecione uma turma...</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.name} ({cls.shift})</option>
                      ))}
                    </select>
                    {classes.length === 0 && (
                      <p className="text-xs text-rose-500 font-bold mt-1">Crie uma turma antes de matricular alunos.</p>
                    )}
                  </div>

                  <div className="flex gap-3 mt-8">
                    <button
                      type="button"
                      onClick={() => setIsStudentModalOpen(false)}
                      className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingStudent || classes.length === 0}
                      className="flex-1 py-3 rounded-xl font-bold text-white bg-primary hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                      {isSavingStudent ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        "Matricular"
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleBulkRegister} className="p-5 sm:p-8 space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Vincular Turma</label>
                    <select
                      value={newStudent.class_id}
                      onChange={e => setNewStudent({ ...newStudent, class_id: e.target.value })}
                      className="w-full px-5 py-3 rounded-2xl bg-gray-50 dark:bg-white/5 border-none focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all appearance-none"
                    >
                      <option value="">Selecione uma turma (opcional)...</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.name} ({cls.shift})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Opção 1: Colar Múltiplos E-mails</label>
                    <textarea
                      value={bulkEmails}
                      onChange={e => setBulkEmails(e.target.value)}
                      placeholder="aluno1@escola.com, aluno2@escola.com..."
                      rows={3}
                      className="w-full px-5 py-3 rounded-2xl bg-gray-50 dark:bg-white/5 border-none focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all resize-none"
                    />
                  </div>

                  <div className="text-center font-bold text-gray-400 text-xs">OU</div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Opção 2: Enviar Arquivo (.CSV ou .XML)</label>
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-white/20 rounded-2xl cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <span className="material-icons-outlined text-3xl text-gray-400 mb-2">cloud_upload</span>
                        <p className="mb-2 text-sm text-gray-500 font-bold">
                          <span className="text-primary">Clique para enviar</span> ou arraste o arquivo
                        </p>
                        <p className="text-xs text-gray-400">{bulkFile ? bulkFile.name : 'Apenas planilhas CSV ou arquivos XML'}</p>
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept=".csv,.xml" 
                        onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>


                    <div className="text-center font-bold text-gray-400 text-xs mt-6 mb-4">OU</div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Opção 3: Link Rápido (Cadastro Público)</label>
                      <button
                        type="button"
                        onClick={() => {
                          if (school?.id) {
                            const link = `${window.location.origin}/matricula/${school.id}`;
                            const text = `Olá! Você foi convidado para a escola ${school.name || 'Littera'}. Clique no link para criar sua conta de aluno e selecionar sua turma: ${link}`;
                            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-200"
                      >
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                        </svg>
                        Compartilhar Link da Escola no WhatsApp
                      </button>
                    </div>

                  <div className="flex gap-3 mt-8">
                    <button
                      type="button"
                      onClick={() => setIsStudentModalOpen(false)}
                      className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessingBulk || (!bulkFile && !bulkEmails)}
                      className="flex-1 py-3 rounded-xl font-bold text-white bg-primary hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                      {isProcessingBulk ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        "Convidar Alunos"
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )
      }

      {/* Modal Nova Atividade (Professor) */}
      {
        isAssignmentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"></div>
            <div className="relative bg-white dark:bg-surface-dark w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden overflow-y-auto max-h-[85vh] animate-scale-in border border-gray-100 dark:border-white/10">
              <div className="p-5 sm:p-8 border-b border-gray-100 dark:border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Nova Atividade</h3>
                  <p className="text-gray-500 text-sm mt-1">Crie uma redação para seus alunos ou use a IA para gerar temas.</p>
                </div>
                <button
                  onClick={handleGenerateAI}
                  disabled={isGeneratingAI}
                  className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center gap-2"
                >
                  {isGeneratingAI ? (
                    <span className="material-icons-outlined animate-spin text-sm">autorenew</span>
                  ) : (
                    <span className="material-icons-outlined text-sm">auto_awesome</span>
                  )}
                  {isGeneratingAI ? "Gerando..." : "Gerar com IA"}
                </button>
              </div>

              <form onSubmit={handleCreateAssignment} className="p-5 sm:p-8 space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Título do Tema</label>
                  <input
                    type="text"
                    value={newAssignment.title}
                    onChange={e => setNewAssignment({ ...newAssignment, title: e.target.value })}
                    placeholder="Ex: Os desafios da mobilidade urbana"
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-white/5 border-none focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Texto Base / Contexto</label>
                  <textarea
                    value={newAssignment.baseText}
                    onChange={e => setNewAssignment({ ...newAssignment, baseText: e.target.value })}
                    placeholder="Cole aqui o texto motivador ou deixe a IA gerar para você..."
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-white/5 border-none focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-medium text-sm transition-all min-h-[150px] resize-none leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Atribuir à Turma</label>
                    <select
                      value={newAssignment.class_id}
                      onChange={e => setNewAssignment({ ...newAssignment, class_id: e.target.value })}
                      className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-white/5 border-none focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all appearance-none"
                      required
                    >
                      <option value="">Selecione...</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.name} ({cls.shift})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data de Entrega (Opcional)</label>
                    <input
                      type="date"
                      value={newAssignment.due_date}
                      onChange={e => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
                      className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-white/5 border-none focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setIsAssignmentModalOpen(false)}
                    className="flex-1 py-4 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingAssignment}
                    className="flex-1 py-4 rounded-xl font-bold text-white bg-primary hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {isSavingAssignment ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      "Criar Atividade"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default InstitutionDashboard;
