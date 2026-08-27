import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

interface Lead {
    id: string;
    name: string;
    email: string;
    whatsapp: string;
    school_name: string;
    status: string;
    created_at: string;
}

const ActivateTrialDashboard: React.FC = () => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    const [schoolName, setSchoolName] = useState('');
    const [className, setClassName] = useState('');
    const [maxStudents, setMaxStudents] = useState<number>(30);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedLeadId, setSelectedLeadId] = useState<string>('');
    const [generatedCode, setGeneratedCode] = useState<string>('');

    const navigate = useNavigate();

    useEffect(() => {
        checkAdmin();
        fetchLeads();
    }, []);

    const checkAdmin = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || session.user.user_metadata?.role !== 'littera_admin') {
            navigate('/app');
        }
    };

    const fetchLeads = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setLeads(data);
        }
        setLoading(false);
    };

    const handleLeadSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const leadId = e.target.value;
        setSelectedLeadId(leadId);
        
        if (leadId) {
            const lead = leads.find(l => l.id === leadId);
            if (lead) {
                setSchoolName(lead.school_name);
            }
        } else {
            setSchoolName('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setGeneratedCode('');

        try {
            const { data, error } = await supabase.functions.invoke('activate-trial', {
                body: {
                    school_name: schoolName,
                    class_name: className,
                    max_students: maxStudents,
                    start_date: startDate,
                    lead_id: selectedLeadId || undefined,
                }
            });

            if (error) throw new Error(error.message);
            if (data?.error) throw new Error(data.error);

            if (data?.invite_code) {
                setGeneratedCode(data.invite_code);
                setSchoolName('');
                setClassName('');
                setSelectedLeadId('');
                fetchLeads(); // Refresh leads
            }
        } catch (err: any) {
            alert('Erro ao ativar trial: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const copyLink = () => {
        const link = `https://littera.app.br/trial/${generatedCode}`;
        navigator.clipboard.writeText(link);
        alert('Link copiado!');
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Carregando...</div>;

    return (
        <div style={{ maxWidth: 600, margin: '40px auto', fontFamily: 'Inter, sans-serif' }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, color: '#111315' }}>Ativar Trial B2B</h1>
            
            <div style={{ background: '#fff', borderRadius: 16, padding: 32, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                {generatedCode ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ width: 64, height: 64, borderRadius: 32, background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <span className="material-icons-outlined" style={{ fontSize: 32 }}>check</span>
                        </div>
                        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: '#111315' }}>Trial Ativado com Sucesso!</h2>
                        <p style={{ color: '#64748b', marginBottom: 24 }}>Envie o link abaixo para os alunos desta turma se cadastrarem.</p>
                        
                        <div style={{ display: 'flex', gap: 8, background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 24 }}>
                            <span style={{ flex: 1, fontFamily: 'monospace', color: '#334155' }}>littera.app.br/trial/{generatedCode}</span>
                            <button onClick={copyLink} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 500 }}>Copiar</button>
                        </div>
                        
                        <button onClick={() => setGeneratedCode('')} className="sl-btn-secondary" style={{ width: '100%', padding: '12px' }}>
                            Criar outro Trial
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#334155' }}>Lead (Opcional)</label>
                            <select 
                                value={selectedLeadId} 
                                onChange={handleLeadSelect}
                                style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 15 }}
                            >
                                <option value="">Novo Cliente (Digitar manualmente)</option>
                                {leads.map(lead => (
                                    <option key={lead.id} value={lead.id}>{lead.school_name} - {lead.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#334155' }}>Nome da Escola *</label>
                            <input 
                                type="text" 
                                required 
                                value={schoolName}
                                onChange={(e) => setSchoolName(e.target.value)}
                                style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 15 }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#334155' }}>Nome da Turma *</label>
                            <input 
                                type="text" 
                                required 
                                placeholder="Ex: 3º ano A"
                                value={className}
                                onChange={(e) => setClassName(e.target.value)}
                                style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 15 }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 16 }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#334155' }}>Limite de Alunos *</label>
                                <input 
                                    type="number" 
                                    required 
                                    min={1}
                                    value={maxStudents}
                                    onChange={(e) => setMaxStudents(parseInt(e.target.value))}
                                    style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 15 }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#334155' }}>Data de Início *</label>
                                <input 
                                    type="date" 
                                    required 
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 15 }}
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={submitting}
                            className="sl-btn-primary" 
                            style={{ width: '100%', padding: '14px', marginTop: 12 }}
                        >
                            {submitting ? 'Gerando...' : 'Criar Turma e Gerar Link'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ActivateTrialDashboard;
