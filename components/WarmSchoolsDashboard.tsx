import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

interface WarmSchoolRow {
  school_name: string;
  student_count: number;
  essay_count: number;
  students: Array<{
    id: string;
    full_name: string;
    email: string;
    trial_started_at: string;
    trial_ends_at: string;
  }>;
}

const WarmSchoolsDashboard: React.FC = () => {
  const [schools, setSchools] = useState<WarmSchoolRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchWarmSchools();
  }, []);

  const fetchWarmSchools = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Puxa todos os alunos do trial
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select(`
          id, full_name, email, trial_school_name, trial_started_at, trial_ends_at
        `)
        .eq('school_id', '00000000-0000-0000-0000-000000000000'); // Littera Trial ID

      if (pError) throw pError;

      // Puxa as redacoes desses alunos para contagem
      const studentIds = profiles?.map(p => p.id) || [];
      let essaysData: any[] = [];
      if (studentIds.length > 0) {
        const { data: essays, error: eError } = await supabase
          .from('saved_essays')
          .select('student_id')
          .in('student_id', studentIds);
        
        if (eError) throw eError;
        essaysData = essays || [];
      }

      // Agrupa por escola
      const grouped = new Map<string, WarmSchoolRow>();

      (profiles || []).forEach(profile => {
        const schoolName = profile.trial_school_name || 'Sem nome informado';
        
        if (!grouped.has(schoolName)) {
          grouped.set(schoolName, {
            school_name: schoolName,
            student_count: 0,
            essay_count: 0,
            students: []
          });
        }

        const group = grouped.get(schoolName)!;
        group.student_count += 1;
        
        // Conta as redacoes deste aluno
        const studentEssays = essaysData.filter(e => e.student_id === profile.id).length;
        group.essay_count += studentEssays;
        
        group.students.push({
          id: profile.id,
          full_name: profile.full_name || 'Sem Nome',
          email: profile.email || '',
          trial_started_at: profile.trial_started_at || '',
          trial_ends_at: profile.trial_ends_at || ''
        });
      });

      // Transforma em array e ordena por student_count desc
      const result = Array.from(grouped.values()).sort((a, b) => b.student_count - a.student_count);
      setSchools(result);

    } catch (err: any) {
      console.error('Error fetching warm schools:', err);
      setError(err.message || 'Erro ao carregar escolas em aquecimento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMigrateStudent = async (studentId: string, schoolNameContext: string) => {
    const newSchoolId = prompt('Digite o UUID da ESCOLA REAL de destino (Onde a escola acabou de assinar):');
    if (!newSchoolId) return;

    // Confirmação dupla
    if (!confirm(`Tem certeza que deseja migrar este aluno para a escola ${newSchoolId}? O histórico de redações será movido e o trial encerrado.`)) {
      return;
    }

    setIsMigrating(true);
    try {
      const { error } = await supabase.rpc('migrate_trial_student', {
        p_student_id: studentId,
        p_new_school_id: newSchoolId
      });

      if (error) throw error;
      
      alert('Aluno migrado com sucesso!');
      fetchWarmSchools(); // Recarrega
    } catch (err: any) {
      console.error('Migration error:', err);
      alert('Erro na migração: ' + err.message);
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Escolas em Aquecimento 🔥</h1>
          <p className="text-sm text-slate-500 mt-1">
            Alunos testando a plataforma via fluxo Trial B2B, agrupados por instituição.
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
          {schools.map((school, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
              <div 
                className="p-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center justify-between"
                onClick={() => setSelectedSchool(selectedSchool === school.school_name ? null : school.school_name)}
              >
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{school.school_name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{school.student_count} aluno(s) em trial</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <p className="text-2xl font-black text-primary">{school.essay_count}</p>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Redações Geradas</p>
                  </div>
                  <span className={`material-icons transition-transform ${selectedSchool === school.school_name ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </div>
              </div>

              {selectedSchool === school.school_name && (
                <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-6">
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wider">Alunos Vinculados</h4>
                  <div className="space-y-3">
                    {school.students.map(student => {
                      const endsAt = new Date(student.trial_ends_at);
                      const isExpired = endsAt < new Date();
                      
                      return (
                        <div key={student.id} className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{student.full_name}</p>
                            <p className="text-sm text-slate-500">{student.email}</p>
                            <p className={`text-xs mt-1 font-medium ${isExpired ? 'text-red-500' : 'text-emerald-500'}`}>
                              {isExpired ? 'Trial Expirado' : `Trial até ${endsAt.toLocaleDateString('pt-BR')}`}
                            </p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMigrateStudent(student.id, school.school_name); }}
                            disabled={isMigrating}
                            className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors disabled:opacity-50"
                          >
                            Migrar para Escola Real
                          </button>
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
