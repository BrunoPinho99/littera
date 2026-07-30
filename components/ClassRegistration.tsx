import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import InputMask from 'react-input-mask';

const ClassRegistration: React.FC = () => {
    const { inviteCode } = useParams<{ inviteCode: string }>();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    
    const [schoolName, setSchoolName] = useState('');
    const [className, setClassName] = useState('');
    const [isFull, setIsFull] = useState(false);

    // Form fields
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [whatsapp, setWhatsapp] = useState('');

    useEffect(() => {
        if (inviteCode) {
            checkTrialStatus();
        }
    }, [inviteCode]);

    const checkTrialStatus = async () => {
        setLoading(true);
        setError('');
        try {
            const { data, error: fnError } = await supabase.functions.invoke('register-student', {
                body: { action: 'check', invite_code: inviteCode }
            });

            if (fnError) {
                throw new Error(fnError.message || 'Erro ao carregar os dados da turma.');
            }
            if (data?.error) {
                throw new Error(data.error);
            }

            setSchoolName(data.school_name);
            setClassName(data.class_name);
            setIsFull(data.is_full);
        } catch (err: any) {
            setError(err.message || 'Turma não encontrada.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            const { data, error: fnError } = await supabase.functions.invoke('register-student', {
                body: { 
                    action: 'register', 
                    invite_code: inviteCode,
                    name,
                    email,
                    whatsapp
                }
            });

            if (fnError) {
                throw new Error(fnError.message || 'Erro ao registrar.');
            }
            if (data?.error) {
                throw new Error(data.error);
            }

            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Erro inesperado.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                    <p style={{ color: '#64748b' }}>Carregando dados da turma...</p>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="font-black text-2xl tracking-tighter text-primary">
                    Littera<span className="text-primary/40">.</span>
                </span>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
                <div style={{ background: '#fff', borderRadius: 24, padding: 40, width: '100%', maxWidth: 500, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.01)' }}>
                    
                    {error ? (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: 64, height: 64, borderRadius: 32, background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                <span className="material-icons-outlined" style={{ fontSize: 32 }}>error_outline</span>
                            </div>
                            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Ops, algo deu errado</h2>
                            <p style={{ color: '#475569', fontSize: 16, lineHeight: 1.6 }}>{error}</p>
                            <button onClick={() => navigate('/')} className="sl-btn-secondary" style={{ width: '100%', marginTop: 32, padding: '14px' }}>
                                Voltar para o Início
                            </button>
                        </div>
                    ) : isFull ? (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: 64, height: 64, borderRadius: 32, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                <span className="material-icons-outlined" style={{ fontSize: 32 }}>group_off</span>
                            </div>
                            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Vagas Esgotadas</h2>
                            <p style={{ color: '#475569', fontSize: 16, lineHeight: 1.6 }}>
                                A turma <strong>{className}</strong> da escola <strong>{schoolName}</strong> já atingiu o limite de vagas. Fale com a coordenação da sua escola.
                            </p>
                            <button onClick={() => navigate('/')} className="sl-btn-secondary" style={{ width: '100%', marginTop: 32, padding: '14px' }}>
                                Voltar para o Início
                            </button>
                        </div>
                    ) : success ? (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: 64, height: 64, borderRadius: 32, background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                <span className="material-icons-outlined" style={{ fontSize: 32 }}>mark_email_read</span>
                            </div>
                            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Cadastro Concluído!</h2>
                            <p style={{ color: '#475569', fontSize: 16, lineHeight: 1.6 }}>
                                Enviamos um e-mail para <strong>{email}</strong> com o seu link mágico de acesso à plataforma.
                            </p>
                            <p style={{ color: '#64748b', fontSize: 14, marginTop: 16 }}>
                                Verifique também sua caixa de spam ou lixo eletrônico.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div style={{ textAlign: 'center', marginBottom: 32 }}>
                                <div style={{ display: 'inline-flex', padding: '6px 12px', background: '#eff6ff', color: '#2563eb', borderRadius: 20, fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
                                    Acesso à Plataforma Littera
                                </div>
                                <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginBottom: 8, letterSpacing: '-0.02em' }}>
                                    Cadastro de Aluno
                                </h1>
                                <p style={{ color: '#475569', fontSize: 16 }}>
                                    Turma <strong>{className}</strong> • <strong>{schoolName}</strong>
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#334155', marginBottom: 8 }}>
                                        Nome Completo
                                    </label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Ex: João da Silva"
                                        style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 16, outline: 'none', transition: 'border-color 0.2s' }}
                                        onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                                        onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#334155', marginBottom: 8 }}>
                                        E-mail Escolar (ou Pessoal)
                                    </label>
                                    <input 
                                        type="email" 
                                        required 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Ex: joao@email.com"
                                        style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 16, outline: 'none', transition: 'border-color 0.2s' }}
                                        onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                                        onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#334155', marginBottom: 8 }}>
                                        WhatsApp
                                    </label>
                                    <InputMask
                                        mask="(99) 99999-9999"
                                        required
                                        value={whatsapp}
                                        onChange={(e: any) => setWhatsapp(e.target.value)}
                                        placeholder="(00) 00000-0000"
                                        style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 16, outline: 'none', transition: 'border-color 0.2s' }}
                                        onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                                        onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                                    />
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={submitting}
                                    className="sl-btn-primary" 
                                    style={{ width: '100%', padding: '16px', borderRadius: 12, fontSize: 16, fontWeight: 600, marginTop: 8 }}
                                >
                                    {submitting ? 'Registrando...' : 'Criar meu acesso'}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClassRegistration;
