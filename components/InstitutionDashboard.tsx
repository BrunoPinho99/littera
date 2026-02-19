
import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  createStudentsBulk,
  createAssignment
} from '../services/databaseService';
import { generateAssignmentTheme } from '../services/geminiService';
import RankingView from './RankingView';

interface InstitutionDashboardProps {
  initialTab?: 'students' | 'essays' | 'ranking' | 'classes' | 'staff' | 'settings';
  userType?: 'teacher' | 'school_admin';
}

const ITEMS_PER_PAGE = 8;

const InstitutionDashboard: React.FC<InstitutionDashboardProps> = ({ initialTab = 'students', userType = 'school_admin' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);

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

  // States for Bulk Import Modal
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const { data: { session } } = await supabase.auth.getSession();
      const userMetadata = session?.user?.user_metadata;
      const schoolId = userMetadata?.school_id || 'demo-school';
      const userRole = userMetadata?.user_type || 'student';
      const classId = userRole === 'teacher' ? userMetadata?.class_id : undefined;

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
      setLoading(false);
    };
    fetchBaseData();
  }, [userType]); // Re-run if userType changes

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClass.name || !newClass.grade) return;

    setIsSavingClass(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const schoolId = session?.user?.user_metadata?.school_id || 'demo-school';

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
    if (!newProfessor.name || !newProfessor.email || !newProfessor.class_id) {
      alert("Por favor, preencha todos os campos e selecione uma turma.");
      return;
    }

    setIsSavingProfessor(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const schoolId = session?.user?.user_metadata?.school_id || 'demo-school';

      const createdProf = await createProfessor({
        name: newProfessor.name,
        email: newProfessor.email,
        class_id: newProfessor.class_id,
        school_id: schoolId
      });

      if (createdProf) {
        setProfessors(prev => [...prev, createdProf]);
        setIsProfessorModalOpen(false);
        setNewProfessor({ name: '', email: '', class_id: '' });
        alert(`Sucesso! Um e-mail de convite foi enviado para ${newProfessor.email}. O professor deverá usar a opção "Resgatar Convite" no login para criar sua senha.`);
      }
    } catch (error: any) {
      const msg = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
      alert("Erro ao cadastrar professor: " + msg);
    } finally {
      setIsSavingProfessor(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.email || !newStudent.class_id) {
      alert("Por favor, preencha os campos obrigatórios e selecione uma turma.");
      return;
    }

    setIsSavingStudent(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const schoolId = session?.user?.user_metadata?.school_id || 'demo-school';

      const createdStudent = await createStudent({
        name: newStudent.name,
        email: newStudent.email,
        class_id: newStudent.class_id,
        school_id: schoolId,
        registration_number: newStudent.registration_number
      });

      if (createdStudent) {
        setStudents(prev => [createdStudent, ...prev]);
        setIsStudentModalOpen(false);
        setNewStudent({ name: '', email: '', class_id: '', registration_number: '' });
        if (activeTab !== 'students') setActiveTab('students');
        alert(`Aluno cadastrado! Um e-mail de convite foi enviado para ${newStudent.email}. Instrua o aluno a usar "Resgatar Convite" no login.`);
      }
    } catch (error: any) {
      const msg = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
      alert(msg || "Erro ao cadastrar aluno. Verifique se o e-mail já existe.");
    } finally {
      setIsSavingStudent(false);
    }
  };

  const handleDownloadTemplate = () => {
    const header = "Nome,Email,Nome da Turma,Matricula\n";
    const example1 = "Ana Silva,ana@email.com,3º Ano A,2024001\n";
    const example2 = "Bruno Souza,bruno@email.com,3º Ano B,";
    const content = header + example1 + example2;

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_alunos_littera.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) return;
    setBulkProcessing(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/);
      // Remove header e linhas vazias
      const dataRows = lines.slice(1).filter(line => line.trim() !== '');

      if (dataRows.length === 0) {
        alert("Arquivo vazio ou sem dados.");
        setBulkProcessing(false);
        return;
      }

      const studentsToCreate = [];
      const errors = [];

      for (const row of dataRows) {
        // Tenta separar por vírgula ou ponto e vírgula
        const cols = row.split(/,|;/).map(c => c.trim());
        if (cols.length < 3) continue; // Mínimo: Nome, Email, Turma

        const [name, email, className, registration] = cols;

        // Encontra ID da turma pelo nome
        const classObj = classes.find(c => c.name.toLowerCase() === className.toLowerCase());

        if (!classObj) {
          errors.push(`Turma não encontrada para ${name}: ${className}`);
          continue;
        }

        studentsToCreate.push({
          name: name,
          email: email,
          class_id: classObj.id,
          registration_number: registration || ''
        });
      }

      if (studentsToCreate.length > 0) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const schoolId = session?.user?.user_metadata?.school_id || 'demo-school';

          const result = await createStudentsBulk(studentsToCreate, schoolId);

          // Feedback ao usuário
          let msg = `Processamento concluído!\n\nSucesso: ${result.success.length}`;
          if (result.errors.length > 0) {
            msg += `\nErros de cadastro: ${result.errors.length} (ex: e-mails duplicados)`;
          }
          if (errors.length > 0) {
            msg += `\nErros de validação (Turma não encontrada): ${errors.length}`;
          }
          msg += "\n\nOs alunos convidados devem acessar 'Resgatar Convite' na tela de login.";

          alert(msg);

          if (result.success.length > 0) {
            setStudents(prev => [...result.success, ...prev]);
            setIsBulkModalOpen(false);
            setBulkFile(null);
          }
        } catch (err: any) {
          const msg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
          alert("Erro ao processar lote: " + msg);
        }
      } else {
        alert("Nenhum aluno válido encontrado para importação. Verifique os nomes das turmas.");
      }

      setBulkProcessing(false);
    };

    reader.readAsText(bulkFile);
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
    } catch (error) {
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
      const schoolId = session?.user?.user_metadata?.school_id || 'demo-school';

      await createAssignment({
        title: newAssignment.title,
        base_text: newAssignment.baseText,
        class_id: newAssignment.class_id,
        school_id: schoolId,
        due_date: newAssignment.due_date
      });

      setIsAssignmentModalOpen(false);
      setNewAssignment({ title: '', baseText: '', class_id: '', due_date: '' });
      alert("Atividade criada com sucesso!");
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

  const availableTabs = useMemo(() => {
    const baseTabs = [
      { id: 'students', label: userType === 'teacher' ? 'Meus Alunos' : 'Alunos', icon: 'person' },
      { id: 'essays', label: 'Correções', icon: 'description' },
      { id: 'ranking', label: 'Ranking', icon: 'trophy' },
    ];

    if (userType === 'school_admin') {
      baseTabs.splice(1, 0, { id: 'classes', label: 'Turmas', icon: 'grid_view' });
      baseTabs.splice(2, 0, { id: 'staff', label: 'Docentes', icon: 'school' }); // Add 'Docentes' tab
    }


    return baseTabs;
  }, [userType]);

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

  return (
    <div className="animate-fade-in-up space-y-12">
      {/* ... (rest of the component structure is unchanged, changes were in handlers above) ... */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] block mb-2">
            {userType === 'teacher' ? 'Área do Docente' : 'Painel de Controle'}
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tighter">
            {school?.name || "Minha Instituição"}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${school?.id === 'demo' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {school?.id === 'demo' ? 'Modo Local (Demo)' : 'Conectado (Cloud)'}
            </span>
          </div>
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
              className="px-6 py-3 bg-white dark:bg-surface-dark text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm transition-all hover:scale-105 hover:bg-gray-50 dark:hover:bg-white/5"
            >
              + Professor
            </button>
            <button
              onClick={() => setIsStudentModalOpen(true)}
              className="px-6 py-3 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 transition-all hover:scale-105"
            >
              + Aluno
            </button>
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="w-12 py-3 bg-white dark:bg-surface-dark text-gray-600 dark:text-gray-300 rounded-2xl font-black border border-gray-200 dark:border-white/10 flex items-center justify-center shadow-sm transition-all hover:bg-gray-50 hover:text-primary tooltip-container"
              title="Importar CSV"
            >
              <span className="material-icons-outlined">upload_file</span>
            </button>
          </div>
        )}
      </header>

      {/* Grid de Métricas */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${userType === 'teacher' ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-6`}>
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-surface-dark p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-white/5 flex items-center gap-6">
            <div className={`w-14 h-14 rounded-2xl ${stat.color} flex items-center justify-center text-white shadow-lg`}>
              <span className="material-icons-outlined text-2xl">{stat.icon}</span>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-3xl font-black text-gray-900 dark:text-white">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Seção Principal de Abas */}
      <div className="bg-white dark:bg-surface-dark rounded-[3rem] shadow-premium border border-gray-100 dark:border-white/5 overflow-hidden">
        <div className="flex border-b border-gray-50 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 p-2 overflow-x-auto">
          {availableTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 min-w-[140px] py-4 rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white dark:bg-surface-dark shadow-md text-primary' : 'text-gray-400 hover:text-gray-900'}`}
            >
              <span className="material-icons-outlined text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-10">
          {activeTab === 'students' && (
            <>
              <div className="flex gap-2 mb-6">
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
                          {s.status === 'invited' ? (
                            <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
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
                <div key={cls.id} className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all group">
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
                    <div className="text-right">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Média</p>
                      <p className="font-bold text-primary">{cls.averageScore}</p>
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
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${p.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                            {p.status === 'active' ? 'Ativo' : 'Convidado'}
                          </span>
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
          {activeTab === 'essays' && (
            <div className="space-y-4">
              {essays.length > 0 ? essays.map(essay => (
                <div key={essay.id} className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all flex justify-between items-center group cursor-pointer">
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

      {/* Modal Criar Turma */}
      {
        isClassModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade-in">
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setIsClassModalOpen(false)}
            ></div>
            <div className="relative bg-white dark:bg-surface-dark w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-in border border-gray-100 dark:border-white/10">
              <div className="p-8 border-b border-gray-100 dark:border-white/5">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Nova Turma</h3>
                <p className="text-gray-500 text-sm mt-1">Defina os detalhes da classe para organizar seus alunos.</p>
              </div>

              <form onSubmit={handleCreateClass} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome da Turma</label>
                  <input
                    type="text"
                    value={newClass.name}
                    onChange={e => setNewClass({ ...newClass, name: e.target.value })}
                    placeholder="Ex: 3º Ano A - Ensino Médio"
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all"
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
                      className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Turno</label>
                    <select
                      value={newClass.shift}
                      onChange={e => setNewClass({ ...newClass, shift: e.target.value })}
                      className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all appearance-none"
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
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setIsProfessorModalOpen(false)}
            ></div>
            <div className="relative bg-white dark:bg-surface-dark w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-in border border-gray-100 dark:border-white/10">
              <div className="p-8 border-b border-gray-100 dark:border-white/5">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Novo Docente</h3>
                <p className="text-gray-500 text-sm mt-1">Cadastre um professor e vincule-o a uma turma para iniciar.</p>
              </div>

              <form onSubmit={handleCreateProfessor} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input
                    type="text"
                    value={newProfessor.name}
                    onChange={e => setNewProfessor({ ...newProfessor, name: e.target.value })}
                    placeholder="Ex: João da Silva"
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all"
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
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Vincular Turma</label>
                  <select
                    value={newProfessor.class_id}
                    onChange={e => setNewProfessor({ ...newProfessor, class_id: e.target.value })}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all appearance-none"
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
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setIsStudentModalOpen(false)}
            ></div>
            <div className="relative bg-white dark:bg-surface-dark w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden overflow-y-auto max-h-[90vh] animate-scale-in border border-gray-100 dark:border-white/10">
              <div className="p-6 border-b border-gray-100 dark:border-white/5">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Nova Matrícula</h3>
                <p className="text-gray-500 text-sm mt-1">Cadastre um aluno e vincule-o a uma turma ativa.</p>
              </div>

              <form onSubmit={handleCreateStudent} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input
                    type="text"
                    value={newStudent.name}
                    onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
                    placeholder="Ex: Maria Oliveira"
                    className="w-full px-5 py-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all"
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
                    className="w-full px-5 py-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nº Matrícula (Opcional)</label>
                  <input
                    type="text"
                    value={newStudent.registration_number}
                    onChange={e => setNewStudent({ ...newStudent, registration_number: e.target.value })}
                    placeholder="Ex: 20240015"
                    className="w-full px-5 py-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Vincular Turma</label>
                  <select
                    value={newStudent.class_id}
                    onChange={e => setNewStudent({ ...newStudent, class_id: e.target.value })}
                    className="w-full px-5 py-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all appearance-none"
                    required
                  >
                    <option value="">Selecione uma turma...</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.name} ({cls.shift})</option>
                    ))}
                  </select>
                  {classes.length === 0 && (
                    <p className="text-xs text-rose-500 font-bold mt-1">Necessário criar turma antes de matricular alunos.</p>
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
            </div>
          </div>
        )
      }

      {/* Modal Importar CSV */}
      {
        isBulkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade-in">
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setIsBulkModalOpen(false)}
            ></div>
            <div className="relative bg-white dark:bg-surface-dark w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-in border border-gray-100 dark:border-white/10">
              <div className="p-8 border-b border-gray-100 dark:border-white/5">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Importação em Massa</h3>
                <p className="text-gray-500 text-sm mt-1">Cadastre múltiplos alunos de uma vez via arquivo CSV.</p>
              </div>

              <div className="p-8 space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-blue-700 dark:text-blue-300 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                      <span className="material-icons-outlined text-sm">info</span> Formato Obrigatório
                    </h4>
                    <button
                      onClick={handleDownloadTemplate}
                      className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400 bg-white dark:bg-blue-900/40 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-700 hover:bg-blue-50 transition-colors flex items-center gap-1"
                    >
                      <span className="material-icons-outlined text-xs">download</span> Baixar Modelo
                    </button>
                  </div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">O arquivo deve conter cabeçalho e as colunas nesta ordem:</p>
                  <code className="block bg-white dark:bg-black/20 p-2 rounded-lg text-xs font-mono text-gray-600 dark:text-gray-300 break-all">
                    Nome, Email, Nome da Turma, Matricula (opcional)
                  </code>
                  <p className="text-xs text-blue-500 dark:text-blue-400 mt-2 italic">Ex: Ana Silva, ana@email.com, 3º Ano A, 202401</p>
                </div>

                <div
                  className="border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-gray-50 dark:hover:bg-slate-800 transition-all group"
                  onClick={() => !bulkProcessing && fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                    disabled={bulkProcessing}
                  />

                  {bulkFile ? (
                    <div className="flex flex-col items-center">
                      <span className="material-icons-outlined text-4xl text-emerald-500 mb-2">description</span>
                      <p className="font-bold text-gray-900 dark:text-white">{bulkFile.name}</p>
                      <p className="text-xs text-gray-400 mt-1">Clique para trocar</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <span className="material-icons-outlined text-4xl text-gray-300 group-hover:text-primary mb-2 transition-colors">upload_file</span>
                      <p className="font-bold text-gray-600 dark:text-gray-300">Clique para selecionar arquivo</p>
                      <p className="text-xs text-gray-400 mt-1">Suporta apenas .csv</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setIsBulkModalOpen(false)}
                    className="flex-1 py-4 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleBulkUpload}
                    disabled={bulkProcessing || !bulkFile}
                    className="flex-1 py-4 rounded-xl font-bold text-white bg-primary hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {bulkProcessing ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      "Processar Arquivo"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
      {/* Modal Nova Atividade (Professor) */}
      {
        isAssignmentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade-in">
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setIsAssignmentModalOpen(false)}
            ></div>
            <div className="relative bg-white dark:bg-surface-dark w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-in border border-gray-100 dark:border-white/10 max-h-[90vh] overflow-y-auto">
              <div className="p-8 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
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

              <form onSubmit={handleCreateAssignment} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Título do Tema</label>
                  <input
                    type="text"
                    value={newAssignment.title}
                    onChange={e => setNewAssignment({ ...newAssignment, title: e.target.value })}
                    placeholder="Ex: Os desafios da mobilidade urbana"
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Texto Base / Contexto</label>
                  <textarea
                    value={newAssignment.baseText}
                    onChange={e => setNewAssignment({ ...newAssignment, baseText: e.target.value })}
                    placeholder="Cole aqui o texto motivador ou deixe a IA gerar para você..."
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-medium text-sm transition-all min-h-[150px] resize-none leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Atribuir à Turma</label>
                    <select
                      value={newAssignment.class_id}
                      onChange={e => setNewAssignment({ ...newAssignment, class_id: e.target.value })}
                      className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all appearance-none"
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
                      className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-white/10 outline-none font-bold text-sm transition-all"
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
