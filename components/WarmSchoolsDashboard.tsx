import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

interface WarmSchoolRow {
  id: string;
  name: string;
  total_students: number;
  total_max_students: number;
  essay_count: number;
  classes: Array<{
    id: string;
    name: string;
    invite_code: string;
    max_students: number;
    trial_ends_at: string;
    students: Array<{
      id: string;
      full_name: string;
      email: string;
      essay_count: number;
    }>;
  }>;
}

const WarmSchoolsDashboard: React.FC = () => {
  const [schools, setSchools] = useState<WarmSchoolRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchWarmSchools();
  }, []);

  const fetchWarmSchools = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: schoolsData, error: sError } = await supabase
        .from('schools')
        .select('*')
        .eq('is_trial_school', true);

      if (sError) throw sError;
      if (!schoolsData || schoolsData.length === 0) {
        setSchools([]);
        return;
      }

      const schoolIds = schoolsData.map(s => s.id);

      const { data: classesData, error: cError } = await supabase
        .from('classes')
        .select('*')
        .in('school_id', schoolIds)
        .not('invite_code', 'is', null);

      if (cError) throw cError;

      const { data: profilesData, error: pError } = await supabase
        .from('profiles')
        .select('id, full_name, email, class_id')
        .in('school_id', schoolIds)
        .eq('is_trial', true);

      if (pError) throw pError;

      const profileIds = (profilesData || []).map(p => p.id);
      let essaysData: any[] = [];
      if (profileIds.length > 0) {
        const { data: essays, error: eError } = await supabase
          .from('redacoes')
          .select('user_id')
          .in('user_id', profileIds);
        
        if (eError) throw eError;
        essaysData = essays || [];
      }

      const result: WarmSchoolRow[] = schoolsData.map(school => {
        const schoolClasses = (classesData || []).filter(c => c.school_id === school.id);
        
        const mappedClasses = schoolClasses.map(cls => {
          const classStudents = (profilesData || []).filter(p => p.class_id === cls.id);
          const mappedStudents = classStudents.map(student => ({
            id: student.id,
            full_name: student.full_name || 'Sem Nome',
            email: student.email || '',
            essay_count: essaysData.filter(e => e.user_id === student.id).length
          }));

          return {
            id: cls.id,
            name: cls.name,
            invite_code: cls.invite_code,
            max_students: cls.max_students,
            trial_ends_at: cls.trial_ends_at,
            students: mappedStudents
          };
        });

        const totalStudents = mappedClasses.reduce((sum, cls) => sum + cls.students.length, 0);
        const totalMaxStudents = mappedClasses.reduce((sum, cls) => sum + cls.max_students, 0);
        const essayCount = mappedClasses.reduce((sum, cls) => sum + cls.students.reduce((s, student) => s + student.essay_count, 0), 0);

        return {
          id: school.id,
          name: school.name,
          total_students: totalStudents,
          total_max_students: totalMaxStudents,
          essay_count: essayCount,
          classes: mappedClasses
        };
      });

      setSchools(result.sort((a, b) => b.essay_count - a.essay_count));

    } catch (err: any) {
      console.error('Error fetching warm schools:', err);
      setError(err.message || 'Erro ao carregar escolas em aquecimento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvertSchool = async (schoolId: string, schoolName: string) => {
    if (!confirm(`Tem certeza que deseja converter a escola "${schoolName}" para PAGANTE? Todos os alunos do trial serão promovidos a usuários definitivos e o trial será encerrado.`)) {
      return;
    }

    setIsConverting(true);
    try {
      const { data, error } = await supabase.functions.invoke('convert-trial-school', {
        body: { school_id: schoolId }
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      
      alert('Escola convertida com sucesso!');
      fetchWarmSchools(); // Recarrega
    } catch (err: any) {
      console.error('Convert error:', err);
      alert('Erro na conversão: ' + err.message);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Escolas em Aquecimento 🔥</h1>
          <p className="text-sm text-slate-500 mt-1">
            Escolas operando sob o modelo Trial B2B por Turma.
          </p>
        </div>
        <button 
          onClick={() => navigate('/app/practice')}
          className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium"
        >
          Voltar
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : schools.length === 0 ? (
        <div className="py-20 text-center text-slate-500 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
          Nenhuma escola em aquecimento no momento.
        </div>
      ) : (
        <div className="grid gap-6">
          {schools.map((school) => (
            <div key={school.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
              <div 
                className="p-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                onClick={() => setSelectedSchool(selectedSchool === school.id ? null : school.id)}
              >
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{school.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {school.total_students} de {school.total_max_students} alunos em trial
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-3xl font-black text-primary">{school.essay_count}</p>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Redações Geradas</p>
                  </div>
                  
                  <button
                    onClick={(e) => { e.stopPropagation(); handleConvertSchool(school.id, school.name); }}
                    disabled={isConverting}
                    className="ml-4 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                  >
                    Converter para Pagante
                  </button>
                  
                  <span className={`material-icons transition-transform ${selectedSchool === school.id ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </div>
              </div>

              {selectedSchool === school.id && (
                <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-6">
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wider">Turmas e Alunos</h4>
                  <div className="space-y-6">
                    {school.classes.map(cls => {
                      const endsAt = new Date(cls.trial_ends_at);
                      const isExpired = endsAt < new Date();
                      
                      return (
                        <div key={cls.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                           <div className="flex justify-between items-center mb-3">
                              <div>
                                <h5 className="font-bold text-slate-900 dark:text-white text-lg">{cls.name}</h5>
                                <p className="text-sm text-slate-500 font-mono">Código: {cls.invite_code}</p>
                              </div>
                              <div className="text-right">
                                <p className={`text-sm font-medium ${isExpired ? 'text-red-500' : 'text-emerald-500'}`}>
                                  {isExpired ? 'Trial Expirado' : `Trial até ${endsAt.toLocaleDateString('pt-BR')}`}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">{cls.students.length} / {cls.max_students} alunos cadastrados</p>
                              </div>
                           </div>
                           
                           {cls.students.length > 0 ? (
                             <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                                  <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                                    <tr>
                                      <th className="px-4 py-2 rounded-l-lg">Nome</th>
                                      <th className="px-4 py-2">E-mail</th>
                                      <th className="px-4 py-2 text-center rounded-r-lg">Redações</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {cls.students.map(student => (
                                      <tr key={student.id} className="bg-white dark:bg-slate-800">
                                        <td className="px-4 py-2 font-medium text-slate-900 dark:text-white">{student.full_name}</td>
                                        <td className="px-4 py-2">{student.email}</td>
                                        <td className="px-4 py-2 text-center font-bold text-primary">{student.essay_count}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                             </div>
                           ) : (
                             <p className="text-sm text-slate-400 italic">Nenhum aluno cadastrado nesta turma ainda.</p>
                           )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WarmSchoolsDashboard;
