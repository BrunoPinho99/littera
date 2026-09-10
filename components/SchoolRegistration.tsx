import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getClassesBySchool } from '../services/databaseService';
import { ClassGroup } from '../types';

const SchoolRegistration: React.FC = () => {
    const { schoolId } = useParams<{ schoolId: string }>();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    
    const [schoolName, setSchoolName] = useState('');
    const [classes, setClasses] = useState<ClassGroup[]>([]);

    // Form fields
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (schoolId) {
            loadSchoolData();
        }
    }, [schoolId]);

    const loadSchoolData = async () => {
        setLoading(true);
        setError('');
        try {
            // Get school name
            const { data: schoolData, error: schoolError } = await supabase
                .from('schools')
                .select('name')
                .eq('id', schoolId)
                .single();

            if (schoolError || !schoolData) {
                throw new Error('Escola não encontrada.');
            }
            setSchoolName(schoolData.name);

            // Get classes
            const classesData = await getClassesBySchool(schoolId!);
            setClasses(classesData);
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar dados da escola.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            if (password !== confirmPassword) {
                throw new Error('As senhas não coincidem.');
            }

            if (password.length < 6) {
                throw new Error('A senha deve ter pelo menos 6 caracteres.');
            }

            if (!selectedClassId) {
                throw new Error('Por favor, selecione a sua turma.');
            }

            const { data, error: fnError } = await supabase.functions.invoke('register-public-student', {
                body: { 
                    name, 
                    email, 
                    password,
                    school_id: schoolId,
                    class_id: selectedClassId 
                }
            });

            if (fnError) {
                throw new Error(fnError.message || 'Erro ao realizar cadastro.');
            }
            if (data?.error) {
                throw new Error(data.error);
            }

            setSuccess(true);
            
            // Fazer login automático e redirecionar
            const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
            if (!loginError) {
                setTimeout(() => navigate('/app/student-dashboard'), 2000);
            }

        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro inesperado.');
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl shadow-gray-200/50">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="material-icons-outlined text-4xl text-green-500">check_circle</span>
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2">Conta Criada!</h2>
                    <p className="text-gray-500 font-medium mb-8">
                        Seu acesso foi liberado com sucesso. Você será redirecionado para a plataforma.
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full py-3.5 rounded-xl font-bold text-white bg-primary hover:bg-primary-dark transition-colors"
                    >
                        Ir para o Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
            <div className="max-w-md w-full">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center text-3xl font-black mx-auto shadow-lg shadow-primary/30 mb-6">
                        L
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Criar Conta</h1>
                    <p className="text-gray-500 font-medium px-4">
                        Preencha seus dados para acessar a plataforma pela escola <strong className="text-gray-900">{schoolName}</strong>
                    </p>
                </div>

                <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-6 sm:p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl font-bold text-sm flex items-start gap-3 border border-red-100">
                            <span className="material-icons-outlined text-[20px]">error_outline</span>
                            <span className="mt-0.5">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-primary/20 focus:bg-white outline-none font-bold text-sm transition-all text-gray-900"
                                placeholder="Seu nome completo"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-mail</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-primary/20 focus:bg-white outline-none font-bold text-sm transition-all text-gray-900"
                                placeholder="seu@email.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Sua Turma</label>
                            <select
                                required
                                value={selectedClassId}
                                onChange={e => setSelectedClassId(e.target.value)}
                                className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-primary/20 focus:bg-white outline-none font-bold text-sm transition-all text-gray-900 appearance-none"
                            >
                                <option value="" disabled>Selecione sua turma...</option>
                                {classes.map(cls => (
                                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Senha</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-5 pr-12 py-3.5 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-primary/20 focus:bg-white outline-none font-bold text-sm transition-all text-gray-900"
                                    placeholder="Crie uma senha forte"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                >
                                    <span className="material-icons-outlined text-[20px]">
                                        {showPassword ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirmar Senha</label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-primary/20 focus:bg-white outline-none font-bold text-sm transition-all text-gray-900"
                                placeholder="Digite a senha novamente"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-4 mt-4 rounded-xl font-black text-white bg-primary hover:bg-primary-dark shadow-lg shadow-primary/30 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                "Criar Conta"
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SchoolRegistration;
